// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    https://userscript.moukaeritai.work/
// @version      0.4.90
// @description  Adds a 1-click button to export Gemini responses and canvases to Google Docs.
// @lastModified 2026-04-17
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     geminiExportToDocsCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.css
// @resource     geminiExportToDocsHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
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

    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiExportToDocs');

        // --- Selectors (based on provided samples) ---
        const SELECTORS = {
            // Turn selectors
            turnContainer: 'model-response, response-container, .response-container', // Broad container to watch
            aiTurnContainer: 'model-response', // Specifically AI response tags
            presentedContainer: '.presented-response-container, message-content, .message-content', // Most stable selector for the model's response wrapper
            moreMenuButton: 'button[data-test-id="more-menu-button"]', // The trigger "..."
            exportToDocsButton: 'button[data-test-id="export-to-docs-button"]', // The target in the menu
            exportIntermediateButton: 'button[data-test-id="export-button"]' // Mobile "Export to..." button
        };

        /**
         * Trigger a native click event
         */
        function simulateClick(element) {
            if (!element) return;
            element.dispatchEvent(new MouseEvent('click', {
                view: null,
                bubbles: true,
                cancelable: true
            }));
        }

        /**
         * Styles for our custom button
         */
        function addStyles() {
            // Inject shared common styles
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const commonStyle = document.createElement('style');
                commonStyle.textContent = commonCSS;
                commonStyle.id = 'gemini-common-styles';
                document.head.appendChild(commonStyle);
            }

            const existingStyle = document.getElementById('gemini-export-to-docs-styles');
            if (existingStyle) return existingStyle;

            const css = GM_getResourceText('geminiExportToDocsCSS');
            const style = GM_addStyle(css);
            if (style) {
                style.id = 'gemini-export-to-docs-styles';
                return style;
            }
            return document.getElementById('gemini-export-to-docs-styles');
        }

        let templatesContainer = null;
        function getTemplate(id) {
            if (!templatesContainer) {
                templatesContainer = document.createElement('div');
                const templateHtml = GM_getResourceText('geminiExportToDocsHTML').replace(/{{scriptVersion}}/g, `${GM_info.script.version} ${gusEmoji}`);
                window.geminiSetInnerHTML(templatesContainer, templateHtml, policy);
            }
            const tpl = templatesContainer.querySelector(`#${id}`);
            if (!tpl) return null;
            return tpl.content.cloneNode(true);
        }

        function getIcon(type) {
            const id = type === 'check' ? 'tpl-check-icon' : 'tpl-docs-icon';
            const tpl = getTemplate(id);
            return tpl ? tpl.firstElementChild : null;
        }

        /**
         * Helper: Sets the content of the execute button (icon + text)
         */
        function setExecBtnContent(btn, text) {
            if (!btn) return;
            btn.textContent = ''; // Clear existing
            const iconSpan = document.createElement('span');
            iconSpan.className = 'export-btn-icon';
            const icon = getIcon('docs');
            if (icon) iconSpan.appendChild(icon);
            btn.appendChild(iconSpan);
            btn.appendChild(document.createTextNode(text));
        }

        /**
         * Manage Overlay
         */
        function showOverlay() {
            let overlay = document.getElementById('gemini-export-overlay');
            if (!overlay) {
                const tpl = getTemplate('tpl-export-overlay');
                if (tpl) {
                    document.body.appendChild(tpl);
                    overlay = document.getElementById('gemini-export-overlay');
                }
            }
            if (overlay) overlay.classList.add('visible');
        }

        function hideOverlay() {
            const overlay = document.getElementById('gemini-export-overlay');
            if (overlay) overlay.classList.remove('visible');
        }

        /**
         * Create the export button
         */
        /**
         * Helper: Mark a button as exported/success
         */
        function markAsExported(btn) {
            if (btn.classList.contains('exported')) return;

            btn.classList.add('exported');
            btn.title = 'Exported!';

            // Update Icon
            const iconContainer = btn.querySelector('span');
            if (iconContainer) {
                while (iconContainer.firstChild) {
                    iconContainer.removeChild(iconContainer.firstChild);
                }
                const checkIcon = getIcon('check');
                if (checkIcon) iconContainer.appendChild(checkIcon);
            }
        }

        /**
         * Create the export button
         */
        function createExportButton(onClick, positionClass = null) {
            const tpl = getTemplate('tpl-export-button');
            const btn = tpl ? tpl.firstElementChild : document.createElement('button');
            if (positionClass) btn.classList.add(positionClass);

            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (btn.classList.contains('exported')) return; // Already done

                await executeManualTurnExport(btn, {
                    runExport: onClick,
                    errorPrefix: 'Export failed:',
                    alertMessage: 'Export failed. See console for details.'
                });
            };
            return btn;
        }

        /**
         * Flow: Export a specific turn
         * 1. Click "More" (three dots)
         * 2. Wait for menu
         * 3. Click "Export to Docs" (or "Export to..." -> "Export to Docs" on mobile)
         */
        /**
         * Helper: Find the "Export to Docs" button in the document
         * Searches by ID, class, and text content.
         */
        function findExportButton(context = document) {
            // 1. Try explicit ID (Desktop)
            let btn = context.querySelector(SELECTORS.exportToDocsButton);
            if (btn && btn.offsetParent) return btn; // Check visibility

            // 2. Try Mobile "Export to..." button (Intermediate)
            // This is handled in the main flow, but we can check if we are in the submenu

            // 3. Search for Buttons with specific text or icon
            const candidates = Array.from(context.querySelectorAll('button[role="menuitem"], .mat-mdc-menu-item'));
            return candidates.find(b => {
                const text = b.textContent.toLowerCase();
                return text.includes('export to docs') && b.offsetParent !== null;
            });
        }

        /**
         * Helper: Wait for Export button with retries
         */
        async function waitForExportButton(timeout = 2000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const btn = findExportButton(document.body);
                if (btn) return btn;
                await window.geminiSleep(100);
            }
            // Last ditch: sometimes it's in a different container or slow to animate
            return findExportButton(document.body);
        }

        /**
         * Flow: Export a specific turn
         * 1. Click "More" (three dots)
         * 2. Wait for ANY menu to appear
         * 3. Look for "Export to Docs" globally
         * 4. If mobile, handle intermediate "Export to..." click
         */
        async function handleTurnExport(triggerBtn) {
            console.log('Starting Turn Export...');

            // 1. Click trigger
            simulateClick(triggerBtn);

            // 2. Wait slightly for menu animation start
            await window.geminiSleep(200);

            // 3. Try to find the button directly (Desktop case)
            let exportBtn = await waitForExportButton(1000);

            if (!exportBtn) {
                // Check for Mobile "Export to..." intermediate button
                // We search globally for this intermediate button too
                const intermediateSelector = SELECTORS.exportIntermediateButton;
                let intermediateBtn = null;

                // Wait briefly for intermediate
                const start = Date.now();
                while (Date.now() - start < 1000) {
                    const el = document.querySelector(intermediateSelector);
                    if (el && el.offsetParent) {
                        intermediateBtn = el;
                        break;
                    }
                    const allBtns = Array.from(document.querySelectorAll('button'));
                    const textMatch = allBtns.find(b => b.textContent.trim() === 'Export to...' && b.offsetParent);
                    if (textMatch) {
                        intermediateBtn = textMatch;
                        break;
                    }
                    await window.geminiSleep(100);
                }

                if (intermediateBtn) {
                    console.log('Mobile layout detected: clicking intermediate export button');
                    simulateClick(intermediateBtn);
                    await window.geminiSleep(500); // Wait for submenu

                    // Re-try finding the final button
                    exportBtn = await waitForExportButton(2000);
                }
            }

            if (!exportBtn) {
                // One last broad search for any Docs icon
                const allIcons = Array.from(document.querySelectorAll('mat-icon[fonticon="docs"], mat-icon[data-mat-icon-name="docs"]'));
                const icon = allIcons.find(i => i.offsetParent); // Visible icon
                if (icon) {
                    exportBtn = icon.closest('button');
                }
            }

            if (!exportBtn) {
                console.error('Export button not found. Dumping menu state:', document.querySelectorAll('.mat-mdc-menu-panel').length);
                throw new Error('Export button not found in menu');
            }

            simulateClick(exportBtn);
            console.log('Turn Export Clicked');

            // Close menu if it persists (auto-closes usually)
            await window.geminiSleep(100);
            const closeBackdrop = document.querySelector('.cdk-overlay-backdrop');
            if (closeBackdrop) simulateClick(closeBackdrop);
        }

        async function executeManualTurnExport(triggerBtn, options = {}) {
            if (!triggerBtn) return;

            const {
                runExport = () => handleTurnExport(triggerBtn),
                errorPrefix = 'Export failed:',
                alertMessage = 'Export failed. See console for details.'
            } = options;

            showOverlay();
            try {
                await runExport();

                const container = triggerBtn.closest(SELECTORS.turnContainer);
                if (container) {
                    const allBtns = container.querySelectorAll('.gemini-quick-export-btn');
                    allBtns.forEach(btn => markAsExported(btn));
                } else {
                    markAsExported(triggerBtn);
                }
            } catch (err) {
                console.error(errorPrefix, err);
                alert(alertMessage);
            } finally {
                hideOverlay();
            }
        }

        /**
         * Main logic to inject buttons
         */
        function processNodes() {
            // A. Handle Turn Buttons
            // Find all "More" buttons to know what to click
            const moreButtons = document.querySelectorAll(SELECTORS.moreMenuButton);
            moreButtons.forEach(moreBtn => {
                // Find the stable model response container
                const root = moreBtn.closest(SELECTORS.turnContainer);
                if (!root) return;

                const presentedContainer = root.querySelector(SELECTORS.presentedContainer);
                if (presentedContainer) {
                    // Ensure the container is positioned relatively so absolute buttons adhere to it
                    if (getComputedStyle(presentedContainer).position === 'static') {
                        presentedContainer.style.position = 'relative';
                    }

                    // Check if we already injected into this container
                    if (!presentedContainer.querySelector('.gemini-quick-export-btn.top-right')) {
                        const topBtn = createExportButton(() => handleTurnExport(moreBtn), 'top-right');
                        presentedContainer.appendChild(topBtn);
                    }
                    if (!presentedContainer.querySelector('.gemini-quick-export-btn.bottom-right')) {
                        const bottomBtn = createExportButton(() => handleTurnExport(moreBtn), 'bottom-right');
                        presentedContainer.appendChild(bottomBtn);
                    }
                } else {
                    // Fallback to original injection if presentedContainer is not found
                    const container = moreBtn.parentElement;
                    if (container && !container.querySelector('.gemini-quick-export-btn')) {
                        const btn = createExportButton(() => handleTurnExport(moreBtn));
                        container.appendChild(btn);
                    }
                }
            });

            // B. Handle 1-Turn Panel Visibility
            updateOneTurnVisibility();
        }

        const AUTO_URL_TOGGLE_KEY = 'gemini-export-auto-url-toggle';
        const AUTO_DELETE_TOGGLE_KEY = 'gemini-export-auto-delete-toggle';
        const AUTO_COPY_IMAGES_TOGGLE_KEY = 'gemini-export-auto-copy-images-toggle';
        const AUTO_SKIP_NONMATCH_TOGGLE_KEY = 'gemini-export-auto-skip-nonmatch-toggle';

        // Simple debounce function to reduce polling frequency on DOM mutations
        function debounce(func, wait) {
            let timeout;
            return function () {
                const context = this, args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }

        const debouncedProcessNodes = debounce(processNodes, 500);

        let autoExportTriggered = false;
        let autoSkipTriggered = false;
        let autoExportTimerId = null;
        let autoDecisionConversationId = null;
        let autoDecisionDeadlineTimerId = null;
        let autoDecisionPendingConversationId = null;
        const AUTO_SKIP_LOG_PREFIX = '[Gemini 1-Turn Auto][Skip]';
        const AUTO_SKIP_DECISION_DELAY_MS = 2000;

        function logAutoSkip(message, details) {
            if (details !== undefined) {
                console.log(`${AUTO_SKIP_LOG_PREFIX} ${message}`, details);
            } else {
                console.log(`${AUTO_SKIP_LOG_PREFIX} ${message}`);
            }
        }

        function forceOpenPanelForMatchingCondition(panel) {
            if (!panel) return;
            panel.style.display = '';
            if (panel.classList.contains('gus-minimized')) {
                panel.classList.remove('gus-minimized');
            }
            try {
                localStorage.removeItem('ge2d-minimized');
            } catch (e) {
                console.warn('[Gemini 1-Turn] Failed to clear saved minimized state.', e);
            }
        }

        function setOneTurnPanelVisibility(visible) {
            const panel = document.getElementById('gemini-one-turn-panel');
            if (!panel) return;
            panel.style.display = visible ? '' : 'none';
        }

        function clearAutoDecisionDeadlineTimer() {
            if (autoDecisionDeadlineTimerId) {
                clearTimeout(autoDecisionDeadlineTimerId);
                autoDecisionDeadlineTimerId = null;
            }
            autoDecisionPendingConversationId = null;
        }

        function requestNextConversationAfterNonMatch() {
            const currentConversationId = getCurrentConversationId();
            clearAutoDecisionDeadlineTimer();
            logAutoSkip('Requesting next conversation because the current conversation did not match the auto-export condition.', {
                conversationId: currentConversationId,
                autoSkipTriggered,
                autoDecisionConversationId
            });
            autoSkipTriggered = true;
            window.geminiCheckTargetUserscript('Gemini Auto-Select Next', 1000).then((res) => {
                if (!res) {
                    console.warn(`${AUTO_SKIP_LOG_PREFIX} Gemini Auto-Select Next was not detected. Dispatching request-next event anyway.`, {
                        conversationId: currentConversationId
                    });
                } else {
                    logAutoSkip('Gemini Auto-Select Next detected before dispatch.', {
                        conversationId: currentConversationId,
                        detectedVersion: res.version
                    });
                }
                logAutoSkip('Dispatching gemini-auto-select-next:request-next.', {
                    conversationId: currentConversationId
                });
                window.dispatchEvent(new CustomEvent('gemini-auto-select-next:request-next'));
            });
        }

        function getCurrentConversationId() {
            const match = window.location.pathname.match(/\/(?:app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})/i);
            return match ? match[1].toLowerCase() : window.location.pathname;
        }

        function collectCurrentConversationSnapshot() {
            const turns = document.querySelectorAll(SELECTORS.aiTurnContainer);
            const turnCount = turns.length;
            return {
                conversationId: getCurrentConversationId(),
                turnCount,
                isOneTurn: turnCount === 1,
                userQueryEl: document.querySelector('user-query'),
                messageContentEl: document.querySelector('message-content'),
                exportMenuButton: document.querySelector(SELECTORS.moreMenuButton)
            };
        }

        function extractUrls(elOrText) {
            if (!elOrText) return [];
            const text = typeof elOrText === 'string' ? elOrText : (elOrText.textContent || '');
            // Initial broad regex for URL-like strings
            const urlRegex = /(https?:\/\/[^\s"'<>()]+)/gi;
            const rawMatches = text.match(urlRegex) || [];

            const cleanUrl = (url) => {
                if (!url) return '';
                // 1. Multibyte stop: Truncate at the first multibyte character
                // Gemini typically outputs ASCII-only URLs.
                const multibyteIndex = url.search(/[^\x00-\x7F]/);
                if (multibyteIndex !== -1) {
                    url = url.substring(0, multibyteIndex);
                }

                // 2. Trailing punctuation trim: Truncate common symbols that might be appended by mistake or as sentence delimiters
                // We repeatedly trim from the end characters that are highly unlikely to be the TRUE end of a URL
                // in the context of it being inside a Gemini response text block.
                return url.replace(/[\]\),.;!?]+$/, '');
            };

            const matches = rawMatches.map(cleanUrl).filter(url => url.length > 10);

            if (typeof elOrText === 'object' && elOrText.querySelectorAll) {
                const anchors = elOrText.querySelectorAll('a[href]');
                anchors.forEach(a => {
                    if (a.href && a.href.startsWith('http')) {
                        matches.push(cleanUrl(a.href));
                    }
                });
            }
            // Return unique, non-empty URLs
            return [...new Set(matches.filter(Boolean))];
        }

        function extractYoutubeVideoId(url) {
            if (!url || typeof url !== 'string') return null;
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
            return match ? match[1] : null;
        }

        function evaluateAutoUrlCondition(snapshot = collectCurrentConversationSnapshot()) {
            const { conversationId, userQueryEl, messageContentEl, exportMenuButton } = snapshot;
            logAutoSkip('Evaluating auto URL condition.', {
                conversationId,
                hasUserQuery: !!userQueryEl,
                hasMessageContent: !!messageContentEl,
                hasExportMenuButton: !!exportMenuButton,
                autoUrlEnabled: GM_getValue(AUTO_URL_TOGGLE_KEY, false),
                autoSkipEnabled: GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false),
                autoExportTriggered,
                autoSkipTriggered,
                autoDecisionConversationId
            });
            if (!userQueryEl || !messageContentEl) {
                logAutoSkip('Deferring decision because required turn DOM is not ready.', {
                    conversationId
                });
                return { status: 'pending', reason: 'waiting-for-turn-dom' };
            }

            const userUrls = extractUrls(userQueryEl);
            const botUrls = extractUrls(messageContentEl);

            logAutoSkip('Collected URLs for auto decision.', {
                conversationId,
                userUrls,
                botUrls,
                hasExportMenuButton: !!exportMenuButton
            });

            if (userUrls.length !== 1) {
                logAutoSkip('Prompt URL count is not exactly 1, treating conversation as non-match.', {
                    conversationId,
                    userUrls,
                    botUrls
                });
                return {
                    status: 'nonmatch',
                    reason: `prompt-url-count-${userUrls.length}`,
                    userUrls,
                    botUrls,
                    exportMenuButtonExists: !!exportMenuButton
                };
            }

            if (!botUrls.length && !exportMenuButton) {
                logAutoSkip('Deferring decision because response URLs are empty and the export menu is not available yet.', {
                    conversationId,
                    userUrls,
                    botUrls
                });
                return {
                    status: 'pending',
                    reason: 'waiting-for-response-actions',
                    userUrls,
                    botUrls,
                    exportMenuButtonExists: false
                };
            }

            const userYtId = extractYoutubeVideoId(userUrls[0]);
            for (const botUrl of botUrls) {
                if (userUrls[0].toLowerCase() === botUrl.toLowerCase()) {
                    logAutoSkip('Exact URL match found.', {
                        conversationId,
                        matchedUrl: botUrl,
                        hasExportMenuButton: !!exportMenuButton
                    });
                    return {
                        status: exportMenuButton ? 'match' : 'pending',
                        reason: exportMenuButton ? 'exact-url-match' : 'waiting-for-export-button',
                        userUrls,
                        botUrls,
                        exportMenuButtonExists: !!exportMenuButton
                    };
                }
                if (botUrl.toLowerCase().includes(userUrls[0].toLowerCase())) {
                    logAutoSkip('Inclusive URL match found.', {
                        conversationId,
                        sourceUrl: userUrls[0],
                        matchedUrl: botUrl,
                        hasExportMenuButton: !!exportMenuButton
                    });
                    return {
                        status: exportMenuButton ? 'match' : 'pending',
                        reason: exportMenuButton ? 'included-url-match' : 'waiting-for-export-button',
                        userUrls,
                        botUrls,
                        exportMenuButtonExists: !!exportMenuButton
                    };
                }
                if (userYtId) {
                const botYtId = extractYoutubeVideoId(botUrl);
                if (botYtId && userYtId === botYtId) {
                    logAutoSkip('YouTube video id match found.', {
                        conversationId,
                        youtubeVideoId: userYtId,
                        matchedUrl: botUrl,
                        hasExportMenuButton: !!exportMenuButton
                        });
                        return {
                            status: exportMenuButton ? 'match' : 'pending',
                            reason: exportMenuButton ? 'youtube-id-match' : 'waiting-for-export-button',
                            userUrls,
                            botUrls,
                            exportMenuButtonExists: !!exportMenuButton
                        };
                    }
                }
            }

            logAutoSkip('No URL match found in the response.', {
                conversationId,
                userUrls,
                botUrls,
                hasExportMenuButton: !!exportMenuButton
            });
            return {
                status: 'nonmatch',
                reason: 'response-url-mismatch',
                userUrls,
                botUrls,
                exportMenuButtonExists: !!exportMenuButton
            };
        }

        function triggerAutoExportForDecision(currentConversationId, decision) {
            clearAutoDecisionDeadlineTimer();
            autoDecisionConversationId = currentConversationId;
            autoExportTriggered = true;
            logAutoSkip('Match concluded for conversation, starting auto-export flow.', {
                conversationId: currentConversationId,
                reason: decision.reason
            });

            let countdown = 4; // Hardcoded default duration

            const execBtn = document.getElementById('gemini-btn-one-turn-exec');
            if (execBtn) {
                const originalOnClick = execBtn.onclick;

                const cancelAuto = () => {
                    if (autoExportTimerId) clearInterval(autoExportTimerId);
                    autoExportTimerId = null;
                    execBtn.style.backgroundColor = '';
                    execBtn.style.color = '';

                    const deleteCheckbox = document.getElementById('gemini-delete-checkbox');
                    const willDelete = deleteCheckbox ? deleteCheckbox.checked : GM_getValue(AUTO_DELETE_TOGGLE_KEY, true);

                    setExecBtnContent(execBtn, willDelete ? 'Export & Delete' : 'Export');

                    execBtn.onclick = originalOnClick;
                    console.log('[Gemini 1-Turn Auto] Auto-export cancelled by user.');
                };

                execBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelAuto();
                };

                const updateButtonUI = () => {
                    execBtn.style.backgroundColor = '#fbbc04'; // yellow
                    execBtn.style.color = '#333';
                    execBtn.textContent = countdownPaused ? `Auto Paused (${countdown}s)` : `Cancel Auto (${countdown}s)`;
                };

                autoExportTimerId = setInterval(() => {
                    if (countdownPaused) return; // Requirement: Hover pause

                    countdown--;
                    if (countdown <= 0) {
                        if (autoExportTimerId) clearInterval(autoExportTimerId);
                        autoExportTimerId = null;
                        execBtn.onclick = originalOnClick;
                        runExportProcess(true);
                    } else {
                        updateButtonUI();
                    }
                }, 1000);
                updateButtonUI(); // Initial call
            } else {
                autoExportTimerId = setTimeout(() => {
                    autoExportTimerId = null;
                    runExportProcess(true);
                }, countdown * 1000);
            }
        }

        function finalizeAutoDecision(reason) {
            const snapshot = collectCurrentConversationSnapshot();
            const currentConversationId = snapshot.conversationId;
            if (autoDecisionConversationId === currentConversationId) {
                logAutoSkip('Conversation already evaluated before deadline finalization.', {
                    conversationId: currentConversationId,
                    reason
                });
                return;
            }

            if (snapshot.turnCount !== 1) {
                autoDecisionConversationId = currentConversationId;
                logAutoSkip('Conversation does not have exactly one AI turn at the skip deadline.', {
                    conversationId: currentConversationId,
                    triggerReason: reason,
                    turnCount: snapshot.turnCount
                });
                if (!autoSkipTriggered && GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false)) {
                    requestNextConversationAfterNonMatch();
                } else {
                    logAutoSkip('Auto-skip is disabled or already triggered, staying on current conversation.', {
                        conversationId: currentConversationId,
                        autoSkipTriggered,
                        autoSkipEnabled: GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false)
                    });
                }
                return;
            }

            const decision = evaluateAutoUrlCondition(snapshot);
            logAutoSkip('Finalizing auto decision after delay.', {
                conversationId: currentConversationId,
                triggerReason: reason,
                decisionStatus: decision.status,
                reasonDetail: decision.reason
            });

            if (decision.status === 'match') {
                triggerAutoExportForDecision(currentConversationId, decision);
                return;
            }

            autoDecisionConversationId = currentConversationId;
            logAutoSkip('Conversation did not satisfy export conditions before the skip deadline.', {
                conversationId: currentConversationId,
                triggerReason: reason,
                decisionStatus: decision.status,
                reasonDetail: decision.reason
            });
            if (!autoSkipTriggered && GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false)) {
                requestNextConversationAfterNonMatch();
            } else {
                logAutoSkip('Auto-skip is disabled or already triggered, staying on current conversation.', {
                    conversationId: currentConversationId,
                    autoSkipTriggered,
                    autoSkipEnabled: GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false)
                });
            }
        }

        function ensureAutoDecisionDeadline() {
            const currentConversationId = getCurrentConversationId();
            const autoUrlEnabled = GM_getValue(AUTO_URL_TOGGLE_KEY, false);
            const autoSkipEnabled = GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false);

            if (!autoUrlEnabled || !autoSkipEnabled) {
                clearAutoDecisionDeadlineTimer();
                return;
            }
            if (autoDecisionConversationId === currentConversationId || autoExportTriggered || autoSkipTriggered) {
                return;
            }
            if (autoDecisionDeadlineTimerId && autoDecisionPendingConversationId === currentConversationId) {
                return;
            }

            clearAutoDecisionDeadlineTimer();
            autoDecisionPendingConversationId = currentConversationId;
            logAutoSkip('Scheduling delayed auto-skip decision after conversation change.', {
                conversationId: currentConversationId,
                delayMs: AUTO_SKIP_DECISION_DELAY_MS
            });
            autoDecisionDeadlineTimerId = setTimeout(() => {
                const pendingConversationId = autoDecisionPendingConversationId;
                autoDecisionDeadlineTimerId = null;
                autoDecisionPendingConversationId = null;
                if (pendingConversationId !== getCurrentConversationId()) {
                    logAutoSkip('Skipping delayed auto-decision because the conversation changed again.', {
                        pendingConversationId,
                        currentConversationId: getCurrentConversationId()
                    });
                    return;
                }
                finalizeAutoDecision('deadline-expired');
            }, AUTO_SKIP_DECISION_DELAY_MS);
        }

        function handleAutoDecisionForCurrentConversation() {
            // --- Auto URL Export Logic ---
            if (!autoExportTriggered && GM_getValue(AUTO_URL_TOGGLE_KEY, false)) {
                try {
                    const snapshot = collectCurrentConversationSnapshot();
                    const currentConversationId = snapshot.conversationId;
                    const decision = evaluateAutoUrlCondition(snapshot);
                    logAutoSkip('Auto decision evaluated.', {
                        conversationId: currentConversationId,
                        decisionStatus: decision.status,
                        reason: decision.reason,
                        autoDecisionConversationId,
                        autoExportTriggered,
                        autoSkipTriggered
                    });

                    if (decision.status === 'pending') {
                        logAutoSkip('Waiting before auto decision is finalized.', {
                            conversationId: currentConversationId,
                            reason: decision.reason
                        });
                    } else if (autoDecisionConversationId === currentConversationId) {
                        logAutoSkip('Conversation already evaluated, skipping repeated action.', {
                            conversationId: currentConversationId,
                            reason: decision.reason
                        });
                    } else if (decision.status === 'match') {
                        triggerAutoExportForDecision(currentConversationId, decision);
                    } else if (decision.status === 'nonmatch') {
                        logAutoSkip('Non-match detected before the skip deadline, waiting for delayed final decision.', {
                            conversationId: currentConversationId,
                            reason: decision.reason,
                            delayMs: AUTO_SKIP_DECISION_DELAY_MS,
                            autoSkipEnabled: GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false)
                        });
                    }
                } catch (e) {
                    console.error('[Gemini 1-Turn Auto] Error matching URLs:', e);
                }
            }
        }

        function updateOneTurnVisibility() {
            const snapshot = collectCurrentConversationSnapshot();
            // Note: Gemini UI can be slow to update styles/classes.
            // We'll count anything that looks like a model response.
            console.log(`[Gemini 1-Turn] Found ${snapshot.turnCount} active AI turns using ${SELECTORS.aiTurnContainer}`);

            ensureAutoDecisionDeadline();

            // A 1-turn conversation usually has exactly 1 model-response
            const isOneTurn = snapshot.isOneTurn;

            let panel = document.getElementById('gemini-one-turn-panel');
            if (!panel) {
                panel = createOneTurnPanel();
            }

            if (isOneTurn) {
                setOneTurnPanelVisibility(true);
                panel.classList.remove('ge2d-disabled');
                forceOpenPanelForMatchingCondition(panel);
                handleAutoDecisionForCurrentConversation();
            } else if (panel) {
                setOneTurnPanelVisibility(true);
                panel.classList.add('ge2d-disabled');
            }
        }

        function performAutoCopyImagesIfNeeded() {
            const autoCopyEnabled = GM_getValue(AUTO_COPY_IMAGES_TOGGLE_KEY, true);
            if (!autoCopyEnabled) return;

            const turnContainer = document.querySelector(SELECTORS.aiTurnContainer);
            if (turnContainer && turnContainer.querySelectorAll('img').length > 0) {
                console.log('[Gemini 1-Turn Export] Auto-copying images because images were found.');
                document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images', {
                    detail: { target: 'all' }
                }));
            }
        }

        async function performDeleteCountdown(execBtn, isAutoRun, delay = 5) {
            for (let i = delay; i > 0; i--) {
                if (execBtn) {
                    execBtn.textContent = isAutoRun ? `Auto Delete in ${i}s...` : `Deleting in ${i}s...`;
                    execBtn.style.backgroundColor = '#e53935'; // Red deleting warning
                    execBtn.style.color = 'white';
                }
                await window.geminiSleep(1000);
            }
            if (execBtn) execBtn.textContent = 'Deleting...';
        }

        function requestConversationDeletion() {
            console.log('[Gemini 1-Turn Export] Requesting conversation deletion.');
            window.geminiCheckTargetUserscript('Gemini 1-Click Delete Conversation').then(() => {
                window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));
            });
        }

        /**
         * Reusable async extraction of the full execution flow (Clicking, Countdown, Deleting)
         */
        async function runExportProcess(isAutoRun = false) {
            const moreBtn = document.querySelector(SELECTORS.moreMenuButton);
            if (!moreBtn) {
                alert('Could not find export menu.');
                return;
            }

            const deleteCheckbox = document.getElementById('gemini-auto-delete-cb');
            const willDelete = deleteCheckbox ? deleteCheckbox.checked : GM_getValue(AUTO_DELETE_TOGGLE_KEY, true);

            const execBtn = document.getElementById('gemini-btn-one-turn-exec');
            if (execBtn) execBtn.disabled = true;
            showOverlay();

            try {
                performAutoCopyImagesIfNeeded();

                // 1. Export
                await handleTurnExport(moreBtn);

                if (willDelete) {
                    await performDeleteCountdown(execBtn, isAutoRun);
                    requestConversationDeletion();
                } else {
                    console.log('[Gemini 1-Turn Export] Auto-delete skipped based on setting.');
                    if (execBtn) execBtn.textContent = 'Done!';
                    await window.geminiSleep(2000);
                }

            } catch (err) {
                console.error('1-Turn process failed:', err);
                if (!isAutoRun) alert('Process failed. See console.');
            } finally {
                hideOverlay();

                if (execBtn) {
                    execBtn.disabled = false;
                    execBtn.style.backgroundColor = ''; // Reset custom colors
                    execBtn.style.color = '';

                    // Need to re-read the exact active state instead of hardcoded
                    const deleteCheckbox = document.getElementById('gemini-auto-delete-cb');
                    if (deleteCheckbox) {
                        setExecBtnContent(execBtn, deleteCheckbox.checked ? 'Export & Delete' : 'Export');
                    } else {
                        execBtn.textContent = 'Export';
                    }
                }
            }
        }

        function createOneTurnPanelShell() {
            const templateHTML = GM_getResourceText('geminiExportToDocsHTML');
            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            if (!templateHTML || !commonHTMLStr) {
                console.error('[Gemini 1-Click Export to Docs] Resource not found');
                return null;
            }

            // Create inner content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.className = 'ge2d-panel-content';
            const tplWrapper = document.createElement('div');
            window.geminiSetInnerHTML(tplWrapper, templateHTML, policy);
            const tpl = tplWrapper.querySelector('#tpl-one-turn-panel');
            if (tpl) {
                contentDiv.appendChild(tpl.content.cloneNode(true));
            }

            // Assemble panel shell
            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panelShell.id = 'gemini-one-turn-panel';
            document.body.appendChild(panelShell);

            return panelShell;
        }

        function bindStoredCheckbox(panelShell, selector, storageKey, defaultValue) {
            if (!panelShell) return null;

            const checkbox = panelShell.querySelector(selector);
            if (!checkbox) return null;

            checkbox.checked = GM_getValue(storageKey, defaultValue);
            checkbox.onchange = () => GM_setValue(storageKey, checkbox.checked);
            return checkbox;
        }

        function bindOneTurnPanelControls(panelShell) {
            if (!panelShell) return;

            // Bind Dragging Logic
            const dragHandle = panelShell.querySelector('.gus-panel-header');
            const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
            if (dragHandle) window.geminiSetupDraggablePanel(panelShell, dragHandle, 'gemini-export-panel-pos', { bottom: '20px', right: '20px' });
            if (inactiveHandle) window.geminiSetupDraggablePanel(panelShell, inactiveHandle, 'gemini-export-panel-pos', { bottom: '20px', right: '20px' });

            // Hover pause logic
            panelShell.addEventListener('mouseenter', () => { countdownPaused = true; });
            panelShell.addEventListener('mouseleave', () => { countdownPaused = false; });

            // Bind Checkboxes
            const deleteCheckbox = panelShell.querySelector('#gemini-auto-delete-cb');
            if (deleteCheckbox) {
                deleteCheckbox.checked = GM_getValue(AUTO_DELETE_TOGGLE_KEY, true);
            }

            bindStoredCheckbox(panelShell, '#gemini-auto-url-cb', AUTO_URL_TOGGLE_KEY, false);
            bindStoredCheckbox(panelShell, '#gemini-auto-copy-images-cb', AUTO_COPY_IMAGES_TOGGLE_KEY, true);
            bindStoredCheckbox(panelShell, '#gemini-auto-skip-nonmatch-cb', AUTO_SKIP_NONMATCH_TOGGLE_KEY, false);

            // Bind Execute Button
            const execBtn = panelShell.querySelector('#gemini-btn-one-turn-exec');
            const updateBtnText = () => {
                if (execBtn && deleteCheckbox) {
                    setExecBtnContent(execBtn, deleteCheckbox.checked ? 'Export & Delete' : 'Export');
                }
            };
            updateBtnText();

            if (deleteCheckbox) {
                deleteCheckbox.onchange = () => {
                    GM_setValue(AUTO_DELETE_TOGGLE_KEY, deleteCheckbox.checked);
                    updateBtnText();
                };
            }

            if (execBtn) {
                execBtn.onclick = () => {
                    runExportProcess(false);
                };
            }

            // Minimizable Logic
            window.geminiSetupMinimizablePanel(panelShell, 'ge2d-minimized', dragHandle, false);
        }

        function bindOneTurnPanelDependencies(panelShell) {
            if (!panelShell) return;
            const checkDep = (id, scriptName) => {
                window.geminiCheckTargetUserscript(scriptName, 1000).then(res => {
                    const el = panelShell.querySelector('#' + id);
                    if (el) {
                        const vSpan = el.querySelector('.dep-version');
                        if (res) {
                            el.classList.add('installed');
                            el.title = `${scriptName} (v${res.version}) - OK`;
                            if (vSpan) vSpan.textContent = `v${res.version}`;
                        } else {
                            el.classList.remove('installed');
                            el.title = `${scriptName} - Not Found`;
                            if (vSpan) vSpan.textContent = `Not Found`;
                        }
                    }
                });
            };
            setTimeout(() => {
                checkDep('ge2d-dep-auto-select', 'Gemini Auto-Select Next');
                checkDep('ge2d-dep-1click-del', 'Gemini 1-Click Delete Conversation');
                checkDep('ge2d-dep-turn-counter', 'Gemini Turn Counter');
            }, 500);
        }

        function createOneTurnPanel() {
            if (document.getElementById('gemini-one-turn-panel')) return document.getElementById('gemini-one-turn-panel');

            const panelShell = createOneTurnPanelShell();
            bindOneTurnPanelControls(panelShell);
            bindOneTurnPanelDependencies(panelShell);
            return panelShell;
        }

        /**
         * Handle Keyboard Shortcut (Ctrl+E)
         */
        async function handleKeyboardShortcut(e) {
            // Only trigger on Ctrl + E
            if (!(e.ctrlKey && (e.key === 'e' || e.key === 'E'))) return;

            // Ignore if user is typing in an input
            const activeTag = document.activeElement.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
                return;
            }

            e.preventDefault();
            console.log('Ctrl+E detected: Triggering first response export...');

            // Find the FIRST response container's "More" button
            const firstMoreBtn = document.querySelector(SELECTORS.moreMenuButton);
            if (firstMoreBtn) {
                await executeManualTurnExport(firstMoreBtn, {
                    errorPrefix: 'Shortcut Export failed:',
                    alertMessage: 'Shortcut Export failed. See console.'
                });
            } else {
                console.warn('No conversation turns found to export.');
            }
        }

        // --- State Management ---
        let mainObserver = null;
        let keydownListener = null;
        let isInitialized = false;
        let countdownPaused = false;
        /**
         * Main initialization for the script's features.
         */
        function initMainFunctionality() {
            if (isInitialized) return;
            console.log('[Gemini 1-Click Export to Docs] Initializing...');

            addStyles();

            // Initial run - robust polling to wait for Gemini's asynchronous rendering
            let attempts = 0;
            const maxAttempts = 10; // 5 seconds max (10 * 500ms)
            const checkInterval = setInterval(() => {
                attempts++;
                const hasTurns = document.querySelector(SELECTORS.aiTurnContainer);

                if (hasTurns || attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.log(`[Gemini 1-Click Export] Running initial scan after ${attempts * 0.5}s... (Found: ${!!hasTurns})`);
                    processNodes(); // Run the scan now that DOM is likely ready, or we timed out
                }
            }, 500);

            // Future updates - use debounced version to handle streaming content/DOM changes efficiently
            mainObserver = new MutationObserver(debouncedProcessNodes);
            mainObserver.observe(document.body, { childList: true, subtree: true });

            keydownListener = handleKeyboardShortcut;
            document.addEventListener('keydown', keydownListener);

            isInitialized = true;
        }

        /**
         * Cleans up all injected elements, observers, and listeners.
         */
        function cleanup(options = {}) {
            if (!isInitialized) return;
            const { hidePanel = false } = options;
            console.log('[Gemini 1-Click Export to Docs] Cleaning up...');

            if (mainObserver) {
                mainObserver.disconnect();
                mainObserver = null;
            }
            if (keydownListener) {
                document.removeEventListener('keydown', keydownListener);
                keydownListener = null;
            }
            document.querySelectorAll('.gemini-quick-export-btn').forEach(btn => btn.remove());
            const overlay = document.getElementById('gemini-export-overlay');
            if (overlay) overlay.remove();

            if (hidePanel) {
                setOneTurnPanelVisibility(false);
            }

            autoExportTriggered = false; // Reset trigger so it fires again on new URLs
            autoSkipTriggered = false;
            autoDecisionConversationId = null;
            clearAutoDecisionDeadlineTimer();
            if (autoExportTimerId) {
                clearInterval(autoExportTimerId);
                autoExportTimerId = null;
            }

            isInitialized = false;
        }

        /**
         * Checks the URL and runs init or cleanup accordingly.
         */
        function checkUrlAndManageScriptState(prevUrl, currentUrl) {
            const isChatPage = /^\/(app|gem)\//.test(location.pathname);

            // Force a UI reset if transitioning between different pages (to clear "Deleting..." states etc.)
            if (prevUrl && currentUrl && prevUrl !== currentUrl && isInitialized) {
                console.log('[Gemini 1-Click Export to Docs] URL changed, forcing UI reset.');
                cleanup({ hidePanel: false });
            }

            if (isChatPage) {
                initMainFunctionality();
            } else {
                cleanup({ hidePanel: true });
            }
        }

        // --- Entry Point ---
        let lastUrl = window.location.href;

        if (window.navigation) {
            window.navigation.addEventListener('navigatesuccess', () => {
                setTimeout(() => {
                    const prevUrl = lastUrl;
                    lastUrl = window.location.href;
                    checkUrlAndManageScriptState(prevUrl, lastUrl);
                }, 2000); // Wait 2s for SPA DOM flush
            });
            console.log('[Gemini 1-Click Export to Docs] Using Navigation API for SPA routing.');
        } else {
            // Fallback for older browsers
            setInterval(() => {
                if (location.href !== lastUrl) {
                    const prevUrl = lastUrl;
                    lastUrl = location.href;
                    setTimeout(() => checkUrlAndManageScriptState(prevUrl, lastUrl), 2000); // Wait 2s for SPA DOM flush
                }
            }, 500);
            console.log('[Gemini 1-Click Export to Docs] Using setInterval fallback for SPA routing.');
        }

        // Initial check on load
        if (document.body) {
            checkUrlAndManageScriptState(null, lastUrl);
        } else {
            window.addEventListener('DOMContentLoaded', () => checkUrlAndManageScriptState(null, lastUrl));
        }

    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
