// ==UserScript==
// @name         Gemini 1-Click Delete Conversation
// @namespace    https://userscript.moukaeritai.work/
// @version      0.3.17
// @lastModified 2026-04-01
// @description  Adds a 1-click floating button with shortcut to delete the current Gemini conversation.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     customCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/style.css
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function () {
    'use strict';
const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    if (location.hostname === 'userscript.moukaeritai.work') {
        return;
    }

    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {

        const initUserScript = () => {

            const policy = window.geminiCreateTrustedHTMLPolicy('geminiDeletePanel');

            const SELECTORS = {
                // Trigger button (Conversation Options)
                // Shared by Desktop and Mobile
                actionsMenuButton: 'button[data-test-id="conversation-actions-menu-icon-button"], button[data-test-id="actions-menu-button"], button[aria-label="Open menu for conversation actions."]',

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
             * Style injection
             */
            function addStyles() {
                // Inject shared common styles
                const commonCSS = GM_getResourceText('geminiCommon');
                if (commonCSS && !document.getElementById('gemini-common-styles')) {
                    const commonStyle = document.createElement('style');
                    commonStyle.textContent = commonCSS;
                    commonStyle.id = 'gemini-common-styles';
                    document.head.appendChild(commonStyle);
                }

                if (document.getElementById('gemini-delete-styles')) return;
                const css = GM_getResourceText('customCSS');
                const style = GM_addStyle(css);
                if (style) {
                    style.id = 'gemini-delete-styles';
                    return style;
                } else {
                    const el = document.querySelector('style:last-of-type');
                    if (el) el.id = 'gemini-delete-styles';
                    return el;
                }
            }

            /**
             * Main Delete Logic
             */
            async function handleDelete(triggerBtn) {
                console.log('Starting Delete Flow...');

                // 1. Open Menu
                simulateClick(triggerBtn);

                let menu;
                try {
                    // 2. Wait for Menu Panel (selector, context, timeout)
                    menu = await window.geminiWaitForElement(SELECTORS.menuPanel, document, 5000);
                } catch {
                    throw new Error('Menu panel did not appear.');
                }

                // Wait for buttons to populate in the dynamic menu
                try {
                    await window.geminiWaitForElement('button', menu, 2000);
                } catch {
                    console.warn('Timeout waiting for buttons to populate in menu.');
                }

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
                let dialog;
                try {
                    dialog = await window.geminiWaitForElement(SELECTORS.dialogContainer, document, 5000);
                } catch {
                    throw new Error('Confirmation dialog did not appear.');
                }

                // Wait for buttons to populate in the dialog
                try {
                    await window.geminiWaitForElement('button', dialog, 2000);
                } catch {
                    console.warn('Timeout waiting for buttons to populate in dialog.');
                }

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
            function updatePanelState() {
                const panel = document.getElementById('gemini-delete-panel');
                if (!panel) return;

                const delBtn = panel.querySelector('#gdp-global-delete-btn');
                if (!delBtn) return;

                // Try to find the standard header actions menu trigger (three dots)
                const headerTriggers = Array.from(document.querySelectorAll(SELECTORS.actionsMenuButton))
                    .filter(t => !t.closest('bard-sidenav') && !t.closest('side-navigation-content'));

                if (headerTriggers.length > 0) {
                    // Header button is available, we can delete the current conversation
                    delBtn.disabled = false;
                    delBtn.title = '1-Click Delete Current Chat';
                    delBtn._targetTrigger = headerTriggers[0];
                    return;
                }

                // Fallback: If header is not available (e.g., search view or no active chat), check sidebar
                const match = location.pathname.match(/\/(app|gem)\/([a-f0-9]{16})/);
                const conversationId = match ? match[2] : null;

                if (conversationId) {
                    const sidebarItem = findSidebarItem(conversationId);
                    if (sidebarItem) {
                        const trigger = sidebarItem.querySelector(SELECTORS.actionsMenuButton);
                        if (trigger) {
                            delBtn.disabled = false;
                            delBtn.title = '1-Click Delete (via Sidebar)';
                            delBtn._targetTrigger = trigger;
                            return;
                        }
                    }
                }

                // No targets found
                delBtn.disabled = true;
                delBtn.title = 'No active conversation found or menu missing';
                delBtn._targetTrigger = null;
            }

            /**
             * Create the Global Draggable Panel
             */
            function createDraggablePanel() {
                if (document.getElementById('gemini-delete-panel')) return;

                const panel = document.createElement('div');
                panel.id = 'gemini-delete-panel';
                panel.className = 'gus-panel';
                const version = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '0.3.10';

                window.geminiSetInnerHTML(panel, `
                    <button class="gdp-main-delete-btn" id="gdp-global-delete-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                        </svg>
                        Delete Chat
                    </button>
                    <span class="version-badge gus-version" title="Gemini 1-Click Delete Conversation">🗑️ ${version} ${gusEmoji}</span>
                `, policy);

                document.body.appendChild(panel);

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

                const handle = panel.querySelector('.version-badge');
                if (handle) {
                    window.geminiSetupDraggablePanel(panel, handle, 'gemini_1click_delete_panel_pos', { right: '20px', bottom: '120px' });
                }
            }

            /**
             * Inject buttons and update panel state
             */
            function processNodes() {
                // Panel Creation and State Update (Standalone buttons are now removed in favor of the panel)
                const chatWindow = document.querySelector(SELECTORS.chatContainer);
                if (chatWindow) {
                    createDraggablePanel();
                    updatePanelState();
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

                // 1. Try global panel delete button
                const panelBtn = document.querySelector('#gdp-global-delete-btn');
                if (panelBtn && !panelBtn.disabled) {
                    panelBtn.click();
                    return;
                }

                console.warn('Delete button not available or disabled.');
            }

            /**
             * Handle External Delete Request (e.g. from gemini-artifact-exporter)
             */
            async function handleExternalDeleteRequest(_e) {
                console.log('[Gemini 1-Click Delete] Received external delete request.');

                // Safety delay to allow Gemini UI to settle after potential exports
                await window.geminiSleep(1000);

                // Ensure panel state is up to date to find targets
                updatePanelState();

                const panelBtn = document.querySelector('#gdp-global-delete-btn');
                if (panelBtn && !panelBtn.disabled) {
                    console.log('[Gemini 1-Click Delete] Triggering delete via panel button.');
                    panelBtn.click();
                } else {
                    console.warn('[Gemini 1-Click Delete] External request ignored: no active conversation or menu missing.');
                }
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

                // Listen for requests from other userscripts
                window.addEventListener('gemini-one-click-delete:request-delete', handleExternalDeleteRequest);

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

                window.removeEventListener('gemini-one-click-delete:request-delete', handleExternalDeleteRequest);

                if (styleElement) {
                    styleElement.remove();
                    styleElement = null;
                }


                const panel = document.getElementById('gemini-delete-panel');
                if (panel) panel.remove();

                isInitialized = false;
            }

            /**
             * Checks the URL and runs init or cleanup accordingly.
             */
            function checkUrlAndManageScriptState() {
                const isChatPage = /^\/(app|gem)\//.test(location.pathname);

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

        };

        if (document.readyState === 'complete') {
            initUserScript();
        } else {
            window.addEventListener('load', initUserScript);
        }
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
