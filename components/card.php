<?php
/**
 * Espera receber no escopo:
 * $p = dados do protocolo
 *
 * Campos usados:
 * - id
 * - status
 * - ficha
 * - ato
 * - apresentante
 * - digitador
 * - outorgantes
 * - data_apresentacao
 * - total_valores
 * - tag_cor
 * - urgente
 */
?>

<div
    class="card <?= !empty($p['urgente']) ? 'card-urgente' : '' ?>"
    draggable="true"
    data-id="<?= (int)$p['id'] ?>"
    data-status="<?= htmlspecialchars($p['status']) ?>"
    onclick="abrirModal(<?= (int)$p['id'] ?>)"
>
    <!-- TAG DO ATO -->
    <?php
        if (!isset($GLOBALS['atoCores'])) {
            $GLOBALS['atoCores'] = [
                'Abertura de Crédito em conta' => '#3b82f6',
                'Aditivo' => '#22c55e',
                'Alienação Fiduciária' => '#f97316',
                'Ata de adjudicação compulsória' => '#6366f1',
                'Ata Notarial Diligencia Externa' => '#14b8a6',
                'Ata Notarial Externa' => '#0ea5e9',
                'Ata Notarial Interna' => '#8b5cf6',
                'Ata Notarial Internet' => '#ef4444',
                'Ata Notarial para Usucapião' => '#06b6d4',
                'Autocuratela' => '#84cc16',
                'Autorização' => '#a855f7',
                'Caução' => '#f59e0b',
                'Cessão de direitos de aquisição' => '#10b981',
                'Cessão de Direitos de Meação Onerosa' => '#1d4ed8',
                'Cessão de Direitos de Meação por Doação' => '#f43f5e',
                'Cessão de Direitos de Posse' => '#16a34a',
                'Cessão de Direitos Hereditários' => '#0f766e',
                'Cessão de Direitos Hereditários e de Meação' => '#7c3aed',
                'Cessão de Direitos Não Onerosa' => '#ea580c',
                'Cessão de Direitos Onerosa' => '#2563eb',
                'Comodato' => '#059669',
                'Compra e venda' => '#4f46e5',
                'Compra e Venda Bem Móvel com Hipoteca e Alienação' => '#b45309',
                'Compra e Venda com Cessão Onerosa de Direito de Us' => '#0891b2',
                'Compromisso de Compra e Venda' => '#22c55e',
                'Concessão de Direito Real de Uso' => '#f97316',
                'Confissão de Dívida' => '#64748b',
                'Constituição e Convenção de Condomínio' => '#0ea5e9',
                'Contrato de Arrendamento Mercantil' => '#1f2937',
                'Contrato de Locação' => '#0f766e',
                'Conversão de separação em divórcio sem partilha' => '#7c3aed',
                'CONVERSÃO Escritura pública' => '#e11d48',
                'Dação em Pagamento' => '#16a34a',
                'Declaração de União Estável' => '#9333ea',
                'Declaratória' => '#f59e0b',
                'Declaratória de Estremação' => '#0ea5e9',
                'Desapropriação' => '#ef4444',
                'Desapropriação Amigável' => '#10b981',
                'Desfazimento' => '#f97316',
                'Desincorporação' => '#6366f1',
                'Diretivas Antecipadas de Vontade' => '#14b8a6',
                'Dissolução de União Estável' => '#3b82f6',
                'Dissolução de União Estável Com Partilha' => '#22c55e',
                'Distrato de Escritura Pública' => '#f43f5e',
                'Divisão Amigável' => '#0ea5e9',
                'Divórcio com Partilha' => '#8b5cf6',
                'Divórcio Sem Partilha' => '#ef4444',
                'Doação' => '#f59e0b',
                'Doação com Reserva de Usufruto' => '#10b981',
                'Emancipação' => '#6366f1',
                'Extinção de Fundação' => '#0f766e',
                'Hipoteca' => '#f97316',
                'Incorporação' => '#3b82f6',
                'Instituição de Bem de Família' => '#14b8a6',
                'Instituição de Condomínio' => '#8b5cf6',
                'Instituição de Servidão' => '#ef4444',
                'Instituição de Usufruto' => '#22c55e',
                'Integralização de Capital' => '#0ea5e9',
                'Inventário' => '#f59e0b',
                'Inventário e Partilha com Menores e Incapazes' => '#7c3aed',
                'Inventário e Partilha de Bens' => '#10b981',
                'Mútuo' => '#64748b',
                'Nomeação de Inventariante' => '#3b82f6',
                'Nomeação de inventariante com menores e incapazes' => '#22c55e',
                'Pacto Antenupcial' => '#f97316',
                'Pacto Pós Nupcial' => '#6366f1',
                'Partilha Amigável' => '#14b8a6',
                'Permuta' => '#ef4444',
                'Pública Forma' => '#8b5cf6',
                'Quitação' => '#0ea5e9',
                'Ratificação' => '#10b981',
                'Re-Ratificação' => '#f59e0b',
                'Reconhecimento com dissolução de união estável e P' => '#64748b',
                'Reconhecimento de Paternidade' => '#3b82f6',
                'Renúncia' => '#ef4444',
                'Renúncia de Direitos Hereditários' => '#8b5cf6',
                'Renúncia de Propriedade' => '#0ea5e9',
                'Renúncia de Usufruto' => '#10b981',
                'Rerratificação' => '#f97316',
                'Rerratificação e Aditamento' => '#6366f1',
                'Restabelecimento de Sociedade Conjugal' => '#14b8a6',
                'Retificação' => '#22c55e',
                'Revogação de Clausula de Incomunicabilidade' => '#f59e0b',
                'Revogação de Cláusula de Reversão' => '#0ea5e9',
                'Revogação Procuração (1)' => '#ef4444',
                'Sobrepartilha' => '#8b5cf6',
                'Subrogação' => '#10b981',
                'Transação - Acordo Extrajudicial' => '#3b82f6'
            ];
        }

        $ato = $p['ato'] ?? '';
        $bg = $GLOBALS['atoCores'][$ato] ?? ($p['tag_cor'] ?? '#64748b');

        $hex = ltrim($bg, '#');
        if (strlen($hex) === 6) {
            $r = hexdec(substr($hex, 0, 2)) / 255;
            $g = hexdec(substr($hex, 2, 2)) / 255;
            $b = hexdec(substr($hex, 4, 2)) / 255;
            $luma = 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
            $fg = $luma > 0.6 ? '#0f172a' : '#ffffff';
        } else {
            $fg = '#ffffff';
        }
    ?>
    <div
        class="card-tag"
        style="background-color: <?= htmlspecialchars($bg) ?>; color: <?= htmlspecialchars($fg) ?>"
        title="<?= htmlspecialchars($ato) ?>"
    >
        <?= htmlspecialchars($ato) ?>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div class="card-body">

        <?php if (!empty($p['ficha'])): ?>
            <div class="card-ficha">
                <span>Ficha <?= (int)$p['ficha'] ?></span>
                <?php if (!empty($p['urgente'])): ?>
                    <span class="tag-urgente">Urgente</span>
                <?php endif; ?>
            </div>
        <?php elseif (!empty($p['urgente'])): ?>
            <div class="card-ficha">
                <span class="tag-urgente">Urgente</span>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['apresentante'])): ?>
            <div class="card-apresentante">
                <?= htmlspecialchars($p['apresentante']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['digitador'])): ?>
            <div class="card-digitador">
                Digitador: <?= htmlspecialchars($p['digitador']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['outorgantes'])): ?>
            <div class="card-outorgantes">
                Outorgante: <?= htmlspecialchars($p['outorgantes']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['data_apresentacao'])): ?>
            <div class="card-data">
                <?= date('d/m/Y', strtotime($p['data_apresentacao'])) ?>
            </div>
        <?php endif; ?>

    </div>

    <!-- RODAPÉ -->
    <div class="card-footer">

        <div class="card-actions">

            <?php if (($p['status'] ?? '') !== 'ARQUIVADOS'): ?>
                <button
                    onclick="event.stopPropagation(); arquivarProtocolo(<?= (int)$p['id'] ?>)"
                >
                    Arquivar
                </button>
            <?php else: ?>
                <button
                    class="btn-restaurar"
                    onclick="event.stopPropagation(); restaurarProtocolo(<?= (int)$p['id'] ?>)"
                >
                    Restaurar
                </button>
            <?php endif; ?>

            <button
                class="danger"
                onclick="event.stopPropagation(); excluirProtocolo(<?= (int)$p['id'] ?>)"
            >
                Excluir
            </button>

        </div>

        <div class="card-valores">
            <?php if (!empty($p['total_valores']) && $p['total_valores'] > 0): ?>
                R$ <?= number_format($p['total_valores'], 2, ',', '.') ?>
            <?php else: ?>
                &nbsp;
            <?php endif; ?>
        </div>

        <div class="card-handle" title="Arrastar">
            ⋮⋮
        </div>

    </div>

</div>
