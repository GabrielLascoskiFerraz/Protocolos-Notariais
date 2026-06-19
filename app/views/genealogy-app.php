<div id="genealogy-app" class="genealogy-app">
  <section id="library-screen" class="screen library-screen">
    <main class="library-main">
      <header class="genealogy-command">
        <div class="library-intro">
          <span class="genealogy-command-icon" aria-hidden="true">
            <svg viewBox="0 0 28 28">
              <path d="M14 23V10"></path>
              <path d="M14 15c-4-.6-6.8-3.1-7.6-6.6 4.4-.4 7.1 2 7.6 6.6Z"></path>
              <path d="M14 18.5c4.6-.5 7.5-3.1 8.3-7-4.8-.4-7.8 2.2-8.3 7Z"></path>
              <path d="M14 10.5c2.8-.5 4.5-2.5 4.6-5.4-3.1.1-4.9 2.2-4.6 5.4Z"></path>
              <path d="M10 23h8"></path>
            </svg>
          </span>
          <div>
            <span class="genealogy-kicker">Genealogia</span>
            <h1>Árvores genealógicas</h1>
            <p>Monte e organize árvores genealógicas.</p>
          </div>
        </div>
          <div class="library-actions">
            <button id="create-tree-btn" class="button button-primary" type="button">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8m-4-4h8" />
              </svg>
              Criar nova árvore
            </button>
            <button id="import-tree-btn" class="button button-secondary" type="button">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
                <path d="M14 3v6h6M12 17V11m-3 3 3-3 3 3" />
              </svg>
              Importar JSON
            </button>
            <input id="import-file-input" type="file" accept=".json,application/json" hidden />
          </div>
      </header>

      <section class="genealogy-library-panel">
          <label class="search-field library-search" for="tree-search">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input id="tree-search" type="search" placeholder="Buscar árvores" autocomplete="off" />
          </label>

          <section class="saved-section" aria-labelledby="saved-title">
            <div class="section-heading">
              <h2 id="saved-title">Árvores salvas</h2>
              <span id="tree-count" class="muted-count"></span>
            </div>
            <div id="tree-list" class="tree-list"></div>
          </section>
      </section>
    </main>
  </section>

      <section id="editor-screen" class="screen editor-screen" hidden>
        <header class="editor-header">
          <button id="back-to-library-btn" class="back-button" type="button" aria-label="Minhas árvores">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>Minhas árvores</span>
          </button>
          <div class="header-divider"></div>
          <button id="rename-current-btn" class="tree-title-button" type="button" title="Renomear árvore">
            <span id="current-tree-name">Árvore genealógica</span>
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
          </button>
          <div class="editor-header-actions">
            <button id="mobile-add-btn" class="button button-primary compact mobile-only" type="button">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6m-3-3h6" />
              </svg>
              Pessoa
            </button>
            <button id="export-tree-btn" class="button button-secondary compact" type="button" aria-label="Exportar JSON">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
                <path d="M14 3v6h6M12 11v6m-3-3 3 3 3-3" />
              </svg>
              <span class="button-label">Exportar JSON</span>
            </button>
            <button id="export-tree-pdf-btn" class="button button-secondary compact" type="button" aria-label="Exportar árvore em PDF">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
                <path d="M7 14h10v7H7zM17 12h.01" />
              </svg>
              <span class="button-label">Exportar PDF</span>
            </button>
            <div class="person-search-wrap">
              <label class="search-field editor-search" for="person-search">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input id="person-search" type="search" placeholder="Buscar pessoa" autocomplete="off" />
              </label>
              <div id="person-search-results" class="autocomplete-list search-results" hidden></div>
            </div>
          </div>
        </header>

        <main class="editor-layout">
          <aside id="add-panel" class="side-panel add-panel">
            <div class="panel-heading">
              <div>
                <h2>Adicionar pessoa</h2>
                <p>Informe os vínculos e a árvore será organizada automaticamente.</p>
              </div>
              <button id="close-add-panel-btn" class="icon-button mobile-only" type="button" aria-label="Fechar painel">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <form id="add-person-form" class="person-form" autocomplete="off" data-form-type="other">
              <div class="field-group">
                <label for="add-person-name">Nome da pessoa</label>
                <input id="add-person-name" type="text" placeholder="Digite o nome da pessoa" required autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
              </div>
              <div class="field-group autocomplete">
                <label for="add-mother-name">Nome da mãe</label>
                <input id="add-mother-name" type="text" placeholder="Digite o nome da mãe" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
                <div class="autocomplete-list" data-autocomplete-for="add-mother-name" hidden></div>
              </div>
              <div class="field-group autocomplete">
                <label for="add-father-name">Nome do pai</label>
                <input id="add-father-name" type="text" placeholder="Digite o nome do pai" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
                <div class="autocomplete-list" data-autocomplete-for="add-father-name" hidden></div>
              </div>
              <div class="field-group autocomplete">
                <label for="add-spouse-name">Nome do cônjuge</label>
                <input id="add-spouse-name" type="text" placeholder="Digite o nome do cônjuge" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
                <div class="autocomplete-list" data-autocomplete-for="add-spouse-name" hidden></div>
              </div>
              <label class="checkbox-field" for="add-deceased">
                <input id="add-deceased" name="tree-person-deceased" type="checkbox" autocomplete="off" />
                <span>
                  <strong>Pessoa falecida</strong>
                  <small>Exibe essa informação no bloco da pessoa.</small>
                </span>
              </label>
              <p class="form-helper">
                Pessoas desta árvore serão sugeridas. Familiares ainda não cadastrados serão criados automaticamente.
              </p>
              <button class="button button-primary full-width" type="submit">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v8m-4-4h8" />
                </svg>
                Adicionar à árvore
              </button>
            </form>
          </aside>

          <section class="canvas-section" aria-label="Visualização da árvore genealógica">
            <div id="tree-viewport" class="tree-viewport" tabindex="0">
              <div class="canvas-tip">
                Arraste para navegar · Use a roda do mouse para ampliar
              </div>
              <div id="empty-tree-state" class="empty-tree-state" hidden>
                <span class="empty-tree-icon" aria-hidden="true">
                  <svg viewBox="0 0 48 48">
                    <path d="M24 42V14M24 24c-6-1-10-5-11-10 7-1 11 3 11 10Zm0 7c7-1 12-5 13-11-8-1-13 4-13 11ZM24 16c4-1 7-4 7-9-5 0-8 4-7 9Z" />
                    <path d="M18 42h12" />
                  </svg>
                </span>
                <h2>Comece por uma pessoa</h2>
                <p>Adicione um nome, mãe e pai. Os blocos e vínculos serão montados para você.</p>
                <button id="empty-add-btn" class="button button-primary" type="button">Adicionar primeira pessoa</button>
              </div>
              <div id="tree-world" class="tree-world">
                <svg id="connections-layer" class="connections-layer" aria-hidden="true"></svg>
                <div id="nodes-layer" class="nodes-layer"></div>
              </div>
            </div>

            <div class="canvas-controls" aria-label="Controles da visualização">
              <button id="pan-mode-btn" class="icon-button active" type="button" title="Arrastar tela" aria-label="Arrastar tela">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 11V6a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v4-2a2 2 0 0 1 4 0v5a7 7 0 0 1-7 7h-2c-3 0-5-2-7-5l-2-3a2 2 0 0 1 3-2l3 3" />
                </svg>
              </button>
              <span class="controls-divider"></span>
              <button id="zoom-out-btn" class="icon-button" type="button" title="Diminuir zoom" aria-label="Diminuir zoom">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12h10" /></svg>
              </button>
              <span id="zoom-label" class="zoom-label">100%</span>
              <button id="zoom-in-btn" class="icon-button" type="button" title="Aumentar zoom" aria-label="Aumentar zoom">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v10M7 12h10" /></svg>
              </button>
              <span class="controls-divider"></span>
              <button id="fit-tree-btn" class="fit-button" type="button" title="Enquadrar toda a árvore">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" />
                </svg>
                Enquadrar
              </button>
            </div>
          </section>

          <aside id="edit-panel" class="side-panel edit-panel" hidden>
            <div class="panel-heading edit-heading">
              <div>
                <h2>Editar pessoa</h2>
                <p>Atualize os dados e vínculos familiares.</p>
              </div>
              <button id="close-edit-panel-btn" class="icon-button" type="button" aria-label="Fechar edição">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div id="selected-person-summary" class="selected-person-summary"></div>
            <form id="edit-person-form" class="person-form" autocomplete="off" data-form-type="other">
              <div class="field-group">
                <label for="edit-person-name">Nome da pessoa</label>
                <input id="edit-person-name" type="text" required autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
              </div>
              <div class="field-group autocomplete">
                <label for="edit-mother-name">Nome da mãe</label>
                <input id="edit-mother-name" type="text" placeholder="Sem mãe informada" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
                <div class="autocomplete-list" data-autocomplete-for="edit-mother-name" hidden></div>
              </div>
              <div class="field-group autocomplete">
                <label for="edit-father-name">Nome do pai</label>
                <input id="edit-father-name" type="text" placeholder="Sem pai informado" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
                <div class="autocomplete-list" data-autocomplete-for="edit-father-name" hidden></div>
              </div>
              <div class="field-group autocomplete">
                <label for="edit-spouse-name">Nome do cônjuge</label>
                <input id="edit-spouse-name" type="text" placeholder="Sem cônjuge informado" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" />
                <div class="autocomplete-list" data-autocomplete-for="edit-spouse-name" hidden></div>
              </div>
              <label class="checkbox-field" for="edit-deceased">
                <input id="edit-deceased" name="tree-edit-person-deceased" type="checkbox" autocomplete="off" />
                <span>
                  <strong>Pessoa falecida</strong>
                  <small>Exibe essa informação no bloco da pessoa.</small>
                </span>
              </label>
              <button class="button button-primary full-width" type="submit">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                  <path d="M17 21v-8H7v8M7 3v5h8" />
                </svg>
                Salvar alterações
              </button>
              <button id="remove-person-btn" class="button button-danger full-width" type="button">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7" />
                </svg>
                Remover pessoa
              </button>
            </form>
          </aside>
        </main>
      </section>

    <div id="modal-backdrop" class="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button id="modal-close-btn" class="icon-button modal-close" type="button" aria-label="Fechar">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div id="modal-icon" class="modal-icon" aria-hidden="true"></div>
        <h2 id="modal-title"></h2>
        <p id="modal-message"></p>
        <form id="modal-form">
          <div id="modal-field-wrap" class="field-group">
            <label id="modal-field-label" for="modal-input"></label>
            <input id="modal-input" type="text" autocomplete="off" />
          </div>
          <div class="modal-actions">
            <button id="modal-cancel-btn" class="button button-secondary" type="button">Cancelar</button>
            <button id="modal-confirm-btn" class="button button-primary" type="submit">Confirmar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
    </div>
