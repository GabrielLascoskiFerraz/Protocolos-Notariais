<?php
/**
 * Espera receber:
 * $board = [
 *   'PARA_DISTRIBUIR' => [...],
 *   'EM_ANDAMENTO'   => [...],
 *   'PARA_CORRECAO'  => [...],
 *   'LAVRADOS'       => [...],
 *   'ARQUIVADOS'     => [...] // pode existir ou não
 * ];
 */
?>

<div class="board">

    <!-- PARA DISTRIBUIR -->
    <section class="column" data-status="PARA_DISTRIBUIR">
        <header class="column-header">
            <h2>Para distribuir</h2>
            <button
                class="add-card"
                title="Criar novo protocolo"
                onclick="criarProtocolo()"
            >
                ＋
            </button>
        </header>

        <div class="cards" id="PARA_DISTRIBUIR">
            <?php foreach ($board['PARA_DISTRIBUIR'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- EM ANDAMENTO -->
    <section class="column" data-status="EM_ANDAMENTO">
        <header class="column-header">
            <h2>Em andamento</h2>
        </header>

        <div class="cards" id="EM_ANDAMENTO">
            <?php foreach ($board['EM_ANDAMENTO'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- PARA CORREÇÃO -->
    <section class="column" data-status="PARA_CORRECAO">
        <header class="column-header">
            <h2>Para correção</h2>
        </header>

        <div class="cards" id="PARA_CORRECAO">
            <?php foreach ($board['PARA_CORRECAO'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- LAVRADOS -->
    <section class="column" data-status="LAVRADOS">
        <header class="column-header">
            <h2>Lavrados</h2>
        </header>

        <div class="cards" id="LAVRADOS">
            <?php foreach ($board['LAVRADOS'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- ARQUIVADOS (OCULTO POR PADRÃO) -->
    <section class="column hidden" data-status="ARQUIVADOS" id="coluna-arquivados">
        <header class="column-header">
            <h2>Arquivados</h2>
        </header>

        <div class="cards" id="ARQUIVADOS">
            <?php foreach ($board['ARQUIVADOS'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

</div>