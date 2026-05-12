// ==UserScript==
// @name         お名前.com 邪悪広告ブロッカー
// @namespace    userscript.moukaeritai.work
// @version      0.1.13
// @description  お名前.com Navi の操作を妨げる「邪悪な」広告や確認ポップアップを自動的に非表示にします。
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://navi.onamae.com/domain/setting/dns/control/input
// @match        https://navi.onamae.com/domain/setting/dns/control/done
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_addStyle
// @grant        GM_info
// @run-at       document-start
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/onamae.com/onamae-block-evil/onamae-block-evil.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/onamae.com/onamae-block-evil/onamae-block-evil.user.js
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

    // 1. 静的要素の非表示設定
    // 識別が容易で誤爆の恐れが低いものはCSSで即座に非表示にする
    const styles = `
        /* チャットサポート要素 */
        chat,
        #chatplusview,
        #jp.chatplus.app_chat_frame,
        .chatbot-navi-onamae-com #eye_catcher,
        /* 完了画面の広告要素 (Evil 3, 4) */
        nds-recommend,
        domain-present-free-modal {
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
        // ユーザー要望により、モーダル全体ではなく「設定する」ボタンのみを非表示にする
        // ターゲット: .box-DomainBanner 内の button.is-Primary (設定する)

        // 要素自体がボタンの場合
        if (el.tagName === 'BUTTON' && el.classList.contains('is-Primary')) {
            const banner = el.closest('.box-DomainBanner');
            if (banner) {
                const h2 = banner.querySelector('.box-DomainBanner-Hdn');
                if (h2 && h2.textContent.includes('意図しないDNS設定変更を防ぐために')) return true;
            }
        }

        // 要素がバナー（親）で、その中のボタンを探す場合
        // （MutationObserverで親が追加されたケース）
        if (el.classList.contains('box-DomainBanner') || el.querySelector('.box-DomainBanner')) {
            const banner = el.classList.contains('box-DomainBanner') ? el : el.querySelector('.box-DomainBanner');
            if (banner) {
                const h2 = banner.querySelector('.box-DomainBanner-Hdn');
                // テキスト確認
                if (h2) {
                    if (h2.textContent.includes('意図しないDNS設定変更を防ぐために')) {
                        // Evil 1: ボタンのみ非表示
                        const evilButton = banner.querySelector('button.is-Primary');
                        if (evilButton && evilButton.textContent.trim() === '設定する') {
                            blockElement(evilButton); // 副作用: ここでボタンを消す
                        }
                        return false; // バナー自体は消さない
                    }
                    if (h2.textContent.includes('そのドメインは社名・サービス名・商品名などではありませんか')) {
                        // Evil 5: ブランド保護/ドメインモニタリング勧誘バナー (dns-control-done-ad2)
                        // これは全体をブロック
                        return true;
                    }
                }
            }
        }

        // Evil 3 (nds-recommend) と Evil 4 (domain-present-free-modal) はCSSで静的にブロック済みだが、
        // 動的にclassが付与されるケースや構造変化に対応するため、ここでもチェック可能にしておく（現状はCSSで十分）

        // 注意: 会員情報確認ポップアップ (Evil 2) はブロック対象から除外しました
        // ユーザーからの報告により、残しても問題ないと判断されたため

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

        // Evil 6: 汎用的なガイドバナー (画像で判定)
        // <img src=".../guidance/guidance_main_bg.jpg?v=">
        const guidanceImages = document.querySelectorAll('img[src*="guidance_main_bg.jpg"]');
        guidanceImages.forEach(img => {
            const container = img.closest('.box-Gray');
            if (container) {
                container.style.setProperty('display', 'none', 'important');
                console.log('[onamae-block-evil] Blocked guidance banner (Evil 6)');
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialCleanup);
    } else {
        initialCleanup();
    }
})();
