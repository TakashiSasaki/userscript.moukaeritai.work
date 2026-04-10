// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.2.76
// @lastModified 2026-04-10
// @description  [Backend] YouTubeプレイリストの動画IDを記録・管理し、状態インジケーター（NEW/SAVED）を表示します。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        https://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
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

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusParseHTML, yusInitApp, yusIsPlaylistPage */
(function () {
    'use strict';

    const commonCss = GM_getResourceText('youtubeCommonCSS');
    if (commonCss) {
        GM_addStyle(commonCss);
    }
    GM_addStyle(`
        .yus-panel,
        .yus-panel.yus-active {
            --yus-panel-opacity: 1 !important;
            background-color: rgb(var(--yus-panel-bg-rgb)) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
    `);
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

    const DATA_KEY = 'yt_playlist_data';
    const DATA_VERSION = 2;
    const PANEL_POS_KEY = 'yt_saver_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_saver_is_minimized';
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

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.2.76';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);

        yusRestorePosition(panel, PANEL_POS_KEY, { bottom: '260px', right: '20px' });
        const headerRow = panel.querySelector('#yt-saver-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-saver-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        panelElements.totalSaved = panel.querySelector('#yt-saver-stats-total');
        panelElements.savedVisible = panel.querySelector('#yt-saver-stats-saved');
        panelElements.newVisible = panel.querySelector('#yt-saver-stats-new');
        panelElements.storageStatus = panel.querySelector('#yt-saver-stats-storage');

        panel.querySelector('#yt-saver-export-btn').addEventListener('click', exportDataToFile);
        panel.querySelector('#yt-saver-copy-btn').addEventListener('click', onExportToClipboardClick);

        document.body.appendChild(panel);
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
    }

    let panelResizeHandler = null;
    function attachPanelResizeHandler() {
        if (panelResizeHandler || !panel) return;
        panelResizeHandler = () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        };
        window.addEventListener('resize', panelResizeHandler);
    }

    function detachPanelResizeHandler() {
        if (!panelResizeHandler) return;
        window.removeEventListener('resize', panelResizeHandler);
        panelResizeHandler = null;
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

    // --- Core Data Storage ---
    let cachedStorage = null;
    let pendingQueue = {}; // { playlistId: { videoId: meta, ... } }
    let pendingSaveTimeout = null;

    function loadStorage(forceRefresh = false) {
        if (cachedStorage && !forceRefresh) return cachedStorage.playlists;

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
            const currentQueue = pendingQueue;
            pendingQueue = {};
            pendingSaveTimeout = null;

            // JIT (Just-In-Time) Merge to prevent Lost Update between tabs
            const latest = GM_getValue(DATA_KEY, { version: DATA_VERSION, playlists: {} });
            if (!latest.playlists) latest.playlists = {};

            let changed = false;
            for (const [plId, videos] of Object.entries(currentQueue)) {
                if (!latest.playlists[plId]) latest.playlists[plId] = {};
                for (const [vid, meta] of Object.entries(videos)) {
                    if (!latest.playlists[plId][vid]) {
                        latest.playlists[plId][vid] = meta;
                        changed = true;
                    }
                }
            }

            if (changed) {
                GM_setValue(DATA_KEY, latest);
                cachedStorage = latest; // Sync local cache
                console.log('[YouTube Playlist Saver] Concurrency-safe batch save completed.');
                window.dispatchEvent(new CustomEvent('YouTubePlaylistSaverDataChanged'));
            }
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

    function renderIndicator(element, isNew) {
        // Find metadata bar
        let bar = element.querySelector('#engagement-bar') ||
            element.querySelector('.ytd-video-meta-block') ||
            element.querySelector('#meta');

        if (!bar) return;

        // Clean old
        const oldInd = bar.querySelector('.yt-saver-indicator');
        if (oldInd) oldInd.remove();

        // Indicator
        const indicator = document.createElement('span');
        indicator.className = 'yt-saver-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';
        Object.assign(indicator.style, {
            fontSize: '11px', fontWeight: 'bold', marginRight: '8px',
            color: isNew ? '#3ea6ff' : '#2ba640', verticalAlign: 'middle' // Blue for NEW, Green for SAVED
        });

        bar.prepend(indicator);
    }

    // Set of IDs fully processed by UI (indicator added)
    let processedSet = new WeakSet();
    // Cache current session "known" IDs to determine [NEW] vs [SAVED]
    let currentSessionKnownIds = new Set();
    let isSessionInitialized = false;

    function scanAndRender() {
        if (!isActive || !yusIsPlaylistPage()) return;
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
        processedSet = new WeakSet();
        isSessionInitialized = false; // Reset session knowledge on nav
        currentSessionKnownIds.clear();
    }

    function startMain() {
        if (isActive || !yusIsPlaylistPage()) return;
        isActive = true;

        createPanel();
        attachPanelResizeHandler();
        yusSetPanelActive(panel, true);
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
        detachPanelResizeHandler();
        yusSetPanelActive(panel, false);
    }


    // --- Public API Integration ---
    const SaverAPI = {
        save: function (playlistId, videoId, title, channel) {
            const data = loadStorage();
            const playlistMap = data[playlistId] || {};
            const existing = playlistMap[videoId];

            if (!existing) {
                if (!pendingQueue[playlistId]) pendingQueue[playlistId] = {};
                pendingQueue[playlistId][videoId] = {
                    title: title || null,
                    channel: channel || null,
                    addedAt: Date.now()
                };
                requestSave();
                return true;
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

    function onExportToClipboardClick() {
        loadStorage();
        if (!cachedStorage) { alert('No data.'); return; }
        GM_setClipboard(JSON.stringify(cachedStorage, null, 2), 'text');
        alert('Copied!');
    }

    // --- Cross-tab Synchronization ---
    if (typeof GM_addValueChangeListener !== 'undefined') {
        GM_addValueChangeListener(DATA_KEY, (key, oldValue, newValue, remote) => {
            if (remote) {
                console.log('[YouTube Playlist Saver] External data change detected. Syncing...');
                cachedStorage = newValue;
                // Clear UI cache to force re-render with new data
                processedSet = new WeakSet();
                scanAndRender();
            }
        });
    }

    yusInitApp({
        appName: 'YouTube Playlist Saver',
        startMain: startMain,
        stopMain: stopMain
    });

})();
