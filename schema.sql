-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Tempo de geração: 05/02/2026 às 03:12
-- Versão do servidor: 10.4.28-MariaDB
-- Versão do PHP: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `dash-protocolos`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `protocolos`
--

CREATE TABLE `protocolos` (
  `id` int(11) NOT NULL,
  `ficha` int(11) DEFAULT NULL,
  `ato` varchar(120) NOT NULL,
  `digitador` varchar(120) DEFAULT NULL,
  `apresentante` varchar(150) DEFAULT NULL,
  `data_apresentacao` date DEFAULT NULL,
  `contato` varchar(255) DEFAULT NULL,
  `outorgantes` text DEFAULT NULL,
  `outorgados` text DEFAULT NULL,
  `matricula` varchar(120) DEFAULT NULL,
  `area` varchar(60) DEFAULT NULL,
  `valor_ato` decimal(14,2) DEFAULT NULL,
  `status` enum('PARA_DISTRIBUIR','EM_ANDAMENTO','PARA_CORRECAO','LAVRADOS','ARQUIVADOS') NOT NULL,
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `urgente` tinyint(1) NOT NULL DEFAULT 0,
  `deletado` tinyint(1) NOT NULL DEFAULT 0,
  `tag_custom` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `protocolos_andamentos`
--

CREATE TABLE `protocolos_andamentos` (
  `id` int(11) NOT NULL,
  `protocolo_id` int(11) NOT NULL,
  `descricao` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `protocolos_tags`
--

CREATE TABLE `protocolos_tags` (
  `id` int(11) NOT NULL,
  `ato` varchar(120) NOT NULL,
  `cor` varchar(20) NOT NULL DEFAULT '#64748b'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `protocolos_valores`
--

CREATE TABLE `protocolos_valores` (
  `id` int(11) NOT NULL,
  `protocolo_id` int(11) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `valor` decimal(14,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura stand-in para view `vw_protocolos_board`
-- (Veja abaixo para a visão atual)
--
CREATE TABLE `vw_protocolos_board` (
`id` int(11)
,`ficha` int(11)
,`ato` varchar(120)
,`digitador` varchar(120)
,`apresentante` varchar(150)
,`data_apresentacao` date
,`contato` varchar(255)
,`outorgantes` text
,`outorgados` text
,`matricula` varchar(120)
,`area` varchar(60)
,`valor_ato` decimal(14,2)
,`status` enum('PARA_DISTRIBUIR','EM_ANDAMENTO','PARA_CORRECAO','LAVRADOS','ARQUIVADOS')
,`observacoes` text
,`created_at` timestamp
,`updated_at` timestamp
,`urgente` tinyint(1)
,`deletado` tinyint(1)
,`tag_custom` varchar(120)
,`total_valores` decimal(36,2)
);

-- --------------------------------------------------------

--
-- Estrutura para view `vw_protocolos_board`
--
DROP TABLE IF EXISTS `vw_protocolos_board`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_protocolos_board`  AS SELECT `p`.`id` AS `id`, `p`.`ficha` AS `ficha`, `p`.`ato` AS `ato`, `p`.`digitador` AS `digitador`, `p`.`apresentante` AS `apresentante`, `p`.`data_apresentacao` AS `data_apresentacao`, `p`.`contato` AS `contato`, `p`.`outorgantes` AS `outorgantes`, `p`.`outorgados` AS `outorgados`, `p`.`matricula` AS `matricula`, `p`.`area` AS `area`, `p`.`valor_ato` AS `valor_ato`, `p`.`status` AS `status`, `p`.`observacoes` AS `observacoes`, `p`.`created_at` AS `created_at`, `p`.`updated_at` AS `updated_at`, `p`.`urgente` AS `urgente`, `p`.`deletado` AS `deletado`, `p`.`tag_custom` AS `tag_custom`, coalesce(sum(`v`.`valor`),0) AS `total_valores` FROM (`protocolos` `p` left join `protocolos_valores` `v` on(`v`.`protocolo_id` = `p`.`id`)) GROUP BY `p`.`id` ;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `protocolos`
--
ALTER TABLE `protocolos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ficha` (`ficha`),
  ADD KEY `idx_ato` (`ato`),
  ADD KEY `idx_digitador` (`digitador`),
  ADD KEY `idx_apresentante` (`apresentante`);

--
-- Índices de tabela `protocolos_andamentos`
--
ALTER TABLE `protocolos_andamentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `protocolo_id` (`protocolo_id`);

--
-- Índices de tabela `protocolos_tags`
--
ALTER TABLE `protocolos_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ato` (`ato`);

--
-- Índices de tabela `protocolos_valores`
--
ALTER TABLE `protocolos_valores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `protocolo_id` (`protocolo_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `protocolos`
--
ALTER TABLE `protocolos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `protocolos_andamentos`
--
ALTER TABLE `protocolos_andamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `protocolos_tags`
--
ALTER TABLE `protocolos_tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `protocolos_valores`
--
ALTER TABLE `protocolos_valores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `protocolos_andamentos`
--
ALTER TABLE `protocolos_andamentos`
  ADD CONSTRAINT `protocolos_andamentos_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `protocolos_valores`
--
ALTER TABLE `protocolos_valores`
  ADD CONSTRAINT `protocolos_valores_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
