// ==UserScript==
// @name         Gemini Saved Info Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.4
// @description  Adds serial numbers and a copy button to custom instructions on Gemini.
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
    const COPY_BUTTON_CLASS = 'userscript-gemini-saved-info-copy-button';
    let instructionsObserver = null; // To observe the list of instructions

    /**
     * Updates all instruction items, adding serial numbers and copy buttons.
     * This ensures the UI is always correct even if items are added/removed.
     * @param {HTMLElement} memoriesSection The container for all instructions.
     */
    function updateInstructionItems(memoriesSection) {
        if (!memoriesSection) return;

        // 1. Remove all existing UI elements to prevent duplicates.
        memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`).forEach(n => n.remove());
        memoriesSection.querySelectorAll(`.${COPY_BUTTON_CLASS}`).forEach(b => b.remove());

        // 2. Get all current instructions.
        const instructions = memoriesSection.querySelectorAll('.memory');
        if (instructions.length === 0) return;

        console.log(`[gemini-saved-info] Found ${instructions.length} instructions. Updating items.`);

        // 3. Add new, correct UI elements to each instruction.
        instructions.forEach((instruction, index) => {
            const textElement = instruction.querySelector('.memory-text');
            const actionsButton = instruction.querySelector('.memory-actions-button');

            if (textElement) {
                // Add serial number
                const numberSpan = document.createElement('span');
                numberSpan.className = NUMBER_SPAN_CLASS;
                numberSpan.textContent = `${index + 1}. `;
                numberSpan.style.fontWeight = 'bold';
                textElement.prepend(numberSpan);
            }

            if (actionsButton) {
                // Add copy button
                const copyButton = document.createElement('button');
                copyButton.className = `${COPY_BUTTON_CLASS} mdc-icon-button mat-mdc-icon-button mat-mdc-button-base`;
                copyButton.setAttribute('aria-label', 'Copy instruction');

                const icon = document.createElement('mat-icon');
                icon.className = 'mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color';
                icon.setAttribute('aria-hidden', 'true');
                icon.setAttribute('fonticon', 'content_copy');
                icon.textContent = 'content_copy';
                copyButton.appendChild(icon);

                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const textToCopy = textElement.textContent.replace(`${index + 1}. `, '');
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        console.log('[gemini-saved-info] Instruction copied to clipboard.');
                        // Optional: Show feedback to the user
                        icon.textContent = 'done';
                        setTimeout(() => { icon.textContent = 'content_copy'; }, 1500);
                    }).catch(err => {
                        console.error('[gemini-saved-info] Failed to copy text: ', err);
                    });
                });

                // Insert the copy button before the 3-dot menu button
                actionsButton.parentNode.insertBefore(copyButton, actionsButton);
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

        if (instructionsObserver) instructionsObserver.disconnect();

        instructionsObserver = new MutationObserver(() => {
            updateInstructionItems(memoriesSection);
        });

        instructionsObserver.observe(instructionsContainer, { childList: true });

        updateInstructionItems(memoriesSection);
        console.log('[gemini-saved-info] Instructions observer started.');
    }

    /**
     * Stops the instructions observer and cleans up any added UI elements.
     */
    function stopInstructionsObserver() {
        if (instructionsObserver) {
            instructionsObserver.disconnect();
            instructionsObserver = null;
            console.log('[gemini-saved-info] Instructions observer stopped.');

            const memoriesSection = document.querySelector('div[data-test-id="memories-section"]');
            if (memoriesSection) {
                memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`).forEach(n => n.remove());
                memoriesSection.querySelectorAll(`.${COPY_BUTTON_CLASS}`).forEach(b => b.remove());
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
            if (!instructionsObserver) {
                startInstructionsObserver(memoriesSection);
            }
        } else {
            stopInstructionsObserver();
        }
    });

    pageObserver.observe(document.body, { childList: true, subtree: true });

})();
