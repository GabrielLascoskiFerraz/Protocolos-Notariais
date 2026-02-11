import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Testa a integridade do mapa de cores centralizado em config/ato-cores.php.
 * Verifica que o arquivo PHP é parsável e contém cores hex válidas.
 *
 * Execução: node --test tests/js/ato-cores.test.js
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const phpFile = readFileSync(resolve(__dirname, '../../config/ato-cores.php'), 'utf-8');

// Extrai as entradas 'chave' => '#hex' do PHP
const entries = [...phpFile.matchAll(/'([^']+)'\s*=>\s*'(#[0-9a-fA-F]{6})'/g)];

describe('config/ato-cores.php', () => {
    it('contem pelo menos 50 atos', () => {
        assert.ok(entries.length >= 50, `Encontrados ${entries.length} atos (esperado >= 50)`);
    });

    it('todas as cores sao hex validos (#RRGGBB)', () => {
        for (const [, ato, cor] of entries) {
            assert.match(cor, /^#[0-9a-fA-F]{6}$/, `Cor invalida para "${ato}": ${cor}`);
        }
    });

    it('contem atos fundamentais', () => {
        const atos = entries.map(([, ato]) => ato);
        const obrigatorios = ['Compra e venda', 'Doação', 'Inventário', 'Hipoteca', 'Permuta'];

        for (const a of obrigatorios) {
            assert.ok(atos.includes(a), `Ato obrigatório ausente: "${a}"`);
        }
    });

    it('nao tem atos duplicados', () => {
        const atos = entries.map(([, ato]) => ato);
        const unicos = new Set(atos);
        assert.equal(atos.length, unicos.size, `${atos.length - unicos.size} ato(s) duplicado(s)`);
    });

    it('retorna um array PHP valido (comeca com return [)', () => {
        assert.ok(phpFile.includes('return ['), 'Deve conter "return ["');
        assert.ok(phpFile.includes('];'), 'Deve conter "];"');
    });
});
