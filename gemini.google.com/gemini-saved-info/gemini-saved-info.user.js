// ==UserScript==
// @name         Gemini Saved Info Helper
// @namespace    userscript.moukaeritai.work
// @version      0.2.24
// @lastModified  2026-04-02
// @description  Adds serial numbers and copy buttons to custom instructions on Gemini.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     customCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/style.css
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @license      MIT
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
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

    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {

        const initUserScript = () => {

            // Note: Trusted Types Policy is not currently needed as this script uses textContent/GM_addStyle,
            // but may be required if innerHTML is added in the future.

            // Inject shared common styles
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const style = GM_addStyle(commonCSS);
                if (style) style.id = 'gemini-common-styles';
            }

            // Inject custom styles
            const customCSS = GM_getResourceText('customCSS');
            if (customCSS && !document.getElementById('gemini-saved-info-styles')) {
                const style = GM_addStyle(customCSS);
                if (style) style.id = 'gemini-saved-info-styles';
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
                toast.className = 'userscript-gemini-saved-info-toast gus-panel';
                toast.textContent = message;

                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.classList.add('visible');
                }, 10);

                setTimeout(() => {
                    toast.classList.remove('visible');
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
             * Scope: document.body, childList + subtree — but debounced to prevent
             * the observer from re-firing on its own DOM changes (infinite loop).
             */
            let lastIsActive = null; // Track state to avoid redundant DOM updates

            /**
             * Creates or updates the always-visible floating version badge.
             * Only updates the DOM when the active state actually changes.
             */
            function updateVersionBadge(isActive) {
                if (lastIsActive === isActive) return; // No change → skip DOM update
                lastIsActive = isActive;

                let badge = document.getElementById('gsi-version-indicator');
                let isNewBadge = false;
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'gsi-version-indicator';
                    badge.className = 'gus-panel';
                    document.body.appendChild(badge);
                    isNewBadge = true;
                }
                const version = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '?';
                badge.title = 'Gemini Saved Info Helper';
                badge.textContent = '';
                const vSpan = document.createElement('span');
                vSpan.className = 'gus-version';
                vSpan.textContent = `📋 ${version} ${gusEmoji}`;
                badge.appendChild(vSpan);

                // Setup draggable panel
                if (window.geminiSetupDraggablePanel) {
                    window.geminiSetupDraggablePanel(badge, vSpan, 'gus-pos-gemini-saved-info');
                }
            }

            function checkAndApply() {
                const onTargetPage = window.location.href.startsWith(TARGET_PAGE_URL);
                const memoriesSection = document.querySelector('div[data-test-id="memories-section"]');

                if (onTargetPage && memoriesSection) {
                    updateVersionBadge(true);
                    if (!instructionsObserver) {
                        startInstructionsObserver(memoriesSection);
                    }
                } else {
                    updateVersionBadge(false);
                    stopInstructionsObserver();
                }
            }

            // Prefer Navigation API for SPA navigation (no DOM side effects)
            if (window.navigation) {
                window.navigation.addEventListener('navigatesuccess', () => {
                    checkAndApply();
                });
            }

            // Debounced MutationObserver as fallback / for waiting for memories-section to appear
            let debounceTimer = null;
            const pageObserver = new MutationObserver(() => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    debounceTimer = null;
                    checkAndApply();
                }, 200);
            });

            // Observe only childList changes on body (not subtree) for top-level Angular route changes,
            // PLUS observe the memories-section container when on target page — but NOT from pageObserver.
            // This narrow target avoids pageObserver triggering on badge/toast child mutations.
            pageObserver.observe(document.body, { childList: true });

            // Initial check on load
            checkAndApply();

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