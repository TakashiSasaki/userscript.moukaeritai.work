// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.2.63
// @lastModified 2026-04-08
// @description  [Backend] YouTubeプレイリストの動画IDを記録・管理し、状態インジケーター（NEW/SAVED）を表示します。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @connect      gist.githubusercontent.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     youtubeCommonCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.css
// @resource     ytSaverTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver/youtube-playlist-saver.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver/youtube-playlist-saver.user.js
// ==/UserScript==

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition */
(function () {
    'use strict';

    const commonCss = GM_getResourceText('youtubeCommonCSS');
    if (commonCss) {
        GM_addStyle(commonCss);
    }
const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    if (location.hostname === 'userscript.moukaeritai.work') {
        return;
    }

    const PLAYLIST_PATH = '/playlist';
    const DATA_KEY = 'yt_playlist_data';
    const DATA_VERSION = 2;
    const INIT_DELAY_RANGE_MS = { min: 10000, max: 15000 };
    // Helper to create trash icon
    const TRASH_ICON_PATHS = [
        "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
        "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z",
        "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z"
    ];

    function createIcon(pathData, color = 'grey') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.style.fill = color;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        return svg;
    }

    function isPlaylistPage() {
        return location.hostname === 'www.youtube.com' &&
            location.pathname === PLAYLIST_PATH &&
            location.search.length > 1;
    }

    const PANEL_POS_KEY = 'yt_saver_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_saver_is_minimized';
    let isManuallyMinimized = GM_getValue(MINIMIZED_STATE_KEY, false);
    let isActive = false;
    let scanIntervalId = null;
    let panel = null;

    const panelElements = {
        totalSaved: null,
        savedVisible: null,
        newVisible: null,
        storageStatus: null
    };



    function createPanel() {
        if (document.getElementById('yt-saver-panel')) return;

        const templateStr = GM_getResourceText('ytSaverTemplate');
        if (!templateStr) {
            console.error('[YouTube Playlist Saver] Failed to load template.html');
            return;
        }

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.2.63';
        const html = templateStr.replace('{{VERSION}}', version);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        panel = wrapper.firstElementChild;

        yusRestorePosition(panel, PANEL_POS_KEY, { bottom: '260px', right: '20px' });
        const headerRow = panel.querySelector('#yt-saver-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-saver-title');
        titleLabel.addEventListener('dblclick', (e) => {
            isManuallyMinimized = !isManuallyMinimized;
            GM_setValue(MINIMIZED_STATE_KEY, isManuallyMinimized);
            updatePanelVisibility();
            e.stopPropagation();
        });

        panelElements.totalSaved = panel.querySelector('#yt-saver-stats-total');
        panelElements.savedVisible = panel.querySelector('#yt-saver-stats-saved');
        panelElements.newVisible = panel.querySelector('#yt-saver-stats-new');
        panelElements.storageStatus = panel.querySelector('#yt-saver-stats-storage');

        panel.querySelector('#yt-saver-export-btn').addEventListener('click', exportDataToFile);
        panel.querySelector('#yt-saver-copy-btn').addEventListener('click', onExportToClipboardClick);

        document.body.appendChild(panel);
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        });
    }


    function updatePanelVisibility() {
        const content = document.getElementById('yt-saver-panel-content');
        const panel = document.getElementById('yt-saver-panel');
        if (!content || !panel) return;

        const isVisible = isActive && !isManuallyMinimized;
        content.style.display = isVisible ? 'flex' : 'none';
        
        if (isVisible) {
            panel.classList.add('yus-active');
        } else {
            panel.classList.remove('yus-active');
        }
    }

    function updatePanelStats({
        playlistId,
        totalSaved,
        savedVisible,
        newVisible
    }) {
        if (!panelElements.totalSaved) return;

        panelElements.totalSaved.textContent = Number.isFinite(totalSaved) ? String(totalSaved) : '-';
        panelElements.savedVisible.textContent = Number.isFinite(savedVisible) ? String(savedVisible) : '-';
        panelElements.newVisible.textContent = Number.isFinite(newVisible) ? String(newVisible) : '-';

        if (!panelElements.storageStatus) return;

        let storageText = 'Unknown';
        let storageColor = '#999';

        if (playlistId) {
            if (Number.isFinite(totalSaved) && totalSaved > 0) {
                if (pendingSaveTimeout) {
                    storageText = 'Saving...';
                    storageColor = '#d9822b';
                } else {
                    storageText = 'Saved';
                    storageColor = '#2ba640';
                }
            } else {
                storageText = 'Not saved';
                storageColor = '#999';
            }
        }

        panelElements.storageStatus.textContent = storageText;
        panelElements.storageStatus.style.color = storageColor;
    }

    function showPanel() {
        const panel = document.getElementById('yt-saver-panel');
        if (panel) panel.style.display = 'flex';
    }

    // --- Core Data Storage ---
    let cachedStorage = null;
    let pendingSaveTimeout = null;

    function loadStorage() {
        if (cachedStorage) return cachedStorage.playlists;

        let rawData = GM_getValue(DATA_KEY, {});

        // Migration logic
        if (rawData.version === undefined) {
            const newPlaylists = {};
            for (const [plId, videos] of Object.entries(rawData)) {
                if (Array.isArray(videos)) {
                    newPlaylists[plId] = {};
                    videos.forEach(vid => { newPlaylists[plId][vid] = { title: null, channel: null, addedAt: null }; });
                }
            }
            cachedStorage = { version: DATA_VERSION, playlists: newPlaylists };
            GM_setValue(DATA_KEY, cachedStorage);
        } else if (rawData.version === 1) {
            const newPlaylists = {};
            for (const [plId, videos] of Object.entries(rawData.playlists)) {
                if (Array.isArray(videos)) {
                    newPlaylists[plId] = {};
                    videos.forEach(vid => { newPlaylists[plId][vid] = { title: null, channel: null, addedAt: null }; });
                }
            }
            cachedStorage = { version: DATA_VERSION, playlists: newPlaylists };
            GM_setValue(DATA_KEY, cachedStorage);
        } else {
            cachedStorage = rawData;
        }
        return cachedStorage.playlists;
    }

    function requestSave() {
        if (pendingSaveTimeout) clearTimeout(pendingSaveTimeout);
        pendingSaveTimeout = setTimeout(() => {
            if (cachedStorage) {
                GM_setValue(DATA_KEY, cachedStorage);
                console.log('[YouTube Playlist Saver] Batch save completed (v' + cachedStorage.version + ').');
            }
            pendingSaveTimeout = null;
        }, 2000);
    }

    // --- DOM Scanning & Indicators (Restored) ---

    function getPlaylistId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('list');
    }

    function extractVideoId(element) {
        const anchor = element.querySelector('a#video-title') || element.querySelector('a#thumbnail');
        if (anchor) {
            const href = anchor.getAttribute('href');
            const match = href && href.match(/[?&]v=([^&]+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    async function attemptRemoveVideo(videoContainer) {
        const menuBtn = videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger');
        if (!menuBtn) return false;

        menuBtn.click();

        // Polling for popup
        const START = Date.now();
        while (Date.now() - START < 5000) {
            const popup = document.querySelector('ytd-menu-popup-renderer');
            if (popup) {
                const items = Array.from(popup.querySelectorAll('ytd-menu-service-item-renderer'));
                for (const item of items) {
                    const text = item.textContent || "";
                    if (text.includes('Remove from') || text.includes('から削除')) {
                        item.click();
                        document.body.click();
                        return true;
                    }
                    const path = item.querySelector('path');
                    if (path && TRASH_ICON_PATHS.includes(path.getAttribute('d'))) {
                        item.click();
                        document.body.click();
                        return true;
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
        document.body.click();
        return false;
    }

    function renderIndicator(element, isNew) {
        // Find metadata bar
        let bar = element.querySelector('#engagement-bar') ||
            element.querySelector('.ytd-video-meta-block') ||
            element.querySelector('#meta');

        if (!bar) return;

        // Clean old
        const oldInd = bar.querySelector('.yt-saver-indicator');
        if (oldInd) oldInd.remove();
        const oldBtn = bar.querySelector('.yt-saver-remove-btn');
        if (oldBtn) oldBtn.remove();

        // Indicator
        const indicator = document.createElement('span');
        indicator.className = 'yt-saver-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';
        Object.assign(indicator.style, {
            fontSize: '11px', fontWeight: 'bold', marginRight: '8px',
            color: isNew ? '#3ea6ff' : '#2ba640', verticalAlign: 'middle' // Blue for NEW, Green for SAVED
        });

        // Trash Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'yt-saver-remove-btn';
        removeBtn.title = 'Remove from playlist';
        Object.assign(removeBtn.style, {
            background: 'none', border: 'none', cursor: 'pointer', padding: '0',
            marginLeft: '8px', verticalAlign: 'middle', opacity: '0.7'
        });
        removeBtn.appendChild(createIcon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', '#606060'));

        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Delete this video from playlist?')) return;
            const success = await attemptRemoveVideo(element);
            if (success) {
                element.style.opacity = '0.3';
                element.style.pointerEvents = 'none';
            } else {
                alert('Remove failed. Menu structure might have changed.');
            }
        });

        bar.prepend(removeBtn);
        bar.prepend(indicator);
    }

    // Set of IDs fully processed by UI (indicator added)
    const processedSet = new Set();
    // Cache current session "known" IDs to determine [NEW] vs [SAVED]
    let currentSessionKnownIds = new Set();
    let isSessionInitialized = false;

    function scanAndRender() {
        if (!isActive || !isPlaylistPage()) return;
        const playlistId = getPlaylistId();
        if (!playlistId) {
            updatePanelStats({ playlistId: null, totalSaved: NaN, savedVisible: NaN, newVisible: NaN });
            return;
        }

        const data = loadStorage();

        // Init Session Data once per page load/nav
        if (!isSessionInitialized) {
            if (data[playlistId]) {
                currentSessionKnownIds = new Set(Object.keys(data[playlistId]));
            } else {
                currentSessionKnownIds = new Set(); // New playlist
            }
            isSessionInitialized = true;
        }

        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        let savedVisibleCount = 0;
        let newVisibleCount = 0;
        items.forEach(item => {
            const vid = extractVideoId(item);
            if (!vid) return;

            // Optimization: Avoid window.getComputedStyle in loop to prevent forced reflow
            const isHidden = item.hidden || item.style.display === 'none';
            if (!isHidden) {
                if (currentSessionKnownIds.has(vid)) savedVisibleCount++;
                else newVisibleCount++;
            }

            if (processedSet.has(item)) return;

            // Determine Status based on SESSION start time
            // If it was in DB at start => SAVED
            // If it was NOT in DB at start => NEW (even if we save it now)
            const wasKnown = currentSessionKnownIds.has(vid);
            const isNew = !wasKnown;

            // Save Key Data
            const title = item.querySelector('#video-title')?.textContent?.trim() || null;
            const channel = item.querySelector('.ytd-channel-name a')?.textContent?.trim() || null;
            SaverAPI.save(playlistId, vid, title, channel);

            renderIndicator(item, isNew);
            processedSet.add(item);
        });

        const totalSavedCount = Object.keys(data[playlistId] || {}).length;
        updatePanelStats({
            playlistId,
            totalSaved: totalSavedCount,
            savedVisible: savedVisibleCount,
            newVisible: newVisibleCount
        });
    }

    // --- Main Logic ---

    function resetSessionState() {
        processedSet.clear();
        isSessionInitialized = false; // Reset session knowledge on nav
        currentSessionKnownIds.clear();
    }

    function startMain() {
        if (isActive || !isPlaylistPage()) return;
        isActive = true;

        createPanel();
        showPanel();
        updatePanelVisibility();
        resetSessionState();
        scanAndRender();

        if (!scanIntervalId) {
            scanIntervalId = window.setInterval(scanAndRender, 5000); // 5s polling
        }

        console.log('[YouTube Playlist Saver] Backend & Status Service Running...');
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;

        if (scanIntervalId) {
            clearInterval(scanIntervalId);
            scanIntervalId = null;
        }

        resetSessionState();
        updatePanelVisibility();
        showPanel();
    }

    // Navigation Handling
    function init() {
        window.addEventListener('yt-navigate-start', stopMain);
        window.addEventListener('yt-navigate-finish', () => {
            if (isPlaylistPage()) {
                startMain();
            } else {
                stopMain();
            }
        });

        // Start Logic
        if (isPlaylistPage()) {
            startMain();
        }
    }

    function getRandomInitDelayMs() {
        const span = INIT_DELAY_RANGE_MS.max - INIT_DELAY_RANGE_MS.min;
        return INIT_DELAY_RANGE_MS.min + Math.floor(Math.random() * (span + 1));
    }

    // --- Public API Integration ---
    const SaverAPI = {
        save: function (playlistId, videoId, title, channel) {
            const data = loadStorage();
            if (!data[playlistId]) data[playlistId] = {};
            const playlistMap = data[playlistId];
            const existing = playlistMap[videoId];

            if (!existing || (title && existing.title === null)) {
                playlistMap[videoId] = {
                    title: title || (existing ? existing.title : null),
                    channel: channel || (existing ? existing.channel : null),
                    addedAt: existing ? existing.addedAt : Date.now()
                };
                requestSave();
                return !existing;
            }
            return false;
        },
        isSaved: function (playlistId, videoId) {
            const data = loadStorage();
            if (!data[playlistId]) return false;
            return !!data[playlistId][videoId];
        },
        getAllKnownIds: function (playlistId) {
            const data = loadStorage();
            return Object.keys(data[playlistId] || {});
        },
        getStorageSnapshot: function () {
            loadStorage();
            return cachedStorage;
        }
    };
    window.YouTubePlaylistSaver = SaverAPI;
    window.dispatchEvent(new CustomEvent('YouTubePlaylistSaverReady', { detail: SaverAPI }));

    // --- Import / Export Logic (Kept here) ---
    // (Existing Import/Export functions retained same as before...)

    function mergeImportedData(importedData) {
        if (!importedData) { alert('Import failed: No data.'); return; }
        // ... (Same Logic)
        let sourcePlaylists = {};
        if (importedData.playlists) sourcePlaylists = importedData.playlists;
        else if (Object.keys(importedData).length > 0) sourcePlaylists = importedData;

        const localPlaylists = loadStorage();
        let addedCount = 0;
        let updatedCount = 0;

        for (const [plId, content] of Object.entries(sourcePlaylists)) {
            if (!localPlaylists[plId]) localPlaylists[plId] = {};
            let entries = [];
            if (Array.isArray(content)) entries = content.map(vid => [vid, null]);
            else entries = Object.entries(content);

            for (const [vid, remoteMeta] of entries) {
                const existing = localPlaylists[plId][vid];
                if (!existing) {
                    localPlaylists[plId][vid] = remoteMeta || { title: null, channel: null, addedAt: null };
                    addedCount++;
                } else if (remoteMeta) {
                    // Update meta logic...
                    let changed = false;
                    if (existing.title === null && remoteMeta.title) { existing.title = remoteMeta.title; changed = true; }
                    /* ... */
                    if (changed) updatedCount++;
                }
            }
        }
        if (addedCount > 0 || updatedCount > 0) {
            requestSave();
            alert(`Import successful!\nAdded: ${addedCount}\nUpdated: ${updatedCount}`);
            window.dispatchEvent(new CustomEvent('YouTubePlaylistSaverDataChanged'));
        } else {
            alert('No new data.');
        }
    }

    function importDataFromUrl(url) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    try { mergeImportedData(JSON.parse(response.responseText)); }
                    catch (e) { alert('JSON Parse Error: ' + e.message); }
                } else alert(`Download failed: ${response.status}`);
            }
        });
    }

    function normalizeGistUrl(url) {
        const r = /^(https:\/\/gist\.githubusercontent\.com\/[^\/]+\/[^\/]+\/raw\/)[0-9a-f]{40}\/(.+)$/i;
        return url.replace(r, '$1$2');
    }

    function exportDataToFile() {
        loadStorage();
        if (!cachedStorage) { alert('No data.'); return; }
        const timestamp = getExportTimestamp(new Date());
        const b = new Blob([JSON.stringify(cachedStorage, null, 2)], { type: "application/json" });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = u;
        a.download = `youtube_playlist_saver_data_${timestamp}.json`;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);
    }

    function getExportTimestamp(date) {
        const pad = (value) => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    function importDataFromFile() {
        const i = document.createElement('input');
        i.type = 'file'; i.accept = '.json'; i.style.display = 'none';
        i.onchange = (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = (ev) => { try { mergeImportedData(JSON.parse(ev.target.result)); } catch (E) { alert(E); } };
            r.readAsText(f);
        };
        document.body.appendChild(i); i.click();
    }

    function onImportMenuClick() {
        const u = prompt("Import URL:", GM_getValue('yt_last_import_url', ''));
        if (u && u.startsWith('http')) {
            const c = normalizeGistUrl(u.trim());
            GM_setValue('yt_last_import_url', c);
            importDataFromUrl(c);
        }
    }

    function onExportToClipboardClick() {
        loadStorage();
        if (!cachedStorage) { alert('No data.'); return; }
        GM_setClipboard(JSON.stringify(cachedStorage, null, 2), 'text');
        alert('Copied!');
    }

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Import Data from URL", onImportMenuClick);
        GM_registerMenuCommand("Import Data from File", importDataFromFile);
        GM_registerMenuCommand("Copy Data to Clipboard", onExportToClipboardClick);
        GM_registerMenuCommand("Export Data to File", exportDataToFile);
    }

    setTimeout(init, getRandomInitDelayMs());

})();
