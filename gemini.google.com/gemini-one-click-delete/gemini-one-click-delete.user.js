// ==UserScript==
// @name         Gemini 1-Click Delete Conversation
// @namespace    https://userscript.moukaeritai.work/
// @version      0.1.10
// @description  Adds a 1-click button to delete the current Gemini conversation.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @grant        GM_info
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1') {
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

    // SVG Icon for Delete (Trash Can)
    const DELETE_ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
    </svg>`;

    const SELECTORS = {
        // Trigger button (Conversation Options)
        // Shared by Desktop and Mobile
        actionsMenuButton: 'button[data-test-id="actions-menu-button"]',

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
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            element.dispatchEvent(new MouseEvent(eventType, {
                view: null,
                bubbles: true,
                cancelable: true
            }));
        });
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
        const style = document.createElement('style');
        style.textContent = `
            .gemini-quick-delete-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                height: 32px;
                border-radius: 16px;
                border: 1px solid #ffcccc; /* Light red border */
                background-color: #ffe6e6; /* Light red background */
                cursor: pointer;
                margin-left: 8px;
                color: #5f6368;
                transition: background-color 0.2s, opacity 0.2s;
                position: relative;
                z-index: 1000;
                pointer-events: auto;
            }
            .gemini-quick-delete-btn:hover {
                background-color: #ffcccc; /* Slightly darker light red on hover */
                color: #d93025;
                border-color: #d93025;
            }
            .gemini-quick-delete-btn.processing {
                opacity: 0.5;
                cursor: not-allowed;
                animation: pulse-red 1s infinite;
            }
            .gemini-quick-delete-btn.floating {
                position: absolute;
                top: 10px;
                right: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .gemini-quick-delete-btn:disabled {
                background-color: #f0f0f0;
                border-color: #ccc;
                color: #aaa;
                cursor: help; /* Show help cursor to indicate tooltip */
            }
            @keyframes pulse-red {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
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

        // 3. Find Delete Button in Menu
        // Try precise selector first
        let deleteBtn = menu.querySelector(SELECTORS.deleteMenuItem);

        if (!deleteBtn) {
            // Fallback: search by text/icon
            const buttons = Array.from(menu.querySelectorAll('button, mat-list-item'));
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

        // 6. Find Confirm Button
        const confirmBtn = await waitForElement(SELECTORS.confirmButton, 2000, dialog);
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
                const match = jslog.match(/\"(c_[a-f0-9]{16})\"/);
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
     * Update Floating Button State
     */
    function updateFloatingButton(btn, conversationId) {
        if (!conversationId) {
            btn.style.display = 'none';
            return;
        }
        btn.style.display = 'inline-flex';

        const sidebarItem = findSidebarItem(conversationId);
        if (sidebarItem) {
            btn.disabled = false;
            btn.title = '1-Click Delete Conversation';
            // We need to find the specific menu trigger WITHIN the sidebar item
            const trigger = sidebarItem.querySelector(SELECTORS.actionsMenuButton);
            if (trigger) {
                btn._targetTrigger = trigger;
            } else {
                btn.disabled = true;
                btn.title = 'Menu button not found in sidebar item';
            }
        } else {
            btn.disabled = true;
            btn.title = 'Scroll sidebar to load this conversation for deletion';
        }
    }

    /**
     * Inject buttons into DOM
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

            // Create and inject
            const deleteBtn = createDeleteButton(() => handleDelete(triggerBtn));
            container.appendChild(deleteBtn);
        });

        // 2. Search View Processing (Floating Button)
        const chatWindow = document.querySelector(SELECTORS.chatContainer);
        if (chatWindow) {
            // Check if we have a standard header button already.
            const hasStandardHeader = Array.from(targets).some(t =>
                !t.closest('bard-sidenav') && !t.closest('side-navigation-content')
            );

            // Only add floating button if standard header button is missing
            if (!hasStandardHeader) {
                let floatingBtn = document.querySelector('.gemini-quick-delete-btn.floating');
                if (!floatingBtn) {
                    floatingBtn = createDeleteButton(async () => {
                        if (floatingBtn._targetTrigger) {
                            await handleDelete(floatingBtn._targetTrigger);
                        }
                    }, true); // true = isFloating

                    // Ensure relative positioning for absolute child
                    if (getComputedStyle(chatWindow).position === 'static') {
                        chatWindow.style.position = 'relative';
                    }
                    chatWindow.appendChild(floatingBtn);
                }

                // Update state
                const conversationId = getConversationIdFromMainView();
                updateFloatingButton(floatingBtn, conversationId);
            }
        }
    }

    /**
     * Initialization
     */
    function init() {
        addStyles();
        processNodes();

        const observer = new MutationObserver(() => {
            processNodes();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Handle Keyboard Shortcut (Ctrl+D)
     */
    async function handleKeyboardShortcut(e) {
        // Only trigger on Ctrl + D (or Meta + D for Mac support if desired, though usually Ctrl in Windows context)
        if (!((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D'))) return;

        // Ignore if user is typing in an input
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
            return;
        }

        e.preventDefault(); // Prevent bookmarking or other default browser actions
        console.log('Ctrl+D detected: Triggering 1-Click Delete...');

        // 1. Try to find an existing standard delete button (header)
        const standardBtn = document.querySelector('.gemini-quick-delete-btn:not(.floating)');
        if (standardBtn && !standardBtn.disabled) {
            standardBtn.click();
            return;
        }

        // 2. Try floating button (search view context)
        const floatingBtn = document.querySelector('.gemini-quick-delete-btn.floating');
        if (floatingBtn && !floatingBtn.disabled && floatingBtn.style.display !== 'none') {
            floatingBtn.click();
            return;
        }

        console.warn('Delete button not available or disabled.');
    }

    if (document.body) {
        init();
        document.addEventListener('keydown', handleKeyboardShortcut);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            init();
            document.addEventListener('keydown', handleKeyboardShortcut);
        });
    }

})();
