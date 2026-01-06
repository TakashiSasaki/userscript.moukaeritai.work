// ==UserScript==
// @name         Gemini Search Snippet Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  Add sequential numbers to Gemini search result conversation titles.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app
// @match        https://gemini.google.com/app/
// @include      /^https:\/\/gemini\.google\.com\/app\/[a-f0-9]{16}(\?.*)?$/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SNIPPET_SELECTOR = 'search-snippet';
    const TITLE_SELECTOR = '.title';
    const NUMBER_CLASS = 'search-snippet-helper-number';

    function addNumbers() {
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
        let shouldUpdate = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                // Check if the mutation affects search-snippet or its parents/containers
                // Simply checking if we are anywhere near search results
                shouldUpdate = true;
                break;
            }
        }

        if (shouldUpdate) {
            // Debounce or just run? Run for now, optimization later if needed.
            // requestAnimationFrame to batch UI updates
            requestAnimationFrame(addNumbers);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run
    addNumbers();
})();
