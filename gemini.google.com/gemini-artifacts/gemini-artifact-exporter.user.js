// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.1.5
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
        SHARE_BUTTON: 'button[data-test-id="share-button"]',
        EXPORT_BUTTON: 'button[data-test-id="export-to-docs-button"]',
        MENU_PANEL: '.mat-mdc-menu-panel'
    };

    const EXPORTED_KEY = 'exported_artifacts';

    // --- Helper Functions ---

    function log(msg) {
        console.log(`[Gemini Artifact Exporter] ${msg}`);
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
            log(`Saved signature: ${signature}`);
        }
    }

    function generateSignature(title, subtitle) {
        const convId = getConversationId();
        if (!convId) return null;
        return `${convId}|${title}|${subtitle}`;
    }

    function waitForElement(selector, context = document, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const el = context.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const el = context.querySelector(selector);
                if (el) {
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
            log('Skipping chip: Title or subtitle missing');
            return;
        }

        const title = titleEl.textContent.trim();
        const subtitle = subtitleEl.textContent.trim();
        const convId = getConversationId();
        const signature = generateSignature(title, subtitle);

        if (!force && getExportedSignatures(convId).has(signature)) {
            log(`Skipping already exported: ${title}`);
            chip.style.opacity = '0.5';
            chip.title = 'Already exported';
            return;
        }

        log(`Processing: ${title}`);
        chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 1. Click to open
        // Click the inner container which likely has the event listener
        const clickable = chip.querySelector(SELECTORS.CHIP_CONTAINER) || chip;
        clickable.click();

        // 2. Wait for panel to load (check title match)
        try {
            await sleep(1000); 
            
            // Wait for title to match.
            let retries = 0;
            while (retries < 20) {
                const panelTitleEl = document.querySelector(SELECTORS.PANEL_TITLE);
                if (panelTitleEl && panelTitleEl.textContent.trim() === title) {
                    break;
                }
                await sleep(500);
                retries++;
            }
            if (retries >= 20) throw new Error("Timeout waiting for panel title match");

            log('Panel loaded.');

            // 3. Click Share
            const shareBtn = await waitForElement(SELECTORS.SHARE_BUTTON, document.querySelector(SELECTORS.IMMERSIVE_PANEL));
            shareBtn.click();
            log('Clicked Share.');

            // 4. Click Export to Docs
            const exportBtn = await waitForElement(SELECTORS.EXPORT_BUTTON);
            exportBtn.click();
            log('Clicked Export to Docs.');

            // 5. Wait for completion
            await sleep(3000);

            // 6. Mark as exported
            saveExportedSignature(convId, signature);
            chip.style.opacity = '0.5';
            chip.querySelector(SELECTORS.CHIP_TITLE).textContent = `✅ ${title}`;

        } catch (e) {
            log(`Error processing ${title}: ${e.message}`);
        }
    }

    async function runBatchExport(force = false) {
        if (!isConversationPage()) return;

        const convId = getConversationId();
        if (!convId) {
            alert('Please open a conversation first.');
            return;
        }

        // 1. Open Sidebar if needed
        let sidebar = document.querySelector(SELECTORS.SIDEBAR);
        if (!sidebar) {
            const toggleBtn = document.querySelector(SELECTORS.SIDEBAR_BUTTON);
            if (toggleBtn) {
                toggleBtn.click();
                log('Opened sidebar.');
                try {
                    sidebar = await waitForElement(SELECTORS.SIDEBAR);
                } catch (e) {
                    alert('Could not open sidebar.');
                    return;
                }
            } else {
                alert('Sidebar toggle button not found.');
                return;
            }
        }

        // 2. Find Article Chips
        const chips = Array.from(sidebar.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
        const articleChips = chips.filter(chip => {
            const icon = chip.querySelector(SELECTORS.CHIP_ICON_CONTAINER);
            return icon && icon.getAttribute('fonticon') === 'article';
        });

        log(`Found ${articleChips.length} article artifacts.`);

        if (articleChips.length === 0) {
            alert('No article artifacts found.');
            return;
        }

        const confirmMsg = force 
            ? `Found ${articleChips.length} articles. FORCE EXPORT all of them?`
            : `Found ${articleChips.length} articles. Start export (skipping duplicates)?`;

        if (!confirm(confirmMsg)) return;

        // 3. Process
        for (const chip of articleChips) {
            await processArtifact(chip, force);
            await sleep(1000); // Cooldown between items
        }

        alert('Batch export completed.');
    }

    // --- UI Injection & Control ---

    function updateButtonVisibility() {
        const container = document.getElementById('gemini-batch-export-container');
        if (!container) {
            if (isConversationPage()) {
                createTriggerButtons();
            }
            return;
        }
        container.style.display = isConversationPage() ? 'flex' : 'none';
    }

    function createTriggerButtons() {
        if (document.getElementById('gemini-batch-export-container')) return;

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
            display: ${isConversationPage() ? 'flex' : 'none'};
        `;

        // Standard Export Button
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

        // Force Export Button
        const forceBtn = document.createElement('button');
        forceBtn.textContent = 'Force Export All';
        forceBtn.style.cssText = `
            padding: 8px 12px;
            background-color: #d93025; /* Red for force action */
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

    // --- SPA Navigation Handling ---

    // Replace monkey-patching with polling to avoid conflicts and errors
    setInterval(updateButtonVisibility, 500);

})();