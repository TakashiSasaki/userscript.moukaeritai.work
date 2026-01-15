// ==UserScript==
// @name         Gemini Saved Info Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.3
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
    const NUMBER_SPAN_CLASS = 'userscript-gemini-saved-info-number';
    let instructionsObserver = null; // To observe the list of instructions

    /**
     * Removes all existing serial numbers and re-adds them to all instructions.
     * This ensures the numbering is always correct even if items are added/removed.
     * @param {HTMLElement} memoriesSection The container for all instructions.
     */
    function renumberInstructions(memoriesSection) {
        if (!memoriesSection) return;

        // 1. Remove all existing numbers to prevent duplicates and handle deletions.
        const existingNumbers = memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`);
        existingNumbers.forEach(num => num.remove());

        // 2. Get all current instructions.
        const instructions = memoriesSection.querySelectorAll('.memory');
        if (instructions.length === 0) {
            return; // No instructions to number.
        }

        console.log(`[gemini-saved-info] Found ${instructions.length} instructions. Re-numbering.`);

        // 3. Add new, correct numbers to each instruction.
        instructions.forEach((instruction, index) => {
            const textElement = instruction.querySelector('.memory-text');
            if (textElement) {
                const numberSpan = document.createElement('span');
                numberSpan.className = NUMBER_SPAN_CLASS;
                numberSpan.textContent = `${index + 1}. `;
                numberSpan.style.fontWeight = 'bold';
                textElement.prepend(numberSpan);
            }
        });
    }

    /**
     * Starts a dedicated MutationObserver to watch for changes in the list of instructions.
     * @param {HTMLElement} memoriesSection The container for all instructions.
     */
    function startInstructionsObserver(memoriesSection) {
        const instructionsContainer = memoriesSection.querySelector('.memories-container');
        if (!instructionsContainer) return;

        // If an observer is already running, disconnect it first.
        if (instructionsObserver) instructionsObserver.disconnect();

        instructionsObserver = new MutationObserver(() => {
            // When a change is detected (add/remove), re-number everything.
            renumberInstructions(memoriesSection);
        });

        instructionsObserver.observe(instructionsContainer, { childList: true });

        // Initial numbering when the observer starts.
        renumberInstructions(memoriesSection);
        console.log('[gemini-saved-info] Instructions observer started.');
    }

    /**
     * Stops the instructions observer and cleans up any added numbers.
     */
    function stopInstructionsObserver() {
        if (instructionsObserver) {
            instructionsObserver.disconnect();
            instructionsObserver = null;
            console.log('[gemini-saved-info] Instructions observer stopped.');

            // Clean up numbers when we navigate away.
            const memoriesSection = document.querySelector('div[data-test-id="memories-section"]');
            if (memoriesSection) {
                const existingNumbers = memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`);
                existingNumbers.forEach(num => num.remove());
            }
        }
    }

    /**
     * Main observer to watch for page navigation in the SPA.
     */
    const pageObserver = new MutationObserver(() => {
        const onTargetPage = window.location.href.startsWith(TARGET_PAGE_URL);
        const memoriesSection = document.querySelector('div[data-test-id="memories-section"]');

        if (onTargetPage && memoriesSection) {
            // If we are on the right page and the container exists,
            // start the specific instructions observer if it's not already running.
            if (!instructionsObserver) {
                startInstructionsObserver(memoriesSection);
            }
        } else {
            // If we're on a different page or the container is gone, stop the observer.
            stopInstructionsObserver();
        }
    });

    // Start the main page observer.
    pageObserver.observe(document.body, { childList: true, subtree: true });

})();
