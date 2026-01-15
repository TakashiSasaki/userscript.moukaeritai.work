// ==UserScript==
// @name         NotebookLM Source Delete Button
// @namespace    userscript.moukaeritai.work
// @version      0.1.8
// @description  Add delete buttons and numbering to NotebookLM sources
// @author       Takashi Sasaki
// @match        https://notebooklm.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @grant        none
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/notebooklm.google.com/notebooklm-source-delete-button/notebooklm-source-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/notebooklm.google.com/notebooklm-source-delete-button/notebooklm-source-delete.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_ID = 'notebooklm-source-delete-button';

    // Portal API Guard
    if (location.host === "userscript.moukaeritai.work" || location.host === "127.0.0.1:5500" || location.host.endsWith(".app.github.dev")) {
        window.dispatchEvent(new CustomEvent('userscript-check-installed'));
        window.addEventListener('userscript-ping', () => {
            // console.log('Pong received!');
        });
        return;
    }

    // Version Check API
    window.addEventListener('userscript-check-version', (e) => {
        if (e.detail === SCRIPT_ID) {
            window.dispatchEvent(new CustomEvent('userscript-version-response', {
                detail: { id: SCRIPT_ID, version: '0.1.8' }
            }));
        }
    });

    const SELECTORS = {
        SCROLL_AREA: '.scroll-area-desktop',
        SOURCE_CONTAINER: '.single-source-container',
        TITLE_COLUMN: '.source-title-column',
        CHECKBOX_CONTAINER: '.select-checkbox-container',
        MORE_BUTTON: '.source-item-more-button',
        NATIVE_DELETE_BTN: 'button.more-menu-delete-source-button',
        CONFIRM_DELETE_BTN: 'mat-dialog-container button.submit',
        NUMBERING: 'notebooklm-source-number',
        DELETE_BTN: 'notebooklm-source-delete-btn'
    };

    let currentScrollArea = null;
    let observer = null;

    function log(...args) {
        console.log(`[${SCRIPT_ID}]`, ...args);
    }

    function isNotebookPage() {
        return location.hostname === 'notebooklm.google.com' && location.pathname.startsWith('/notebook/');
    }

    function updateUI() {
        const containers = document.querySelectorAll(SELECTORS.SOURCE_CONTAINER);
        containers.forEach((container, index) => {
            // 1. Add/Update Numbering
            const titleColumn = container.querySelector(SELECTORS.TITLE_COLUMN);
            if (titleColumn) {
                let numberSpan = titleColumn.querySelector(`.${SELECTORS.NUMBERING}`);
                if (!numberSpan) {
                    numberSpan = document.createElement('span');
                    numberSpan.className = SELECTORS.NUMBERING;
                    numberSpan.style.position = 'absolute';
                    numberSpan.style.top = '0px';
                    numberSpan.style.left = '0px';
                    numberSpan.style.fontSize = '10px';
                    numberSpan.style.color = '#888';
                    numberSpan.style.lineHeight = '1';
                    numberSpan.style.pointerEvents = 'none';
                    titleColumn.style.position = 'relative';
                    titleColumn.appendChild(numberSpan);
                }
                numberSpan.textContent = index + 1;
            }

            // 2. Add Delete Button
            const checkboxContainer = container.querySelector(SELECTORS.CHECKBOX_CONTAINER);
            if (checkboxContainer && !checkboxContainer.querySelector(`.${SELECTORS.DELETE_BTN}`)) {
                const btn = document.createElement('button');
                btn.className = SELECTORS.DELETE_BTN;
                btn.textContent = '×';
                btn.title = 'Remove source';
                btn.style.marginLeft = '4px';
                btn.style.border = 'none';
                btn.style.background = 'transparent';
                btn.style.color = '#888';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '16px';
                btn.style.padding = '0 4px';
                btn.style.lineHeight = '1';
                btn.style.verticalAlign = 'middle';

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    triggerNativeDelete(container);
                });
                checkboxContainer.appendChild(btn);
            }
        });
    }

    function triggerNativeDelete(container) {
        log('Starting delete sequence for container:', container);

        const dispatchMouseEvents = (el, types) => {
            types.forEach(type => {
                el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            });
        };

        const emulateClick = (el) => {
            log('Emulating click on:', el);
            dispatchMouseEvents(el, ['mousedown', 'mouseup', 'click']);
        };
        const emulateHover = (el) => {
            log('Emulating hover on:', el);
            dispatchMouseEvents(el, ['mouseenter', 'mouseover']);
        };

        const startSequence = (btn) => {
            log('Starting sequence with More button:', btn);
            // 2. Open the native menu
            emulateClick(btn);

            // 3. Wait for the menu item and click it
            log('Waiting for menu to appear...');
            const menuObserver = new MutationObserver((mutations, obs) => {
                let nativeDeleteBtn = document.querySelector(SELECTORS.NATIVE_DELETE_BTN);
                log('Searching for native delete button...', nativeDeleteBtn ? 'Found by selector' : 'Not found by selector');

                // Fallback: Find by text content if specific class is missing
                if (!nativeDeleteBtn) {
                    log('Attempting fallback search by text content "Remove source"...');
                    const menuItems = document.querySelectorAll('button[role="menuitem"]');
                    for (const item of menuItems) {
                        if (item.textContent.includes('Remove source')) {
                            nativeDeleteBtn = item;
                            log('Found by text content:', item);
                            break;
                        }
                    }
                }

                if (nativeDeleteBtn) {
                    log('Native delete button found. Clicking...');
                    obs.disconnect();
                    emulateClick(nativeDeleteBtn);

                    // 4. Wait for the confirmation dialog and click "Delete"
                    log('Waiting for confirmation dialog...');
                    const dialogObserver = new MutationObserver((mutations2, obs2) => {
                        const confirmBtn = document.querySelector(SELECTORS.CONFIRM_DELETE_BTN);
                        if (confirmBtn) {
                            log('Confirmation button found. Clicking...', confirmBtn);
                            obs2.disconnect();
                            emulateClick(confirmBtn);
                        }
                    });
                    dialogObserver.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => {
                        log('Dialog observer timed out.');
                        dialogObserver.disconnect();
                    }, 2000);
                }
            });

            menuObserver.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                log('Menu observer timed out.');
                menuObserver.disconnect();
            }, 2000);
        };

        // 1. Reveal the "More" button by hovering the container
        emulateHover(container);

        const moreBtn = container.querySelector(SELECTORS.MORE_BUTTON);
        if (moreBtn) {
            log('More button found immediately.');
            startSequence(moreBtn);
        } else {
            log('More button not found. Waiting for it to appear...');
            // If not found immediately, it might be dynamically added on hover
            const btnObserver = new MutationObserver((mutations, obs) => {
                const btn = container.querySelector(SELECTORS.MORE_BUTTON);
                if (btn) {
                    log('More button appeared.');
                    obs.disconnect();
                    startSequence(btn);
                }
            });
            btnObserver.observe(container, { childList: true, subtree: true });
            setTimeout(() => {
                log('More button observer timed out.');
                btnObserver.disconnect();
            }, 1000);
        }
    }

    // Polling to handle SPA navigation and dynamic loading
    setInterval(() => {
        // Performance optimization: only run on notebook pages
        if (!isNotebookPage()) {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            currentScrollArea = null;
            return;
        }

        const scrollArea = document.querySelector(SELECTORS.SCROLL_AREA);
        
        // Check if the scroll area element has changed (e.g., due to page navigation)
        if (scrollArea !== currentScrollArea) {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            currentScrollArea = scrollArea;
            
            if (scrollArea) {
                // Initial numbering for the new view
                updateUI();
                
                // Observe for changes in the list (e.g., adding/removing sources)
                observer = new MutationObserver(() => updateUI());
                observer.observe(scrollArea, { childList: true });
            }
        }
    }, 1000);
})();