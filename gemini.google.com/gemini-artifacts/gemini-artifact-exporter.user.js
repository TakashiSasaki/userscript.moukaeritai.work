// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.1.10
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

    // ... (helper functions omitted) ...
    const EXPORTED_KEY = 'exported_artifacts';

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

    // Find a fresh reference to the chip in the DOM based on its title
    function findChipByTitle(title) {
        const chips = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
        return chips.find(chip => {
            const t = chip.querySelector(SELECTORS.CHIP_TITLE);
            return t && t.textContent.trim() === title;
        });
    }

    async function processArtifact(targetTitle, force = false) {
        // Always re-query the chip to avoid stale element references
        let chip = findChipByTitle(targetTitle);
        
        if (!chip) {
            log(`ERROR: Chip with title "${targetTitle}" not found in DOM. Skipping.`);
            return;
        }

        const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
        const subtitleEl = chip.querySelector(SELECTORS.CHIP_SUBTITLE);
        
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

        // 0. Ensure no panel is currently open
        if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
            log('Cleanup: Closing existing panel before opening next one.');
            const existingCloseBtn = document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON);
            if (existingCloseBtn) {
                existingCloseBtn.click();
                await sleep(1500); // Wait for close animation
            }
        }

        // 1. Click to open with Retry Logic
        let panelOpened = false;
        let clickAttempts = 0;
        
        while (!panelOpened && clickAttempts < 3) {
            clickAttempts++;
            log(`Attempt ${clickAttempts}: Clicking chip "${title}"...`);
            
            // Re-find chip in case of DOM updates during wait
            chip = findChipByTitle(targetTitle);
            if (!chip) {
                log('Error: Chip lost from DOM during retry.');
                return;
            }
            
            chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);

            const clickable = chip.querySelector(SELECTORS.CHIP_CONTAINER) || chip;
            clickable.click();

            // Wait for panel to appear
            let panelWait = 0;
            while (panelWait < 15 && !document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
                await sleep(200);
                panelWait++;
            }

            if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
                panelOpened = true;
                log('Panel element detected.');
            } else {
                log('Panel did not appear after click. Retrying...');
                await sleep(1000);
            }
        }

        if (!panelOpened) {
            log(`CRITICAL ERROR: Failed to open panel for "${title}" after ${clickAttempts} clicks.`);
            return; // Skip this item
        }

        // 2. Wait for Title Match
        try {
            log(`Waiting for title match. Target: "${title}"`);
            let retries = 0;
            let matched = false;
            while (retries < 30) {
                const panelTitleEl = document.querySelector(SELECTORS.PANEL_TITLE);
                const currentPanelTitle = panelTitleEl ? panelTitleEl.textContent.trim() : '(null)';
                
                // Allow exact match or if current title contains the target (sometimes titles are truncated/formatted)
                if (currentPanelTitle === title || currentPanelTitle.includes(title)) {
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
            
            // Re-find chip one last time to update UI
            const finalChip = findChipByTitle(title);
            if (finalChip) {
                finalChip.style.border = '2px solid green';
                finalChip.querySelector(SELECTORS.CHIP_TITLE).textContent = `✅ ${title}`;
            }
            log(`--- Finished processing: "${title}" ---`);

        } catch (e) {
            log(`CRITICAL ERROR during processing "${title}": ${e.message}`);
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

        // Open Sidebar... (omitted detailed sidebar open logic, assuming mostly same)
        let sidebar = document.querySelector(SELECTORS.SIDEBAR);
        if (!sidebar) {
            const toggleBtn = document.querySelector(SELECTORS.SIDEBAR_BUTTON);
            if (toggleBtn) {
                toggleBtn.click();
                try {
                    sidebar = await waitForElement(SELECTORS.SIDEBAR, document, 3000);
                } catch (e) {
                    alert('Could not open sidebar.');
                    return;
                }
            } else {
                alert('Sidebar toggle button not found.');
                return;
            }
        }

        const chips = Array.from(sidebar.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
        
        // Collect TITLES of target chips first. 
        // We will query them by title during the loop to ensure we get fresh elements.
        const articleTitles = [];
        chips.forEach(chip => {
            const icon = chip.querySelector(SELECTORS.CHIP_ICON_CONTAINER);
            const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
            if (icon && icon.getAttribute('fonticon') === 'article' && titleEl) {
                articleTitles.push(titleEl.textContent.trim());
            }
        });

        log(`Found ${articleTitles.length} article artifacts.`);

        if (articleTitles.length === 0) {
            alert('No article artifacts found.');
            return;
        }

        const confirmMsg = force 
            ? `Found ${articleTitles.length} articles. FORCE EXPORT all of them?`
            : `Found ${articleTitles.length} articles. Start export (skipping duplicates)?`;

        if (!confirm(confirmMsg)) return;

        // Cleanup before starting
        if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
             document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON)?.click();
             await sleep(1500);
        }

        for (let i = 0; i < articleTitles.length; i++) {
            log(`Processing item ${i + 1}/${articleTitles.length}: ${articleTitles[i]}`);
            await processArtifact(articleTitles[i], force);
            log(`Cooldown before next item (2s)...`);
            await sleep(2000);
        }

        log('BATCH EXPORT COMPLETED.');
        alert('Batch export completed.');
    }

    // ... (rest of the script) ...
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

    setInterval(updateButtonVisibility, 500);

})();

