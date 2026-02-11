<?php
/**
 * Modal / Painel do Protocolo
 * Carregado uma única vez na página
 */
?>

<div id="protocolo-modal" class="modal hidden">

    <div class="modal-overlay" onclick="fecharModal()"></div>

    <div class="modal-panel">

        <!-- HEADER -->
        <header class="modal-header">
            <div class="modal-title">
                <span id="modal-ato">Novo protocolo</span>
                <small id="modal-ficha"></small>
            </div>

            <div class="modal-actions">
                <button class="btn-secondary" onclick="gerarPdfFicha()">Gerar PDF</button>
                <button class="modal-close" onclick="fecharModal()">✕</button>
            </div>
        </header>

        <!-- CONTEÚDO -->
        <div class="modal-content modal-columns">

            <div class="modal-col">
                <!-- IDENTIFICAÇÃO -->
                <section class="modal-section">
                    <h3>Identificação</h3>

                    <div class="form-grid">

                        <div class="form-group">
                            <label>Ato</label>
                            <select id="ato-select" data-ato-select>
                                <option value="">Selecione…</option>
                                <option value="Abertura de Crédito em conta">Abertura de Crédito em conta</option>
                                <option value="Aditivo">Aditivo</option>
                                <option value="Alienação Fiduciária">Alienação Fiduciária</option>
                                <option value="Ata de adjudicação compulsória">Ata de adjudicação compulsória</option>
                                <option value="Ata Notarial Diligencia Externa">Ata Notarial Diligencia Externa</option>
                                <option value="Ata Notarial Externa">Ata Notarial Externa</option>
                                <option value="Ata Notarial Interna">Ata Notarial Interna</option>
                                <option value="Ata Notarial Internet">Ata Notarial Internet</option>
                                <option value="Ata Notarial para Usucapião">Ata Notarial para Usucapião</option>
                                <option value="Autocuratela">Autocuratela</option>
                                <option value="Autorização">Autorização</option>
                                <option value="Caução">Caução</option>
                                <option value="Cessão de direitos de aquisição">Cessão de direitos de aquisição</option>
                                <option value="Cessão de Direitos de Meação Onerosa">Cessão de Direitos de Meação Onerosa</option>
                                <option value="Cessão de Direitos de Meação por Doação">Cessão de Direitos de Meação por Doação</option>
                                <option value="Cessão de Direitos de Posse">Cessão de Direitos de Posse</option>
                                <option value="Cessão de Direitos Hereditários">Cessão de Direitos Hereditários</option>
                                <option value="Cessão de Direitos Hereditários e de Meação">Cessão de Direitos Hereditários e de Meação</option>
                                <option value="Cessão de Direitos Não Onerosa">Cessão de Direitos Não Onerosa</option>
                                <option value="Cessão de Direitos Onerosa">Cessão de Direitos Onerosa</option>
                                <option value="Comodato">Comodato</option>
                                <option value="Compra e venda">Compra e venda</option>
                                <option value="Compra e Venda Bem Móvel com Hipoteca e Alienação">Compra e Venda Bem Móvel com Hipoteca e Alienação</option>
                                <option value="Compra e Venda com Cessão Onerosa de Direito de Us">Compra e Venda com Cessão Onerosa de Direito de Us</option>
                                <option value="Compromisso de Compra e Venda">Compromisso de Compra e Venda</option>
                                <option value="Concessão de Direito Real de Uso">Concessão de Direito Real de Uso</option>
                                <option value="Confissão de Dívida">Confissão de Dívida</option>
                                <option value="Constituição e Convenção de Condomínio">Constituição e Convenção de Condomínio</option>
                                <option value="Contrato de Arrendamento Mercantil">Contrato de Arrendamento Mercantil</option>
                                <option value="Contrato de Locação">Contrato de Locação</option>
                                <option value="Conversão de separação em divórcio sem partilha">Conversão de separação em divórcio sem partilha</option>
                                <option value="CONVERSÃO Escritura pública">CONVERSÃO Escritura pública</option>
                                <option value="Dação em Pagamento">Dação em Pagamento</option>
                                <option value="Declaração de União Estável">Declaração de União Estável</option>
                                <option value="Declaratória">Declaratória</option>
                                <option value="Declaratória de Estremação">Declaratória de Estremação</option>
                                <option value="Desapropriação">Desapropriação</option>
                                <option value="Desapropriação Amigável">Desapropriação Amigável</option>
                                <option value="Desfazimento">Desfazimento</option>
                                <option value="Desincorporação">Desincorporação</option>
                                <option value="Diretivas Antecipadas de Vontade">Diretivas Antecipadas de Vontade</option>
                                <option value="Dissolução de União Estável">Dissolução de União Estável</option>
                                <option value="Dissolução de União Estável Com Partilha">Dissolução de União Estável Com Partilha</option>
                                <option value="Distrato de Escritura Pública">Distrato de Escritura Pública</option>
                                <option value="Divisão Amigável">Divisão Amigável</option>
                                <option value="Divórcio com Partilha">Divórcio com Partilha</option>
                                <option value="Divórcio Sem Partilha">Divórcio Sem Partilha</option>
                                <option value="Doação">Doação</option>
                                <option value="Doação com Reserva de Usufruto">Doação com Reserva de Usufruto</option>
                                <option value="Emancipação">Emancipação</option>
                                <option value="Extinção de Fundação">Extinção de Fundação</option>
                                <option value="Hipoteca">Hipoteca</option>
                                <option value="Incorporação">Incorporação</option>
                                <option value="Instituição de Bem de Família">Instituição de Bem de Família</option>
                                <option value="Instituição de Condomínio">Instituição de Condomínio</option>
                                <option value="Instituição de Servidão">Instituição de Servidão</option>
                                <option value="Instituição de Usufruto">Instituição de Usufruto</option>
                                <option value="Integralização de Capital">Integralização de Capital</option>
                                <option value="Inventário">Inventário</option>
                                <option value="Inventário e Partilha com Menores e Incapazes">Inventário e Partilha com Menores e Incapazes</option>
                                <option value="Inventário e Partilha de Bens">Inventário e Partilha de Bens</option>
                                <option value="Mútuo">Mútuo</option>
                                <option value="Nomeação de Inventariante">Nomeação de Inventariante</option>
                                <option value="Nomeação de inventariante com menores e incapazes">Nomeação de inventariante com menores e incapazes</option>
                                <option value="Pacto Antenupcial">Pacto Antenupcial</option>
                                <option value="Pacto Pós Nupcial">Pacto Pós Nupcial</option>
                                <option value="Partilha Amigável">Partilha Amigável</option>
                                <option value="Permuta">Permuta</option>
                                <option value="Pública Forma">Pública Forma</option>
                                <option value="Quitação">Quitação</option>
                                <option value="Ratificação">Ratificação</option>
                                <option value="Re-Ratificação">Re-Ratificação</option>
                                <option value="Reconhecimento com dissolução de união estável e P">Reconhecimento com dissolução de união estável e P</option>
                                <option value="Reconhecimento de Paternidade">Reconhecimento de Paternidade</option>
                                <option value="Renúncia">Renúncia</option>
                                <option value="Renúncia de Direitos Hereditários">Renúncia de Direitos Hereditários</option>
                                <option value="Renúncia de Propriedade">Renúncia de Propriedade</option>
                                <option value="Renúncia de Usufruto">Renúncia de Usufruto</option>
                                <option value="Rerratificação">Rerratificação</option>
                                <option value="Rerratificação e Aditamento">Rerratificação e Aditamento</option>
                                <option value="Restabelecimento de Sociedade Conjugal">Restabelecimento de Sociedade Conjugal</option>
                                <option value="Retificação">Retificação</option>
                                <option value="Revogação de Clausula de Incomunicabilidade">Revogação de Clausula de Incomunicabilidade</option>
                                <option value="Revogação de Cláusula de Reversão">Revogação de Cláusula de Reversão</option>
                                <option value="Revogação Procuração (1)">Revogação Procuração (1)</option>
                                <option value="Sobrepartilha">Sobrepartilha</option>
                                <option value="Subrogação">Subrogação</option>
                                <option value="Transação - Acordo Extrajudicial">Transação - Acordo Extrajudicial</option>
                                <option value="OUTROS">OUTROS</option>
                            </select>
                            <div id="ato-outros-wrapper" class="form-group hidden">
                                <label>Outro ato</label>
                                <input type="text" id="ato-outros-input" data-field="ato" placeholder="Descreva o ato" maxlength="100">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Ficha</label>
                            <input type="number" data-field="ficha" min="0" max="9999999" maxlength="7">
                        </div>

                        <div class="form-group">
                            <label>Digitador</label>
                            <select id="digitador-select">
                                <option value="">Selecione…</option>
                                <?php if (!empty($digitadores)): ?>
                                    <?php foreach ($digitadores as $dig): ?>
                                        <option value="<?= htmlspecialchars($dig) ?>"><?= htmlspecialchars($dig) ?></option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                                <option value="OUTROS">OUTROS</option>
                            </select>
                            <div id="digitador-outros" class="form-group hidden">
                                <label>Outro digitador</label>
                                <input type="text" id="digitador-input" data-field="digitador" placeholder="Nome do digitador" maxlength="100">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Apresentante</label>
                            <input type="text" data-field="apresentante" maxlength="200">
                        </div>

                        <div class="form-group">
                            <label>Data de apresentação</label>
                            <input type="date" data-field="data_apresentacao">
                        </div>

                        <div class="form-group">
                            <label>Contato</label>
                            <input type="text" data-field="contato" maxlength="200">
                        </div>

                        <div class="form-group">
                            <label>Tag personalizada</label>
                            <select id="tag-custom-select">
                                <option value="">Selecione…</option>
                                <?php if (!empty($tagsMap)): ?>
                                    <?php foreach ($tagsMap as $key => $tag): ?>
                                        <option value="<?= htmlspecialchars($tag) ?>"><?= htmlspecialchars($tag) ?></option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                                <option value="OUTROS">OUTROS</option>
                            </select>
                            <div id="tag-custom-outros" class="form-group hidden">
                                <label>Outra tag</label>
                                <input type="text" id="tag-custom-input" data-field="tag_custom" placeholder="Ex.: FAZER ITBI" maxlength="50">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Escritura Urgente?</label>
                            <label class="switch-pill">
                                <input
                                    type="checkbox"
                                    data-field="urgente"
                                    value="1"
                                >
                                <span class="switch-track" aria-hidden="true"></span>
                            </label>
                        </div>

                    </div>
                </section>

                <!-- PARTES -->
                <section class="modal-section">
                    <h3>Partes</h3>

                    <div class="form-group">
                        <label>Outorgantes</label>
                        <textarea rows="3" data-field="outorgantes" maxlength="2000"></textarea>
                    </div>

                    <div class="form-group">
                        <label>Outorgados</label>
                        <textarea rows="3" data-field="outorgados" maxlength="2000"></textarea>
                    </div>
                </section>

                <!-- IMÓVEIS -->
                <section class="modal-section">
                    <h3>Imóveis</h3>

                    <div class="valores-adicionais">

                        <div class="valores-header">
                            <strong>Matrículas</strong>
                            <button class="btn-plus" onclick="adicionarImovel()">＋</button>
                        </div>

                        <div id="lista-imoveis"></div>

                    </div>
                </section>

            </div>

            <div class="modal-col">
                <!-- ANDAMENTOS -->
                <section class="modal-section">
                    <h3>Andamentos</h3>

                    <div class="andamentos">

                        <div class="novo-andamento">
                            <textarea
                                id="novo-andamento-texto"
                                rows="2"
                                placeholder="Adicionar novo andamento…"
                            ></textarea>
                            <button class="btn-primary" onclick="adicionarAndamento()">Adicionar</button>
                        </div>

                        <div id="lista-andamentos" class="timeline"></div>

                    </div>
                </section>

                <!-- VALORES -->
                <section class="modal-section">
                    <h3>Valores</h3>

                    <div class="form-group">
                        <label>Valor do ato</label>
                        <input
                            type="text"
                            data-field="valor_ato"
                            class="money"
                            inputmode="decimal"
                            placeholder="0,00"
                        >
                    </div>

                    <div class="valores-adicionais">

                        <div class="valores-header">
                            <strong>Valores adicionais</strong>
                            <button class="btn-plus" onclick="adicionarValor()">＋</button>
                        </div>

                        <div id="lista-valores"></div>

                        <div class="valores-total">
                            Total adicional:
                            <strong>R$ <span id="total-valores">0,00</span></strong>
                        </div>

                    </div>
                </section>

                <!-- OBSERVAÇÕES -->
                <section class="modal-section">
                    <h3>Observações</h3>

                    <div class="form-group">
                        <textarea rows="4" data-field="observacoes" maxlength="5000"></textarea>
                    </div>
                </section>
            </div>

        </div>

    </div>
</div>
