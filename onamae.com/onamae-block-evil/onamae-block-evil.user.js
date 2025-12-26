// ==UserScript==
// @name         お名前.com 邪悪広告ブロッカー
// @namespace    userscript.moukaeritai.work
// @version      0.1.3
// @description  お名前.com Navi の操作を妨げる「邪悪な」広告や確認ポップアップを自動的に非表示にします。
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://navi.onamae.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 1. 静的要素の非表示設定
    // 識別が容易で誤爆の恐れが低いものはCSSで即座に非表示にする
    const styles = `
        /* チャットサポート要素 */
        chat,
        #chatplusview,
        #jp.chatplus.app_chat_frame,
        .chatbot-navi-onamae-com #eye_catcher {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        /* 邪悪な要素を非表示にした際に body に残るロックを強制解除するための保険 */
        body.userscript-evil-blocked {
            overflow: auto !important;
        }
    `;
    GM_addStyle(styles);

    /**
     * 要素がブロック対象（邪悪）かどうかを判定する
     * サンプルのHTML構造に基づき、できるだけ安定したセレクタとテキストで判定する
     */
    const isEvil = (el) => {
        if (!el || el.nodeType !== 1) return false;

        // 1. DNSプロテクション勧誘モーダル (Evil 1)
        // クラス名 box-DomainBanner はこの広告特有の可能性が高い
        const domainBanner = el.classList.contains('box-DomainBanner') ? el : el.querySelector('.box-DomainBanner');
        if (domainBanner) {
            const h2 = domainBanner.querySelector('.box-DomainBanner-Hdn');
            // ヘッダーテキストで内容を確定
            if (h2 && h2.textContent.includes('意図しないDNS設定変更を防ぐために')) return true;
        }

        // 2. 会員情報確認ポップアップ (Evil 2)
        // .modal クラス内の特定のヘッダータイトルを確認
        if (el.classList.contains('modal') || el.closest('.modal')) {
            const modal = el.classList.contains('modal') ? el : el.closest('.modal');
            const title = modal.querySelector('.modal-Dialog-Header-Title');
            if (title && title.textContent.includes('会員情報に変更や誤りはございませんか？')) return true;
        }

        // 3. その他特定の邪悪なクラス
        if (el.classList.contains('box-DomainBanner')) return true;

        return false;
    };

    /**
     * 対象要素を非表示にし、必要ならボディロックを解除する
     */
    const blockElement = (el) => {
        if (isEvil(el)) {
            console.log('[onamae-block-evil] Blocked evil element:', el);
            el.style.setProperty('display', 'none', 'important');

            // モーダルが表示されていることを示すクラスが body にある場合、解除を試みる
            if (document.body.classList.contains('is-ModalOpen')) {
                document.body.classList.remove('is-ModalOpen');
                document.body.classList.add('userscript-evil-blocked');
            }
            return true;
        }
        return false;
    };

    // 2. MutationObserver による動的監視
    // パフォーマンス維持のため、subtree: true でも判定処理を軽量に保つ
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // 追加されたノードのみを対象にする
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    // ノード自体をチェック
                    if (blockElement(node)) continue;

                    // コンテナ内の特定のクラスを検索（Angularの更新で一気に流し込まれる場合用）
                    const potentialEvils = node.querySelectorAll('.modal, .box-DomainBanner');
                    potentialEvils.forEach(blockElement);
                }
            }
        }
    });

    // 監視開始（document.documentElement で早い段階から捕捉）
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // 3. すでに存在する要素のクリーンアップ（念のため）
    const initialCleanup = () => {
        document.querySelectorAll('.modal, .box-DomainBanner').forEach(blockElement);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialCleanup);
    } else {
        initialCleanup();
    }
})();
