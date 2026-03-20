const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const scriptPath = path.join(__dirname, 'Pocket Tweaker-0.2.4.user.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Mocking environment for the UserScript
const mockDocument = {
    querySelector: () => ({
        addEventListener: () => {},
        classList: { contains: () => false },
        tagName: 'DIV'
    }),
    addEventListener: () => {}
};

const mockMutationObserver = class {
    observe() {}
};

const context = {
    document: mockDocument,
    MutationObserver: mockMutationObserver,
    console: console,
    setTimeout: setTimeout,
    window: {}
};
context.window = context;

vm.createContext(context);
vm.runInContext(scriptContent, context);

test('setArticleStyle updates maxWidth', (t) => {
    const mockArticle = {
        style: {}
    };
    context.setArticleStyle(mockArticle);
    assert.strictEqual(mockArticle.style.maxWidth, '96%');
});

test('setPreStyle updates multiple styles', (t) => {
    const mockPre = {
        style: {}
    };
    context.setPreStyle(mockPre);
    assert.strictEqual(mockPre.style.background, 'initial');
    assert.strictEqual(mockPre.style.borderColor, '--(color-textSecondary)');
    assert.strictEqual(mockPre.style.borderStyle, 'dashed');
    assert.strictEqual(mockPre.style.margin, 'initial');
    assert.strictEqual(mockPre.style.width, '85vw');
});

test('setArticleStyle handles null/undefined', (t) => {
    assert.doesNotThrow(() => context.setArticleStyle(null));
    assert.doesNotThrow(() => context.setArticleStyle(undefined));
});

test('setPreStyle handles null/undefined', (t) => {
    assert.doesNotThrow(() => context.setPreStyle(null));
    assert.doesNotThrow(() => context.setPreStyle(undefined));
});
