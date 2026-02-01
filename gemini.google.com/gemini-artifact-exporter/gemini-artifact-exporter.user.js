// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.2.2
// @description  Export all "Article" type artifacts from the Gemini sidebar to Google Docs.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js
// ==/UserScript==

(function() {
    'use strict';

    const installDetectionHosts = new Set([
        'userscript.moukaeritai.work',
        '127.0.0.1',
        'fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev'
    ]);

    if (installDetectionHosts.has(location.hostname)) {
        const report = () => {
            document.dispatchEvent(new CustomEvent('userscript-check-installed', {
                detail: {
                    name: GM_info.script.name,
                    version: GM_info.script.version
                }
            }));
        };
        report();
        document.addEventListener('userscript-ping', report);
        return;
    }

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

    function log(msg) {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        const formattedMsg = `[Exporter ${timestamp}] ${msg}`;
        console.log(formattedMsg);

        const logPanelBody = document.getElementById('gemini-log-panel-body');
        if (logPanelBody && logPanelBody.offsetParent !== null) { // Check if visible
            const logEntry = document.createElement('div');
            logEntry.textContent = msg; // Log without the prefix for cleaner UI
            logEntry.style.cssText = 'padding: 2px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px;';
            logPanelBody.appendChild(logEntry);
            logPanelBody.scrollTop = logPanelBody.scrollHeight;
        }
    }

    function isConversationPage() {
        return /\/app\/[a-z0-9]+/.test(window.location.pathname);
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
            // Match the original title, ignoring any "✅ " prefix we might have added
            const cleanText = t ? t.textContent.trim().replace(/^✅\s*/, '') : '';
            return cleanText === title;
        });
    }

    async function processArtifact(targetTitle) {
        // Always re-query the chip to avoid stale element references
        let chip = findChipByTitle(targetTitle);

        if (!chip) {
            log(`ERROR: Chip with title "${targetTitle}" not found in DOM. Skipping.`);
            return;
        }

        const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
        const title = titleEl.textContent.trim().replace(/^✅\s*/, '');

        log(`--- Start processing artifact: "${title}" ---`);

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

            // 7. Mark as processed for this session
            const finalChip = findChipByTitle(title);
            if (finalChip) {
                const finalTitleEl = finalChip.querySelector(SELECTORS.CHIP_TITLE);
                if (finalTitleEl && !finalTitleEl.textContent.startsWith('✅')) {
                    finalChip.style.border = '2px solid green';
                    finalTitleEl.textContent = `✅ ${title}`;
                }
            }
            log(`--- Finished processing: "${title}" ---`);

        } catch (e) {
            log(`CRITICAL ERROR during processing "${title}": ${e.message}`);
            const closeBtn = document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON);
            if (closeBtn) closeBtn.click();
        }
    }

    async function runBatchExport() {
        const logPanelBody = document.getElementById('gemini-log-panel-body');
        if (logPanelBody) {
            logPanelBody.innerHTML = ''; // Clear previous logs
        }
        log(`Batch export started.`);
        if (!isConversationPage()) {
            log('Abort: Not on a conversation page.');
            return;
        }

        let sidebar = document.querySelector(SELECTORS.SIDEBAR);
        if (!sidebar) {
            const toggleBtn = document.querySelector(SELECTORS.SIDEBAR_BUTTON);
            if (toggleBtn) {
                toggleBtn.click();
                try {
                    sidebar = await waitForElement(SELECTORS.SIDEBAR, document, 3000);
                } catch {
                    alert('Could not open sidebar.');
                    return;
                }
            } else {
                alert('Sidebar toggle button not found.');
                return;
            }
        }

        const chips = Array.from(sidebar.querySelectorAll(SELECTORS.SIDEBAR_CHIP));

        const articleTitles = [];
        chips.forEach(chip => {
            const icon = chip.querySelector(SELECTORS.CHIP_ICON_CONTAINER);
            const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
            if (icon && icon.getAttribute('fonticon') === 'article' && titleEl) {
                articleTitles.push(titleEl.textContent.trim().replace(/^✅\s*/, ''));
            }
        });

        log(`Found ${articleTitles.length} article artifacts.`);

        if (articleTitles.length === 0) {
            alert('No "Article" type artifacts found in the sidebar.');
            return;
        }

        const confirmMsg = `Found ${articleTitles.length} 'Article' artifacts.\n\nExport all of them to Google Docs?`;

        if (!confirm(confirmMsg)) {
            log('Export cancelled by user.');
            return;
        }

        if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
             document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON)?.click();
             await sleep(1500);
        }

        for (let i = 0; i < articleTitles.length; i++) {
            log(`Processing item ${i + 1}/${articleTitles.length}: ${articleTitles[i]}`);
            await processArtifact(articleTitles[i]);
            log(`Cooldown before next item (2s)...`);
            await sleep(2000);
        }

        log('BATCH EXPORT COMPLETED.');
        alert('Batch export completed.');
    }

    // --- UI Injection & Control ---
    const PANEL_POSITION_KEY = 'gemini-exporter-panel-pos';
    const LOG_PANEL_POSITION_KEY = 'gemini-exporter-log-pos';
    const LOG_PANEL_VISIBLE_KEY = 'gemini-exporter-log-visible';

    function makePanelDraggable(panel, handle, storageKey) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;

            if (panel.style.right || panel.style.bottom) {
                panel.style.left = panel.offsetLeft + 'px';
                panel.style.top = panel.offsetTop + 'px';
                panel.style.right = '';
                panel.style.bottom = '';
            }

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            handle.style.cursor = 'grabbing';
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            panel.style.top = (panel.offsetTop - pos2) + "px";
            panel.style.left = (panel.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            handle.style.cursor = 'move';

            GM_setValue(storageKey, {
                top: panel.style.top,
                left: panel.style.left
            });
        }
    }

    function createLogPanel() {
        if (document.getElementById('gemini-log-panel')) return;

        const logPanel = document.createElement('div');
        logPanel.id = 'gemini-log-panel';
        logPanel.style.cssText = `
            position: fixed;
            z-index: 9998; /* Below main panel */
            width: 400px;
            height: 300px;
            background-color: rgba(20, 20, 22, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
        `;

        const logHeader = document.createElement('div');
        logHeader.textContent = 'Export Log';
        logHeader.style.cssText = `
            padding: 8px 12px;
            cursor: move;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            text-align: center;
            font-family: 'Google Sans', sans-serif;
            font-size: 13px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const logBody = document.createElement('div');
        logBody.id = 'gemini-log-panel-body';
        logBody.style.cssText = `
            flex-grow: 1;
            overflow-y: auto;
            padding: 8px;
            color: rgba(255, 255, 255, 0.8);
            font-family: monospace;
        `;

        logPanel.appendChild(logHeader);
        logPanel.appendChild(logBody);
        document.body.appendChild(logPanel);

        makePanelDraggable(logPanel, logHeader, LOG_PANEL_POSITION_KEY);
        const savedPos = GM_getValue(LOG_PANEL_POSITION_KEY, { top: '120px', left: '20px' });
        logPanel.style.top = savedPos.top;
        logPanel.style.left = savedPos.left;

        const isVisible = GM_getValue(LOG_PANEL_VISIBLE_KEY, false);
        logPanel.style.display = isVisible ? 'flex' : 'none';

        return logPanel;
    }

    function createTriggerButtons() {
        if (document.getElementById('gemini-batch-export-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'gemini-batch-export-panel';
        panel.style.cssText = `
            position: fixed;
            z-index: 9999;
            background-color: rgba(28, 28, 30, 0.7);
            backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.125);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            padding-bottom: 12px;
            display: ${isConversationPage() ? 'flex' : 'none'};
        `;

        const header = document.createElement('div');
        header.textContent = `Artifact Exporter v${GM_info.script.version}`;
        header.style.cssText = `
            padding: 8px 12px;
            cursor: move;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            text-align: center;
            font-family: 'Google Sans', sans-serif;
            font-size: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 12px;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 0 12px;
        `;

        const btn = document.createElement('button');
        btn.textContent = 'Export All Articles';
        btn.title = 'すべての「記事」アーティファクトをGoogle Docsにエクスポートします。';
        btn.style.cssText = `
            padding: 10px 16px;
            background-color: #1a73e8;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.2s;
        `;
        btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
        btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };


        btn.onclick = () => runBatchExport();

        const logToggleContainer = document.createElement('label');
        logToggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
            padding: 4px 8px;
        `;
        const logToggleCheckbox = document.createElement('input');
        logToggleCheckbox.type = 'checkbox';
        logToggleCheckbox.checked = GM_getValue(LOG_PANEL_VISIBLE_KEY, false);

        logToggleCheckbox.onchange = (e) => {
            const logPanel = document.getElementById('gemini-log-panel');
            if (logPanel) {
                logPanel.style.display = e.target.checked ? 'flex' : 'none';
            }
            GM_setValue(LOG_PANEL_VISIBLE_KEY, e.target.checked);
        };
        logToggleContainer.appendChild(logToggleCheckbox);
        logToggleContainer.appendChild(document.createTextNode('Show Log Panel'));

        buttonContainer.appendChild(btn);
        buttonContainer.appendChild(logToggleContainer);

        panel.appendChild(header);
        panel.appendChild(buttonContainer);
        document.body.appendChild(panel);

        createLogPanel(); // Ensure log panel is created

        makePanelDraggable(panel, header, PANEL_POSITION_KEY);
        const savedPosition = GM_getValue(PANEL_POSITION_KEY, null);
        if (savedPosition && savedPosition.top && savedPosition.left) {
            panel.style.top = savedPosition.top;
            panel.style.left = savedPosition.left;
        } else {
            panel.style.right = '20px';
            panel.style.bottom = '20px';
        }
    }

    function updateButtonVisibility() {
        const panel = document.getElementById('gemini-batch-export-panel');
        if (!panel) {
            if (isConversationPage()) {
                createTriggerButtons();
            }
            return;
        }
        
        const shouldShow = isConversationPage();
        panel.style.display = shouldShow ? 'flex' : 'none';

        const logPanel = document.getElementById('gemini-log-panel');
        if (logPanel) {
            if (shouldShow) {
                const isVisible = GM_getValue(LOG_PANEL_VISIBLE_KEY, false);
                logPanel.style.display = isVisible ? 'flex' : 'none';
            } else {
                logPanel.style.display = 'none';
            }
        }
    }

    setInterval(updateButtonVisibility, 500);

})();
