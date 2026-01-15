// ==UserScript==
// @name         NotebookLM Source Delete Button
// @namespace    userscript.moukaeritai.work
// @version      0.1.1
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
                detail: { id: SCRIPT_ID, version: '0.1.1' }
            }));
        }
    });

    const SELECTORS = {
        SCROLL_AREA: '.scroll-area-desktop',
        SOURCE_CONTAINER: '.single-source-container',
        TITLE_COLUMN: '.source-title-column',
        NUMBERING: 'notebooklm-source-number'
    };

    let currentScrollArea = null;
    let observer = null;

    function isNotebookPage() {
        return location.hostname === 'notebooklm.google.com' && location.pathname.startsWith('/notebook/');
    }

    function addNumbering() {
        const containers = document.querySelectorAll(SELECTORS.SOURCE_CONTAINER);
        containers.forEach((container, index) => {
            let numberSpan = container.querySelector(`.${SELECTORS.NUMBERING}`);
            if (!numberSpan) {
                numberSpan = document.createElement('span');
                numberSpan.className = SELECTORS.NUMBERING;
                numberSpan.style.marginRight = '8px';
                numberSpan.style.fontWeight = 'bold';
                numberSpan.style.color = '#555';
                numberSpan.style.minWidth = '24px';
                numberSpan.style.display = 'inline-block';
                numberSpan.style.textAlign = 'right';

                const titleColumn = container.querySelector(SELECTORS.TITLE_COLUMN);
                if (titleColumn) {
                    titleColumn.insertBefore(numberSpan, titleColumn.firstChild);
                } else {
                    container.prepend(numberSpan);
                }
            }
            // Update number (1-based index)
            numberSpan.textContent = `${index + 1}.`;
        });
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
                addNumbering();
                
                // Observe for changes in the list (e.g., adding/removing sources)
                observer = new MutationObserver(() => addNumbering());
                observer.observe(scrollArea, { childList: true });
            }
        }
    }, 1000);
})();