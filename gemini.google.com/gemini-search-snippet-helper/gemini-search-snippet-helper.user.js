// ==UserScript==
// @name         Gemini Search Snippet Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.18
// @lastModified 2026-04-03
// @description  Add sequential numbers to Gemini search result conversation titles.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
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

    // Reserve a load-order slot (no gus-version badge in this script)
    registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {

        const initUserScript = () => {

            const SNIPPET_SELECTOR = 'search-snippet';
            const TITLE_SELECTOR = '.title';
            const NUMBER_CLASS = 'search-snippet-helper-number';
            const SEARCH_PAGE_PREFIX = 'https://gemini.google.com/search';

            function isSearchPage() {
                return window.location.href.startsWith(SEARCH_PAGE_PREFIX);
            }

            // --- URL Change Detection ---
            function onUrlChange() {
                if (isSearchPage()) {
                    addNumbers();
                }
            }

            // 1. Listen for browser back/forward
            window.addEventListener('popstate', onUrlChange);

            // 2. Monkey-patch pushState and replaceState for SPA navigation
            const originalPushState = history.pushState;
            history.pushState = function () {
                const ret = originalPushState.apply(this, arguments);
                onUrlChange();
                return ret;
            };

            const originalReplaceState = history.replaceState;
            history.replaceState = function () {
                const ret = originalReplaceState.apply(this, arguments);
                onUrlChange();
                return ret;
            };
            // -----------------------------

            function addNumbers() {
                if (!isSearchPage()) return;

                const snippets = document.querySelectorAll(SNIPPET_SELECTOR);
                snippets.forEach((snippet, index) => {
                    const title = snippet.querySelector(TITLE_SELECTOR);
                    if (title) {
                        let numberSpan = title.querySelector(`.${NUMBER_CLASS}`);
                        if (!numberSpan) {
                            numberSpan = document.createElement('span');
                            numberSpan.className = NUMBER_CLASS;
                            numberSpan.style.fontSize = '0.75em';
                            numberSpan.style.color = 'var(--text-dim, #888)'; // Trying to use variable or fallback
                            numberSpan.style.marginRight = '6px';
                            numberSpan.style.opacity = '0.7';
                            numberSpan.style.fontFamily = 'monospace';
                            title.insertBefore(numberSpan, title.firstChild);
                        }
                        // Always update the number to ensure correctness when lists change
                        numberSpan.textContent = `${index + 1}.`;
                    }
                });
            }

            const observer = new MutationObserver((mutations) => {
                if (!isSearchPage()) return;

                let shouldUpdate = false;
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        shouldUpdate = true;
                        break;
                    }
                }

                if (shouldUpdate) {
                    requestAnimationFrame(addNumbers);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Initial run
            addNumbers();
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
