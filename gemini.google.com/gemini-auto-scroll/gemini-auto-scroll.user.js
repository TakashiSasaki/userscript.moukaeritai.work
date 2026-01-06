// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.1.21
// @description  Automatically scroll endlessly to load all history in Gemini
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @grant        GM_info
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1') {
        const report = () => {
            document.dispatchEvent(new CustomEvent('userscript-check-installed', {
                detail: {
                    name: GM_info.script.name,
                    version: GM_info.script.version
                }
            }));
        };
        report();
        document.addEventListener('userscript-ping', report);
        return;
    }

    const SELECTORS = {
        CONVERSATION_ITEM: 'div[data-test-id="conversation"]',
        SPINNER: 'mat-progress-spinner[data-test-id="loading-history-spinner"]',
        SCROLL_CONTAINER: 'conversations-list', // Updated from incorrect class name
        MENU_BUTTON: 'side-nav-menu-button'
    };

    const CONSTANTS = {
        MAX_RETRIES: 20,
        ENDLESS_RETRIES: 300, // "Endless" enough for most cases
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

    // SVG Icons (Material Design) - Fail-safe compared to font ligatures
    const ICONS = {
        CHECKED: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M280-520l-80-80-120 120 200 200 400-400-120-120-280 280z"/></svg>`, // Simple check mark
        UNCHECKED: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200zm0-80h560v-560H200v560z"/></svg>` // Outline box
    };

    function injectStyles() {
        if (document.getElementById('gemini-auto-scroll-styles')) return;
        const style = document.createElement('style');
        style.id = 'gemini-auto-scroll-styles';
        style.textContent = `
            #gemini-auto-scroll-toggle {
                position: absolute;
                top: 8px;
                left: 48px; /* Approximate offset */
                z-index: 1000;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px; 
                border: none;
                background-color: transparent;
                cursor: pointer;
                transition: background-color 0.2s;
                padding: 0;
                width: 32px;
                height: 32px;
            }
            #gemini-auto-scroll-toggle:hover {
                background-color: rgba(60, 64, 67, 0.08); /* Light grey hover */
            }
            /* Icon Container */
            .gtc-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
            }
            .gtc-icon svg {
                width: 24px;
                height: 24px;
            }

            /* ON STATE */
            #gemini-auto-scroll-toggle.enabled .gtc-icon {
                color: #1a73e8; /* Google Blue */
            }
            #gemini-auto-scroll-toggle.enabled {
                /* Optional: subtle background or nothing */
            }
            
            /* OFF STATE */
            #gemini-auto-scroll-toggle.disabled .gtc-icon {
                color: #5f6368; /* Google Grey */
            }
            
            #gemini-auto-scroll-toggle.processing .gtc-icon {
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
                background-color: #333;
                color: #fff;
                text-align: center;
                border-radius: 4px;
                padding: 4px 8px;
                position: absolute;
                z-index: 10000;
                top: 100%; /* Show below */
                left: 50%;
                transform: translateX(-50%);
                font-size: 11px;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                margin-top: 4px;
                border: 1px solid rgba(255,255,255,0.2);
            }

            #gemini-auto-scroll-toggle:hover .gtc-tooltip {
                visibility: visible;
                opacity: 1;
            }

            .gtc-conversation-index {
                position: absolute;
                top: 6px;
                left: 6px;
                background-color: rgba(0, 0, 0, 0.7);
                color: #fff;
                font-size: 10px;
                padding: 0 4px;
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

        const icon = btn.querySelector('.gtc-icon');
        if (icon) {
            setInnerHTML(icon, enabled ? ICONS.CHECKED : ICONS.UNCHECKED);
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
        // Target the Search button/container
        const searchBtnWrapper = document.querySelector('search-nav-button');
        if (!searchBtnWrapper) {
            // Retry if not yet loaded
            setTimeout(injectToggleButton, 1000);
            return;
        }

        if (document.getElementById('gemini-auto-scroll-toggle')) return;

        injectStyles();

        const btn = document.createElement('button');
        btn.id = 'gemini-auto-scroll-toggle';
        setInnerHTML(btn, `
            <span class="gtc-icon"></span>
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

        // Ensure parent allows positioning (though we are using absolute left:48px)
        const parent = searchBtnWrapper.parentElement;
        if (window.getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }

        // Insert after search button
        parent.insertBefore(btn, searchBtnWrapper.nextSibling);

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
        // Strategy 1: Find valid scroll container from a list item (Auto-Detect) - BEST
        // This checks actual computed styles for overflow and scrollHeight.
        const anyItem = document.querySelector(SELECTORS.CONVERSATION_ITEM);
        if (anyItem) {
            const scrollParent = findScrollableParent(anyItem);
            if (scrollParent) {
                if (!window._gtcInfoLogged) {
                    console.log('[GeminiAutoScroll] Detected scroll container via item:', scrollParent);
                    window._gtcInfoLogged = true;
                }
                return scrollParent;
            }
        }

        // Strategy 0: Explicit User-Identified Tag (Fallback)
        // If Strategy 1 failed (e.g. no items, or not enough items to scroll yet), we try to guess.
        const explicitContainer = document.querySelector('infinite-scroller');
        if (explicitContainer) {
            // Check if the infinite-scroller itself is the scroller
            if (isElementScrollable(explicitContainer)) return explicitContainer;

            // Check known children
            const candidates = [
                explicitContainer.querySelector('.conversations-container'),
                explicitContainer.querySelector('.chat-history-list'),
                explicitContainer.querySelector('conversations-list')
            ];

            for (const candidate of candidates) {
                if (candidate && isElementScrollable(candidate)) {
                    return candidate;
                }
            }

            // If we are here, we found structure but no scrollbar.
            // Maybe it is too short to scroll? Or styles not loaded?
            // Return one as best guess to allow attempts.
            return candidates[0] || explicitContainer;
        }

        // Strategy 2: Fallback to known selectors
        return document.querySelector(SELECTORS.SCROLL_CONTAINER) ||
            document.querySelector('conversations-list');
    }

    function isElementScrollable(element) {
        const style = window.getComputedStyle(element);
        return (element.scrollHeight > element.clientHeight) &&
            (style.overflowY === 'auto' || style.overflowY === 'scroll');
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

        isProcessing = true;
        updateToggleButtonUI();
        console.log('[GeminiAutoScroll] Starting auto-scroll...');

        try {
            // Infinite loop (controlled by isAutoScrollEnabled)
            // The user requested "endless scrolling", so we do not stop when the current conversation is found.
            while (isAutoScrollEnabled()) {
                const container = getScrollContainer();
                if (!container) {
                    console.warn('[GeminiAutoScroll] No scroll container found.');
                    // Retry briefly in case of loading
                    await sleep(1000);
                    continue;
                }

                // Scroll to bottom
                const previousHeight = container.scrollHeight;
                container.scrollTop = previousHeight;

                // Wait for spinner appearance - Robust check
                let spinnerAppeared = false;
                const spinnerCheckAttempts = 50; // Wait up to 5 seconds for reaction

                for (let i = 0; i < spinnerCheckAttempts; i++) {
                    await sleep(100);
                    if (isSpinnerVisible()) {
                        spinnerAppeared = true;
                        break;
                    }

                    // "Wiggle" scroll if taking too long to trigger event e.g. at 2s
                    if (i === 20) {
                        container.scrollTop = previousHeight - 50;
                        await sleep(100);
                        container.scrollTop = previousHeight;
                    }

                    if (!isAutoScrollEnabled()) break;
                }

                if (!spinnerAppeared) {
                    // Check if height increased without spinner
                    if (container.scrollHeight > previousHeight) {
                        console.log('[GeminiAutoScroll] Content loaded without spinner.');
                    } else {
                        // We might be at the end, OR it's just slow.
                        // We continue retrying as per "endless" request.
                        console.log('[GeminiAutoScroll] No new content or spinner. Retrying...');
                        await sleep(1000);
                    }
                }

                // Wait for spinner to disappear
                while (isSpinnerVisible() && isAutoScrollEnabled()) {
                    await sleep(200);
                }

                await sleep(400); // DOM settling
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
