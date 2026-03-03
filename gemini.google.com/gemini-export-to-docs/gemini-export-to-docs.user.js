// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    https://userscript.moukaeritai.work/
// @version      0.3.9
// @lastModified 2026-03-03
// @description  Adds a 1-click button to export Gemini responses and canvases to Google Docs.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
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
        'userscript.moukaeritai.work',
        '127.0.0.1'
    ];
    const installCheckSuffixes = [
        '.app.github.dev'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname) ||
        installCheckSuffixes.some(suffix => location.hostname.endsWith(suffix));

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
        aiTurnContainer: 'model-response, .model-response', // Specifically AI responses for 1-turn tracking
        presentedContainer: '.presented-response-container', // Most stable selector for the model's response wrapper
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
            /* 1-Turn Panel */
            #gemini-one-turn-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: rgba(28, 28, 30, 0.85);
                backdrop-filter: blur(12px) saturate(180%);
                -webkit-backdrop-filter: blur(12px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                padding: 12px;
                display: none;
                flex-direction: column;
                gap: 10px;
                z-index: 9999;
                font-family: 'Google Sans', sans-serif;
                min-width: 200px;
                color: white;
            }
            #gemini-one-turn-panel.visible {
                display: flex;
            }
            .one-turn-header {
                font-size: 13px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 6px;
                margin-bottom: 2px;
            }
            .one-turn-controls {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
            }
            .one-turn-controls input {
                width: 45px;
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                color: white;
                padding: 2px 4px;
                text-align: center;
            }
            #gemini-btn-one-turn-exec {
                background-color: #1a73e8;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 16px;
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
        } else if (panel) {
            panel.classList.remove('visible');
        }
    }

    function createOneTurnPanel() {
        const panel = document.createElement('div');
        panel.id = 'gemini-one-turn-panel';

        const header = document.createElement('div');
        header.className = 'one-turn-header';
        header.textContent = '1-Turn Auto Export';

        const controls = document.createElement('div');
        controls.className = 'one-turn-controls';
        controls.textContent = 'Wait (sec): ';

        const delayInput = document.createElement('input');
        delayInput.type = 'number';
        delayInput.min = '0';
        delayInput.value = GM_getValue(AUTO_DELETE_DELAY_KEY, 3);
        delayInput.onchange = () => GM_setValue(AUTO_DELETE_DELAY_KEY, parseInt(delayInput.value, 10) || 0);
        controls.appendChild(delayInput);

        const execBtn = document.createElement('button');
        execBtn.id = 'gemini-btn-one-turn-exec';
        const iconSpan = document.createElement('span');
        iconSpan.style.display = 'flex';
        iconSpan.appendChild(createIconElement(DOCS_ICON_PATH));
        execBtn.appendChild(iconSpan);
        execBtn.appendChild(document.createTextNode('Export & Delete'));

        execBtn.onclick = async () => {
            const moreBtn = document.querySelector(SELECTORS.moreMenuButton);
            if (!moreBtn) {
                alert('Could not find export menu.');
                return;
            }

            execBtn.disabled = true;
            showOverlay();
            try {
                // 1. Export
                await handleTurnExport(moreBtn);

                // 2. Countdown & Wait
                let delay = parseInt(delayInput.value, 10);
                if (isNaN(delay)) delay = 3;

                for (let i = delay; i > 0; i--) {
                    execBtn.textContent = `Deleting in ${i}s...`;
                    await sleep(1000);
                }
                execBtn.textContent = 'Deleting...';

                // 3. Dispatch Delete Event
                console.log('[Gemini 1-Turn Export] Requesting conversation deletion.');
                window.dispatchEvent(new CustomEvent('gemini-one-click-delete:request-delete'));

            } catch (err) {
                console.error('1-Turn auto process failed:', err);
                alert('Process failed. See console.');
                execBtn.disabled = false;
                execBtn.textContent = 'Export & Delete';
            } finally {
                hideOverlay();
            }
        };

        panel.appendChild(header);
        panel.appendChild(controls);
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

        // Initial run - delayed scan for the current page state to allow Gemini to finish rendering
        setTimeout(() => {
            console.log('[Gemini 1-Click Export] Running initial scan...');
            processNodes();
        }, 1000);

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

        isInitialized = false;
    }

    /**
     * Checks the URL and runs init or cleanup accordingly.
     */
    function checkUrlAndManageScriptState() {
        const isChatPage = /^\/(app|gem)\/[a-f0-9]{16}/.test(location.pathname);

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
                lastUrl = window.location.href;
                checkUrlAndManageScriptState();
            }, 500);
        });
        console.log('[Gemini 1-Click Export to Docs] Using Navigation API for SPA routing.');
    } else {
        // Fallback for older browsers
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(checkUrlAndManageScriptState, 500);
            }
        }, 500);
        console.log('[Gemini 1-Click Export to Docs] Using setInterval fallback for SPA routing.');
    }

    // Initial check on load
    if (document.body) {
        checkUrlAndManageScriptState();
    } else {
        window.addEventListener('DOMContentLoaded', checkUrlAndManageScriptState);
    }

})();
