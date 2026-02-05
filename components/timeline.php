<?php
/**
 * Componente de timeline de andamentos
 *
 * Espera receber:
 * $andamentos = [
 *   [
 *     'id' => 1,
 *     'descricao' => 'Aguardando documentação',
 *     'created_at' => '2026-02-01 14:22:00'
 *   ],
 *   ...
 * ]
 */
?>

<div class="timeline">

    <?php if (empty($andamentos)): ?>
        <div class="timeline-empty">
            Nenhum andamento registrado.
        </div>
    <?php endif; ?>

    <?php foreach ($andamentos as $a): ?>
        <div class="timeline-item" data-id="<?= (int)$a['id'] ?>">

            <div class="timeline-marker"></div>

            <div class="timeline-content">

                <div class="timeline-header">
                    <span class="timeline-date">
                        <?= date('d/m/Y H:i', strtotime($a['created_at'])) ?>
                    </span>

                    <div class="timeline-actions">
                        <button
                            class="btn-edit"
                            title="Editar"
                            onclick="editarAndamento(<?= (int)$a['id'] ?>)"
                        >
                            ✎
                        </button>

                        <button
                            class="btn-delete"
                            title="Remover"
                            onclick="removerAndamento(<?= (int)$a['id'] ?>)"
                        >
                            🗑
                        </button>
                    </div>
                </div>

                <div
                    class="timeline-text"
                    contenteditable="false"
                    data-id="<?= (int)$a['id'] ?>"
                >
                    <?= nl2br(htmlspecialchars($a['descricao'])) ?>
                </div>

            </div>
        </div>
    <?php endforeach; ?>

</div>