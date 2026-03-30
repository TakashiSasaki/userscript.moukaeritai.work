const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert');

const code = fs.readFileSync('index.js', 'utf8');

const sandbox = {
    document: {
        getElementById: () => ({ addEventListener: () => {} }),
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

const compareVersions = sandbox.compareVersions;

test('compareVersions - equal versions', () => {
    assert.strictEqual(compareVersions('1.0.0', '1.0.0'), 0);
    assert.strictEqual(compareVersions('1.1', '1.1'), 0);
});

test('compareVersions - greater than', () => {
    assert.strictEqual(compareVersions('1.0.1', '1.0.0'), 1);
    assert.strictEqual(compareVersions('1.10.0', '1.2.0'), 1);
    assert.strictEqual(compareVersions('2.0.0', '1.9.9'), 1);
});

test('compareVersions - less than', () => {
    assert.strictEqual(compareVersions('1.0.0', '1.0.1'), -1);
    assert.strictEqual(compareVersions('1.2.0', '1.10.0'), -1);
    assert.strictEqual(compareVersions('1.9.9', '2.0.0'), -1);
});

test('compareVersions - different lengths', () => {
    assert.strictEqual(compareVersions('1.1', '1.1.0'), 0);
    assert.strictEqual(compareVersions('1.1.0', '1.1'), 0);
    assert.strictEqual(compareVersions('1.1.1', '1.1'), 1);
    assert.strictEqual(compareVersions('1.1', '1.1.1'), -1);
});

test('compareVersions - edge cases', () => {
    assert.strictEqual(compareVersions(null, '1.0.0'), 0);
    assert.strictEqual(compareVersions('1.0.0', undefined), 0);
    assert.strictEqual(compareVersions('', '1.0.0'), 0);
    assert.strictEqual(compareVersions('1.0.0', ''), 0);
});
