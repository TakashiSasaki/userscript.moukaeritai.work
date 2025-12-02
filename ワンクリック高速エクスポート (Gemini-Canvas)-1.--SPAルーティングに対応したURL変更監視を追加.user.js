// ==UserScript==
// @name         ワンクリック高速エクスポート (Gemini/Canvas)
// @namespace    http://tampermonkey.net/
// @version      1.6 // SPAルーティングに対応したURL変更監視を追加
// @description  Gemini/Canvasのドキュメントで「Export to Docs」操作を高速化するボタンを注入します。
// @author       専門家
// @match        https://gemini.google.com/app/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 設定値 ---

    // 1. 共有ボタンが含まれるコンテナ要素のセレクタ (この要素の左隣に新ボタンを挿入)
    const SHARE_CONTAINER_SELECTOR = 'div.mat-mdc-tooltip-trigger:has(share-button[data-test-id="consolidated-share-button"])';

    // 2. 共有ボタン自体の安定セレクタ (メニュー表示のためにクリック対象となるボタン)
    const SHARE_BUTTON_SELECTOR = 'share-button[data-test-id="consolidated-share-button"] button';

    // 3. 「Export to Docs」メニュー項目の安定セレクタ (最終的にクリック対象となる要素)
    const EXPORT_MENU_ITEM_SELECTOR = 'export-to-docs-button button';

    // 4. メニューが表示されるのを待つ時間 (ミリ秒)
    const MENU_DELAY_MS = 200;

    // 5. 新しいボタンの表示名
    const QUICK_BUTTON_TEXT = 'Docsへ一括Export';

    // 6. SPAナビゲーションを検知するためのポーリング間隔 (ミリ秒)
    const URL_CHECK_INTERVAL_MS = 500;

    // --- グローバル変数 ---
    let lastUrl = window.location.href;
    let isInjectorRunning = false; // 注入処理が実行中かどうかのフラグ

    // --- ロジック ---

    /**
     * DOM要素の出現を監視し、目的の要素が利用可能になったらコールバックを実行します。
     * この関数は、要素が見つかったら監視を停止します。
     * @param {string} selector - 監視対象のCSSセレクタ
     * @param {function(Element): void} callback - 要素が見つかったときに実行する関数
     */
    function waitForElement(selector, callback) {
        // ターゲット要素がすぐに見つかった場合
        const target = document.querySelector(selector);
        if (target) {
            callback(target);
            return;
        }

        // MutationObserverでDOMの変更を継続的に監視
        const observer = new MutationObserver((mutationsList, observer) => {
            const foundElement = document.querySelector(selector);
            if (foundElement) {
                observer.disconnect();
                callback(foundElement);
            }
        });

        // body全体の子要素の追加/削除を監視し、非同期ロードに対応
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * ワンクリックボタンを作成し、DOMに挿入します。
     * この関数は、ターゲット要素が出現した後にのみ実行されます。
     */
    function injectQuickExportButton(container) {
        // 既にボタンが挿入されていないか確認（SPAでの二重実行防止）
        // Quick Buttonに設定した 'quick-export-btn' クラスで確認
        if (container.previousElementSibling && container.previousElementSibling.classList.contains('quick-export-btn')) {
             return;
        }

        // 1. 新しいボタンを作成
        const quickButton = document.createElement('button');
        quickButton.textContent = QUICK_BUTTON_TEXT;
        quickButton.title = QUICK_BUTTON_TEXT;

        // UIデザインの模倣とクラス設定
        quickButton.className = 'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-unthemed ng-star-inserted quick-export-btn';

        quickButton.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            padding: 0 16px;
            margin-right: 8px;
            border-radius: 20px;
            height: 36px;
            background-color: #33a852; /* Google Greenに近い色 */
            color: white;
            border: none;
            cursor: pointer;
            transition: background-color 0.15s ease-in-out;
            min-width: 0;
        `;

        quickButton.onmouseover = () => quickButton.style.backgroundColor = '#2c9748';
        quickButton.onmouseout = () => quickButton.style.backgroundColor = '#33a852';

        // 2. ボタンに機能実行ロジックを設定
        quickButton.addEventListener('click', performQuickExport);

        // 3. ボタンを挿入
        container.parentNode.insertBefore(quickButton, container);
        console.log('UserScript: 「Export Docs」クイックボタンを注入しました。');
    }

    /**
     * 共有ボタンクリックとエクスポートメニュークリックを連続実行します。
     */
    function performQuickExport() {
        // 1. 共有ボタンの要素を取得
        const shareButton = document.querySelector(SHARE_BUTTON_SELECTOR);
        if (!shareButton) {
            console.error('UserScript Error: 共有ボタンが見つかりません。クイックボタンを再クリックしてください。');
            return;
        }

        // click()メソッドでクリックイベントをトリガーし、メニューを表示
        shareButton.click();
        console.log('UserScript: 共有ボタンをクリックしました (メニュー表示トリガー)。');

        // 2. メニューが表示されるのを待ってから、「Export to Docs」をクリック
        setTimeout(() => {
            const exportItem = document.querySelector(EXPORT_MENU_ITEM_SELECTOR);

            if (!exportItem) {
                console.error('UserScript Error: 「Export to Docs」メニューが見つかりません。DOMの遅延またはセレクタを確認してください。');
                return;
            }

            // click()メソッドでメニュー項目をクリックし、機能実行
            exportItem.click();
            console.log('UserScript: 「Export to Docs」を実行しました。');

        }, MENU_DELAY_MS);
    }

    /**
     * SPAのページ遷移を検知し、ボタン注入ロジックを再起動します。
     */
    function checkUrlChange() {
        const currentUrl = window.location.href;

        // URLが変更された、またはinjectorがまだ実行されていない場合
        if (currentUrl !== lastUrl || !isInjectorRunning) {
            console.log('UserScript: URL変更（または初期ロード）を検知。注入処理を再起動します。');

            // ページ遷移時に古いボタンが残っている場合があるため、手動で削除する処理を追加することもできますが、
            // 今回は simply `waitForElement` で新しい要素を待ちます。

            // isInjectorRunningをtrueに設定
            isInjectorRunning = true;

            // ターゲット要素（共有ボタンのコンテナ）の出現を待つ
            waitForElement(SHARE_CONTAINER_SELECTOR, injectQuickExportButton);

            lastUrl = currentUrl;
        }
    }

    // 実行ロジック:
    // ページロード時に一度実行し、その後はタイマーでURL変更をポーリングします。
    window.addEventListener('load', () => {
        // 初回ロード時に注入ロジックを起動
        checkUrlChange();

        // 以降、SPAのルーティングによるURL変更を定期的に監視
        setInterval(checkUrlChange, URL_CHECK_INTERVAL_MS);
    });

})();