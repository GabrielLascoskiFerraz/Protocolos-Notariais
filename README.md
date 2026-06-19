# Protocolos Notariais

Sistema interno para gestão de protocolos notariais em Kanban, com edição em modal, autosave, sincronização colaborativa, geração de PDF da ficha, agenda, árvores genealógicas, leitor de certidões, QR Code e vínculo de pasta de documentos.

## Requisitos

- PHP 8.x recomendado
- MySQL/MariaDB
- XAMPP/WAMP/LAMP ou servidor equivalente
- Navegador moderno

## Instalação

1. Crie o banco `dash-protocolos` ou outro nome de sua preferência.
2. Importe `database/schema.sql`.
3. Configure o banco por variáveis de ambiente ou edite `app/config/db.php`.
4. Acesse o projeto pelo navegador, por exemplo:

```text
http://localhost/Protocolos-Notariais/
```

## Variáveis de Ambiente

Todas são opcionais.

```bash
PROTOCOLOS_DB_HOST=localhost
PROTOCOLOS_DB_NAME=dash-protocolos
PROTOCOLOS_DB_USER=root
PROTOCOLOS_DB_PASS=
PROTOCOLOS_CALENDAR_ICS_URL=https://calendar.google.com/calendar/ical/...
PROTOCOLOS_CACHE_DIR=/caminho/fora/do/htdocs/cache
PROTOCOLOS_DOCUMENTOS_BASE='\\Srv01\d\Disco F\A FAZER - ESCRITURAS'
PROTOCOLOS_DOCUMENTOS_EXTRA_BASES='/outra/raiz:/mais/uma/raiz'
PROTOCOLOS_DOCUMENTOS_DEV_BASE='/Users/gabriel/Downloads'
```

Observação: para testes locais de documentos fora da raiz oficial, use `PROTOCOLOS_DOCUMENTOS_DEV_BASE` ou `PROTOCOLOS_DOCUMENTOS_EXTRA_BASES`.

## Estrutura Atual

```text
.
├── index.php                         # Entrada pública: Dashboard Kanban
├── calendario.php                    # Entrada pública: Consultar Agenda
├── arvores.php                       # Entrada pública: Árvores Genealógicas
├── certidoes.php                     # Entrada pública: Leitor de Certidões
├── gerador-qrcode.php                # Entrada pública: Gerador de QR Code
├── .htaccess                         # Proteções HTTP básicas do projeto
├── app/                              # Código interno, bloqueado para acesso HTTP direto
│   ├── .htaccess
│   ├── pages/                        # Telas renderizadas pelos wrappers públicos
│   │   ├── dashboard.php
│   │   ├── agenda.php
│   │   ├── arvores.php
│   │   ├── certidoes.php
│   │   └── qrcode.php
│   ├── api/                          # Implementações internas das APIs
│   │   ├── protocolos_app.php
│   │   ├── calendar.php
│   │   ├── ato-cores.php
│   │   └── tags.php
│   ├── config/
│   │   ├── db.php                    # Conexão PDO
│   │   ├── documentos.php            # Raízes permitidas para documentos
│   │   └── ato-cores.php             # Mapa fixo de cores dos atos
│   ├── services/
│   │   └── protocolos-metadata.php   # Metadados iniciais da dashboard
│   └── views/
│       ├── app-layout.php            # Layout compartilhado/sidebar/helper de ícones
│       └── genealogy-app.php         # Estrutura da ferramenta de genealogia
├── api/                              # Wrappers públicos compatíveis das APIs
│   ├── protocolos_app.php
│   ├── protocolos.php
│   ├── andamentos.php
│   ├── valores.php
│   ├── imoveis.php
│   ├── documentos.php
│   ├── calendar.php
│   ├── ato-cores.php
│   └── tags.php
├── assets/                           # Arquivos públicos estáticos
│   ├── css/protocolos-foundation.css # Base histórica isolada em cascade layer
│   ├── css/protocolos-redesign.css   # Interface visual autoritativa
│   ├── css/arvores.css               # Estilos isolados da genealogia
│   ├── img/
│   ├── js/apps/                      # Código de UI por tela
│   ├── js/features/                  # Regras client-side puras
│   ├── js/shared/                    # Helpers compartilhados
│   └── vendor/                       # PDF.js e QR Code Styling
├── database/                         # SQL, bloqueado por HTTP
│   ├── .htaccess
│   ├── schema.sql
│   └── migrations/
├── storage/                          # Arquivos temporários/testes locais, bloqueado por HTTP
│   ├── .htaccess
│   └── documentos-teste/
└── tests/                            # Testes, bloqueado por HTTP
    ├── .htaccess
    ├── js/
    └── php/
```

Observação: os arquivos públicos na raiz são wrappers pequenos. A implementação das telas fica em `app/pages/`, mantendo a raiz mais limpa e preservando URLs já usadas.

## Funcionalidades

