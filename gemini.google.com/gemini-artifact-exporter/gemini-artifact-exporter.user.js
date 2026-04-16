// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.4.43
// @lastModified 2026-04-16
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
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     geminiArtifactExporterCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.css
// @resource     geminiArtifactExporterHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter/gemini-artifact-exporter.user.js
// @noframes
// @history       0.4.43 UI表示タイトルから冗長な "Gemini " プレフィックスを除去。
// @history       0.4.42 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.4.41 アーティファクト非検出時にパネルを非表示にするのではなく最小化状態に連動（Activity-Linked Panel State）
// @history       0.4.40 ヘッダー右側のバージョン表示を廃止
// @history       0.4.39 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.4.38 UI改善: シングルクリックでの開閉に対応し、タイトルとバージョンの表示形式を [絵文字] [名称] v[バージョン] に統一
// @history       0.4.37 UI共通化: パネルの外枠を gemini-common.html に統合し、ダブルクリックで開閉するように変更
// @history       0.4.34 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整 (ログ出力を追加)
// ==/UserScript==

(function () {
    'use strict';

    if (typeof GM_addStyle !== 'undefined' && typeof GM_getResourceText !== 'undefined') {
        // Inject shared common styles
        const commonCSS = GM_getResourceText('geminiCommon');
        if (commonCSS && !document.getElementById('gemini-common-styles')) {
            const commonStyle = document.createElement('style');
            commonStyle.textContent = commonCSS;
            commonStyle.id = 'gemini-common-styles';
            document.head.appendChild(commonStyle);
        }

        const css = GM_getResourceText('geminiArtifactExporterCSS');
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

    if (location.hostname === 'userscript.moukaeritai.work') {
        return;
    }

    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {

        const initUserScript = () => {

            const policy = window.geminiCreateTrustedHTMLPolicy('geminiArtifactExporter');





            // Helper for persistent dependency indicator

            // --- Trusted Types ---



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
                    await window.geminiSleep(800); // Wait for layout shift
                }

                // 2. Generic Escape key
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));

                // 3. Side drawer backdrop
                const backdrop = document.querySelector('.mat-drawer-backdrop');
                if (backdrop && isVisible(backdrop)) {
                    backdrop.click();
                }
                await window.geminiSleep(500);
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
                    const menu = await window.geminiWaitForElement(SELECTORS.MENU_PANEL, document, 3000);
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
                    await window.geminiSleep(250);
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
                    await window.geminiSleep(500);
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
                        await window.geminiSleep(500);
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

                window.geminiCheckTargetUserscript('Gemini History Loader').then((installed) => { window.geminiShowTargetScriptStatus('gae-script-status-container', 'Gemini History Loader', installed); document.dispatchEvent(new CustomEvent('gemini-history-loader:request', { detail: { reqId: reqId } })); });

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
                    window.geminiCheckTargetUserscript('Gemini Artifact Exporter Worker').then((installed) => {
                        window.geminiShowTargetScriptStatus('gae-script-status-container', 'Gemini Artifact Exporter Worker', installed); document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:request', {
                            detail: requestData
                        }));
                    });
                });
            }

            async function runBatchExport() {
                if (isExporting) {
                    log('Cancellation requested by user.');
                    cancelExport = true;
                    window.geminiCheckTargetUserscript('Gemini Artifact Exporter Worker').then((installed) => { window.geminiShowTargetScriptStatus('gae-script-status-container', 'Gemini Artifact Exporter Worker', installed); document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:cancel')); });
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
                        await window.geminiSleep(1000);
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
                    if (i < selectedTitles.length - 1) await window.geminiSleep(500);
                }

                if (progressEl && !hasError) progressEl.textContent = 'Done!';
                setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);

                log('BATCH EXPORT COMPLETED.');
                finishExport();

                if (GM_getValue(AUTO_DELETE_KEY, false) && !cancelExport && !hasError) {
                    log('Auto-delete enabled. Requesting gemini-one-click-delete...');
                    await window.geminiSleep(1000);
                    window.geminiCheckTargetUserscript('Gemini 1-Click Delete Conversation').then((installed) => { window.geminiShowTargetScriptStatus('gae-script-status-container', 'Gemini 1-Click Delete Conversation', installed); window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete')); });
                }
            }

            // --- UI Injection & Control ---
            const PANEL_POSITION_KEY = 'gemini-exporter-panel-pos';
            const AUTO_DELETE_KEY = 'gemini-exporter-auto-delete';





            function createTriggerButtons() {
                if (document.getElementById('gemini-batch-export-panel')) {
                    log('Panel already exists. Skipping UI creation.');
                    return;
                }

                log('Creating Artifact Exporter panel UI.');

                const templateHTML = GM_getResourceText('geminiArtifactExporterHTML');
                const commonHTMLStr = GM_getResourceText('gusCommonHTML');
                if (!templateHTML || !commonHTMLStr) {
                    console.error('[Gemini Artifact Exporter] Resource not found');
                    return;
                }


                // Create inner content wrapper
                const contentDiv = document.createElement('div');
                contentDiv.className = 'gae-content';
                window.geminiSetInnerHTML(contentDiv, templateHTML, policy);

                // Assemble panel shell
                const panelShell = window.geminiCreateCommonPanel({
                    htmlString: commonHTMLStr,
                    policy: policy,
                    icon: gusEmoji,
                    name: GM_info.script.name,
                    version: GM_info.script.version,
                    contentElement: contentDiv
                });

                panelShell.id = 'gemini-batch-export-panel';
                document.body.appendChild(panelShell);

                log('Artifact Exporter panel attached to document body.');

                // Bind events
                const scanBtn = panelShell.querySelector('#gemini-btn-scan');
                if (scanBtn) scanBtn.onclick = () => scanArtifacts();

                const deepScanBtn = panelShell.querySelector('#gemini-btn-deep-scan');
                if (deepScanBtn) deepScanBtn.onclick = () => deepScanArtifacts();

                const exportBtn = panelShell.querySelector('#gemini-btn-export');
                if (exportBtn) exportBtn.onclick = () => runBatchExport();

                const autoDeleteCb = panelShell.querySelector('#gae-auto-delete-cb');
                if (autoDeleteCb) {
                    autoDeleteCb.checked = GM_getValue(AUTO_DELETE_KEY, false);
                    autoDeleteCb.onchange = (e) => GM_setValue(AUTO_DELETE_KEY, e.target.checked);
                }

                const dragHandle = panelShell.querySelector('.gus-panel-header');
                const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
                if (inactiveHandle) {
                    window.geminiSetupDraggablePanel(panelShell, inactiveHandle, PANEL_POSITION_KEY, { right: '20px', bottom: '20px' });
                }
                if (dragHandle) {
                    window.geminiSetupDraggablePanel(panelShell, dragHandle, PANEL_POSITION_KEY, { right: '20px', bottom: '20px' });
                }

                // Set up minimizable panel
                window.geminiSetupMinimizablePanel(panelShell, 'gae-minimized', dragHandle, false);
            }

            function updateButtonVisibility() {
                // Check for conversation page
                if (!isConversationPage()) {
                    const panel = document.getElementById('gemini-batch-export-panel');
                    if (panel) panel.style.display = 'none';
                    return;
                }

                // Required elements for full UI
                const actionsMenuExists = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON) !== null;
                const hasArtifacts = document.querySelector('mat-icon[fonticon="article"], .mat-icon[fonticon="article"]') !== null;

                const shouldActive = actionsMenuExists && hasArtifacts;

                let panel = document.getElementById('gemini-batch-export-panel');
                if (!panel) {
                    log(`Creating panel (url=${window.location.href}).`);
                    createTriggerButtons();
                    panel = document.getElementById('gemini-batch-export-panel');
                    if (!panel) return;
                }

                // The panel shell should ALWAYS be visible if we are on a conversation page.
                panel.style.display = 'flex';

                if (shouldActive) {
                    panel.classList.remove('gus-minimized');
                    // Automatic Sidebar Scan Trigger
                    if (!hasAutoScanned && !isExporting && !isScanning) {
                        hasAutoScanned = true;
                        log('Triggering automatic sidebar scan...');
                        scanArtifacts();
                    }
                } else {
                    panel.classList.add('gus-minimized');
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


        };

        if (document.readyState === 'complete') {
            initUserScript();
        } else {
            window.addEventListener('load', initUserScript);
        }
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
