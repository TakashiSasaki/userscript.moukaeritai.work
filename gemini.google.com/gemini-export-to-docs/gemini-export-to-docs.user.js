// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    https://userscript.moukaeritai.work/
// @version      0.4.18
// @description  Adds a 1-click button to export Gemini responses and canvases to Google Docs.
// @lastModified 2026-03-12
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
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
    // Removed initial URL check as it will be handled dynamically

    // svg icons
    // svg icons
    // svg icons
    const DOCS_ICON_PATH = "M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z";
    const CHECK_ICON_PATH = "M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z";

    // --- Selectors (based on provided samples) ---
    const SELECTORS = {
        // Turn selectors
        // Turn selectors
        turnContainer: 'model-response, response-container, .response-container', // Broad container to watch
        aiTurnContainer: 'model-response', // Specifically AI response tags
        presentedContainer: '.presented-response-container, message-content, .message-content', // Most stable selector for the model's response wrapper
        moreMenuButton: 'button[data-test-id="more-menu-button"]', // The trigger "..."
        exportToDocsButton: 'button[data-test-id="export-to-docs-button"]', // The target in the menu
        exportIntermediateButton: 'button[data-test-id="export-button"]', // Mobile "Export to..." button

        responseHeader: '.response-container-header', // Header area code (fallback if needed)

        // General
        // Updated to include 'actions-bottom-sheet' for mobile view
        menuPanel: '.mat-mdc-menu-panel, .mat-mdc-bottom-sheet-container, actions-bottom-sheet', // Panel that appears

        // Injection targets
        // We will try to inject next to the trigger button for turns
    };

    /**
     * Sleep for a given amount of milliseconds
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Waits for an element to appear in the DOM
     */
    async function waitForElement(selector, timeout = 5000, context = document) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const el = context.querySelector(selector);
            if (el) return el;
            await sleep(100);
        }
        return null;
    }

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
        const style = document.createElement('style');
        style.textContent = `
            .gemini-quick-export-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                height: 32px;
                border-radius: 16px;
                border: 1px solid #ccc;
                background-color: #e6f4ea; /* Light green */
                cursor: pointer;
                margin-left: 8px;
                color: #5f6368;
                transition: all 0.2s;
                position: relative;
                z-index: 1000;
            }
            .gemini-quick-export-btn:hover {
                background-color: var(--mdc-icon-button-hover-state-layer-color, rgba(68, 71, 70, 0.08));
            }
            .gemini-quick-export-btn.top-right {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 10;
                background-color: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(4px);
            }
            .gemini-quick-export-btn.bottom-right {
                position: absolute;
                bottom: 8px;
                right: 8px;
                z-index: 10;
                background-color: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(4px);
            }
            @media (prefers-color-scheme: dark) {
                .gemini-quick-export-btn.top-right,
                .gemini-quick-export-btn.bottom-right {
                    background-color: rgba(30, 30, 30, 0.8);
                }
            }
            .gemini-quick-export-btn.exported {
                background-color: #1e8e3e; /* Google Green */
                color: white;
                border-color: #1e8e3e;
            }
            .gemini-quick-export-btn svg {
                fill: currentColor;
            }
            /* Overlay */
            #gemini-export-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.7);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-family: inherit;
                font-size: 16px;
                color: #333;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
            }
            #gemini-export-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }
            /* Spinner */
            .gemini-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #1a73e8;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            /* 1-Turn Horizontal Action Bar */
            #gemini-one-turn-panel {
                position: fixed;
                background-color: rgba(28, 28, 30, 0.85);
                backdrop-filter: blur(12px) saturate(180%);
                -webkit-backdrop-filter: blur(12px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 24px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                padding: 6px 12px;
                display: none;
                flex-direction: row;
                align-items: center;
                gap: 12px;
                z-index: 9999;
                font-family: 'Google Sans', sans-serif;
                color: white;
                user-select: none;
            }
            #gemini-one-turn-panel.visible {
                display: flex;
            }
            .one-turn-drag-handle {
                cursor: move;
                cursor: grab;
                color: rgba(255, 255, 255, 0.5);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding-right: 12px;
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                margin-right: 12px;
                user-select: none;
            }
            .one-turn-drag-icon {
                font-size: 16px;
                line-height: 1;
            }
            .one-turn-version {
                font-size: 9px;
                opacity: 0.7;
                margin-top: 2px;
                line-height: 1;
            }
            .one-turn-drag-handle:hover {
                opacity: 1;
            }
            .one-turn-controls-col {
                display: flex;
                flex-direction: column;
                gap: 4px;
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                padding-right: 12px;
            }
            .one-turn-row {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.9);
            }
            .one-turn-row label {
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
            }
            .one-turn-row span.r-label {
                width: 60px;
                text-align: right;
                opacity: 0.8;
            }
            .one-turn-controls-col input[type="number"] {
                width: 40px;
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                color: white;
                padding: 2px 4px;
                text-align: center;
            }
            .one-turn-controls-col input[type="checkbox"] {
                cursor: pointer;
                accent-color: #1a73e8;
            }
            #gemini-btn-one-turn-exec {
                background-color: #1a73e8;
                color: white;
                border: none;
                border-radius: 16px;
                padding: 6px 14px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s, transform 0.1s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            #gemini-btn-one-turn-exec:hover {
                background-color: #1b66c9;
            }
            #gemini-btn-one-turn-exec:active {
                transform: scale(0.98);
            }
            #gemini-btn-one-turn-exec:disabled {
                background-color: #5f6368;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
        return style;
    }

    /**
     * Create the SVG icon element safely
     */
    function createIconElement(pathData) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("height", "20");
        svg.setAttribute("viewBox", "0 -960 960 960");
        svg.setAttribute("width", "20");
        svg.setAttribute("fill", "currentColor");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);

        svg.appendChild(path);
        return svg;
    }

    /**
     * Manage Overlay
     */
    function showOverlay() {
        let overlay = document.getElementById('gemini-export-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gemini-export-overlay';

            const spinner = document.createElement('div');
            spinner.className = 'gemini-spinner';

            const text = document.createElement('div');
            text.textContent = 'Exporting to Docs...';

            overlay.appendChild(spinner);
            overlay.appendChild(text);
            document.body.appendChild(overlay);
        }
        overlay.classList.add('visible');
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
            iconContainer.appendChild(createIconElement(CHECK_ICON_PATH));
        }
    }

    /**
     * Create the export button
     */
    function createExportButton(onClick, positionClass = null) {
        const btn = document.createElement('button');
        btn.className = 'gemini-quick-export-btn';
        if (positionClass) btn.classList.add(positionClass);
        btn.title = '1-Click Export to Docs';

        // Initial Icon
        const iconContainer = document.createElement('span');
        iconContainer.style.display = 'flex';
        iconContainer.appendChild(createIconElement(DOCS_ICON_PATH));
        btn.appendChild(iconContainer);

        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (btn.classList.contains('exported')) return; // Already done

            showOverlay();
            try {
                await onClick();

                // Success State - Sync across same container
                // 1. Try to find the common turn container
                const container = btn.closest(SELECTORS.turnContainer);
                if (container) {
                    // Turn mode: Find all buttons in this response/turn
                    const allBtns = container.querySelectorAll('.gemini-quick-export-btn');
                    allBtns.forEach(b => markAsExported(b));
                } else {
                    // Canvas or other mode: just update self
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
            await sleep(100);
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
        await sleep(200);

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
                await sleep(100);
            }

            if (intermediateBtn) {
                console.log('Mobile layout detected: clicking intermediate export button');
                simulateClick(intermediateBtn);
                await sleep(500); // Wait for submenu

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
        await sleep(100);
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

    const AUTO_DELETE_DELAY_KEY = 'gemini-export-auto-delete-delay';
    const AUTO_URL_DELAY_KEY = 'gemini-export-auto-url-delay';
    const AUTO_URL_TOGGLE_KEY = 'gemini-export-auto-url-toggle';
    const AUTO_DELETE_TOGGLE_KEY = 'gemini-export-auto-delete-toggle';

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
        const urlRegex = /(https?:\/\/[^\s"'<>()]+)/gi;
        const matches = text.match(urlRegex) || [];

        if (typeof elOrText === 'object' && elOrText.querySelectorAll) {
            const anchors = elOrText.querySelectorAll('a[href]');
            anchors.forEach(a => {
                if (a.href && a.href.startsWith('http')) {
                    matches.push(a.href);
                }
            });
        }
        // Return unique URLs
        return [...new Set(matches)];
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
        const activeTurns = turns;

        console.log(`[Gemini 1-Turn] Found ${activeTurns.length} active AI turns using ${SELECTORS.aiTurnContainer}`);

        // A 1-turn conversation usually has exactly 1 model-response
        const isOneTurn = activeTurns.length === 1;

        let panel = document.getElementById('gemini-one-turn-panel');
        if (isOneTurn) {
            if (!panel) {
                panel = createOneTurnPanel();
            }
            panel.classList.add('visible');

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

                                const delayStr = GM_getValue(AUTO_URL_DELAY_KEY, 5);
                                let countdown = parseInt(delayStr, 10);
                                if (isNaN(countdown)) countdown = 5;

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

                                        execBtn.textContent = ''; // Safely clear children (avoids TrustedHTML issue)
                                        const iconSpan = document.createElement('span');
                                        iconSpan.style.display = 'flex';
                                        iconSpan.appendChild(createIconElement(DOCS_ICON_PATH));
                                        execBtn.appendChild(iconSpan);
                                        execBtn.appendChild(document.createTextNode(willDelete ? 'Export & Delete' : 'Export'));

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
                                        execBtn.textContent = `Cancel Auto (${countdown}s)`;
                                    };
                                    updateButtonUI();

                                    autoExportTimerId = setInterval(() => {
                                        countdown--;
                                        if (countdown <= 0) {
                                            if (autoExportTimerId) clearInterval(autoExportTimerId);
                                            autoExportTimerId = null;
                                            execBtn.onclick = originalOnClick;
                                            runExportProcess(0, true, true);
                                        } else {
                                            updateButtonUI();
                                        }
                                    }, 1000);
                                } else {
                                    autoExportTimerId = setTimeout(() => {
                                        autoExportTimerId = null;
                                        runExportProcess(0, true, true);
                                    }, countdown * 1000);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Gemini 1-Turn Auto] Error matching URLs:', e);
                }
            }
        } else if (panel) {
            panel.classList.remove('visible');
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
    async function runExportProcess(delayInputVal, willDelete, isAutoRun = false) {
        const moreBtn = document.querySelector(SELECTORS.moreMenuButton);
        if (!moreBtn) {
            alert('Could not find export menu.');
            return;
        }

        const execBtn = document.getElementById('gemini-btn-one-turn-exec');
        if (execBtn) execBtn.disabled = true;
        showOverlay();

        try {
            // 1. Export
            await handleTurnExport(moreBtn);

            if (willDelete) {
                // 2. Countdown & Wait
                let delay = parseInt(delayInputVal, 10);
                if (isNaN(delay)) delay = 3;

                for (let i = delay; i > 0; i--) {
                    if (execBtn) {
                        execBtn.textContent = isAutoRun ? `Auto Delete in ${i}s...` : `Deleting in ${i}s...`;
                        execBtn.style.backgroundColor = '#e53935'; // Red deleting warning
                        execBtn.style.color = 'white';
                    }
                    await sleep(1000);
                }
                if (execBtn) execBtn.textContent = 'Deleting...';

                // 3. Dispatch Delete Event
                console.log('[Gemini 1-Turn Export] Requesting conversation deletion.');
                window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));
            } else {
                console.log('[Gemini 1-Turn Export] Auto-delete skipped based on setting.');
                if (execBtn) execBtn.textContent = 'Done!';
                await sleep(2000);
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
                    execBtn.textContent = '';
                    const iconSpan = document.createElement('span');
                    iconSpan.style.display = 'flex';
                    iconSpan.appendChild(createIconElement(DOCS_ICON_PATH));
                    execBtn.appendChild(iconSpan);
                    execBtn.appendChild(document.createTextNode(deleteCheckbox.checked ? 'Export & Delete' : 'Export'));
                } else {
                    execBtn.textContent = 'Export';
                }
            }
        }
    }

    function createOneTurnPanel() {
        // Load position
        const savedPos = GM_getValue('gemini-export-panel-pos', { bottom: '20px', right: '20px' });

        const panel = document.createElement('div');
        panel.id = 'gemini-one-turn-panel';
        if (savedPos.top) panel.style.top = savedPos.top;
        else panel.style.bottom = savedPos.bottom;
        if (savedPos.left) panel.style.left = savedPos.left;
        else panel.style.right = savedPos.right;

        const dragHandle = document.createElement('div');
        dragHandle.className = 'one-turn-drag-handle';
        dragHandle.title = `Gemini 1-Turn Auto Export v${GM_info.script.version}`;

        const dragIcon = document.createElement('span');
        dragIcon.className = 'one-turn-drag-icon';
        dragIcon.textContent = '⠿';

        const versionText = document.createElement('span');
        versionText.className = 'one-turn-version';
        versionText.textContent = `v${GM_info.script.version}`;

        dragHandle.appendChild(dragIcon);
        dragHandle.appendChild(versionText);

        // Dragging Logic
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset.x = e.clientX - panel.offsetLeft;
            offset.y = e.clientY - panel.offsetTop;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
            panel.style.top = (e.clientY - offset.y) + 'px';
            panel.style.left = (e.clientX - offset.x) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
                GM_setValue('gemini-export-panel-pos', { top: panel.style.top, left: panel.style.left });
            }
        });

        const controlsCol = document.createElement('div');
        controlsCol.className = 'one-turn-controls-col';

        // --- ROW 1: Manual Sub-Controls ---
        const manualRow = document.createElement('div');
        manualRow.className = 'one-turn-row';

        const manualWaitLabel = document.createElement('label');
        const rLabelManual = document.createElement('span');
        rLabelManual.className = 'r-label';
        rLabelManual.textContent = 'Wait(s):';
        manualWaitLabel.appendChild(rLabelManual);
        const manualDelayInput = document.createElement('input');
        manualDelayInput.type = 'number';
        manualDelayInput.min = '0';
        manualDelayInput.value = GM_getValue(AUTO_DELETE_DELAY_KEY, 3);
        manualDelayInput.onchange = () => GM_setValue(AUTO_DELETE_DELAY_KEY, parseInt(manualDelayInput.value, 10) || 0);
        manualWaitLabel.appendChild(manualDelayInput);

        const deleteLabel = document.createElement('label');
        const deleteCheckbox = document.createElement('input');
        deleteCheckbox.type = 'checkbox';
        deleteCheckbox.id = 'gemini-auto-delete-cb'; // For referencing in runExportProcess
        deleteCheckbox.checked = GM_getValue(AUTO_DELETE_TOGGLE_KEY, true);
        deleteLabel.appendChild(deleteCheckbox);
        deleteLabel.appendChild(document.createTextNode('Auto-Delete'));

        manualRow.appendChild(manualWaitLabel);
        manualRow.appendChild(deleteLabel);

        // --- ROW 2: Auto(URL) Sub-Controls ---
        const autoRow = document.createElement('div');
        autoRow.className = 'one-turn-row';

        const autoWaitLabel = document.createElement('label');
        const rLabelAuto = document.createElement('span');
        rLabelAuto.className = 'r-label';
        rLabelAuto.title = 'Wait time applied when 1 URL matches exactly between prompt and response';
        rLabelAuto.textContent = 'Auto(URL):';
        autoWaitLabel.appendChild(rLabelAuto);
        const autoDelayInput = document.createElement('input');
        autoDelayInput.type = 'number';
        autoDelayInput.min = '0';
        autoDelayInput.value = GM_getValue(AUTO_URL_DELAY_KEY, 5);
        autoDelayInput.onchange = () => GM_setValue(AUTO_URL_DELAY_KEY, parseInt(autoDelayInput.value, 10) || 0);
        autoWaitLabel.appendChild(autoDelayInput);

        const autoEnableLabel = document.createElement('label');
        const autoEnableCheckbox = document.createElement('input');
        autoEnableCheckbox.type = 'checkbox';
        autoEnableCheckbox.checked = GM_getValue(AUTO_URL_TOGGLE_KEY, false);
        autoEnableCheckbox.onchange = () => GM_setValue(AUTO_URL_TOGGLE_KEY, autoEnableCheckbox.checked);
        autoEnableLabel.appendChild(autoEnableCheckbox);
        autoEnableLabel.appendChild(document.createTextNode('Enable'));

        autoRow.appendChild(autoWaitLabel);
        autoRow.appendChild(autoEnableLabel);

        controlsCol.appendChild(manualRow);
        controlsCol.appendChild(autoRow);

        // Execute Button
        const execBtn = document.createElement('button');
        execBtn.id = 'gemini-btn-one-turn-exec';

        const updateBtnText = () => {
            execBtn.textContent = '';
            const iconSpan = document.createElement('span');
            iconSpan.style.display = 'flex';
            iconSpan.appendChild(createIconElement(DOCS_ICON_PATH));
            execBtn.appendChild(iconSpan);
            execBtn.appendChild(document.createTextNode(deleteCheckbox.checked ? 'Export & Delete' : 'Export'));
        };
        updateBtnText();

        deleteCheckbox.onchange = () => {
            GM_setValue(AUTO_DELETE_TOGGLE_KEY, deleteCheckbox.checked);
            updateBtnText();
        };

        execBtn.onclick = () => {
            const willDelete = deleteCheckbox.checked;
            runExportProcess(manualDelayInput.value, willDelete, false);
        };

        panel.appendChild(dragHandle);
        panel.appendChild(controlsCol);
        panel.appendChild(execBtn);
        document.body.appendChild(panel);
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

    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiExportDocs_' + Math.random().toString(36).substr(2, 9), {
                createHTML: (string) => string
            });
        } catch (e) {
            console.error('Failed to create TrustedTypes policy', e);
        }
    }

    function setInnerHTML(element, html) {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    }

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
        const isChatPage = /^\/(app|gem)\/[a-f0-9]{16}/.test(location.pathname);

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

})();
