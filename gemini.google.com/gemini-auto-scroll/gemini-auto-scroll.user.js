// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Automatically scroll to the current conversation in the Gemini sidebar
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SELECTORS = {
        CONVERSATION_ITEM: 'div[data-test-id="conversation"]',
        SPINNER: 'mat-progress-spinner[data-test-id="loading-history-spinner"]',
        SCROLL_CONTAINER: 'conversations-list .conversations-container'
    };

    const CONSTANTS = {
        MAX_RETRIES: 20,
        SPINNER_WAIT_MS: 3000,
        SCROLL_DELAY_MS: 500,
    };

    let isProcessing = false;

    // --- Utility Functions ---

    function getConversationIdFromUrl() {
        // Matches /app/ID or /app/ID/other...
        const match = window.location.pathname.match(/\/app\/([a-z0-9]+)/);
        return match ? match[1] : null;
    }

    function findConversationElement(id) {
        // Selector: div[data-test-id="conversation"][jslog*="c_ID"]
        // Note: CSS selectors need escaping if ID involves special chars, but IDs are alphanumeric here.
        return document.querySelector(`${SELECTORS.CONVERSATION_ITEM}[jslog*="c_${id}"]`);
    }

    function getScrollContainer() {
        return document.querySelector(SELECTORS.SCROLL_CONTAINER);
    }

    function isSpinnerVisible() {
        return document.querySelector(SELECTORS.SPINNER) !== null;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Main Logic ---

    async function attemptScrollToConversation() {
        if (isProcessing) return;
        isProcessing = true;
        console.log('[GeminiAutoScroll] Starting auto-scroll attempt...');

        try {
            const currentId = getConversationIdFromUrl();
            if (!currentId) {
                console.log('[GeminiAutoScroll] No conversation ID in URL.');
                return;
            }

            let retries = 0;

            while (retries < CONSTANTS.MAX_RETRIES) {
                // 1. Try to find the element
                const element = findConversationElement(currentId);
                if (element) {
                    console.log(`[GeminiAutoScroll] Found conversation ${currentId}. Scrolling...`);
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }

                // 2. Not found, try to load more
                console.log(`[GeminiAutoScroll] Conversation ${currentId} not found in DOM. Trying to load more (Attempt ${retries + 1}/${CONSTANTS.MAX_RETRIES})...`);

                const container = getScrollContainer();
                if (!container) {
                    console.error('[GeminiAutoScroll] Scroll container not found.');
                    return;
                }

                // Scroll to bottom
                container.scrollTop = container.scrollHeight;

                // Wait for spinner to APPEAR (it might take a moment after scrolling)
                let spinnerAppeared = false;
                for (let i = 0; i < 20; i++) { // Check for up to 2 seconds (100ms * 20)
                    await sleep(100);
                    if (isSpinnerVisible()) {
                        spinnerAppeared = true;
                        break;
                    }
                }

                if (!spinnerAppeared) {
                    console.log('[GeminiAutoScroll] Spinner did not appear after scrolling to bottom. Possibly reached end of history.');
                    // Double check if conversation appeared just in case (e.g. network fast, rendering fast)
                    if (findConversationElement(currentId)) continue;

                    // If strictly no spinner appeared, we might be at the end.
                    // However, let's allow a few retry loops just in case of weird network conditions?
                    // But if we are at bottom and no spinner, usually means end.
                    // We will check recent items count or height change? 
                    // For now, if no spinner, we assume end of list.
                    break;
                }

                // Wait for spinner to DISAPPEAR
                console.log('[GeminiAutoScroll] Spinner appeared. Waiting for it to finish...');
                while (isSpinnerVisible()) {
                    await sleep(200);
                }

                // Spinner gone, give DOM a moment to update
                await sleep(500);

                retries++;
            }

            console.log('[GeminiAutoScroll] Gave up finding conversation.');

        } catch (e) {
            console.error('[GeminiAutoScroll] Error:', e);
        } finally {
            isProcessing = false;
        }
    }

    // --- Navigation Monitoring ---

    let lastUrl = window.location.href;

    // Monitor URL changes
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // Short delay to let the page settle?
            setTimeout(attemptScrollToConversation, 1000);
        }
    }, 1000);

    // Initial check
    setTimeout(attemptScrollToConversation, 2000); // Wait for initial app load

})();
