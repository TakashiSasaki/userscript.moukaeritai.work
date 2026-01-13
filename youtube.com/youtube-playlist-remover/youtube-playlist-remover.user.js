// ==UserScript==
// @name         YouTube Playlist Remover
// @namespace    userscript.moukaeritai.work
// @version      0.1.36
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
    const WAIT_FOR_DISAPPEARANCE_KEY = 'yt_remover_wait_for_disappearance';
    const INIT_DELAY_RANGE_MS = { min: 10000, max: 15000 };

    let isActive = false;
    let refreshIntervalId = null;
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '150px', right: '20px' });
    let waitForDisappearance = GM_getValue(WAIT_FOR_DISAPPEARANCE_KEY, true);
    let removeButton = null;
    let isRemoving = false;
    let cancelRequested = false;
    let filterListenerBound = false;
    const filterInputValues = new WeakMap();

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
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.36';
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

        const phaseDiv = document.createElement('div');
        phaseDiv.id = 'yt-remover-phase';
        phaseDiv.textContent = 'Phase: Idle';
        phaseDiv.style.fontSize = '11px';
        phaseDiv.style.color = '#555';
        contentContainer.appendChild(phaseDiv);

        // --- Candidates Info ---
        const infoDiv = document.createElement('div');
        infoDiv.id = 'yt-remover-candidates-info';
        infoDiv.textContent = 'Removable: None';
        infoDiv.style.fontSize = '12px';
        infoDiv.style.marginBottom = '2px';
        contentContainer.appendChild(infoDiv);

        // --- Options ---
        const optionsDiv = document.createElement('div');
        Object.assign(optionsDiv.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' });
        
        const waitCheckbox = document.createElement('input');
        waitCheckbox.type = 'checkbox';
        waitCheckbox.id = 'yt-remover-wait-checkbox';
        waitCheckbox.checked = waitForDisappearance;
        waitCheckbox.style.cursor = 'pointer';
        waitCheckbox.addEventListener('change', (e) => {
            waitForDisappearance = e.target.checked;
            GM_setValue(WAIT_FOR_DISAPPEARANCE_KEY, waitForDisappearance);
        });

        const waitLabel = document.createElement('label');
        waitLabel.textContent = 'Wait for removal';
        waitLabel.htmlFor = 'yt-remover-wait-checkbox';
        waitLabel.style.cursor = 'pointer';

        optionsDiv.appendChild(waitCheckbox);
        optionsDiv.appendChild(waitLabel);
        contentContainer.appendChild(optionsDiv);

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

    function updatePhase(text, isActive = false) {
        const el = document.getElementById('yt-remover-phase');
        if (el) {
            el.textContent = `Phase: ${text}`;
            el.style.color = isActive ? '#d00' : '#555';
        }
    }

    function updateCandidatesInfo() {
        const el = document.getElementById('yt-remover-candidates-info');
        if (!el) return;

        const count = itemsAboveAndValidSet.size;
        el.textContent = count > 0 ? `Removable: ${count} items` : 'Removable: None';
    }

    function isItemHiddenByFilter(element, rect = null) {
        if (!element || !element.isConnected) return true;
        if (element.hidden || element.getAttribute('aria-hidden') === 'true') return true;
        if (rect) {
            return rect.width === 0 && rect.height === 0;
        }
        return element.offsetParent === null;
    }

    function isPlaylistFilterInput(target) {
        if (!(target instanceof HTMLInputElement)) return false;
        if (target.closest('ytd-masthead')) return false;
        const container = target.closest('ytd-playlist-video-list-renderer, ytd-playlist-header-renderer, ytd-playlist-sidebar-primary-info-renderer, ytd-playlist-search-box-renderer');
        if (!container) return false;
        const type = (target.getAttribute('type') || '').toLowerCase();
        if (type === 'search') return true;
        const label = (target.getAttribute('aria-label') || target.getAttribute('placeholder') || '').toLowerCase();
        const name = (target.getAttribute('name') || target.getAttribute('id') || '').toLowerCase();
        return label.includes('search') || label.includes('filter') || label.includes('検索') || name.includes('search') || name.includes('filter');
    }

    function handleFilterInputEvent(event) {
        if (!isActive || !isPlaylistPage() || isRemoving) return;
        const target = event.target;
        if (!isPlaylistFilterInput(target)) return;
        const value = target.value || '';
        const lastValue = filterInputValues.get(target);
        if (lastValue === value) return;
        filterInputValues.set(target, value);
        itemsAboveAndValidSet.clear();
        updateCandidatesInfo();
    }

    function ensureFilterListeners() {
        if (filterListenerBound) return;
        document.addEventListener('input', handleFilterInputEvent, true);
        document.addEventListener('change', handleFilterInputEvent, true);
        filterListenerBound = true;
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

                if (isItemHiddenByFilter(el, rect)) {
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
            if (isItemHiddenByFilter(item)) {
                itemsAboveAndValidSet.delete(item);
            }
        });
        updateCandidatesInfo();
    }

    // --- Removal Logic ---

    function highlightOutline(element) {
        if (!element) return;
        element.style.outline = '2px solid #d00';
        element.style.outlineOffset = '2px';
    }

    function clearOutline(element) {
        if (!element) return;
        element.style.outline = '';
        element.style.outlineOffset = '';
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
        updatePhase('Opening menu...', true);
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
        while (Date.now() - START < 10000) {
            const popup = document.querySelector('ytd-menu-popup-renderer');
            if (popup && isElementVisible(popup)) {
                updatePhase('Menu open', true);
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
                        updatePhase('Selecting remove', true);
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

                        document.body.click(); // Close menu
                        return true;
                    }
                }
            }
            if (!waitedForMenu) {
                updatePhase('Waiting menu...', true);
            }
            await new Promise(r => setTimeout(r, 500));
        }
        document.body.click();
        return false;
    }

    async function waitForItemDisappearance(item, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const style = window.getComputedStyle(item);
            // Check if removed from DOM or hidden
            if (!item.isConnected || item.style.display === 'none' || item.hidden || style.display === 'none' || style.visibility === 'hidden') {
                await new Promise(r => setTimeout(r, 500));
                return true;
            }
            const rect = item.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                await new Promise(r => setTimeout(r, 500));
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
        updatePhase('Preparing...', true);
        updateRemoveButtonLabel('Removing...', { force: true });

        // Sort targets based on current DOM order and reverse to delete from bottom to top
        // This prevents UI shifting from affecting unprocessed items.
        const allItemsInDom = Array.from(document.querySelectorAll('ytd-playlist-video-renderer'));
        const finalTargets = allItemsInDom
            .filter(el => itemsAboveAndValidSet.has(el) && el.isConnected && !isItemHiddenByFilter(el))
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
            updatePhase('Scrolling...', true);
            item.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
            highlightOutline(item);

            const success = await attemptRemoveVideo(item);
            if (cancelRequested) break;
            
            if (success) {
                if (waitForDisappearance) {
                    updatePhase('Waiting for disappearance...', true);
                    // Wait for the item to actually disappear from the list (removed by YouTube)
                    const disappeared = await waitForItemDisappearance(item, 8000); // Wait up to 8s
                    if (disappeared) {
                        itemsAboveAndValidSet.delete(item);
                    } else {
                        console.warn('[YouTube Playlist Remover] Item removal timed out:', item);
                    }
                } else {
                    // Do not wait for disappear, but wait 1s specifically
                    updatePhase('Cooldown...', true);
                    await new Promise(r => setTimeout(r, 1000));
                    itemsAboveAndValidSet.delete(item);
                }
            }

            if (item.isConnected) {
                clearOutline(item);
            }
            
            if (cancelRequested) break;

            // Small buffer between items
            updatePhase('Cooldown...', true);
            await new Promise(r => setTimeout(r, 500));
        }

        if (cancelRequested) {
            updateStatus('Canceled');
            updatePhase('Canceled');
        } else {
            updateStatus('Idle');
            updatePhase('Idle');
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
        updateStatus('Idle');
        updatePhase('Idle');

        if (!refreshIntervalId) {
            refreshIntervalId = window.setInterval(refreshObserver, 5000);
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
        updateStatus('Idle');
        updatePhase('Idle');
        showPanel();
        setPanelActiveState(false);
    }

    function init() {
        ensureFilterListeners();
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
    }

    function getRandomInitDelayMs() {
        const span = INIT_DELAY_RANGE_MS.max - INIT_DELAY_RANGE_MS.min;
        return INIT_DELAY_RANGE_MS.min + Math.floor(Math.random() * (span + 1));
    }

    setTimeout(init, getRandomInitDelayMs());

})();
