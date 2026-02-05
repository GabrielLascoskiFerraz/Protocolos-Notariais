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
│   └── db.php                # Conexão PDO
├── api/
│   ├── protocolos.php        # CRUD + busca + status
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
│   └── js/
│       ├── board.js          # drag & drop
│       ├── modal.js          # abrir/fechar modal
│       ├── autosave.js       # autosave dos campos
│       └── search.js         # busca + filtros + autosync
├── schema.sql                # Estrutura do banco
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
- Filtros por Ato e Digitador
- Coluna Arquivados oculta por padrao (botao na topbar)
- Sincronizacao automatica (polling)

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

## Endpoints principais (API)

### `api/protocolos.php`

- `action=create` (POST)
  - cria protocolo vazio

- `action=delete` (POST)
  - soft delete (`deletado = 1`)

- `action=search` (GET)
  - parametros: `q`, `ato`, `digitador`
  - retorna lista de protocolos

- `action=get` (GET)
  - parametro: `id`
  - retorna dados completos do protocolo

- `action=update` (POST)
  - parametros: `id`, `field`, `value`
  - campos permitidos: `ficha`, `ato`, `digitador`, `apresentante`, `data_apresentacao`, `contato`, `outorgantes`, `outorgados`, `matricula`, `area`, `valor_ato`, `observacoes`, `urgente`

- `action=status` (POST)
  - parametros: `id`, `status`
  - atualiza status

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

## Sincronizacao

O front faz polling a cada 8 segundos. Para reduzir custo:

- Aumente `SYNC_INTERVAL_MS` em `assets/js/search.js`
- Ou implemente sync incremental por `updated_at`

## Observacoes

- O sistema foi projetado para uso interno com poucos usuarios simultaneos.
- Em ambientes com grande volume de dados, avalie indices extras e sincronizacao incremental.
