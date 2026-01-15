// ==UserScript==
// @name         NotebookLM Source Delete Button
// @namespace    userscript.moukaeritai.work
// @version      0.1.13
// @description  Add delete buttons and numbering to NotebookLM sources
// @author       Takashi Sasaki
// @match        https://notebooklm.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @grant        GM_info
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/notebooklm.google.com/notebooklm-source-delete-button/notebooklm-source-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/notebooklm.google.com/notebooklm-source-delete-button/notebooklm-source-delete.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_ID = 'notebooklm-source-delete-button';

    // Portal API Guard
    if (location.host === "userscript.moukaeritai.work" || location.host === "127.0.0.1:5500" || location.host.endsWith(".app.github.dev")) {
        window.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
        window.addEventListener('userscript-ping', () => {
            // console.log('Pong received!');
        });
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
        SCROLL_AREA: '.scroll-area-desktop',
        SOURCE_CONTAINER: '.single-source-container',
        TITLE_COLUMN: '.source-title-column',
        CHECKBOX_CONTAINER: '.select-checkbox-container',
        MORE_BUTTON: '.source-item-more-button',
        NATIVE_DELETE_BTN: 'button.more-menu-delete-source-button',
        NATIVE_RENAME_BTN: 'button.more-menu-edit-source-button',
        CONFIRM_DELETE_BTN: 'mat-dialog-container button.submit',
        CONFIRM_RENAME_BTN: 'mat-dialog-container button.submit', // リネーム確定ボタン（もしあれば）
        RENAME_INPUT: 'mat-dialog-container input.title-input',
        NUMBERING: 'notebooklm-source-number',
        DELETE_BTN: 'notebooklm-source-delete-btn',
        RENAME_BTN: 'notebooklm-source-rename-btn'
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

            // 2. Add Rename & Delete Buttons
            const checkboxContainer = container.querySelector(SELECTORS.CHECKBOX_CONTAINER);
            if (checkboxContainer) {
                // Rename Button
                if (!checkboxContainer.querySelector(`.${SELECTORS.RENAME_BTN}`)) {
                    const btn = document.createElement('button');
                    btn.className = SELECTORS.RENAME_BTN;
                    btn.textContent = '✎';
                    btn.title = 'Rename source';
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
                        triggerNativeRename(container);
                    });
                    
                    // Insert before delete button if exists
                    const deleteBtn = checkboxContainer.querySelector(`.${SELECTORS.DELETE_BTN}`);
                    if (deleteBtn) {
                        checkboxContainer.insertBefore(btn, deleteBtn);
                    } else {
                        checkboxContainer.appendChild(btn);
                    }
                }

                // Delete Button
                if (!checkboxContainer.querySelector(`.${SELECTORS.DELETE_BTN}`)) {
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
            }
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper functions for event emulation
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

    async function openMenuAndClick(container, targetSelector, targetTextFallback) {
        log('Starting menu action sequence for container:', container);

        // 1. Reveal the "More" button by hovering the container
        emulateHover(container);

        let moreBtn = container.querySelector(SELECTORS.MORE_BUTTON);
        if (!moreBtn) {
            log('More button not found. Waiting for it to appear...');
            for (let i = 0; i < 20; i++) { // 2 seconds
                await sleep(100);
                moreBtn = container.querySelector(SELECTORS.MORE_BUTTON);
                if (moreBtn) break;
            }
        }

        if (!moreBtn) {
            log('More button never appeared.');
            return false;
        }

        log('More button found:', moreBtn);
        
        // 2. Open the native menu
        emulateClick(moreBtn);
        log('Waiting for menu to appear...');

        // 3. Poll for the menu item and click it
        let targetBtn = null;
        // Wait up to 5 seconds
        for (let i = 0; i < 50; i++) {
            targetBtn = document.querySelector(targetSelector);
            
            // Fallback: Find by text content if specific class is missing
            if (!targetBtn) {
                const menuItems = document.querySelectorAll('button[role="menuitem"]');
                for (const item of menuItems) {
                    if (item.textContent.includes(targetTextFallback)) {
                        targetBtn = item;
                        break;
                    }
                }
            }

            if (targetBtn) break;
            await sleep(100);
        }

        if (targetBtn) {
            log('Target menu button found. Clicking...', targetBtn);
            emulateClick(targetBtn);
            return true;
        } else {
            log('Menu item not found (polling timed out).');
            return false;
        }
    }

    async function triggerNativeRename(container) {
        const success = await openMenuAndClick(container, SELECTORS.NATIVE_RENAME_BTN, 'Rename source');
        if (success) {
            log('Waiting for rename dialog input...');
            for (let i = 0; i < 50; i++) {
                const input = document.querySelector(SELECTORS.RENAME_INPUT);
                if (input) {
                    log('Rename input found. Focusing...');
                    input.focus();
                    input.select(); // テキストを全選択状態にしてすぐ書き換えられるようにする
                    
                    // Enterキーで確定ボタンを自動クリックする補助（オプション）
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            const confirmBtn = document.querySelector(SELECTORS.CONFIRM_RENAME_BTN);
                            if (confirmBtn) emulateClick(confirmBtn);
                        }
                    });
                    break;
                }
                await sleep(100);
            }
        }
    }

    async function triggerNativeDelete(container) {
        const success = await openMenuAndClick(container, SELECTORS.NATIVE_DELETE_BTN, 'Remove source');
        
        if (success) {

            // 4. Wait for the confirmation dialog and click "Delete"
            log('Waiting for confirmation dialog...');
            let confirmBtn = null;
            for (let i = 0; i < 50; i++) {
                confirmBtn = document.querySelector(SELECTORS.CONFIRM_DELETE_BTN);
                if (confirmBtn) break;
                await sleep(100);
            }

            if (confirmBtn) {
                log('Confirmation button found. Clicking...', confirmBtn);
                emulateClick(confirmBtn);
            } else {
                log('Confirmation dialog timed out.');
            }
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