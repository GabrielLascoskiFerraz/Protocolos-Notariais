# Protocolos Notariais

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
│   ├── db.php                # Conexao PDO
│   └── ato-cores.php         # Mapa centralizado de cores dos atos
├── api/
│   ├── protocolos.php        # CRUD + busca + status + sync
│   ├── andamentos.php        # CRUD historico
│   ├── valores.php           # CRUD valores adicionais
│   ├── imoveis.php           # CRUD imoveis
│   ├── tags.php              # cores dos atos (persistidas no DB)
│   └── ato-cores.php         # Endpoint JSON do mapa de cores fixo
├── components/
│   ├── board.php             # estrutura do kanban (5 colunas)
│   ├── card.php              # card individual
│   └── modal.php             # painel do protocolo
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── img/
│   │   └── logo.png
│   └── js/                   # Modulos ES6
│       ├── base.js           # base URL p/ subpastas
│       ├── state.js          # estado centralizado da aplicacao
│       ├── toast.js          # notificacoes
│       ├── board.js          # drag & drop
│       ├── modal.js          # abrir/fechar modal + PDF
│       ├── autosave.js       # autosave dos campos
│       ├── search.js         # busca + filtros + sync incremental
│       └── tags.js           # cores por ato
├── tests/                    # Testes automatizados
│   ├── php/                  # Testes PHP (PHPUnit)
│   └── js/                   # Testes JS (Jest/Vitest)
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

## Referencia da API

Todas as respostas sao JSON (`Content-Type: application/json; charset=utf-8`).
O parametro `action` na query string define a operacao.

---

### `api/protocolos.php` — Protocolos

#### `action=create` — Criar protocolo

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | nenhum |
| Resposta | `{ "success": true, "id": 42 }` |

Cria um protocolo vazio com status `PARA_DISTRIBUIR`.

#### `action=get` — Buscar protocolo

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | `id` (int, obrigatorio) |
| Resposta | Objeto com todos os campos do protocolo + `tag_cor` e `total_valores` |

Exemplo de resposta:

```json
{
  "id": 1,
  "ficha": 123,
  "ato": "Compra e venda",
  "digitador": "Maria",
  "apresentante": "Joao",
  "data_apresentacao": "2025-03-15",
  "contato": "(11) 99999-0000",
  "outorgantes": "Fulano",
  "outorgados": "Beltrano",
  "valor_ato": "1500.00",
  "status": "EM_ANDAMENTO",
  "observacoes": "",
  "urgente": 0,
  "tag_custom": "FAZER ITBI",
  "tag_cor": "#4f46e5",
  "total_valores": "350.00",
  "created_at": "2025-03-15 10:30:00",
  "updated_at": "2025-03-15 14:22:00"
}
```

#### `action=search` — Busca paginada

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | `q` (texto), `ato`, `digitador`, `urgente` (0/1), `tag_custom`, `status`, `limit` (default 50), `offset` (default 0) |
| Resposta | `{ "items": [...], "server_now": "2025-03-15 14:22:00" }` |

A busca textual (`q`) pesquisa nos campos: `ficha`, `digitador`, `apresentante`, `outorgantes`, `outorgados`, `ato`.

#### `action=update` — Atualizar campo

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int), `field` (string), `value` (string) |
| Resposta | `{ "success": true }` |

Campos permitidos: `ficha`, `ato`, `digitador`, `apresentante`, `data_apresentacao`, `contato`, `outorgantes`, `outorgados`, `matricula`, `area`, `valor_ato`, `observacoes`, `urgente`, `tag_custom`.

#### `action=status` — Alterar status

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int), `status` (enum) |
| Resposta | `{ "success": true }` |

Valores validos para status: `PARA_DISTRIBUIR`, `EM_ANDAMENTO`, `PARA_CORRECAO`, `LAVRADOS`, `ARQUIVADOS`.

#### `action=delete` — Excluir protocolo

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int) |
| Resposta | `{ "success": true }` |

Executa soft-delete (marca `deletado = 1`). O registro permanece no banco.

