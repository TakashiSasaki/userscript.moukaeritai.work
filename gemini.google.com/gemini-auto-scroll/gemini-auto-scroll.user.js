// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.2.51
// @lastModified  2026-04-03
// @description  Automatically scroll endlessly to load all history in Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     customCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/style.css
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
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

            const policy = window.geminiCreateTrustedHTMLPolicy('geminiAutoScroll');

            const SELECTORS = {
                CONVERSATION_ITEM: 'a.conversation, a[data-test-id="conversation"]',
                SPINNER: 'mat-progress-spinner[data-test-id="loading-history-spinner"]',
                SCROLL_CONTAINER: 'nav infinite-scroller, infinite-scroller',
                ERROR_SNACKBAR: 'mat-snack-bar-container',
                SIDEBAR_TOGGLE: 'button[data-test-id="side-nav-menu-button"]',
                CHAT_APP: 'chat-app'
            };

            const CONSTANTS = {
                STORAGE_KEY: 'gemini_auto_scroll_enabled',
                PANEL_POSITION_KEY: 'gemini_auto_scroll_panel_position'
            };

            // --- State & Trusted Types ---





            let isProcessing = false;
            let lastSelectedIndex = -1;
            let scrollInterval = null; // Global reference for cleanup
            let isInitialized = false;
            let uiObserver = null;
            let mainInterval = null;

            // --- State Management ---

            function isAutoScrollEnabled() {
                return localStorage.getItem(CONSTANTS.STORAGE_KEY) === 'true'; // Default to false
            }

            function toggleAutoScroll() {
                const newState = !isAutoScrollEnabled();
                localStorage.setItem(CONSTANTS.STORAGE_KEY, newState);
                updatePanelUI();

                if (newState) {
                    // Requirement: If starting, ensure the sidebar is expanded.
                    if (!isSidebarVisible()) {
                        console.debug('[GeminiAutoScroll] Sidebar is closed. Expanding sidebar...');
                        const toggle = document.querySelector(SELECTORS.SIDEBAR_TOGGLE);
                        if (toggle) {
                            toggle.click();
                            // Wait slightly for DOM transition
                            setTimeout(attemptScrollToConversation, 500);
                        } else {
                            attemptScrollToConversation();
                        }
                    } else {
                        attemptScrollToConversation();
                    }
                } else {
                    if (scrollInterval) {
                        clearInterval(scrollInterval);
                        scrollInterval = null;
                    }
                    isProcessing = false;
                    updatePanelUI();
                }
            }

            // --- UI Injection ---

            // ICONS removed, using emojis.

            function injectStyles() {
                // Inject shared common styles
                const commonCSS = GM_getResourceText('geminiCommon');
                if (commonCSS && !document.getElementById('gemini-common-styles')) {
                    const commonStyle = document.createElement('style');
                    commonStyle.textContent = commonCSS;
                    commonStyle.id = 'gemini-common-styles';
                    document.head.appendChild(commonStyle);
                }

                if (document.getElementById('gemini-auto-scroll-styles')) return;
                const css = GM_getResourceText('customCSS');
                const style = GM_addStyle(css);
                if (style) {
                    style.id = 'gemini-auto-scroll-styles';
                } else {
                    // Fallback for some TM versions where GM_addStyle returns undefined
                    const el = document.querySelector('style:last-of-type');
                    if (el) el.id = 'gemini-auto-scroll-styles';
                }
            }

            function getConversationItems() {
                const container = document.querySelector(SELECTORS.SCROLL_CONTAINER) || document;
                const items = container.querySelectorAll(SELECTORS.CONVERSATION_ITEM);
                return Array.from(items);
            }

            function updateConversationIndices() {
                const items = getConversationItems();
                items.forEach((item, index) => {
                    if (item.classList.contains('gtc-processed')) {
                        const badge = item.querySelector('.gtc-conversation-index');
                        if (badge) {
                            const newText = String(index + 1);
                            if (badge.textContent !== newText) {
                                badge.textContent = newText;
                            }
                        }
                        return;
                    }
                    if (!item.style.position) {
                        item.style.position = 'relative';
                    }
                    let badge = item.querySelector('.gtc-conversation-index');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'gtc-conversation-index';
                        badge.textContent = index + 1;
                        item.appendChild(badge);
                    }
                    item.classList.add('gtc-processed');
                });
                return items.length;
            }


            function updatePanelUI() {
                const panel = document.getElementById('gemini-auto-scroll-panel');
                if (!panel) return;

                // Update Auto-Scroll UI
                const scrollBtn = panel.querySelector('.auto-scroll-btn');
                if (scrollBtn) {
                    const isScrollEnabled = isAutoScrollEnabled();
                    scrollBtn.className = 'auto-scroll-btn';

                    if (isScrollEnabled) {
                        scrollBtn.classList.add('running');
                        if (isProcessing) {
                            scrollBtn.classList.add('processing');
                            scrollBtn.textContent = '🏃‍♂️ Scrolling (Click to Stop)';
                        } else {
                            scrollBtn.textContent = '⏹️ Stop Auto-Scroll';
                        }
                    } else {
                        scrollBtn.classList.add('stopped');
                        scrollBtn.textContent = '▶️ Start Auto-Scroll';
                    }
                }

                const count = updateConversationIndices();
                const badge = panel.querySelector('.gtc-badge');
                if (badge) {
                    badge.textContent = `${count} items`;
                }

                if (scrollBtn && isAutoScrollEnabled() && !isSidebarVisible()) {
                    scrollBtn.style.backgroundColor = '#fef7e0'; // Light yellow warning
                    scrollBtn.style.color = '#b05e00';
                    scrollBtn.textContent = '⚠️ Sidebar is closed (Expand to scroll)';
                } else if (scrollBtn) {
                    scrollBtn.style.backgroundColor = '';
                    scrollBtn.style.color = '';
                }

                const items = getConversationItems();
                const selectedIndex = items.findIndex(item => item.classList.contains('selected'));
                if (selectedIndex !== -1) {
                    if (lastSelectedIndex !== selectedIndex) {
                        console.debug(`[GeminiAutoScroll] Selected index changed from ${lastSelectedIndex} to ${selectedIndex}.`);
                        lastSelectedIndex = selectedIndex;
                    }
                }
            }

            async function createDraggablePanel() {
                if (document.getElementById('gemini-auto-scroll-panel')) return;

                injectStyles();

                const panel = document.createElement('div');
                panel.id = 'gemini-auto-scroll-panel';
                panel.className = 'gus-panel';

                window.geminiSetInnerHTML(panel, `
                    <button class="auto-scroll-btn">▶️ Start Auto-Scroll</button>
                    <div class="panel-info">
                        <span class="gtc-badge">0 items</span>
                        <span class="version-badge gus-version" title="Gemini Auto-Scroll">📜 ${GM_info.script.version} ${gusEmoji}</span>
                    </div>
                `, policy);

                document.body.appendChild(panel);

                panel.querySelector('.auto-scroll-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleAutoScroll();
                });

                const handle = panel.querySelector('.version-badge');
                if (handle) {
                    window.geminiSetupDraggablePanel(panel, handle, CONSTANTS.PANEL_POSITION_KEY, { top: '20px', right: '20px', left: 'auto' });
                }

                panel.classList.add('ready');

                updatePanelUI();
            }

            // --- Utility Functions ---


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

            function isSidebarVisible() {
                const chatApp = document.querySelector(SELECTORS.CHAT_APP);
                if (chatApp) {
                    return chatApp.classList.contains('side-nav-open');
                }
                // Fallback to legacy visibility check
                const scrollers = document.querySelectorAll(SELECTORS.SCROLL_CONTAINER);
                for (const el of scrollers) {
                    const style = window.getComputedStyle(el);
                    if (style.visibility !== 'hidden' && el.offsetWidth > 100) return true;
                }
                return false;
            }

            function getScrollContainer() {
                const allScrollers = document.querySelectorAll(SELECTORS.SCROLL_CONTAINER);
                let bestCandidate = null;

                for (const el of allScrollers) {
                    const style = window.getComputedStyle(el);
                    // Must be visible and have width (sidebar icon bar is ~72px, expanded is > 200px)
                    if (style.visibility !== 'hidden' && el.offsetWidth > 100) {
                        if (isElementScrollable(el)) return el;
                        // If not scrollable yet, keep as candidate if it's the right type
                        bestCandidate = el;
                    }
                }

                if (bestCandidate) return bestCandidate;

                // Fallback: findScrollableParent from any conversation item
                const anyItem = document.querySelector(SELECTORS.CONVERSATION_ITEM);
                if (anyItem) {
                    const scrollParent = findScrollableParent(anyItem);
                    if (scrollParent) return scrollParent;
                }
                return document.querySelector(SELECTORS.SCROLL_CONTAINER);
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

            // --- Main Logic ---

            async function attemptScrollToConversation() {
                if (isProcessing) return;
                if (!isAutoScrollEnabled()) return;

                isProcessing = true;
                updatePanelUI();
                console.debug('[GeminiAutoScroll] Auto-scroll loop started.');

                let container = getScrollContainer();

                const scrollDown = () => {
                    if (container && isAutoScrollEnabled()) {
                        container.scrollTop = 99999999;
                    }
                };

                try {
                    // Use a simple high-frequency interval to push scroll down.
                    // This is actually frequently better than MutationObserver for endless scroll,
                    // since the API fetching bottleneck limits the actual DOM repaint rate anyway.
                    scrollInterval = setInterval(() => {
                        if (!isAutoScrollEnabled()) {
                            clearInterval(scrollInterval);
                            scrollInterval = null;
                            isProcessing = false;
                            updatePanelUI();
                            return;
                        }

                        if (checkErrorState()) {
                            console.warn('[GeminiAutoScroll] Critical error detected ("Couldn\'t load"). Stopping auto-scroll.');
                            toggleAutoScroll();
                            clearInterval(scrollInterval);
                            alert('Gemini Auto-Scroll halted: "Couldn’t load recent chats" error detected. Please reload the page.');
                            return;
                        }

                        if (!isSidebarVisible()) {
                            console.debug('[GeminiAutoScroll] Sidebar hidden. Stopping auto-scroll.');
                            if (isAutoScrollEnabled()) {
                                toggleAutoScroll(); // This will clear the interval and update UI
                            }
                            return;
                        }

                        const currentContainer = getScrollContainer();
                        if (currentContainer && currentContainer !== container) {
                            container = currentContainer;
                        }

                        if (container) scrollDown();

                    }, 500);

                } catch (e) {
                    console.error('[GeminiAutoScroll] Error in scroll loop:', e);
                } finally {
                    // Keep the 'isProcessing = true' flag up as long as interval runs.
                    // To cleanly resolve state, we only set false if we exit synchronosly.
                    // Since this is infinite via interval, it actually runs until disabled.
                    isProcessing = !!scrollInterval;
                    updatePanelUI();
                }
            }

            // --- Monitoring ---

            let lastUrl = window.location.href;
            let _debounceTimer;

            uiObserver = new MutationObserver((mutations) => {
                createDraggablePanel();

                // Check for deletions of the selected item
                for (const mutation of mutations) {
                    for (const removedNode of mutation.removedNodes) {
                        if (removedNode.nodeType === 1) { // Element node
                            // Selection handling removed correctly as per migration to gemini-auto-select-next
                        }
                    }
                }

                // Debounce UI updates
                if (_debounceTimer) clearTimeout(_debounceTimer);
                _debounceTimer = setTimeout(() => {
                    updatePanelUI();
                }, 500);
            });



            function initAutoScroll() {
                if (isInitialized) return;
                isInitialized = true;
                console.debug('[GeminiAutoScroll] Initializing (SPA navigated to /app).');

                uiObserver.observe(document.body, { childList: true, subtree: true });

                mainInterval = setInterval(() => {
                    const currentUrl = window.location.href;
                    if (currentUrl !== lastUrl) {
                        lastUrl = currentUrl;

                        // Re-trigger scroll when URL changes
                        setTimeout(attemptScrollToConversation, 1200);
                    }
                    // Also periodically ensure UI is accurate
                    updatePanelUI();
                }, 1000);

                setTimeout(() => {
                    createDraggablePanel();
                    attemptScrollToConversation();
                }, 2500);
            }

            function cleanupAutoScroll() {
                if (!isInitialized) return;
                isInitialized = false;
                isProcessing = false;
                console.debug('[GeminiAutoScroll] Cleaning up (SPA navigated away from /app).');

                if (mainInterval) {
                    clearInterval(mainInterval);
                    mainInterval = null;
                }

                if (scrollInterval) {
                    clearInterval(scrollInterval);
                    scrollInterval = null;
                }

                if (uiObserver) {
                    uiObserver.disconnect();
                }

                const panel = document.getElementById('gemini-auto-scroll-panel');
                if (panel) panel.remove();

                const style = document.getElementById('gemini-auto-scroll-styles');
                if (style) style.remove();
            }

            /**
             * Checks the URL and runs init or cleanup accordingly.
             */
            function checkUrlAndManageScriptState() {
                const isAppPage = /^\/(app|gem)\//.test(location.pathname);
                if (isAppPage) {
                    initAutoScroll();
                } else {
                    cleanupAutoScroll();
                }
            }

            if (window.navigation) {
                window.navigation.addEventListener('navigatesuccess', () => {
                    setTimeout(checkUrlAndManageScriptState, 500);
                });
                console.debug('[GeminiAutoScroll] Using Navigation API for SPA routing.');
            } else {
                // Fallback for older browsers
                setInterval(() => {
                    if (location.href !== lastUrl) {
                        lastUrl = location.href;
                        setTimeout(checkUrlAndManageScriptState, 500);
                    }
                }, 500);
                console.debug('[GeminiAutoScroll] Using setInterval fallback for SPA routing.');
            }

            // Initial check on load
            if (document.body) {
                checkUrlAndManageScriptState();
            } else {
                window.addEventListener('DOMContentLoaded', checkUrlAndManageScriptState);
            }

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
