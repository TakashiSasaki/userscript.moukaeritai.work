// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.1.9
// @description  Export all "Article" type artifacts from the Gemini sidebar to Google Docs.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifacts/gemini-artifact-exporter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifacts/gemini-artifact-exporter.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SELECTORS = {
        SIDEBAR_BUTTON: 'button[data-test-id="studio-sidebar-button"]',
        SIDEBAR: 'context-sidebar',
        SIDEBAR_CHIP: 'sidebar-immersive-chip',
        CHIP_CONTAINER: '.container',
        CHIP_TITLE: '.immersive-title',
        CHIP_SUBTITLE: '.immersive-subtitle',
        CHIP_ICON_CONTAINER: '.icon-container mat-icon',
        IMMERSIVE_PANEL: 'immersive-panel',
        PANEL_TITLE: 'immersive-panel h2.title-text',
        PANEL_CLOSE_BUTTON: 'immersive-panel button[data-test-id="close-button"]',
        SHARE_BUTTON: 'button[data-test-id="share-button"]',
        EXPORT_BUTTON: 'button[data-test-id="export-to-docs-button"]',
        MENU_PANEL: '.mat-mdc-menu-panel'
    };

    const EXPORTED_KEY = 'exported_artifacts';

    // --- Helper Functions ---

    function log(msg) {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        console.log(`[Exporter ${timestamp}] ${msg}`);
    }

    function isConversationPage() {
        return /\/app\/[a-z0-9]+/.test(window.location.pathname);
    }

    function getConversationId() {
        const match = window.location.pathname.match(/\/app\/([a-z0-9]+)/);
        return match ? match[1] : null;
    }

    function getExportedSignatures(convId) {
        const allData = GM_getValue(EXPORTED_KEY, {});
        return new Set(allData[convId] || []);
    }

    function saveExportedSignature(convId, signature) {
        const allData = GM_getValue(EXPORTED_KEY, {});
        if (!allData[convId]) {
            allData[convId] = [];
        }
        if (!allData[convId].includes(signature)) {
            allData[convId].push(signature);
            GM_setValue(EXPORTED_KEY, allData);
            log(`Signature saved to persistent storage: ${signature}`);
        }
    }

    function generateSignature(title, subtitle) {
        const convId = getConversationId();
        if (!convId) return null;
        return `${convId}|${title}|${subtitle}`;
    }

    function waitForElement(selector, context = document, timeout = 5000) {
        log(`Waiting for element: ${selector}...`);
        return new Promise((resolve, reject) => {
            const el = context.querySelector(selector);
            if (el) {
                log(`Element ${selector} found immediately.`);
                return resolve(el);
            }

            const observer = new MutationObserver(() => {
                const el = context.querySelector(selector);
                if (el) {
                    log(`Element ${selector} detected by observer.`);
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(context === document ? document.body : context, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                log(`Timeout reached for: ${selector}`);
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    }

    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Core Logic ---

    async function processArtifact(chip, force = false) {
        const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
        const subtitleEl = chip.querySelector(SELECTORS.CHIP_SUBTITLE);
        
        if (!titleEl || !subtitleEl) {
            log('ERROR: Skipping chip - Title or subtitle element not found in chip DOM.');
            return;
        }

        const title = titleEl.textContent.trim();
        const subtitle = subtitleEl.textContent.trim();
        const convId = getConversationId();
        const signature = generateSignature(title, subtitle);

        log(`--- Start processing artifact: "${title}" ---`);

        if (!force && getExportedSignatures(convId).has(signature)) {
            log(`SKIP: Already exported (signature match): ${title}`);
            chip.style.opacity = '0.5';
            chip.title = 'Already exported';
            return;
        }

        chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);
        
        // 0. Ensure no panel is currently open
        if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
            log('Cleanup: Closing existing panel before opening next one.');
            const existingCloseBtn = document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON);
            if (existingCloseBtn) existingCloseBtn.click();
            await sleep(1500);
        }

        // 1. Click to open
        log(`Triggering click on chip: "${title}"`);
        const clickable = chip.querySelector(SELECTORS.CHIP_CONTAINER) || chip;
        clickable.click();

        // 2. Wait for panel to appear AND load title
        try {
            log('Waiting for panel to appear...');
            let panelRetries = 0;
            while (panelRetries < 25 && !document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
                await sleep(200);
                panelRetries++;
            }
            if (!document.querySelector(SELECTORS.IMMERSIVE_PANEL)) throw new Error("Panel element never appeared in DOM.");
            log('Panel element detected.');

            log(`Waiting for title match. Target: "${title}"`);
            let retries = 0;
            let matched = false;
            while (retries < 30) {
                const panelTitleEl = document.querySelector(SELECTORS.PANEL_TITLE);
                const currentPanelTitle = panelTitleEl ? panelTitleEl.textContent.trim() : '(null)';
                if (currentPanelTitle === title) {
                    matched = true;
                    log(`Success: Title matched after ${retries} retries.`);
                    break;
                }
                if (retries % 5 === 0) log(`Retry ${retries}: Current title is "${currentPanelTitle}"`);
                await sleep(500);
                retries++;
            }
            if (!matched) throw new Error(`Timeout waiting for panel title match. Expected: "${title}"`);

            // 3. Click Share
            log('Attempting to click Share button...');
            const shareBtn = await waitForElement(SELECTORS.SHARE_BUTTON, document.querySelector(SELECTORS.IMMERSIVE_PANEL));
            shareBtn.click();
            log('Share button clicked.');

            // 4. Click Export to Docs
            log('Waiting for Export to Docs button in menu...');
            const exportBtn = await waitForElement(SELECTORS.EXPORT_BUTTON);
            exportBtn.click();
            log('Export to Docs button clicked.');

            log('Wait 5s for export processing...');
            await sleep(5000);

            // 6. Close Panel
            const closeBtn = document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON);
            if (closeBtn) {
                log('Requesting panel close...');
                closeBtn.click();
                let closeRetries = 0;
                while (closeRetries < 20 && document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
                    await sleep(500);
                    closeRetries++;
                }
                log(document.querySelector(SELECTORS.IMMERSIVE_PANEL) ? 'Warning: Panel still in DOM after close request.' : 'Confirmed: Panel removed from DOM.');
            }

            // 7. Mark as exported
            saveExportedSignature(convId, signature);
            chip.style.border = '2px solid green';
            chip.querySelector(SELECTORS.CHIP_TITLE).textContent = `✅ ${title}`;
            log(`--- Finished processing: "${title}" ---`);

        } catch (e) {
            log(`CRITICAL ERROR during processing "${title}": ${e.message}`);
            // Attempt emergency cleanup
            const closeBtn = document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON);
            if (closeBtn) closeBtn.click();
        }
    }

    async function runBatchExport(force = false) {
        log(`Batch export started. Mode: ${force ? 'FORCE' : 'Normal'}`);
        if (!isConversationPage()) {
            log('Abort: Not on a conversation page.');
            return;
        }

        const convId = getConversationId();
        log(`Conversation ID: ${convId}`);

        let sidebar = document.querySelector(SELECTORS.SIDEBAR);
        if (!sidebar) {
            log('Sidebar not found. Attempting to open...');
            const toggleBtn = document.querySelector(SELECTORS.SIDEBAR_BUTTON);
            if (toggleBtn) {
                toggleBtn.click();
                try {
                    sidebar = await waitForElement(SELECTORS.SIDEBAR, document, 3000);
                    log('Sidebar opened successfully.');
                } catch (e) {
                    log('Abort: Could not open sidebar.');
                    alert('Could not open sidebar.');
                    return;
                }
            } else {
                log('Abort: Sidebar toggle button not found.');
                alert('Sidebar toggle button not found.');
                return;
            }
        }

        const chips = Array.from(sidebar.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
        log(`Total chips found in sidebar: ${chips.length}`);
        
        const articleChips = chips.filter(chip => {
            const icon = chip.querySelector(SELECTORS.CHIP_ICON_CONTAINER);
            const isArticle = icon && icon.getAttribute('fonticon') === 'article';
            return isArticle;
        });

        log(`Filter result: ${articleChips.length} articles out of ${chips.length} chips.`);

        if (articleChips.length === 0) {
            alert('No article artifacts found.');
            return;
        }

        const confirmMsg = force 
            ? `Found ${articleChips.length} articles. FORCE EXPORT all of them?`
            : `Found ${articleChips.length} articles. Start export (skipping duplicates)?`;

        if (!confirm(confirmMsg)) {
            log('User cancelled batch export.');
            return;
        }

        // Clean start
        if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
             log('Initial cleanup: Closing open panel.');
             document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON)?.click();
             await sleep(1500);
        }

        for (let i = 0; i < articleChips.length; i++) {
            log(`Processing item ${i + 1}/${articleChips.length}`);
            await processArtifact(articleChips[i], force);
            log(`Cooldown before next item (2s)...`);
            await sleep(2000);
        }

        log('BATCH EXPORT COMPLETED.');
        alert('Batch export completed.');
    }

    // --- UI Injection & Control ---

    function updateButtonVisibility() {
        const isPage = isConversationPage();
        const container = document.getElementById('gemini-batch-export-container');
        
        if (!container) {
            if (isPage) {
                createTriggerButtons();
            }
            return;
        }
        container.style.display = isPage ? 'flex' : 'none';
    }

    function createTriggerButtons() {
        if (document.getElementById('gemini-batch-export-container')) return;

        log('Injecting trigger buttons into page.');
        const container = document.createElement('div');
        container.id = 'gemini-batch-export-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
        `;

        const btn = document.createElement('button');
        btn.textContent = 'Export All Docs';
        btn.style.cssText = `
            padding: 10px 16px;
            background-color: #1a73e8;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        btn.onclick = () => runBatchExport(false);

        const forceBtn = document.createElement('button');
        forceBtn.textContent = 'Force Export All';
        forceBtn.style.cssText = `
            padding: 8px 12px;
            background-color: #d93025;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            font-size: 12px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        forceBtn.onclick = () => runBatchExport(true);

        container.appendChild(forceBtn);
        container.appendChild(btn);
        document.body.appendChild(container);
    }

    log('Gemini Artifact Exporter loaded. Polling for URL context...');
    setInterval(updateButtonVisibility, 1000);

})();
