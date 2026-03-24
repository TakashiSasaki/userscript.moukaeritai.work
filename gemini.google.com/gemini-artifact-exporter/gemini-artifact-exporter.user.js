// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.4.12
// @lastModified 2026-03-21
// @description  UI for exporting Gemini "Article" artifacts. Requires gemini-artifact-exporter-worker worker script for actual execution. Also uses gemini-history-loader.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     css https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/style.css
// @resource     templateHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/template.html
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    if (typeof GM_addStyle !== 'undefined' && typeof GM_getResourceText !== 'undefined') {
        const css = GM_getResourceText('css');
        if (css) {
            GM_addStyle(css);
        }
    }

    const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);
    report();

    // Custom Event Helper for checking if target userscript is installed
    function checkTargetUserscript(targetName, timeout = 2000) {
        return new Promise((resolve) => {
            const handler = (e) => {
                if (e.detail && e.detail.name === targetName) {
                    clearTimeout(timeoutId);
                    document.removeEventListener('userscript-check-installed', handler);
                    resolve(e.detail);
                }
            };
            const timeoutId = setTimeout(() => {
                document.removeEventListener('userscript-check-installed', handler);
                resolve(null); // Not found or timed out
            }, timeout);
            document.addEventListener('userscript-check-installed', handler);
            document.dispatchEvent(new CustomEvent('userscript-ping'));
        });
    }

    // UI Helper for displaying status
    function showTargetScriptStatus(targetName, statusDetail) {
        const container = document.getElementById('gae-script-status-container');
        if (!container) return; // Panel might not be open yet

        const statusText = statusDetail
            ? `✅ ${targetName} (v${statusDetail.version})`
            : `❌ ${targetName} Not Found`;

        const ui = document.createElement('div');
        ui.className = 'gae-status-item ' + (statusDetail ? 'gae-status-success' : 'gae-status-error');
        ui.textContent = statusText;

        container.appendChild(ui);

        // Auto hide the individual status item after a few seconds
        setTimeout(() => {
            if (ui && ui.parentNode) {
                ui.style.transition = 'opacity 0.3s';
                ui.style.opacity = '0';
                setTimeout(() => { if (ui && ui.parentNode) ui.parentNode.removeChild(ui); }, 300);
            }
        }, statusDetail ? 4000 : 7000); // Keep errors slightly longer
    }

    // Helper for persistent dependency indicator
    function checkDep(targetName, elementId, shortName) {
        checkTargetUserscript(targetName).then((installed) => {
            const el = document.getElementById(elementId);
            if (el) {
                const verSpan = el.querySelector('.dep-version');
                if (installed) {
                    el.classList.add('installed');
                    el.title = `${targetName} - v${installed.version}`;
                    el.style.color = '#81c995'; // Greenish 
                    if (verSpan) verSpan.textContent = `v${installed.version}`;
                } else {
                    el.classList.remove('installed');
                    el.title = `${targetName} - Not Found`;
                    el.style.color = '#f28b82'; // Reddish
                    if (verSpan) verSpan.textContent = 'Not Found';
                }
            }
        });
    }

    // --- Trusted Types ---
    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiArtifactExporter_' + Math.random().toString(36).substr(2, 9), {
                createHTML: (string) => string
            });
        } catch (e) {
            console.warn('Failed to create TrustedTypes policy', e);
        }
    }

    const setInnerHTML = (element, html) => {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

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
        selectAllLabel.className = 'gae-select-all-label';
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
        scrollArea.className = 'gae-scroll-area';

        scannedArtifacts.forEach((item, index) => {
            const { title, sources } = item;
            const label = document.createElement('label');
            label.className = 'gae-artifact-label';
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

        checkTargetUserscript('Gemini History Loader').then((installed) => { showTargetScriptStatus('Gemini History Loader', installed); document.dispatchEvent(new CustomEvent('gemini-history-loader:request', { detail: { reqId: reqId } })); });

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
            checkTargetUserscript('Gemini Artifact Exporter Worker').then((installed) => {
                showTargetScriptStatus('Gemini Artifact Exporter Worker', installed); document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:request', {
                    detail: requestData
                }));
            });
        });
    }

    async function runBatchExport() {
        if (isExporting) {
            log('Cancellation requested by user.');
            cancelExport = true;
            checkTargetUserscript('Gemini Artifact Exporter Worker').then((installed) => { showTargetScriptStatus('Gemini Artifact Exporter Worker', installed); document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:cancel')); });
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

        let hasError = false;

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

                    // Critical failure handled here
                    hasError = true;
                    log(`Critical Failure during batch export on item: "${selectedTitles[i]}". Reason: ${result.reason}`);
                    alert(`エクスポートに失敗しました ("${selectedTitles[i]}": ${result.reason})。\n誤削除を防ぐため、処理を中断します。`);
                    if (progressEl) progressEl.textContent = 'Error Interrupted';
                    setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 5000);
                    finishExport();
                    return; // Early exit preventing auto-delete
                }
            }
            if (i < selectedTitles.length - 1) await sleep(500);
        }

        if (progressEl && !hasError) progressEl.textContent = 'Done!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);

        log('BATCH EXPORT COMPLETED.');
        finishExport();

        if (GM_getValue(AUTO_DELETE_KEY, false) && !cancelExport && !hasError) {
            log('Auto-delete enabled. Requesting gemini-one-click-delete...');
            await sleep(1000);
            checkTargetUserscript('Gemini 1-Click Delete Conversation').then((installed) => { showTargetScriptStatus('Gemini 1-Click Delete Conversation', installed); window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete')); });
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
        panel.style.display = isConversationPage() ? 'flex' : 'none';

        const templateStr = GM_getResourceText('templateHTML').replace(/{{scriptVersion}}/g, GM_info.script.version);
        setInnerHTML(panel, templateStr);
        document.body.appendChild(panel);
        log('Artifact Exporter panel attached to document body.');

        // Check dependencies for persistent UI indicators
        checkDep('Gemini History Loader', 'gae-dep-history-loader', 'History');
        checkDep('Gemini Artifact Exporter Worker', 'gae-dep-worker', 'Worker');
        checkDep('Gemini 1-Click Delete Conversation', 'gae-dep-1click-del', 'Delete');

        // Bind events
        const scanBtn = panel.querySelector('#gemini-btn-scan');
        if (scanBtn) scanBtn.onclick = () => scanArtifacts();

        const deepScanBtn = panel.querySelector('#gemini-btn-deep-scan');
        if (deepScanBtn) deepScanBtn.onclick = () => deepScanArtifacts();

        const exportBtn = panel.querySelector('#gemini-btn-export');
        if (exportBtn) exportBtn.onclick = () => runBatchExport();

        const autoDeleteCb = panel.querySelector('#gae-auto-delete-cb');
        if (autoDeleteCb) {
            autoDeleteCb.checked = GM_getValue(AUTO_DELETE_KEY, false);
            autoDeleteCb.onchange = (e) => GM_setValue(AUTO_DELETE_KEY, e.target.checked);
        }

        const header = panel.querySelector('.gae-panel-header');
        if (header) {
            makePanelDraggable(panel, header, PANEL_POSITION_KEY);
        }

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
            panel.style.backgroundColor = 'rgba(255, 182, 193, 0.9)'; // LightPink
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
