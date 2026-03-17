// ==UserScript==
// @name         Gemini Artifact Exporter
// @namespace    userscript.moukaeritai.work
// @version      0.3.14
// @lastModified 2026-03-17
// @description  Export Gemini "Article" artifacts to Google Docs. Supports batch export, deep scanning of chat history, and separate sidebar scanning.
// @author       Takashi Sasaki
// @homepageURL  https://x.xom/TakashiSasaki
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
        // Primary (immersive Canvas header) + fallback (standard conversation header)
        ACTIONS_MENU_BUTTON: 'button[data-test-id="conversation-actions-menu-icon-button"], conversation-actions-icon button',
        FILES_MENU_ITEM: 'button[data-test-id="studio-sidebar-button"]',
        SIDEBAR_CHIP: 'button.container:has(mat-icon[fonticon="article"])',
        CHIP_TITLE: 'div:nth-child(2) > div:first-child',

        SHARE_BUTTON: 'extended-response-panel share-button button, extended-response-panel button:has(mat-icon[fonticon="share"]), button.export-menu-button',
        EXPORT_BUTTON: 'button[data-test-id="export-to-docs-button"], .mat-mdc-menu-item:has(mat-icon[fonticon="docs"]), button[aria-label*="Google ドキュメントにエクスポート"], button[aria-label*="Export to Google Docs"]',
        MENU_PANEL: '.mat-mdc-menu-panel, mat-menu-panel',
        CANVAS_CLOSE_BUTTON: 'button[data-test-id="close-button"], button.close-button',
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
     * More robust click that ensures focus and handles throttled tabs.
     */
    function robustClick(el) {
        if (!el) return;
        try {
            el.focus();
            // Dispatched events are sometimes more reliable in throttled tabs than el.click()
            // Removed `{ view: window }` because it throws an error in deeply throttled background Chromium tabs.
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            el.click();
        } catch (e) {
            log(`Robust click failed: ${e.message}`);
            el.click();
        }
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

    function getVisibleSnackbars() {
        return Array.from(document.querySelectorAll('mat-snack-bar-container, .mat-mdc-snack-bar-container'))
            .filter(el => isVisible(el));
    }

    function dismissSnackbars() {
        const toastBtns = document.querySelectorAll('mat-snack-bar-container button, .mat-mdc-snack-bar-container button');
        toastBtns.forEach(btn => btn.click());
    }

    async function waitForExportStart(exportBtn, menuPanel, detectTimeoutMs = 2500) {
        const start = Date.now();

        while ((Date.now() - start) < detectTimeoutMs) {
            await sleep(200);

            const snackbarTexts = getVisibleSnackbars()
                .map(el => (el.textContent || '').trim())
                .filter(Boolean);

            const hasDocsToast = snackbarTexts.some(text =>
                text.includes('作成されました') ||
                text.includes('Document created') ||
                text.includes('作成しています') ||
                text.includes('Creating document')
            );
            if (hasDocsToast) {
                return { status: 'started', reason: 'docs-toast' };
            }

            const menuStillVisible = Boolean(menuPanel && isVisible(menuPanel));
            const exportBtnStillVisible = Boolean(exportBtn && isVisible(exportBtn));

            if (!menuStillVisible) {
                return { status: 'started', reason: 'menu-closed' };
            }

            if (!exportBtnStillVisible) {
                return { status: 'started', reason: 'export-button-disappeared' };
            }
        }

        return { status: 'started', reason: 'assumed-after-click' };
    }

    function clearStuckOverlays(aggressive) {
        // CRITICAL BUG FIX: Do NOT delete '.cdk-overlay-container' or '.cdk-global-overlay-wrapper'.
        // Angular Material CDK requires these to remain in the DOM. Deleting them permanently breaks all menus.
        const selectors = aggressive
            ? '.cdk-overlay-backdrop, [id^="cdk-overlay-"], .mat-mdc-snack-bar-container, mat-snack-bar-container'
            : '.cdk-overlay-backdrop, .mat-mdc-snack-bar-container, mat-snack-bar-container';

        const stuckElements = document.querySelectorAll(selectors);
        let clearedCount = 0;
        stuckElements.forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
                clearedCount++;
            }
        });

        // If the container is blocking clicks because a child didn't clean up, we ensure it's unblocked
        // without destroying the container itself.
        const cdkContainer = document.querySelector('.cdk-overlay-container');
        if (cdkContainer && cdkContainer.children.length === 0) {
            cdkContainer.style.pointerEvents = 'none';
        }

        if (clearedCount > 0) {
            log(`Cleared ${clearedCount} overlay elements (aggressive=${aggressive}).`);
        }
    }

    // --- Core Logic ---

    // Find a fresh reference to the chip in the DOM based on its title, scrolling if necessary.
    async function findChipByTitle(title) {
        log(`Querying for chip with title: "${title}" by scanning sidebar and chat...`);

        // --- 1. Try Sidebar ---
        const scrollContainer = document.querySelector('div.scrollable-container');
        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
            await sleep(300);

            let lastScrollTop = -1;
            for (let i = 0; i < 50; i++) {
                const chips = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_CHIP));
                const found = chips.find(chip => {
                    const t = chip.querySelector(SELECTORS.CHIP_TITLE);
                    return t && t.textContent.trim() === title;
                });
                if (found) {
                    log(` -> Success: Found chip in sidebar.`);
                    return found;
                }
                if (scrollContainer.scrollTop === lastScrollTop) break;
                lastScrollTop = scrollContainer.scrollTop;
                scrollContainer.scrollBy({ top: 500 });
                await sleep(400);
            }
        }

        // --- 2. Try Chat Stream ---
        log(`Chip not found in sidebar. Searching chat history for: "${title}"...`);
        const chatScroller = document.querySelector('infinite-scroller') || window;

        let lastChatScrollTop = -1;
        const getChatScroll = () => (chatScroller === window ? window.scrollY : chatScroller.scrollTop);

        if (chatScroller === window) window.scrollTo({ top: 0 });
        else chatScroller.scrollTop = 0;
        await sleep(300);

        for (let i = 0; i < 50; i++) {
            const cards = Array.from(document.querySelectorAll(SELECTORS.CHAT_ARTIFACT_CONTAINER));
            const found = cards.find(card => {
                const t = card.querySelector(SELECTORS.CHAT_ARTIFACT_TITLE);
                return t && t.textContent.trim() === title;
            });
            if (found) {
                log(` -> Success: Found chip in chat stream.`);
                return found;
            }
            if (getChatScroll() === lastChatScrollTop) break;
            lastChatScrollTop = getChatScroll();
            if (chatScroller === window) window.scrollBy({ top: 800 });
            else chatScroller.scrollBy({ top: 800 });
            await sleep(500);
        }

        log(` -> Failure: No chip with title "${title}" found anywhere.`);
        return null;
    }

    async function processArtifact(targetTitle) {
        let chip = await findChipByTitle(targetTitle);

        if (!chip) {
            log(`Chip "${targetTitle}" not found. Re-opening files panel...`);

            // Round 3: Clear overlays BEFORE clicking action menu
            clearStuckOverlays(true);
            await sleep(300); // Give UI a moment to settle

            const actionMenuBtn = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON);
            if (actionMenuBtn) {
                log(`Found action menu button: ${actionMenuBtn.getAttribute('aria-label') || 'unlabeled'}`);
                robustClick(actionMenuBtn);
                try {
                    // Increased timeout for throttled tabs
                    const menu = await waitForElement(SELECTORS.MENU_PANEL, document, 5000);

                    // Round 3: Robust text-based fallback for "Files" menu item
                    let filesMenuItem = menu.querySelector(SELECTORS.FILES_MENU_ITEM);
                    if (!filesMenuItem) {
                        log("Selector for Files menu item failed. Trying text-based fallback...");
                        const items = Array.from(menu.querySelectorAll('.mat-mdc-menu-item, button[role="menuitem"]'));
                        filesMenuItem = items.find(item => {
                            const text = item.textContent.toLowerCase();
                            return text.includes('files in this chat') || text.includes('このチャット内のファイル');
                        });
                    }

                    if (filesMenuItem) {
                        log(`Clicking Files menu item: ${filesMenuItem.textContent.trim()}`);
                        robustClick(filesMenuItem);
                        // Wait for sidebar to transition in and chips to render
                        await sleep(parseFloat(GM_getValue(REOPEN_DELAY_KEY, 1.5)) * 1000 + 1000);
                        chip = await findChipByTitle(targetTitle);
                    } else {
                        log("ERROR: Could not find 'Files' item in menu panel.");
                    }
                } catch (err) {
                    log(`Warning: Failed to reopen files panel: ${err.message}`);
                }
            } else {
                log(`ERROR: Actions menu button (${SELECTORS.ACTIONS_MENU_BUTTON}) not found.`);
            }
        }

        if (!chip) {
            log(`ERROR: Chip with title "${targetTitle}" not found in DOM even after opening panel. Skipping.`);
            return { status: 'failed', reason: 'chip-not-found', title: targetTitle };
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
                exportBtn = candidates.find(b => isVisible(b)) ||
                    allMenuButtons.find(b => {
                        const text = b.textContent.toLowerCase();
                        return (text.includes('export to docs') || text.includes('ドキュメントにエクスポート')) && isVisible(b);
                    });

                if (exportBtn) break;
                await sleep(250);
                exportRetries++;
            }

            if (!exportBtn) {
                throw new Error("Export to Docs button not found in menu.");
            }

            const exportMenu = exportBtn.closest(SELECTORS.MENU_PANEL) || document.querySelector(SELECTORS.MENU_PANEL);
            const startPromise = waitForExportStart(exportBtn, exportMenu);

            await sleep(500); // Wait for menu animation to settle before clicking the target
            exportBtn.click();
            log('Export to Docs button clicked. Waiting for start signal...');

            const startResult = await startPromise;
            log(`Export start signal detected (${startResult.reason}).`);

            // Immediately clear overlays to unblock UI as soon as export starts
            clearStuckOverlays(true);

            const exportWaitSeconds = parseFloat(GM_getValue(EXPORT_WAIT_SECONDS_KEY, 10));
            log(`Waiting ${exportWaitSeconds}s for Google Docs export to settle...`);
            await sleep(exportWaitSeconds * 1000);
            dismissSnackbars();

            // Aggressive cleanup after processing each artifact
            clearStuckOverlays(true);

            // Round 4 & 5: Explicitly close the Canvas view and the Files sidebar
            const closeBtn = document.querySelector(SELECTORS.CANVAS_CLOSE_BUTTON);
            if (closeBtn) {
                log(`[Verify] Canvas close button found. Clicking to close canvas...`);
                robustClick(closeBtn);
                await sleep(1000); // Wait for slide-out animation
                log(`[Verify] Canvas closed. Slide-out animation wait complete.`);

                // Round 5: Explicitly close the Files sidebar to reset state for the next artifact
                const sidebarToggle = document.querySelector(SELECTORS.FILES_MENU_ITEM) || document.querySelector('button[mattooltip="Files in this chat"], button[aria-label="Files in this chat"]');
                if (sidebarToggle) {
                    log(`[Verify] Files sidebar toggle found. Clicking to close sidebar and reset state...`);
                    robustClick(sidebarToggle);
                    await sleep(500);
                    log(`[Verify] Files sidebar closed.`);
                } else {
                    log(`[Verify/Warning] Files sidebar toggle NOT found. Sidebar state reset skipped.`);
                }

                // Force clear any lingering backdrop that the toggles missed
                log(`[Verify] Performing final overlay sweep...`);
                clearStuckOverlays(false);
            } else {
                log(`[Verify] Canvas close button NOT found. Assuming Canvas was already closed or missed.`);
                // Gemini Bug Workaround: escape key to dismiss any lingering modals if not in Canvas
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
            }

            log(`--- Finished processing: "${title}" ---`);
            return { status: 'success', reason: startResult.reason, title };

        } catch (e) {
            log(`CRITICAL ERROR during processing "${title}": ${e.message}`);
            clearStuckOverlays(true);
            return { status: 'failed', reason: e.message, title };
        }
    }

    let isScanning = false;
    let isExporting = false;
    let cancelExport = false;
    let scannedArtifacts = [];
    let hasAutoScanned = false;
    const artifactMap = new Map(); // title -> { sources: Set }

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

    function getChatScroller() {
        // Specifically look for the chat history scroller, avoiding the narrow side-nav scroller
        let scroller = document.querySelector('infinite-scroller.chat-history') ||
            document.querySelector('chat-window-content infinite-scroller');

        if (!scroller) {
            const scrollers = Array.from(document.querySelectorAll('infinite-scroller'));
            // Heuristic: The chat scroller is wide (> 300px), sidebar is narrow (~70px)
            scroller = scrollers.find(el => el.clientWidth > 300);
        }

        if (!scroller) {
            for (const el of document.querySelectorAll('*')) {
                // Heuristic for other scrollable containers
                if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 200 && el.clientWidth > 300) {
                    const ov = getComputedStyle(el).overflowY;
                    if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > 2000) {
                        if (!scroller || el.scrollHeight > scroller.scrollHeight) scroller = el;
                    }
                }
            }
        }
        return scroller || document.documentElement;
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

        const addArtifact = (title, source) => {
            if (!artifactMap.has(title)) {
                artifactMap.set(title, { sources: new Set() });
            }
            artifactMap.get(title).sources.add(source);
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
                        addArtifact(titleEl.textContent.trim(), 'Sidebar');
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
                    addArtifact(titleEl.textContent.trim(), 'Sidebar');
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

        // 1. Close the Canvas panel if open to maximize chat view
        await closeAllPanels();

        // 2. Find infinite-scroller
        let scroller = getChatScroller();

        log('Ascending to the true top of the conversation...');

        // Exert focus and pointer events to wake up Angular's lazy loaders
        if (!scroller.hasAttribute('tabindex')) scroller.setAttribute('tabindex', '-1');
        scroller.focus({ preventScroll: true });

        // 3. Ascend to true top
        let highestScrollHeight = scroller.scrollHeight;
        let prevFirstTurnContent = '';
        let topAttempts = 0;
        let stallCount = 0;

        while (topAttempts < 250) {
            // Scroll up instantly by roughly one viewport height to avoid smooth animation overlap lock
            const scrollStep = Math.max(800, scroller.clientHeight * 0.8);
            if (scroller === document.documentElement) {
                window.scrollBy({ top: -scrollStep, behavior: 'instant' });
            } else {
                scroller.scrollTop -= scrollStep; // Use direct property assignment for maximum reliability
            }

            await sleep(400); // Wait for the smooth animation

            const currentScrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;

            if (currentScrollTop <= 10) {
                // Reached the top of the currently loaded DOM. Wait to see if more loads.
                await sleep(1500);

                const currentFirstTurn = document.querySelector('message-content, .message-content');
                const currentContent = currentFirstTurn ? currentFirstTurn.textContent.substring(0, 50) : '';

                if (currentContent === prevFirstTurnContent && scroller.scrollHeight <= highestScrollHeight + 50) {
                    stallCount++;
                    log(`Waiting for history to load... (Attempt ${stallCount}/3)`);
                    if (stallCount >= 3) {
                        log('Reached absolute top of conversation.');
                        break;
                    }
                } else {
                    stallCount = 0; // History loaded, reset stall count
                    log('Loaded older conversation history. Continuing ascent...');
                }

                prevFirstTurnContent = currentContent;
                if (scroller.scrollHeight > highestScrollHeight) {
                    highestScrollHeight = scroller.scrollHeight;
                }
            } else {
                stallCount = 0; // Freely scrolling
            }
            topAttempts++;
        }

        // Ensure we are exactly at 0 after breaking
        scroller.scrollTop = 0;
        await sleep(1000);

        log('Descending and collecting artifacts...');

        // 4. Descend and Collect
        let downAttempts = 0;

        while (downAttempts < 300) {
            // Collect visible artifacts
            const chatChips = Array.from(document.querySelectorAll(SELECTORS.CHAT_ARTIFACT_CONTAINER));
            chatChips.forEach(card => {
                const titleEl = card.querySelector(SELECTORS.CHAT_ARTIFACT_TITLE);
                if (titleEl) {
                    const title = titleEl.textContent.trim();
                    if (!artifactMap.has(title)) {
                        artifactMap.set(title, { sources: new Set() });
                    }
                    artifactMap.get(title).sources.add('DeepScan');
                }
            });

            const currentScrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;

            // Check if we've reached the bottom (or close to it)
            // scroller.scrollHeight - scroller.clientHeight gives the max scrollTop
            if (currentScrollTop >= (scroller.scrollHeight - scroller.clientHeight - 50)) {
                stallCount++;
                log(`Waiting for more content to load at bottom... (Attempt ${stallCount}/3)`);
                if (stallCount >= 3) {
                    log('Reached absolute bottom of conversation.');
                    break;
                }
            } else {
                stallCount = 0; // Still scrolling down, reset stall count
            }

            // Scroll down by 80% viewport to ensure overlap, using instantaneous jump
            const scrollStep = Math.max(800, scroller.clientHeight * 0.8);
            if (scroller === document.documentElement) {
                window.scrollBy({ top: scrollStep, behavior: 'instant' });
            } else {
                scroller.scrollTop += scrollStep;
            }

            await sleep(600); // Wait for smooth scroll and render
            downAttempts++;
        }

        finishScanning('Deep Scan');
        isScanning = false;
    }

    async function runBatchExport() {
        if (isExporting) {
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

        // --- Dispatch image copy request (must be in sync path from user click for User Gesture) ---
        const imageCopyIndicator = document.getElementById('gemini-image-copy-indicator');
        if (imageCopyIndicator) {
            imageCopyIndicator.textContent = '⏳ Copying images...';
            imageCopyIndicator.style.color = 'rgba(255, 255, 255, 0.7)';
            imageCopyIndicator.style.display = 'block';
        }

        // Set up one-time result listener before dispatching
        const imageCopyResultPromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                resolve({ success: false, count: 0, reason: 'timeout' });
            }, 10000); // 10s timeout

            const handler = (e) => {
                clearTimeout(timeoutId);
                document.removeEventListener('gemini-turn-counter-copy-images-result', handler);
                resolve(e.detail || { success: false, count: 0 });
            };
            document.addEventListener('gemini-turn-counter-copy-images-result', handler);
        });

        log('Dispatching gemini-turn-counter-copy-images event (target: all)...');
        document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images', {
            detail: { target: 'all' }
        }));

        // Wait for and display the result (non-blocking for the export flow)
        imageCopyResultPromise.then((result) => {
            log(`Image copy result: success=${result.success}, count=${result.count || 0}`);
            if (imageCopyIndicator) {
                if (result.success) {
                    const count = result.count || 0;
                    imageCopyIndicator.textContent = `✅ ${count} image(s) copied`;
                    imageCopyIndicator.style.color = '#2ea44f';
                } else if (result.reason === 'timeout') {
                    imageCopyIndicator.textContent = '⚠️ Image copy timed out (Turn Counter not running?)';
                    imageCopyIndicator.style.color = '#f0ad4e';
                } else {
                    imageCopyIndicator.textContent = '📭 No images found';
                    imageCopyIndicator.style.color = 'rgba(255, 255, 255, 0.5)';
                }
                // Auto-hide after 10 seconds
                setTimeout(() => {
                    if (imageCopyIndicator) imageCopyIndicator.style.display = 'none';
                }, 10000);
            }
        });

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

            log(`Processing ${i + 1}/${selectedTitles.length}: ${selectedTitles[i]}`);
            if (progressEl) progressEl.textContent = `${i + 1} / ${selectedTitles.length}`;

            // Hint to the browser to focus this window before processing.
            // Helps with background throttling in some browsers.
            window.focus();

            let result = await processArtifact(selectedTitles[i]);
            if (result.status === 'failed' && !cancelExport) {
                log(`Retrying "${selectedTitles[i]}" once due to ${result.status} (${result.reason})...`);
                await sleep(1000);
                result = await processArtifact(selectedTitles[i]);
            }

            const checkbox = Array.from(listContainer.querySelectorAll('.artifact-cb')).find(cb => cb.value === selectedTitles[i]);
            if (checkbox && checkbox.parentNode && result.status === 'success') {
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
            if (checkbox && checkbox.parentNode && result.status !== 'success') {
                checkbox.parentNode.style.textDecoration = 'none';
                checkbox.parentNode.style.opacity = '1';
                checkbox.parentNode.title = `Failed: ${result.reason}`;
                const nodes = Array.from(checkbox.parentNode.childNodes);
                for (let node of nodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        if (!node.textContent.includes('[FAILED]')) {
                            node.textContent = ` [FAILED] ${node.textContent}`;
                        }
                        break;
                    }
                }
                log(`Failed to export "${selectedTitles[i]}" after retry.`);
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

        if (GM_getValue(AUTO_DELETE_KEY, false) && !cancelExport) {
            log('Auto-delete enabled. Waiting 1s before requesting conversation deletion...');
            await sleep(1000);
            log('Requesting gemini-one-click-delete to delete conversation.');
            window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));
        }
    }

    // --- UI Injection & Control ---
    const PANEL_POSITION_KEY = 'gemini-exporter-panel-pos';
    const EXPORT_WAIT_SECONDS_KEY = 'gemini-exporter-timeout-seconds';
    const REOPEN_DELAY_KEY = 'gemini-exporter-reopen-delay';
    const CANVAS_INIT_DELAY_KEY = 'gemini-exporter-canvas-init-delay';
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

        const exportWaitInput = createNumberInput(EXPORT_WAIT_SECONDS_KEY, 'Export Wait (s)', 10, 1);
        const autoDeleteInput = createCheckboxInput(AUTO_DELETE_KEY, 'Auto-Delete Chat', false);
        const reopenDelayInput = createNumberInput(REOPEN_DELAY_KEY, 'Panel Reopen (s)', 1.5, 0, 0.5);
        const canvasInitDelayInput = createNumberInput(CANVAS_INIT_DELAY_KEY, 'Canvas Init (s)', 3.0, 0, 0.5);

        togglesContainer.appendChild(autoDeleteInput);
        togglesContainer.appendChild(exportWaitInput);
        togglesContainer.appendChild(reopenDelayInput);
        togglesContainer.appendChild(canvasInitDelayInput);


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

        // --- Image Copy Indicator ---
        const imageCopyIndicator = document.createElement('div');
        imageCopyIndicator.id = 'gemini-image-copy-indicator';
        imageCopyIndicator.style.cssText = `
            text-align: center;
            font-family: 'Google Sans', sans-serif;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 2px;
            display: none;
        `;

        buttonContainer.appendChild(scanButtonsContainer);
        buttonContainer.appendChild(listContainer);
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(progressDisplay);
        buttonContainer.appendChild(imageCopyIndicator);
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