#### `action=changes` — Sync incremental

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | `since` (timestamp `YYYY-MM-DD HH:MM:SS`) |
| Resposta | `{ "items": [...], "deleted": [1, 2], "server_now": "..." }` |

Retorna apenas protocolos modificados desde `since`. Usado pelo auto-sync do frontend.

---

### `api/andamentos.php` — Historico

#### `action=list`

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | `protocolo_id` (int) |
| Resposta | Array de andamentos `[{ "id", "descricao", "created_at" }, ...]` |

#### `action=create`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `protocolo_id` (int), `descricao` (string) |
| Resposta | `{ "success": true, "id": 5 }` |

Ao criar um andamento, o campo `updated_at` do protocolo pai tambem e atualizado (para sync incremental).

#### `action=update`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int), `descricao` (string) |
| Resposta | `{ "success": true }` |

#### `action=delete`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int) |
| Resposta | `{ "success": true }` |

---

### `api/valores.php` — Valores adicionais

#### `action=list`

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | `protocolo_id` (int) |
| Resposta | Array de valores `[{ "id", "descricao", "valor", "created_at" }, ...]` |

#### `action=create`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `protocolo_id` (int), `descricao` (string), `valor` (decimal) |
| Resposta | `{ "success": true, "id": 3 }` |

#### `action=update`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int), `descricao` (string), `valor` (decimal) |
| Resposta | `{ "success": true, "total": "1250.00" }` |

O campo `total` retorna a soma de todos os valores adicionais do protocolo.

#### `action=delete`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int) |
| Resposta | `{ "success": true }` |

---

### `api/imoveis.php` — Imoveis

#### `action=list`

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | `protocolo_id` (int) |
| Resposta | Array de imoveis `[{ "id", "matricula", "area", "created_at" }, ...]` |

#### `action=create`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `protocolo_id` (int), `matricula` (string), `area` (string) |
| Resposta | `{ "success": true, "id": 7 }` |

#### `action=update`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int), `matricula` (string), `area` (string) |
| Resposta | `{ "success": true }` |

#### `action=delete`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `id` (int) |
| Resposta | `{ "success": true }` |

---

### `api/tags.php` — Cores dos atos

#### `action=list`

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | nenhum |
| Resposta | Array `[{ "ato": "Compra e venda", "cor": "#4f46e5" }, ...]` |

#### `action=create`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `ato` (string), `cor` (hex, ex: `#ff0000`) |
| Resposta | `{ "success": true }` |

Usa `ON DUPLICATE KEY UPDATE`: se o ato ja existe, atualiza a cor.

#### `action=update`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `ato` (string), `cor` (hex) |
| Resposta | `{ "success": true }` |

#### `action=delete`

| Item | Valor |
|------|-------|
| Metodo | `POST` |
| Parametros | `ato` (string) |
| Resposta | `{ "success": true }` |

---

### `api/ato-cores.php` — Mapa de cores fixo

| Item | Valor |
|------|-------|
| Metodo | `GET` |
| Parametros | nenhum |
| Resposta | Objeto JSON `{ "Compra e venda": "#4f46e5", ... }` |

Retorna o mapa estatico de cores definido em `config/ato-cores.php`. Usado pelo frontend para colorir cards sem depender do banco.

---

### Codigos de erro

Todas as APIs retornam os seguintes codigos HTTP em caso de erro:

| Codigo | Significado |
|--------|-------------|
| `400` | Parametros obrigatorios ausentes ou invalidos |
| `404` | Registro nao encontrado |
| `405` | Metodo HTTP incorreto (ex: GET onde espera POST) |
| `500` | Erro interno do servidor |

Formato da resposta de erro:

```json
{ "error": "Descricao do erro" }
```

## Sincronizacao e desempenho

- O front faz **sync incremental** a cada 8 segundos (`SYNC_INTERVAL_MS`).
- O carregamento é paginado por coluna (`PAGE_SIZE`).
- Quando filtros estão ativos, o auto-sync é desativado para evitar “pisca”.

## Observacoes

- O sistema foi projetado para uso interno com poucos usuarios simultaneos.
- Em ambientes com grande volume de dados, ajuste `PAGE_SIZE` e `SYNC_INTERVAL_MS`.