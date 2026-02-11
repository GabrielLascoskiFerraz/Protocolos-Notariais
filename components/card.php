<?php
/**
 * Espera receber no escopo:
 * $p = dados do protocolo
 *
 * Campos usados:
 * - id
 * - status
 * - ficha
 * - ato
 * - apresentante
 * - digitador
 * - outorgantes
 * - data_apresentacao
 * - total_valores
 * - tag_cor
 * - urgente
 */
?>

<div
    class="card <?= !empty($p['urgente']) ? 'card-urgente' : '' ?>"
    draggable="true"
    data-id="<?= (int)$p['id'] ?>"
    data-status="<?= htmlspecialchars($p['status']) ?>"
    onclick="abrirModal(<?= (int)$p['id'] ?>)"
>
    <!-- TAG DO ATO -->
    <?php
        if (!isset($GLOBALS['atoCores'])) {
            $GLOBALS['atoCores'] = require __DIR__ . '/../config/ato-cores.php';
        }

        $ato = $p['ato'] ?? '';
        $bg = $GLOBALS['atoCores'][$ato] ?? ($p['tag_cor'] ?? '#64748b');

        $hex = ltrim($bg, '#');
        if (strlen($hex) === 6) {
            $r = hexdec(substr($hex, 0, 2)) / 255;
            $g = hexdec(substr($hex, 2, 2)) / 255;
            $b = hexdec(substr($hex, 4, 2)) / 255;
            $luma = 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
            $fg = $luma > 0.6 ? '#0f172a' : '#ffffff';
        } else {
            $fg = '#ffffff';
        }
    ?>
    <div
        class="card-tag"
        style="background-color: <?= htmlspecialchars($bg) ?>; color: <?= htmlspecialchars($fg) ?>"
        title="<?= htmlspecialchars($ato) ?>"
    >
        <?= htmlspecialchars(mb_strtoupper($ato, 'UTF-8')) ?>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div class="card-body">

        <?php if (!empty($p['ficha'])): ?>
            <div class="card-ficha">
                <span>Ficha <?= (int)$p['ficha'] ?></span>
                <?php if (!empty($p['urgente'])): ?>
                    <span class="tag-urgente">Urgente</span>
                <?php endif; ?>
                <?php if (!empty($p['tag_custom'])): ?>
                    <span class="tag-custom"><?= htmlspecialchars($p['tag_custom']) ?></span>
                <?php endif; ?>
            </div>
        <?php elseif (!empty($p['urgente'])): ?>
            <div class="card-ficha">
                <span class="tag-urgente">Urgente</span>
            </div>
        <?php elseif (!empty($p['tag_custom'])): ?>
            <div class="card-ficha">
                <span class="tag-custom"><?= htmlspecialchars($p['tag_custom']) ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['apresentante'])): ?>
            <div class="card-apresentante">
                <span class="card-icon">👤</span>
                <?= htmlspecialchars($p['apresentante']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['digitador'])): ?>
            <div class="card-digitador">
                <span class="card-icon">⌨️</span>
                Digitador: <?= htmlspecialchars($p['digitador']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['outorgantes'])): ?>
            <div class="card-outorgantes">
                <span class="card-icon">📝</span>
                Outorgante: <?= htmlspecialchars($p['outorgantes']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['outorgados'])): ?>
            <div class="card-outorgados">
                <span class="card-icon">🧾</span>
                Outorgado: <?= htmlspecialchars($p['outorgados']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($p['data_apresentacao'])): ?>
            <div class="card-data">
                <span class="card-icon">📅</span>
                <?= date('d/m/Y', strtotime($p['data_apresentacao'])) ?>
            </div>
        <?php endif; ?>

    </div>

    <!-- RODAPÉ -->
    <div class="card-footer">

        <div class="card-actions">

            <?php if (($p['status'] ?? '') !== 'ARQUIVADOS'): ?>
                <button
                    onclick="event.stopPropagation(); arquivarProtocolo(<?= (int)$p['id'] ?>)"
                >
                    Arquivar
                </button>
            <?php else: ?>
                <button
                    class="btn-restaurar"
                    onclick="event.stopPropagation(); restaurarProtocolo(<?= (int)$p['id'] ?>)"
                >
                    Restaurar
                </button>
            <?php endif; ?>

            <button
                class="danger"
                onclick="event.stopPropagation(); excluirProtocolo(<?= (int)$p['id'] ?>)"
            >
                Excluir
            </button>

        </div>

        <div class="card-valores">
            <?php if (!empty($p['total_valores']) && $p['total_valores'] > 0): ?>
                R$ <?= number_format($p['total_valores'], 2, ',', '.') ?>
            <?php else: ?>
                &nbsp;
            <?php endif; ?>
        </div>

        <div class="card-handle" title="Arrastar">
            ⋮⋮
        </div>

    </div>

</div>
