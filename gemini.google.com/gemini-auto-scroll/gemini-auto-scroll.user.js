// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.2.25
// @lastModified 2026-03-13
// @description  Automatically scroll endlessly to load all history in Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
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
    // --- Tampermonkey Menu ---
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("現在の会話IDを表示", () => {
            const currentId = findSelectedConversationId();
            if (currentId) {
                alert(`現在の会話ID: ${currentId}`);
            } else {
                alert("会話IDが見つかりませんでした。");
            }
        });
    }

    const SELECTORS = {
        CONVERSATION_ITEM: 'a.conversation, a[data-test-id="conversation"]',
        SPINNER: 'mat-progress-spinner[data-test-id="loading-history-spinner"]',
        SCROLL_CONTAINER: 'nav infinite-scroller, infinite-scroller',
        ERROR_SNACKBAR: 'mat-snack-bar-container'
    };

    const CONSTANTS = {
        STORAGE_KEY: 'gemini_auto_scroll_enabled',
        STORAGE_KEY_MINIMIZED: 'gemini_auto_scroll_minimized',
        PANEL_POSITION_KEY: 'gemini_auto_scroll_panel_position'
    };

    // --- State & Trusted Types ---

    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            // Append a unique suffix to avoid "policy already exists" errors upon userscript hot-reloads or multiple injections
            policy = window.trustedTypes.createPolicy('geminiAutoScroll_' + Math.random().toString(36).substr(2, 9), {
                createHTML: (string) => string
            });
        } catch (e) {
            console.warn('[GeminiAutoScroll] Failed to create trustedTypes policy', e);
        }
    }

    const setInnerHTML = (element, html) => {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

    let isProcessing = false;
    let lastSelectedIndex = -1;
    let scrollInterval = null; // Global reference for cleanup
    let isInitialized = false;
    let uiObserver = null;
    let mainInterval = null;

    // --- State Management ---

    function isAutoScrollEnabled() {
        return localStorage.getItem(CONSTANTS.STORAGE_KEY) === 'true'; // Default to false
    }

    function toggleAutoScroll() {
        const newState = !isAutoScrollEnabled();
        localStorage.setItem(CONSTANTS.STORAGE_KEY, newState);
        updatePanelUI();
        if (newState) {
            attemptScrollToConversation();
        }
    }

    function isPanelMinimized() {
        return localStorage.getItem(CONSTANTS.STORAGE_KEY_MINIMIZED) === 'true';
    }

    function togglePanelMinimized() {
        const newState = !isPanelMinimized();
        localStorage.setItem(CONSTANTS.STORAGE_KEY_MINIMIZED, newState);
        const panel = document.getElementById('gemini-auto-scroll-panel');
        if (panel) {
            panel.classList.toggle('minimized', newState);
        }
    }


    // --- UI Injection ---

    // ICONS removed, using emojis.

    function injectStyles() {
        if (document.getElementById('gemini-auto-scroll-styles')) return;
        const style = document.createElement('style');
        style.id = 'gemini-auto-scroll-styles';
        style.textContent = `
            #gemini-auto-scroll-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background-color: rgba(255, 255, 255, 0.9);
                border: 1px solid #dadce0;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                font-family: 'Google Sans', sans-serif;
                font-size: 14px;
                color: #3c4043;
                width: 260px;
                backdrop-filter: blur(8px);
                display: none; /* Initially hidden */
            }
            #gemini-auto-scroll-panel.ready {
                display: block;
            }
            #gemini-auto-scroll-panel.minimized {
                width: auto;
                background-color: #c2e7ff; /* Light blue */
                color: #001d35; /* Dark text */
                border: 1px solid #c2e7ff;
                padding: 0 12px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-weight: 500;
                font-size: 13px;
                white-space: nowrap;
                backdrop-filter: none;
            }
            #gemini-auto-scroll-panel.minimized .panel-header, 
            #gemini-auto-scroll-panel.minimized .panel-content {
                display: none;
            }
            #gemini-auto-scroll-panel .minimized-summary {
                display: none;
                user-select: none;
            }
            #gemini-auto-scroll-panel.minimized .minimized-summary {
                display: block;
            }
            #gemini-auto-scroll-panel .panel-header {
                padding: 6px 10px;
                border-bottom: 1px solid #e0e0e0;
                cursor: move;
                user-select: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: rgba(241, 243, 244, 0.7);
            }
            #gemini-auto-scroll-panel .panel-header h1 {
                font-size: 14px;
                font-weight: 500;
                margin: 0;
                line-height: 1;
            }
            #gemini-auto-scroll-panel .panel-header .version-badge {
                font-size: 11px;
                background-color: #e8f0fe;
                color: #1967d2;
                padding: 2px 6px;
                border-radius: 4px;
            }
            .gtc-minimize-btn {
                cursor: pointer;
                padding: 0 6px;
                border-radius: 4px;
                user-select: none;
                transition: background 0.2s;
                font-size: 16px;
                line-height: 1;
                color: #5f6368;
                font-weight: bold;
            }
            .gtc-minimize-btn:hover {
                background: rgba(0,0,0,0.1);
            }
            #gemini-auto-scroll-panel .panel-content {
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            #gemini-auto-scroll-panel .auto-scroll-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
                margin-bottom: 8px;
            }
            #gemini-auto-scroll-panel .auto-scroll-btn.stopped {
                background-color: #f1f3f4;
                color: #3c4043;
                border: 1px solid #dadce0;
            }
            #gemini-auto-scroll-panel .auto-scroll-btn.stopped:hover {
                background-color: #e8eaed;
            }
            #gemini-auto-scroll-panel .auto-scroll-btn.running {
                background-color: #ceead6;
                color: #0d652d;
                border: 1px solid #81c995;
            }
            #gemini-auto-scroll-panel .auto-scroll-btn.running:hover {
                background-color: #a8dab5;
            }
            #gemini-auto-scroll-panel .auto-scroll-btn.processing {
                animation: gtc-pulse 1.5s infinite ease-in-out;
            }
            @keyframes gtc-pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }

            #gemini-auto-scroll-panel .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #5f6368;
                border-top: 1px solid #e0e0e0;
                padding-top: 6px;
                margin-top: 2px;
            }
             #gemini-auto-scroll-panel .info-row .gtc-badge {
                font-weight: bold;
                color: #1e8e3e;
            }
            .gtc-conversation-index {
                position: absolute;
                top: 6px;
                left: 6px;
                background-color: rgba(0, 0, 0, 0.7);
                color: #fff;
                font-size: 10px;
                padding: 0 4px;
                border-radius: 4px;
                z-index: 10;
                pointer-events: none;
                font-family: monospace;
            }

            /* --- Custom Scrollbar Styles --- */
            ::-webkit-scrollbar { width: 16px !important; height: 16px !important; background-color: #f0f0f0; display: block !important; }
            ::-webkit-scrollbar-track { background: #e0e0e0; border-left: 1px solid #ccc; }
            ::-webkit-scrollbar-thumb { background-color: #ff6f00; border-radius: 4px; border: 2px solid #e0e0e0; }
            ::-webkit-scrollbar-thumb:hover { background-color: #e65100; }
            conversations-list, .conversations-list, infinite-scroller { scrollbar-color: #ff6f00 #e0e0e0 !important; scrollbar-width: auto !important; }
        `;
        document.head.appendChild(style);
    }

    function getConversationItems() {
        const container = document.querySelector(SELECTORS.SCROLL_CONTAINER) || document;
        const items = container.querySelectorAll(SELECTORS.CONVERSATION_ITEM);
        return Array.from(items);
    }

    function updateConversationIndices() {
        const items = getConversationItems();
        items.forEach((item, index) => {
            if (item.classList.contains('gtc-processed')) {
                const badge = item.querySelector('.gtc-conversation-index');
                if (badge) {
                    const newText = String(index + 1);
                    if (badge.textContent !== newText) {
                        badge.textContent = newText;
                    }
                }
                return;
            }
            if (!item.style.position) {
                item.style.position = 'relative';
            }
            let badge = item.querySelector('.gtc-conversation-index');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'gtc-conversation-index';
                badge.textContent = index + 1;
                item.appendChild(badge);
            }
            item.classList.add('gtc-processed');
        });
        return items.length;
    }

    function getIdFromItem(item) {
        if (!item) return null;

        // Strategy 1: href (Most reliable)
        const href = item.getAttribute('href');
        if (href) {
            const match = href.match(/\/app\/([a-f0-9]{16})/);
            if (match) return match[1];
        }

        // Strategy 2: jslog fallback
        const jslog = item.getAttribute('jslog');
        if (jslog) {
            const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
            if (match) return match[1];
        }
        return null;
    }

    function findSelectedConversationId() {
        const currentItems = getConversationItems();
        const selectedItem = currentItems.find(item => item.classList.contains('selected') || item.getAttribute('aria-current') === 'page' || item.getAttribute('aria-current') === 'true');

        if (selectedItem) {
            const id = getIdFromItem(selectedItem);
            if (id) return id;
        }
        return getConversationIdFromUrl();
    }

    function updatePanelUI() {
        const panel = document.getElementById('gemini-auto-scroll-panel');
        if (!panel) return;

        // Update Auto-Scroll UI
        const scrollBtn = panel.querySelector('.auto-scroll-btn');
        if (scrollBtn) {
            const isScrollEnabled = isAutoScrollEnabled();
            scrollBtn.className = 'auto-scroll-btn';
            
            if (isScrollEnabled) {
                scrollBtn.classList.add('running');
                if (isProcessing) {
                    scrollBtn.classList.add('processing');
                    scrollBtn.textContent = '🏃‍♂️ Scrolling (Click to Stop)';
                } else {
                    scrollBtn.textContent = '⏹️ Stop Auto-Scroll';
                }
            } else {
                scrollBtn.classList.add('stopped');
                scrollBtn.textContent = '▶️ Start Auto-Scroll';
            }
        }

        const count = updateConversationIndices();
        const badge = panel.querySelector('.gtc-badge');
        if (badge) {
            badge.textContent = `${count} items`;
        }

        // Update Summary Text
        const summarySpan = panel.querySelector('.minimized-summary');
        if (summarySpan) {
            const version = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '0.2.18';
            summarySpan.textContent = `Auto-Scroll v${version} | ${count} items | ID: ${findSelectedConversationId() || 'N/A'}`;
        }

        const convIdSpan = panel.querySelector('.conversation-id');
        if (convIdSpan) {
            convIdSpan.textContent = findSelectedConversationId() || 'N/A';
        }

        const items = getConversationItems();
        const selectedIndex = items.findIndex(item => item.classList.contains('selected'));
        if (selectedIndex !== -1) {
            if (lastSelectedIndex !== selectedIndex) {
                console.debug(`[GeminiAutoScroll] Selected index changed from ${lastSelectedIndex} to ${selectedIndex}.`);
                lastSelectedIndex = selectedIndex;
            }
        }
    }

    async function createDraggablePanel() {
        if (document.getElementById('gemini-auto-scroll-panel')) return;

        injectStyles();

        const panel = document.createElement('div');
        panel.id = 'gemini-auto-scroll-panel';

        setInnerHTML(panel, `
            <div class="minimized-summary">Loading...</div>
            <div class="panel-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <h1>${GM_info.script.name}</h1>
                    <span class="version-badge">v${GM_info.script.version}</span>
                </div>
                <span class="gtc-minimize-btn" title="Minimize">−</span>
            </div>
            <div class="panel-content">
                <button class="auto-scroll-btn">▶️ Start Auto-Scroll</button>
                <div class="info-row">
                    <span>Loaded: <span class="gtc-badge">0 items</span></span>
                    <span>ID: <span class="conversation-id">N/A</span></span>
                </div>
            </div>
        `);

        document.body.appendChild(panel);

        panel.querySelector('.auto-scroll-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoScroll();
        });

        // Toggle Expand/Minimize when clicking minimized body
        panel.addEventListener('click', (e) => {
            if (hasDragged) return; // Prevent toggle if the user just finished dragging
            if (panel.classList.contains('minimized') && !e.target.closest('button, input, .gtc-minimize-btn')) {
                togglePanelMinimized();
            }
        });

        const minimizeBtn = panel.querySelector('.gtc-minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePanelMinimized();
            });
        }

        const header = panel.querySelector('.panel-header');
        const summary = panel.querySelector('.minimized-summary');
        let isDragging = false;
        let hasDragged = false;
        let dragOffset = { x: 0, y: 0, startX: 0, startY: 0 };

        const startDrag = (e) => {
            if (e.button !== 0 || e.target.closest('button, input, .gtc-minimize-btn')) return;
            isDragging = true;
            hasDragged = false;
            dragOffset.x = e.clientX - panel.offsetLeft;
            dragOffset.y = e.clientY - panel.offsetTop;
            dragOffset.startX = e.clientX;
            dragOffset.startY = e.clientY;
            panel.style.transition = 'none';
            document.body.style.userSelect = 'none';
        };

        header.addEventListener('mousedown', startDrag);
        summary.addEventListener('mousedown', startDrag);

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            if (!hasDragged && (Math.abs(e.clientX - dragOffset.startX) > 3 || Math.abs(e.clientY - dragOffset.startY) > 3)) {
                hasDragged = true;
            }

            if (!hasDragged) return; // Wait until threshold is met to prevent jitter

            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;

            // Clamp position to be within viewport
            newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - panel.offsetHeight));

            panel.style.left = `${newX}px`;
            panel.style.top = `${newY}px`;
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', async () => {
            if (!isDragging) return;
            isDragging = false;
            panel.style.transition = '';
            document.body.style.userSelect = '';
            if (hasDragged) {
                const pos = { top: panel.style.top, left: panel.style.left };
                await GM_setValue(CONSTANTS.PANEL_POSITION_KEY, pos);
                // Delay clearing hasDragged so the click handler can catch it
                setTimeout(() => hasDragged = false, 50);
            }
        });

        try {
            const savedPos = await GM_getValue(CONSTANTS.PANEL_POSITION_KEY);
            if (savedPos && savedPos.top && savedPos.left) {
                panel.style.top = savedPos.top;
                panel.style.left = savedPos.left;
                panel.style.right = 'auto';
            } else {
                // Default position if none is saved
                panel.style.top = '20px';
                panel.style.right = '20px';
                panel.style.left = 'auto';
            }
        } catch (e) {
            console.error('[GeminiAutoScroll] Failed to load panel position.', e);
            // Fallback default position
            panel.style.top = '20px';
            panel.style.right = '20px';
            panel.style.left = 'auto';
        }

        if (isPanelMinimized()) {
            panel.classList.add('minimized');
        }

        panel.classList.add('ready');

        updatePanelUI();
    }

    // --- Utility Functions ---

    function getConversationIdFromUrl() {
        const match = window.location.pathname.match(/\/(app|gem)\/([a-f0-9]{16})/);
        return match ? (match[2] || match[1]) : null;
    }

    function findScrollableParent(element) {
        let parent = element.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            const isScrollable = (parent.scrollHeight > parent.clientHeight) &&
                (style.overflowY === 'auto' || style.overflowY === 'scroll');
            if (isScrollable) return parent;
            parent = parent.parentElement;
            if (parent === document.body) return null; // Stop at body
        }
        return null;
    }

    function getScrollContainer() {
        const container = document.querySelector(SELECTORS.SCROLL_CONTAINER);
        if (container && isElementScrollable(container)) {
            return container;
        }
        // Fallback
        const anyItem = document.querySelector(SELECTORS.CONVERSATION_ITEM);
        if (anyItem) {
            const scrollParent = findScrollableParent(anyItem);
            if (scrollParent) return scrollParent;
        }
        return container;
    }

    function isElementScrollable(element) {
        const style = window.getComputedStyle(element);
        return (element.scrollHeight > element.clientHeight) &&
            (style.overflowY === 'auto' || style.overflowY === 'scroll');
    }

    function checkErrorState() {
        // Broadly scan for the error message
        const snackbars = document.querySelectorAll(SELECTORS.ERROR_SNACKBAR);
        for (const sb of snackbars) {
            if (sb.textContent.includes("Couldn’t load recent chats") ||
                sb.textContent.includes("Try reloading this page")) {
                return true;
            }
        }
        return false;
    }

    // --- Main Logic ---

    async function attemptScrollToConversation() {
        if (isProcessing) return;
        if (!isAutoScrollEnabled()) return;

        isProcessing = true;
        updatePanelUI();
        console.debug('[GeminiAutoScroll] Auto-scroll loop started.');

        let container = getScrollContainer();

        const scrollDown = () => {
            if (container && isAutoScrollEnabled()) {
                container.scrollTop = 99999999;
            }
        };

        try {
            // Use a simple high-frequency interval to push scroll down.
            // This is actually frequently better than MutationObserver for endless scroll, 
            // since the API fetching bottleneck limits the actual DOM repaint rate anyway.
            scrollInterval = setInterval(() => {
                if (!isAutoScrollEnabled()) {
                    clearInterval(scrollInterval);
                    return;
                }

                if (checkErrorState()) {
                    console.warn('[GeminiAutoScroll] Critical error detected ("Couldn\'t load"). Stopping auto-scroll.');
                    toggleAutoScroll();
                    clearInterval(scrollInterval);
                    alert('Gemini Auto-Scroll halted: "Couldn’t load recent chats" error detected. Please reload the page.');
                    return;
                }

                const currentContainer = getScrollContainer();
                if (currentContainer && currentContainer !== container) {
                    container = currentContainer;
                }

                if (container) scrollDown();

            }, 500);

        } catch (e) {
            console.error('[GeminiAutoScroll] Error in scroll loop:', e);
        } finally {
            // Keep the 'isProcessing = true' flag up as long as interval runs.
            // To cleanly resolve state, we only set false if we exit synchronosly.
            // Since this is infinite via interval, it actually runs until disabled.
            isProcessing = !!scrollInterval;
            updatePanelUI();
        }
    }

    // --- Monitoring ---

    let lastUrl = window.location.href;
    let _debounceTimer;

    uiObserver = new MutationObserver((mutations) => {
        createDraggablePanel();

        // Check for deletions of the selected item
        for (const mutation of mutations) {
            for (const removedNode of mutation.removedNodes) {
                if (removedNode.nodeType === 1) { // Element node
                    const isConversation = removedNode.matches(SELECTORS.CONVERSATION_ITEM) || removedNode.querySelector(SELECTORS.CONVERSATION_ITEM);
                    // Selection handling removed correctly as per migration to gemini-auto-select-next
                }
            }
        }

        // Debounce UI updates
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
            updatePanelUI();
        }, 500);
    });



    function initAutoScroll() {
        if (isInitialized) return;
        isInitialized = true;
        console.debug('[GeminiAutoScroll] Initializing (SPA navigated to /app).');

        uiObserver.observe(document.body, { childList: true, subtree: true });

        mainInterval = setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;

                // Re-trigger scroll when URL changes
                setTimeout(attemptScrollToConversation, 1200);
            }
            // Also periodically ensure UI is accurate
            updatePanelUI();
        }, 1000);

        setTimeout(() => {
            createDraggablePanel();
            attemptScrollToConversation();
        }, 2500);
    }

    function cleanupAutoScroll() {
        if (!isInitialized) return;
        isInitialized = false;
        isProcessing = false;
        console.debug('[GeminiAutoScroll] Cleaning up (SPA navigated away from /app).');

        if (mainInterval) {
            clearInterval(mainInterval);
            mainInterval = null;
        }

        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }

        if (uiObserver) {
            uiObserver.disconnect();
        }

        const panel = document.getElementById('gemini-auto-scroll-panel');
        if (panel) panel.remove();

        const style = document.getElementById('gemini-auto-scroll-styles');
        if (style) style.remove();
    }

    // --- SPA Routing Manager ---
    function checkUrlAndManageScriptState() {
        const isAppPage = /^\/(app|gem)\//.test(location.pathname);
        if (isAppPage) {
            initAutoScroll();
        } else {
            cleanupAutoScroll();
            // Important to always update lastUrl to avoid spurious detection
            lastUrl = window.location.href;
        }
    }

    if (window.navigation) {
        window.navigation.addEventListener('navigatesuccess', () => {
            setTimeout(checkUrlAndManageScriptState, 500);
        });
        console.debug('[GeminiAutoScroll] Using Navigation API for SPA routing.');
    } else {
        // Fallback for older browsers
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(checkUrlAndManageScriptState, 500);
            }
        }, 500);
        console.debug('[GeminiAutoScroll] Using setInterval fallback for SPA routing.');
    }

    // Initial check on load
    if (document.body) {
        checkUrlAndManageScriptState();
    } else {
        window.addEventListener('DOMContentLoaded', checkUrlAndManageScriptState);
    }

})();
