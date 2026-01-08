// ==UserScript==
// @name         YouTube Playlist Lite
// @namespace    userscript.moukaeritai.work
// @version      0.1.1
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
    const FORCE_REMOVE_KEY = 'yt_lite_force_remove';

    let isMinimized = GM_getValue(PANEL_MIN_KEY, false);
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '260px', right: '20px' });
    let isHideThumbnails = GM_getValue(HIDE_THUMB_KEY, false);
    let isForceRemove = GM_getValue(FORCE_REMOVE_KEY, false);

    // --- Core Logic ---
    let styleElement = null;

    function applySettings() {
        if (isHideThumbnails) {
            if (!styleElement) {
                const css = `ytd-playlist-video-renderer ytd-thumbnail { display: none !important; }`;
                styleElement = document.createElement('style');
                styleElement.textContent = css;
                document.head.appendChild(styleElement);
            }
        } else if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }

        if (isForceRemove) {
            startObserver();
            clearExistingThumbnails();
        } else {
            stopObserver();
        }
    }

    function clearExistingThumbnails() {
        const thumbs = document.querySelectorAll('ytd-playlist-video-renderer ytd-thumbnail');
        thumbs.forEach(el => el.remove());
        if (thumbs.length > 0) {
            console.log(`[YouTube Playlist Lite] Removed ${thumbs.length} thumbnails.`);
        }
    }

    let observer = null;
    function startObserver() {
        if (observer) return;
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const target = node.matches('ytd-thumbnail') ? node : node.querySelector('ytd-thumbnail');
                        if (target && target.closest('ytd-playlist-video-renderer')) {
                            target.remove();
                        }
                    }
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
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
            backgroundColor: '#f0f8ff',
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

        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', cursor: 'move' });

        let isDragging = false, dragStartX, dragStartY, initialLeft, initialTop;
        headerRow.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
            isDragging = true;
            dragStartX = e.clientX; dragStartY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialLeft = rect.left; initialTop = rect.top;
            panel.style.bottom = 'auto'; panel.style.right = 'auto';
            panel.style.left = `${initialLeft}px`; panel.style.top = `${initialTop}px`;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
            panel.style.top = `${initialTop + (e.clientY - dragStartY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panelPos = { top: panel.style.top, left: panel.style.left, bottom: '', right: '' };
                GM_setValue(PANEL_POS_KEY, panelPos);
            }
        });

        const titleLabel = document.createElement('span');
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.1';
        titleLabel.textContent = `Lite v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '11px', pointerEvents: 'none' });

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = isMinimized ? '+' : '−';
        Object.assign(minimizeBtn.style, { cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666' });

        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, { display: isMinimized ? 'none' : 'flex', flexDirection: 'column', gap: '8px' });

        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            contentContainer.style.display = isMinimized ? 'none' : 'flex';
            minimizeBtn.textContent = isMinimized ? '+' : '−';
            GM_setValue(PANEL_MIN_KEY, isMinimized);
        });

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(minimizeBtn);
        panel.appendChild(headerRow);
        panel.appendChild(contentContainer);

        // Options
        const createCheckbox = (id, text, checked, onChange) => {
            const container = document.createElement('div');
            Object.assign(container.style, { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' });
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.id = id; cb.checked = checked;
            cb.addEventListener('change', onChange);
            const lbl = document.createElement('label');
            lbl.htmlFor = id; lbl.textContent = text; lbl.style.cursor = 'pointer';
            container.appendChild(cb);
            container.appendChild(lbl);
            return container;
        };

        contentContainer.appendChild(createCheckbox('yt-lite-hide-thumb', 'Hide (CSS)', isHideThumbnails, (e) => {
            isHideThumbnails = e.target.checked;
            GM_setValue(HIDE_THUMB_KEY, isHideThumbnails);
            applySettings();
        }));

        contentContainer.appendChild(createCheckbox('yt-lite-force-remove', 'Auto Remove (DOM)', isForceRemove, (e) => {
            isForceRemove = e.target.checked;
            GM_setValue(FORCE_REMOVE_KEY, isForceRemove);
            applySettings();
        }));

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Thumbs Now';
        Object.assign(clearBtn.style, {
            padding: '4px', fontSize: '10px', backgroundColor: '#eef', border: '1px solid #99f', borderRadius: '4px', cursor: 'pointer'
        });
        clearBtn.addEventListener('click', clearExistingThumbnails);
        contentContainer.appendChild(clearBtn);

        document.body.appendChild(panel);
    }

    createPanel();
    applySettings();
    console.log('[YouTube Playlist Lite] Running...');
})();
