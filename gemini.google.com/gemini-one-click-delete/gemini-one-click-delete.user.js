// ==UserScript==
// @name         Gemini 1-Click Delete Conversation
// @namespace    https://userscript.moukaeritai.work/
// @version      0.1.16
// @description  Adds a 1-click button to delete the current Gemini conversation.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @grant        GM_info
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1' || location.hostname === 'fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev') {
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
        // ... (selectors remain the same)
    };

    // --- State Management ---
    let mainObserver = null;
    let keydownListener = null;
    let styleElement = null;
    let isInitialized = false;

    /**
     * Sleep helper
     */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Wait for element helper
     */
    async function waitForElement(selector, timeout = 5000, context = document) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = context.querySelector(selector);
            if (el) return el;
            await sleep(100);
        }
        return null;
    }

    /**
     * Simulate click event
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
     * Create safely constructed SVG element
     */
    function createSvgElement() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("height", "20");
        svg.setAttribute("viewBox", "0 -960 960 960");
        svg.setAttribute("width", "20");
        svg.setAttribute("fill", "currentColor");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z");

        svg.appendChild(path);
        return svg;
    }

    /**
     * Create the custom delete button
     */
    function createDeleteButton(onClick, isFloating = false) {
        const btn = document.createElement('button');
        btn.className = isFloating ? 'gemini-quick-delete-btn floating' : 'gemini-quick-delete-btn';
        btn.title = '1-Click Delete Conversation';
        if (isFloating) {
            btn.style.display = 'none';
        }
        btn.appendChild(createSvgElement());

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (btn.classList.contains('processing') || btn.disabled) return;

            btn.classList.add('processing');
            try {
                await onClick();
            } catch (err) {
                console.error('Delete failed:', err);
                alert('Failed to delete conversation. See console.');
            } finally {
                btn.classList.remove('processing');
            }
        });

        return btn;
    }

    /**
     * Style injection
     */
    function addStyles() {
        const style = document.createElement('style');
        style.id = 'gemini-one-click-delete-style';
        style.textContent = `
            /* ... (styles remain the same) */
        `;
        document.head.appendChild(style);
        return style;
    }

    /**
     * Main Delete Logic
     */
    async function handleDelete(triggerBtn) {
        // ... (handleDelete logic remains the same)
    }

    /**
     * Helper to get Conversation ID from Main View
     */
    function getConversationIdFromMainView() {
        // ... (getConversationIdFromMainView logic remains the same)
    }

    /**
     * Helper to find Sidebar Item by ID
     */
    function findSidebarItem(conversationId) {
        // ... (findSidebarItem logic remains the same)
    }

    /**
     * Update Floating Button State
     */
    function updateFloatingButton(btn, conversationId) {
        // ... (updateFloatingButton logic remains the same)
    }

    /**
     * Inject buttons into DOM
     */
    function processNodes() {
        // ... (processNodes logic remains the same)
    }

    /**
     * Handle Keyboard Shortcut (Ctrl+D)
     */
    async function handleKeyboardShortcut(e) {
        // ... (handleKeyboardShortcut logic remains the same)
    }

    /**
     * Main initialization for the script's features.
     */
    function initMainFunctionality() {
        if (isInitialized) return;
        console.log('[Gemini 1-Click Delete] Initializing...');

        styleElement = addStyles();
        processNodes(); // Initial run

        mainObserver = new MutationObserver(processNodes);
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
        console.log('[Gemini 1-Click Delete] Cleaning up...');

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
        document.querySelectorAll('.gemini-quick-delete-btn').forEach(btn => btn.remove());

        isInitialized = false;
    }

    /**
     * Checks the URL and runs init or cleanup accordingly.
     */
    function checkUrlAndManageScriptState() {
        const isChatPage = /^\/app\/[a-f0-9]{16}/.test(location.pathname);

        if (isChatPage) {
            initMainFunctionality();
        } else {
            cleanup();
        }
    }

    // --- Entry Point ---
    // Use a MutationObserver to detect SPA navigation changes.
    // Observing the body for childList changes is a common way to catch page transitions.
    const pageObserver = new MutationObserver(checkUrlAndManageScriptState);

    if (document.body) {
        pageObserver.observe(document.body, { childList: true, subtree: false });
        // Initial check in case the page is loaded directly.
        checkUrlAndManageScriptState();
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            pageObserver.observe(document.body, { childList: true, subtree: false });
            checkUrlAndManageScriptState();
        });
    }

})();
