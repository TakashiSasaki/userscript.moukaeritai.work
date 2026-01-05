// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.1.13
// @description  Automatically scroll to the current conversation in the Gemini sidebar with a toggle switch
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
        SCROLL_CONTAINER: 'conversations-list', // Updated from incorrect class name
        MENU_BUTTON: 'side-nav-menu-button'
    };

    const CONSTANTS = {
        MAX_RETRIES: 20,
        ENDLESS_RETRIES: 150, // "Endless" enough for most cases
        SPINNER_WAIT_MS: 3000,
        SCROLL_DELAY_MS: 500,
        STORAGE_KEY: 'gemini_auto_scroll_enabled'
    };

    // --- State & Trusted Types ---

    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiAutoScroll', {
                createHTML: (string) => string
            });
        } catch (e) {
            console.warn('[GeminiAutoScroll] Failed to create trustedTypes policy', e);
        }
    }

    const setInnerHTML = (element, html) => {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

    let isProcessing = false;

    // --- State Management ---

    function isAutoScrollEnabled() {
        return localStorage.getItem(CONSTANTS.STORAGE_KEY) !== 'false'; // Default to true
    }

    function toggleAutoScroll() {
        const newState = !isAutoScrollEnabled();
        localStorage.setItem(CONSTANTS.STORAGE_KEY, newState);
        updateToggleButtonUI();
        if (newState) {
            attemptScrollToConversation();
        }
    }

    // --- UI Injection ---

    function injectStyles() {
        if (document.getElementById('gemini-auto-scroll-styles')) return;
        const style = document.createElement('style');
        style.id = 'gemini-auto-scroll-styles';
        style.textContent = `
            #gemini-auto-scroll-toggle {
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 9999;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px; /* Square with rounded corners for checkbox feel */
                border: 1px solid rgba(255, 255, 255, 0.3);
                background-color: #1e1f20;
                cursor: pointer;
                transition: all 0.2s;
                padding: 0;
                width: 40px;
                height: 40px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            #gemini-auto-scroll-toggle:hover {
                background-color: #303134;
                border-color: rgba(255, 255, 255, 0.6);
            }
            #gemini-auto-scroll-toggle .material-symbols-outlined {
                font-size: 24px;
                font-family: 'Google Symbols';
            }
            /* ON STATE - Visual Emphasis */
            #gemini-auto-scroll-toggle.enabled {
                background-color: #8ab4f8; /* Gemini Blue Fill */
                border-color: #8ab4f8;
            }
            #gemini-auto-scroll-toggle.enabled .material-symbols-outlined {
                color: #202124; /* Dark Icon for Contrast */
            }
            #gemini-auto-scroll-toggle.enabled:hover {
                background-color: #aecbfa;
            }
            /* OFF STATE */
            #gemini-auto-scroll-toggle.disabled .material-symbols-outlined {
                color: #bdc1c6;
            }
            
            #gemini-auto-scroll-toggle.processing .material-symbols-outlined {
                animation: gtc-pulse 1.5s infinite ease-in-out;
            }
            @keyframes gtc-pulse {
                0% { opacity: 1; }
                50% { opacity: 0.4; }
                100% { opacity: 1; }
            }

            .gtc-badge {
                position: absolute;
                top: -6px;
                right: -6px;
                background-color: #34a853;
                color: #fff;
                font-size: 10px;
                font-weight: bold;
                padding: 1px 4px;
                border-radius: 10px;
                min-width: 16px;
                text-align: center;
                pointer-events: none;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                border: 1px solid #1e1f20;
            }

            .gtc-tooltip {
                visibility: hidden;
                background-color: #202124;
                color: #e8eaed;
                text-align: center;
                border-radius: 4px;
                padding: 6px 10px;
                position: absolute;
                z-index: 10000;
                top: -40px; /* Show above button */
                left: 0;
                transform: none; /* Align left */
                font-size: 11px;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                border: 1px solid #444746;
                box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            }
            #gemini-auto-scroll-toggle:hover .gtc-tooltip {
                visibility: visible;
                opacity: 1;
            }

            .gtc-conversation-index {
                position: absolute;
                top: 2px;
                left: 2px;
                background-color: rgba(0, 0, 0, 0.5);
                color: #fff;
                font-size: 9px;
                padding: 1px 3px;
                border-radius: 4px;
                z-index: 10;
                pointer-events: none;
                font-family: monospace;
            }
        `;
        document.head.appendChild(style);
    }

    function updateConversationIndices() {
        const items = document.querySelectorAll(SELECTORS.CONVERSATION_ITEM);
        items.forEach((item, index) => {
            // Ensure relative positioning for absolute child
            if (getComputedStyle(item).position === 'static') {
                item.style.position = 'relative';
            }

            let badge = item.querySelector('.gtc-conversation-index');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'gtc-conversation-index';
                item.appendChild(badge);
            }
            badge.textContent = index + 1;
        });
        return items.length;
    }

    function updateToggleButtonUI() {
        const btn = document.getElementById('gemini-auto-scroll-toggle');
        if (!btn) return;

        const enabled = isAutoScrollEnabled();
        btn.className = enabled ? 'enabled' : 'disabled';
        if (isProcessing) btn.classList.add('processing');

        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
            // Use checkbox icons
            icon.textContent = enabled ? 'check_box' : 'check_box_outline_blank';
        }

        // Update count and indices
        const count = updateConversationIndices();
        const badge = btn.querySelector('.gtc-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }

        const tooltip = btn.querySelector('.gtc-tooltip');
        if (tooltip) {
            const status = isProcessing ? 'Scanning...' : (enabled ? 'Auto-Scroll ON' : 'OFF');
            tooltip.textContent = `${status} (${count} items)`;
        }
    }

    function injectToggleButton() {
        // We inject into body now, so we don't depend on MENU_BUTTON existence for placement.
        if (document.getElementById('gemini-auto-scroll-toggle')) return;

        injectStyles();

        const btn = document.createElement('button');
        btn.id = 'gemini-auto-scroll-toggle';
        setInnerHTML(btn, `
            <span class="material-symbols-outlined">check_box</span>
            <span class="gtc-badge">0</span>
            <span class="gtc-tooltip">Auto-Scroll</span>
        `);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoScroll();
            // Pulse animation
            btn.style.transform = "scale(0.95)";
            setTimeout(() => btn.style.transform = "scale(1)", 100);
        });

        document.body.appendChild(btn);
        updateToggleButtonUI();
    }

    // --- Utility Functions ---

    function getConversationIdFromUrl() {
        const match = window.location.pathname.match(/\/app\/([a-z0-9]+)/);
        return match ? match[1] : null;
    }

    function findConversationElement(id) {
        return document.querySelector(`${SELECTORS.CONVERSATION_ITEM}[jslog*="c_${id}"]`);
    }

    function findScrollableParent(element) {
        let parent = element.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            const isScrollable = (parent.scrollHeight > parent.clientHeight) &&
                (style.overflowY === 'auto' || style.overflowY === 'scroll');
            if (isScrollable) return parent;
            parent = parent.parentElement;
            if (parent === document.body) return null; // Stop at body
        }
        return null;
    }

    function getScrollContainer() {
        // Strategy 0: Explicit User-Identified Tag
        const explicitContainer = document.querySelector('infinite-scroller');
        if (explicitContainer) return explicitContainer;

        // Strategy 1: Find valid scroll container from a list item (Auto-Detect)
        const anyItem = document.querySelector(SELECTORS.CONVERSATION_ITEM);
        if (anyItem) {
            const scrollParent = findScrollableParent(anyItem);
            if (scrollParent) {
                if (!window._gtcInfoLogged) {
                    console.log('[GeminiAutoScroll] Detected scroll container:', scrollParent);
                    window._gtcInfoLogged = true;
                }
                return scrollParent;
            }
        }

        // Strategy 2: Fallback to known selectors
        // Note: 'conversation-items-container' is a single item wrapper, not the list.
        return document.querySelector(SELECTORS.SCROLL_CONTAINER) ||
            document.querySelector('conversations-list');
    }

    function isSpinnerVisible() {
        return document.querySelector(SELECTORS.SPINNER) !== null;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Main Logic ---

    async function attemptScrollToConversation() {
        if (isProcessing || !isAutoScrollEnabled()) return;

        const currentId = getConversationIdFromUrl();
        if (!currentId) return;

        // Check if already visible
        const element = findConversationElement(currentId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        isProcessing = true;
        updateToggleButtonUI();
        console.log('[GeminiAutoScroll] Searching for current conversation...');

        try {
            let retries = 0;
            const maxRetries = CONSTANTS.ENDLESS_RETRIES;

            while (retries < maxRetries && isAutoScrollEnabled()) {
                const element = findConversationElement(currentId);
                if (element) {
                    console.log(`[GeminiAutoScroll] Found conversation ${currentId}.`);
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }

                const container = getScrollContainer();
                if (!container) {
                    console.warn('[GeminiAutoScroll] No scroll container found.');
                    break;
                }

                // Trigger load more
                container.scrollTop = container.scrollHeight;

                // Wait for spinner appearance
                let spinnerAppeared = false;
                for (let i = 0; i < 20; i++) {
                    await sleep(100);
                    if (isSpinnerVisible()) {
                        spinnerAppeared = true;
                        break;
                    }
                    if (!isAutoScrollEnabled()) break;
                }

                if (!spinnerAppeared) {
                    if (findConversationElement(currentId)) {
                        findConversationElement(currentId).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        console.log('[GeminiAutoScroll] End of list reached.');
                    }
                    break;
                }

                // Wait for spinner to disappear
                while (isSpinnerVisible() && isAutoScrollEnabled()) {
                    await sleep(200);
                }

                await sleep(400); // DOM settling
                retries++;
            }
        } catch (e) {
            console.error('[GeminiAutoScroll] Error:', e);
        } finally {
            isProcessing = false;
            updateToggleButtonUI();
        }
    }

    // --- Monitoring ---

    let lastUrl = window.location.href;
    let _debounceTimer;

    const uiObserver = new MutationObserver(() => {
        injectToggleButton();

        // Debounce UI updates to prevent performance issues during scrolling
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
            updateToggleButtonUI();
        }, 500);
    });
    uiObserver.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // Re-trigger scroll when URL changes
            setTimeout(attemptScrollToConversation, 1200);
        }
        // Also periodically ensure UI is accurate
        updateToggleButtonUI();
    }, 1000);


    setTimeout(() => {
        injectToggleButton();
        attemptScrollToConversation();
    }, 2500);

})();
