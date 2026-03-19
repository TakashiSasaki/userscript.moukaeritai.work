// ==UserScript==
// @name         Gemini Artifact Exporter Worker
// @namespace    userscript.moukaeritai.work
// @version      0.1.3
// @description  A worker script that handles the actual export process of Gemini "Article" artifacts to Google Docs. It receives custom events from the main exporter UI and performs DOM manipulation and background tasks.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        https://docs.google.com/document/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter-worker/gemini-artifact-exporter-worker.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-artifact-exporter-worker/gemini-artifact-exporter-worker.user.js
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
            log('Opened from Gemini. Checking for copied images to paste...');
            setTimeout(async () => {
                const isImageCopied = GM_getValue('gemini_export_image_copy_success', false);
                const imageCount = GM_getValue('gemini_export_image_copy_count', 0);

                if (isImageCopied && imageCount > 0) {
                    log(`Images were copied (${imageCount}). Dispatching EmulateDocsPaste event.`);

                    // Reset the flags so it doesn't run on normal docs opened later
                    GM_setValue('gemini_export_image_copy_success', false);
                    GM_setValue('gemini_export_image_copy_count', 0);

                    document.dispatchEvent(new CustomEvent('EmulateDocsPaste'));

                    // Wait 5 seconds after paste to close the tab
                    await sleep(5000);
                    log('Dispatching gemini-docs-closer-force-close to close tab.');
                    document.dispatchEvent(new CustomEvent('gemini-docs-closer-force-close'));
                } else {
                    log('No images copied. Proceeding as normal without pasting.');
                    // Close the tab anyway
                    await sleep(2000);
                    log('Dispatching gemini-docs-closer-force-close to close tab.');
                    document.dispatchEvent(new CustomEvent('gemini-docs-closer-force-close'));
                }
            }, 1000); // Wait 1 second after execution starts
        }
        return; // Don't run the rest of the worker logic in Google Docs
    }

    // --- Utility Functions ---

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
        return new Promise(resolve => {
            const start = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - start >= ms) {
                    clearInterval(interval);
                    resolve();
                }
            }, Math.min(ms, 50));
        });
    }

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

    function getOrCreateIndicator() {
        let indicator = document.getElementById('gemini-worker-export-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'gemini-worker-export-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 10000;
                background-color: rgba(28, 28, 30, 0.9);
                color: rgba(255, 255, 255, 0.9);
                padding: 12px 20px;
                border-radius: 8px;
                font-family: 'Google Sans', sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                display: none;
                align-items: center;
                gap: 8px;
                transition: opacity 0.3s ease;
                opacity: 0;
            `;
            document.body.appendChild(indicator);
        }
        return indicator;
    }

    function showIndicator(message, isSuccess = false, isError = false) {
        const indicator = getOrCreateIndicator();
        indicator.textContent = ''; // clear

        const icon = document.createElement('span');
        icon.style.fontSize = '18px';
        if (isSuccess) {
            icon.textContent = '✅';
        } else if (isError) {
            icon.textContent = '❌';
        } else {
            icon.textContent = '⏳';
        }

        const text = document.createElement('span');
        text.textContent = message;

        indicator.appendChild(icon);
        indicator.appendChild(text);

        indicator.style.display = 'flex';
        // Allow rendering before changing opacity
        setTimeout(() => {
            indicator.style.opacity = '1';
        }, 10);
    }

    function hideIndicator(delay = 3000) {
        const indicator = document.getElementById('gemini-worker-export-indicator');
        if (indicator) {
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 300);
            }, delay);
        }
    }

    // --- Core Export Logic ---

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

    async function processArtifact(requestData) {
        const { targetTitle, targetElement, exportWaitSeconds = 10, canvasInitDelay = 3.0, reopenDelay = 1.5 } = requestData;

        let chip = null;

        if (targetElement && targetElement.isConnected) {
            log(`Using provided targetElement directly for "${targetTitle}".`);
            chip = targetElement;
            // Scroll it into view just in case
            chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);
        } else {
            log(`targetElement is null or disconnected. Falling back to findChipByTitle for "${targetTitle}".`);
            chip = await findChipByTitle(targetTitle);
        }


        if (!chip) {
            log(`Chip "${targetTitle}" not found. Re-opening files panel...`);
            clearStuckOverlays(true);
            await sleep(300);

            const actionMenuBtn = document.querySelector(SELECTORS.ACTIONS_MENU_BUTTON);
            if (actionMenuBtn) {
                robustClick(actionMenuBtn);
                try {
                    const menu = await waitForElement(SELECTORS.MENU_PANEL, document, 5000);
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
                        await sleep(reopenDelay * 1000 + 1000);
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
        await sleep(500);

        if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled', title: targetTitle };

        log(`Clicking chip "${targetTitle}"...`);
        chip.click();

        log('Waiting for canvas to load...');
        await sleep(canvasInitDelay * 1000);

        if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled', title: targetTitle };

        try {
            log('Attempting to click Share button...');
            const shareBtn = await waitForElement(SELECTORS.SHARE_BUTTON, document, 5000);
            await sleep(500);
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
                await sleep(250);
                exportRetries++;
            }

            if (!exportBtn) {
                throw new Error("Export to Docs button not found in menu.");
            }

            if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled', title: targetTitle };

            const exportMenu = exportBtn.closest(SELECTORS.MENU_PANEL) || document.querySelector(SELECTORS.MENU_PANEL);
            const startPromise = waitForExportStart(exportBtn, exportMenu);

            await sleep(500);
            exportBtn.click();
            log('Export to Docs button clicked. Waiting for start signal...');

            const startResult = await startPromise;
            log(`Export start signal detected (${startResult.reason}).`);

            clearStuckOverlays(true);

            log(`Waiting ${exportWaitSeconds}s for Google Docs export to settle...`);

            // Check for cancellation during the long wait
            const waitEnd = Date.now() + (exportWaitSeconds * 1000);
            while (Date.now() < waitEnd) {
                 if (cancelExportRequested) break;
                 await sleep(500);
            }

            dismissSnackbars();
            clearStuckOverlays(true);

            const closeBtn = document.querySelector(SELECTORS.CANVAS_CLOSE_BUTTON);
            if (closeBtn) {
                log(`[Verify] Canvas close button found. Clicking to close canvas...`);
                robustClick(closeBtn);
                await sleep(1000);

                const sidebarToggle = document.querySelector(SELECTORS.FILES_MENU_ITEM) || document.querySelector('button[mattooltip="Files in this chat"], button[aria-label="Files in this chat"]');
                if (sidebarToggle) {
                    robustClick(sidebarToggle);
                    await sleep(500);
                }

                clearStuckOverlays(false);
            } else {
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
            }

            if (cancelExportRequested) return { status: 'cancelled', reason: 'user-cancelled-during-wait', title: targetTitle };

            log(`--- Finished processing: "${targetTitle}" ---`);
            return { status: 'success', reason: startResult.reason, title: targetTitle };

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
            document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images', { detail: { target: 'all' } }));

            const copyResult = await imageCopyResultPromise;

            // Store the result using GM_setValue so it can be accessed on docs.google.com
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue('gemini_export_image_copy_success', copyResult.success || false);
                GM_setValue('gemini_export_image_copy_count', copyResult.count || 0);
            }

            if (copyResult.success) {
                showIndicator(`✅ ${copyResult.count || 0} 枚の画像をコピーしました`, true, false);
            } else if (copyResult.reason === 'timeout') {
                showIndicator('⚠️ 画像コピーがタイムアウトしました', false, true);
            } else {
                showIndicator('📭 コピーする画像がありませんでした', false, false);
            }
            await sleep(2000); // Wait a bit so the user can read the result before exporting starts
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
                reason: result.reason
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

})();