- Kanban por status: Para distribuir, Em andamento, Para correção, Lavrados e Arquivados.
- Coluna de arquivados opcional.
- Criação rápida de protocolo.
- Drag and drop entre colunas.
- Autosave dos campos da modal.
- Filtros por busca, ato, digitador, etiqueta e urgência.
- Tags personalizadas.
- Urgência no card e no PDF.
- Andamentos, imóveis e valores adicionais dinâmicos.
- Vínculo de pasta de documentos e listagem somente leitura dos arquivos.
- Detecção visual de arquivos problemáticos na pasta vinculada.
- Geração de PDF da ficha.
- Criação, edição, importação e exportação de árvores genealógicas.
- Dados das árvores mantidos localmente no navegador.
- Leitor de certidões via PDF.js.
- Gerador de QR Code com marca central.
- Agenda via Google Calendar ICS com cache de 30 minutos.
- Aviso na dashboard para novos eventos do dia.
- Sincronização colaborativa por polling a cada 8 segundos.

## Banco de Dados

Tabelas principais:

- `protocolos`
- `protocolos_andamentos`
- `protocolos_valores`
- `protocolos_imoveis`
- `protocolos_tags`
- `vw_protocolos_board`

Campos relevantes em `protocolos`:

- `status`: `PARA_DISTRIBUIR`, `EM_ANDAMENTO`, `PARA_CORRECAO`, `LAVRADOS`, `ARQUIVADOS`
- `urgente`: `0` ou `1`
- `deletado`: soft delete
- `tag_custom`: etiqueta personalizada
- `pasta_documentos`: caminho UNC ou local permitido

Migrações avulsas:

```sql
database/migrations/2026_05_13_add_pasta_documentos.sql
database/migrations/2026_05_13_add_protocolos_indexes.sql
```

Para uma instalação nova, basta importar `database/schema.sql`.

## API Principal

Endpoint principal:

```text
api/protocolos_app.php
```

Parâmetros comuns:

- `resource`: `protocolos`, `andamentos`, `valores`, `imoveis`, `documentos`, `metadata`
- `action`: operação desejada

Os arquivos `api/protocolos.php`, `api/andamentos.php`, `api/valores.php`, `api/imoveis.php` e `api/documentos.php` são wrappers de compatibilidade para a API principal.

### Protocolos

```text
GET  api/protocolos_app.php?resource=protocolos&action=search
GET  api/protocolos_app.php?resource=protocolos&action=get&id=1
GET  api/protocolos_app.php?resource=protocolos&action=changes&since=YYYY-MM-DD HH:MM:SS
POST api/protocolos_app.php?resource=protocolos&action=create
POST api/protocolos_app.php?resource=protocolos&action=update
POST api/protocolos_app.php?resource=protocolos&action=status
POST api/protocolos_app.php?resource=protocolos&action=delete
```

### Sublistas

```text
resource=andamentos action=list|create|update|delete
resource=valores    action=list|create|update|delete
resource=imoveis    action=list|create|update|delete
resource=documentos action=list
resource=metadata   action=list
```

Todas as APIs retornam JSON. Erros internos não expõem detalhes técnicos ao navegador; detalhes devem ser consultados no log do servidor.

## Documentos Vinculados

A pasta só é listada se estiver dentro das raízes permitidas em `app/config/documentos.php`.

Raiz padrão:

```text
\\Srv01\d\Disco F\A FAZER - ESCRITURAS
```

Arquivos sinalizados visualmente como problemáticos:

- `.download`
- `.crdownload`
- `.tmp`
- arquivos sem extensão
- `Thumbs.db`
- `.exe`
- `.bat`

O sistema não apaga, move ou renomeia arquivos.

Para testes locais controlados dentro do projeto, use `storage/documentos-teste/`. Essa pasta é bloqueada por HTTP e fica liberada apenas para a listagem interna de documentos.

## Agenda

`api/calendar.php` baixa o ICS configurado, transforma em JSON e mantém cache por 30 minutos.

Por padrão, o cache fica fora do `htdocs`, em:

```text
/tmp/protocolos-notariais-cache
```

Use `PROTOCOLOS_CACHE_DIR` para definir outro local.

## Testes

### Lint PHP

```bash
find . -path './assets/vendor' -prune -o -path './.git' -prune -o -name '*.php' -print0 | xargs -0 -n1 /Applications/XAMPP/xamppfiles/bin/php -l
```

### Syntax check JS

```bash
find assets/js -name '*.js' -print0 | xargs -0 -n1 node --check
```

### Testes JS

```bash
node --test tests/js/*.test.js
```

### Teste de integração PHP

Requer servidor e banco ativos.

```bash
/Applications/XAMPP/xamppfiles/bin/php tests/php/ApiTestRunner.php http://localhost/Protocolos-Notariais/
```

## Observações de Manutenção

- O frontend ativo está em `assets/js/apps/`, `assets/js/features/` e `assets/js/shared/`.
- A interface visual ativa está em `assets/css/protocolos-redesign.css`.
- `assets/css/protocolos-foundation.css` encapsula `assets/css/protocolos-product.css` em uma cascade layer de baixa prioridade para preservar apenas contratos estruturais ainda necessários.
- A ferramenta de genealogia usa CSS isolado em `assets/css/arvores.css` e mantém compatibilidade com a chave local `raizes_genealogia_v1`.
- A API pública ativa é `api/protocolos_app.php`; a implementação fica em `app/api/protocolos_app.php`.
- Mantenha código interno PHP em `app/` e deixe `api/` apenas como camada pública/compatibilidade.
- Novas alterações de banco devem ser feitas por arquivo SQL versionado e refletidas em `database/schema.sql`.
