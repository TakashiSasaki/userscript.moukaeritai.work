// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.4.2
// @lastModified 2026-03-17
// @description  UI for exporting Gemini "Article" artifacts. Requires gemini-artifact-exporter-worker worker script for actual execution. Also uses gemini-history-loader.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
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
        'userscript.moukaeritai.work'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname);

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
        ACTIONS_MENU_BUTTON: 'button[data-test-id="conversation-actions-menu-icon-button"], conversation-actions-icon button',
        FILES_MENU_ITEM: 'button[data-test-id="studio-sidebar-button"]',
        SIDEBAR_CHIP: 'button.container:has(mat-icon[fonticon="article"])',
        CHIP_TITLE: 'div:nth-child(2) > div:first-child',
        MENU_PANEL: '.mat-mdc-menu-panel, mat-menu-panel',
        CHAT_ARTIFACT_CONTAINER: 'div.container.clickable:has([data-test-id="artifact-text"]), deep-research-entry-chip-content',
        CHAT_ARTIFACT_TITLE: '[data-test-id="artifact-text"], span'
    };

    function log(msg) {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        const formattedMsg = `[Exporter ${timestamp}] ${msg}`;
        console.log(formattedMsg);
    }

    log(`Script loaded on ${window.location.href} (readyState=${document.readyState})`);

    function isConversationPage() {
        return /^\/(app|gem)\//.test(window.location.pathname);
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
        // Round 6: Replace standard setTimeout with background-aware polling.
        // Chrome aggressively throttles/suspends pure setTimeout in background tabs.
        // Polling Date.now() ensures that even if interval ticks are delayed to ~1s+,
        // the math remains correct and it resolves on the next available tick,
        // rather than being permanently suspended.
        return new Promise(resolve => {
            const start = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - start >= ms) {
                    clearInterval(interval);
                    resolve();
                }
            }, Math.min(ms, 50)); // Check every 50ms, but don't ping faster than requested ms
        });
    }

    /**
     * More robust visibility check that doesn't rely solely on offsetParent,
     * which can be null for fixed-position elements or in background tabs.
     */
    function isVisible(el) {
        if (!el || !el.isConnected) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;

        // offsetParent is null if fixed or if the tab is in background (sometimes)
        if (el.offsetParent !== null) return true;

        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // --- Core Logic ---

    // Export execution is now handled by the worker script.

    let isScanning = false;
    let isExporting = false;
    let cancelExport = false;
    let scannedArtifacts = [];
    let hasAutoScanned = false;
    const artifactMap = new Map(); // title -> { sources: Set, element: HTMLElement }

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

        scannedArtifacts.forEach((item, index) => {
            const { title, sources } = item;
            const label = document.createElement('label');
            label.style.cssText = `display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(255,255,255,0.8); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;`;
            label.title = `${title} [${sources.join(', ')}]`;
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
            label.appendChild(document.createTextNode(`${index + 1}. ${title} [${sources.join(', ')}]`));
            scrollArea.appendChild(label);
        });

        listContainer.appendChild(scrollArea);
    }

    // --- Scanning Helpers ---

    function setScanningUIState(isStarting, mode = 'scan') {
        const scanBtn = document.getElementById('gemini-btn-scan');
        const deepScanBtn = document.getElementById('gemini-btn-deep-scan');

        if (isStarting) {
            if (scanBtn) {
                scanBtn.textContent = mode === 'scan' ? 'Scanning Sidebar...' : 'Scan Sidebar Menu';
                scanBtn.style.pointerEvents = 'none';
                scanBtn.style.opacity = mode === 'scan' ? '0.7' : '0.5';
            }
            if (deepScanBtn) {
                deepScanBtn.textContent = mode === 'deep' ? 'Scanning Chat...' : 'Scan Chat History';
                deepScanBtn.style.pointerEvents = 'none';
                deepScanBtn.style.opacity = mode === 'deep' ? '0.7' : '0.5';
            }
        } else {
            if (scanBtn) {
                scanBtn.textContent = 'Rescan Sidebar Menu';
                scanBtn.style.pointerEvents = 'auto';
                scanBtn.style.opacity = '1';
            }
            if (deepScanBtn) {
                deepScanBtn.textContent = 'Rescan Chat History';
                deepScanBtn.style.pointerEvents = 'auto';
                deepScanBtn.style.opacity = '1';
            }
        }
    }

    async function closeAllPanels() {
        // 1. Specifically target the Canvas close button if it exists
        const canvasCloseBtn = document.querySelector('button[data-test-id="close-button"]');
        if (canvasCloseBtn) {
            log('Closing Canvas panel to enable history loading...');
            canvasCloseBtn.click();
            await sleep(800); // Wait for layout shift
        }

        // 2. Generic Escape key
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));

        // 3. Side drawer backdrop
        const backdrop = document.querySelector('.mat-drawer-backdrop');
        if (backdrop && isVisible(backdrop)) {
            backdrop.click();
        }
        await sleep(500);
    }

    function finishScanning(modeName) {
        scannedArtifacts = Array.from(artifactMap.entries()).map(([title, data]) => ({
            title,
            sources: Array.from(data.sources).sort()
        }));

        log(`${modeName} complete. Found ${scannedArtifacts.length} unique article artifacts.`);

        if (scannedArtifacts.length === 0) {
            alert(`No "Article" type artifacts found during ${modeName}.`);
        }

        renderArtifactList();
        setScanningUIState(false);
    }

    // --- Main Scanning Functions ---

    async function scanArtifacts() {
        const scanBtn = document.getElementById('gemini-btn-scan');
        if (scanBtn) {
            scanBtn.textContent = 'Scanning Sidebar...';
            scanBtn.style.pointerEvents = 'none';
            scanBtn.style.opacity = '0.7';
        }

        log('Scanning sidebar artifacts...');

        if (!isConversationPage()) {
            log('Abort: Not on a conversation page.');
            if (scanBtn) {
                scanBtn.textContent = 'Scan Sidebar Menu';
                scanBtn.style.pointerEvents = 'auto';
                scanBtn.style.opacity = '1';
            }
            return;
        }

        // --- Step 1: Scan Sidebar ---
        log('Opening files panel via actions menu...');
        const actionMenuBtn = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON);
        if (!actionMenuBtn) {
            log('Abort: Action menu button not found.');
            setScanningUIState(false);
            isScanning = false;
            return;
        }

        actionMenuBtn.click();
        let filesMenuItem;
        try {
            const menu = await waitForElement(SELECTORS.MENU_PANEL, document, 3000);
            filesMenuItem = menu.querySelector(SELECTORS.FILES_MENU_ITEM);
            if (!filesMenuItem) {
                // Text-based fallback
                const items = Array.from(menu.querySelectorAll('.mat-mdc-menu-item, button[role="menuitem"]'));
                filesMenuItem = items.find(item => {
                    const text = item.textContent.toLowerCase();
                    return text.includes('files in this chat') || text.includes('このチャット内のファイル');
                });
            }
            if (!filesMenuItem) throw new Error('Files menu item not found');
        } catch {
            log('ERROR: Could not find Files menu in the action list.');
            alert('Could not open files list.');
            document.querySelector('.cdk-overlay-backdrop')?.click(); // close menu
            setScanningUIState(false);
            isScanning = false;
            return;
        }

        filesMenuItem.click();

        log('Waiting for chips to load in panel...');
        let initialChips = [];
        for (let i = 0; i < 20; i++) {
            await sleep(250);
            initialChips = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
            if (initialChips.length > 0) break;
        }

        const scrollContainer = document.querySelector('div.scrollable-container');
        artifactMap.clear();

        const addArtifact = (title, source, element) => {
            if (!artifactMap.has(title)) {
                artifactMap.set(title, { sources: new Set(), element: null });
            }
            const data = artifactMap.get(title);
            data.sources.add(source);
            if (element && !data.element) {
                data.element = element;
            }
        };

        log('Scanning sidebar list by scrolling...');
        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
            await sleep(500);
            let lastScrollTop = -1;

            for (let i = 0; i < 100; i++) {
                const currentChips = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
                currentChips.forEach(chip => {
                    const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
                    if (titleEl) {
                        addArtifact(titleEl.textContent.trim(), 'Sidebar', chip);
                    }
                });

                if (scrollContainer.scrollTop === lastScrollTop) break;
                lastScrollTop = scrollContainer.scrollTop;
                scrollContainer.scrollBy({ top: 500, behavior: 'smooth' });
                await sleep(500);
            }
            scrollContainer.scrollTop = 0;
        } else {
            log('Warning: sidebar scrollable-container not found. Falling back to static sidebar scan.');
            initialChips.forEach(chip => {
                const titleEl = chip.querySelector(SELECTORS.CHIP_TITLE);
                if (titleEl) {
                    addArtifact(titleEl.textContent.trim(), 'Sidebar', chip);
                }
            });
        }

        // Close right side menu before finishing
        await closeAllPanels();

        finishScanning('Sidebar Scan');
        isScanning = false;
    }

    async function deepScanArtifacts() {
        if (isScanning || isExporting) return;
        isScanning = true;

        setScanningUIState(true, 'deep');
        artifactMap.clear();

        log('Requesting gemini-history-loader to load all history...');
        const reqId = `load_${Date.now()}`;

        const loadPromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                log('Warning: Timeout waiting for gemini-history-loader:complete. Proceeding anyway.');
                document.removeEventListener('gemini-history-loader:complete', handler);
                resolve({ status: 'timeout' });
            }, 120000); // 2-minute hard timeout for loading history

            const handler = (e) => {
                if (e.detail && e.detail.reqId === reqId) {
                    clearTimeout(timeoutId);
                    document.removeEventListener('gemini-history-loader:complete', handler);
                    resolve(e.detail);
                }
            };
            document.addEventListener('gemini-history-loader:complete', handler);
        });

        document.dispatchEvent(new CustomEvent('gemini-history-loader:request', { detail: { reqId: reqId } }));

        // Wait for the loader script to scroll to the top and load the history into the DOM
        const result = await loadPromise;
        log(`History loader finished with status: ${result.status}`);

        // The history is now fully loaded in the DOM. We don't need to descend manually;
        // we can simply query all the artifacts currently rendered in the infinite-scroller.
        log('Collecting loaded artifacts from the DOM...');
        const chatChips = Array.from(document.querySelectorAll(SELECTORS.CHAT_ARTIFACT_CONTAINER));

        chatChips.forEach(card => {
            const titleEl = card.querySelector(SELECTORS.CHAT_ARTIFACT_TITLE);
            if (titleEl) {
                const title = titleEl.textContent.trim();
                if (!artifactMap.has(title)) {
                    artifactMap.set(title, { sources: new Set(), element: null });
                }
                const data = artifactMap.get(title);
                data.sources.add('DeepScan');
                if (!data.element) data.element = card;
            }
        });

        finishScanning('Deep Scan');
        isScanning = false;
    }

    function requestExportWorker(requestData) {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                document.removeEventListener('gemini-artifact-exporter-worker:result', handler);
                resolve({ status: 'failed', title: requestData.targetTitle, reason: 'Worker timeout' });
            }, 60000); // 60s hard timeout per item

            const handler = (e) => {
                if (e.detail.requestId === requestData.requestId) {
                    clearTimeout(timeoutId);
                    document.removeEventListener('gemini-artifact-exporter-worker:result', handler);
                    resolve(e.detail);
                }
            };
            document.addEventListener('gemini-artifact-exporter-worker:result', handler);

            log(`Sending request to worker for "${requestData.targetTitle}"...`);
            document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:request', {
                detail: requestData
            }));
        });
    }

    async function runBatchExport() {
        if (isExporting) {
            log('Cancellation requested by user.');
            cancelExport = true;
            document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:cancel'));
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
            btn.style.backgroundColor = '#d93025';
            btn.onmouseover = () => { btn.style.backgroundColor = '#a50e0e'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#d93025'; };
        }

        listContainer.querySelectorAll('input').forEach(inp => inp.disabled = true);
        const scanBtn = document.getElementById('gemini-btn-scan');
        if (scanBtn) {
            scanBtn.style.pointerEvents = 'none';
            scanBtn.style.opacity = '0.5';
        }

        log('Batch export started via worker.');

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

            log(`Requesting worker to process ${i + 1}/${selectedTitles.length}: ${selectedTitles[i]}`);
            if (progressEl) progressEl.textContent = `${i + 1} / ${selectedTitles.length}`;
            window.focus();

            const reqId = `req_${Date.now()}_${i}`;
            const reqData = {
                requestId: reqId,
                targetTitle: selectedTitles[i],
                targetElement: artifactMap.get(selectedTitles[i])?.element || null,
                exportWaitSeconds: 6,
                canvasInitDelay: 1.0,
                reopenDelay: 1.0,
                currentIndex: i + 1,
                totalItems: selectedTitles.length
            };

            let result = await requestExportWorker(reqData);

            if (result.status === 'failed' && !cancelExport) {
                log(`Worker failed for "${selectedTitles[i]}" (${result.reason}). Retrying once...`);
                await sleep(1000);
                reqData.requestId = `req_${Date.now()}_${i}_retry`;
                result = await requestExportWorker(reqData);
            }

            const checkbox = Array.from(listContainer.querySelectorAll('.artifact-cb')).find(cb => cb.value === selectedTitles[i]);
            if (checkbox && checkbox.parentNode) {
                if (result.status === 'success') {
                    checkbox.parentNode.style.textDecoration = 'line-through';
                    checkbox.parentNode.style.opacity = '0.5';
                    const nodes = Array.from(checkbox.parentNode.childNodes);
                    for (let node of nodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            if (!node.textContent.includes('✅')) node.textContent = ' ✅ ' + node.textContent;
                            break;
                        }
                    }
                } else if (result.status !== 'cancelled') {
                    checkbox.parentNode.style.textDecoration = 'none';
                    checkbox.parentNode.style.opacity = '1';
                    checkbox.parentNode.title = `Failed: ${result.reason}`;
                    const nodes = Array.from(checkbox.parentNode.childNodes);
                    for (let node of nodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            if (!node.textContent.includes('[FAILED]')) node.textContent = ` [FAILED] ${node.textContent}`;
                            break;
                        }
                    }
                }
            }
            if (i < selectedTitles.length - 1) await sleep(500);
        }

        if (progressEl) progressEl.textContent = 'Done!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);

        log('BATCH EXPORT COMPLETED.');
        finishExport();

        if (GM_getValue(AUTO_DELETE_KEY, false) && !cancelExport) {
            log('Auto-delete enabled. Requesting gemini-one-click-delete...');
            await sleep(1000);
            window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));
        }
    }

    // --- UI Injection & Control ---
    const PANEL_POSITION_KEY = 'gemini-exporter-panel-pos';
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
        if (document.getElementById('gemini-batch-export-panel')) {
            log('Panel already exists. Skipping UI creation.');
            return;
        }

        log('Creating Artifact Exporter panel UI.');

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
        scanBtn.textContent = 'Scan Sidebar Menu';
        scanBtn.title = '右サイドバーにある「このチャット内のファイル一覧」を展開してスキャンします。';
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

        const deepScanBtn = document.createElement('button');
        deepScanBtn.id = 'gemini-btn-deep-scan';
        deepScanBtn.textContent = 'Scan Chat History';
        deepScanBtn.title = 'メイン会話履歴を上部までスクロールしながら、履歴に埋まっているアーティファクトをすべて検出します。数秒かかります。';
        deepScanBtn.style.cssText = `
            padding: 10px 16px;
            background-color: #5bb974;
            color: #202124;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: 'Google Sans', sans-serif;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background-color 0.2s;
        `;
        deepScanBtn.onmouseover = () => { deepScanBtn.style.backgroundColor = '#4ca163'; };
        deepScanBtn.onmouseout = () => { deepScanBtn.style.backgroundColor = '#5bb974'; };
        deepScanBtn.onclick = () => deepScanArtifacts();

        const scanButtonsContainer = document.createElement('div');
        scanButtonsContainer.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: 8px;
            width: 100%;
        `;

        scanBtn.style.flex = '1';
        deepScanBtn.style.flex = '1';
        scanBtn.style.padding = '8px 10px';
        deepScanBtn.style.padding = '8px 10px';
        scanBtn.style.fontSize = '13px';
        deepScanBtn.style.fontSize = '13px';

        scanButtonsContainer.appendChild(scanBtn);
        scanButtonsContainer.appendChild(deepScanBtn);

        buttonContainer.appendChild(scanButtonsContainer);

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

        const autoDeleteInput = createCheckboxInput(AUTO_DELETE_KEY, 'Auto-Delete Chat', false);

        togglesContainer.appendChild(autoDeleteInput);


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

        buttonContainer.appendChild(scanButtonsContainer);
        buttonContainer.appendChild(listContainer);
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(progressDisplay);
        buttonContainer.appendChild(togglesContainer);

        panel.appendChild(header);
        panel.appendChild(buttonContainer);
        document.body.appendChild(panel);
        log('Artifact Exporter panel attached to document body.');



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

        // Check if there are any article artifacts actually present in the chat stream
        // This is the trigger to show/hide the UI.
        const hasArtifacts = document.querySelector('mat-icon[fonticon="article"], .mat-icon[fonticon="article"]') !== null;

        // If the essential element is missing or no artifacts are found, we hide the panel
        const shouldActive = isConversationPage() && actionsMenuExists && hasArtifacts;

        const panel = document.getElementById('gemini-batch-export-panel');
        if (!panel) {
            if (shouldActive) {
                log(`Visibility check passed. Creating panel (url=${window.location.href}).`);
                createTriggerButtons();
            }
            return;
        }

        const wasHidden = panel.style.display === 'none';
        panel.style.display = shouldActive ? 'flex' : 'none';

        if (shouldActive && wasHidden) {
            log('Visibility check passed. Showing panel.');
        } else if (!shouldActive && !wasHidden) {
            log(`Visibility check failed. Hiding panel (conversation=${isConversationPage()}, actionsMenu=${actionsMenuExists}, hasArtifacts=${hasArtifacts}).`);
        }

        // Force style update to ensure visibility (handle lingering elements or style glitches)
        if (shouldActive) {
            panel.style.backgroundColor = 'rgba(28, 28, 30, 0.7)';
            panel.style.zIndex = '10000';

            // Automatic Sidebar Scan Trigger
            if (!hasAutoScanned && !isExporting && !isScanning) {
                hasAutoScanned = true;
                log('Triggering automatic sidebar scan...');
                scanArtifacts();
            }
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
    log('Running initial visibility check.');
    updateButtonVisibility();

    // Observe DOM changes instead of polling
    const observer = new MutationObserver((_mutations) => {
        if (lastUrl !== window.location.href) {
            log(`URL changed from ${lastUrl} to ${window.location.href}`);
            lastUrl = window.location.href;
            hasAutoScanned = false; // Reset scan state for new conversation
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
    log('MutationObserver started for panel visibility updates.');


})();
