// ==UserScript==
// @name         Gemini Auto-Select Next
// @namespace    userscript.moukaeritai.work
// @version      0.2.65
// @lastModified 2026-04-16
// @description  Automatically select the next conversation when the current one is deleted or removed
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     geminiAutoSelectNextCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.css
// @resource     geminiAutoSelectNextHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.html
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @noframes
// @history       0.2.65 UI表示タイトルから冗長な "Gemini " プレフィックスを除去。
// @history       0.2.64 UI デザイン方針の統一に伴い、個別スタイルでのフォントサイズ・オーバーライドを解除。共通基盤の 13px を継承するように改善。
// @history       0.2.63 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.2.60 CSSに `visibility: hidden` が残存し幽霊枠となっていた致命的バグを修正
// @history       0.2.59 URLの正規表現を修正し、/app (末尾スラッシュなし) でUIが非表示になる不具合を修正
// @history       0.2.58 ヘッダー右側のバージョン表示を廃止
// @history       0.2.57 テンプレート読み込みエラーの診断ログを強化
// @history       0.2.56 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.2.54 リソース化リファクタリング: UIテンプレート(HTML)を外部ファイルに分離
// @history       0.2.52 リソースファイル (style.css) をスクリプト名と同じステムに改名
// @history       0.2.50 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
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
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiAutoSwitch');

        const SELECTORS = {
            CONVERSATION_ITEM: 'a.conversation, a[data-test-id="conversation"]',
            SCROLL_CONTAINER: 'nav infinite-scroller, infinite-scroller'
        };

        const CONSTANTS = {
            STORAGE_KEY_AUTOSWITCH: 'gemini_auto_switch_next',
            STORAGE_KEY_MINIMIZED: 'gemini_auto_switch_minimized',
            PANEL_POSITION_KEY: 'gemini_auto_switch_panel_position'
        };

        let lastSelectedIndex = -1;
        let isInitialized = false;
        let uiObserver = null;
        let mainInterval = null;

        function isAutoSwitchEnabled() {
            return GM_getValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, true);
        }

        function injectStyles() {
            // Inject shared common styles
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const commonStyle = document.createElement('style');
                commonStyle.textContent = commonCSS;
                commonStyle.id = 'gemini-common-styles';
                document.head.appendChild(commonStyle);
            }

            if (document.getElementById('gemini-auto-switch-styles')) return;
            const css = GM_getResourceText('geminiAutoSelectNextCSS');
            const style = GM_addStyle(css);
            if (style) {
                style.id = 'gemini-auto-switch-styles';
            }
        }

        function getConversationItems() {
            const container = document.querySelector(SELECTORS.SCROLL_CONTAINER) || document;
            return Array.from(container.querySelectorAll(SELECTORS.CONVERSATION_ITEM));
        }

        function getIdFromItem(item) {
            if (!item) return null;
            const href = item.getAttribute('href');
            if (href) {
                const match = href.match(/\/(app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})/);
                if (match) return match[2];
            }
            const jslog = item.getAttribute('jslog');
            if (jslog) {
                const match = jslog.match(/c_([0-9a-f]{16})/) || jslog.match(/["']([a-f0-9]{16})["']/);
                if (match) return match[1];
            }
            return null;
        }

        function getConversationIdFromUrl() {
            const match = window.location.pathname.match(/\/(app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})/);
            return match ? match[2] : null;
        }

        function findNextConversationId() {
            const currentId = getConversationIdFromUrl();
            const allItems = getConversationItems();

            if (!currentId) {
                if (allItems.length > 0) {
                    let targetIndex = Math.max(0, Math.min(lastSelectedIndex, allItems.length - 1));
                    return getIdFromItem(allItems[targetIndex]);
                }
                return null;
            }

            const currentIndex = allItems.findIndex(item => getIdFromItem(item) === currentId);
            if (currentIndex !== -1) {
                for (let i = currentIndex + 1; i < allItems.length; i++) {
                    const nextId = getIdFromItem(allItems[i]);
                    if (nextId && nextId !== currentId) return nextId;
                }
            }
            return null;
        }

        function selectNextConversation(retryCount = 0, force = false) {
            if (!force && !isAutoSwitchEnabled()) {
                console.log('[GeminiAutoSelectNext] selectNextConversation called but ignored (force=false, auto=off)');
                return;
            }
            const nextId = findNextConversationId();
            console.log(`[GeminiAutoSelectNext] selectNextConversation logic start. force: ${force}, retry: ${retryCount}, foundNextId: ${nextId}`);
            if (nextId) {
                const items = getConversationItems();
                const target = items.find(item => getIdFromItem(item) === nextId);
                if (target) {
                    console.log(`[GeminiAutoSelectNext] Targeted conversation found in DOM. Clicking...`);
                    target.click();
                } else if (retryCount < 5) {
                    console.log(`[GeminiAutoSelectNext] Target nextId not in DOM (virtual scroll?). Retrying ${retryCount + 1}/5...`);
                    setTimeout(() => selectNextConversation(retryCount + 1, force), 200);
                } else {
                    console.log(`[GeminiAutoSelectNext] Target nextId still not in DOM after retries. Redirecting window to: /app/${nextId}`);
                    window.location.href = `https://gemini.google.com/app/${nextId}`;
                }
            } else {
                console.log('[GeminiAutoSelectNext] No next conversation found to skip to.');
            }
        }

        function updatePanelUI() {
            const panel = document.getElementById('gemini-auto-switch-panel');
            if (!panel) return;

            const checkbox = panel.querySelector('.auto-switch-checkbox');
            if (checkbox) {
                checkbox.checked = isAutoSwitchEnabled();
            }

            const items = getConversationItems();
            const selectedIndex = items.findIndex(item => item.classList.contains('selected') || item.getAttribute('aria-current') === 'page');
            if (selectedIndex !== -1) lastSelectedIndex = selectedIndex;
        }

        function createDraggablePanel() {
            if (document.getElementById('gemini-auto-switch-panel')) return;

            injectStyles();

            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            const innerHTMLStr = GM_getResourceText('geminiAutoSelectNextHTML');
            if (!commonHTMLStr || !innerHTMLStr) {
                console.error(`[GeminiAutoSelectNext] Templates not found. gusCommonHTML: ${!!commonHTMLStr}, geminiAutoSelectNextHTML: ${!!innerHTMLStr}`);
                return;
            }

            const contentDiv = document.createElement('div');
            window.geminiSetInnerHTML(contentDiv, innerHTMLStr, policy);

            const panel = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panel.id = 'gemini-auto-switch-panel';
            document.body.appendChild(panel);

            const handle = panel.querySelector('.gus-panel-header') || panel;
            window.geminiSetupDraggablePanel(panel, handle, CONSTANTS.PANEL_POSITION_KEY, { top: '80px', right: '20px' });
            window.geminiSetupMinimizablePanel(panel, CONSTANTS.STORAGE_KEY_MINIMIZED, handle, false);

            const checkbox = panel.querySelector('.auto-switch-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    GM_setValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, e.target.checked);
                    updatePanelUI();
                });
            }

            const nextBtn = panel.querySelector('.manual-next-btn');
            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectNextConversation(0, true);
                });
            }

            updatePanelUI();
        }

        uiObserver = new MutationObserver((mutations) => {
            let runUpdate = false;
            let triggerSwitch = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const removedNode of mutation.removedNodes) {
                        if (removedNode.nodeType === 1) {
                            const isConversation = removedNode.matches(SELECTORS.CONVERSATION_ITEM) || removedNode.querySelector(SELECTORS.CONVERSATION_ITEM);
                            const wasSelected = removedNode.classList?.contains('selected') || removedNode.querySelector('.selected');

                            if (isConversation) {
                                runUpdate = true;
                                if (wasSelected) triggerSwitch = true;
                            }
                        }
                    }
                    for (const addedNode of mutation.addedNodes) {
                        if (addedNode.nodeType === 1) {
                            if (addedNode.matches && addedNode.matches(SELECTORS.CONVERSATION_ITEM) || (addedNode.querySelector && addedNode.querySelector(SELECTORS.CONVERSATION_ITEM))) {
                                runUpdate = true;
                            }
                        }
                    }
                }
            }

            if (runUpdate) updatePanelUI();
            if (triggerSwitch) setTimeout(selectNextConversation, 100);
        });

        function init() {
            if (isInitialized) return;
            isInitialized = true;
            uiObserver.observe(document.body, { childList: true, subtree: true });

            // Initial setup
            setTimeout(() => {
                createDraggablePanel();
                updatePanelUI();
            }, 1500);

            // Periodic UI check to ensure panel exists
            mainInterval = setInterval(() => {
                if (!document.getElementById('gemini-auto-switch-panel')) {
                    createDraggablePanel();
                }
                updatePanelUI();
            }, 2000);

            // Custom event interface: allow other userscripts to request "select next"
            window.addEventListener('gemini-auto-select-next:request-next', () => {
                console.log('[GeminiAutoSelectNext] EVENT RECEIVED: gemini-auto-select-next:request-next');
                selectNextConversation(0, true);
            });
        }

        function checkUrl() {
            if (/^\/(app|gem)(?:\/|$)/.test(location.pathname)) {
                init();
            } else {
                isInitialized = false;
                uiObserver.disconnect();
                if (mainInterval) {
                    clearInterval(mainInterval);
                    mainInterval = null;
                }
                const p = document.getElementById('gemini-auto-switch-panel');
                if (p) p.remove();
            }
        }

        if (window.navigation) window.navigation.addEventListener('navigatesuccess', () => setTimeout(checkUrl, 500));
        else setInterval(checkUrl, 1000);

        if (document.body) checkUrl();
        else window.addEventListener('DOMContentLoaded', checkUrl);
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
