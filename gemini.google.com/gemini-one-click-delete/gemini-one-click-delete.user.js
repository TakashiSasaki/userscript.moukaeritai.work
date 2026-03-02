// ==UserScript==
// @name         Gemini 1-Click Delete Conversation
// @namespace    https://userscript.moukaeritai.work/
// @version      0.2.5
// @description  Adds a 1-click button to delete the current Gemini conversation.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
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
        // Trigger button (Conversation Options)
        // Shared by Desktop and Mobile
        actionsMenuButton: 'button[data-test-id="actions-menu-button"], button[aria-label="Open menu for conversation actions."]',

        // Menu Containers
        // Desktop: mat-mdc-menu-panel
        // Mobile: mat-bottom-sheet-container
        menuPanel: '.mat-mdc-menu-panel, .mat-bottom-sheet-container',

        // Delete Button inside Menu
        // Primary strategy: data-test-id="delete-button"
        // Fallback checks for text content "Delete"
        deleteMenuItem: 'button[data-test-id="delete-button"]',

        // Confirmation Dialog
        dialogContainer: 'mat-dialog-container',

        // Confirm Button inside Dialog
        confirmButton: 'button[data-test-id="confirm-button"]',

        // Sidebar Item
        sidebarItem: 'div[data-test-id="conversation"]',

        // Chat Container (for floating button injection)
        chatContainer: 'chat-window',

        // Search Result Indicators
        messageContent: 'message-content, user-query-content, response-element'
    };

    // --- State Management ---
    let mainObserver = null;
    let keydownListener = null;
    let styleElement = null;
    let isInitialized = false;

    const STORAGE_KEYS = {
        PANEL_MINIMIZED: 'gemini_delete_panel_minimized',
        PANEL_POS_X: 'gemini_delete_panel_pos_x',
        PANEL_POS_Y: 'gemini_delete_panel_pos_y'
    };

    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiDeletePanel_' + Math.random().toString(36).substr(2, 9), {
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

    function isPanelMinimized() {
        return GM_getValue(STORAGE_KEYS.PANEL_MINIMIZED, false);
    }

    function togglePanelMinimized() {
        const isMin = !isPanelMinimized();
        GM_setValue(STORAGE_KEYS.PANEL_MINIMIZED, isMin);
        const panel = document.getElementById('gemini-delete-panel');
        if (panel) {
            panel.classList.toggle('minimized', isMin);
        }
    }

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
     * Create safely constructed SVG element (Trusted Types compliant)
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
            // For floating button, we might want to start disabled until we verify sidebar presence
            btn.style.display = 'none'; // Initially hidden
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
        if (document.getElementById('gemini-delete-styles')) return;
        const style = document.createElement('style');
        style.id = 'gemini-delete-styles';
        style.textContent = `
            .gemini-quick-delete-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                height: 32px;
                border-radius: 16px;
                border: 1px solid #ffcccc;
                background-color: #ffe6e6;
                cursor: pointer;
                margin-left: 8px;
                color: #5f6368;
                transition: background-color 0.2s, opacity 0.2s;
                position: relative;
                z-index: 1000;
                pointer-events: auto;
            }
            .gemini-quick-delete-btn:hover { background-color: #ffcccc; color: #d93025; border-color: #d93025; }
            .gemini-quick-delete-btn.processing { opacity: 0.5; padding: 4px; border-radius: 4px; animation: pulse-red 1s infinite; cursor: wait; }
            .gemini-quick-delete-btn:disabled { background-color: #f0f0f0; border-color: #ccc; color: #aaa; cursor: help; }

            /* --- Draggable Panel Styles --- */
            #gemini-delete-panel {
                position: fixed;
                z-index: 10000;
                background-color: rgba(255, 255, 255, 0.95);
                border: 1px solid #f8d7da;
                border-radius: 6px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                font-family: 'Google Sans', sans-serif;
                font-size: 11px;
                color: #3c4043;
                width: 200px;
                backdrop-filter: blur(8px);
                display: flex;
                flex-direction: column;
            }
            #gemini-delete-panel.minimized {
                width: auto;
                background-color: #fce8e6;
                color: #d93025;
                border: 1px solid #f8d7da;
                padding: 0 8px;
                height: 24px;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-weight: 500;
                font-size: 11px;
                white-space: nowrap;
                backdrop-filter: none;
            }
            #gemini-delete-panel.minimized .panel-header, 
            #gemini-delete-panel.minimized .panel-content { display: none; }
            #gemini-delete-panel .minimized-summary { display: none; user-select: none; }
            #gemini-delete-panel.minimized .minimized-summary { display: block; }
            #gemini-delete-panel .panel-header {
                padding: 4px 8px;
                border-bottom: 1px solid #e0e0e0;
                cursor: move;
                user-select: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: rgba(241, 243, 244, 0.8);
            }
            #gemini-delete-panel .panel-header h1 { font-size: 11px; font-weight: 600; margin: 0; line-height: 1; }
            #gemini-delete-panel .panel-header .version-badge {
                font-size: 9px; background-color: #fce8e6; color: #d93025; padding: 1px 4px; border-radius: 3px; margin-left: 4px;
            }
            .gdp-minimize-btn {
                cursor: pointer; padding: 0 4px; border-radius: 4px; user-select: none; transition: background 0.2s;
                font-size: 14px; line-height: 1; color: #5f6368; font-weight: bold;
            }
            .gdp-minimize-btn:hover { background: rgba(0,0,0,0.1); }
            #gemini-delete-panel .panel-content { padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
            #gemini-delete-panel .shortcuts-list { font-size: 10px; color: #5f6368; margin: 2px 0 0 0; padding-left: 14px; line-height: 1.3; }
            .gdp-delete-btn-container { display: flex; justify-content: center; margin-bottom: 4px; padding: 4px 0; }
            .gdp-main-delete-btn {
                display: inline-flex; align-items: center; gap: 4px; background-color: #d93025; color: white;
                border: none; padding: 6px 16px; border-radius: 12px; font-size: 11px; font-weight: bold;
                cursor: pointer; transition: background-color 0.2s; width: 100%; justify-content: center;
            }
            .gdp-main-delete-btn:hover { background-color: #b31412; }
            .gdp-main-delete-btn:disabled { background-color: #fce8e6; color: #d93025; opacity:0.5; cursor: not-allowed; }
            .gdp-main-delete-btn.processing { opacity: 0.5; animation: pulse-red 1s infinite; cursor: wait; }

            @media (prefers-color-scheme: dark) {
                .gemini-quick-delete-btn { background-color: #4a1a1a; border-color: #662222; color: #e8eaed; }
                .gemini-quick-delete-btn:hover { background-color: #662222; border-color: #d93025; color: #ff8a80; }
                .gemini-quick-delete-btn:disabled { background-color: #3c4043; border-color: #5f6368; color: #80868b; }
                #gemini-delete-panel { background-color: rgba(32, 33, 36, 0.95); border-color: #3c4043; color: #e8eaed; }
                #gemini-delete-panel .panel-header { background-color: rgba(60, 64, 67, 0.8); border-color: #3c4043; }
                #gemini-delete-panel.minimized { background-color: #4a1a1a; color: #ff8a80; border-color: #662222; }
                #gemini-delete-panel .shortcuts-list { color: #9aa0a6; }
            }
            @keyframes pulse-red { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        `;
        document.head.appendChild(style);
        return style;
    }

    /**
     * Main Delete Logic
     */
    async function handleDelete(triggerBtn) {
        console.log('Starting Delete Flow...');

        // 1. Open Menu
        simulateClick(triggerBtn);

        // 2. Wait for Menu Panel
        const menu = await waitForElement(SELECTORS.menuPanel);
        if (!menu) throw new Error('Menu panel did not appear.');

        // Wait for buttons to populate in the dynamic menu
        await waitForElement('button', 2000, menu);

        // 3. Find Delete Button in Menu
        // Try precise selector first
        let deleteBtn = menu.querySelector(SELECTORS.deleteMenuItem);

        if (!deleteBtn) {
            // Fallback: search by text/icon
            const buttons = Array.from(menu.querySelectorAll('button[role="menuitem"], button, mat-list-item'));
            deleteBtn = buttons.find(b =>
                b.textContent.includes('Delete') ||
                b.querySelector('mat-icon[data-mat-icon-name="delete"]')
            );
        }

        if (!deleteBtn) throw new Error('Delete button not found in menu.');

        // 4. Click Delete in Menu
        simulateClick(deleteBtn);

        // 5. Wait for Confirmation Dialog
        const dialog = await waitForElement(SELECTORS.dialogContainer);
        if (!dialog) throw new Error('Confirmation dialog did not appear.');

        // Wait for buttons to populate in the dialog
        await waitForElement('button', 2000, dialog);

        // 6. Find Confirm Button
        let confirmBtn = dialog.querySelector(SELECTORS.confirmButton);
        if (!confirmBtn) {
            const dialogBtns = Array.from(dialog.querySelectorAll('button'));
            confirmBtn = dialogBtns.find(b => b.textContent.includes('Delete') || b.classList.contains('mat-primary'));
        }

        if (!confirmBtn) throw new Error('Confirm button not found in dialog.');

        // 7. Click Confirm
        simulateClick(confirmBtn);
        console.log('Delete Confirmed.');
    }

    /**
     * Helper to get Conversation ID from Main View
     */
    function getConversationIdFromMainView() {
        // Try to find it in jslog of message content
        const elements = document.querySelectorAll(SELECTORS.messageContent);
        for (const el of elements) {
            const jslog = el.getAttribute('jslog');
            if (jslog) {
                // Regex to find c_<hex>
                const match = jslog.match(/"(c_[a-f0-9]{16})"/);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }
        return null;
    }

    /**
     * Helper to find Sidebar Item by ID
     */
    function findSidebarItem(conversationId) {
        if (!conversationId) return null;
        // Search all specific conversation items in sidebar
        // This relies on them having the ID in their jslog too, or checking href/data attributes
        // The sample analysis showed jslog contains the ID.
        // We can search for any element containing the ID in its attributes if we wanna be broad
        // But let's try to be specific to 'div[data-test-id="conversation"]'
        const items = document.querySelectorAll(SELECTORS.sidebarItem);
        for (const item of items) {
            const jslog = item.getAttribute('jslog') || '';
            // Also check inner elements if the attribute is not on the container
            if (jslog.includes(conversationId)) return item;
            if (item.innerHTML.includes(conversationId)) return item;
        }
        return null;
    }

    /**
     * Update State for Global Panel
     */
    function updatePanelState(conversationId) {
        const panel = document.getElementById('gemini-delete-panel');
        if (!panel) return;

        const delBtn = panel.querySelector('#gdp-global-delete-btn');
        if (!delBtn) return;

        if (!conversationId) {
            delBtn.disabled = true;
            delBtn.title = 'No conversation selected';
            return;
        }

        const sidebarItem = findSidebarItem(conversationId);
        if (sidebarItem) {
            delBtn.disabled = false;
            delBtn.title = '1-Click Delete Conversation';
            const trigger = sidebarItem.querySelector(SELECTORS.actionsMenuButton);
            if (trigger) {
                delBtn._targetTrigger = trigger;
            } else {
                delBtn.disabled = true;
                delBtn.title = 'Menu button not found in sidebar item';
            }
        } else {
            delBtn.disabled = true;
            delBtn.title = 'Scroll sidebar to load this conversation for deletion';
        }
    }

    /**
     * Create the Global Draggable Panel
     */
    function createDraggablePanel() {
        if (document.getElementById('gemini-delete-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'gemini-delete-panel';
        if (isPanelMinimized()) panel.classList.add('minimized');

        const version = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '0.2.5';

        setInnerHTML(panel, `
            <div class="minimized-summary">1-Click Delete v${version}</div>
            <div class="panel-header">
                <div style="display:flex; align-items:center;">
                    <h1>1-Click Delete</h1><span class="version-badge">v${version}</span>
                </div>
                <span class="gdp-minimize-btn" title="Minimize">−</span>
            </div>
            <div class="panel-content">
                <div class="gdp-delete-btn-container">
                    <button class="gdp-main-delete-btn" id="gdp-global-delete-btn" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                        </svg>
                        Delete Current Chat
                    </button>
                </div>
                <div>
                   <span style="font-weight:600;font-size:10px;">Shortcuts:</span>
                   <ul class="shortcuts-list">
                       <li>Ctrl + D</li>
                       <li>Ctrl + Shift + Backspace</li>
                   </ul>
                </div>
            </div>
        `);

        document.body.appendChild(panel);

        // Position logic
        let left = GM_getValue(STORAGE_KEYS.PANEL_POS_X, window.innerWidth - 220);
        let top = GM_getValue(STORAGE_KEYS.PANEL_POS_Y, 80);

        left = Math.max(0, Math.min(left, window.innerWidth - panel.offsetWidth || window.innerWidth));
        top = Math.max(0, Math.min(top, window.innerHeight - panel.offsetHeight || window.innerHeight));

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;

        // Event listeners
        const delBtn = panel.querySelector('#gdp-global-delete-btn');
        delBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (delBtn.disabled || delBtn.classList.contains('processing')) return;
            if (delBtn._targetTrigger) {
                delBtn.classList.add('processing');
                try {
                    await handleDelete(delBtn._targetTrigger);
                } catch (err) {
                    console.error('Delete failed:', err);
                    alert('Failed to delete conversation.');
                } finally {
                    delBtn.classList.remove('processing');
                }
            }
        });

        let hasDragged = false;

        panel.addEventListener('click', (e) => {
            if (hasDragged) return;
            if (panel.classList.contains('minimized') && !e.target.closest('button, input, .gdp-minimize-btn')) {
                togglePanelMinimized();
            }
        });

        panel.querySelector('.gdp-minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanelMinimized();
        });

        // Drag Logic
        const header = panel.querySelector('.panel-header');
        const summary = panel.querySelector('.minimized-summary');
        let isDragging = false;
        let dragOffset = { x: 0, y: 0, startX: 0, startY: 0 };

        const startDrag = (e) => {
            if (e.button !== 0 || e.target.closest('button, input, .gdp-minimize-btn')) return;
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
            if (!hasDragged) return;

            let newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - panel.offsetWidth));
            let newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - panel.offsetHeight));

            panel.style.left = `${newX}px`;
            panel.style.top = `${newY}px`;
            panel.style.right = 'auto'; // Break fixed right position
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            panel.style.transition = '';
            document.body.style.userSelect = '';
            if (hasDragged) {
                GM_setValue(STORAGE_KEYS.PANEL_POS_X, panel.offsetLeft);
                GM_setValue(STORAGE_KEYS.PANEL_POS_Y, panel.offsetTop);
            }
            setTimeout(() => { hasDragged = false; }, 50);
        });
    }

    /**
     * Inject buttons and update panel state
     */
    function processNodes() {
        // 1. Standard Header processing (existing logic)
        const targets = document.querySelectorAll(SELECTORS.actionsMenuButton);
        targets.forEach(triggerBtn => {
            // Check if inside sidebar
            if (triggerBtn.closest('bard-sidenav') || triggerBtn.closest('side-navigation-content')) {
                return;
            }

            const container = triggerBtn.parentElement;
            if (!container || container.querySelector('.gemini-quick-delete-btn')) return;

            // Create and inject standard header button
            const deleteBtn = createDeleteButton(() => handleDelete(triggerBtn));
            container.appendChild(deleteBtn);
        });

        // 2. Panel Creation and Update
        const chatWindow = document.querySelector(SELECTORS.chatContainer);
        if (chatWindow) {
            createDraggablePanel();
            const conversationId = getConversationIdFromMainView();
            updatePanelState(conversationId);
        }
    }

    /**
     * Handle Keyboard Shortcut (Ctrl+D or Ctrl+Shift+Backspace)
     */
    async function handleKeyboardShortcut(e) {
        const isCtrlD = (e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D');
        const isCtrlShiftBackspace = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace';

        if (!isCtrlD && !isCtrlShiftBackspace) return;

        // Ignore if user is typing in an input
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
            return;
        }

        e.preventDefault(); // Prevent bookmarking or other default browser actions
        console.log('Shortcut detected: Triggering 1-Click Delete...');

        // 1. Try to find an existing standard delete button (header)
        const standardBtn = document.querySelector('.gemini-quick-delete-btn:not(.floating)');
        if (standardBtn && !standardBtn.disabled) {
            standardBtn.click();
            return;
        }

        // 2. Try global panel delete button
        const panelBtn = document.querySelector('#gdp-global-delete-btn');
        if (panelBtn && !panelBtn.disabled) {
            panelBtn.click();
            return;
        }

        console.warn('Delete button not available or disabled.');
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

        const panel = document.getElementById('gemini-delete-panel');
        if (panel) panel.remove();

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
        console.log('[Gemini 1-Click Delete] Using Navigation API for SPA routing.');
    } else {
        // Fallback for older browsers
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(checkUrlAndManageScriptState, 500);
            }
        }, 500);
        console.log('[Gemini 1-Click Delete] Using setInterval fallback for SPA routing.');
    }

    // Initial check on load
    if (document.body) {
        checkUrlAndManageScriptState();
    } else {
        window.addEventListener('DOMContentLoaded', checkUrlAndManageScriptState);
    }

})();
