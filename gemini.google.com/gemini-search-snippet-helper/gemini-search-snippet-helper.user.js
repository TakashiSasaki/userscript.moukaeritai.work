// ==UserScript==
// @name         Gemini Search Snippet Helper
// @namespace    userscript.moukaeritai.work
// @version      0.1.33
// @lastModified 2026-05-08
// @description  Add sequential numbers to Gemini search result conversation titles.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     geminiSearchSnippetHelperHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-search-snippet-helper/gemini-search-snippet-helper.html
// @resource     geminiSearchSnippetHelperCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-search-snippet-helper/gemini-search-snippet-helper.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @noframes
// @history       0.1.32 Removed backward-compatible gemini-history-loader listener from gemini-common.js.
// @history       0.1.29 UI表示タイトルから冗長な "Gemini " プレフィックスを除去。
// @history       0.1.28 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.1.27 ヘッダー右側のバージョン表示を廃止
// @history       0.1.26 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.1.25 UI改善: シングルクリックでの開閉に対応し、タイトルとバージョンの表示形式を [絵文字] [名称] v[バージョン] に統一
// @history       0.1.24 UI共通化: パネルの外枠を gemini-common.html に統合し、ステータスインジケーターとして表示
// @history       0.1.23 リソース化リファクタリング: UIテンプレート(HTML/CSS)を外部ファイルに分離
// @history       0.1.33 Add global listener to gemini-common.js for remote UI toggling via gus-toggle-panel event.
// @match https://userscript.moukaeritai.work/*
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

    const initUserScript = () => {
        const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiSearchSnippet');
        const PANEL_POSITION_KEY = 'gemini-search-snippet-panel-pos';

        const SNIPPET_SELECTOR = 'search-snippet';
        const TITLE_SELECTOR = '.title';
        const NUMBER_CLASS = 'search-snippet-helper-number';
        const SEARCH_PAGE_PREFIX = 'https://gemini.google.com/search';

        let observer = null;
        let debounceTimer = null;

        function isSearchPage() {
            return window.location.href.startsWith(SEARCH_PAGE_PREFIX);
        }

        function addStyles() {
            const css = GM_getResourceText('geminiSearchSnippetHelperCSS');
            if (css && !document.getElementById('gemini-search-snippet-styles')) {
                const style = GM_addStyle(css);
                if (style) style.id = 'gemini-search-snippet-styles';
            }
        }

        function addNumbers() {
            if (!isSearchPage()) return;

            const template = GM_getResourceText('geminiSearchSnippetHelperHTML');
            if (!template) return;

            const snippets = document.querySelectorAll(SNIPPET_SELECTOR);
            snippets.forEach((snippet, index) => {
                const title = snippet.querySelector(TITLE_SELECTOR);
                if (title) {
                    let numberSpan = title.querySelector(`.${NUMBER_CLASS}`);
                    if (!numberSpan) {
                        const temp = document.createElement('div');
                        window.geminiSetInnerHTML(temp, template, policy);
                        numberSpan = temp.firstElementChild;
                        if (numberSpan) {
                            title.insertBefore(numberSpan, title.firstChild);
                        }
                    }
                    if (numberSpan) {
                        // Always update the number to ensure correctness when lists change
                        numberSpan.textContent = `${index + 1}.`;
                    }
                }
            });
        }

        function createStatusPanel() {
            if (document.getElementById('gemini-search-snippet-panel')) return document.getElementById('gemini-search-snippet-panel');

            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            if (!commonHTMLStr) {
                console.error('[Gemini Search Snippet Helper] Common HTML resource not found');
                return null;
            }


            // Create an empty div for content as this script currently requires no manual UI controls
            const contentDiv = document.createElement('div');
            contentDiv.style.padding = '0 12px 8px 12px';

            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panelShell.id = 'gemini-search-snippet-panel';
            document.body.appendChild(panelShell);

            // Set up dragging and minimization support
            const dragHandle = panelShell.querySelector('.gus-panel-header');
            const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
            if (dragHandle) window.geminiSetupDraggablePanel(panelShell, dragHandle, PANEL_POSITION_KEY, { right: '20px', bottom: '20px' });
            if (inactiveHandle) window.geminiSetupDraggablePanel(panelShell, inactiveHandle, PANEL_POSITION_KEY, { right: '20px', bottom: '20px' });

            window.geminiSetupMinimizablePanel(panelShell, 'gssh-minimized', dragHandle, false);

            return panelShell;
        }

        function checkAndApply() {
            const isSearch = isSearchPage();
            let panel = document.getElementById('gemini-search-snippet-panel');

            if (isSearch) {
                if (!panel) panel = createStatusPanel();
                if (panel) panel.style.display = 'flex';
                addNumbers();
            } else if (panel) {
                panel.style.display = 'none';
            }
        }

        addStyles();

        // Use Navigation API for SPA routing
        if (window.navigation) {
            window.navigation.addEventListener('navigatesuccess', () => {
                setTimeout(checkAndApply, 500);
            });
            console.log('[Gemini Search Snippet Helper] Using Navigation API for SPA routing.');
        }

        observer = new MutationObserver((mutations) => {
            if (!isSearchPage()) return;

            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    debounceTimer = null;
                    addNumbers();
                }, 200);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Initial run
        checkAndApply();
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
