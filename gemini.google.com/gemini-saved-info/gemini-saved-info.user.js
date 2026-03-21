// ==UserScript==
// @name         Gemini Saved Info Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.11
// @lastModified 2026-03-02
// @description  Adds serial numbers and copy buttons to custom instructions on Gemini.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @grant        GM_info
// @license      MIT
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    // For documentation page to check if the script is installed
    const installCheckHosts = [
        'userscript.moukaeritai.work',
        '127.0.0.1'
    ];
    const installCheckSuffixes = [
        '.app.github.dev'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname) ||
        installCheckSuffixes.some(suffix => location.hostname.endsWith(suffix));

    const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    if (isInstallCheckHost) {
        report();
        return;
    }

    const TARGET_PAGE_URL = 'https://gemini.google.com/saved-info';
    const NUMBER_SPAN_CLASS = 'userscript-gemini-saved-info-number';
    const COPY_BUTTON_CLASS = 'userscript-gemini-saved-info-copy-button';
    const COPY_ALL_BUTTON_ID = 'userscript-gemini-saved-info-copy-all-button';
    let instructionsObserver = null;

    /**
     * Shows a toast notification.
     * @param {string} message The message to display.
     */
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(255, 182, 193, 0.9)'; // LightPink
        toast.style.color = '#333';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '10000';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease, bottom 0.5s ease';
        toast.style.fontFamily = 'sans-serif';

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '30px';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        }, 2500);
    }


    /**
     * Injects the "Copy All" button into the section header.
     */
    function addCopyAllButton() {
        if (document.getElementById(COPY_ALL_BUTTON_ID)) return;

        const actionsContainer = document.querySelector('h2[data-test-id="saved-info-title"]')?.closest('.header')?.querySelector('.action-buttons-container');
        if (!actionsContainer) return;

        const copyAllButton = document.createElement('button');
        copyAllButton.id = COPY_ALL_BUTTON_ID;
        copyAllButton.className = 'mdc-button mat-mdc-button-base mat-mdc-outlined-button';
        copyAllButton.style.marginLeft = '8px';
        copyAllButton.style.setProperty('color', 'var(--mat-outlined-button-label-text-color, initial)', 'important');


        const icon = document.createElement('mat-icon');
        icon.className = 'mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'library_books';
        copyAllButton.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'mdc-button__label';
        label.textContent = 'Copy all';
        copyAllButton.appendChild(label);

        copyAllButton.addEventListener('click', () => {
            const allInstructions = document.querySelectorAll('.memory .memory-text');
            const formattedText = Array.from(allInstructions).map((el, i) => {
                const numberSpan = el.querySelector(`.${NUMBER_SPAN_CLASS}`);
                const cleanText = numberSpan ? el.textContent.substring(numberSpan.textContent.length) : el.textContent;
                return `${i + 1}. ${cleanText}`;
            }).join('\n\n---\n\n');

            navigator.clipboard.writeText(formattedText).then(() => {
                console.log('[gemini-saved-info] All instructions copied to clipboard.');
                showToast('All instructions copied!');
                label.textContent = 'Copied!';
                setTimeout(() => { label.textContent = 'Copy all'; }, 2000);
            }).catch(err => {
                console.error('[gemini-saved-info] Failed to copy all text: ', err);
                showToast('Failed to copy all instructions.');
                label.textContent = 'Error!';
                setTimeout(() => { label.textContent = 'Copy all'; }, 2000);
            });
        });

        actionsContainer.appendChild(copyAllButton);
    }


    /**
     * Updates all instruction items, adding serial numbers and copy buttons.
     */
    function updateInstructionItems(memoriesSection) {
        if (!memoriesSection) return;

        memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`).forEach(n => n.remove());
        memoriesSection.querySelectorAll(`.${COPY_BUTTON_CLASS}`).forEach(b => b.remove());

        const instructions = memoriesSection.querySelectorAll('.memory');
        if (instructions.length === 0) return;

        console.log(`[gemini-saved-info] Found ${instructions.length} instructions. Updating items.`);

        instructions.forEach((instruction, index) => {
            const textElement = instruction.querySelector('.memory-text');
            const actionsButton = instruction.querySelector('.memory-actions-button');

            if (textElement) {
                const numberSpan = document.createElement('span');
                numberSpan.className = NUMBER_SPAN_CLASS;
                numberSpan.textContent = `${index + 1}. `;
                numberSpan.style.fontWeight = 'bold';
                textElement.prepend(numberSpan);
            }

            if (actionsButton) {
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
                        showToast('Instruction copied!');
                        icon.textContent = 'done';
                        setTimeout(() => { icon.textContent = 'content_copy'; }, 1500);
                    });
                });

                actionsButton.parentNode.insertBefore(copyButton, actionsButton);
            }
        });
    }

    /**
     * Starts observers for the instructions list and the header buttons.
     */
    function startInstructionsObserver(memoriesSection) {
        // Add the global "Copy All" button
        addCopyAllButton();

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
     * Stops observers and cleans up all injected UI elements.
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

            const copyAllButton = document.getElementById(COPY_ALL_BUTTON_ID);
            if (copyAllButton) copyAllButton.remove();
        }
    }

    /**
     * Main observer to watch for page navigation.
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