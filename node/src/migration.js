import mysql from "mysql2/promise";

const LEGACY_TABLES = ["protocolos", "protocolos_imoveis", "protocolos_valores", "protocolos_andamentos", "protocolos_tags"];

function isoDate(value) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function nullable(value) {
  return value === undefined ? null : value;
}

async function tableCounts(connection, database) {
  const counts = {};
  for (const table of LEGACY_TABLES) {
    const [exists] = await connection.query(
      "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
      [database, table]
    );
    if (!Number(exists[0].total)) { counts[table] = null; continue; }
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    counts[table] = Number(rows[0].total);
  }
  if (counts.protocolos === null) throw new Error("A tabela obrigatória 'protocolos' não existe no banco informado.");
  return counts;
}

export async function inspectLegacyDatabase(connectionConfig) {
  const connection = await mysql.createConnection({ ...connectionConfig, connectTimeout: 10000 });
  try {
    return await tableCounts(connection, connectionConfig.database);
  } finally {
    await connection.end();
  }
}

export async function migrateLegacyDatabase({ connectionConfig, repository, user, operationId }) {
  const connection = await mysql.createConnection({ ...connectionConfig, connectTimeout: 10000 });
  const db = repository.db;
  const imported = {};
  try {
    const counts = await tableCounts(connection, connectionConfig.database);
    const migration = db.transaction((data) => {
      db.exec("DELETE FROM protocolos_andamentos; DELETE FROM protocolos_valores; DELETE FROM protocolos_imoveis; DELETE FROM protocolos;");
      const insertProtocol = db.prepare(`INSERT INTO protocolos
        (id,ficha,ato,digitador,apresentante,data_apresentacao,contato,outorgantes,outorgados,valor_ato,status,observacoes,urgente,deletado,tag_custom,pasta_documentos,created_at,updated_at,updated_by)
        VALUES (@id,@ficha,@ato,@digitador,@apresentante,@data_apresentacao,@contato,@outorgantes,@outorgados,@valor_ato,@status,@observacoes,@urgente,@deletado,@tag_custom,@pasta_documentos,@created_at,@updated_at,@updated_by)`);
      for (const row of data.protocolos) insertProtocol.run({
        id: Number(row.id), ficha: nullable(row.ficha),
        ato: row.ato || "",
        digitador: nullable(row.digitador), apresentante: nullable(row.apresentante),
        data_apresentacao: row.data_apresentacao instanceof Date ? row.data_apresentacao.toISOString().slice(0, 10) : nullable(row.data_apresentacao),
        contato: nullable(row.contato), outorgantes: nullable(row.outorgantes), outorgados: nullable(row.outorgados),
        valor_ato: row.valor_ato === null || row.valor_ato === undefined || row.valor_ato === "" ? null : Number(row.valor_ato),
        status: repository.STATUSES.includes(row.status) ? row.status : "EM_ANDAMENTO",
        observacoes: nullable(row.observacoes),
        urgente: Number(row.urgente || 0), deletado: Number(row.deletado || 0),
        tag_custom: nullable(row.tag_custom),
        pasta_documentos: row.pasta_documentos || null,
        created_at: isoDate(row.created_at), updated_at: isoDate(row.updated_at),
        updated_by: user?.name || "Migração"
      });
      const copyRows = (rows, sql, mapper = (row) => row) => { const statement = db.prepare(sql); rows.forEach((row) => statement.run(mapper(row))); };
      copyRows(data.protocolos_imoveis, "INSERT INTO protocolos_imoveis (id,protocolo_id,matricula,area) VALUES (@id,@protocolo_id,@matricula,@area)", (row) => ({ id: Number(row.id), protocolo_id: Number(row.protocolo_id), matricula: nullable(row.matricula), area: nullable(row.area) }));
      copyRows(data.protocolos_valores, "INSERT INTO protocolos_valores (id,protocolo_id,descricao,valor,created_at) VALUES (@id,@protocolo_id,@descricao,@valor,@created_at)", (row) => ({ id: Number(row.id), protocolo_id: Number(row.protocolo_id), descricao: nullable(row.descricao), valor: Number(row.valor || 0), created_at: isoDate(row.created_at) }));
      copyRows(data.protocolos_andamentos, "INSERT INTO protocolos_andamentos (id,protocolo_id,descricao,created_at) VALUES (@id,@protocolo_id,@descricao,@created_at)", (row) => ({ id: Number(row.id), protocolo_id: Number(row.protocolo_id), descricao: String(row.descricao || ""), created_at: isoDate(row.created_at) }));
      copyRows(data.protocolos_tags, "INSERT INTO protocolos_tags (ato,cor) VALUES (@ato,@cor) ON CONFLICT(ato) DO UPDATE SET cor=excluded.cor", (row) => ({ ato: String(row.ato || "").trim(), cor: row.cor || "#64748b" }));

      // Bancos anteriores à tabela de imóveis ainda guardavam matrícula e área no protocolo.
      const protocolsWithProperties = new Set(data.protocolos_imoveis.map((row) => Number(row.protocolo_id)));
      const insertLegacyProperty = db.prepare("INSERT INTO protocolos_imoveis (protocolo_id,matricula,area) VALUES (?,?,?)");
      for (const row of data.protocolos) {
        if (!protocolsWithProperties.has(Number(row.id)) && (String(row.matricula || "").trim() || String(row.area || "").trim())) {
          insertLegacyProperty.run(Number(row.id), nullable(row.matricula), nullable(row.area));
          imported.protocolos_imoveis = Number(imported.protocolos_imoveis || 0) + 1;
        }
      }
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('protocolos','protocolos_imoveis','protocolos_valores','protocolos_andamentos')");
      const foreignKeyErrors = db.prepare("PRAGMA foreign_key_check").all();
      if (foreignKeyErrors.length) throw new Error(`A validação encontrou ${foreignKeyErrors.length} vínculo(s) inválido(s) nos dados importados.`);
      const targetCount = Number(db.prepare("SELECT COUNT(*) AS total FROM protocolos").get().total);
      if (targetCount !== Number(counts.protocolos)) throw new Error(`Contagem divergente: origem ${counts.protocolos}, destino ${targetCount}.`);
      db.prepare("INSERT INTO audit_log (operation_id,user_id,action,after_json) VALUES (?,?,?,?)").run(operationId, user?.id || null, "migration.completed", JSON.stringify(counts));
    });
    const data = {};
    for (const table of LEGACY_TABLES) {
      if (counts[table] === null) { data[table] = []; continue; }
      const [rows] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY id`);
      data[table] = rows;
      imported[table] = rows.length;
    }
    migration(data);
    repository.db.pragma("optimize");
    return { success: true, imported };
  } finally {
    await connection.end();
  }
}
