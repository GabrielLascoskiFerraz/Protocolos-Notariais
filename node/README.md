# Protocolos Notariais — servidor independente

Versão autônoma do sistema de protocolos. Um único processo oferece o site, a API, o banco SQLite, a sincronização em tempo real, a agenda e os backups.

## Requisitos de uso

- Windows 10/11 ou macOS para a distribuição empacotada.
- Uma máquina ligada na rede interna para atuar como servidor.
- Navegador moderno nos computadores dos usuários.

PHP, XAMPP e MySQL não são necessários depois da migração.

## Início rápido

### Desenvolvimento

```bash
npm install
npm start
```

O endereço padrão na própria máquina é `http://localhost:8080`.

Na rede local, o servidor anuncia automaticamente um endereço amigável por mDNS/Bonjour:

```text
http://protocolos.local:8080
```

O nome pode ser alterado em **Configurações > Servidor > Endereço amigável**. A mesma tela mostra os endereços IP disponíveis como alternativa. Para aceitar conexões de outras máquinas, mantenha o endereço de escuta como `0.0.0.0`.

O endereço `.local` funciona nativamente no macOS e em versões atuais do Windows com suporte a mDNS. Redes que bloqueiam multicast podem usar um dos endereços IP alternativos exibidos nas configurações.

### Distribuição empacotada

- macOS: execute `npm run build:mac` no macOS.
- Windows: execute `npm run build:win` no Windows para incluir os binários corretos da plataforma.

O resultado fica em `dist/`, contendo o executável, o site, a configuração e as pastas de dados.

No Windows, `iniciar.bat` inicia manualmente. `instalar-inicializacao.bat`, executado como administrador, registra uma tarefa de inicialização do sistema. Isso permite executar o programa sem manter um usuário conectado.

## Estrutura de dados

```text
config/server.json       Configuração efetiva criada na primeira execução
data/protocolos.sqlite   Banco principal
backups/                 Backups verificados
logs/                    Logs persistentes futuros
site/                    Interface servida aos navegadores
```

Nunca compartilhe diretamente o arquivo SQLite entre computadores. Somente o executável servidor deve acessar `data/protocolos.sqlite`; os usuários acessam o sistema pelo navegador.

## Sincronização e concorrência

- WebSocket distribui alterações e presença imediatamente.
- Cada protocolo possui uma revisão numérica.
- Edições simultâneas em campos diferentes são mescladas.
- Alterações concorrentes no mesmo campo retornam conflito real.
- `operationId` torna repetições de rede idempotentes.
- O autosave agrupa campos e mantém uma única fila ordenada por ficha no navegador.
- Abrir uma ficha publica presença, mas não bloqueia nenhum usuário.

## Backup

A tela **Configurações** permite definir periodicidade, horário, destino e retenção. Cada backup usa o mecanismo seguro do SQLite e passa por `PRAGMA integrity_check` antes de ser considerado concluído.

Se o destino for uma pasta de rede, a conta que executa a tarefa de inicialização precisa ter permissão de escrita nessa pasta.

## Migração do sistema legado

Em **Configurações > Importar banco legado**, informe host, porta, banco, usuário e senha do MySQL antigo. O fluxo:

1. analisa as tabelas e mostra as quantidades;
2. cria um backup do SQLite atual;
3. lê o MySQL sem modificá-lo;
4. importa protocolos, imóveis, valores, andamentos e tags em uma transação;
5. recupera matrícula e área de bancos antigos que ainda não possuem a tabela de imóveis completa;
6. valida contagens e chaves estrangeiras antes de confirmar a transação;
7. cancela toda a transação se ocorrer uma falha e informa o motivo técnico na interface.

Faça primeiro uma migração de ensaio e compare as quantidades antes de retirar o sistema anterior de operação.

## Testes

```bash
npm test
npm run check
npm audit --omit=dev
```

A suíte cobre merge de edições simultâneas, conflito no mesmo campo, idempotência e integridade de backup. A migração também foi validada ponta a ponta contra uma instância MariaDB temporária, incluindo valores decimais, imóveis, andamentos e dados do formato legado.
