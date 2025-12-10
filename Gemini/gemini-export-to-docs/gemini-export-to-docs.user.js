// ==UserScript==
// @name         Gemini 1-Click Export to Docs
// @namespace    http://tampermonkey.net/
// @version      0.1.6
// @description  Adds a 1-click button to export Gemini responses and canvases to Google Docs.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/Gemini/gemini-export-to-docs/gemini-export-to-docs.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/Gemini/gemini-export-to-docs/gemini-export-to-docs.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // svg icons
    const DOCS_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg>';

    // --- Selectors (based on provided samples) ---
    const SELECTORS = {
        // Turn selectors
        turnContainer: 'response-container', // Broad container to watch
        moreMenuButton: 'button[data-test-id="more-menu-button"]', // The trigger "..."
        exportToDocsButton: 'button[data-test-id="export-to-docs-button"]', // The target in the menu
        exportIntermediateButton: 'button[data-test-id="export-button"]', // Mobile "Export to..." button

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
                background-color: transparent;
                cursor: pointer;
                margin-left: 8px;
                color: #5f6368;
                transition: background-color 0.2s;
                position: relative; /* Fix for stacking context */
                z-index: 1000;      /* Ensure it sits on top */
                pointer-events: auto; /* Force events */
            }
            .gemini-quick-export-btn:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            .gemini-quick-export-btn svg {
                fill: currentColor;
            }
            .gemini-quick-export-btn.exporting {
                color: #1a73e8;
                border-color: #1a73e8;
                animation: pulse 1s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create the SVG icon element safely
     */
    function createSvgIcon() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("height", "20");
        svg.setAttribute("viewBox", "0 -960 960 960");
        svg.setAttribute("width", "20");
        svg.setAttribute("fill", "currentColor");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z");

        svg.appendChild(path);
        return svg;
    }

    /**
     * Create the export button
     */
    function createExportButton(onClick) {
        const btn = document.createElement('button');
        btn.className = 'gemini-quick-export-btn';
        btn.title = '1-Click Export to Docs';
        // Fix: Use DOM creation instead of innerHTML to avoid TrustedHTML violation
        btn.appendChild(createSvgIcon());

        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (btn.classList.contains('exporting')) return;

            btn.classList.add('exporting');
            try {
                await onClick();
            } catch (err) {
                console.error('Export failed:', err);
                alert('Export failed. See console for details.');
            } finally {
                btn.classList.remove('exporting');
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
    async function handleTurnExport(triggerBtn) {
        console.log('Starting Turn Export...');

        // 1. Click trigger
        simulateClick(triggerBtn);

        // 2. Wait for menu
        // The menu usually appears at the end of the body
        let menu = await waitForElement(SELECTORS.menuPanel);
        if (!menu) throw new Error('Menu did not appear');

        // 3. Find Export button
        // First try direct "Export to Docs" (Desktop)
        let exportBtn = await waitForElement(SELECTORS.exportToDocsButton, 1000, menu);

        if (!exportBtn) {
            // Check for Mobile "Export to..." flow
            const intermediateBtn = await waitForElement(SELECTORS.exportIntermediateButton, 500, menu);
            if (intermediateBtn) {
                console.log('Mobile layout detected: clicking intermediate export button');
                simulateClick(intermediateBtn);

                // Wait for the SECOND menu/sheet
                // We pause briefly to let the old one disappear or new one appear.
                // Since waitForElement checks existence, we might need to be careful if the old menu DOM stays.
                // Usually Angular Material replaces or adds a new container.
                await sleep(500);

                // Re-query for the menu panel (it might be a new DOM element)
                // In some cases we might need to look for a different panel, but usually it's the same class
                // We'll search document-wide for the 'Export to Docs' button now, assuming it's visible
                exportBtn = await waitForElement(SELECTORS.exportToDocsButton, 2000, document.body);
            }
        }

        if (!exportBtn) {
            // It might be inside a submenu or the selector might vary. 
            // Fallback: look for text "Docs" or "Export"
            // We search in the document body just in case the menu ref changed
            const buttons = Array.from(document.querySelectorAll(`${SELECTORS.menuPanel} button`));
            const textMatch = buttons.find(b => b.textContent.includes('Export to Docs'));
            if (textMatch) {
                simulateClick(textMatch);
                return;
            }
            throw new Error('Export button not found in menu');
        }

        simulateClick(exportBtn);
        console.log('Turn Export Clicked');

        // Close menu if it persists (usually auto-closes on click)
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
            // Check if we already injected
            const container = moreBtn.parentElement;
            if (!container || container.querySelector('.gemini-quick-export-btn')) return;

            // Create button
            const btn = createExportButton(() => handleTurnExport(moreBtn));

            // Insert before the "More" button (or after, depending on preference. "Start of line to the right" implies near it)
            // The user said "upper right of the response start line" or "next to the footer buttons".
            // The `more-menu-button` is usually in the footer actions row.
            // We append it to the same container to sit alongside.
            container.appendChild(btn);
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
