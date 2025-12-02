// ==UserScript==
// @name         Gemini Quick Export to Docs
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Adds a "Quick Export" button to ALL responses. Scans both Light DOM and Shadow DOM recursively.
// @author       Your Name
// @match        https://gemini.google.com/app/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // -----------------------------------------------------
    // 設定
    // -----------------------------------------------------
    const SHARE_BUTTON_CANDIDATES = [
        '[data-test-id="share-and-export-menu-button"]',
        'button[aria-label="Share & export"]',
        'button[mattooltip="Share & export"]'
    ];

    const COPY_BUTTON_CANDIDATES = [
        '[data-test-id="copy-button"]',
        'button[aria-label="Copy"]',
        'button[mattooltip="Copy response"]'
    ];

    const CONTAINER_SELECTOR = '.buttons-container-v2';
    const QUICK_EXPORT_BUTTON_CLASS = 'gemini-quick-export-btn';
    const EXPORT_MENU_ITEM_TEXT = 'Export to Docs';
    const QUICK_EXPORT_BUTTON_TEXT = 'Quick Export';

    // -----------------------------------------------------
    // ユーティリティ: 全探索用
    // -----------------------------------------------------

    /**
     * 指定されたセレクタに一致する要素を、Shadow DOMを含めて【すべて】再帰的に検索します。
     */
    function queryDeepAll(selector, root = document) {
        let elements = [];

        // 現在のルート（Light DOM）から検索
        elements.push(...Array.from(root.querySelectorAll(selector)));

        // Shadow DOMを持つ要素を探して再帰探索
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    return node.shadowRoot ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
            }
        );

        while (walker.nextNode()) {
            const shadowRoot = walker.currentNode.shadowRoot;
            if (shadowRoot) {
                elements.push(...queryDeepAll(selector, shadowRoot));
            }
        }

        return elements;
    }

    /**
     * 親要素を探す（Shadow DOM境界を越える）
     */
    function findParent(element, selector) {
        let current = element;
        while (current) {
            if (current.matches && current.matches(selector)) {
                return current;
            }
            if (!current.parentElement && current.parentNode instanceof ShadowRoot) {
                current = current.parentNode.host;
            } else {
                current = current.parentElement;
            }
        }
        return null;
    }

    function findElementByCandidates(candidates, root = document) {
        // 簡易検索（単一要素探索用）
        for (const selector of candidates) {
            const el = root.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    function waitForMenuItemDeep(text, timeout = 3000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
                // メニューは通常body直下に出る
                const allItems = Array.from(document.querySelectorAll('.mat-mdc-menu-item'));
                const item = allItems.find(el => el.textContent && el.textContent.includes(text));

                if (item) {
                    resolve(item);
                } else if (Date.now() - startTime < timeout) {
                    setTimeout(check, 100);
                } else {
                    console.warn(`[QuickExport] Timeout waiting for menu item: "${text}"`);
                    resolve(null);
                }
            };
            check();
        });
    }

    // -----------------------------------------------------
    // ボタン生成
    // -----------------------------------------------------

    function createButton(shareButton) {
        const btn = document.createElement('button');

        // クラス設定
        let baseClass = shareButton.className.replace('mat-mdc-menu-trigger', '').trim();
        if (!baseClass.includes('mat-mdc-button')) baseClass += ' mat-mdc-button';
        btn.className = `${QUICK_EXPORT_BUTTON_CLASS} ${baseClass}`;

        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', QUICK_EXPORT_BUTTON_TEXT);
        btn.setAttribute('mattooltip', QUICK_EXPORT_BUTTON_TEXT);

        // ★重要: 強制スタイル適用 (v1.8準拠)
        Object.assign(btn.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            height: '32px',
            padding: '0 12px',
            margin: '0 4px',
            backgroundColor: '#e8f0fe',
            color: '#174ea6',
            border: '1px solid #d2e3fc',
            borderRadius: '16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: 'Google Sans, Roboto, sans-serif',
            lineHeight: '32px',
            zIndex: '10',
            visibility: 'visible',
            opacity: '1',
            minWidth: 'auto'
        });

        // ラベル構築 (DOM API)
        const label = document.createElement('span');
        label.textContent = QUICK_EXPORT_BUTTON_TEXT;
        label.style.pointerEvents = 'none';
        btn.appendChild(label);

        // クリックイベント
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const originalBg = btn.style.backgroundColor;
            const originalText = label.textContent;

            btn.style.backgroundColor = '#d2e3fc';
            label.textContent = '...';
            btn.disabled = true;
            btn.style.cursor = 'wait';

            try {
                // このボタンに対応する共有ボタンをクリック
                shareButton.click();

                const menuItem = await waitForMenuItemDeep(EXPORT_MENU_ITEM_TEXT);
                if (menuItem) {
                    menuItem.click();
                    console.log('[QuickExport] Export triggered.');
                    label.textContent = 'Done';
                } else {
                    label.textContent = 'Not Found';
                }
            } catch (err) {
                console.error('[QuickExport] Error:', err);
                label.textContent = 'Error';
                btn.style.color = 'red';
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    label.textContent = originalText;
                    btn.style.backgroundColor = originalBg;
                    btn.style.color = '#174ea6';
                    btn.style.cursor = 'pointer';
                }, 1000);
            }
        });

        return btn;
    }

    // -----------------------------------------------------
    // スキャン & 注入ロジック
    // -----------------------------------------------------

    function scanAndInject() {
        // 1. ページ内のすべての共有ボタン候補を探す
        let allShareButtons = [];
        for (const selector of SHARE_BUTTON_CANDIDATES) {
            const found = queryDeepAll(selector);
            allShareButtons.push(...found);
        }

        // 重複除去 (同じ要素が複数のセレクタにヒットする場合があるため)
        allShareButtons = Array.from(new Set(allShareButtons));

        // 2. 各ボタンに対して処理
        let injectedCount = 0;
        for (const shareButton of allShareButtons) {
            processSingleShareButton(shareButton);
        }
    }

    function processSingleShareButton(shareButton) {
        // 親コンテナを探す
        let buttonContainer = findParent(shareButton, CONTAINER_SELECTOR);

        // フォールバック: 構造的に親を遡る
        if (!buttonContainer) {
             let curr = shareButton.parentElement;
             for (let i=0; i<6; i++) { // 少し深めに探索
                 if (curr && curr.classList.contains('buttons-container-v2')) {
                     buttonContainer = curr;
                     break;
                 }
                 if (curr) curr = curr.parentElement;
             }
        }

        // コンテナが見つからない、または既にボタンがある場合はスキップ
        if (!buttonContainer || buttonContainer.querySelector(`.${QUICK_EXPORT_BUTTON_CLASS}`)) {
            return;
        }

        // ボタン作成
        const quickExportButton = createButton(shareButton);

        // 挿入位置: Copyボタンを探す (コンテナ内)
        let copyButtonAnchor = findElementByCandidates(COPY_BUTTON_CANDIDATES, buttonContainer);

        if (copyButtonAnchor) {
             // Copyボタンのラッパーを探してその前に
             let insertTarget = copyButtonAnchor;
             while (insertTarget.parentElement && insertTarget.parentElement !== buttonContainer) {
                 insertTarget = insertTarget.parentElement;
             }
             if (insertTarget.parentElement === buttonContainer) {
                 buttonContainer.insertBefore(quickExportButton, insertTarget);
             } else {
                 buttonContainer.appendChild(quickExportButton);
             }
        } else {
            // Copyボタンがなければ末尾に
            buttonContainer.appendChild(quickExportButton);
        }

        // console.log('[QuickExport] Injected button into a container.');
    }

    // -----------------------------------------------------
    // 初期化
    // -----------------------------------------------------

    function init() {
        // 1秒ごとに全スキャン (負荷は軽微)
        setInterval(() => {
            scanAndInject();
        }, 1000);

        // DOM変化時にもスキャン (即応性)
        const observer = new MutationObserver((mutations) => {
            scanAndInject();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 初回実行
        scanAndInject();
        console.log('[QuickExport] v1.9 Initialized: Scanning all responses.');
    }

    init();

})();