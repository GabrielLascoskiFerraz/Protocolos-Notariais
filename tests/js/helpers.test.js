import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Testa funções utilitárias puras extraídas dos módulos JS.
 * Execução: node --test tests/js/helpers.test.js
 */

/* =========================================================
   Funções extraídas do código-fonte para teste unitário.
   (reproduzidas aqui pois os módulos dependem do DOM/browser)
   ======================================================= */

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const re = new RegExp(escapeRegex(query), 'gi');
    return escapedText.replace(re, '<mark class="highlight">$&</mark>');
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarDataHora(data) {
    if (!data) return '';
    const d = new Date(data.replace(' ', 'T'));
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function corTextoParaFundo(bg) {
    if (!bg) return '#ffffff';
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 0.6 ? '#0f172a' : '#ffffff';
}

function normalizarDinheiro(value) {
    const digits = String(value).replace(/\D/g, '');
    return digits ? (parseInt(digits, 10) / 100).toFixed(2) : '';
}

function apiUrl(path) {
    const base = 'http://localhost/protocolos/';
    const clean = String(path || '').replace(/^\/+/, '');
    return base + clean;
}

/* =========================================================
   TESTES
   ======================================================= */

describe('escapeHtml', () => {
    it('escapa caracteres HTML perigosos', () => {
        assert.equal(escapeHtml('<script>alert("xss")</script>'),
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('escapa aspas simples', () => {
        assert.equal(escapeHtml("teste'valor"), "teste&#039;valor");
    });

    it('escapa & comercial', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b');
    });

    it('retorna string vazia para string vazia', () => {
        assert.equal(escapeHtml(''), '');
    });

    it('converte numeros para string', () => {
        assert.equal(escapeHtml(123), '123');
    });

    it('preserva texto sem caracteres especiais', () => {
        assert.equal(escapeHtml('Compra e venda'), 'Compra e venda');
    });
});

describe('escapeRegex', () => {
    it('escapa caracteres especiais de regex', () => {
        assert.equal(escapeRegex('a.b+c*d'), 'a\\.b\\+c\\*d');
    });

    it('escapa parenteses e colchetes', () => {
        assert.equal(escapeRegex('(test)[1]'), '\\(test\\)\\[1\\]');
    });

    it('preserva texto simples', () => {
        assert.equal(escapeRegex('teste'), 'teste');
    });
});

describe('highlightText', () => {
    it('destaca texto encontrado', () => {
        const result = highlightText('Compra e venda', 'compra');
        assert.ok(result.includes('<mark class="highlight">'));
        assert.ok(result.includes('Compra'));
    });

    it('retorna texto escapado quando query esta vazia', () => {
        assert.equal(highlightText('<b>teste</b>', ''), '&lt;b&gt;teste&lt;/b&gt;');
    });

    it('destaca case-insensitive', () => {
        const result = highlightText('COMPRA', 'compra');
        assert.ok(result.includes('<mark'));
    });

    it('nao quebra com caracteres especiais na query', () => {
        const result = highlightText('teste (1)', '(1)');
        assert.ok(result.includes('<mark'));
    });
});

describe('formatarValor', () => {
    it('formata valores monetarios com 2 casas decimais', () => {
        const result = formatarValor(1500.5);
        assert.ok(result.includes('1.500') || result.includes('1500'));
        assert.ok(result.includes('50'));
    });

    it('formata zero', () => {
        const result = formatarValor(0);
        assert.equal(result, '0,00');
    });

    it('formata valor inteiro', () => {
        const result = formatarValor(100);
        assert.ok(result.includes('100'));
        assert.ok(result.includes(',00'));
    });
});

describe('formatarData', () => {
    it('formata data no padrao brasileiro', () => {
        // Usa T00:00:00 para evitar problemas de timezone
        const result = formatarData('2025-03-15T00:00:00');
        assert.equal(result, '15/03/2025');
    });

    it('formata data com hora', () => {
        const result = formatarData('2025-12-25T10:30:00');
        assert.equal(result, '25/12/2025');
    });
});

describe('formatarDataHora', () => {
    it('formata data e hora', () => {
        const result = formatarDataHora('2025-03-15 14:30:00');
        assert.ok(result.includes('15/03/2025'));
        assert.ok(result.includes('14:30'));
    });

    it('retorna vazio para data null', () => {
        assert.equal(formatarDataHora(null), '');
        assert.equal(formatarDataHora(''), '');
    });
});

describe('corTextoParaFundo', () => {
    it('retorna branco para fundo escuro', () => {
        assert.equal(corTextoParaFundo('#000000'), '#ffffff');
        assert.equal(corTextoParaFundo('#1f2937'), '#ffffff');
    });

    it('retorna escuro para fundo claro', () => {
        assert.equal(corTextoParaFundo('#ffffff'), '#0f172a');
        assert.equal(corTextoParaFundo('#f59e0b'), '#0f172a');
    });

    it('retorna branco para input invalido', () => {
        assert.equal(corTextoParaFundo(null), '#ffffff');
        assert.equal(corTextoParaFundo(''), '#ffffff');
        assert.equal(corTextoParaFundo('#fff'), '#ffffff');
    });
});

describe('normalizarDinheiro', () => {
    it('converte string formatada para decimal', () => {
        // normalizarDinheiro remove pontos e virgulas, trata como centavos
        // '1.500,50' -> digits '150050' -> 150050/100 = '1500.50'
        assert.equal(normalizarDinheiro('1.500,50'), '1500.50');
    });

    it('converte centavos puros', () => {
        assert.equal(normalizarDinheiro('50'), '0.50');
    });

    it('retorna vazio para input vazio', () => {
        assert.equal(normalizarDinheiro(''), '');
    });

    it('remove letras e mantem numeros', () => {
        assert.equal(normalizarDinheiro('abc123'), '1.23');
    });
});

describe('apiUrl', () => {
    it('concatena path com base', () => {
        assert.equal(apiUrl('api/protocolos.php'), 'http://localhost/protocolos/api/protocolos.php');
    });

    it('remove barra inicial duplicada', () => {
        assert.equal(apiUrl('/api/protocolos.php'), 'http://localhost/protocolos/api/protocolos.php');
    });

    it('aceita string vazia', () => {
        assert.equal(apiUrl(''), 'http://localhost/protocolos/');
    });

    it('aceita null', () => {
        assert.equal(apiUrl(null), 'http://localhost/protocolos/');
    });
});
