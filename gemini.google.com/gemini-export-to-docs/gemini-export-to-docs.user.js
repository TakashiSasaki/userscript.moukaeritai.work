// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    https://userscript.moukaeritai.work/
// @version      0.4.54
// @description  Adds a 1-click button to export Gemini responses and canvases to Google Docs.
// @lastModified 2026-04-01
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     customCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/style.css
// @resource     templateHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/template.html
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

        const initUserScript = () => {

            const policy = window.geminiCreateTrustedHTMLPolicy('geminiExportToDocs');



            // Removed initial URL check as it will be handled dynamically

            // --- Trusted Types ---



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

                const css = GM_getResourceText('customCSS');
                GM_addStyle(css);
                // GM_addStyle returns the style element or undefined depending on TM version
                // Try to find it if we need to remove it later, or just let it be.
                return document.querySelector('style:last-of-type');
            }

            let templatesContainer = null;
            function getTemplate(id) {
                if (!templatesContainer) {
                    templatesContainer = document.createElement('div');
                    const templateHtml = GM_getResourceText('templateHTML').replace(/{{scriptVersion}}/g, `${GM_info.script.version} ${gusEmoji}`);
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

                    showOverlay();
                    try {
                        await onClick();

                        // Success State - Sync across same container
                        const container = btn.closest(SELECTORS.turnContainer);
                        if (container) {
                            const allBtns = container.querySelectorAll('.gemini-quick-export-btn');
                            allBtns.forEach(b => markAsExported(b));
                        } else {
                            markAsExported(btn);
                        }

                    } catch (err) {
                        console.error('Export failed:', err);
                        alert('Export failed. See console for details.');
                    } finally {
                        hideOverlay();
                    }
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
            let autoExportTimerId = null;

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

            function updateOneTurnVisibility() {
                const turns = document.querySelectorAll(SELECTORS.aiTurnContainer);
                // Note: Gemini UI can be slow to update styles/classes.
                // We'll count anything that looks like a model response.
                console.log(`[Gemini 1-Turn] Found ${turns.length} active AI turns using ${SELECTORS.aiTurnContainer}`);

                // A 1-turn conversation usually has exactly 1 model-response
                const isOneTurn = turns.length === 1;

                let panel = document.getElementById('gemini-one-turn-panel');
                if (!panel) {
                    panel = createOneTurnPanel();
                    panel.classList.add('inactive'); // Default to inactive until we confirm it's 1-turn
                }

                if (isOneTurn) {
                    panel.classList.remove('inactive');

                    // --- Auto URL Export Logic ---
                    if (!autoExportTriggered && GM_getValue(AUTO_URL_TOGGLE_KEY, false)) {
                        try {
                            const userQueryEl = document.querySelector('user-query');
                            const messageContentEl = document.querySelector('message-content');

                            if (userQueryEl && messageContentEl) {
                                const userUrls = extractUrls(userQueryEl);
                                const botUrls = extractUrls(messageContentEl);

                                console.log(`[Gemini 1-Turn] Extracted Prompt URLs:`, userUrls);
                                console.log(`[Gemini 1-Turn] Extracted Response URLs:`, botUrls);

                                if (userUrls.length === 1) {
                                    const userYtId = extractYoutubeVideoId(userUrls[0]);
                                    let matchFound = false;

                                    for (const botUrl of botUrls) {
                                        // Comparison (Case-insensitive to handle Https:// vs https://)
                                        if (userUrls[0].toLowerCase() === botUrl.toLowerCase()) {
                                            matchFound = true;
                                            break;
                                        }
                                        // Flexible comparison: If the response URL starts with or contains the prompt URL
                                        // This handles cases where our truncation might have been slightly different
                                        if (botUrl.toLowerCase().includes(userUrls[0].toLowerCase())) {
                                            matchFound = true;
                                            console.log(`[Gemini 1-Turn Auto] Match found via inclusion: ${userUrls[0]}`);
                                            break;
                                        }
                                        if (userYtId) {
                                            const botYtId = extractYoutubeVideoId(botUrl);
                                            if (botYtId && userYtId === botYtId) {
                                                matchFound = true;
                                                console.log(`[Gemini 1-Turn Auto] Match found via YouTube Video ID: ${userYtId}`);
                                                break;
                                            }
                                        }
                                    }

                                    if (matchFound) {
                                        autoExportTriggered = true;
                                        console.log(`[Gemini 1-Turn Auto] Match concluded. Prompt had 1 URL matched in response.`);

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
                                    } else {
                                        console.log(`[Gemini 1-Turn Auto] No match found. Staying on current conversation.`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('[Gemini 1-Turn Auto] Error matching URLs:', e);
                        }
                    }
                } else if (panel) {
                    panel.classList.add('inactive');
                    autoExportTriggered = false; // Reset trigger state if UI is closed (e.g., user started a new topic or more turns added)
                    if (autoExportTimerId) {
                        clearInterval(autoExportTimerId);
                        autoExportTimerId = null;
                    }
                }
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
                    // Auto Copy Images Check
                    const autoCopyEnabled = GM_getValue(AUTO_COPY_IMAGES_TOGGLE_KEY, true);
                    if (autoCopyEnabled) {
                        const turnContainer = document.querySelector(SELECTORS.aiTurnContainer);
                        if (turnContainer && turnContainer.querySelectorAll('img').length > 0) {
                            console.log('[Gemini 1-Turn Export] Auto-copying images because images were found.');
                            document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images', {
                                detail: { target: 'all' }
                            }));
                        }
                    }

                    // 1. Export
                    await handleTurnExport(moreBtn);

                    if (willDelete) {
                        // 2. Countdown & Wait
                        let delay = 5; // Hardcoded default duration

                        for (let i = delay; i > 0; i--) {
                            if (execBtn) {
                                execBtn.textContent = isAutoRun ? `Auto Delete in ${i}s...` : `Deleting in ${i}s...`;
                                execBtn.style.backgroundColor = '#e53935'; // Red deleting warning
                                execBtn.style.color = 'white';
                            }
                            await window.geminiSleep(1000);
                        }
                        if (execBtn) execBtn.textContent = 'Deleting...';

                        // 3. Dispatch Delete Event
                        console.log('[Gemini 1-Turn Export] Requesting conversation deletion.');
                        window.geminiCheckTargetUserscript('Gemini 1-Click Delete Conversation').then(() => { window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete')); });
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

            function createOneTurnPanel() {
                const panel = document.createElement('div');
                panel.id = 'gemini-one-turn-panel';
                panel.className = 'gus-panel';

                const tpl = getTemplate('tpl-one-turn-panel');
                if (tpl) {
                    panel.appendChild(tpl);
                }
                document.body.appendChild(panel);

                // Bind Dragging Logic
                const versionActive = panel.querySelector('.one-turn-version');
                const versionInactive = panel.querySelector('.one-turn-inactive-content');
                if (versionActive) window.geminiSetupDraggablePanel(panel, versionActive, 'gemini-export-panel-pos', { bottom: '20px', right: '20px' });
                if (versionInactive) window.geminiSetupDraggablePanel(panel, versionInactive, 'gemini-export-panel-pos', { bottom: '20px', right: '20px' });

                // Hover pause logic
                panel.addEventListener('mouseenter', () => { countdownPaused = true; });
                panel.addEventListener('mouseleave', () => { countdownPaused = false; });

                // Bind Checkboxes
                const deleteCheckbox = panel.querySelector('#gemini-auto-delete-cb');
                if (deleteCheckbox) {
                    deleteCheckbox.checked = GM_getValue(AUTO_DELETE_TOGGLE_KEY, true);
                }

                const autoEnableCheckbox = panel.querySelector('#gemini-auto-url-cb');
                if (autoEnableCheckbox) {
                    autoEnableCheckbox.checked = GM_getValue(AUTO_URL_TOGGLE_KEY, false);
                    autoEnableCheckbox.onchange = () => GM_setValue(AUTO_URL_TOGGLE_KEY, autoEnableCheckbox.checked);
                }

                const autoCopyImagesCheckbox = panel.querySelector('#gemini-auto-copy-images-cb');
                if (autoCopyImagesCheckbox) {
                    autoCopyImagesCheckbox.checked = GM_getValue(AUTO_COPY_IMAGES_TOGGLE_KEY, true);
                    autoCopyImagesCheckbox.onchange = () => GM_setValue(AUTO_COPY_IMAGES_TOGGLE_KEY, autoCopyImagesCheckbox.checked);
                }

                // Bind Execute Button
                const execBtn = panel.querySelector('#gemini-btn-one-turn-exec');
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

                const checkDep = (id, scriptName) => {
                    window.geminiCheckTargetUserscript(scriptName, 1000).then(res => {
                        const el = panel.querySelector('#' + id);
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

                return panel;
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
                    // Visualize the action (optional: highlight the button temporarily?)

                    // Re-use existing export logic
                    showOverlay();
                    try {
                        await handleTurnExport(firstMoreBtn);

                        // Mark success on UI
                        const container = firstMoreBtn.closest(SELECTORS.turnContainer);
                        if (container) {
                            const allBtns = container.querySelectorAll('.gemini-quick-export-btn');
                            allBtns.forEach(b => markAsExported(b));
                        }
                    } catch (err) {
                        console.error('Shortcut Export failed:', err);
                        alert('Shortcut Export failed. See console.');
                    } finally {
                        hideOverlay();
                    }
                } else {
                    console.warn('No conversation turns found to export.');
                }
            }

            // --- State Management ---
            let mainObserver = null;
            let keydownListener = null;
            let styleElement = null;
            let isInitialized = false;
            let countdownPaused = false;

            /**
             * Main initialization for the script's features.
             */
            function initMainFunctionality() {
                if (isInitialized) return;
                console.log('[Gemini 1-Click Export to Docs] Initializing...');

                styleElement = addStyles(); // addStyles() needs to return the style element

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
            function cleanup() {
                if (!isInitialized) return;
                console.log('[Gemini 1-Click Export to Docs] Cleaning up...');

                if (mainObserver) {
                    mainObserver.disconnect();
                    mainObserver = null;
                }
                if (keydownListener) {
                    document.removeEventListener('keydown', keydownListener);
                    keydownListener = null;
                }
                if (styleElement) {
                    styleElement.remove();
                    styleElement = null;
                }
                document.querySelectorAll('.gemini-quick-export-btn').forEach(btn => btn.remove());
                const overlay = document.getElementById('gemini-export-overlay');
                if (overlay) overlay.remove();

                const oneTurnPanel = document.getElementById('gemini-one-turn-panel');
                if (oneTurnPanel) oneTurnPanel.remove();

                autoExportTriggered = false; // Reset trigger so it fires again on new URLs
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
                    cleanup();
                }

                if (isChatPage) {
                    initMainFunctionality();
                } else {
                    cleanup();
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
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
