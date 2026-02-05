<?php
/**
 * Componente de valores adicionais
 *
 * Espera receber:
 * $valores = [
 *   [
 *     'id' => 1,
 *     'descricao' => 'ITBI',
 *     'valor' => 1200.00
 *   ],
 *   ...
 * ]
 *
 * $total = float (somatório dos valores)
 */
?>

<div class="valores-wrapper">

    <div class="valores-header">
        <strong>Valores adicionais</strong>
        <button
            class="btn-add-valor"
            title="Adicionar valor"
            onclick="adicionarValor()"
        >
            ＋
        </button>
    </div>

    <div class="valores-lista">

        <?php if (empty($valores)): ?>
            <div class="valores-empty">
                Nenhum valor adicional lançado.
            </div>
        <?php endif; ?>

        <?php foreach ($valores as $v): ?>
            <div class="valor-item" data-id="<?= (int)$v['id'] ?>">

                <input
                    type="text"
                    class="valor-descricao"
                    value="<?= htmlspecialchars($v['descricao']) ?>"
                    placeholder="Descrição"
                    onblur="atualizarValor(<?= (int)$v['id'] ?>)"
                >

                <input
                    type="text"
                    class="valor-valor"
                    value="<?= number_format($v['valor'], 2, ',', '.') ?>"
                    placeholder="0,00"
                    onblur="atualizarValor(<?= (int)$v['id'] ?>)"
                >

                <button
                    class="btn-delete-valor"
                    title="Remover valor"
                    onclick="removerValor(<?= (int)$v['id'] ?>)"
                >
                    🗑
                </button>

            </div>
        <?php endforeach; ?>

    </div>

    <div class="valores-total">
        Total adicional:
        <strong>
            R$ <span id="total-valores">
                <?= number_format($total ?? 0, 2, ',', '.') ?>
            </span>
        </strong>
    </div>

</div>