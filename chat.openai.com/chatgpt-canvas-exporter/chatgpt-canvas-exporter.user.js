// @version      0.3.0
// @description  ChatGPTの会話ページでキャンバスの内容をエクスポートする
// @author       Takashi Sasaki
// @match        https://chatgpt.com/*
// @grant        none
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-canvas-exporter/chatgpt-canvas-exporter.user.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-canvas-exporter/chatgpt-canvas-exporter.user.js
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '0.3.0';

    // セレクタの定義
    const CANVAS_MESSAGE_SELECTOR = 'div[id^="textdoc-message-"]';
    const CANVAS_ACTIONS_SELECTOR = `${CANVAS_MESSAGE_SELECTOR} .flex.items-center.justify-end`;
    const CANVAS_CONTENT_SELECTOR = '.ProseMirror';
    const CANVAS_TITLE_SELECTOR = `${CANVAS_MESSAGE_SELECTOR} .text-token-text-primary.font-semibold`;

    // エクスポート処理 (特定の要素から)
    function downloadCanvasFromElement(messageEl) {
        const contentEl = messageEl.querySelector(CANVAS_CONTENT_SELECTOR);
        const titleEl = messageEl.querySelector('.text-token-text-primary.font-semibold');

        if (!contentEl) {
            console.error('Canvas content not found in element');
            return;
        }

        const textContent = contentEl.innerText;
        const title = titleEl ? titleEl.innerText.trim() : 'canvas-export';
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `${title}_${date}.md`.replace(/[\\/:*?"<>|]/g, '_');

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

    // デフォルトのエクスポート処理 (最新または単一)
    function downloadCanvasContent() {
        const messageEls = document.querySelectorAll(CANVAS_MESSAGE_SELECTOR);
        if (messageEls.length === 0) {
            alert('キャンバスが見つかりませんでした。');
            return;
        }
        downloadCanvasFromElement(messageEls[messageEls.length - 1]);
    }

    // UIボタンの追加 (Canvasヘッダー内)
    function injectExportButton() {
        const messageEls = document.querySelectorAll(CANVAS_MESSAGE_SELECTOR);

        messageEls.forEach(messageEl => {
            const container = messageEl.querySelector('.flex.items-center.justify-end');
            if (!container || container.querySelector('.canvas-exporter-btn')) return;

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
                downloadCanvasFromElement(messageEl);
            });

            btnWrapper.appendChild(btn);
            container.insertBefore(btnWrapper, container.firstChild);
        });
    }

    // パネルUIの作成/更新
    function updatePanelUI() {
        const panel = document.getElementById('canvas-exporter-panel');
        if (!panel) return;

        const listContainer = panel.querySelector('.canvas-list');
        listContainer.innerHTML = '';

        const messageEls = document.querySelectorAll(CANVAS_MESSAGE_SELECTOR);

        if (messageEls.length === 0) {
            listContainer.innerHTML = '<div class="no-canvas">No canvas detected</div>';
            return;
        }

        messageEls.forEach((messageEl, index) => {
            const titleEl = messageEl.querySelector('.text-token-text-primary.font-semibold');
            const title = titleEl ? titleEl.innerText.trim() : `Canvas ${index + 1}`;

            const item = document.createElement('div');
            item.className = 'canvas-item';
            item.innerHTML = `
                <span class="canvas-item-title" title="${title}">${title}</span>
                <button class="canvas-item-export-btn">Export</button>
            `;

            item.querySelector('.canvas-item-export-btn').addEventListener('click', () => {
                downloadCanvasFromElement(messageEl);
            });

            listContainer.appendChild(item);
        });
    }

    // パネルUIの注入
    function injectPanelUI() {
        if (document.getElementById('canvas-exporter-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'canvas-exporter-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-title">Canvas Exporter v${VERSION}</span>
                <button class="panel-close-btn">&times;</button>
            </div>
            <div class="canvas-list"></div>
        `;

        panel.querySelector('.panel-close-btn').addEventListener('click', () => {
            panel.classList.remove('active');
        });

        document.body.appendChild(panel);
    }

    // フローティングUIの追加 (移動可能)
    function injectFloatingUI() {
        if (document.getElementById('canvas-exporter-floating-ui')) return;

        const ui = document.createElement('div');
        ui.id = 'canvas-exporter-floating-ui';
        ui.innerHTML = `
            <button class="floating-export-btn" title="Export Canvas Markdown (Drag to move)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
            </button>
        `;

        const btn = ui.querySelector('.floating-export-btn');

        // ドラッグ移動の実装
        let isDragging = false;
        let startX, startY;
        let initialRight, initialBottom;

        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 左クリックのみ
            isDragging = false; // 最初はドラッグ判定しない
            startX = e.clientX;
            startY = e.clientY;

            const rect = ui.getBoundingClientRect();
            initialRight = window.innerWidth - rect.right;
            initialBottom = window.innerHeight - rect.bottom;

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    isDragging = true;
                }

                if (isDragging) {
                    ui.style.right = `${initialRight - dx}px`;
                    ui.style.bottom = `${initialBottom - dy}px`;
                    ui.style.left = 'auto'; // right/bottom優先
                    ui.style.top = 'auto';
                }
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        btn.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                const panel = document.getElementById('canvas-exporter-panel');
                if (panel) {
                    panel.classList.toggle('active');
                    if (panel.classList.contains('active')) {
                        updatePanelUI();
                    }
                }
            }
        });

        document.body.appendChild(ui);
        injectPanelUI();
    }

    // 動的監視
    const observer = new MutationObserver(() => {
        injectExportButton();
        if (document.querySelector(CANVAS_CONTENT_SELECTOR)) {
            injectFloatingUI();
            document.getElementById('canvas-exporter-floating-ui').style.display = 'block';
            if (document.getElementById('canvas-exporter-panel').classList.contains('active')) {
                updatePanelUI();
            }
        } else if (document.getElementById('canvas-exporter-floating-ui')) {
            document.getElementById('canvas-exporter-floating-ui').style.display = 'none';
            document.getElementById('canvas-exporter-panel').classList.remove('active');
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
            touch-action: none;
        }
        .floating-export-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: var(--gpt-surface-primary, #000);
            color: #fff;
            border: 1px solid var(--border-medium, #444);
            cursor: move;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s, background-color 0.2s;
            user-select: none;
        }
        .floating-export-btn:active {
            transform: scale(0.95);
        }
        .floating-export-btn:hover {
            background-color: var(--gpt-surface-secondary, #222);
        }

        #canvas-exporter-panel {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 300px;
            max-height: 400px;
            background-color: var(--gpt-surface-primary, #fff);
            color: var(--text-primary, #000);
            border: 1px solid var(--border-medium, #ccc);
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 10001;
            display: none;
            flex-direction: column;
            overflow: hidden;
        }
        #canvas-exporter-panel.active {
            display: flex;
        }
        .panel-header {
            padding: 10px;
            background-color: var(--gpt-surface-secondary, #f0f0f0);
            border-bottom: 1px solid var(--border-medium, #ccc);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .panel-title {
            font-weight: bold;
            font-size: 0.9rem;
        }
        .panel-close-btn {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: var(--text-secondary, #666);
        }
        .canvas-list {
            padding: 10px;
            overflow-y: auto;
            flex-grow: 1;
        }
        .canvas-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-light, #eee);
        }
        .canvas-item:last-child {
            border-bottom: none;
        }
        .canvas-item-title {
            font-size: 0.85rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: 10px;
        }
        .canvas-item-export-btn {
            padding: 4px 8px;
            background-color: var(--gpt-surface-primary, #000);
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 0.75rem;
            cursor: pointer;
        }
        .canvas-item-export-btn:hover {
            opacity: 0.8;
        }
        .no-canvas {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary, #666);
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);

})();
