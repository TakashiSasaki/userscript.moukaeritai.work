// ==UserScript==
// @name         Gemini Auto-Select Next
// @namespace    userscript.moukaeritai.work
// @version      0.2.31
// @lastModified 2026-03-14
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
                border-radius: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: 'Google Sans', sans-serif;
                font-size: 13px;
                color: #3c4043;
                display: inline-flex;
                align-items: center;
                flex-wrap: nowrap;
                gap: 10px;
                padding: 6px 14px;
                width: fit-content;
                max-width: calc(100vw - 40px);
                box-sizing: border-box;
                white-space: nowrap;
                user-select: none;
                cursor: move;
                backdrop-filter: blur(8px);
                transition: box-shadow 0.2s;
                visibility: hidden;
            }
            #gemini-auto-switch-panel.ready { visibility: visible; }
            #gemini-auto-switch-panel:hover {
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            }
            #gemini-auto-switch-panel .version-badge { font-size: 10px; color: #7f8c8d; font-family: monospace; }
            #gemini-auto-switch-panel .auto-switch-label {
                display: flex; align-items: center; gap: 4px; cursor: pointer; font-weight: 500;
            }
            #gemini-auto-switch-panel .auto-switch-checkbox {
                cursor: pointer; margin: 0; width: 14px; height: 14px;
            }
            #gemini-auto-switch-panel .manual-next-btn {
                background: #1a73e8; color: white; border: none; padding: 4px 10px; border-radius: 12px;
                cursor: pointer; font-size: 12px; font-weight: 500; transition: background 0.2s, transform 0.1s;
                display: flex; align-items: center; gap: 4px;
                white-space: nowrap;
                flex: 0 0 auto;
            }
            #gemini-auto-switch-panel .manual-next-btn:hover { background: #1557b0; }
            #gemini-auto-switch-panel .manual-next-btn:active { transform: scale(0.96); }
            @media (prefers-color-scheme: dark) {
                #gemini-auto-switch-panel { background: rgba(32, 33, 36, 0.85); color: #e8eaed; border-color: rgba(255,255,255,0.15); }
                #gemini-auto-switch-panel .manual-next-btn { background: #8ab4f8; color: #202124; }
                #gemini-auto-switch-panel .manual-next-btn:hover { background: #aecbfa; }
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
            const match = href.match(/\/(app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})/);
            if (match) return match[2];
        }
        const jslog = item.getAttribute('jslog');
        if (jslog) {
            const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
            if (match) return match[1];
        }
        return null;
    }

    function getConversationIdFromUrl() {
        const match = window.location.pathname.match(/\/(app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})/);
        return match ? match[2] : null;
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

    function selectNextConversation(retryCount = 0, force = false) {
        if (!force && !isAutoSwitchEnabled()) {
            console.log('[GeminiAutoSelectNext] selectNextConversation called but ignored (force=false, auto=off)');
            return;
        }
        const nextId = findNextConversationId();
        console.log(`[GeminiAutoSelectNext] selectNextConversation logic start. force: ${force}, retry: ${retryCount}, foundNextId: ${nextId}`);
        if (nextId) {
            const items = getConversationItems();
            const target = items.find(item => getIdFromItem(item) === nextId);
            if (target) {
                console.log(`[GeminiAutoSelectNext] Targeted conversation found in DOM. Clicking...`);
                target.click();
            } else if (retryCount < 5) {
                console.log(`[GeminiAutoSelectNext] Target nextId not in DOM (virtual scroll?). Retrying ${retryCount + 1}/5...`);
                setTimeout(() => selectNextConversation(retryCount + 1, force), 200);
            } else {
                console.log(`[GeminiAutoSelectNext] Target nextId still not in DOM after retries. Redirecting window to: /app/${nextId}`);
                window.location.href = `https://gemini.google.com/app/${nextId}`;
            }
        } else {
            console.log('[GeminiAutoSelectNext] No next conversation found to skip to.');
        }
    }

    function updatePanelUI() {
        const panel = document.getElementById('gemini-auto-switch-panel');
        if (!panel) return;
        
        const checkbox = panel.querySelector('.auto-switch-checkbox');
        if (checkbox) {
            checkbox.checked = isAutoSwitchEnabled();
        }

        const items = getConversationItems();
        const selectedIndex = items.findIndex(item => item.classList.contains('selected') || item.getAttribute('aria-current') === 'page');
        if (selectedIndex !== -1) lastSelectedIndex = selectedIndex;
    }

    function createDraggablePanel() {
        if (document.getElementById('gemini-auto-switch-panel')) return;
        injectStyles();
        const panel = document.createElement('div');
        panel.id = 'gemini-auto-switch-panel';
        panel.title = 'Drag to move';
        setInnerHTML(panel, `
            <label class="auto-switch-label" title="Automatically select next conversation on delete">
                <input type="checkbox" class="auto-switch-checkbox">
                Auto
            </label>
            <button class="manual-next-btn" title="Explicitly skip to the next conversation">⏭️ Next</button>
            <span class="version-badge">v${GM_info.script.version}</span>
        `);
        document.body.appendChild(panel);

        const checkbox = panel.querySelector('.auto-switch-checkbox');
        checkbox.addEventListener('change', (e) => {
            GM_setValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, e.target.checked);
            updatePanelUI();
        });
        
        panel.querySelector('.manual-next-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            selectNextConversation(0, true);
        });

        // Position persistence
        const savedPos = GM_getValue(CONSTANTS.PANEL_POSITION_KEY, { top: '80px', right: '20px' });
        panel.style.top = savedPos.top;
        if (savedPos.left) panel.style.left = savedPos.left;
        else panel.style.right = savedPos.right;

        requestAnimationFrame(() => {
            panel.classList.add('ready');
        });

        let isDragging = false;
        let offset = { x: 0, y: 0 };

        panel.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label')) return;
            isDragging = true;
            offset.x = e.clientX - panel.offsetLeft;
            offset.y = e.clientY - panel.offsetTop;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
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

        // Custom event interface: allow other userscripts to request "select next"
        window.addEventListener('gemini-auto-select-next:request-next', () => {
            console.log('[GeminiAutoSelectNext] EVENT RECEIVED: gemini-auto-select-next:request-next');
            selectNextConversation(0, true);
        });
    }

    function checkUrl() {
        if (/^\/(app|gem)\//.test(location.pathname)) init();
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
