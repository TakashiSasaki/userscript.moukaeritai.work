// ==UserScript==
// @name         Gemini Artifact Exporter Worker
// @namespace    userscript.moukaeritai.work
// @version      0.2.25
// @description  A worker script that handles the actual export process of Gemini "Article" artifacts to Google Docs. It receives custom events from the main exporter UI and performs DOM manipulation and background tasks.
// @lastModified 2026-04-02
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        https://docs.google.com/document/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     style https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter-worker/style.css
// @resource     template https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter-worker/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter-worker/gemini-artifact-exporter-worker.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter-worker/gemini-artifact-exporter-worker.user.js
// @noframes
// ==/UserScript==

(function () {
    'use strict';
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

    // Reserve a load-order slot
    const { emoji: gusEmoji } = window.registerGeminiUserscript ? registerGeminiUserscript(GM_info.script.name, GM_info.script.version) : { emoji: '' };

    const initUserScript = () => {

        const initUserScript = () => {

            const policy = window.geminiCreateTrustedHTMLPolicy('geminiArtifactExporterWorker');

            // Trusted Types Policy Creation for Gemini CSP




            // Inject styles and templates
            if (typeof GM_getResourceText !== 'undefined') {
                const isGemini = location.hostname === 'gemini.google.com';
                const isDocs = location.hostname.includes('docs.google.com');
                const isChatPage = /^\/(app|gem)\//.test(location.pathname);

                // Inject shared common styles
                const commonCSS = GM_getResourceText('geminiCommon');
                if (commonCSS && !document.getElementById('gemini-common-styles')) {
                    const commonStyle = document.createElement('style');
                    commonStyle.textContent = commonCSS;
                    commonStyle.id = 'gemini-common-styles';
                    document.head.appendChild(commonStyle);
                }

                const style = GM_getResourceText('style');
                if (style) {
                    const styleEl = document.createElement('style');
                    styleEl.textContent = style;
                    document.head.appendChild(styleEl);
                } else {
                    console.error('[Gemini Artifact Exporter Worker] Fatal Error: style.css resource not found. The script cannot continue and will exit.');
                    return;
                }

                const template = GM_getResourceText('template');
                if (template) {
                    // Only inject template on relevant pages to avoid DOM pollution
                    if (isDocs || (isGemini && isChatPage)) {
                        const tempDiv = document.createElement('div');
                        window.geminiSetInnerHTML(tempDiv, template, policy);
                        document.body.appendChild(tempDiv);
                    }
                } else {
                    console.error('[Gemini Artifact Exporter Worker] Fatal Error: template.html resource not found. The script cannot continue and will exit.');
                    return;
                }
            } else {
                console.error('[Gemini Artifact Exporter Worker] Fatal Error: GM_getResourceText is not available. The script cannot continue and will exit.');
                return;
            }



            // UI Helper for displaying status
            function showTargetScriptStatus(targetName, statusDetail) {
                const uiId = 'userscript-target-status-ui';
                let ui = document.getElementById(uiId);

                if (!ui) {
                    const template = document.getElementById('tpl-target-status-ui');
                    if (template) {
                        const clone = template.content.cloneNode(true);
                        ui = clone.querySelector('#userscript-target-status-ui');
                        ui.className += ' gus-panel';
                        document.body.appendChild(clone);
                    } else {
                        console.error('[Gemini Artifact Exporter Worker] Fatal Error: tpl-target-status-ui not found. Status indicator cannot be displayed.');
                        return;
                    }

                    // Position is managed entirely by geminiSetupDraggablePanel

                    // Make draggable
                    window.geminiSetupDraggablePanel(ui, ui, 'userscript-status-ui-pos', { right: '20px', top: '100px' });
                }

                const statusText = statusDetail
                    ? `✅ ${targetName} (v${statusDetail.version})`
                    : `❌ ${targetName} Not Found`;

                const titleDiv = ui.querySelector('.target-status-title');
                const statusDiv = ui.querySelector('.target-status-text') || ui;

                if (titleDiv) titleDiv.textContent = 'Script Status:';
                statusDiv.textContent = statusText;

                // Auto hide after 5 seconds if successful, keep if failed
                if (statusDetail) {
                    setTimeout(() => {
                        if (ui && ui.parentNode) ui.parentNode.removeChild(ui);
                    }, 5000);
                }
            }


            const SELECTORS = {
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
                const formattedMsg = `[Export Worker ${timestamp}] ${msg}`;
                console.log(formattedMsg);
            }

            log(`Worker script loaded on ${window.location.href} (readyState=${document.readyState})`);

            // --- State Management ---
            let isExporting = false;
            let cancelExportRequested = false;

            // --- Google Docs Logic ---
            if (location.hostname.includes('docs.google.com')) {
                if (document.referrer && document.referrer.includes('gemini.google.com')) {
                    log('Opened from Gemini. Acknowledging export to origin tab...');

                    // Notify origin tab that this document successfully opened
                    if (typeof GM_setValue !== 'undefined') {
                        // We'll use a broad timestamp ping as acknowledgment
                        GM_setValue('gemini_export_ack', Date.now());
                    }

                    log('Checking for copied images to paste...');
                    setTimeout(async () => {
                        const imageData = GM_getValue('gemini_export_image_data', null);

                        // Immediately delete to prevent race conditions with other tabs
                        if (typeof GM_deleteValue !== 'undefined') {
                            GM_deleteValue('gemini_export_image_data');
                        } else {
                            GM_setValue('gemini_export_image_data', null);
                        }

                        let shouldPaste = false;
                        let imageCount = 0;

                        if (imageData && imageData.success && imageData.count > 0) {
                            // Check if the data is recent (e.g., within the last 5 minutes)
                            const dataAge = Date.now() - imageData.timestamp;
                            if (dataAge < 5 * 60 * 1000) {
                                shouldPaste = true;
                                imageCount = imageData.count;
                            } else {
                                log(`Stale image data found (age: ${dataAge}ms). Ignoring to prevent race conditions.`);
                            }
                        }

                        if (shouldPaste) {
                            log(`Images were copied (${imageCount}). Waiting for Docs editor to be ready...`);

                            // Wait for the docs editor to be ready instead of a fixed delay
                            try {
                                // The main editor canvas in Google Docs
                                await window.geminiWaitForElement('.kix-appview-editor', document, 10000);
                                log('Docs editor is ready. Dispatching EmulateDocsPaste event.');
                                // Add a small extra delay to ensure event listeners are attached
                                await window.geminiSleep(500);
                            } catch {
                                log('Timeout waiting for docs editor, but dispatching EmulateDocsPaste anyway as fallback.');
                            }

                            log('Dispatching EmulateDocsPaste event and waiting for completion...');

                            const pasteCompletionPromise = new Promise((resolve) => {
                                // Fail-safe timeout (e.g., 30 seconds) in case the paste script hangs or fails silently
                                const timeoutId = setTimeout(() => {
                                    log('Timeout waiting for EmulateDocsPasteSuccess. Proceeding to close tab anyway.');
                                    document.removeEventListener('EmulateDocsPasteSuccess', handler);
                                    resolve();
                                }, 30000);

                                const handler = () => {
                                    log('Received EmulateDocsPasteSuccess event. Paste completed successfully.');
                                    clearTimeout(timeoutId);
                                    document.removeEventListener('EmulateDocsPasteSuccess', handler);
                                    // Add a small buffer after the success event before closing, just to be safe
                                    setTimeout(resolve, 1000);
                                };

                                document.addEventListener('EmulateDocsPasteSuccess', handler);
                            });

                            window.geminiCheckTargetUserscript('Auto Paste in New Tab').then((installed) => { showTargetScriptStatus('Auto Paste in New Tab', installed); document.dispatchEvent(new CustomEvent('EmulateDocsPaste')); });

                            // Wait for the completion event (or timeout) instead of a fixed 5 seconds
                            await pasteCompletionPromise;

                            log('Dispatching gemini-docs-closer-force-close to close tab.');
                            window.geminiCheckTargetUserscript('Gemini Exported Docs Auto-Closer').then((installed) => { showTargetScriptStatus('Gemini Exported Docs Auto-Closer', installed); document.dispatchEvent(new CustomEvent('gemini-docs-closer-force-close')); });
                        } else {
                            log('No valid images copied or data was stale. Proceeding as normal without pasting.');
                            // Close the tab anyway
                            await window.geminiSleep(2000);
                            log('Dispatching gemini-docs-closer-force-close to close tab.');
                            window.geminiCheckTargetUserscript('Gemini Exported Docs Auto-Closer').then((installed) => { showTargetScriptStatus('Gemini Exported Docs Auto-Closer', installed); document.dispatchEvent(new CustomEvent('gemini-docs-closer-force-close')); });
                        }
                    }, 500); // Start checking earlier, as we now wait for the element
                }
                return; // Don't run the rest of the worker logic in Google Docs
            }

            // --- Utility Functions ---

            function robustClick(el) {
                if (!el) return;
                try {
                    el.focus();
                    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    el.click();
                } catch (e) {
                    log(`Robust click failed: ${e.message}`);
                    el.click();
                }
            }

            function isVisible(el) {
                if (!el || !el.isConnected) return false;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
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
                    await window.geminiSleep(200);

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

                log(`Warning: Failed to strongly detect export start. Returning timeout failure instead of assuming success.`);
                return { status: 'failed', reason: 'start-detection-timeout' };
            }

            function clearStuckOverlays(aggressive) {
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

                const cdkContainer = document.querySelector('.cdk-overlay-container');
                if (cdkContainer && cdkContainer.children.length === 0) {
                    cdkContainer.style.pointerEvents = 'none';
                }

                if (clearedCount > 0) {
                    log(`Cleared ${clearedCount} overlay elements (aggressive=${aggressive}).`);
                }
            }


            // --- UI Indicator ---

            const VERSION = GM_info.script.version;
            let hideTimeoutId = null;

            function getOrCreateIndicator() {
                let indicator = document.getElementById('gemini-worker-export-indicator');
                if (!indicator) {
                    const template = document.getElementById('tpl-worker-indicator');
                    if (template) {
                        const clone = template.content.cloneNode(true);
                        indicator = clone.querySelector('#gemini-worker-export-indicator');
                        indicator.className += ' gus-panel';
                        document.body.appendChild(clone);
                    } else {
                        console.error('[Gemini Artifact Exporter Worker] Fatal Error: tpl-worker-indicator not found. Worker indicator cannot be displayed.');
                        return null;
                    }

                    // Position is managed entirely by geminiSetupDraggablePanel

                    const handle = indicator.querySelector('.worker-indicator-handle');
                    if (handle) {
                        const versionDiv = handle.querySelector('.worker-indicator-version');
                        if (versionDiv) versionDiv.textContent = `⚙️ ${GM_info.script.version} ${gusEmoji}`;
                        handle.title = GM_info.script.name;

                        // Make draggable
                        window.geminiSetupDraggablePanel(indicator, handle, 'gemini-worker-export-indicator-pos', { right: '20px', bottom: '20px' });
                    }
                }
                return indicator;
            }

            function showIndicator(message, isSuccess = false, isError = false) {
                getOrCreateIndicator(); // Ensure UI exists
                const statusContainer = document.getElementById('gemini-worker-export-status');
                if (!statusContainer) return;

                if (hideTimeoutId) {
                    clearTimeout(hideTimeoutId);
                    hideTimeoutId = null;
                }

                statusContainer.textContent = ''; // clear

                const icon = document.createElement('span');
                icon.className = 'worker-status-icon';
                if (isSuccess) {
                    icon.textContent = '✅';
                } else if (isError) {
                    icon.textContent = '❌';
                } else {
                    icon.textContent = '⏳';
                }

                const text = document.createElement('span');
                text.className = 'worker-status-text';
                text.textContent = message;

                statusContainer.appendChild(icon);
                statusContainer.appendChild(text);

                statusContainer.style.display = 'flex';
            }

            function hideIndicator(delay = 3000) {
                if (hideTimeoutId) {
                    clearTimeout(hideTimeoutId);
                }
                hideTimeoutId = setTimeout(() => {
                    const statusContainer = document.getElementById('gemini-worker-export-status');
                    if (statusContainer) {
                        statusContainer.style.display = 'none';
                        statusContainer.textContent = '';
                    }
                }, delay);
            }

            // --- Core Export Logic ---

            async function findChipByTitle(title) {
                log(`Querying for chip with title: "${title}" by scanning sidebar and chat...`);

                // --- 1. Try Sidebar ---
                const scrollContainer = document.querySelector('div.scrollable-container');
                if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                    await window.geminiSleep(300);

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
                        await window.geminiSleep(400);
                    }
                }

                // --- 2. Try Chat Stream ---
                log(`Chip not found in sidebar. Searching chat history for: "${title}"...`);
                const chatScroller = document.querySelector('infinite-scroller') || window;

                let lastChatScrollTop = -1;
                const getChatScroll = () => (chatScroller === window ? window.scrollY : chatScroller.scrollTop);

                if (chatScroller === window) window.scrollTo({ top: 0 });
                else chatScroller.scrollTop = 0;
                await window.geminiSleep(300);

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
                    await window.geminiSleep(500);
                }

                log(` -> Failure: No chip with title "${title}" found anywhere.`);
                return null;
            }

            async function processArtifact(requestData) {
                const { targetTitle, targetElement, exportWaitSeconds = 10, canvasInitDelay = 3.0, reopenDelay = 1.5 } = requestData;

                let chip = null;

                if (targetElement && targetElement.isConnected) {
                    log(`Using provided targetElement directly for "${targetTitle}".`);
                    chip = targetElement;
                    // Scroll it into view just in case
                    chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await window.geminiSleep(500);
                } else {
                    log(`targetElement is null or disconnected. Falling back to findChipByTitle for "${targetTitle}".`);
                    chip = await findChipByTitle(targetTitle);
                }


                if (!chip) {
                    log(`Chip "${targetTitle}" not found. Re-opening files panel...`);
                    clearStuckOverlays(true);
                    await window.geminiSleep(300);

                    const actionMenuBtn = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON);
                    if (actionMenuBtn) {
                        robustClick(actionMenuBtn);
                        try {
                            const menu = await window.geminiWaitForElement(SELECTORS.MENU_PANEL, document, 5000);
                            let filesMenuItem = menu.querySelector(SELECTORS.FILES_MENU_ITEM);
                            if (!filesMenuItem) {
                                const items = Array.from(menu.querySelectorAll('.mat-mdc-menu-item, button[role="menuitem"]'));
                                filesMenuItem = items.find(item => {
                                    const text = item.textContent.toLowerCase();
                                    return text.includes('files in this chat') || text.includes('このチャット内のファイル');
                                });
                            }

                            if (filesMenuItem) {
                                robustClick(filesMenuItem);
                                await window.geminiSleep(reopenDelay * 1000 + 1000);
                                chip = await findChipByTitle(targetTitle);
                            }
                        } catch (err) {
                            log(`Warning: Failed to reopen files panel: ${err.message}`);
                        }
                    }
                }

                if (!chip) {
                    return { status: 'failed', reason: 'chip-not-found', title: targetTitle };
                }

                log(`--- Start processing artifact: "${targetTitle}" ---`);
                chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await window.geminiSleep(500);

                if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled', title: targetTitle };

                log(`Clicking chip "${targetTitle}"...`);
                chip.click();

                log('Waiting for canvas to load...');
                await window.geminiSleep(canvasInitDelay * 1000);

                if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled', title: targetTitle };

                try {
                    log('Attempting to click Share button...');
                    const shareBtn = await window.geminiWaitForElement(SELECTORS.SHARE_BUTTON, document, 5000);
                    await window.geminiSleep(500);
                    shareBtn.click();
                    log('Share button clicked.');

                    log('Waiting for Export to Docs button in menu...');
                    let exportBtn = null;
                    let exportRetries = 0;

                    while (!exportBtn && exportRetries < 20) {
                        const candidates = Array.from(document.querySelectorAll(SELECTORS.EXPORT_BUTTON));
                        const allMenuButtons = Array.from(document.querySelectorAll('.mat-mdc-menu-item, button[role="menuitem"]'));
                        exportBtn = candidates.find(b => isVisible(b)) ||
                            allMenuButtons.find(b => {
                                const text = b.textContent.toLowerCase();
                                return (text.includes('export to docs') || text.includes('ドキュメントにエクスポート')) && isVisible(b);
                            });

                        if (exportBtn) break;
                        await window.geminiSleep(250);
                        exportRetries++;
                    }

                    if (!exportBtn) {
                        throw new Error("Export to Docs button not found in menu.");
                    }

                    if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled', title: targetTitle };

                    const exportMenu = exportBtn.closest(SELECTORS.MENU_PANEL) || document.querySelector(SELECTORS.MENU_PANEL);
                    const startPromise = waitForExportStart(exportBtn, exportMenu);

                    await window.geminiSleep(500);
                    exportBtn.click();
                    log('Export to Docs button clicked. Waiting for start signal...');

                    const startResult = await startPromise;
                    log(`Export start signal detected (${startResult.reason}).`);

                    if (startResult.status !== 'started') {
                        throw new Error(`Export did not reliably start (reason: ${startResult.reason}).`);
                    }

                    clearStuckOverlays(true);

                    log(`Waiting ${exportWaitSeconds}s for Google Docs export to settle...`);

                    // Check for cancellation during the long wait
                    const waitEnd = Date.now() + (exportWaitSeconds * 1000);
                    while (Date.now() < waitEnd) {
                         if (cancelExportRequested) break;
                         await window.geminiSleep(500);
                    }

                    dismissSnackbars();
                    clearStuckOverlays(true);

                    const closeBtn = document.querySelector(SELECTORS.CANVAS_CLOSE_BUTTON);
                    if (closeBtn) {
                        log(`[Verify] Canvas close button found. Clicking to close canvas...`);
                        robustClick(closeBtn);
                        await window.geminiSleep(1000);

                        const sidebarToggle = document.querySelector(SELECTORS.FILES_MENU_ITEM) || document.querySelector('button[mattooltip="Files in this chat"], button[aria-label="Files in this chat"]');
                        if (sidebarToggle) {
                            robustClick(sidebarToggle);
                            await window.geminiSleep(500);
                        }

                        clearStuckOverlays(false);
                    } else {
                        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
                    }

                    if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled-during-wait', title: targetTitle };

                    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    log(`--- Finished processing UI actions for: "${targetTitle}" (ExportID: ${exportId}). Awaiting acknowledgment from Google Docs tab... ---`);

                    // Wait up to 15 seconds for Google Docs to open and set the GM_setValue acknowledgment
                    const ackTimeoutMs = 15000;
                    const ackStart = Date.now();
                    let ackReceived = false;

                    while (Date.now() - ackStart < ackTimeoutMs) {
                        if (cancelExportRequested) {
                            return { status: 'cancelled', reason: 'user-cancelled-during-ack', title: targetTitle };
                        }

                        if (typeof GM_getValue !== 'undefined') {
                            const ack = GM_getValue('gemini_export_ack', null);
                            if (ack && Date.now() - ack < 60000) {
                                ackReceived = true;
                                // Clear the acknowledgment so it doesn't trigger for the next item
                                if (typeof GM_deleteValue !== 'undefined') {
                                    GM_deleteValue('gemini_export_ack');
                                } else {
                                    GM_setValue('gemini_export_ack', null);
                                }
                                break;
                            }
                        }
                        await window.geminiSleep(500);
                    }

                    if (!ackReceived) {
                        log(`Warning: Did not receive cross-origin acknowledgment for "${targetTitle}" within timeout.`);
                        return { status: 'failed', reason: 'Google Docs tab did not open or acknowledge in time', title: targetTitle };
                    }

                    log(`Success: Received acknowledgment from Google Docs tab for "${targetTitle}".`);
                    return { status: 'success', reason: startResult.reason, title: targetTitle, exportId: exportId };

                } catch (e) {
                    log(`CRITICAL ERROR during processing "${targetTitle}": ${e.message}`);
                    clearStuckOverlays(true);
                    return { status: 'failed', reason: e.message, title: targetTitle };
                }
            }


            // --- Event Listeners ---

            document.addEventListener('gemini-artifact-exporter-worker:request', async (e) => {
                if (!e.detail || !e.detail.targetTitle) {
                    log('Received request with missing targetTitle. Ignoring.');
                    return;
                }

                if (isExporting) {
                    log('Warning: Received new request while already exporting. Ignoring.');
                    // Send failure response
                     document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:result', {
                        detail: {
                            requestId: e.detail.requestId,
                            status: 'failed',
                            title: e.detail.targetTitle,
                            reason: 'Worker is busy'
                        }
                    }));
                    return;
                }

                isExporting = true;
                cancelExportRequested = false;

                // Reset acknowledgment value
                if (typeof GM_deleteValue !== 'undefined') {
                    GM_deleteValue('gemini_export_ack');
                } else {
                    if (typeof GM_setValue !== 'undefined') {
                        GM_setValue('gemini_export_ack', null);
                    }
                }
                const req = e.detail;

                log(`Received export request for "${req.targetTitle}" (ID: ${req.requestId})`);

                // Trigger image copy only on the first item of a batch
                if (req.currentIndex === 1) {
                    showIndicator('⏳ 画像をコピー中...');
                    const imageCopyResultPromise = new Promise((resolve) => {
                        const timeoutId = setTimeout(() => resolve({ success: false, count: 0, reason: 'timeout' }), 10000);
                        const handler = (event) => {
                            clearTimeout(timeoutId);
                            document.removeEventListener('gemini-turn-counter-copy-images-result', handler);
                            resolve(event.detail || { success: false, count: 0 });
                        };
                        document.addEventListener('gemini-turn-counter-copy-images-result', handler);
                    });

                    log('Dispatching gemini-turn-counter-copy-images event...');
                    window.geminiCheckTargetUserscript('Gemini Turn Counter').then((installed) => { showTargetScriptStatus('Gemini Turn Counter', installed); document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images', { detail: { target: 'all' } })); });

                    const copyResult = await imageCopyResultPromise;

                    // Store the result using GM_setValue so it can be accessed on docs.google.com
                    if (typeof GM_setValue !== 'undefined') {
                        GM_setValue('gemini_export_image_data', {
                            success: copyResult.success || false,
                            count: copyResult.count || 0,
                            timestamp: Date.now()
                        });
                    }

                    if (copyResult.success) {
                        showIndicator(`✅ ${copyResult.count || 0} 枚の画像をコピーしました`, true, false);
                    } else if (copyResult.reason === 'timeout') {
                        showIndicator('⚠️ 画像コピーがタイムアウトしました。エクスポートを中断します。', false, true);
                        log('Image copy timed out. Aborting export process to prevent incomplete document.');

                        isExporting = false;
                        hideIndicator(5000);

                        document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:result', {
                            detail: {
                                requestId: req.requestId,
                                status: 'failed',
                                title: req.targetTitle,
                                reason: 'image-copy-timeout'
                            }
                        }));
                        return; // Early exit
                    } else {
                        showIndicator('📭 コピーする画像がありませんでした', false, false);
                    }
                    await window.geminiSleep(2000); // Wait a bit so the user can read the result before exporting starts
                }

                const progressText = (req.currentIndex !== undefined && req.totalItems !== undefined)
                    ? `(${req.currentIndex}/${req.totalItems})`
                    : '';

                showIndicator(`エクスポート中: ${req.targetTitle} ${progressText}`);

                const result = await processArtifact(req);

                if (result.status === 'success') {
                    showIndicator(`完了: ${result.title}`, true, false);
                    hideIndicator(2000);
                } else if (result.status === 'cancelled') {
                     showIndicator(`キャンセルされました: ${result.title}`, false, true);
                     hideIndicator(3000);
                } else {
                     showIndicator(`失敗: ${result.title} (${result.reason})`, false, true);
                     hideIndicator(5000);
                }

                isExporting = false;

                log(`Dispatching result for "${result.title}" (status: ${result.status})`);
                document.dispatchEvent(new CustomEvent('gemini-artifact-exporter-worker:result', {
                    detail: {
                        requestId: req.requestId,
                        status: result.status,
                        title: result.title,
                        reason: result.reason,
                        exportId: result.exportId
                    }
                }));
            });

            document.addEventListener('gemini-artifact-exporter-worker:cancel', () => {
                if (isExporting) {
                    log('Cancel requested by main UI.');
                    cancelExportRequested = true;
                    showIndicator('キャンセル処理中...', false, false);
                }
            });

            // Initialize UI so the version badge is always visible when inactive
            // Only run on pages where we injected the template HTML (chat pages / docs)
            const _isGeminiChatPage = location.hostname === 'gemini.google.com' && /^\/(app|gem)\//.test(location.pathname);
            const _isDocsPage = location.hostname.includes('docs.google.com');
            if (_isGeminiChatPage || _isDocsPage) {
                getOrCreateIndicator();
            }

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
