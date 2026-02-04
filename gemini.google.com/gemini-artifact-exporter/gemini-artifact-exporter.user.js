// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.2.17
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

(function () {
    'use strict';

    const installCheckHosts = [
        'userscript.moukaeritai.work',
        '127.0.0.1'
    ];
    const installCheckSuffixes = [
        '.app.github.dev'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname) ||
        installCheckSuffixes.some(suffix => location.hostname.endsWith(suffix));

    if (isInstallCheckHost) {
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

            let timeoutId = null;
            const observer = new MutationObserver(() => {
                const el = context.querySelector(selector);
                if (el) {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                    log(`Element ${selector} detected by observer.`);
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(context === document ? document.body : context, {
                childList: true,
                subtree: true
            });

            timeoutId = setTimeout(() => {
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
        log(`Querying for chip with title: "${title}"`);
        const chips = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
        log(` -> Found ${chips.length} total chips with selector '${SELECTORS.SIDEBAR_CHIP}'.`);
        const foundChip = chips.find(chip => {
            const t = chip.querySelector(SELECTORS.CHIP_TITLE);
            const cleanText = t ? t.textContent.trim() : '';
            return cleanText === title;
        });
        if (foundChip) {
            log(` -> Success: Found matching chip.`);
        } else {
            log(` -> Failure: No chip with title "${title}" found.`);
        }
        return foundChip;
    }

    async function processArtifact(targetTitle, isDryRun) {
        // Always re-query the chip to avoid stale element references
        let chip = findChipByTitle(targetTitle);

        if (!chip) {
            log(`ERROR: Chip with title "${targetTitle}" not found in DOM. Skipping.`);
            return;
        }

        const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
        const title = titleEl.textContent.trim();

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
            await sleep(1000);
            shareBtn.click();
            log('Share button clicked.');

            // 4. Click Export to Docs
            log('Waiting for Export to Docs button in menu...');
            const exportBtn = await waitForElement(SELECTORS.EXPORT_BUTTON);
            await sleep(1000);

            if (isDryRun) {
                log('[DRY RUN] Skipping final export click.');
                exportBtn.style.border = '2px solid yellow'; // Visual feedback for testing
            } else {
                exportBtn.click();
                log('Export to Docs button clicked.');
            }


            log(`Wait ${isDryRun ? '1s' : '5s'} for processing...`);
            await sleep(isDryRun ? 1000 : 5000);

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

            log(`--- Finished processing: "${title}" ---`);

        } catch (e) {
            log(`CRITICAL ERROR during processing "${title}": ${e.message}`);
            const closeBtn = document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON);
            if (closeBtn) closeBtn.click();
        }
    }

    let isExporting = false;
    let cancelExport = false;

    async function runBatchExport() {
        if (isExporting) {
            cancelExport = true;
            log('Cancellation requested by user.');
            const btn = document.querySelector('#gemini-batch-export-panel button');
            if (btn) btn.textContent = 'Stopping...';
            return;
        }

        isExporting = true;
        cancelExport = false;

        const btn = document.querySelector('#gemini-batch-export-panel button');
        if (btn) {
            btn.textContent = 'Cancel Export';
            btn.style.backgroundColor = '#d93025'; // Red color
            btn.onmouseover = () => { btn.style.backgroundColor = '#a50e0e'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#d93025'; };
        }
        const logPanelBody = document.getElementById('gemini-log-panel-body');
        if (logPanelBody) {
            // Clear previous logs safely without using innerHTML to avoid TrustedHTML violation
            while (logPanelBody.firstChild) {
                logPanelBody.removeChild(logPanelBody.firstChild);
            }
        }

        const isDryRun = GM_getValue(DRY_RUN_KEY, true);
        log(`Batch export started. ${isDryRun ? '[DRY RUN]' : '[LIVE RUN]'}`);

        if (!isConversationPage()) {
            log('Abort: Not on a conversation page.');
            isExporting = false;
            if (btn) {
                btn.textContent = 'Export All Articles';
                btn.style.backgroundColor = '#1a73e8';
                btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
                btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };
            }
            return;
        }

        log('Querying for sidebar element...');
        let sidebar = document.querySelector(SELECTORS.SIDEBAR);
        if (sidebar) {
            log(' -> Sidebar found.');
        } else {
            log(' -> Sidebar not found. Attempting to open it...');
            const toggleBtn = document.querySelector(SELECTORS.SIDEBAR_BUTTON);
            if (toggleBtn) {
                log(' -> Found sidebar toggle button. Clicking it...');
                toggleBtn.click();
                try {
                    sidebar = await waitForElement(SELECTORS.SIDEBAR, document, 3000);
                    log(' -> Sidebar appeared after click.');
                } catch (e) {
                    log('ERROR: Sidebar did not appear after clicking toggle button.');
                    alert('Could not open sidebar.');
                    isExporting = false;
                    if (btn) {
                        btn.textContent = 'Export All Articles';
                        btn.style.backgroundColor = '#1a73e8';
                        btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
                        btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };
                    }
                    return;
                }
            } else {
                log('ERROR: Sidebar toggle button not found.');
                alert('Sidebar toggle button not found.');
                isExporting = false;
                if (btn) {
                    btn.textContent = 'Export All Articles';
                    btn.style.backgroundColor = '#1a73e8';
                    btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
                    btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };
                }
                return;
            }
        }

        const chips = Array.from(sidebar.querySelectorAll(SELECTORS.SIDEBAR_CHIP));

        const articleTitles = [];
        chips.forEach(chip => {
            const icon = chip.querySelector(SELECTORS.CHIP_ICON_CONTAINER);
            const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
            if (icon && icon.getAttribute('fonticon') === 'article' && titleEl) {
                articleTitles.push(titleEl.textContent.trim());
            }
        });

        log(`Found ${articleTitles.length} article artifacts.`);

        const finishExport = () => {
            isExporting = false;
            cancelExport = false;
            if (btn) {
                btn.textContent = 'Export All Articles';
                btn.style.backgroundColor = '#1a73e8';
                btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
                btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };
            }
        };

        if (articleTitles.length === 0) {
            alert('No "Article" type artifacts found in the sidebar.');
            isExporting = false;
            if (btn) {
                btn.textContent = 'Export All Articles';
                btn.style.backgroundColor = '#1a73e8';
                btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
                btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };
            }
            return;
        }

        if (document.querySelector(SELECTORS.IMMERSIVE_PANEL)) {
            document.querySelector(SELECTORS.PANEL_CLOSE_BUTTON)?.click();
            await sleep(1500);
        }

        const progressEl = document.getElementById('gemini-batch-export-progress');

        for (let i = 0; i < articleTitles.length; i++) {
            if (cancelExport) {
                log('Batch export cancelled by user.');
                if (progressEl) progressEl.textContent = 'Cancelled';
                setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
                finishExport();
                return;
            }

            const statusText = `Processing ${i + 1}/${articleTitles.length}: ${articleTitles[i]}`;
            log(statusText);
            if (progressEl) progressEl.textContent = `${i + 1} / ${articleTitles.length}`;

            await processArtifact(articleTitles[i], isDryRun);

            // Only cooldown if it's not the last item
            if (i < articleTitles.length - 1) {
                if (cancelExport) { // Check again before cooldown
                    log('Batch export cancelled by user.');
                    if (progressEl) progressEl.textContent = 'Cancelled';
                    setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
                    finishExport();
                    return;
                }

                // Read cooldown settings freshly for every iteration to allow dynamic adjustment
                const currentCooldown = parseInt(GM_getValue(COOLDOWN_SECONDS_KEY, 3), 10);
                log(`Cooldown before next item (${currentCooldown}s)...`);
                if (progressEl) progressEl.textContent = `Cooldown (${currentCooldown}s)...`;

                // Active wait to allow quicker cancellation response (Wall-clock time based)
                const startTime = Date.now();
                const cooldownMs = currentCooldown * 1000;

                while (Date.now() - startTime < cooldownMs) {
                    if (cancelExport) break;

                    // Update progress display with remaining time
                    if (progressEl) {
                        const remaining = Math.ceil((cooldownMs - (Date.now() - startTime)) / 1000);
                        progressEl.textContent = `Cooldown (${remaining}s)...`;
                    }

                    await sleep(100);
                }
            }
        }

        if (progressEl) progressEl.textContent = 'Done!';
        setTimeout(() => {
            if (progressEl) progressEl.textContent = '';
        }, 3000);

        log('BATCH EXPORT COMPLETED.');
        finishExport();
    }

    // --- UI Injection & Control ---
    const PANEL_POSITION_KEY = 'gemini-exporter-panel-pos';
    const LOG_PANEL_POSITION_KEY = 'gemini-exporter-log-pos';
    const LOG_PANEL_VISIBLE_KEY = 'gemini-exporter-log-visible';
    const DRY_RUN_KEY = 'gemini-exporter-dry-run';
    const COOLDOWN_SECONDS_KEY = 'gemini-exporter-cooldown-seconds';

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
            background-color: rgba(20, 20, 22, 0.5);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
        `;

        const logHeader = document.createElement('div');
        logHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            cursor: move;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            font-family: 'Google Sans', sans-serif;
            font-size: 13px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const headerTitle = document.createElement('span');
        headerTitle.textContent = `${GM_info.script.name} v${GM_info.script.version} - Log`;

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.style.cssText = `
            background-color: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 11px;
            cursor: pointer;
        `;
        copyBtn.onclick = () => {
            const logBody = document.getElementById('gemini-log-panel-body');
            if (!logBody) return;
            navigator.clipboard.writeText(logBody.innerText).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 1500);
            }).catch(err => {
                log('Error copying to clipboard: ' + err);
                copyBtn.textContent = 'Error!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            });
        };


        const logBody = document.createElement('div');
        logBody.id = 'gemini-log-panel-body';
        logBody.style.cssText = `
            flex-grow: 1;
            overflow-y: auto;
            padding: 8px;
            color: rgba(255, 255, 255, 0.8);
            font-family: monospace;
        `;

        logHeader.appendChild(headerTitle);
        logHeader.appendChild(copyBtn);
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
            background-color: rgba(28, 28, 30, 0.5);
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

        // --- Toggles Container ---
        const togglesContainer = document.createElement('div');
        togglesContainer.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;


        const createToggle = (key, text, defaultValue) => {
            const container = document.createElement('label');
            container.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-family: 'Google Sans', sans-serif;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
                padding: 2px 8px;
            `;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = GM_getValue(key, defaultValue);

            checkbox.onchange = (e) => {
                GM_setValue(key, e.target.checked);
                if (key === LOG_PANEL_VISIBLE_KEY) {
                    const logPanel = document.getElementById('gemini-log-panel');
                    if (logPanel) {
                        logPanel.style.display = e.target.checked ? 'flex' : 'none';
                    }
                }
            };
            container.appendChild(checkbox);
            container.appendChild(document.createTextNode(text));
            return container;
        };

        const createCooldownInput = (key, text, defaultValue) => {
            const container = document.createElement('label');
            container.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                cursor: pointer;
                font-family: 'Google Sans', sans-serif;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
                padding: 2px 8px;
            `;
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.min = '3'; // Minimum value
            numberInput.style.cssText = `
                width: 50px;
                background-color: rgba(0,0,0,0.3);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                padding: 2px 4px;
                font-size: 13px;
            `;
            numberInput.value = GM_getValue(key, defaultValue);

            numberInput.onchange = (e) => {
                let value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 3) {
                    value = 3;
                    e.target.value = value;
                }
                GM_setValue(key, value);
            };

            container.appendChild(document.createTextNode(text));
            container.appendChild(numberInput);
            return container;
        };

        const logToggle = createToggle(LOG_PANEL_VISIBLE_KEY, 'Show Log Panel', false);
        const dryRunToggle = createToggle(DRY_RUN_KEY, 'Dry Run', true);
        const cooldownInput = createCooldownInput(COOLDOWN_SECONDS_KEY, 'Cooldown (s)', 3);

        togglesContainer.appendChild(dryRunToggle);
        togglesContainer.appendChild(logToggle);
        togglesContainer.appendChild(cooldownInput);


        const progressDisplay = document.createElement('div');
        progressDisplay.id = 'gemini-batch-export-progress';
        progressDisplay.style.cssText = `
            text-align: center;
            font-family: 'Google Sans', sans-serif;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 4px;
            height: 1.2em; /* Reserve height to prevent layout shift */
        `;

        buttonContainer.appendChild(btn);
        buttonContainer.appendChild(progressDisplay);
        buttonContainer.appendChild(togglesContainer);

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
