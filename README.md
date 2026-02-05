# Dash Protocolos (Kanban)

Sistema interno de protocolos em formato Kanban, com cadastro, histórico (andamentos), valores adicionais, busca, filtros e sincronização automática.

## Requisitos

- PHP 7.4+ (recomendado 8.x)
- MySQL/MariaDB
- Servidor local (XAMPP/WAMP/LAMP)

## Estrutura do projeto

```
/htdocs
├── index.php                 # Board Kanban
├── config/
│   └── db.php                # Conexão PDO
├── api/
│   ├── protocolos.php        # CRUD + busca + status + sync
│   ├── andamentos.php        # CRUD histórico
│   ├── valores.php           # CRUD valores adicionais
│   └── tags.php              # cores dos atos (se usado)
├── components/
│   ├── board.php             # estrutura do kanban
│   ├── card.php              # card individual
│   └── modal.php             # painel do protocolo
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── img/
│   │   └── logo.png
│   └── js/
│       ├── base.js           # base URL p/ subpastas
│       ├── board.js          # drag & drop
│       ├── modal.js          # abrir/fechar modal + PDF
│       ├── autosave.js       # autosave dos campos
│       ├── search.js         # busca + filtros + sync incremental
│       ├── tags.js
│       └── toast.js
└── schema.sql                # Estrutura do banco
```

## Configuracao

1) Crie o banco (ex.: `dash-protocolos`).

2) Importe o `schema.sql` no seu banco.

3) Configure `config/db.php`:

```php
$host = 'localhost';
$db   = 'dash-protocolos';
$user = 'root';
$pass = '';
```

4) Coloque o projeto dentro do `htdocs` do XAMPP e acesse no navegador:

```
http://localhost/protocolos
```

## Funcionalidades principais

- Board Kanban por status
- Criacao e edicao rapida de protocolos
- Drag & drop entre colunas (atualiza status)
- Modal com campos completos, valores adicionais e andamentos
- Autosave em tempo real
- Busca global
- Filtros por Ato, Digitador, Tag personalizada e Urgentes
- Coluna Arquivados oculta por padrao (botao na topbar)
- Tags personalizadas por protocolo
- PDF da ficha (A4)
- Sincronizacao incremental (por `updated_at`)
- Paginação por coluna (lazy-load)

## Banco de dados

Tabelas principais (veja detalhes em `schema.sql`):

- `protocolos`
- `protocolos_andamentos`
- `protocolos_valores`
- `protocolos_tags`
- `vw_protocolos_board`

Campos importantes:

- `status`: `PARA_DISTRIBUIR`, `EM_ANDAMENTO`, `PARA_CORRECAO`, `LAVRADOS`, `ARQUIVADOS`
- `urgente`: `0/1`
- `deletado`: `0/1`
- `tag_custom`: tag personalizada

## Endpoints principais (API)

### `api/protocolos.php`

- `action=create` (POST)
  - cria protocolo vazio

- `action=delete` (POST)
  - soft delete (`deletado = 1`)

- `action=search` (GET)
  - parametros: `q`, `ato`, `digitador`, `urgente`, `tag_custom`, `status`, `limit`, `offset`
  - retorna: `{ items: [...], server_now: 'YYYY-MM-DD HH:MM:SS' }`

- `action=get` (GET)
  - parametro: `id`
  - retorna dados completos do protocolo

- `action=update` (POST)
  - parametros: `id`, `field`, `value`
  - campos permitidos: `ficha`, `ato`, `digitador`, `apresentante`, `data_apresentacao`, `contato`, `outorgantes`, `outorgados`, `matricula`, `area`, `valor_ato`, `observacoes`, `urgente`, `tag_custom`

- `action=status` (POST)
  - parametros: `id`, `status`
  - atualiza status

- `action=changes` (GET)
  - parametros: `since`
  - retorna somente registros alterados desde `since`

### `api/andamentos.php`

- `action=list` (GET)
  - parametro: `protocolo_id`

- `action=create` (POST)
  - parametros: `protocolo_id`, `descricao`

- `action=update` (POST)
  - parametros: `id`, `descricao`

- `action=delete` (POST)
  - parametro: `id`

### `api/valores.php`

- `action=list`, `create`, `update`, `delete`
  - CRUD de valores adicionais

## Sincronizacao e desempenho

- O front faz **sync incremental** a cada 8 segundos (`SYNC_INTERVAL_MS`).
- O carregamento é paginado por coluna (`PAGE_SIZE`).
- Quando filtros estão ativos, o auto-sync é desativado para evitar “pisca”.

## Observacoes

- O sistema foi projetado para uso interno com poucos usuarios simultaneos.
- Em ambientes com grande volume de dados, ajuste `PAGE_SIZE` e `SYNC_INTERVAL_MS`.