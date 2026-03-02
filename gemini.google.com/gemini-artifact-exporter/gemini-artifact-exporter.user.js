// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.2.38
// @lastModified 2026-03-03
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
// @noframes
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
        ACTIONS_MENU_BUTTON: 'conversation-actions-icon button',
        FILES_MENU_ITEM: '.mat-mdc-menu-item:has(mat-icon[fonticon="home_storage"])',
        SIDEBAR_CHIP: 'button.container:has(mat-icon[fonticon="article"])',
        CHIP_TITLE: 'div:nth-child(2) > div:first-child',
        CHIP_ICON_CONTAINER: 'mat-icon',
        SHARE_BUTTON: 'extended-response-panel share-button button, extended-response-panel button:has(mat-icon[fonticon="share"])',
        EXPORT_BUTTON: 'button[data-test-id="export-to-docs-button"], .mat-mdc-menu-item:has(mat-icon[fonticon="docs"])',
        MENU_PANEL: '.mat-mdc-menu-panel'
    };

    function log(msg) {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        const formattedMsg = `[Exporter ${timestamp}] ${msg}`;
        console.log(formattedMsg);
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

    async function processArtifact(targetTitle) {
        let chip = findChipByTitle(targetTitle);

        if (!chip) {
            log(`Chip "${targetTitle}" not found. Re-opening files panel...`);
            const actionMenuBtn = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON);
            if (actionMenuBtn) {
                actionMenuBtn.click();
                try {
                    const menu = await waitForElement(SELECTORS.MENU_PANEL, document, 3000);
                    const filesMenuItem = menu.querySelector(SELECTORS.FILES_MENU_ITEM);
                    if (filesMenuItem) filesMenuItem.click();
                    await sleep(parseFloat(GM_getValue(REOPEN_DELAY_KEY, 1.5)) * 1000); // Wait for panel to open
                    chip = findChipByTitle(targetTitle);
                } catch (e) {
                    log('Warning: Failed to repoen files panel.');
                }
            }
        }

        if (!chip) {
            log(`ERROR: Chip with title "${targetTitle}" not found in DOM even after opening panel. Skipping.`);
            return;
        }

        const title = targetTitle;
        log(`--- Start processing artifact: "${title}" ---`);

        chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        log(`Clicking chip "${title}"...`);
        chip.click();

        // 2. Wait for Canvas switch
        log('Waiting for canvas to load...');
        await sleep(parseFloat(GM_getValue(CANVAS_INIT_DELAY_KEY, 3.0)) * 1000); // Wait time for canvas initialization

        // 3. Click Share
        try {
            log('Attempting to click Share button...');
            const shareBtn = await waitForElement(SELECTORS.SHARE_BUTTON, document, 5000);
            await sleep(500); // UI stabilization
            shareBtn.click();
            log('Share button clicked.');

            // 4. Click Export to Docs
            log('Waiting for Export to Docs button in menu...');
            let exportBtn = null;
            let exportRetries = 0;

            while (!exportBtn && exportRetries < 20) {
                const candidates = Array.from(document.querySelectorAll(SELECTORS.EXPORT_BUTTON));

                // Fallback to text matching if strict CSS selectors fail
                const allMenuButtons = Array.from(document.querySelectorAll('.mat-mdc-menu-item, button[role="menuitem"]'));
                exportBtn = candidates.find(b => b.offsetParent !== null) ||
                    allMenuButtons.find(b => {
                        const text = b.textContent.toLowerCase();
                        return (text.includes('export to docs') || text.includes('ドキュメントにエクスポート')) && b.offsetParent !== null;
                    });

                if (exportBtn) break;
                await sleep(250);
                exportRetries++;
            }

            if (!exportBtn) {
                throw new Error("Export to Docs button not found in menu.");
            }

            await sleep(500); // Wait for menu animation to settle before clicking the target
            exportBtn.click();
            log('Export to Docs button clicked. Waiting for completion...');

            let isCreating = true;
            let waitCheck = 0;
            let docsOpened = false;

            const onVisibilityChange = () => {
                if (document.hidden) {
                    docsOpened = true;
                }
            };
            document.addEventListener('visibilitychange', onVisibilityChange);

            const timeoutSeconds = parseInt(GM_getValue(TIMEOUT_SECONDS_KEY, 10), 10);
            const maxChecks = timeoutSeconds * 2; // Assuming 500ms sleep per check

            while (isCreating && waitCheck < maxChecks) {
                await sleep(500);
                waitCheck++;

                if (docsOpened) {
                    log('Success: New tab opened (Google Docs).');
                    isCreating = false;
                    break;
                }

                const overlays = Array.from(document.querySelectorAll('.cdk-overlay-container, mat-snack-bar-container'));
                const overlayText = overlays.map(o => o.textContent).join(' ');

                if (overlayText.includes('作成されました') || overlayText.includes('Document created')) {
                    log('Success: Document created toast detected.');
                    isCreating = false;

                    // Attempt to dismiss the toast to clear the UI
                    const toastBtns = document.querySelectorAll('mat-snack-bar-container button');
                    toastBtns.forEach(btn => btn.click());
                    break;
                } else if (overlayText.includes('作成しています') || overlayText.includes('Creating document')) {
                    if (waitCheck % 4 === 0) log('Still creating document...');
                } else {
                    // If we don't see any export-related text after a short while, we assume it's done or dismissed
                    const autoCompleteTimeout = parseFloat(GM_getValue(AUTO_COMPLETE_DELAY_KEY, 5.0));
                    if (waitCheck > (autoCompleteTimeout * 2)) {
                        log('No export progress toast visible. Assuming completion.');
                        isCreating = false;
                    }
                }
            }

            document.removeEventListener('visibilitychange', onVisibilityChange);

            // Gemini Bug Workaround: Forcefully clear all overlays if they are stuck
            log('Aggressively clearing stuck overlays to prevent UI block...');
            const stuckElements = document.querySelectorAll('.cdk-overlay-backdrop, [id^="cdk-overlay-"], .mat-mdc-snack-bar-container, .cdk-global-overlay-wrapper');
            let clearedCount = 0;
            stuckElements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                    clearedCount++;
                }
            });
            if (clearedCount > 0) {
                log(`Cleared ${clearedCount} stuck overlay elements.`);
            }

            // aggressive cleanup fallback for panels
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));

            log(`--- Finished processing: "${title}" ---`);

        } catch (e) {
            log(`CRITICAL ERROR during processing "${title}": ${e.message}`);
        }
    }

    let isExporting = false;
    let cancelExport = false;
    let scannedArtifacts = [];

    function renderArtifactList() {
        const listContainer = document.getElementById('gemini-artifact-list-container');
        const exportBtn = document.getElementById('gemini-btn-export');
        if (!listContainer || !exportBtn) return;

        while (listContainer && listContainer.firstChild) {
            listContainer.removeChild(listContainer.firstChild);
        }

        if (scannedArtifacts.length === 0) {
            listContainer.style.display = 'none';
            exportBtn.style.display = 'none';
            alert('No "Article" type artifacts found in the sidebar.');
            return;
        }

        listContainer.style.display = 'flex';
        exportBtn.style.display = 'block';

        const selectAllLabel = document.createElement('label');
        selectAllLabel.style.cssText = `display:flex; align-items:center; gap:8px; font-size:13px; font-weight:bold; color:white; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; cursor: pointer;`;
        const selectAllCb = document.createElement('input');
        selectAllCb.type = 'checkbox';
        selectAllCb.checked = true;
        selectAllCb.onchange = (e) => {
            const cbs = listContainer.querySelectorAll('.artifact-cb');
            cbs.forEach(cb => { cb.checked = e.target.checked; });
        };
        selectAllLabel.appendChild(selectAllCb);
        selectAllLabel.appendChild(document.createTextNode('Select All'));
        listContainer.appendChild(selectAllLabel);

        const scrollArea = document.createElement('div');
        scrollArea.style.cssText = `max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px;`;

        scannedArtifacts.forEach((title, index) => {
            const label = document.createElement('label');
            label.style.cssText = `display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(255,255,255,0.8); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
            label.title = title;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'artifact-cb';
            cb.value = title;
            cb.checked = true;
            cb.onchange = () => {
                const allCbs = scrollArea.querySelectorAll('.artifact-cb');
                const allChecked = Array.from(allCbs).every(c => c.checked);
                selectAllCb.checked = allChecked;
            };
            label.appendChild(cb);
            label.appendChild(document.createTextNode(`${index + 1}. ${title}`));
            scrollArea.appendChild(label);
        });

        listContainer.appendChild(scrollArea);
    }

    async function scanArtifacts() {
        const scanBtn = document.getElementById('gemini-btn-scan');
        if (scanBtn) {
            scanBtn.textContent = 'Scanning...';
            scanBtn.style.pointerEvents = 'none';
            scanBtn.style.opacity = '0.7';
        }

        const logPanelBody = document.getElementById('gemini-log-panel-body');
        if (logPanelBody) {
            while (logPanelBody.firstChild) {
                logPanelBody.removeChild(logPanelBody.firstChild);
            }
        }

        log('Scanning artifacts...');

        if (!isConversationPage()) {
            log('Abort: Not on a conversation page.');
            if (scanBtn) {
                scanBtn.textContent = 'Scan Artifacts';
                scanBtn.style.pointerEvents = 'auto';
                scanBtn.style.opacity = '1';
            }
            return;
        }

        log('Opening files panel via actions menu...');
        const actionMenuBtn = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON);
        if (!actionMenuBtn) {
            log('Abort: Action menu button not found.');
            if (scanBtn) {
                scanBtn.textContent = 'Scan Artifacts';
                scanBtn.style.pointerEvents = 'auto';
                scanBtn.style.opacity = '1';
            }
            return;
        }

        actionMenuBtn.click();
        let filesMenuItem;
        try {
            const menu = await waitForElement(SELECTORS.MENU_PANEL, document, 3000);
            filesMenuItem = menu.querySelector(SELECTORS.FILES_MENU_ITEM);
            if (!filesMenuItem) throw new Error('Files menu item not found');
        } catch (e) {
            log('ERROR: Could not find Files menu in the action list.');
            alert('Could not open files list.');
            document.querySelector('.cdk-overlay-backdrop')?.click(); // close menu
            if (scanBtn) {
                scanBtn.textContent = 'Scan Artifacts';
                scanBtn.style.pointerEvents = 'auto';
                scanBtn.style.opacity = '1';
            }
            return;
        }

        filesMenuItem.click();

        log('Waiting for chips to load in panel...');
        let chips = [];
        for (let i = 0; i < 20; i++) {
            await sleep(250);
            chips = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
            if (chips.length > 0) break;
        }

        scannedArtifacts = [];
        chips.forEach(chip => {
            const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
            if (titleEl) {
                scannedArtifacts.push(titleEl.textContent.trim());
            }
        });

        log(`Found ${scannedArtifacts.length} article artifacts.`);

        // Close right side menu to clean up UI
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
        const backdrop = document.querySelector('.mat-drawer-backdrop');
        if (backdrop && backdrop.offsetParent !== null) {
            backdrop.click();
        }

        renderArtifactList();

        if (scanBtn) {
            scanBtn.textContent = 'Rescan Artifacts';
            scanBtn.style.pointerEvents = 'auto';
            scanBtn.style.opacity = '1';
        }
    }

    async function runBatchExport() {
        if (isExporting) {
            cancelExport = true;
            log('Cancellation requested by user.');
            const btn = document.getElementById('gemini-btn-export');
            if (btn) btn.textContent = 'Stopping...';
            return;
        }

        const listContainer = document.getElementById('gemini-artifact-list-container');
        if (!listContainer) return;

        const selectedTitles = Array.from(listContainer.querySelectorAll('.artifact-cb:checked')).map(cb => cb.value);

        if (selectedTitles.length === 0) {
            alert('No artifacts selected for export.');
            return;
        }

        isExporting = true;
        cancelExport = false;

        const btn = document.getElementById('gemini-btn-export');
        if (btn) {
            btn.textContent = 'Cancel Export';
            btn.style.backgroundColor = '#d93025'; // Red color
            btn.onmouseover = () => { btn.style.backgroundColor = '#a50e0e'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#d93025'; };
        }

        listContainer.querySelectorAll('input').forEach(inp => inp.disabled = true);
        const scanBtn = document.getElementById('gemini-btn-scan');
        if (scanBtn) {
            scanBtn.style.pointerEvents = 'none';
            scanBtn.style.opacity = '0.5';
        }

        log('Batch export started.');

        const finishExport = () => {
            isExporting = false;
            cancelExport = false;
            if (btn) {
                btn.textContent = 'Export Selected';
                btn.style.backgroundColor = '#1a73e8';
                btn.onmouseover = () => { btn.style.backgroundColor = '#1b66c9'; };
                btn.onmouseout = () => { btn.style.backgroundColor = '#1a73e8'; };
            }
            listContainer.querySelectorAll('input').forEach(inp => inp.disabled = false);
            if (scanBtn) {
                scanBtn.style.pointerEvents = 'auto';
                scanBtn.style.opacity = '1';
            }
        };

        const progressEl = document.getElementById('gemini-batch-export-progress');

        for (let i = 0; i < selectedTitles.length; i++) {
            if (cancelExport) {
                log('Batch export cancelled by user.');
                if (progressEl) progressEl.textContent = 'Cancelled';
                setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
                finishExport();
                return;
            }

            const statusText = `Processing ${i + 1}/${selectedTitles.length}: ${selectedTitles[i]}`;
            log(statusText);
            if (progressEl) progressEl.textContent = `${i + 1} / ${selectedTitles.length}`;

            await processArtifact(selectedTitles[i]);

            // Mark as done in the UI
            const checkbox = Array.from(listContainer.querySelectorAll('.artifact-cb')).find(cb => cb.value === selectedTitles[i]);
            if (checkbox && checkbox.parentNode) {
                checkbox.parentNode.style.textDecoration = 'line-through';
                checkbox.parentNode.style.opacity = '0.5';
                // Find the text node to append the checkmark
                const nodes = Array.from(checkbox.parentNode.childNodes);
                for (let node of nodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        if (!node.textContent.includes('✅')) {
                            node.textContent = ' ✅ ' + node.textContent;
                        }
                        break;
                    }
                }
            }

            // Small UI sleep before starting the next item to allow memory / UI catchup
            if (i < selectedTitles.length - 1) {
                await sleep(500);
            }
        }

        if (progressEl) progressEl.textContent = 'Done!';
        setTimeout(() => {
            if (progressEl) progressEl.textContent = '';
        }, 3000);

        log('BATCH EXPORT COMPLETED.');
        finishExport();

        const AUTO_DELETE_KEY = 'gemini-exporter-auto-delete';
        if (GM_getValue(AUTO_DELETE_KEY, false) && !cancelExport) {
            log('Auto-delete enabled. Waiting 1s before requesting conversation deletion...');
            await sleep(1000);
            log('Requesting gemini-one-click-delete to delete conversation.');
            window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));
        }
    }

    // --- UI Injection & Control ---
    const PANEL_POSITION_KEY = 'gemini-exporter-panel-pos';
    const TIMEOUT_SECONDS_KEY = 'gemini-exporter-timeout-seconds';
    const REOPEN_DELAY_KEY = 'gemini-exporter-reopen-delay';
    const CANVAS_INIT_DELAY_KEY = 'gemini-exporter-canvas-init-delay';
    const AUTO_COMPLETE_DELAY_KEY = 'gemini-exporter-auto-complete-delay';
    const AUTO_DELETE_KEY = 'gemini-exporter-auto-delete';

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

        const scanBtn = document.createElement('button');
        scanBtn.id = 'gemini-btn-scan';
        scanBtn.textContent = 'Scan Artifacts';
        scanBtn.title = 'アーティファクトの一覧を取得します。';
        scanBtn.style.cssText = `
            padding: 10px 16px;
            background-color: #3c4043;
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.2s;
        `;
        scanBtn.onmouseover = () => { scanBtn.style.backgroundColor = '#5f6368'; };
        scanBtn.onmouseout = () => { scanBtn.style.backgroundColor = '#3c4043'; };
        scanBtn.onclick = () => scanArtifacts();

        const listContainer = document.createElement('div');
        listContainer.id = 'gemini-artifact-list-container';
        listContainer.style.cssText = `display:none; flex-direction:column; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);`;

        const exportBtn = document.createElement('button');
        exportBtn.id = 'gemini-btn-export';
        exportBtn.textContent = 'Export Selected';
        exportBtn.title = '選択したアーティファクトをGoogle Docsにエクスポートします。';
        exportBtn.style.cssText = `
            padding: 10px 16px;
            background-color: #1a73e8;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.2s;
            display: none;
        `;
        exportBtn.onmouseover = () => { exportBtn.style.backgroundColor = '#1b66c9'; };
        exportBtn.onmouseout = () => { exportBtn.style.backgroundColor = '#1a73e8'; };
        exportBtn.onclick = () => runBatchExport();

        // --- Toggles Container ---
        const togglesContainer = document.createElement('div');
        togglesContainer.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;


        const createNumberInput = (key, text, defaultValue, minVal, step = 1) => {
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
            numberInput.min = minVal.toString();
            numberInput.step = step.toString();
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
                let value = parseFloat(e.target.value);
                if (isNaN(value) || value < minVal) {
                    value = minVal;
                    e.target.value = value;
                }
                GM_setValue(key, value);
            };

            container.appendChild(document.createTextNode(text));
            container.appendChild(numberInput);
            return container;
        };

        const createCheckboxInput = (key, text, defaultValue) => {
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
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cssText = `
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: #1a73e8;
            `;
            checkbox.checked = GM_getValue(key, defaultValue);

            checkbox.onchange = (e) => {
                GM_setValue(key, e.target.checked);
            };

            container.appendChild(document.createTextNode(text));
            container.appendChild(checkbox);
            return container;
        };

        const timeoutInput = createNumberInput(TIMEOUT_SECONDS_KEY, 'Doc Wait (s)', 10, 1);
        const autoDeleteInput = createCheckboxInput(AUTO_DELETE_KEY, 'Auto-Delete Chat', false);
        const reopenDelayInput = createNumberInput(REOPEN_DELAY_KEY, 'Panel Reopen (s)', 1.5, 0, 0.5);
        const canvasInitDelayInput = createNumberInput(CANVAS_INIT_DELAY_KEY, 'Canvas Init (s)', 3.0, 0, 0.5);
        const autoCompleteDelayInput = createNumberInput(AUTO_COMPLETE_DELAY_KEY, 'Auto Complete (s)', 5.0, 0, 0.5);

        togglesContainer.appendChild(autoDeleteInput);
        togglesContainer.appendChild(timeoutInput);
        togglesContainer.appendChild(reopenDelayInput);
        togglesContainer.appendChild(canvasInitDelayInput);
        togglesContainer.appendChild(autoCompleteDelayInput);


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

        buttonContainer.appendChild(scanBtn);
        buttonContainer.appendChild(listContainer);
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(progressDisplay);
        buttonContainer.appendChild(togglesContainer);

        panel.appendChild(header);
        panel.appendChild(buttonContainer);
        document.body.appendChild(panel);



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
        // Required element for this script to work
        const actionsMenuExists = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON) !== null;

        // If the essential element is missing, we consider the script inactive/hidden
        // regardless of the URL check, although typically they go hand-in-hand.
        const shouldActive = isConversationPage() && actionsMenuExists;

        const panel = document.getElementById('gemini-batch-export-panel');
        if (!panel) {
            if (shouldActive) {
                createTriggerButtons();
            }
            return;
        }

        const shouldShow = shouldActive;
        panel.style.display = shouldShow ? 'flex' : 'none';

        // Force style update to ensure visibility (handle lingering elements or style glitches)
        if (shouldShow) {
            panel.style.backgroundColor = 'rgba(28, 28, 30, 0.7)';
            panel.style.zIndex = '10000';
        }


    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedUpdate = debounce(updateButtonVisibility, 200);

    let lastUrl = window.location.href;

    // Initial check
    updateButtonVisibility();

    // Observe DOM changes instead of polling
    const observer = new MutationObserver((mutations) => {
        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            if (scannedArtifacts.length > 0) {
                scannedArtifacts = [];
                renderArtifactList();
                const scanBtn = document.getElementById('gemini-btn-scan');
                if (scanBtn) {
                    scanBtn.textContent = 'Scan Artifacts';
                }
            }
        }

        // We could try to filter mutations here, but for "sidebar button appearance",
        // essentially any subtree change could be relevant in an SPA.
        // Debouncing protects performance.
        debouncedUpdate();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });


})();
