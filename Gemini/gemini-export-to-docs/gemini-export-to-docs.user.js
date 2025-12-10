// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    https://userscript.moukaeritai.work/
// @version      0.1.11
// @description  Adds a 1-click button to export Gemini responses and canvases to Google Docs.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/Gemini/gemini-export-to-docs/gemini-export-to-docs.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/Gemini/gemini-export-to-docs/gemini-export-to-docs.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // svg icons
    // svg icons
    // svg icons
    const DOCS_ICON_PATH = "M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z";
    const CHECK_ICON_PATH = "M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z";

    // --- Selectors (based on provided samples) ---
    const SELECTORS = {
        // Turn selectors
        turnContainer: 'response-container, .response-container', // Broad container to watch
        moreMenuButton: 'button[data-test-id="more-menu-button"]', // The trigger "..."
        exportToDocsButton: 'button[data-test-id="export-to-docs-button"]', // The target in the menu
        exportIntermediateButton: 'button[data-test-id="export-button"]', // Mobile "Export to..." button

        responseHeader: '.response-container-header', // Header area for top button

        // Canvas selectors
        canvasOpenButton: 'button[data-test-id="view-report-button"]', // "Open" button for canvas
        canvasShareButton: 'button[data-test-id="share-button"]', // Share button inside canvas

        // General
        // Updated to include 'actions-bottom-sheet' for mobile view
        menuPanel: '.mat-mdc-menu-panel, .mat-mdc-bottom-sheet-container, actions-bottom-sheet', // Panel that appears

        // Injection targets
        // We will try to inject next to the trigger button for turns
        // And next to the open button for canvas
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
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            element.dispatchEvent(new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true
            }));
        });
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
                background-color: #ceead6; /* Slightly darker green */
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
        `;
        document.head.appendChild(style);
    }

    /**
     * Create the SVG icon element safely
     */
    /**
     * Create the SVG icon element safely
     */
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
    function createExportButton(onClick) {
        const btn = document.createElement('button');
        btn.className = 'gemini-quick-export-btn';
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

                // Success State
                btn.classList.add('exported');
                btn.title = 'Exported!';

                // Clear existing icon safely
                while (iconContainer.firstChild) {
                    iconContainer.removeChild(iconContainer.firstChild);
                }
                iconContainer.appendChild(createIconElement(CHECK_ICON_PATH));

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
     * Flow: Export a Canvas
     * 1. Check if canvas is active. If not, click "Open".
     * 2. Click "Share" (top right of canvas).
     * 3. Wait for options.
     * 4. Click "Export to Docs".
     */
    async function handleCanvasExport(openBtn) {
        console.log('Starting Canvas Export...');

        // 1. Ensure Canvas is Open
        // We assume if we clicked the buttons next to "Open", we might need to open it.
        // However, if the canvas is already open, the "Share" button should be visible elsewhere.
        // But the user requested the button be placed *next to the Open button*.

        simulateClick(openBtn);
        // Wait a bit for the canvas to slide in
        await sleep(1000);

        // 2. Find Share button in the canvas toolbar
        // The canvas usually lives in a side panel or overlay
        // We search document-wide because it might be in a portal
        const shareBtn = await waitForElement(SELECTORS.canvasShareButton);
        if (!shareBtn) throw new Error('Canvas Share button not found (is the canvas open?)');

        simulateClick(shareBtn);

        // 3. Wait for menu
        const menu = await waitForElement(SELECTORS.menuPanel);
        if (!menu) throw new Error('Share menu did not appear');

        // 4. Click Export
        const exportBtn = await waitForElement(SELECTORS.exportToDocsButton, 2000, menu);
        if (!exportBtn) {
            const buttons = Array.from(menu.querySelectorAll('button'));
            const textMatch = buttons.find(b => b.textContent.includes('Docs') || b.textContent.includes('Export'));
            if (textMatch) {
                simulateClick(textMatch);
                return;
            }
            throw new Error('Export button not found in share menu');
        }
        simulateClick(exportBtn);
        console.log('Canvas Export Clicked');
    }

    /**
     * Main logic to inject buttons
     */
    function processNodes() {
        // A. Handle Turn Buttons
        // Find all "More" buttons
        const moreButtons = document.querySelectorAll(SELECTORS.moreMenuButton);
        moreButtons.forEach(moreBtn => {
            // 1. Bottom Injection (Existing)
            // Check if we already injected
            const container = moreBtn.parentElement;
            if (container && !container.querySelector('.gemini-quick-export-btn')) {
                const btn = createExportButton(() => handleTurnExport(moreBtn));
                container.appendChild(btn);
            }

            // 2. Top Injection (New)
            // Navigate up to the main container
            const root = moreBtn.closest(SELECTORS.turnContainer);
            if (root) {
                const header = root.querySelector(SELECTORS.responseHeader);
                // Check if header exists and doesn't have our button
                if (header && !header.querySelector('.gemini-quick-export-btn')) {
                    const btn = createExportButton(() => handleTurnExport(moreBtn));
                    // Usually header has controls. We append to the header.
                    header.appendChild(btn);
                }
            }
        });

        // B. Handle Canvas "Open" Buttons
        const openButtons = document.querySelectorAll(SELECTORS.canvasOpenButton);
        openButtons.forEach(openBtn => {
            const container = openBtn.parentElement;
            if (!container || container.querySelector('.gemini-quick-export-btn')) return;

            const btn = createExportButton(() => handleCanvasExport(openBtn));
            // Canvas Open button is often in a specific "chip" or card.
            container.appendChild(btn);
        });
    }

    /**
     * Initialize
     */
    function init() {
        addStyles();

        // Initial process
        processNodes();

        // Observe for new turns / dynamic content
        const observer = new MutationObserver((mutations) => {
            // Debounce or just run? For simplicity, we run.
            // Optimally we check if relevant nodes were added.
            processNodes();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Wait for body
    if (document.body) {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }

})();
