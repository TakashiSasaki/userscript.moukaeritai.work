// ==UserScript==
// @name         Grok Conversation Copy
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Grokの会話ページで、全てのコピーボタンを順に押して内容を結合し、クリップボードにコピーします。
// @author       Takashi Sasaki
// @match        https://grok.com/*
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        buttonSelector: 'button[aria-label="コピー"], button[aria-label="Copy"]',
        interClickDelay: 100, // ms
    };

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
            const finalText = collectedText.join('\n\n' + '-'.repeat(20) + '\n\n');

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
    }

    // Monitoring for page changes (SPA)
    const observer = new MutationObserver(() => {
        addFloatingButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial add
    addFloatingButton();

})();