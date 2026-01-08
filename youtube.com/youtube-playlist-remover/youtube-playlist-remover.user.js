// ==UserScript==
// @name         YouTube Playlist Remover
// @namespace    userscript.moukaeritai.work
// @version      0.1.5
// @description  YouTubeプレイリストで、スクロールして通り過ぎた（Above）動画、またはフィルタリングされた動画を一括削除する機能を提供します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/youtube-playlist-remover.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/youtube-playlist-remover.user.js
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

    // --- Configuration ---
    const PANEL_POS_KEY = 'yt_remover_panel_position';
    const PANEL_MIN_KEY = 'yt_remover_panel_minimized';

    let isMinimized = GM_getValue(PANEL_MIN_KEY, false);
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '150px', right: '20px' });

    // --- Constants ---
    const TRASH_ICON_PATHS = [
        "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
        "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z",
        "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z"
    ];

    // --- State ---
    // Items that are "Above" the viewport (scanned) AND currently Visible (not filtered out).
    // These are the targets for the "Remove Above" action.
    const itemsAboveAndValidSet = new Set();

    // --- UI Creation ---
    function createPanel() {
        if (document.getElementById('yt-remover-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-remover-panel';

        // Initial Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#fff0f0', // Slightly reddish to distinguish
            border: '1px solid #d00',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            width: '200px',
            color: '#333',
            fontFamily: 'Roboto, Arial, sans-serif'
        });

        // Restore Position
        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        // --- Header (Draggable) ---
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
            if (e.target.tagName === 'BUTTON') return;
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
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.2';
        titleLabel.textContent = `Remover v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' });

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        Object.assign(minimizeBtn.style, {
            cursor: 'pointer', background: 'none', border: 'none',
            fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666'
        });

        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

        // Minimize Logic
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

        // --- Status Info ---
        const statusDiv = document.createElement('div');
        statusDiv.id = 'yt-remover-status';
        statusDiv.textContent = 'Status: Idle';
        statusDiv.style.fontSize = '12px';
        contentContainer.appendChild(statusDiv);

        // --- Candidates Info ---
        const infoDiv = document.createElement('div');
        infoDiv.id = 'yt-remover-candidates-info';
        infoDiv.textContent = 'Removable: None';
        infoDiv.style.fontSize = '12px';
        infoDiv.style.marginBottom = '2px';
        contentContainer.appendChild(infoDiv);

        // --- Action Button ---
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove Range';
        Object.assign(removeBtn.style, {
            padding: '4px 8px', fontSize: '11px', backgroundColor: '#d00',
            color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontWeight: 'bold'
        });

        removeBtn.addEventListener('click', removeRangeItems);

        contentContainer.appendChild(removeBtn);

        document.body.appendChild(panel);
    }

    // --- Updates ---

    function updateStatus(text, isActive = false) {
        const el = document.getElementById('yt-remover-status');
        if (el) {
            el.textContent = `Status: ${text}`;
            el.style.color = isActive ? '#d00' : '#333';
        }
    }

    function updateCandidatesInfo() {
        const el = document.getElementById('yt-remover-candidates-info');
        if (!el) return;

        const count = itemsAboveAndValidSet.size;
        if (count > 0) {
            // Find max index for display
            let maxIndex = 0;
            itemsAboveAndValidSet.forEach(item => {
                const indexEl = item.querySelector('#index');
                if (indexEl) {
                    const idx = parseInt(indexEl.textContent.trim(), 10);
                    if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
                }
            });
            el.textContent = `Removable: Top ${maxIndex} (${count} items)`;
        } else {
            el.textContent = 'Removable: None';
        }
    }

    // --- Observer Logic ---
    // We only want to delete items that are:
    // 1. Above the viewport.
    // 2. Visible (display != none). If Filter script hides them, we must NOT delete them.
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const rect = entry.boundingClientRect;
            const el = entry.target;

            // Check if element is effectively visible (not filtered out)
            const isVisible = (el.style.display !== 'none');

            if (!isVisible) {
                // If hidden, remove from set immediately to be safe
                itemsAboveAndValidSet.delete(el);
                return;
            }

            if (rect.bottom < 180 || entry.isIntersecting) {
                // "Range" = Above viewport OR Currently Visible in viewport
                itemsAboveAndValidSet.add(el);
            } else {
                // Strictly below viewport (not yet seen/scanned potentially)
                // Note: This logic assumes we scroll down. 
                itemsAboveAndValidSet.delete(el);
            }
        });
        updateCandidatesInfo();
    }, { root: null, threshold: 0 });


    function refreshObserver() {
        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        items.forEach(item => {
            observer.observe(item);
        });
        // Also clean up set if items were removed from DOM or became hidden
        itemsAboveAndValidSet.forEach(item => {
            if (!item.isConnected || item.style.display === 'none') {
                itemsAboveAndValidSet.delete(item);
            }
        });
        updateCandidatesInfo();
    }

    // --- Removal Logic ---

    async function attemptRemoveVideo(videoContainer) {
        const menuBtn = videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger');
        if (!menuBtn) return false;
        menuBtn.click();

        const START = Date.now();
        while (Date.now() - START < 5000) {
            const popup = document.querySelector('ytd-menu-popup-renderer');
            if (popup) {
                const items = Array.from(popup.querySelectorAll('ytd-menu-service-item-renderer'));
                for (const item of items) {
                    const text = item.textContent || "";
                    if (text.includes('Remove from') || text.includes('から削除')) {
                        item.click(); document.body.click(); return true;
                    }
                    const path = item.querySelector('path');
                    if (path && TRASH_ICON_PATHS.includes(path.getAttribute('d'))) {
                        item.click(); document.body.click(); return true;
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
        document.body.click(); return false;
    }

    async function removeRangeItems() {
        const count = itemsAboveAndValidSet.size;
        if (count === 0) {
            return;
        }



        updateStatus('Removing...', true);
        const candidates = Array.from(itemsAboveAndValidSet);

        // Double check validity before action
        const finalTargets = candidates.filter(el => el.isConnected && el.style.display !== 'none');

        for (const item of finalTargets) {
            const success = await attemptRemoveVideo(item);
            if (success) {
                itemsAboveAndValidSet.delete(item);
                item.remove(); // Remove from DOM immediately
            }
            await new Promise(r => setTimeout(r, 500));
        }

        updateStatus('Idle');
        updateCandidatesInfo();
    }


    // --- Init ---
    function run() {
        createPanel();
        setInterval(refreshObserver, 2000); // Periodically refresh to catch new items and visibility changes
        console.log('[YouTube Playlist Remover] Running...');
    }

    window.addEventListener('yt-navigate-finish', () => {
        itemsAboveAndValidSet.clear();
        setTimeout(run, 1000);
    });

    run();

})();
