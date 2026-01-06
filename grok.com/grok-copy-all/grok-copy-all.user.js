// ==UserScript==
// @name         Grok Conversation Copy
// @namespace    https://userscript.moukaeritai.work/
// @version      1.3.5
// @description  Grokの会話ページで、全てのコピーボタンを順に押して内容を結合し、ユーザーとモデルを区別するインジケーター付きでクリップボードにコピーします。ボタンにメッセージ数を表示。
// @author       Takashi Sasaki
// @match        https://grok.com/c/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @run-at       document-idle
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/grok.com/grok-copy-all/grok-copy-all.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/grok.com/grok-copy-all/grok-copy-all.user.js
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

    const CONFIG = {
        buttonSelector: 'button[aria-label="コピー"], button[aria-label="Copy"]',
        interClickDelay: 100, // ms
        userIndicator: '[USER]',
        modelIndicator: '[GROK]',
    };

    /**
     * メッセージコンテナのクラスを解析して、ユーザーメッセージかモデル応答かを判定する
     * @param {HTMLElement} copyButton - コピーボタン要素
     * @returns {string} 'user' | 'model' | 'unknown'
     */
    function detectMessageSource(copyButton) {
        let element = copyButton;

        // DOMを上方向に最大20階層まで探索
        for (let i = 0; i < 20; i++) {
            element = element.parentElement;
            if (!element) break;

            const classList = element.classList;
            if (!classList) continue;

            // items-end = ユーザーメッセージ（右寄せ）
            // items-start = モデル応答（左寄せ）
            if (classList.contains('items-end')) {
                return 'user';
            }
            if (classList.contains('items-start')) {
                return 'model';
            }

            // 代替検出: message-bubble のスタイルで判定
            const classString = Array.from(classList).join(' ');

            // ユーザーメッセージ: 背景色あり、幅制限あり、右下角丸
            if (classString.includes('bg-surface-l1') &&
                classString.includes('rounded-br-lg')) {
                return 'user';
            }

            // モデル応答: 全幅、最大幅制限なし
            if (classString.includes('max-w-none') &&
                classString.includes('w-full')) {
                return 'model';
            }
        }

        return 'unknown';
    }

    /**
     * メッセージソースに応じたインジケーターを取得
     * @param {string} source - 'user' | 'model' | 'unknown'
     * @returns {string} インジケーター文字列
     */
    function getIndicator(source) {
        switch (source) {
            case 'user':
                return CONFIG.userIndicator;
            case 'model':
                return CONFIG.modelIndicator;
            default:
                return '[???]';
        }
    }

    /**
     * ページ内のユーザー入力とモデル応答の数をカウントする
     * @returns {{user: number, model: number, unknown: number}}
     */
    function countMessages() {
        const copyButtons = Array.from(document.querySelectorAll(CONFIG.buttonSelector));
        const counts = { user: 0, model: 0, unknown: 0 };

        for (const btn of copyButtons) {
            const source = detectMessageSource(btn);
            counts[source]++;
        }

        return counts;
    }

    /**
     * ボタンのラベルを更新する（メッセージ数を表示）
     */
    function updateButtonLabel() {
        const btn = document.getElementById('grok-copy-all-btn');
        if (!btn || btn.disabled) return;

        const counts = countMessages();
        const total = counts.user + counts.model + counts.unknown;

        if (total === 0) {
            btn.textContent = 'Copy All (0)';
        } else {
            btn.textContent = `Copy All (U:${counts.user} G:${counts.model})`;
        }
    }

    function addFloatingButton() {
        if (document.getElementById('grok-copy-all-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'grok-copy-all-btn';
        btn.textContent = 'Copy All';
        btn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 15px;
            background-color: #f26522; /* Grok orange-ish or distinct color */
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            font-family: sans-serif;
        `;

        btn.addEventListener('click', executeCopySequence);
        document.body.appendChild(btn);

        // 初期表示時にメッセージ数を更新
        updateButtonLabel();
    }

    async function executeCopySequence() {
        const btn = document.getElementById('grok-copy-all-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Processing...';
        btn.disabled = true;
        btn.style.backgroundColor = '#666';

        const copyButtons = Array.from(document.querySelectorAll(CONFIG.buttonSelector));

        if (copyButtons.length === 0) {
            alert('コピーボタンが見つかりませんでした。');
            resetButton(btn, originalText);
            return;
        }

        // --- 各ボタンのメッセージソースを事前に判定 ---
        const messageSources = copyButtons.map(btn => detectMessageSource(btn));

        // --- Clipboard Hijacking Logic ---
        let collectedText = [];
        const originalWriteText = navigator.clipboard.writeText;

        // We create a promise that resolves when writeText is called, 
        // effectively capturing the text without writing to the real clipboard yet.
        const hijackClipboard = () => {
            navigator.clipboard.writeText = async (text) => {
                collectedText.push(text);
                return Promise.resolve();
            };
        };

        const restoreClipboard = () => {
            navigator.clipboard.writeText = originalWriteText;
        };

        try {
            hijackClipboard();

            // Sort buttons by position in DOM to ensure correct order (Top to Bottom)
            // querySelectorAll follows document order, but explicit sorting is safer if layout is complex.
            // (Standard DOM order is usually sufficient).

            for (let i = 0; i < copyButtons.length; i++) {
                const targetBtn = copyButtons[i];

                // Visual feedback (optional)
                targetBtn.style.outline = '2px solid red';

                // Trigger click
                targetBtn.click();

                // Wait a bit for the click handler to fire and call writeText
                await new Promise(r => setTimeout(r, CONFIG.interClickDelay));

                targetBtn.style.outline = '';
            }

        } catch (e) {
            console.error('Error during copy sequence:', e);
            alert('エラーが発生しました: ' + e.message);
        } finally {
            restoreClipboard();
        }

        if (collectedText.length > 0) {
            // インジケーター付きでテキストを結合
            const formattedTexts = collectedText.map((text, index) => {
                const indicator = getIndicator(messageSources[index]);
                return `${indicator}\n${text}`;
            });

            const finalText = formattedTexts.join('\n\n' + '-'.repeat(20) + '\n\n');

            try {
                // Use GM_setClipboard if available (more reliable in userscripts), fallback to navigator
                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(finalText);
                } else {
                    await navigator.clipboard.writeText(finalText);
                }

                btn.textContent = 'Done!';
                setTimeout(() => resetButton(btn, originalText), 2000);
            } catch (err) {
                console.error('Final copy failed:', err);
                alert('クリップボードへの書き込みに失敗しました。');
                resetButton(btn, originalText);
            }
        } else {
            alert('テキストを取得できませんでした。');
            resetButton(btn, originalText);
        }
    }

    function resetButton(btn, text) {
        btn.textContent = text;
        btn.disabled = false;
        btn.style.backgroundColor = '#f26522';
        // ボタンリセット時にラベルも更新
        setTimeout(updateButtonLabel, 100);
    }

    // デバウンス用タイマー
    let updateDebounceTimer = null;

    /**
     * デバウンス付きでボタン更新を行う（パフォーマンス対策）
     */
    function scheduleUpdate() {
        if (updateDebounceTimer) {
            clearTimeout(updateDebounceTimer);
        }
        updateDebounceTimer = setTimeout(() => {
            addFloatingButton();
            updateButtonLabel();
        }, 500); // 500ms待ってから更新
    }

    // Monitoring for page changes (SPA)
    const observer = new MutationObserver(() => {
        scheduleUpdate();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial add
    addFloatingButton();

})();