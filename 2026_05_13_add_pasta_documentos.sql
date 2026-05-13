ALTER TABLE `protocolos`
  ADD COLUMN IF NOT EXISTS `pasta_documentos` varchar(1024) DEFAULT NULL AFTER `observacoes`;
