// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.1.5
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
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: none;
                background: transparent;
                cursor: pointer;
                margin-left: 4px;
                transition: background-color 0.2s, color 0.2s;
                vertical-align: middle;
                position: relative;
            }
            #gemini-auto-scroll-toggle:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            #gemini-auto-scroll-toggle .material-symbols-outlined {
                font-size: 24px;
                font-family: 'Google Symbols';
            }
            #gemini-auto-scroll-toggle.enabled {
                color: #8ab4f8; /* Gemini Blue */
            }
            #gemini-auto-scroll-toggle.disabled {
                color: #bdc1c6; /* Grey */
                opacity: 0.6;
            }
            #gemini-auto-scroll-toggle.processing {
                animation: gtc-spin 2s linear infinite;
            }
            @keyframes gtc-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .gtc-tooltip {
                visibility: hidden;
                background-color: #3c4043;
                color: #fff;
                text-align: center;
                border-radius: 4px;
                padding: 4px 8px;
                position: absolute;
                z-index: 10000;
                bottom: -32px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 11px;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s;
            }
            #gemini-auto-scroll-toggle:hover .gtc-tooltip {
                visibility: visible;
                opacity: 1;
            }
            .gtc-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                background-color: #5bb974;
                color: #fff;
                font-size: 10px;
                font-weight: bold;
                padding: 1px 4px;
                border-radius: 8px;
                min-width: 14px;
                text-align: center;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    function updateToggleButtonUI() {
        const btn = document.getElementById('gemini-auto-scroll-toggle');
        if (!btn) return;

        const enabled = isAutoScrollEnabled();
        btn.className = enabled ? 'enabled' : 'disabled';
        if (isProcessing) btn.classList.add('processing');

        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = enabled ? 'sync' : 'sync_disabled';
        }

        // Update count
        const count = document.querySelectorAll(SELECTORS.CONVERSATION_ITEM).length;
        const badge = btn.querySelector('.gtc-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }

        const tooltip = btn.querySelector('.gtc-tooltip');
        if (tooltip) {
            tooltip.textContent = `Auto-Scroll: ${enabled ? 'ON' : 'OFF'} (Found: ${count})`;
        }
    }

    function injectToggleButton() {
        const menuBtn = document.querySelector(SELECTORS.MENU_BUTTON);
        if (!menuBtn || document.getElementById('gemini-auto-scroll-toggle')) return;

        injectStyles();

        const btn = document.createElement('button');
        btn.id = 'gemini-auto-scroll-toggle';
        setInnerHTML(btn, `
            <span class="material-symbols-outlined">sync</span>
            <span class="gtc-badge">0</span>
            <span class="gtc-tooltip">Auto-Scroll: ON</span>
        `);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoScroll();
        });

        // Inject after the menu button
        menuBtn.parentNode.insertBefore(btn, menuBtn.nextSibling);
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
                if (!container) break;

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

    const uiObserver = new MutationObserver(() => {
        injectToggleButton();
    });
    uiObserver.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            setTimeout(attemptScrollToConversation, 1200);
        }
    }, 1000);

    setTimeout(() => {
        injectToggleButton();
        attemptScrollToConversation();
    }, 2500);

})();
