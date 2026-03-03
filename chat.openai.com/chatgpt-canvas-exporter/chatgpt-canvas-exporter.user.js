// ==UserScript==
// @name         ChatGPT Canvas Exporter
// @namespace    https://userscript.moukaeritai.work/
// @version      0.6.6
// @description  ChatGPTの会話ページでキャンバスの内容をエクスポートする
// @author       Takashi Sasaki
// @match        https://chatgpt.com/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-canvas-exporter/chatgpt-canvas-exporter.user.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-canvas-exporter/chatgpt-canvas-exporter.user.js
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '0.6.6';

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
        downloadBlob(blob, fileName);
    }

    // 共通のBlobダウンロード処理
    function downloadBlob(blob, fileName) {
        console.log(`[CanvasExporter] downloadBlob started. fileName=${fileName}, blob size=${blob.size}, blob type=${blob.type}`);
        const url = URL.createObjectURL(blob);

        if (typeof GM_download !== 'undefined') {
            console.log('[CanvasExporter] Attempting GM_download...');
            GM_download({
                url: url,
                name: fileName,
                saveAs: false, // Dialogスキップを試みる（拡張機能の設定依存）
                onload: () => {
                    console.log('[CanvasExporter] GM_download succeeded!');
                    URL.revokeObjectURL(url);
                },
                onerror: (err) => {
                    console.error('[CanvasExporter] GM_download failed:', err);
                    console.log('[CanvasExporter] Attempting fallback download...');
                    fallbackDownload(url, fileName);
                    // URL is revoked inside fallbackDownload
                }
            });
        } else {
            console.log('[CanvasExporter] GM_download not available, falling back immediately.');
            fallbackDownload(url, fileName);
        }
    }

    // ArrayBufferを安全にBase64文字列に変換するヘルパー（スタックオーバーフロー対策）
    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // 画像をArrayBufferとして取得し、Base64文字列に変換して返す (CORS・サンドボックス対策)
    function fetchImageAsBase64(url) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'arraybuffer',
                    onload: function (response) {
                        if (response.status >= 200 && response.status < 300) {
                            const headers = response.responseHeaders || '';
                            const match = headers.match(/content-type:\s*([^\s;]+)/i);
                            const type = match ? match[1].toLowerCase() : '';
                            const base64Str = arrayBufferToBase64(response.response);
                            resolve({ base64: base64Str, type: type, size: response.response.byteLength });
                        } else {
                            reject(new Error('HTTP Status ' + response.status));
                        }
                    },
                    onerror: function (err) {
                        reject(err);
                    }
                });
            } else {
                fetch(url).then(r => r.arrayBuffer().then(buffer => ({
                    base64: arrayBufferToBase64(buffer),
                    type: r.headers.get('content-type') || '',
                    size: buffer.byteLength
                }))).then(resolve).catch(reject);
            }
        });
    }

    // すべてのキャンバスと画像をZIPで一括エクスポート
    async function downloadAllAsZip() {
        console.log('[CanvasExporter] downloadAllAsZip started');
        const messageEls = document.querySelectorAll(CANVAS_MESSAGE_SELECTOR);
        console.log(`[CanvasExporter] Found ${messageEls.length} canvas message elements.`);
        if (messageEls.length === 0) return;

        if (typeof JSZip === 'undefined') {
            console.error('[CanvasExporter] JSZip is not defined.');
            alert('ZIPライブラリ(JSZip)がロードされていません。ページを開き直して再試行してください。');
            return;
        }

        const zip = new JSZip();
        const date = new Date().toISOString().slice(0, 10);
        let hasContent = false;
        const titleCounts = {}; // ファイル名重複防止用

        // --- 1. キャンバスのエクスポート ---
        console.log('[CanvasExporter] Starting canvas extraction...');
        messageEls.forEach((messageEl, index) => {
            const contentEl = messageEl.querySelector(CANVAS_CONTENT_SELECTOR);
            const titleEl = messageEl.querySelector('.text-token-text-primary.font-semibold');

            if (contentEl) {
                hasContent = true;
                const textContent = contentEl.innerText;
                let title = titleEl ? titleEl.innerText.trim() : `Canvas ${index + 1}`;
                title = title.replace(/[\\/:*?"<>|]/g, '_');

                // 重複タイトルに連番を付与
                if (titleCounts[title]) {
                    titleCounts[title]++;
                    title = `${title}_${titleCounts[title]}`;
                } else {
                    titleCounts[title] = 1;
                }

                console.log(`[CanvasExporter] Added canvas file: canvases/${title}.md`);
                zip.file(`canvases/${title}.md`, textContent);
            }
        });

        // --- 2. 会話中の画像のエクスポート ---
        console.log('[CanvasExporter] Starting image extraction...');
        const imageEls = document.querySelectorAll('article img');
        const imgPromises = [];
        const seenSrc = new Set();
        let imgCount = 0;

        imageEls.forEach((img) => {
            const src = img.src;
            if (!src || src.startsWith('data:')) return; // Data URIは除外

            // アバターや小さいUIアイコンを除外
            if (img.alt === 'User' || img.alt === 'ChatGPT' || img.alt.includes('プロファイル') || src.includes('avatar') || src.includes('profile') || src.includes('favicons') || img.width <= 40 || img.height <= 40) {
                return;
            }

            if (seenSrc.has(src)) return;
            seenSrc.add(src);

            imgCount++;
            const currentImgId = imgCount;

            console.log(`[CanvasExporter] Fetching image ${currentImgId}: ${src.substring(0, 50)}...`);
            imgPromises.push(
                fetchImageAsBase64(src).then(result => {
                    let ext = 'png'; // デフォルト
                    if (result.type) {
                        if (result.type.includes('jpeg') || result.type.includes('jpg')) ext = 'jpg';
                        else if (result.type.includes('webp')) ext = 'webp';
                        else if (result.type.includes('gif')) ext = 'gif';
                    } else {
                        if (src.includes('.jpg') || src.includes('.jpeg')) ext = 'jpg';
                        else if (src.includes('.webp')) ext = 'webp';
                        else if (src.includes('.gif')) ext = 'gif';
                    }

                    const imgName = `images/image_${currentImgId}.${ext}`;
                    console.log(`[CanvasExporter] Image ${currentImgId} fetched. Size: ${result.size}, adding as: ${imgName}`);
                    // プリミティブなBase64文字列としてJSZipに渡す（クロスコンテキストのサンドボックス死を完全に回避）
                    zip.file(imgName, result.base64, { base64: true });
                    hasContent = true;
                }).catch(e => {
                    console.error(`[CanvasExporter] Failed to fetch image ${currentImgId}:`, src, e);
                })
            );
        });

        // ボタンの表示をローディング状態にする（オプション）
        const btn = document.querySelector('.panel-download-all-btn');
        const originalText = btn ? btn.innerHTML : '';
        if (btn && imgPromises.length > 0) {
            btn.innerHTML = 'Downloading images...';
            btn.disabled = true;
        }

        // 画像のフェッチを待機
        console.log(`[CanvasExporter] Waiting for ${imgPromises.length} images to download...`);
        await Promise.allSettled(imgPromises);
        console.log('[CanvasExporter] Image downloads completed.');

        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }

        if (!hasContent) {
            console.error('[CanvasExporter] hasContent is false. No canvases or images found.');
            alert('エクスポートするコンテンツが見つかりませんでした。');
            return;
        }

        try {
            console.log('[CanvasExporter] Generating ZIP file (type: uint8array, compression: STORE)...');
            // サンドボックス内でのWebWorkerハングを避けるため、圧縮をOFFにし、コールバックを削除
            const uint8array = await zip.generateAsync({
                type: "uint8array",
                compression: "STORE"
            });
            console.log(`[CanvasExporter] ZIP Uint8Array generated. Length: ${uint8array.length}`);
            const content = new Blob([uint8array], { type: "application/zip" });
            console.log(`[CanvasExporter] ZIP blob created. Size: ${content.size}`);
            downloadBlob(content, `canvas_exports_${date}.zip`);
        } catch (e) {
            console.error('[CanvasExporter] Error during ZIP generation:', e);
            alert('ZIPの生成中にエラーが発生しました: ' + e.message);
        }
    }

    // フォールバック用の標準ダウンロード
    function fallbackDownload(url, fileName) {
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
                <div style="display:flex; gap: 8px; align-items: center;">
                    <button class="panel-download-all-btn" title="Download All as ZIP" style="display:flex; align-items:center; gap:4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ZIP
                    </button>
                    <button class="panel-close-btn">&times;</button>
                </div>
            </div>
            <div class="canvas-list"></div>
        `;

        panel.querySelector('.panel-download-all-btn').addEventListener('click', () => {
            downloadAllAsZip();
        });

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

        // 状態の復元 (localStorage)
        const savedPos = localStorage.getItem('canvasExporterFloatingPos');
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                if (pos.right && pos.bottom) {
                    ui.style.right = pos.right;
                    ui.style.bottom = pos.bottom;
                    ui.style.left = 'auto'; // デフォルトのleftを上書き
                    ui.style.top = 'auto';
                }
            } catch (e) {
                console.error("[CanvasExporter] Failed to load floating button position", e);
            }
        }

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
                if (isDragging) {
                    // 移動後に位置を保存
                    const right = ui.style.right;
                    const bottom = ui.style.bottom;
                    localStorage.setItem('canvasExporterFloatingPos', JSON.stringify({ right, bottom }));
                }
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
        observer.disconnect();
        try {
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
        } finally {
            observer.observe(document.body, { childList: true, subtree: true });
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
            display: flex;
            align-items: center;
        }
        .panel-download-all-btn {
            background-color: var(--gpt-surface-primary, #000);
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 0.75rem;
            padding: 4px 8px;
            cursor: pointer;
        }
        .panel-download-all-btn:hover {
            opacity: 0.8;
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
