// ==UserScript==
// @name         NotebookLM Source Delete Button
// @namespace    userscript.moukaeritai.work
// @version      0.1.3
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
                detail: { id: SCRIPT_ID, version: '0.1.3' }
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
        NUMBERING: 'notebooklm-source-number',
        DELETE_BTN: 'notebooklm-source-delete-btn'
    };

    let currentScrollArea = null;
    let observer = null;

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
        const moreBtn = container.querySelector(SELECTORS.MORE_BUTTON);
        if (!moreBtn) return;

        // Open the native menu
        moreBtn.click();

        // Observe the body for the appearance of the menu in the CDK overlay
        const menuObserver = new MutationObserver((mutations, obs) => {
            const nativeDeleteBtn = document.querySelector(SELECTORS.NATIVE_DELETE_BTN);
            if (nativeDeleteBtn) {
                nativeDeleteBtn.click();
                obs.disconnect();
            }
        });

        menuObserver.observe(document.body, { childList: true, subtree: true });
        // Safety timeout to stop observing if the menu doesn't appear
        setTimeout(() => menuObserver.disconnect(), 2000);
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