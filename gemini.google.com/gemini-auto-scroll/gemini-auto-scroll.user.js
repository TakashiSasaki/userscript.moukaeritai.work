// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.1.28
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
        MENU_BUTTON: 'side-nav-menu-button',
        ERROR_SNACKBAR: 'mat-snack-bar-container',
        ERROR_LABEL: '.mat-mdc-snack-bar-label'
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
        return localStorage.getItem(CONSTANTS.STORAGE_KEY) === 'true'; // Default to false
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

            /* --- Custom Scrollbar Styles --- */
            /* Target generic scroll containers and specific ones */
            ::-webkit-scrollbar {
                width: 16px !important;
                height: 16px !important;
                background-color: #f0f0f0;
                display: block !important;
            }
            
            ::-webkit-scrollbar-track {
                background: #e0e0e0;
                border-left: 1px solid #ccc;
            }
            
            ::-webkit-scrollbar-thumb {
                background-color: #ff6f00; /* High contrast Orange */
                border-radius: 4px;
                border: 2px solid #e0e0e0;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background-color: #e65100;
            }

            /* Specifically for the conversations list */
            conversations-list, .conversations-list, infinite-scroller {
                scrollbar-color: #ff6f00 #e0e0e0 !important; /* Firefox support */
                scrollbar-width: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    function updateConversationIndices() {
        const items = document.querySelectorAll(SELECTORS.CONVERSATION_ITEM);
        items.forEach((item, index) => {
            // Optimization: Skip heavy DOM hits if already processed
            if (item.classList.contains('gtc-processed')) {
                // Just update the index number if needed (cheap check)
                // We use a specific selector for the badge to avoid re-querying everything if we stored it,
                // but querySelector on a small subtree is reasonably fast. 
                // However, we can trust the badge exists if processed.
                const badge = item.querySelector('.gtc-conversation-index');
                if (badge) {
                    const newText = String(index + 1);
                    if (badge.textContent !== newText) {
                        badge.textContent = newText;
                    }
                }
                return;
            }

            // --- First time initialization for this item ---

            // Avoid getComputedStyle which forces reflow. 
            // We blindly force relative positioning if not set inline. 
            // Ideally we'd check computed, but that's too expensive in a loop.
            // Most conversation items are static divs.
            if (!item.style.position) {
                item.style.position = 'relative';
            }

            let badge = item.querySelector('.gtc-conversation-index');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'gtc-conversation-index';
                // Optimize: simple text set
                badge.textContent = index + 1;
                item.appendChild(badge);
            }

            item.classList.add('gtc-processed');
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

    function checkErrorState() {
        // Broadly scan for the error message
        const snackbars = document.querySelectorAll(SELECTORS.ERROR_SNACKBAR);
        for (const sb of snackbars) {
            if (sb.textContent.includes("Couldn’t load recent chats") ||
                sb.textContent.includes("Try reloading this page")) {
                return true;
            }
        }
        return false;
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
        if (!isAutoScrollEnabled()) return;

        isProcessing = true;
        updateToggleButtonUI();
        console.log('[GeminiAutoScroll] Auto-scroll loop started.');

        let container = getScrollContainer();

        // 1. Setup MutationObserver for the container to detect new items immediately
        let mutationObserver = null;

        const scrollDown = () => {
            if (container && isAutoScrollEnabled()) {
                // Use a large number to scroll to bottom without reading scrollHeight (which forces reflow)
                container.scrollTop = 99999999;
            }
        };

        // Local debounce timer to avoid conflict with the global UI debounce timer
        let scrollDebounceTimer = null;

        const attachObserver = (target) => {
            if (mutationObserver) mutationObserver.disconnect();
            mutationObserver = new MutationObserver((mutations) => {
                if (!isAutoScrollEnabled()) return;
                // Debounce scrolling to avoid slamming the browser/app with events
                if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
                scrollDebounceTimer = setTimeout(scrollDown, 100);
            });
            mutationObserver.observe(target, { childList: true, subtree: true });
        };

        try {
            while (isAutoScrollEnabled()) {
                // Critical Error Check
                if (checkErrorState()) {
                    console.warn('[GeminiAutoScroll] Critical error detected ("Couldn\'t load"). Stopping auto-scroll.');
                    toggleAutoScroll(); // This will disable it
                    alert('Gemini Auto-Scroll halted: "Couldn’t load recent chats" error detected. Please reload the page.');
                    break;
                }

                // Determine container (it might change or be created lazily)
                const currentContainer = getScrollContainer();

                if (currentContainer && currentContainer !== container) {
                    container = currentContainer;
                    console.log('[GeminiAutoScroll] New scroll container found:', container);
                    attachObserver(container);
                }

                if (container) {
                    // Just scroll. Reading scrollHeight/scrollTop forces reflow. 
                    // Since this loop is now a fallback (2s interval), blind scroll is acceptable 
                    // and much more performant than forcing layout calc.
                    scrollDown();
                } else {
                    // Only log periodically to avoid spam
                    if (Math.random() < 0.05) console.warn('[GeminiAutoScroll] No scroll container found.');
                }

                // Wait loop - Increased to 2s to rely mostly on MutationObserver and reduce CPU usage
                await sleep(2000);

                // Check for spinner to pause slightly? 
                // Actually, if we want to "force" past the spinner to trigger loader, 
                // keeping it at the bottom is usually correct for "endless" lists.
                // But we can pause briefly if we see a spinner to let it render.
                if (isSpinnerVisible()) {
                    await sleep(200);
                }
            }
        } catch (e) {
            console.error('[GeminiAutoScroll] Error:', e);
        } finally {
            if (mutationObserver) mutationObserver.disconnect();
            isProcessing = false;
            updateToggleButtonUI();
            console.log('[GeminiAutoScroll] Auto-scroll loop stopped.');
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
