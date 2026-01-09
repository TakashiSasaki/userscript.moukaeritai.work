// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  Export all "Article" type artifacts from the Gemini sidebar to Google Docs.
// @author       Takashi Sasaki
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

    async function processArtifact(chip) {
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

        if (getExportedSignatures(convId).has(signature)) {
            log(`Skipping already exported: ${title}`);
            chip.style.opacity = '0.5';
            chip.title = 'Already exported';
            return;
        }

        log(`Processing: ${title}`);
        chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 1. Click to open
        chip.click();

        // 2. Wait for panel to load (check title match)
        try {
            // Wait a bit for the click to register and panel to start updating
            await sleep(1000); 
            
            // Wait for title to match. This is tricky because the panel might already exist with old content.
            // A simple approach is to poll the title text.
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

            // 5. Wait for completion (Simple timeout for now, ideally watch for toast)
            // Assuming 3 seconds is enough for the request to be sent
            await sleep(3000);

            // 6. Mark as exported
            saveExportedSignature(convId, signature);
            chip.style.opacity = '0.5';
            chip.querySelector(SELECTORS.CHIP_TITLE).textContent = `✅ ${title}`;

            // Close menu if still open (usually closes on click, but just in case)
            // Clicking body might help, or just proceeding.

        } catch (e) {
            log(`Error processing ${title}: ${e.message}`);
        }
    }

    async function runBatchExport() {
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

        if (!confirm(`Found ${articleChips.length} articles. Start export?`)) return;

        // 3. Process
        for (const chip of articleChips) {
            await processArtifact(chip);
            await sleep(1000); // Cooldown between items
        }

        alert('Batch export completed.');
    }

    // --- UI Injection ---

    function createTriggerButton() {
        if (document.getElementById('gemini-batch-export-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'gemini-batch-export-btn';
        btn.textContent = 'Export All Docs';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 16px;
            background-color: #1a73e8;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        btn.onclick = runBatchExport;
        document.body.appendChild(btn);
    }

    // Initialize
    window.addEventListener('load', () => {
        setTimeout(createTriggerButton, 2000);
    });

})();
