// ==UserScript==
// @name         ChatGPT Canvas Exporter
// @namespace    https://userscript.moukaeritai.work/
// @version      0.2.0
// @description  ChatGPTの会話ページでキャンバスの内容をエクスポートする
// @author       Takashi Sasaki
// @match        https://chatgpt.com/*
// @grant        none
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-canvas-exporter/chatgpt-canvas-exporter.user.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-canvas-exporter/chatgpt-canvas-exporter.user.js
// ==/UserScript==

(function () {
    'use strict';

    // セレクタの定義
    // ボタンを注入するコンテナ（Canvasの右上のアクションエリア）
    const CANVAS_ACTIONS_SELECTOR = 'div[id^="textdoc-message-"] .flex.items-center.justify-end';
    // エクスポートするコンテンツ本体 (ProseMirror エディタ)
    const CANVAS_CONTENT_SELECTOR = '.ProseMirror';
    // Canvasのタイトル要素
    const CANVAS_TITLE_SELECTOR = 'div[id^="textdoc-message-"] .text-token-text-primary.font-semibold';

    // エクスポート処理
    function downloadCanvasContent() {
        const contentEl = document.querySelector(CANVAS_CONTENT_SELECTOR);
        if (!contentEl) {
            console.error('Canvas content not found');
            alert('キャンバスのコンテンツが見つかりませんでした。');
            return;
        }

        const textContent = contentEl.innerText;

        // タイトルの取得
        const titleEl = document.querySelector(CANVAS_TITLE_SELECTOR);
        const title = titleEl ? titleEl.innerText.trim() : 'canvas-export';
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `${title}_${date}.md`.replace(/[\\/:*?"<>|]/g, '_'); // 不正文字置換

        // ファイルとしてエクスポート
        const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // UIボタンの追加
    function injectExportButton() {
        const actionContainers = document.querySelectorAll(CANVAS_ACTIONS_SELECTOR);

        actionContainers.forEach(container => {
            // 既にボタンがあったら追加しない
            if (container.querySelector('.canvas-exporter-btn')) return;

            const btnWrapper = document.createElement('div');
            btnWrapper.className = 'hover:text-token-text-primary canvas-exporter-btn-wrapper';

            const btn = document.createElement('button');
            btn.className = 'flex gap-1 items-center select-none px-1.5 py-1 canvas-exporter-btn';
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" class="icon-md">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                <span>Export MD</span>
            `;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadCanvasContent();
            });

            btnWrapper.appendChild(btn);
            container.insertBefore(btnWrapper, container.firstChild);
        });
    }

    // フローティングUIの追加
    function injectFloatingUI() {
        if (document.getElementById('canvas-exporter-floating-ui')) return;

        const ui = document.createElement('div');
        ui.id = 'canvas-exporter-floating-ui';
        ui.innerHTML = `
            <button class="floating-export-btn" title="Export Canvas Markdown">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
            </button>
        `;

        ui.querySelector('.floating-export-btn').addEventListener('click', downloadCanvasContent);
        document.body.appendChild(ui);
    }

    // 動的監視
    const observer = new MutationObserver(() => {
        injectExportButton();
        // Canvasが表示されている時のみフローティングUIを表示する制御も可能だが、
        // 現時点では常に表示（または存在確認）
        if (document.querySelector(CANVAS_CONTENT_SELECTOR)) {
            injectFloatingUI();
            document.getElementById('canvas-exporter-floating-ui').style.display = 'block';
        } else if (document.getElementById('canvas-exporter-floating-ui')) {
            document.getElementById('canvas-exporter-floating-ui').style.display = 'none';
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // スタイルの注入
    const style = document.createElement('style');
    style.textContent = `
        .canvas-exporter-btn {
            color: var(--text-secondary);
            font-size: 0.875rem;
            cursor: pointer;
            transition: color 0.2s;
        }
        .canvas-exporter-btn:hover {
            color: var(--text-primary);
        }
        @media (max-width: 640px) {
            .canvas-exporter-btn span {
                display: none;
            }
        }
        
        #canvas-exporter-floating-ui {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: none;
        }
        .floating-export-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: var(--gpt-surface-primary, #000);
            color: #fff;
            border: 1px solid var(--border-medium, #444);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s, background-color 0.2s;
        }
        .floating-export-btn:hover {
            transform: scale(1.1);
            background-color: var(--gpt-surface-secondary, #222);
        }
    `;
    document.head.appendChild(style);

})();
