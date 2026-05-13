ALTER TABLE `protocolos`
  ADD KEY `idx_board_status` (`deletado`,`status`,`urgente`,`id`),
  ADD KEY `idx_updated_at` (`updated_at`),
  ADD KEY `idx_filter_ato` (`deletado`,`ato`),
  ADD KEY `idx_filter_digitador` (`deletado`,`digitador`),
  ADD KEY `idx_filter_tag_custom` (`deletado`,`tag_custom`);
