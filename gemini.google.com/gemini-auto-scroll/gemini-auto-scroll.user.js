// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.2.10
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
    if (!/^\/app/.test(location.pathname)) return;

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
        CONVERSATION_ITEM: 'div[data-test-id="conversation"], div[jslog*="c_"]', // Combined for matches(), but use getConversationItems() for retrieval
        SPINNER: 'mat-progress-spinner[data-test-id="loading-history-spinner"]',
        SCROLL_CONTAINER: '.conversations-container, conversations-list', // Updated to target the inner container first
        MENU_BUTTON: 'side-nav-menu-button',
        ERROR_SNACKBAR: 'mat-snack-bar-container',
        ERROR_LABEL: '.mat-mdc-snack-bar-label'
    };

    const CONSTANTS = {
        MAX_RETRIES: 20,
        ENDLESS_RETRIES: 300, // "Endless" enough for most cases
        SPINNER_WAIT_MS: 3000,
        SCROLL_DELAY_MS: 500,
        STORAGE_KEY: 'gemini_auto_scroll_enabled',
        STORAGE_KEY_AUTOSWITCH: 'gemini_auto_switch_enabled',
        STORAGE_KEY_LOG_VISIBLE: 'gemini_log_panel_visible'
    };

    // --- State & Trusted Types ---

    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiAutoScroll', {
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

    function isAutoSwitchEnabled() {
        // Default to true for existing users
        return localStorage.getItem(CONSTANTS.STORAGE_KEY_AUTOSWITCH) !== 'false';
    }

    function toggleAutoSwitch() {
        const newState = !isAutoSwitchEnabled();
        localStorage.setItem(CONSTANTS.STORAGE_KEY_AUTOSWITCH, newState);
        updatePanelUI();
    }

    function isLogPanelVisible() {
        return localStorage.getItem(CONSTANTS.STORAGE_KEY_LOG_VISIBLE) === 'true';
    }

    function toggleLogPanelVisibility() {
        const newState = !isLogPanelVisible();
        localStorage.setItem(CONSTANTS.STORAGE_KEY_LOG_VISIBLE, newState);
        updatePanelUI();
        const logPanel = document.getElementById('gemini-auto-scroll-log-panel');
        if (logPanel) {
            logPanel.style.display = newState ? 'flex' : 'none';
        }
    }


    // --- Log Panel ---
    const log = (message) => {
        if (!isLogPanelVisible()) return;
        const logPanel = document.getElementById('gemini-auto-scroll-log-panel-content');
        if (logPanel) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = `[${timestamp}] ${message}`;
            logPanel.appendChild(logEntry);
            // Auto-scroll to the bottom
            logPanel.scrollTop = logPanel.scrollHeight;
        }
        console.log(`[GeminiAutoScroll LOG] ${message}`);
    };


    // --- UI Injection ---

    const ICONS = {
        CHECKED: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M280-520l-80-80-120 120 200 200 400-400-120-120-280 280z"/></svg>`,
        UNCHECKED: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200zm0-80h560v-560H200v560z"/></svg>`
    };

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
                width: 280px;
                backdrop-filter: blur(8px);
                display: none; /* Initially hidden */
            }
            #gemini-auto-scroll-panel.ready {
                display: block;
            }
            #gemini-auto-scroll-panel .panel-header {
                padding: 8px 12px;
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
            #gemini-auto-scroll-panel .panel-content {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #gemini-auto-scroll-panel .control-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            #gemini-auto-scroll-panel .control-row label {
                font-weight: 500;
            }
            #gemini-auto-scroll-panel .toggle-switch {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #gemini-auto-scroll-panel .gtc-toggle-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                border: none;
                background-color: transparent;
                cursor: pointer;
                transition: background-color 0.2s;
                padding: 4px;
            }
            #gemini-auto-scroll-panel .gtc-toggle-btn:hover {
                background-color: rgba(60, 64, 67, 0.08);
            }
            #gemini-auto-scroll-panel .gtc-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
            }
            #gemini-auto-scroll-panel .gtc-toggle-btn.enabled .gtc-icon { color: #1a73e8; }
            #gemini-auto-scroll-panel .gtc-toggle-btn.disabled .gtc-icon { color: #5f6368; }
            #gemini-auto-scroll-panel .gtc-toggle-btn.processing .gtc-icon { animation: gtc-pulse 1.5s infinite ease-in-out; }
            @keyframes gtc-pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

            #gemini-auto-scroll-panel .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #5f6368;
                border-top: 1px solid #e0e0e0;
                padding-top: 10px;
                margin-top: 4px;
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

            /* --- Log Panel Styles --- */
            #gemini-auto-scroll-log-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 450px;
                height: 300px;
                background-color: rgba(30, 30, 30, 0.9);
                border: 1px solid #444;
                border-radius: 8px;
                z-index: 9999;
                display: none; /* Initially hidden */
                flex-direction: column;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                backdrop-filter: blur(5px);
                resize: both;
                overflow: hidden;
            }
            #gemini-auto-scroll-log-panel-header {
                padding: 8px 12px;
                cursor: move;
                background-color: #333;
                color: #f1f1f1;
                font-family: 'Google Sans', sans-serif;
                font-size: 14px;
                user-select: none;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .log-panel-controls {
                display: flex;
                gap: 8px;
            }
            .log-action-btn {
                background: linear-gradient(to bottom, #444, #333);
                border: 1px solid #555;
                color: #fff;
                cursor: pointer;
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .log-action-btn:hover {
                background: linear-gradient(to bottom, #555, #444);
            }
            .log-action-btn:active {
                background: #222;
            }
            #gemini-auto-scroll-log-panel-content {
                flex-grow: 1;
                overflow-y: auto;
                padding: 10px;
                font-family: 'Fira Code', 'monospace';
                font-size: 12px;
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .log-entry {
                white-space: pre-wrap;
                word-break: break-all;
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

    function createLogPanel() {
        if (document.getElementById('gemini-auto-scroll-log-panel')) return;

        const logPanel = document.createElement('div');
        logPanel.id = 'gemini-auto-scroll-log-panel';
        setInnerHTML(logPanel, `
            <div id="gemini-auto-scroll-log-panel-header">
                <span>Log Panel</span>
                <div class="log-panel-controls">
                    <button class="log-action-btn" id="gtc-copy-log">Copy</button>
                    <button class="log-action-btn" id="gtc-clear-log">Cls</button>
                </div>
            </div>
            <div id="gemini-auto-scroll-log-panel-content"></div>
        `);
        document.body.appendChild(logPanel);

        // --- Log Controls ---
        const copyBtn = logPanel.querySelector('#gtc-copy-log');
        const clearBtn = logPanel.querySelector('#gtc-clear-log');

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent drag start
            const content = logPanel.querySelector('#gemini-auto-scroll-log-panel-content');
            if (content) {
                const text = content.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = originalText, 1500);
                }).catch(err => {
                    console.error('Failed to copy log:', err);
                    copyBtn.textContent = 'Error';
                    setTimeout(() => copyBtn.textContent = 'Copy', 1500);
                });
            }
        });

        copyBtn.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent drag

        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            constcontent = logPanel.querySelector('#gemini-auto-scroll-log-panel-content');
            const content = document.getElementById('gemini-auto-scroll-log-panel-content');
            if (content) content.innerHTML = '';
        });
        clearBtn.addEventListener('mousedown', (e) => e.stopPropagation());

        if (isLogPanelVisible()) {
            logPanel.style.display = 'flex';
        }

        // --- Dragging Logic ---
        const header = logPanel.querySelector('#gemini-auto-scroll-log-panel-header');
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset.x = e.clientX - logPanel.offsetLeft;
            offset.y = e.clientY - logPanel.offsetTop;
            logPanel.style.transition = 'none';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let newX = e.clientX - offset.x;
            let newY = e.clientY - offset.y;
            newX = Math.max(0, Math.min(newX, window.innerWidth - logPanel.offsetWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - logPanel.offsetHeight));
            logPanel.style.left = `${newX}px`;
            logPanel.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            logPanel.style.transition = '';
            document.body.style.userSelect = '';
        });
    }


    function getConversationItems() {
        // Strategy 1: Scope search to the conversations list container (High precision)
        // Removed broader containers (side-navigation-content, bard-sidenav) to avoid picking up Bot items
        let container = document.querySelector('conversations-list') ||
            document.querySelector('.conversations-container');

        const selectors = [
            '[data-test-id="conversation"]',
            // Exclude bot items which have data-test-id="item"
            'div[jslog*="c_"]:not([data-test-id="item"])'
        ];

        if (container) {
            for (const selector of selectors) {
                const items = container.querySelectorAll(selector);
                if (items.length > 0) {
                    return Array.from(items);
                }
            }
        }

        // Strategy 2: Fallback to document search if container not found or empty (Lower precision but safer)
        for (const selector of selectors) {
            const items = document.querySelectorAll(selector);
            if (items.length > 0) {
                return Array.from(items);
            }
        }

        return [];
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

    function findSelectedConversationId() {
        // Try precise selector first
        const selectedItem = document.querySelector('div[data-test-id="conversation"].selected');
        if (selectedItem) {
            const jslog = selectedItem.getAttribute('jslog');
            if (jslog) {
                const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
                if (match) return match[1];
            }
        }
        // Fallback: search in all items if class name differs
        const currentItems = getConversationItems();
        const selectedViaClass = currentItems.find(item => item.classList.contains('selected'));
        if (selectedViaClass) {
            const jslog = selectedViaClass.getAttribute('jslog');
            if (jslog) {
                const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
                if (match) return match[1];
            }
        }
        return getConversationIdFromUrl();
    }


    function findNextConversationId() {
        const currentId = getConversationIdFromUrl();
        if (!currentId) {
            log('findNextConversationId: Could not get current ID from URL.');
            return null;
        }

        const allItems = getConversationItems();
        if (allItems.length === 0) {
            log('findNextConversationId: No items found using any selector strategy.');
            log('Tried: div[data-test-id="conversation"], div[jslog*="c_"]');
        }
        const currentIndex = allItems.findIndex(item => {
            const jslog = item.getAttribute('jslog');
            if (!jslog) return false;
            const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
            if (match && match[1] === currentId) {
                return true;
            }
            return false;
        });

        if (currentIndex === -1) {
            log(`findNextConversationId: Current ID ${currentId} not found in list.`);
            // Debug: Log the first few IDs found to understand mismatch
            const debugIds = allItems.slice(0, 5).map(item => {
                const jslog = item.getAttribute('jslog');
                const match = jslog && (jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/));
                return match ? match[1] : 'unknown';
            });
            log(`Top 5 item IDs in list: ${debugIds.join(', ')}... (Total: ${allItems.length})`);
        } else {
            log(`findNextConversationId: Found ${allItems.length} items, currentIndex: ${currentIndex}`);
        }

        if (currentIndex !== -1) {
            // Search forward from the current item
            for (let i = currentIndex + 1; i < allItems.length; i++) {
                const nextItem = allItems[i];
                if (nextItem) {
                    const jslog = nextItem.getAttribute('jslog');
                    if (jslog) {
                        const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
                        if (match) {
                            const nextId = match[1];
                            if (nextId !== currentId) {
                                log(`- Next conversation ID found: ${nextId} (at index ${i})`);
                                return nextId;
                            } else {
                                // This is a duplicate ID entry in the list, skip it.
                                // log(`- Skipped duplicate ID at index ${i}`);
                            }
                        }
                    }
                }
            }
        }
        log('- No next conversation ID found, returning null');
        return null;
    }

    function updatePanelUI() {
        const panel = document.getElementById('gemini-auto-scroll-panel');
        if (!panel) return;

        // Update Auto-Scroll UI
        const scrollBtn = panel.querySelector('.scroll-toggle');
        const scrollStatusText = panel.querySelector('.scroll-status');
        if (scrollBtn && scrollStatusText) {
            const isScrollEnabled = isAutoScrollEnabled();
            scrollBtn.className = 'gtc-toggle-btn scroll-toggle ' + (isScrollEnabled ? 'enabled' : 'disabled');
            if (isProcessing) {
                scrollBtn.classList.add('processing');
                scrollStatusText.textContent = 'Scrolling...';
            } else {
                scrollStatusText.textContent = isScrollEnabled ? 'ON' : 'OFF';
            }
            const scrollIcon = scrollBtn.querySelector('.gtc-icon');
            if (scrollIcon) {
                setInnerHTML(scrollIcon, isScrollEnabled ? ICONS.CHECKED : ICONS.UNCHECKED);
            }
        }

        // Update Auto-Switch UI
        const switchBtn = panel.querySelector('.switch-toggle');
        const switchStatusText = panel.querySelector('.switch-status');
        if (switchBtn && switchStatusText) {
            const isSwitchEnabled = isAutoSwitchEnabled();
            switchBtn.className = 'gtc-toggle-btn switch-toggle ' + (isSwitchEnabled ? 'enabled' : 'disabled');
            switchStatusText.textContent = isSwitchEnabled ? 'ON' : 'OFF';
            const switchIcon = switchBtn.querySelector('.gtc-icon');
            if (switchIcon) {
                setInnerHTML(switchIcon, isSwitchEnabled ? ICONS.CHECKED : ICONS.UNCHECKED);
            }
        }

        // Update Log Panel Toggle UI
        const logBtn = panel.querySelector('.log-toggle');
        const logStatusText = panel.querySelector('.log-status');
        if (logBtn && logStatusText) {
            const isLogVisible = isLogPanelVisible();
            logBtn.className = 'gtc-toggle-btn log-toggle ' + (isLogVisible ? 'enabled' : 'disabled');
            logStatusText.textContent = isLogVisible ? 'ON' : 'OFF';
            const logIcon = logBtn.querySelector('.gtc-icon');
            if (logIcon) {
                setInnerHTML(logIcon, isLogVisible ? ICONS.CHECKED : ICONS.UNCHECKED);
            }
        }


        const count = updateConversationIndices();
        const badge = panel.querySelector('.gtc-badge');
        if (badge) {
            badge.textContent = `${count} items`;
        }
        const convIdSpan = panel.querySelector('.conversation-id');
        if (convIdSpan) {
            convIdSpan.textContent = findSelectedConversationId() || 'N/A';
        }

        const nextConvIdSpan = panel.querySelector('.next-conversation-id');
        if (nextConvIdSpan) {
            nextConvIdSpan.textContent = findNextConversationId() || 'N/A';
        }

        const items = getConversationItems();
        const selectedIndex = items.findIndex(item => item.classList.contains('selected'));
        if (selectedIndex !== -1) {
            if (lastSelectedIndex !== selectedIndex) {
                log(`Selected index changed from ${lastSelectedIndex} to ${selectedIndex}.`);
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
            <div class="panel-header">
                <h1>${GM_info.script.name}</h1>
                <span class="version-badge">v${GM_info.script.version}</span>
            </div>
            <div class="panel-content">
                <div class="control-row">
                    <label>Auto-Scroll</label>
                    <div class="toggle-switch">
                        <span class="status-text scroll-status">OFF</span>
                        <button class="gtc-toggle-btn scroll-toggle"><span class="gtc-icon"></span></button>
                    </div>
                </div>
                <div class="control-row">
                    <label>Auto-Select Next</label>
                    <div class="toggle-switch">
                        <span class="status-text switch-status">ON</span>
                        <button class="gtc-toggle-btn switch-toggle"><span class="gtc-icon"></span></button>
                    </div>
                </div>
                <div class="control-row">
                    <label>Show Log</label>
                    <div class="toggle-switch">
                        <span class="status-text log-status">OFF</span>
                        <button class="gtc-toggle-btn log-toggle"><span class="gtc-icon"></span></button>
                    </div>
                </div>
                <div class="info-row">
                    <span>Loaded: <span class="gtc-badge">0 items</span></span>
                    <span>ID: <span class="conversation-id">N/A</span></span>
                </div>
                <div class="info-row">
                    <span>Next ID: <span class="next-conversation-id">N/A</span></span>
                </div>
            </div>
        `);

        document.body.appendChild(panel);

        panel.querySelector('.scroll-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoScroll();
        });

        panel.querySelector('.switch-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoSwitch();
        });

        panel.querySelector('.log-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLogPanelVisibility();
        });

        const header = panel.querySelector('.panel-header');
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset.x = e.clientX - panel.offsetLeft;
            offset.y = e.clientY - panel.offsetTop;
            panel.style.transition = 'none';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let newX = e.clientX - offset.x;
            let newY = e.clientY - offset.y;

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
            const pos = { top: panel.style.top, left: panel.style.left };
            await GM_setValue(CONSTANTS.PANEL_POSITION_KEY, pos);
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

        panel.classList.add('ready');

        updatePanelUI();
    }

    // --- Utility Functions ---

    function getConversationIdFromUrl() {
        const match = window.location.pathname.match(/\/app\/([a-f0-9]{16})/);
        return match ? match[1] : null;
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
        // Strategy 1: Find valid scroll container from a list item (Auto-Detect) - BEST
        // This checks actual computed styles for overflow and scrollHeight.
        const anyItem = document.querySelector(SELECTORS.CONVERSATION_ITEM);
        if (anyItem) {
            const scrollParent = findScrollableParent(anyItem);
            if (scrollParent) {
                if (!window._gtcInfoLogged) {
                    console.log('[GeminiAutoScroll] Detected scroll container via item:', scrollParent);
                    window._gtcInfoLogged = true;
                }
                return scrollParent;
            }
        }

        // Strategy 0: Explicit User-Identified Tag (Fallback)
        // If Strategy 1 failed (e.g. no items, or not enough items to scroll yet), we try to guess.
        const explicitContainer = document.querySelector('infinite-scroller');
        if (explicitContainer) {
            // Check if the infinite-scroller itself is the scroller
            if (isElementScrollable(explicitContainer)) return explicitContainer;

            // Check known children
            const candidates = [
                explicitContainer.querySelector('.conversations-container'),
                explicitContainer.querySelector('.chat-history-list'),
                explicitContainer.querySelector('conversations-list')
            ];

            for (const candidate of candidates) {
                if (candidate && isElementScrollable(candidate)) {
                    return candidate;
                }
            }

            // If we are here, we found structure but no scrollbar.
            // Maybe it is too short to scroll? Or styles not loaded?
            // Return one as best guess to allow attempts.
            return candidates[0] || explicitContainer;
        }

        // Strategy 2: Fallback to known selectors
        return document.querySelector(SELECTORS.SCROLL_CONTAINER) ||
            document.querySelector('conversations-list');
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

    function isSpinnerVisible() {
        return document.querySelector(SELECTORS.SPINNER) !== null;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Main Logic ---

    async function attemptScrollToConversation() {
        if (isProcessing) return;
        if (!isAutoScrollEnabled()) return;

        isProcessing = true;
        updatePanelUI();
        log('Auto-scroll loop started.');

        let container = getScrollContainer();

        // 1. Setup MutationObserver for the container to detect new items immediately
        let mutationObserver = null;

        const scrollDown = () => {
            if (container && isAutoScrollEnabled()) {
                // Use a large number to scroll to bottom without reading scrollHeight (which forces reflow)
                container.scrollTop = 99999999;
            }
        };

        // Local debounce timer to avoid conflict with the global UI debounce timer
        let scrollDebounceTimer = null;

        const attachObserver = (target) => {
            if (mutationObserver) mutationObserver.disconnect();
            mutationObserver = new MutationObserver((_mutations) => {
                if (!isAutoScrollEnabled()) return;
                // Debounce scrolling to avoid slamming the browser/app with events
                if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
                scrollDebounceTimer = setTimeout(scrollDown, 100);
            });
            mutationObserver.observe(target, { childList: true, subtree: true });
        };

        try {
            while (isAutoScrollEnabled()) {
                // Critical Error Check
                if (checkErrorState()) {
                    log('Critical error detected ("Couldn\'t load"). Stopping auto-scroll.');
                    console.warn('[GeminiAutoScroll] Critical error detected ("Couldn\'t load"). Stopping auto-scroll.');
                    toggleAutoScroll(); // This will disable it
                    alert('Gemini Auto-Scroll halted: "Couldn’t load recent chats" error detected. Please reload the page.');
                    break;
                }

                // Determine container (it might change or be created lazily)
                const currentContainer = getScrollContainer();

                if (currentContainer && currentContainer !== container) {
                    container = currentContainer;
                    log(`New scroll container found: ${container.tagName}.${container.className}`);
                    attachObserver(container);
                }

                if (container) {
                    // Just scroll. Reading scrollHeight/scrollTop forces reflow. 
                    // Since this loop is now a fallback (2s interval), blind scroll is acceptable 
                    // and much more performant than forcing layout calc.
                    scrollDown();
                }

                // Wait loop - Increased to 2s to rely mostly on MutationObserver and reduce CPU usage
                await sleep(2000);

                if (isSpinnerVisible()) {
                    await sleep(200);
                }
            }
        } catch (e) {
            log(`Error in scroll loop: ${e.message}`);
            console.error('[GeminiAutoScroll] Error:', e);
        } finally {
            if (mutationObserver) mutationObserver.disconnect();
            isProcessing = false;
            updatePanelUI();
            log('Auto-scroll loop stopped.');
        }
    }

    // --- Monitoring ---

    let lastUrl = window.location.href;
    let _debounceTimer;

    const uiObserver = new MutationObserver((mutations) => {
        createDraggablePanel();
        createLogPanel();


        // Check for deletions of the selected item
        for (const mutation of mutations) {
            for (const removedNode of mutation.removedNodes) {
                if (removedNode.nodeType === 1) { // Element node
                    const isConversation = removedNode.matches(SELECTORS.CONVERSATION_ITEM) || removedNode.querySelector(SELECTORS.CONVERSATION_ITEM);
                    const wasSelected = removedNode.classList?.contains('selected') || removedNode.querySelector('.selected');

                    if (isConversation && wasSelected && lastSelectedIndex !== -1) {
                        log(`Selected conversation (index: ${lastSelectedIndex}) was removed from DOM.`);
                        if (isAutoSwitchEnabled()) {
                            log('Auto-switch is enabled. Triggering selection of next conversation.');
                            // Execute selection in next tick to allow DOM to settle
                            setTimeout(selectNextConversation, 50);
                        } else {
                            log('Auto-switch is disabled. No action taken.');
                        }
                    }
                }
            }
        }

        // Debounce UI updates
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
            updatePanelUI();
        }, 500);
    });

    function selectNextConversation() {
        log('Attempting to select next conversation.');
        const items = getConversationItems();
        log(`Found ${items.length} conversation items.`);
        if (items.length === 0) {
            log('No conversations found. Aborting selection.');
            return;
        }

        // Select the one that is now at the same index, or the last one if we were at the end
        const newIndex = Math.min(lastSelectedIndex, items.length - 1);
        log(`Calculated new index: ${newIndex} (lastSelectedIndex: ${lastSelectedIndex}, items.length: ${items.length})`);
        const target = items[newIndex];

        if (target) {
            log(`Target element found at index ${newIndex}. Clicking it.`);
            target.click();
            // Ensure focus is returned to the web page from the address bar
            window.focus();
            if (document.activeElement) {
                document.activeElement.blur();
            }
            document.body.focus();
            log('Successfully clicked and focused body.');
        } else {
            log(`No target element found at index ${newIndex}.`);
        }
    }

    uiObserver.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            log(`URL changed to: ${currentUrl}. Re-triggering scroll check.`);
            // Re-trigger scroll when URL changes
            setTimeout(attemptScrollToConversation, 1200);
        }
        // Also periodically ensure UI is accurate
        updatePanelUI();
    }, 1000);


    setTimeout(() => {
        createDraggablePanel();
        createLogPanel();
        attemptScrollToConversation();
    }, 2500);

})();
