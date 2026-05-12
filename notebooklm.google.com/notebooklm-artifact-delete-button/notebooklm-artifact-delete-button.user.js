// ==UserScript==
// @name         NotebookLM Artifact Delete Button
// @namespace    userscript.moukaeritai.work
// @version      0.1.6
// @lastModified  2025-02-13
// @description  Add delete buttons to NotebookLM artifacts (notes, audio, etc.)
// @author       Takashi Sasaki
// @match        https://notebooklm.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/notebooklm.google.com/notebooklm-artifact-delete-button/notebooklm-artifact-delete-button.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/notebooklm.google.com/notebooklm-artifact-delete-button/notebooklm-artifact-delete-button.user.js
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_ID = 'notebooklm-artifact-delete-button';

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

    // Version Check API
    window.addEventListener('userscript-check-version', (e) => {
        if (e.detail === SCRIPT_ID) {
            window.dispatchEvent(new CustomEvent('userscript-version-response', {
                detail: { id: SCRIPT_ID, version: GM_info.script.version }
            }));
        }
    });

    const SELECTORS = {
        SCROLL_AREA: 'studio-panel .panel-content-scrollable',
        ITEM_CONTAINER: 'artifact-library-note, artifact-library-item',
        ACTION_CONTAINER: '.artifact-action-container',
        MORE_BUTTON: 'button.mat-mdc-menu-trigger', // Generic trigger within the item
        MENU_DELETE_BTN_TEXT: ['Delete', 'Remove'],
        OVERLAY_CONTAINER: '.cdk-overlay-container',
        OVERLAY_PANE: '.cdk-overlay-pane',
        CONFIRM_DELETE_BTN: 'mat-dialog-container button.submit',
        DELETE_BTN_CLASS: 'notebooklm-artifact-delete-btn'
    };

    let uiPanel = null;

    function createUIPanel() {
        if (document.getElementById(`${SCRIPT_ID}-panel`)) return;

        uiPanel = document.createElement('div');
        uiPanel.id = `${SCRIPT_ID}-panel`;
        uiPanel.style.position = 'fixed';
        uiPanel.style.bottom = '10px';
        uiPanel.style.right = '10px';
        uiPanel.style.padding = '5px 10px';
        uiPanel.style.background = 'linear-gradient(45deg, rgba(200, 220, 255, 0.8), rgba(220, 200, 255, 0.8))';
        uiPanel.style.border = '1px solid #ccc';
        uiPanel.style.borderRadius = '5px';
        uiPanel.style.zIndex = '10000';
        uiPanel.style.fontSize = '12px';
        uiPanel.style.fontFamily = 'monospace';
        uiPanel.style.color = '#333';
        uiPanel.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        uiPanel.style.display = 'none'; // Initially hidden

        const text = document.createElement('span');
        text.textContent = `${GM_info.script.name} v${GM_info.script.version}`;
        uiPanel.appendChild(text);

        document.body.appendChild(uiPanel);
    }

    let currentScrollArea = null;
    let observer = null;
    let pollTimer = null;

    function log(...args) {
        console.log(`[${SCRIPT_ID}]`, ...args);
    }

    function isNotebookPage() {
        return location.hostname === 'notebooklm.google.com' && location.pathname.startsWith('/notebook/');
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Waits for an element to appear in the DOM.
     * @param {string|((scope: ParentNode) => Element|null)} selectorOrPredicate
     * @param {ParentNode} [context=document]
     * @param {number} [timeout=5000]
     * @returns {Promise<Element>}
     */
    function waitForElement(selectorOrPredicate, context = document, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const getElement = () => typeof selectorOrPredicate === 'function'
                ? selectorOrPredicate(context)
                : context.querySelector(selectorOrPredicate);

            const el = getElement();
            if (el) return resolve(el);

            let timeoutId = null;
            const observer = new MutationObserver(() => {
                const el = getElement();
                if (el) {
                    if (timeoutId) clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(context === document ? document.body : context, {
                childList: true,
                subtree: true
            });

            timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selectorOrPredicate}`));
            }, timeout);
        });
    }

    // Helper functions for event emulation
    const dispatchMouseEvents = (el, types) => {
        types.forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
    };

    const emulateClick = (el) => {
        dispatchMouseEvents(el, ['mousedown', 'mouseup', 'click']);
    };
    const emulateHover = (el) => {
        dispatchMouseEvents(el, ['mouseenter', 'mouseover']);
    };

    function getMenuScope() {
        const overlay = document.querySelector(SELECTORS.OVERLAY_CONTAINER);
        if (!overlay) return document;
        const panes = overlay.querySelectorAll(SELECTORS.OVERLAY_PANE);
        if (panes.length > 0) {
            return panes[panes.length - 1];
        }
        return overlay;
    }

    async function triggerNativeDelete(container) {
        log('Starting delete sequence for artifact:', container);

        // 1. Reveal the "More" button by hovering the container
        emulateHover(container);

        // Wait for More button to appear
        let moreBtn = null;
        try {
            moreBtn = await waitForElement(SELECTORS.MORE_BUTTON, container, 2000);
        } catch (e) {
            log('More button not found:', e.message);
            return;
        }

        // 2. Open the native menu
        emulateClick(moreBtn);
        log('Clicked More button, waiting for menu...');

        // 3. Poll for the menu item and click it
        let deleteMenuItem = null;
        try {
            deleteMenuItem = await waitForElement((scope) => {
                const menuScope = getMenuScope();
                const menuItems = menuScope.querySelectorAll('button[role="menuitem"]');
                for (const item of menuItems) {
                    const text = item.textContent.trim();
                    if (SELECTORS.MENU_DELETE_BTN_TEXT.some(t => text.includes(t))) {
                        return item;
                    }
                }
                return null;
            }, document, 5000);
        } catch (e) {
            log('Delete menu item not found:', e.message);
            // Close menu if open
            document.body.click();
            return;
        }

        if (deleteMenuItem) {
            log('Delete menu item found. Clicking...');
            emulateClick(deleteMenuItem);

            // 4. Wait for the confirmation dialog and click "Delete"
            log('Waiting for confirmation dialog...');
            let confirmBtn = null;
            try {
                confirmBtn = await waitForElement(SELECTORS.CONFIRM_DELETE_BTN, document, 5000);
            } catch (e) {
                log('Confirmation dialog timed out (or not needed):', e.message);
                return;
            }

            if (confirmBtn) {
                log('Confirmation button found. Clicking...', confirmBtn);
                emulateClick(confirmBtn);
            }
        }
    }

    function updateUI() {
        const items = document.querySelectorAll(SELECTORS.ITEM_CONTAINER);
        items.forEach(item => {
            const actionContainer = item.querySelector(SELECTORS.ACTION_CONTAINER);
            if (actionContainer && !actionContainer.querySelector(`.${SELECTORS.DELETE_BTN_CLASS}`)) {
                const btn = document.createElement('button');
                btn.className = SELECTORS.DELETE_BTN_CLASS;
                btn.textContent = '×';
                btn.title = 'Delete artifact';
                // Style to match the look
                btn.style.marginLeft = '4px';
                btn.style.border = 'none';
                btn.style.background = 'transparent';
                btn.style.color = '#888';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '18px';
                btn.style.padding = '0 4px';
                btn.style.lineHeight = '1';
                btn.style.verticalAlign = 'middle';
                btn.style.zIndex = '10'; // Ensure it's clickable

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    triggerNativeDelete(item);
                });
                
                // Prevent the button click from triggering the item open
                btn.addEventListener('mousedown', (e) => e.stopPropagation());

                actionContainer.appendChild(btn);
            }
        });
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (uiPanel) {
            uiPanel.style.display = 'none';
        }
        currentScrollArea = null;
    }

    function startPolling() {
        if (!uiPanel) createUIPanel();
        if (uiPanel) uiPanel.style.display = 'block';

        if (pollTimer) return;
        pollTimer = setInterval(() => {
            if (!isNotebookPage()) {
                stopPolling();
                return;
            }

            const scrollArea = document.querySelector(SELECTORS.SCROLL_AREA);
            
            // Always try to update UI if scroll area exists, to handle initial load or missed mutations
            if (scrollArea) {
                updateUI();
                
                if (scrollArea !== currentScrollArea) {
                    if (observer) {
                        observer.disconnect();
                    }
                    currentScrollArea = scrollArea;
                    observer = new MutationObserver(() => updateUI());
                    observer.observe(scrollArea, { childList: true });
                }
            }
        }, 1000);
    }

    function handleNavigation() {
        if (isNotebookPage()) {
            startPolling();
        } else {
            stopPolling();
        }
    }

    const originalPushState = history.pushState;
    history.pushState = function(...args) {
        const result = originalPushState.apply(this, args);
        handleNavigation();
        return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
        const result = originalReplaceState.apply(this, args);
        handleNavigation();
        return result;
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    createUIPanel(); // Create panel on script start
    handleNavigation();
})();
