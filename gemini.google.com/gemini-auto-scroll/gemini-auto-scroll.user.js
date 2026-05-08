// ==UserScript==
// @name         Gemini Auto-Scroll
// @namespace    userscript.moukaeritai.work
// @version      0.2.71
// @lastModified 2026-05-08
// @description  Automatically scroll endlessly to load all history in Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     geminiAutoScrollCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.css
// @resource     geminiAutoScrollHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @noframes
// @history       0.2.70 Removed backward-compatible gemini-history-loader listener from gemini-common.js.
// @history       0.2.68 共通ライブラリの更新に伴い、クリック処理を geminiClickElement に統一。
// @history       0.2.65 UI表示タイトルから冗長な "Gemini " プレフィックスを除去。
// @history       0.2.64 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.2.63 共通ライブラリの更新により、パネル最小化時にサイズが内容に合わせて適切にシュリンクされるように改善。
// @history       0.2.62 ヘッダー右側のバージョン表示を廃止
// @history       0.2.61 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.2.60 UI改善: シングルクリックでの開閉に対応し、タイトルとバージョンの表示形式を [絵文字] [名称] v[バージョン] に統一
// @history       0.2.59 UI共通化: パネルの外枠を gemini-common.html に統合、ストレージを GM_setValue に移行
// @history       0.2.56 リソースファイル (style.css) をスクリプト名と同じステムに改名
// @history       0.2.54 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
// @history       0.2.71 Add global listener to gemini-common.js for remote UI toggling via gus-toggle-panel event.
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
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiAutoScroll');

        const SELECTORS = {
            CONVERSATION_ITEM: 'a.conversation, a[data-test-id="conversation"]',
            SPINNER: 'mat-progress-spinner[data-test-id="loading-history-spinner"]',
            SCROLL_CONTAINER: 'nav infinite-scroller, infinite-scroller',
            SIDEBAR_TOGGLE: 'button[data-test-id="side-nav-menu-button"]',
            CHAT_APP: 'chat-app'
        };

        const CONSTANTS = {
            STORAGE_KEY: 'gemini_auto_scroll_enabled',
            PANEL_POSITION_KEY: 'gemini_auto_scroll_panel_position'
        };

        // --- State ---

        let isProcessing = false;
        let lastSelectedIndex = -1;
        let scrollInterval = null;
        let isInitialized = false;
        let uiObserver = null;
        let mainInterval = null;
        let snackbarListener = null;

        // --- State Management ---

        function isAutoScrollEnabled() {
            return GM_getValue(CONSTANTS.STORAGE_KEY, false);
        }

        function toggleAutoScroll() {
            const newState = !isAutoScrollEnabled();
            GM_setValue(CONSTANTS.STORAGE_KEY, newState);
            updatePanelUI();

            if (newState) {
                if (!isSidebarVisible()) {
                    console.debug('[GeminiAutoScroll] Sidebar is closed. Expanding sidebar...');
                    const toggle = document.querySelector(SELECTORS.SIDEBAR_TOGGLE);
                    if (toggle) {
                        window.geminiClickElement(toggle);
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

        function injectStyles() {
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const commonStyle = document.createElement('style');
                commonStyle.textContent = commonCSS;
                commonStyle.id = 'gemini-common-styles';
                document.head.appendChild(commonStyle);
            }

            if (document.getElementById('gemini-auto-scroll-styles')) return;
            const css = GM_getResourceText('geminiAutoScrollCSS');
            const style = GM_addStyle(css);
            if (style) {
                style.id = 'gemini-auto-scroll-styles';
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
                scrollBtn.style.backgroundColor = '#fef7e0';
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

        async function createAutoScrollPanel() {
            if (document.getElementById('gemini-auto-scroll-panel')) return;

            injectStyles();

            const templateHTML = GM_getResourceText('geminiAutoScrollHTML');
            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            if (!templateHTML || !commonHTMLStr) {
                console.error('[GeminiAutoScroll] Resources not found');
                return;
            }


            // Create inner content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.className = 'auto-scroll-inner';
            window.geminiSetInnerHTML(contentDiv, templateHTML, policy);

            // Assemble panel shell
            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panelShell.id = 'gemini-auto-scroll-panel';
            document.body.appendChild(panelShell);

            panelShell.querySelector('.auto-scroll-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleAutoScroll();
            });

            // Set up dragging logic
            const dragHandle = panelShell.querySelector('.gus-panel-header');
            const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
            if (dragHandle) window.geminiSetupDraggablePanel(panelShell, dragHandle, CONSTANTS.PANEL_POSITION_KEY, { top: '20px', right: '20px', left: 'auto' });
            if (inactiveHandle) window.geminiSetupDraggablePanel(panelShell, inactiveHandle, CONSTANTS.PANEL_POSITION_KEY, { top: '20px', right: '20px', left: 'auto' });

            // Minimizable Logic
            window.geminiSetupMinimizablePanel(panelShell, 'gas-minimized', dragHandle, false);

            panelShell.classList.add('ready');
            updatePanelUI();
            return panelShell;
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
                if (parent === document.body) return null;
            }
            return null;
        }

        function isSidebarVisible() {
            const chatApp = document.querySelector(SELECTORS.CHAT_APP);
            if (chatApp) {
                return chatApp.classList.contains('side-nav-open');
            }
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
                if (style.visibility !== 'hidden' && el.offsetWidth > 100) {
                    if (isElementScrollable(el)) return el;
                    bestCandidate = el;
                }
            }

            if (bestCandidate) return bestCandidate;

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

        function isFatalAutoScrollSnackbar(detail) {
            const text = String(detail?.text || '');
            return text.includes('Couldn’t load recent chats') || text.includes('Try reloading this page');
        }

        function haltAutoScrollForSnackbar() {
            if (!isAutoScrollEnabled() && !scrollInterval && !isProcessing) return;

            console.warn('[GeminiAutoScroll] Critical error detected ("Couldn\'t load"). Stopping auto-scroll.');
            GM_setValue(CONSTANTS.STORAGE_KEY, false);

            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }

            isProcessing = false;
            updatePanelUI();
            alert('Gemini Auto-Scroll halted: "Couldn’t load recent chats" error detected. Please reload the page.');
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
                scrollInterval = setInterval(() => {
                    if (!isAutoScrollEnabled()) {
                        clearInterval(scrollInterval);
                        scrollInterval = null;
                        isProcessing = false;
                        updatePanelUI();
                        return;
                    }

                    if (!isSidebarVisible()) {
                        console.debug('[GeminiAutoScroll] Sidebar hidden. Stopping auto-scroll.');
                        if (isAutoScrollEnabled()) {
                            toggleAutoScroll();
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
                isProcessing = !!scrollInterval;
                updatePanelUI();
            }
        }

        // --- Monitoring ---

        let lastUrl = window.location.href;
        let _debounceTimer;

        uiObserver = new MutationObserver(() => {
            createAutoScrollPanel();

            if (_debounceTimer) clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(() => {
                updatePanelUI();
            }, 500);
        });

        function initAutoScroll() {
            if (isInitialized) return;
            isInitialized = true;
            console.debug('[GeminiAutoScroll] Initializing (SPA navigated to /app).');

            if (window.geminiEnsureSnackbarObserver) {
                window.geminiEnsureSnackbarObserver();
            }
            if (!snackbarListener) {
                snackbarListener = (event) => {
                    const detail = event.detail || {};
                    if (isFatalAutoScrollSnackbar(detail)) {
                        haltAutoScrollForSnackbar();
                    }
                };
                window.addEventListener('gemini-snackbar:shown', snackbarListener);
            }

            uiObserver.observe(document.body, { childList: true, subtree: true });

            mainInterval = setInterval(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    setTimeout(attemptScrollToConversation, 1200);
                }
                updatePanelUI();
            }, 1000);

            setTimeout(() => {
                createAutoScrollPanel();
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

            if (snackbarListener) {
                window.removeEventListener('gemini-snackbar:shown', snackbarListener);
                snackbarListener = null;
            }

            const panel = document.getElementById('gemini-auto-scroll-panel');
            if (panel) panel.remove();

            const style = document.getElementById('gemini-auto-scroll-styles');
            if (style) style.remove();
        }

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
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    setTimeout(checkUrlAndManageScriptState, 500);
                }
            }, 500);
            console.debug('[GeminiAutoScroll] Using setInterval fallback for SPA routing.');
        }

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
})();
