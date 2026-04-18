// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    https://userscript.moukaeritai.work/
// @version      0.5.0
// @description  Adds 1-click automation to export Gemini responses to Google Docs and notebooks.
// @lastModified 2026-04-18
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
            aiTurnContainer: 'model-response', // Specifically AI response tags
            moreMenuButton: 'button[data-test-id="more-menu-button"]', // The trigger "..."
            exportToDocsButton: 'button[data-test-id="export-to-docs-button"]', // The target in the menu
            exportIntermediateButton: 'button[data-test-id="export-button"]' // Mobile "Export to..." button
        };

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

        function setExecBtnContent(btn, text) {
            if (!btn) return;
            btn.textContent = text;
        }

        function setExecBtnState(btn, state, text) {
            if (!btn) return;
            btn.classList.remove('auto-export-off', 'auto-export-on');
            btn.classList.add(state === 'on' ? 'auto-export-on' : 'auto-export-off');
            setExecBtnContent(btn, text);
        }

        function setEligibilityIndicatorState(panel, state, label, reason) {
            if (!panel) return;
            const badge = panel.querySelector('#gemini-auto-eligibility-badge');
            const text = panel.querySelector('#gemini-auto-eligibility-reason');
            if (!badge || !text) return;

            badge.classList.remove('eligibility-match', 'eligibility-pending', 'eligibility-nonmatch', 'eligibility-not-one-turn');
            badge.classList.add(`eligibility-${state}`);
            badge.textContent = label;
            text.textContent = reason;
        }

        /**
         * Manage Overlay
         */
        function showOverlay(statusText = 'Processing conversation...') {
            let overlay = document.getElementById('gemini-export-overlay');
            if (!overlay) {
                const tpl = getTemplate('tpl-export-overlay');
                if (tpl) {
                    document.body.appendChild(tpl);
                    overlay = document.getElementById('gemini-export-overlay');
                }
            }
            if (overlay) {
                const statusEl = overlay.querySelector('#gemini-export-overlay-status');
                if (statusEl) {
                    statusEl.textContent = statusText;
                }
                overlay.classList.add('visible');
            }
        }

        function hideOverlay() {
            const overlay = document.getElementById('gemini-export-overlay');
            if (overlay) overlay.classList.remove('visible');
        }

        function updateOverlayStatus(statusText) {
            const statusEl = document.getElementById('gemini-export-overlay-status');
            if (statusEl) {
                statusEl.textContent = statusText;
            }
        }

        /**
         * Flow: export the current conversation via its more menu
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

        function findVisibleMenuItemByText(textNeedles, context = document) {
            const normalizedNeedles = textNeedles.map(text => text.toLowerCase());
            const candidates = Array.from(context.querySelectorAll('button[role="menuitem"], .mat-mdc-menu-item'));
            return candidates.find((button) => {
                if (!button || button.offsetParent === null) return false;
                const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                return normalizedNeedles.some(needle => text.includes(needle));
            }) || null;
        }

        async function waitForMenuItemByText(textNeedles, timeout = 2000, context = document) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const button = findVisibleMenuItemByText(textNeedles, context);
                if (button) return button;
                await window.geminiSleep(100);
            }
            return findVisibleMenuItemByText(textNeedles, context);
        }

        function closeBackdropIfPresent() {
            const closeBackdrop = document.querySelector('.cdk-overlay-backdrop');
            if (closeBackdrop) {
                window.geminiClickElement(closeBackdrop);
            }
        }

        async function openConversationActionMenu(triggerBtn) {
            if (!triggerBtn) {
                throw new Error('Conversation action menu button not found');
            }
            window.geminiClickElement(triggerBtn);
            await window.geminiSleep(200);
        }

        async function waitForDialogContainer(timeout = 2000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const dialog = document.querySelector('mat-dialog-container');
                if (dialog && dialog.offsetParent !== null) {
                    return dialog;
                }
                await window.geminiSleep(100);
            }
            const dialog = document.querySelector('mat-dialog-container');
            return dialog && dialog.offsetParent !== null ? dialog : null;
        }

        /**
         * Flow: export the current conversation via its more menu
         * 1. Click "More" (three dots)
         * 2. Wait for ANY menu to appear
         * 3. Look for "Export to Docs" globally
         * 4. If mobile, handle intermediate "Export to..." click
         */
        async function handleTurnExport(triggerBtn) {
            console.log('Starting Turn Export...');

            // 1. Click trigger
            await openConversationActionMenu(triggerBtn);

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
                    window.geminiClickElement(intermediateBtn);
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

            window.geminiClickElement(exportBtn);
            console.log('Turn Export Clicked');

            // Close menu if it persists (auto-closes usually)
            await window.geminiSleep(100);
            closeBackdropIfPresent();
        }

        const AUTO_URL_TOGGLE_KEY = 'gemini-export-auto-url-toggle';
        const AUTO_DELETE_TOGGLE_KEY = 'gemini-export-auto-delete-toggle';
        const AUTO_SKIP_NONMATCH_TOGGLE_KEY = 'gemini-export-auto-skip-nonmatch-toggle';
        const DESTINATION_DOCS_TOGGLE_KEY = 'gemini-export-destination-docs-toggle';
        const DESTINATION_NOTEBOOK_TOGGLE_KEY = 'gemini-export-destination-notebook-toggle';
        const NOTEBOOK_TITLE_KEY = 'gemini-export-notebook-title';

        // Simple debounce function to reduce polling frequency on DOM mutations
        function debounce(func, wait) {
            let timeout;
            return function () {
                const context = this, args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }

        const debouncedUpdateOneTurnVisibility = debounce(updateOneTurnVisibility, 500);

        let autoExportTriggered = false;
        let autoSkipTriggered = false;
        let autoExportTimerId = null;
        let autoDecisionConversationId = null;
        let autoDecisionDeadlineTimerId = null;
        let autoDecisionPendingConversationId = null;
        let snackbarFailureAbortRequested = false;
        let snackbarListener = null;
        let lastNotebookSuccessDetail = null;
        const AUTO_SKIP_LOG_PREFIX = '[Gemini 1-Turn Auto][Skip]';
        const AUTO_SKIP_DECISION_DELAY_MS = 2000;

        function logAutoSkip(message, details) {
            if (details !== undefined) {
                console.log(`${AUTO_SKIP_LOG_PREFIX} ${message}`, details);
            } else {
                console.log(`${AUTO_SKIP_LOG_PREFIX} ${message}`);
            }
        }

        function maybeLogAutoSkip(shouldLog, message, details) {
            if (!shouldLog) return;
            logAutoSkip(message, details);
        }

        function getDestinationSettings() {
            return {
                docsEnabled: GM_getValue(DESTINATION_DOCS_TOGGLE_KEY, true),
                notebookEnabled: GM_getValue(DESTINATION_NOTEBOOK_TOGGLE_KEY, false),
                notebookTitle: String(GM_getValue(NOTEBOOK_TITLE_KEY, '') || '').trim()
            };
        }

        function validateDestinationSettings(settings = getDestinationSettings()) {
            if (!settings.docsEnabled && !settings.notebookEnabled) {
                return {
                    valid: false,
                    message: 'Enable Google Docs or notebook before starting auto mode.'
                };
            }
            if (settings.notebookEnabled && !settings.notebookTitle) {
                return {
                    valid: false,
                    message: 'Enter a notebook title before enabling notebook mode.'
                };
            }
            return {
                valid: true,
                message: settings.notebookEnabled
                    ? `Notebook target: ${settings.notebookTitle}`
                    : 'Ready'
            };
        }

        function renderDestinationValidation(panel = document.getElementById('gemini-one-turn-panel')) {
            if (!panel) return true;
            const validationEl = panel.querySelector('#gemini-destination-validation');
            if (!validationEl) return true;
            const validation = validateDestinationSettings();
            validationEl.textContent = validation.message;
            validationEl.classList.toggle('is-valid', validation.valid);
            return validation.valid;
        }

        function isNotebookSuccessSnackbar(detail) {
            const text = String(detail?.text || '').replace(/\s+/g, ' ').trim();
            if (!text) return false;
            const lowerText = text.toLowerCase();
            const settings = getDestinationSettings();
            const titleMatches = settings.notebookTitle
                ? text.includes(settings.notebookTitle)
                : true;
            const successPhrases = [
                'に追加しました',
                'added to',
                'added this chat to'
            ];
            return titleMatches && successPhrases.some(phrase => lowerText.includes(phrase.toLowerCase()));
        }

        function getAutoExportToggleLabel() {
            return GM_getValue(AUTO_URL_TOGGLE_KEY, false) ? 'Stop Auto Action' : 'Start Auto Action';
        }

        function refreshAutoExportToggleButton(button = document.getElementById('gemini-btn-one-turn-exec')) {
            if (!button || autoExportTimerId || button.disabled) return;
            setExecBtnState(button, GM_getValue(AUTO_URL_TOGGLE_KEY, false) ? 'on' : 'off', getAutoExportToggleLabel());
        }

        function resetAutoDecisionState() {
            autoExportTriggered = false;
            autoSkipTriggered = false;
            autoDecisionConversationId = null;
            clearAutoDecisionDeadlineTimer();
        }

        function stopAutoExportMode() {
            GM_setValue(AUTO_URL_TOGGLE_KEY, false);
            if (autoExportTimerId) {
                clearInterval(autoExportTimerId);
                clearTimeout(autoExportTimerId);
                autoExportTimerId = null;
            }
            resetAutoDecisionState();
            refreshAutoExportToggleButton();
            console.log('[Gemini 1-Turn Auto] Auto-export stopped by user.');
        }

        function disableSafetySensitiveOptions() {
            GM_setValue(AUTO_URL_TOGGLE_KEY, false);
            GM_setValue(AUTO_DELETE_TOGGLE_KEY, false);
            GM_setValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false);

            const deleteCheckbox = document.getElementById('gemini-auto-delete-cb');
            if (deleteCheckbox) {
                deleteCheckbox.checked = false;
            }
            const skipCheckbox = document.getElementById('gemini-auto-skip-nonmatch-cb');
            if (skipCheckbox) {
                skipCheckbox.checked = false;
            }
            const execBtn = document.getElementById('gemini-btn-one-turn-exec');
            if (execBtn) {
                execBtn.style.backgroundColor = '';
                execBtn.style.color = '';
                setExecBtnState(execBtn, 'off', getAutoExportToggleLabel());
            }
        }

        function handleSnackbarFailure(detail) {
            snackbarFailureAbortRequested = true;
            if (autoExportTimerId) {
                clearInterval(autoExportTimerId);
                clearTimeout(autoExportTimerId);
                autoExportTimerId = null;
            }
            resetAutoDecisionState();
            disableSafetySensitiveOptions();
            console.warn('[Gemini 1-Turn Export] Snackbar failure detected. Stopping automation for safety.', {
                kind: detail?.kind || 'unknown',
                matchedRule: detail?.matchedRule || null,
                text: detail?.text || ''
            });
        }

        function handleAutoExportToggleClick() {
            if (GM_getValue(AUTO_URL_TOGGLE_KEY, false) || autoExportTimerId) {
                stopAutoExportMode();
                return;
            }

            if (!renderDestinationValidation()) {
                refreshAutoExportToggleButton();
                return;
            }

            GM_setValue(AUTO_URL_TOGGLE_KEY, true);
            resetAutoDecisionState();
            refreshAutoExportToggleButton();
            updateOneTurnVisibility();
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

        function getAutoDecisionSettings() {
            return {
                autoUrlEnabled: GM_getValue(AUTO_URL_TOGGLE_KEY, false),
                autoSkipEnabled: GM_getValue(AUTO_SKIP_NONMATCH_TOGGLE_KEY, false)
            };
        }

        function collectAutoDecisionContext() {
            const snapshot = collectCurrentConversationSnapshot();
            return {
                snapshot,
                conversationId: snapshot.conversationId,
                ...getAutoDecisionSettings()
            };
        }

        function shouldSkipAutoDecisionForConversation(conversationId) {
            return autoDecisionConversationId === conversationId || autoExportTriggered || autoSkipTriggered;
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
            logAutoSkip('Dispatching gemini-auto-select-next:request-next.', {
                conversationId: currentConversationId
            });
            window.dispatchEvent(new CustomEvent('gemini-auto-select-next:request-next'));
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

        function findResponseUrlMatchDecision(userUrls, botUrls, exportMenuButtonExists, conversationId, shouldLog = true) {
            const userYtId = extractYoutubeVideoId(userUrls[0]);
            for (const botUrl of botUrls) {
                if (userUrls[0].toLowerCase() === botUrl.toLowerCase()) {
                    maybeLogAutoSkip(shouldLog, 'Exact URL match found.', {
                        conversationId,
                        matchedUrl: botUrl,
                        hasExportMenuButton: exportMenuButtonExists
                    });
                    return {
                        status: exportMenuButtonExists ? 'match' : 'pending',
                        reason: exportMenuButtonExists ? 'exact-url-match' : 'waiting-for-export-button',
                        userUrls,
                        botUrls,
                        exportMenuButtonExists
                    };
                }
                if (botUrl.toLowerCase().includes(userUrls[0].toLowerCase())) {
                    maybeLogAutoSkip(shouldLog, 'Inclusive URL match found.', {
                        conversationId,
                        sourceUrl: userUrls[0],
                        matchedUrl: botUrl,
                        hasExportMenuButton: exportMenuButtonExists
                    });
                    return {
                        status: exportMenuButtonExists ? 'match' : 'pending',
                        reason: exportMenuButtonExists ? 'included-url-match' : 'waiting-for-export-button',
                        userUrls,
                        botUrls,
                        exportMenuButtonExists
                    };
                }
                if (userYtId) {
                    const botYtId = extractYoutubeVideoId(botUrl);
                    if (botYtId && userYtId === botYtId) {
                        maybeLogAutoSkip(shouldLog, 'YouTube video id match found.', {
                            conversationId,
                            youtubeVideoId: userYtId,
                            matchedUrl: botUrl,
                            hasExportMenuButton: exportMenuButtonExists
                        });
                        return {
                            status: exportMenuButtonExists ? 'match' : 'pending',
                            reason: exportMenuButtonExists ? 'youtube-id-match' : 'waiting-for-export-button',
                            userUrls,
                            botUrls,
                            exportMenuButtonExists
                        };
                    }
                }
            }
            return null;
        }

        function evaluateAutoUrlCondition(snapshot = collectCurrentConversationSnapshot(), { shouldLog = true } = {}) {
            const { conversationId, userQueryEl, messageContentEl, exportMenuButton } = snapshot;
            maybeLogAutoSkip(shouldLog, 'Evaluating auto URL condition.', {
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
                maybeLogAutoSkip(shouldLog, 'Deferring decision because required turn DOM is not ready.', {
                    conversationId
                });
                return { status: 'pending', reason: 'waiting-for-turn-dom' };
            }

            const userUrls = extractUrls(userQueryEl);
            const botUrls = extractUrls(messageContentEl);

            maybeLogAutoSkip(shouldLog, 'Collected URLs for auto decision.', {
                conversationId,
                userUrls,
                botUrls,
                hasExportMenuButton: !!exportMenuButton
            });

            if (userUrls.length !== 1) {
                maybeLogAutoSkip(shouldLog, 'Prompt URL count is not exactly 1, treating conversation as non-match.', {
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
                maybeLogAutoSkip(shouldLog, 'Deferring decision because response URLs are empty and the export menu is not available yet.', {
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

            const matchDecision = findResponseUrlMatchDecision(userUrls, botUrls, !!exportMenuButton, conversationId, shouldLog);
            if (matchDecision) {
                return matchDecision;
            }

            maybeLogAutoSkip(shouldLog, 'No URL match found in the response.', {
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

        function formatEligibilityReason(reason) {
            if (reason === 'exact-url-match' || reason === 'included-url-match' || reason === 'youtube-id-match') {
                return 'URL matched';
            }
            if (reason === 'waiting-for-turn-dom') {
                return 'Waiting for conversation DOM';
            }
            if (reason === 'waiting-for-response-actions' || reason === 'waiting-for-export-button') {
                return 'Waiting for export actions';
            }
            if (reason === 'response-url-mismatch') {
                return 'Response URL did not match';
            }
            if (reason === 'prompt-url-count-0') {
                return 'Prompt URL not found';
            }
            if (reason.startsWith('prompt-url-count-')) {
                return 'Prompt must contain exactly one URL';
            }
            return reason.replace(/-/g, ' ');
        }

        function getAutoExportEligibilityIndicatorState(snapshot) {
            if (!snapshot.isOneTurn) {
                return {
                    state: 'not-one-turn',
                    label: 'Not 1-Turn',
                    reason: 'Not a 1-turn conversation'
                };
            }

            const decision = evaluateAutoUrlCondition(snapshot, { shouldLog: false });
            if (decision.status === 'match') {
                return {
                    state: 'match',
                    label: 'Matched',
                    reason: formatEligibilityReason(decision.reason)
                };
            }
            if (decision.status === 'pending') {
                return {
                    state: 'pending',
                    label: 'Waiting',
                    reason: formatEligibilityReason(decision.reason)
                };
            }
            return {
                state: 'nonmatch',
                label: 'Not Matched',
                reason: formatEligibilityReason(decision.reason)
            };
        }

        function refreshEligibilityIndicator(panel, snapshot) {
            if (!panel) return;
            const indicator = getAutoExportEligibilityIndicatorState(snapshot);
            setEligibilityIndicatorState(panel, indicator.state, indicator.label, indicator.reason);
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
                const updateButtonUI = () => {
                    setExecBtnState(
                        execBtn,
                        'on',
                        countdownPaused ? `Stop Auto Action (Paused ${countdown}s)` : `Stop Auto Action (${countdown}s)`
                    );
                };

                autoExportTimerId = setInterval(() => {
                    if (countdownPaused) return; // Requirement: Hover pause

                    countdown--;
                    if (countdown <= 0) {
                        if (autoExportTimerId) clearInterval(autoExportTimerId);
                        autoExportTimerId = null;
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
            const { autoSkipEnabled } = getAutoDecisionSettings();
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
                if (!autoSkipTriggered && autoSkipEnabled) {
                    requestNextConversationAfterNonMatch();
                } else {
                    logAutoSkip('Auto-skip is disabled or already triggered, staying on current conversation.', {
                        conversationId: currentConversationId,
                        autoSkipTriggered,
                        autoSkipEnabled
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
            if (!autoSkipTriggered && autoSkipEnabled) {
                requestNextConversationAfterNonMatch();
            } else {
                logAutoSkip('Auto-skip is disabled or already triggered, staying on current conversation.', {
                    conversationId: currentConversationId,
                    autoSkipTriggered,
                    autoSkipEnabled
                });
            }
        }

        function ensureAutoDecisionDeadline() {
            const {
                conversationId: currentConversationId,
                autoUrlEnabled,
                autoSkipEnabled
            } = collectAutoDecisionContext();

            if (!autoUrlEnabled || !autoSkipEnabled) {
                clearAutoDecisionDeadlineTimer();
                return;
            }
            if (shouldSkipAutoDecisionForConversation(currentConversationId)) {
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
            const {
                snapshot,
                conversationId: currentConversationId,
                autoUrlEnabled,
                autoSkipEnabled
            } = collectAutoDecisionContext();

            if (!autoExportTriggered && autoUrlEnabled) {
                try {
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
                            autoSkipEnabled
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

            refreshEligibilityIndicator(panel, snapshot);
            renderDestinationValidation(panel);

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

        function findNotebookOptionByTitle(dialog, notebookTitle) {
            const options = Array.from(dialog.querySelectorAll('mat-list-option'));
            return options.find((option) => {
                const titleEl = option.querySelector('.mdc-list-item__primary-text div > span:last-child');
                const titleText = titleEl ? titleEl.textContent.trim() : option.textContent.trim();
                return titleText === notebookTitle;
            }) || null;
        }

        async function waitForNotebookSuccess(startTime, notebookTitle, timeout = 4000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const detail = lastNotebookSuccessDetail;
                if (detail && detail.observedAt >= startTime) {
                    if (!notebookTitle || String(detail.text || '').includes(notebookTitle)) {
                        return detail;
                    }
                }
                await window.geminiSleep(100);
            }
            return null;
        }

        async function handleAddToNotebook(triggerBtn, notebookTitle) {
            if (!notebookTitle) {
                throw new Error('Notebook title is required when notebook destination is enabled');
            }

            console.log('[Gemini 1-Turn Export] Starting notebook add flow.', { notebookTitle });
            await openConversationActionMenu(triggerBtn);

            const notebookMenuButton = await waitForMenuItemByText(['ノートブックに追加', 'add to notebook'], 2000, document.body);
            if (!notebookMenuButton) {
                closeBackdropIfPresent();
                throw new Error('Add to notebook menu item not found');
            }

            window.geminiClickElement(notebookMenuButton);
            const dialog = await waitForDialogContainer(2500);
            if (!dialog) {
                throw new Error('Notebook dialog did not appear');
            }

            const notebookOption = findNotebookOptionByTitle(dialog, notebookTitle);
            if (!notebookOption) {
                closeBackdropIfPresent();
                throw new Error(`Notebook not found: ${notebookTitle}`);
            }

            const waitStart = Date.now();
            window.geminiClickElement(notebookOption);

            const successDetail = await waitForNotebookSuccess(waitStart, notebookTitle, 5000);
            if (!successDetail) {
                throw new Error(`Notebook add success toast not observed for: ${notebookTitle}`);
            }

            console.log('[Gemini 1-Turn Export] Notebook add completed.', {
                notebookTitle,
                snackbarText: successDetail.text
            });
        }

        async function performDeleteCountdown(execBtn, isAutoRun, delay = 5) {
            for (let i = delay; i > 0; i--) {
                if (snackbarFailureAbortRequested) {
                    if (execBtn) execBtn.textContent = 'Delete skipped';
                    return false;
                }
                if (execBtn) {
                    execBtn.textContent = isAutoRun ? `Auto Delete in ${i}s...` : `Deleting in ${i}s...`;
                    execBtn.style.backgroundColor = '#e53935'; // Red deleting warning
                    execBtn.style.color = 'white';
                }
                await window.geminiSleep(1000);
                if (snackbarFailureAbortRequested) {
                    if (execBtn) execBtn.textContent = 'Delete skipped';
                    return false;
                }
            }
            if (snackbarFailureAbortRequested) {
                if (execBtn) execBtn.textContent = 'Delete skipped';
                return false;
            }
            if (execBtn) execBtn.textContent = 'Deleting...';
            return true;
        }

        function requestConversationDeletion() {
            console.log('[Gemini 1-Turn Export] Requesting conversation deletion.');
            window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));
        }

        /**
         * Reusable async extraction of the full execution flow (Clicking, Countdown, Deleting)
         */
        async function runExportProcess(isAutoRun = false) {
            snackbarFailureAbortRequested = false;
            lastNotebookSuccessDetail = null;
            const destinationSettings = getDestinationSettings();
            const destinationValidation = validateDestinationSettings(destinationSettings);
            renderDestinationValidation();
            if (!destinationValidation.valid) {
                if (!isAutoRun) {
                    alert(destinationValidation.message);
                }
                return;
            }

            const deleteCheckbox = document.getElementById('gemini-auto-delete-cb');
            const willDelete = deleteCheckbox ? deleteCheckbox.checked : GM_getValue(AUTO_DELETE_TOGGLE_KEY, true);

            const execBtn = document.getElementById('gemini-btn-one-turn-exec');
            if (execBtn) execBtn.disabled = true;
            showOverlay('Processing selected destinations...');

            try {
                if (destinationSettings.docsEnabled) {
                    const docsMenuButton = document.querySelector(SELECTORS.moreMenuButton);
                    if (!docsMenuButton) {
                        throw new Error('Could not find export menu.');
                    }
                    updateOverlayStatus('Exporting to Google Docs...');
                    await handleTurnExport(docsMenuButton);

                    if (snackbarFailureAbortRequested) {
                        console.warn('[Gemini 1-Turn Export] Export flow stopped after snackbar failure was detected.');
                        if (execBtn) execBtn.textContent = 'Stopped';
                        await window.geminiSleep(1500);
                        return;
                    }
                }

                if (destinationSettings.notebookEnabled) {
                    const notebookMenuButton = document.querySelector(SELECTORS.moreMenuButton);
                    if (!notebookMenuButton) {
                        throw new Error('Could not find notebook menu.');
                    }
                    updateOverlayStatus(`Adding to notebook: ${destinationSettings.notebookTitle}`);
                    await handleAddToNotebook(notebookMenuButton, destinationSettings.notebookTitle);

                    if (snackbarFailureAbortRequested) {
                        console.warn('[Gemini 1-Turn Export] Notebook flow stopped after snackbar failure was detected.');
                        if (execBtn) execBtn.textContent = 'Stopped';
                        await window.geminiSleep(1500);
                        return;
                    }
                }

                if (willDelete) {
                    updateOverlayStatus('Preparing auto-delete...');
                    const countdownCompleted = await performDeleteCountdown(execBtn, isAutoRun);
                    if (!countdownCompleted || snackbarFailureAbortRequested) {
                        console.warn('[Gemini 1-Turn Export] Auto-delete cancelled because snackbar failure was detected.');
                        if (execBtn) execBtn.textContent = 'Stopped';
                        await window.geminiSleep(1500);
                        return;
                    }

                    if (snackbarFailureAbortRequested) {
                        console.warn('[Gemini 1-Turn Export] Delete request skipped because snackbar failure was detected.');
                        if (execBtn) execBtn.textContent = 'Stopped';
                        await window.geminiSleep(1500);
                        return;
                    }
                    requestConversationDeletion();
                } else {
                    console.log('[Gemini 1-Turn Export] Auto-delete skipped based on setting.');
                    if (execBtn) execBtn.textContent = 'Done!';
                    await window.geminiSleep(2000);
                }

            } catch (err) {
                console.error('1-Turn process failed:', err);
                if (execBtn) execBtn.textContent = 'Stopped';
                if (!isAutoRun) alert('Process failed. See console.');
            } finally {
                hideOverlay();

                if (execBtn) {
                    execBtn.disabled = false;
                    execBtn.style.backgroundColor = ''; // Reset custom colors
                    execBtn.style.color = '';
                    refreshAutoExportToggleButton(execBtn);
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
            const docsCheckbox = panelShell.querySelector('#gemini-destination-docs-cb');
            const notebookCheckbox = panelShell.querySelector('#gemini-destination-notebook-cb');
            const notebookInput = panelShell.querySelector('#gemini-notebook-title-input');

            bindStoredCheckbox(panelShell, '#gemini-auto-skip-nonmatch-cb', AUTO_SKIP_NONMATCH_TOGGLE_KEY, false);

            // Bind Auto Export Toggle Button
            const execBtn = panelShell.querySelector('#gemini-btn-one-turn-exec');
            refreshAutoExportToggleButton(execBtn);

            if (deleteCheckbox) {
                deleteCheckbox.onchange = () => {
                    GM_setValue(AUTO_DELETE_TOGGLE_KEY, deleteCheckbox.checked);
                };
            }

            if (docsCheckbox) {
                docsCheckbox.checked = GM_getValue(DESTINATION_DOCS_TOGGLE_KEY, true);
                docsCheckbox.onchange = () => {
                    GM_setValue(DESTINATION_DOCS_TOGGLE_KEY, docsCheckbox.checked);
                    renderDestinationValidation(panelShell);
                };
            }

            if (notebookCheckbox) {
                notebookCheckbox.checked = GM_getValue(DESTINATION_NOTEBOOK_TOGGLE_KEY, false);
                notebookCheckbox.onchange = () => {
                    GM_setValue(DESTINATION_NOTEBOOK_TOGGLE_KEY, notebookCheckbox.checked);
                    renderDestinationValidation(panelShell);
                };
            }

            if (notebookInput) {
                notebookInput.value = String(GM_getValue(NOTEBOOK_TITLE_KEY, '') || '');
                notebookInput.addEventListener('input', () => {
                    GM_setValue(NOTEBOOK_TITLE_KEY, notebookInput.value);
                    renderDestinationValidation(panelShell);
                });
                notebookInput.addEventListener('change', () => {
                    notebookInput.value = notebookInput.value.trim();
                    GM_setValue(NOTEBOOK_TITLE_KEY, notebookInput.value);
                    renderDestinationValidation(panelShell);
                });
            }

            if (execBtn) {
                execBtn.onclick = () => {
                    handleAutoExportToggleClick();
                };
            }

            // Minimizable Logic
            window.geminiSetupMinimizablePanel(panelShell, 'ge2d-minimized', dragHandle, false);
            renderDestinationValidation(panelShell);
        }

        function createOneTurnPanel() {
            if (document.getElementById('gemini-one-turn-panel')) return document.getElementById('gemini-one-turn-panel');

            const panelShell = createOneTurnPanelShell();
            bindOneTurnPanelControls(panelShell);
            return panelShell;
        }

        // --- State Management ---
        let mainObserver = null;
        let isInitialized = false;
        let countdownPaused = false;
        /**
         * Main initialization for the script's features.
         */
        function initMainFunctionality() {
            if (isInitialized) return;
            console.log('[Gemini 1-Click Export to Docs] Initializing...');

            addStyles();
            if (window.geminiEnsureSnackbarObserver) {
                window.geminiEnsureSnackbarObserver();
            }
            if (!snackbarListener) {
                snackbarListener = (event) => {
                    const detail = event.detail || {};
                    const isNotebookSuccess = isNotebookSuccessSnackbar(detail);
                    if (detail.kind === 'success' || isNotebookSuccess) {
                        if (isNotebookSuccess) {
                            lastNotebookSuccessDetail = detail;
                        }
                        return;
                    }
                    handleSnackbarFailure(detail);
                };
                window.addEventListener('gemini-snackbar:shown', snackbarListener);
            }

            // Initial run - robust polling to wait for Gemini's asynchronous rendering
            let attempts = 0;
            const maxAttempts = 10; // 5 seconds max (10 * 500ms)
            const checkInterval = setInterval(() => {
                attempts++;
                const hasTurns = document.querySelector(SELECTORS.aiTurnContainer);

                if (hasTurns || attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.log(`[Gemini 1-Click Export] Running initial scan after ${attempts * 0.5}s... (Found: ${!!hasTurns})`);
                    updateOneTurnVisibility(); // Run the scan now that DOM is likely ready, or we timed out
                }
            }, 500);

            // Future updates - use debounced version to handle streaming content/DOM changes efficiently
            mainObserver = new MutationObserver(debouncedUpdateOneTurnVisibility);
            mainObserver.observe(document.body, { childList: true, subtree: true });

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
            if (snackbarListener) {
                window.removeEventListener('gemini-snackbar:shown', snackbarListener);
                snackbarListener = null;
            }
            const overlay = document.getElementById('gemini-export-overlay');
            if (overlay) overlay.remove();

            if (hidePanel) {
                setOneTurnPanelVisibility(false);
            }

            resetAutoDecisionState();
            if (autoExportTimerId) {
                clearInterval(autoExportTimerId);
                clearTimeout(autoExportTimerId);
                autoExportTimerId = null;
            }
            snackbarFailureAbortRequested = false;
            lastNotebookSuccessDetail = null;

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
