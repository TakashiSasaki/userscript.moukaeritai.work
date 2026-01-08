// ==UserScript==
// @name         YouTube Playlist Lite
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  YouTubeプレイリストでサムネイルを非表示にして軽量化するためのツールです。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Handle installation check on the portal site
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

    // --- Configuration ---
    const PANEL_POS_KEY = 'yt_lite_panel_position';
    const PANEL_MIN_KEY = 'yt_lite_panel_minimized';
    const HIDE_THUMB_KEY = 'yt_lite_hide_thumbnails';

    let isMinimized = GM_getValue(PANEL_MIN_KEY, false);
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '260px', right: '20px' });
    let isHideThumbnails = GM_getValue(HIDE_THUMB_KEY, false);

    // --- Style Injection ---
    let styleElement = null;

    function applySettings() {
        if (isHideThumbnails) {
            if (!styleElement) {
                const css = `
                    ytd-playlist-video-renderer ytd-thumbnail {
                        display: none !important;
                    }
                `;
                styleElement = document.createElement('style');
                styleElement.textContent = css;
                document.head.appendChild(styleElement);
            }
        } else {
            if (styleElement) {
                styleElement.remove();
                styleElement = null;
            }
        }
    }

    // --- UI Creation ---
    function createPanel() {
        if (document.getElementById('yt-lite-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-lite-panel';

        // Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#f0f8ff', // AliceBlue
            border: '1px solid #00f',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            width: '180px',
            color: '#333',
            fontFamily: 'Roboto, Arial, sans-serif'
        });

        // Restore Position
        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        // Header
        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
            cursor: 'move'
        });

        // Drag Logic
        let isDragging = false;
        let dragStartX, dragStartY;
        let initialLeft, initialTop;

        headerRow.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
            panel.style.left = `${initialLeft}px`;
            panel.style.top = `${initialTop}px`;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            panel.style.left = `${initialLeft + dx}px`;
            panel.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panelPos = { top: panel.style.top, left: panel.style.left, bottom: '', right: '' };
                GM_setValue(PANEL_POS_KEY, panelPos);
            }
        });

        const titleLabel = document.createElement('span');
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.0';
        titleLabel.textContent = `Lite v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' });

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        Object.assign(minimizeBtn.style, {
            cursor: 'pointer', background: 'none', border: 'none',
            fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666'
        });

        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

        const updatePanelMinState = (min) => {
            contentContainer.style.display = min ? 'none' : 'flex';
            minimizeBtn.textContent = min ? '+' : '−';
            isMinimized = min;
            GM_setValue(PANEL_MIN_KEY, min);
        };
        minimizeBtn.addEventListener('click', () => updatePanelMinState(!isMinimized));
        updatePanelMinState(isMinimized);

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(minimizeBtn);
        panel.appendChild(headerRow);
        panel.appendChild(contentContainer);

        // Checkbox for Hide Thumbnails
        const checkboxContainer = document.createElement('div');
        Object.assign(checkboxContainer.style, { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'yt-lite-hide-thumb';
        checkbox.checked = isHideThumbnails;

        checkbox.addEventListener('change', (e) => {
            isHideThumbnails = e.target.checked;
            GM_setValue(HIDE_THUMB_KEY, isHideThumbnails);
            applySettings();
        });

        const label = document.createElement('label');
        label.htmlFor = 'yt-lite-hide-thumb';
        label.textContent = 'Hide Thumbnails';
        label.style.cursor = 'pointer';

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        contentContainer.appendChild(checkboxContainer);

        document.body.appendChild(panel);
    }

    // Run
    createPanel();
    applySettings();
    console.log('[YouTube Playlist Lite] Running...');

})();
