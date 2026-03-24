const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('file://' + process.cwd() + '/test.html');

    const scriptContent = fs.readFileSync('gemini.google.com/gemini-artifact-exporter-worker/gemini-artifact-exporter-worker.user.js', 'utf-8');

    let testScript = scriptContent;

    // Remove strict mode string
    testScript = testScript.replace("'use strict';", "");

    // Remove the entire IIFE wrapper using exact matching or regex
    testScript = testScript.replace('(function () {', '');
    const lastParen = testScript.lastIndexOf('})();');
    if (lastParen !== -1) {
        testScript = testScript.substring(0, lastParen) + testScript.substring(lastParen + 5);
    }

    // Now remove returns
    testScript = testScript.replace(
        "if (isInstallCheckHost) {\n        report();\n        return;\n    }",
        "if (isInstallCheckHost) {\n        report();\n    }"
    );

    testScript = testScript.replace(
        "return; // Don't run the rest of the worker logic in Google Docs",
        "// return;"
    );

    testScript += `
        window.test_getOrCreateIndicator = getOrCreateIndicator;
        window.test_showIndicator = showIndicator;
        window.test_hideIndicator = hideIndicator;
    `;

    // Make sure GM_ variables are actually defined at the top of the testScript, so they are in global scope of script tag
    testScript = `
        const GM_setValue = function(k, v) { console.log('GM_setValue', k, v); };
        const GM_getValue = function(k, d) { return d; };
        const GM_info = { script: { name: 'Gemini Artifact Exporter Worker', version: '0.2.5' } };
        const GM_deleteValue = function(k) { console.log('GM_deleteValue', k); };
    ` + testScript;

    fs.writeFileSync('test_script_patched.js', testScript);

    const { execSync } = require('child_process');
    try {
        execSync('node -c test_script_patched.js');
    } catch (e) {
        console.error("Syntax Error in patched script!");
        process.exit(1);
    }

    await page.addScriptTag({ path: 'test_script_patched.js' });

    await page.waitForTimeout(500);

    // Call it explicitly
    await page.evaluate(() => {
        window.test_getOrCreateIndicator();
    });

    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test_ui_idle.png' });

    await page.evaluate(() => {
        window.test_showIndicator('エクスポート中: Test Artifact', false, false);
    });

    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test_ui_active.png' });

    await page.evaluate(() => {
        window.test_hideIndicator(0);
    });

    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test_ui_hidden.png' });

    const uiHTML = await page.evaluate(() => {
        const el = document.getElementById('gemini-worker-export-indicator');
        return el ? el.outerHTML : 'null';
    });
    console.log('UI HTML:', uiHTML);

    await browser.close();
})();
