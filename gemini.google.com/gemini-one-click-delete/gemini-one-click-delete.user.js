// ==UserScript==
// @name         Gemini 1-Click Delete Conversation
// @namespace    https://userscript.moukaeritai.work/
// @version      0.1.17
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

    const waitForElement = async (selector, timeout = 5000, context = document) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = context.querySelector(selector);
            if (el) return el;
            await sleep(100);
        }
        return null;
    };

    const simulateClick = (element) => {
        if (!element) return;
        element.dispatchEvent(new MouseEvent('click', {
            view: null,
            bubbles: true,
            cancelable: true
        }));
    };

    const createSvgElement = () => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("height", "20");
        svg.setAttribute("viewBox", "0 -960 960 960");
        svg.setAttribute("width", "20");
        svg.setAttribute("fill", "currentColor");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z");

        svg.appendChild(path);
        return svg;
    };

    const createDeleteButton = (onClick, isFloating = false) => {
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
    };

    const addStyles = () => {
        const style = document.createElement('style');
        style.id = 'gemini-one-click-delete-style';
        style.textContent = `
            /* ... (styles remain the same) */
        `;
        document.head.appendChild(style);
        return style;
    };

    const handleDelete = async (triggerBtn) => {
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
    };

    const getConversationIdFromMainView = () => {
        // ... (getConversationIdFromMainView logic remains the same)
    };

    const findSidebarItem = (_conversationId) => {
        if (!_conversationId) return null;
        // Search all specific conversation items in sidebar
        // This relies on them having the ID in their jslog too, or checking href/data attributes
        // The sample analysis showed jslog contains the ID.
        // We can search for any element containing the ID in its attributes if we wanna be broad
        // But let's try to be specific to 'div[data-test-id="conversation"]'
        const items = document.querySelectorAll(SELECTORS.sidebarItem);
        for (const item of items) {
            const jslog = item.getAttribute('jslog') || '';
            // Also check inner elements if the attribute is not on the container
            if (jslog.includes(_conversationId)) return item;
            if (item.innerHTML.includes(_conversationId)) return item;
        }
        return null;
    };

    const updateFloatingButton = (btn, conversationId) => {
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
    };

    const processNodes = () => {
        // A. Handle Turn Buttons
        // Find all "More" buttons
        const moreButtons = document.querySelectorAll(SELECTORS.actionsMenuButton);
        moreButtons.forEach(triggerBtn => {
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

        // B. Search View Processing (Floating Button)
        const chatWindow = document.querySelector(SELECTORS.chatContainer);
        if (chatWindow) {
            // Check if we have a standard header button already.
            const hasStandardHeader = Array.from(moreButtons).some(t =>
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
    };

    const handleKeyboardShortcut = async (e) => {
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
    };

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
        const isChatPage = /^\/(app|gem)\/[a-f0-9]{16}/.test(location.pathname);

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
