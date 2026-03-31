const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert');

const code = fs.readFileSync('index.js', 'utf8');

function createSandbox() {
    const sandbox = {
        document: {
            getElementById: () => null,
            querySelectorAll: () => [],
            addEventListener: () => {},
            dispatchEvent: () => {},
            readyState: 'complete'
        },
        window: {
            addEventListener: () => {},
            postMessage: () => {},
            location: { hostname: 'localhost' }
        },
        WeakMap: class {
            get() {}
            set() {}
        },
        Map: Map,
        CustomEvent: class {},
        setTimeout: () => {},
        console: console,
        URL: URL
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox;
}

test('updateTotalScriptsCount - counts visible items', () => {
    const sandbox = createSandbox();
    const items = [
        { style: { display: 'flex' } },
        { style: { display: 'none' } },
        { style: { display: 'block' } }
    ];
    const badge = { textContent: '' };

    sandbox.document.querySelectorAll = (selector) => {
        if (selector === '.project-item') return items;
        return [];
    };
    sandbox.document.getElementById = (id) => {
        if (id === 'total-scripts-count') return badge;
        return null;
    };

    sandbox.updateTotalScriptsCount();
    assert.strictEqual(badge.textContent, 2);
});

test('updateTotalScriptsCount - zero items', () => {
    const sandbox = createSandbox();
    const badge = { textContent: '' };

    sandbox.document.querySelectorAll = () => [];
    sandbox.document.getElementById = (id) => {
        if (id === 'total-scripts-count') return badge;
        return null;
    };

    sandbox.updateTotalScriptsCount();
    assert.strictEqual(badge.textContent, 0);
});

test('updateTotalScriptsCount - all hidden', () => {
    const sandbox = createSandbox();
    const items = [
        { style: { display: 'none' } },
        { style: { display: 'none' } }
    ];
    const badge = { textContent: '' };

    sandbox.document.querySelectorAll = () => items;
    sandbox.document.getElementById = (id) => {
        if (id === 'total-scripts-count') return badge;
        return null;
    };

    sandbox.updateTotalScriptsCount();
    assert.strictEqual(badge.textContent, 0);
});

test('updateTotalScriptsCount - no badge element', () => {
    const sandbox = createSandbox();
    const items = [
        { style: { display: 'flex' } }
    ];

    sandbox.document.querySelectorAll = () => items;
    sandbox.document.getElementById = () => null;

    // Should not throw
    assert.doesNotThrow(() => {
        sandbox.updateTotalScriptsCount();
    });
});
