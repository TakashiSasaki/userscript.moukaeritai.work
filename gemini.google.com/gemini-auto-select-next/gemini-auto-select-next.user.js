// ==UserScript==
// @name         Gemini Auto-Select Next
// @namespace    userscript.moukaeritai.work
// @version      0.2.24
// @lastModified 2026-03-10
// @description  Automatically select the next conversation when the current one is deleted or removed
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js
// @grant        GM_info
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

    const SELECTORS = {
        CONVERSATION_ITEM: 'a.conversation, a[data-test-id="conversation"]',
        SCROLL_CONTAINER: 'nav infinite-scroller, infinite-scroller'
    };

    const CONSTANTS = {
        STORAGE_KEY_AUTOSWITCH: 'gemini_auto_switch_next',
        STORAGE_KEY_MINIMIZED: 'gemini_auto_switch_minimized',
        PANEL_POSITION_KEY: 'gemini_auto_switch_panel_position'
    };

    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiAutoSwitch_' + Math.random().toString(36).substr(2, 9), {
                createHTML: (string) => string
            });
        } catch (e) {
            console.warn('[GeminiAutoSwitch] Failed to create trustedTypes policy', e);
        }
    }

    const setInnerHTML = (element, html) => {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

    let lastSelectedIndex = -1;
    let isInitialized = false;
    let uiObserver = null;
    let mainInterval = null;

    function isAutoSwitchEnabled() {
        return GM_getValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, true);
    }

    function toggleAutoSwitch() {
        const newState = !isAutoSwitchEnabled();
        GM_setValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, newState);
        updatePanelUI();
    }

    function isPanelMinimized() {
        return GM_getValue(STORAGE_KEYS.PANEL_MINIMIZED, false);
    }

    const ICONS = {
        CHECKED: `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M280-520l-80-80-120 120 200 200 400-400-120-120-280 280z"/></svg>`,
        UNCHECKED: `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200zm0-80h560v-560H200v560z"/></svg>`
    };

    function injectStyles() {
        if (document.getElementById('gemini-auto-switch-styles')) return;
        const style = document.createElement('style');
        style.id = 'gemini-auto-switch-styles';
        style.textContent = `
            #gemini-auto-switch-panel {
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                background-color: rgba(255, 255, 255, 0.9);
                border: 1px solid #dadce0;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                font-family: 'Google Sans', sans-serif;
                font-size: 13px;
                color: #3c4043;
                width: 220px;
                backdrop-filter: blur(8px);
                user-select: none;
            }
            #gemini-auto-switch-panel .panel-header {
                padding: 6px 10px;
                border-bottom: 1px solid #e0e0e0;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: rgba(241, 243, 244, 0.7);
            }
            #gemini-auto-switch-panel h1 { font-size: 13px; font-weight: 500; margin: 0; }
            .version-badge { font-size: 10px; color: #7f8c8d; font-family: monospace; }
            #gemini-auto-switch-panel .panel-content { padding: 8px 10px; }
            .control-row { display: flex; align-items: center; justify-content: space-between; }
            .gtc-toggle-btn {
                background: none; border: none; cursor: pointer; padding: 4px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
            }
            .gtc-toggle-btn:hover { background: rgba(0,0,0,0.05); }
            .gtc-toggle-btn.enabled { color: #1a73e8; }
            .gtc-toggle-btn.disabled { color: #5f6368; }
            @media (prefers-color-scheme: dark) {
                #gemini-auto-switch-panel { background: rgba(32, 33, 36, 0.85); color: #e8eaed; border-color: #5f6368; }
            }
        `;
        document.head.appendChild(style);
    }

    function getConversationItems() {
        const container = document.querySelector(SELECTORS.SCROLL_CONTAINER) || document;
        return Array.from(container.querySelectorAll(SELECTORS.CONVERSATION_ITEM));
    }

    function getIdFromItem(item) {
        if (!item) return null;
        const href = item.getAttribute('href');
        if (href) {
            const match = href.match(/\/app\/([a-f0-9]{16})/);
            if (match) return match[1];
        }
        const jslog = item.getAttribute('jslog');
        if (jslog) {
            const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
            if (match) return match[1];
        }
        return null;
    }

    function getConversationIdFromUrl() {
        const match = window.location.pathname.match(/\/app\/([a-f0-9]{16})/);
        return match ? match[1] : null;
    }

    function findNextConversationId() {
        const currentId = getConversationIdFromUrl();
        const allItems = getConversationItems();

        if (!currentId) {
            if (allItems.length > 0) {
                let targetIndex = Math.max(0, Math.min(lastSelectedIndex, allItems.length - 1));
                return getIdFromItem(allItems[targetIndex]);
            }
            return null;
        }

        const currentIndex = allItems.findIndex(item => getIdFromItem(item) === currentId);
        if (currentIndex !== -1) {
            for (let i = currentIndex + 1; i < allItems.length; i++) {
                const nextId = getIdFromItem(allItems[i]);
                if (nextId && nextId !== currentId) return nextId;
            }
        }
        return null;
    }

    function selectNextConversation(retryCount = 0) {
        if (!isAutoSwitchEnabled()) return;
        const nextId = findNextConversationId();
        if (nextId) {
            const items = getConversationItems();
            const target = items.find(item => getIdFromItem(item) === nextId);
            if (target) {
                target.click();
            } else if (retryCount < 5) {
                setTimeout(() => selectNextConversation(retryCount + 1), 200);
            } else {
                window.location.href = `https://gemini.google.com/app/${nextId}`;
            }
        }
    }

    function updatePanelUI() {
        const panel = document.getElementById('gemini-auto-switch-panel');
        if (!panel) return;
        const btn = panel.querySelector('.switch-toggle');
        const enabled = isAutoSwitchEnabled();
        btn.className = 'gtc-toggle-btn switch-toggle ' + (enabled ? 'enabled' : 'disabled');
        setInnerHTML(btn, enabled ? ICONS.CHECKED : ICONS.UNCHECKED);

        const items = getConversationItems();
        const selectedIndex = items.findIndex(item => item.classList.contains('selected') || item.getAttribute('aria-current') === 'page');
        if (selectedIndex !== -1) lastSelectedIndex = selectedIndex;
    }

    function createDraggablePanel() {
        if (document.getElementById('gemini-auto-switch-panel')) return;
        injectStyles();
        const panel = document.createElement('div');
        panel.id = 'gemini-auto-switch-panel';
        setInnerHTML(panel, `
            <div class="panel-header">
                <h1>Auto-Select Next</h1>
                <span class="version-badge">v${GM_info.script.version}</span>
            </div>
            <div class="panel-content">
                <div class="control-row">
                    <span>Enabled</span>
                    <button class="gtc-toggle-btn switch-toggle"></button>
                </div>
            </div>
        `);
        document.body.appendChild(panel);

        panel.querySelector('.switch-toggle').addEventListener('click', toggleAutoSwitch);

        // Position persistence
        const savedPos = GM_getValue(CONSTANTS.PANEL_POSITION_KEY, { top: '80px', right: '20px' });
        panel.style.top = savedPos.top;
        if (savedPos.left) panel.style.left = savedPos.left;
        else panel.style.right = savedPos.right;

        let isDragging = false;
        let offset = { x: 0, y: 0 };
        const header = panel.querySelector('.panel-header');

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset.x = e.clientX - panel.offsetLeft;
            offset.y = e.clientY - panel.offsetTop;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.right = 'auto';
            panel.style.left = (e.clientX - offset.x) + 'px';
            panel.style.top = (e.clientY - offset.y) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
                GM_setValue(CONSTANTS.PANEL_POSITION_KEY, { top: panel.style.top, left: panel.style.left });
            }
        });

        updatePanelUI();
    }

    uiObserver = new MutationObserver((mutations) => {
        let runUpdate = false;
        let triggerSwitch = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const removedNode of mutation.removedNodes) {
                    if (removedNode.nodeType === 1) {
                        const isConversation = removedNode.matches(SELECTORS.CONVERSATION_ITEM) || removedNode.querySelector(SELECTORS.CONVERSATION_ITEM);
                        const wasSelected = removedNode.classList?.contains('selected') || removedNode.querySelector('.selected');

                        if (isConversation) {
                            runUpdate = true;
                            if (wasSelected) triggerSwitch = true;
                        }
                    }
                }
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.nodeType === 1) {
                        if (addedNode.matches && addedNode.matches(SELECTORS.CONVERSATION_ITEM) || (addedNode.querySelector && addedNode.querySelector(SELECTORS.CONVERSATION_ITEM))) {
                            runUpdate = true;
                        }
                    }
                }
            }
        }

        if (runUpdate) updatePanelUI();
        if (triggerSwitch) setTimeout(selectNextConversation, 100);
    });

    function init() {
        if (isInitialized) return;
        isInitialized = true;
        uiObserver.observe(document.body, { childList: true, subtree: true });

        // Initial setup
        setTimeout(() => {
            createDraggablePanel();
            updatePanelUI();
        }, 1500);

        // Periodic UI check to ensure panel exists
        mainInterval = setInterval(() => {
            if (!document.getElementById('gemini-auto-switch-panel')) {
                createDraggablePanel();
            }
            updatePanelUI();
        }, 2000);
    }

    function checkUrl() {
        if (/^\/app/.test(location.pathname)) init();
        else {
            isInitialized = false;
            uiObserver.disconnect();
            if (mainInterval) clearInterval(mainInterval);
            const p = document.getElementById('gemini-auto-switch-panel');
            if (p) p.remove();
        }
    }

    if (window.navigation) window.navigation.addEventListener('navigatesuccess', () => setTimeout(checkUrl, 500));
    else setInterval(checkUrl, 1000);

    if (document.body) checkUrl();
    else window.addEventListener('DOMContentLoaded', checkUrl);

})();
