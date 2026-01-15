// ==UserScript==
// @name         Gemini Saved Info Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.2
// @description  Adds serial numbers to custom instructions on Gemini.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @grant        none
// @license      MIT
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_PAGE_URL = 'https://gemini.google.com/saved-info';
    const NUMBERED_MARKER = 'data-numbered';
    const NUMBER_SPAN_CLASS = 'userscript-gemini-saved-info-number';

    const addSerialNumbers = (container) => {
        if (container.hasAttribute(NUMBERED_MARKER)) {
            return;
        }

        const instructions = container.querySelectorAll('.memory');
        if (instructions.length === 0) {
            return;
        }

        console.log(`[gemini-saved-info] Found ${instructions.length} instructions. Adding serial numbers.`);

        instructions.forEach((instruction, index) => {
            const textElement = instruction.querySelector('.memory-text');
            if (textElement && !textElement.querySelector(`.${NUMBER_SPAN_CLASS}`)) {
                const numberSpan = document.createElement('span');
                numberSpan.className = NUMBER_SPAN_CLASS;
                numberSpan.textContent = `${index + 1}. `;
                numberSpan.style.fontWeight = 'bold';
                textElement.prepend(numberSpan);
            }
        });

        container.setAttribute(NUMBERED_MARKER, 'true');
    };

    const removeSerialNumbers = () => {
        const container = document.querySelector(`div[data-test-id="memories-section"][${NUMBERED_MARKER}]`);
        if (container) {
            container.removeAttribute(NUMBERED_MARKER);
            const numbers = container.querySelectorAll(`.${NUMBER_SPAN_CLASS}`);
            numbers.forEach(num => num.remove());
            console.log('[gemini-saved-info] Navigated away, removed serial numbers.');
        }
    };

    const observer = new MutationObserver((mutationsList, obs) => {
        if (window.location.href.startsWith(TARGET_PAGE_URL)) {
            const container = document.querySelector('div[data-test-id="memories-section"]');
            if (container) {
                addSerialNumbers(container);
            }
        } else {
            removeSerialNumbers();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
