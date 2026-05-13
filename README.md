# Protocolos Notariais

Sistema interno para gestão de protocolos notariais em Kanban, com edição em modal, autosave, sincronização colaborativa, geração de PDF da ficha, agenda, leitor de certidões, QR Code e vínculo de pasta de documentos.

## Requisitos

- PHP 8.x recomendado
- MySQL/MariaDB
- XAMPP/WAMP/LAMP ou servidor equivalente
- Navegador moderno

## Instalação

1. Crie o banco `dash-protocolos` ou outro nome de sua preferência.
2. Importe `schema.sql`.
3. Configure o banco por variáveis de ambiente ou edite `config/db.php`.
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
├── index.php                         # Dashboard Kanban de protocolos
├── calendario.php                    # Consultar Agenda
├── certidoes.php                     # Leitor de Certidões
├── gerador-qrcode.php                # Gerador de QR Code
├── components/
│   └── app-layout.php                # Layout compartilhado/header
├── apps/
│   ├── protocolos/
│   │   ├── api.js                    # Cliente HTTP do módulo de protocolos
│   │   ├── icons.js                  # Ícones SVG
│   │   ├── index.js                  # Board, modal, filtros, sync e interações
│   │   └── pdf.js                    # Impressão/PDF da ficha
│   ├── agenda/index.js               # UI da agenda
│   ├── certidoes/index.js            # UI do leitor de certidões
│   └── qrcode/index.js               # UI do QR Code
├── functions/
│   ├── certidoes/index.js            # Extração/estruturação de certidões via PDF.js
│   └── qrcode/index.js               # Funções puras do QR Code
├── api/
│   ├── protocolos_app.php            # API principal consolidada
│   ├── protocolos.php                # Wrapper compatível para resource=protocolos
│   ├── andamentos.php                # Wrapper compatível para resource=andamentos
│   ├── valores.php                   # Wrapper compatível para resource=valores
│   ├── imoveis.php                   # Wrapper compatível para resource=imoveis
│   ├── documentos.php                # Wrapper compatível para resource=documentos
│   ├── calendar.php                  # API/cache do Google Calendar ICS
│   ├── ato-cores.php                 # Mapa JSON das cores fixas por ato
│   └── tags.php                      # Endpoint legado de cores persistidas
├── config/
│   ├── db.php                        # Conexão PDO
│   ├── documentos.php                # Raízes permitidas para pastas de documentos
│   ├── ato-cores.php                 # Mapa fixo de cores dos atos
├── assets/
│   ├── css/apollo-product.css        # Camada visual atual baseada no APOLLO
│   ├── img/logo.png
│   ├── img/logo-cartorio-mono.svg
│   ├── js/base.js                    # Helper de base URL usado pela dashboard
│   ├── js/calendar-alerts.js         # Avisos de agenda na dashboard
│   └── vendor/                       # PDF.js e QR Code Styling
├── tests/
│   ├── js/                           # Testes node:test
│   └── php/                          # Runner de integração das APIs
├── schema.sql                        # Estrutura completa do banco
├── 2026_05_13_add_pasta_documentos.sql
└── 2026_05_13_add_protocolos_indexes.sql
```

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
2026_05_13_add_pasta_documentos.sql
2026_05_13_add_protocolos_indexes.sql
```

Para uma instalação nova, basta importar `schema.sql`.

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

A pasta só é listada se estiver dentro das raízes permitidas em `config/documentos.php`.

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
find apps functions assets/js -name '*.js' -print0 | xargs -0 -n1 node --check
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

- O frontend ativo está em `apps/` e `functions/`.
- O CSS ativo é `assets/css/apollo-product.css`.
- A API ativa é `api/protocolos_app.php`.
- Evite recriar módulos em `assets/js`; essa pasta hoje contém apenas helpers globais pontuais.
- Novas alterações de banco devem ser feitas por arquivo SQL versionado e refletidas em `schema.sql`.
