// ==UserScript==
// @name         YouTube Playlist Remover
// @namespace    userscript.moukaeritai.work
// @version      0.1.26
// @description  YouTubeプレイリストで、スクロールして通り過ぎた（Above）動画、またはフィルタリングされた動画を一括削除する機能を提供します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/youtube-playlist-remover.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/youtube-playlist-remover.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1' || location.hostname === 'fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev') {
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
    const PLAYLIST_PATH = '/playlist';
    const PANEL_POS_KEY = 'yt_remover_panel_position';

    let isActive = false;
    let refreshIntervalId = null;
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '150px', right: '20px' });
    let removeButton = null;
    let isRemoving = false;
    let cancelRequested = false;

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
    let observer = null;

    function isPlaylistPage() {
        return location.hostname === 'www.youtube.com' &&
            location.pathname === PLAYLIST_PATH &&
            location.search.length > 1;
    }

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
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.26';
        titleLabel.textContent = `Remover v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' });

        const statusLabel = document.createElement('span');
        statusLabel.id = 'yt-remover-active-indicator';
        statusLabel.textContent = 'Inactive';
        Object.assign(statusLabel.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: '#e0e0e0',
            color: '#666'
        });

        const contentContainer = document.createElement('div');
        contentContainer.id = 'yt-remover-panel-content';
        Object.assign(contentContainer.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(statusLabel);
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

        removeButton = removeBtn;
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
    function ensureObserver() {
        if (observer) return;
        observer = new IntersectionObserver((entries) => {
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
    }


    function refreshObserver() {
        if (!isActive || !isPlaylistPage()) return;
        ensureObserver();
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

    async function handlePotentialDialog() {
        // Wait briefly for a dialog to appear
        const start = Date.now();
        while (Date.now() - start < 1000) {
            // Check for standard confirmation dialogs
            const dialog = document.querySelector('yt-confirm-dialog-renderer, tp-yt-paper-dialog');
            if (dialog) {
                if (dialog.getAttribute('aria-hidden') === 'true' || dialog.style.display === 'none') {
                    await new Promise(r => setTimeout(r, 500));
                    continue;
                }

                // Look for confirm buttons: ID priority first, then text
                const confirmBtn = dialog.querySelector('#confirm-button') ||
                    Array.from(dialog.querySelectorAll('yt-button-renderer, button'))
                        .find(btn => {
                            const text = btn.textContent.trim();
                            return text === '削除' || text === 'Delete' || text === 'Remove';
                        });

                if (confirmBtn) {
                    confirmBtn.focus(); // Shift focus before clicking
                    confirmBtn.click();
                    return true; // Dialog handled
                }
            }
            await new Promise(r => setTimeout(r, 500));
        }
    }

    function highlightOutline(element) {
        if (!element) return;
        element.style.outline = '2px solid #d00';
        element.style.outlineOffset = '2px';
    }

    function updateRemoveButtonLabel(text, { force = false } = {}) {
        if (!removeButton) return;
        if (cancelRequested && !force) return;
        removeButton.textContent = text;
    }

    function isElementVisible(element) {
        if (!element || !element.isConnected) return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
    }

    async function attemptRemoveVideo(videoContainer) {
        // Shift focus to the container itself first
        videoContainer.focus();

        // 1. Identify the menu button (prefer aria-label for stability)
        const menuBtn = videoContainer.querySelector('#menu button[aria-label="操作メニュー"]') ||
            videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger');

        if (!menuBtn) return false;

        if (!videoContainer.isConnected || videoContainer.hidden || videoContainer.style.display === 'none') {
            return false;
        }

        menuBtn.focus(); // Shift focus before clicking
        menuBtn.click();

        const START = Date.now();
        let waitedForMenu = false;
        while (Date.now() - START < 3000) {
            const popup = document.querySelector('ytd-menu-popup-renderer');
            if (popup && isElementVisible(popup)) {
                highlightOutline(popup);
                if (!waitedForMenu) {
                    await new Promise(r => setTimeout(r, 500));
                    waitedForMenu = true;
                }
                // 2. Select all menu items using role="menuitem" for better coverage
                const items = Array.from(popup.querySelectorAll('[role="menuitem"]'));
                for (const item of items) {
                    const text = item.textContent || "";
                    // Check text in multiple languages
                    const isRemove = text.includes('から削除') || text.includes('Remove from');

                    // 3. Or check icon path (trash can)
                    const path = item.querySelector('path');
                    const isTrash = path && TRASH_ICON_PATHS.includes(path.getAttribute('d'));

                    if (isRemove || isTrash) {
                        // 4. Click tp-yt-paper-item inside for better emulation if it exists
                        const target = item.querySelector('tp-yt-paper-item') || item;
                        target.focus(); // Shift focus before clicking
                        target.click();
                        if (!cancelRequested) {
                            const indexVal = videoContainer.querySelector('#index')?.textContent?.trim();
                            if (indexVal) {
                                updateRemoveButtonLabel(`Removing #${indexVal}`);
                            } else {
                                updateRemoveButtonLabel('Removing...');
                            }
                        }

                        await handlePotentialDialog();
                        document.body.click(); // Close menu
                        return true;
                    }
                }
            }
            await new Promise(r => setTimeout(r, 500));
        }
        document.body.click();
        return false;
    }

    async function waitForItemDisappearance(item, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            // Check if removed from DOM or hidden
            if (!item.isConnected || item.style.display === 'none' || item.hidden) {
                return true;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    async function removeRangeItems() {
        if (!isActive || !isPlaylistPage()) return;
        if (isRemoving) {
            cancelRequested = true;
            updateStatus('Stopping...', true);
            updateRemoveButtonLabel('Stopping...', { force: true });
            return;
        }

        const count = itemsAboveAndValidSet.size;
        if (count === 0) {
            updateRemoveButtonLabel('Remove Range', { force: true });
            return;
        }

        isRemoving = true;
        cancelRequested = false;

        updateStatus('Removing...', true);
        updateRemoveButtonLabel('Removing...', { force: true });

        // Sort targets based on current DOM order and reverse to delete from bottom to top
        // This prevents UI shifting from affecting unprocessed items.
        const allItemsInDom = Array.from(document.querySelectorAll('ytd-playlist-video-renderer'));
        const finalTargets = allItemsInDom
            .filter(el => itemsAboveAndValidSet.has(el) && el.isConnected && el.style.display !== 'none')
            .reverse();

        const total = finalTargets.length;

        // Visual Feedback: Highlight target indexes
        finalTargets.forEach(item => {
            const indexEl = item.querySelector('#index');
            if (indexEl) {
                indexEl.style.color = '#d00';
                indexEl.style.fontWeight = 'bold';
            }
        });

        for (let i = 0; i < total; i++) {
            if (cancelRequested) break;
            const item = finalTargets[i];
            const indexVal = item.querySelector('#index')?.textContent?.trim() || '?';
            updateStatus(`Removing #${indexVal} (${i + 1}/${total})...`, true);

            const success = await attemptRemoveVideo(item);
            if (cancelRequested) break;
            if (success) {
                // Wait for the item to actually disappear from the list (removed by YouTube)
                const disappeared = await waitForItemDisappearance(item, 8000); // Wait up to 8s
                if (cancelRequested) break;
                if (disappeared) {
                    itemsAboveAndValidSet.delete(item);
                } else {
                    console.warn('[YouTube Playlist Remover] Item removal timed out:', item);
                    // Do not force remove. If YouTube didn't remove it, something might be wrong.
                    // We continue to the next item, but this item remains in the list.
                }
            }
            // Small buffer between items
            await new Promise(r => setTimeout(r, 500));
        }

        if (cancelRequested) {
            updateStatus('Canceled');
        } else {
            updateStatus('Idle');
        }
        updateRemoveButtonLabel('Remove Range', { force: true });
        cancelRequested = false;
        isRemoving = false;
        updateCandidatesInfo();
    }


    function setPanelActiveState(active) {
        const label = document.getElementById('yt-remover-active-indicator');
        const content = document.getElementById('yt-remover-panel-content');
        const panel = document.getElementById('yt-remover-panel');
        if (!label || !content || !panel) return;

        label.textContent = active ? 'Active' : 'Inactive';
        label.style.backgroundColor = active ? '#e6f4ea' : '#e0e0e0';
        label.style.color = active ? '#188038' : '#666';

        content.style.display = active ? 'flex' : 'none';
        panel.style.opacity = active ? '1' : '0.85';
    }

    function showPanel() {
        const panel = document.getElementById('yt-remover-panel');
        if (panel) panel.style.display = 'flex';
    }

    // --- Init ---
    function startMain() {
        if (isActive || !isPlaylistPage()) return;
        isActive = true;

        createPanel();
        showPanel();
        setPanelActiveState(true);
        itemsAboveAndValidSet.clear();
        refreshObserver();

        if (!refreshIntervalId) {
            refreshIntervalId = window.setInterval(refreshObserver, 2000);
        }

        console.log('[YouTube Playlist Remover] Running...');
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;

        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
            refreshIntervalId = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        itemsAboveAndValidSet.clear();
        isRemoving = false;
        cancelRequested = false;
        updateRemoveButtonLabel('Remove Range', { force: true });
        showPanel();
        setPanelActiveState(false);
    }

    window.addEventListener('yt-navigate-start', stopMain);
    window.addEventListener('yt-navigate-finish', () => {
        if (isPlaylistPage()) {
            startMain();
        } else {
            stopMain();
        }
    });

    if (isPlaylistPage()) {
        startMain();
    }

})();
