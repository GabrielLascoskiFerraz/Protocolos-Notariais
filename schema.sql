-- Banco de dados do projeto
-- Ajuste o nome se necessario
CREATE DATABASE IF NOT EXISTS `dash-protocolos`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `dash-protocolos`;

-- =========================
-- Tabela principal
-- =========================
CREATE TABLE IF NOT EXISTS protocolos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ficha INT NULL,

    ato VARCHAR(120) NOT NULL,
    digitador VARCHAR(120),
    apresentante VARCHAR(150),
    data_apresentacao DATE,
    contato VARCHAR(255) DEFAULT NULL,

    outorgantes TEXT,
    outorgados TEXT,

    matricula VARCHAR(120),
    area VARCHAR(60),

    valor_ato DECIMAL(14,2),

    tag_custom VARCHAR(120),

    status ENUM(
        'PARA_DISTRIBUIR',
        'EM_ANDAMENTO',
        'PARA_CORRECAO',
        'LAVRADOS',
        'ARQUIVADOS'
    ) NOT NULL DEFAULT 'PARA_DISTRIBUIR',

    urgente TINYINT(1) NOT NULL DEFAULT 0,
    deletado TINYINT(1) NOT NULL DEFAULT 0,

    observacoes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_ficha (ficha),
    INDEX idx_ato (ato),
    INDEX idx_digitador (digitador),
    INDEX idx_apresentante (apresentante)
);

-- =========================
-- Andamentos
-- =========================
CREATE TABLE IF NOT EXISTS protocolos_andamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    protocolo_id INT NOT NULL,
    descricao TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (protocolo_id)
        REFERENCES protocolos(id)
        ON DELETE CASCADE
);

-- =========================
-- Valores adicionais
-- =========================
CREATE TABLE IF NOT EXISTS protocolos_valores (
    id INT AUTO_INCREMENT PRIMARY KEY,

    protocolo_id INT NOT NULL,
    descricao VARCHAR(255),
    valor DECIMAL(14,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (protocolo_id)
        REFERENCES protocolos(id)
        ON DELETE CASCADE
);

-- =========================
-- Tags de atos (opcional)
-- =========================
CREATE TABLE IF NOT EXISTS protocolos_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ato VARCHAR(120) NOT NULL UNIQUE,
    cor VARCHAR(20) NOT NULL DEFAULT '#64748b'
);

-- =========================
-- View do board
-- =========================
CREATE OR REPLACE VIEW vw_protocolos_board AS
SELECT
    p.*,
    COALESCE(SUM(v.valor), 0) AS total_valores
FROM protocolos p
LEFT JOIN protocolos_valores v
    ON v.protocolo_id = p.id
GROUP BY p.id;
