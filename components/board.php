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
    <section class="column column-para-distribuir" data-status="PARA_DISTRIBUIR">
        <header class="column-header">
            <div class="column-title-wrap">
                <h2 class="column-title">Para distribuir</h2>
                <span class="column-count" data-count="PARA_DISTRIBUIR">0</span>
            </div>
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
    <section class="column column-em-andamento" data-status="EM_ANDAMENTO">
        <header class="column-header">
            <div class="column-title-wrap">
                <h2 class="column-title">Em andamento</h2>
                <span class="column-count" data-count="EM_ANDAMENTO">0</span>
            </div>
        </header>

        <div class="cards" id="EM_ANDAMENTO">
            <?php foreach ($board['EM_ANDAMENTO'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- PARA CORREÇÃO -->
    <section class="column column-para-correcao" data-status="PARA_CORRECAO">
        <header class="column-header">
            <div class="column-title-wrap">
                <h2 class="column-title">Para correção</h2>
                <span class="column-count" data-count="PARA_CORRECAO">0</span>
            </div>
        </header>

        <div class="cards" id="PARA_CORRECAO">
            <?php foreach ($board['PARA_CORRECAO'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- LAVRADOS -->
    <section class="column column-lavrados" data-status="LAVRADOS">
        <header class="column-header">
            <div class="column-title-wrap">
                <h2 class="column-title">Lavrados</h2>
                <span class="column-count" data-count="LAVRADOS">0</span>
            </div>
        </header>

        <div class="cards" id="LAVRADOS">
            <?php foreach ($board['LAVRADOS'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- ARQUIVADOS (OCULTO POR PADRÃO) -->
    <section class="column column-arquivados hidden" data-status="ARQUIVADOS" id="coluna-arquivados">
        <header class="column-header">
            <div class="column-title-wrap">
                <h2 class="column-title">Arquivados</h2>
                <span class="column-count" data-count="ARQUIVADOS">0</span>
            </div>
        </header>

        <div class="cards" id="ARQUIVADOS">
            <?php foreach ($board['ARQUIVADOS'] ?? [] as $p): ?>
                <?php include __DIR__ . '/card.php'; ?>
            <?php endforeach; ?>
        </div>
    </section>

</div>
