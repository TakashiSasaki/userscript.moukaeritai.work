// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.2.25
// @description  YouTubeのプレイリストに含まれる動画IDを記録・管理します。gist.githubusercontent.com からのデータインポートに対応しています。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @connect      gist.githubusercontent.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver.user.js
// ==/UserScript==

(function () {
    'use strict';

    const DATA_KEY = 'yt_playlist_data';
    const DATA_VERSION = 2;

    // --- Performance Optimization: Batching & Caching ---
    let cachedStorage = null; // Stores { version: N, playlists: { ... } }
    let pendingSaveTimeout = null;

    function loadStorage() {
        if (cachedStorage) return cachedStorage.playlists;
        
        let rawData = GM_getValue(DATA_KEY, {});

        // Migration: v0 (No version) -> v2
        if (rawData.version === undefined) {
            console.log('[YouTube Playlist Saver] Migrating data (v0 -> v2)');
            const newPlaylists = {};
            for (const [plId, videos] of Object.entries(rawData)) {
                if (Array.isArray(videos)) {
                    newPlaylists[plId] = {};
                    videos.forEach(vid => {
                        newPlaylists[plId][vid] = { title: null, channel: null, addedAt: null };
                    });
                }
            }
            cachedStorage = { version: DATA_VERSION, playlists: newPlaylists };
            GM_setValue(DATA_KEY, cachedStorage);
        } 
        // Migration: v1 -> v2
        else if (rawData.version === 1) {
            console.log('[YouTube Playlist Saver] Migrating data (v1 -> v2)');
            const newPlaylists = {};
            for (const [plId, videos] of Object.entries(rawData.playlists)) {
                if (Array.isArray(videos)) {
                    newPlaylists[plId] = {};
                    videos.forEach(vid => {
                        newPlaylists[plId][vid] = { title: null, channel: null, addedAt: null };
                    });
                }
            }
            cachedStorage = { version: DATA_VERSION, playlists: newPlaylists };
            GM_setValue(DATA_KEY, cachedStorage);
        }
        else {
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

    function getPlaylistId() {
        if (window.location.pathname !== '/playlist') return null;
        const params = new URLSearchParams(window.location.search);
        return params.get('list');
    }

    function getSavedVideos(playlistId) {
        const data = loadStorage();
        // Return Set of IDs for compatibility with existing check logic
        return new Set(Object.keys(data[playlistId] || {}));
    }

    function queueVideoId(playlistId, videoId, title = null, channel = null) {
        const data = loadStorage();
        if (!data[playlistId]) data[playlistId] = {};
        
        const playlistMap = data[playlistId]; // It's an object now

        // Check if exists AND has metadata
        const existing = playlistMap[videoId];
        
        // If new, or if existing but missing metadata (and we have new metadata provided)
        if (!existing || (title && existing.title === null)) {
            playlistMap[videoId] = {
                title: title || (existing ? existing.title : null),
                channel: channel || (existing ? existing.channel : null),
                addedAt: existing ? existing.addedAt : Date.now()
            };
            requestSave();
            return !existing; // Returns true ONLY if it was genuinely new (not just metadata update)
        }
        return false;
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

    // --- Import Feature ---

    function mergeImportedData(importedData) {
        if (!importedData) {
             alert('[YouTube Playlist Saver] Import failed: No data.');
             return;
        }

        // Normalize Input: Handle v0 (root keys), v1 (playlists array), v2 (playlists object)
        let sourcePlaylists = {};
        
        if (importedData.playlists) {
            // v1 or v2
            sourcePlaylists = importedData.playlists;
        } else {
            // v0 or invalid? Check if it looks like v0 (keys are IDs, values are arrays)
            const keys = Object.keys(importedData);
            // Ignore if it's just {version: ...} without playlists, but v0 has no version.
            if (keys.length > 0 && Array.isArray(importedData[keys[0]])) {
                 console.log('[YouTube Playlist Saver] Detected v0 import format.');
                 sourcePlaylists = importedData;
            } else if (keys.length === 0) {
                 // Empty object
                 alert('[YouTube Playlist Saver] Import failed: Data is empty.');
                 return;
            } else {
                 alert('[YouTube Playlist Saver] Import failed: Unknown data format.');
                 return;
            }
        }

        const localPlaylists = loadStorage(); // Returns reference to cachedStorage.playlists (v2 structure)
        let addedCount = 0;
        let updatedCount = 0;

        for (const [plId, content] of Object.entries(sourcePlaylists)) {
            // Ensure local playlist container exists (as object)
            if (!localPlaylists[plId]) {
                localPlaylists[plId] = {};
            }

            // Standardize to Object format for processing
            let entries = [];
            if (Array.isArray(content)) {
                // v0/v1: Array of IDs -> Convert to [ID, null] entries
                entries = content.map(vid => [vid, null]);
            } else if (typeof content === 'object') {
                // v2: Object map -> Entries
                entries = Object.entries(content);
            }

            for (const [vid, remoteMeta] of entries) {
                const existing = localPlaylists[plId][vid];
                
                if (!existing) {
                    // NEW: Add it
                    localPlaylists[plId][vid] = remoteMeta || { title: null, channel: null, addedAt: null };
                    addedCount++;
                } else if (remoteMeta) {
                    // UPDATE: Check if local is missing info that remote has
                    let changed = false;
                    
                    if (existing.title === null && remoteMeta.title) {
                        existing.title = remoteMeta.title;
                        changed = true;
                    }
                    if (existing.channel === null && remoteMeta.channel) {
                        existing.channel = remoteMeta.channel;
                        changed = true;
                    }
                    if (existing.addedAt === null && remoteMeta.addedAt) {
                         existing.addedAt = remoteMeta.addedAt;
                         changed = true;
                    }
                    
                    if (changed) updatedCount++;
                }
            }
        }

        if (addedCount > 0 || updatedCount > 0) {
            requestSave();
            alert(`[YouTube Playlist Saver] Import successful!\nAdded: ${addedCount} videos\nUpdated Metadata: ${updatedCount} videos`);
            
            // Refresh view
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => {
                delete item.dataset.saverProcessed; // Force re-scan
            });
        } else {
            alert('[YouTube Playlist Saver] Import finished. No new data or better metadata found.');
        }
    }

    function importDataFromUrl(url) {
        console.log(`[YouTube Playlist Saver] Importing data from: ${url}`);
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        mergeImportedData(data);
                    } catch (e) {
                        console.error(e);
                        alert('[YouTube Playlist Saver] JSON Parse Error: ' + e.message);
                    }
                } else {
                    alert(`[YouTube Playlist Saver] Download failed. Status: ${response.status}`);
                }
            },
            onerror: function(err) {
                console.error(err);
                alert('[YouTube Playlist Saver] Network Error during import.');
            }
        });
    }

    function normalizeGistUrl(url) {
        // Convert specific revision Raw URL to latest revision Raw URL
        // From: https://gist.githubusercontent.com/USER/ID/raw/HASH/FILE
        // To:   https://gist.githubusercontent.com/USER/ID/raw/FILE
        const gistRawRegex = /^(https:\/\/gist\.githubusercontent\.com\/[^\/]+\/[^\/]+\/raw\/)[0-9a-f]{40}\/(.+)$/i;
        return url.replace(gistRawRegex, '$1$2');
    }

    function exportDataToFile() {
        loadStorage(); // Ensure cachedStorage is populated
        if (!cachedStorage) {
            alert('[YouTube Playlist Saver] No data to export.');
            return;
        }

        try {
            const dataStr = JSON.stringify(cachedStorage, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'youtube_playlist_saver_data.json';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            
        } catch (e) {
            console.error(e);
            alert('[YouTube Playlist Saver] Export failed: ' + e.message);
        }
    }

    function importDataFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    mergeImportedData(data);
                } catch (err) {
                    console.error(err);
                    alert('[YouTube Playlist Saver] JSON Parse Error: ' + err.message);
                }
            };
            reader.readAsText(file);
        });

        document.body.appendChild(input);
        input.click();
        setTimeout(() => {
            document.body.removeChild(input);
        }, 1000);
    }

    function onImportMenuClick() {
        const lastUrl = GM_getValue('yt_last_import_url', '');
        const url = prompt("YouTube Playlist Saver\n\nEnter the URL of the JSON data to import (Version 1+):\n(Gist Raw URLs will be normalized to the latest revision)", lastUrl);
        if (url && url.trim().startsWith('http')) {
            const cleanUrl = normalizeGistUrl(url.trim());
            GM_setValue('yt_last_import_url', cleanUrl);
            importDataFromUrl(cleanUrl);
        } else if (url) {
            alert('Invalid URL. Must start with http.');
        }
    }

    function onOpenGistPageClick() {
        const url = GM_getValue('yt_last_import_url', '');
        if (!url) return;
        
        // Extract user and id from raw URL to construct main Gist page URL
        // From: https://gist.githubusercontent.com/USER/ID/raw/...
        // To:   https://gist.github.com/USER/ID
        const match = url.match(/https:\/\/gist\.githubusercontent\.com\/([^\/]+\/[^\/]+)\/raw/);
        if (match) {
            const mainUrl = `https://gist.github.com/${match[1]}`;
            window.open(mainUrl, '_blank');
        } else {
            alert('Last import URL is not a standard Gist Raw URL.');
        }
    }

    function onExportToClipboardClick() {
        loadStorage(); // Ensure cachedStorage is populated
        if (!cachedStorage) {
            alert('[YouTube Playlist Saver] No data to export.');
            return;
        }
        
        try {
            const dataStr = JSON.stringify(cachedStorage, null, 2);
            GM_setClipboard(dataStr, 'text');
            alert('[YouTube Playlist Saver] Data copied to clipboard!');
        } catch (e) {
            console.error(e);
            alert('[YouTube Playlist Saver] Export failed: ' + e.message);
        }
    }

    // Register Menu Commands
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Import Data from URL", onImportMenuClick);
        GM_registerMenuCommand("Import Data from File", importDataFromFile);
        
        const lastUrl = GM_getValue('yt_last_import_url', '');
        if (lastUrl && lastUrl.includes('gist.githubusercontent.com')) {
            GM_registerMenuCommand("Open Gist Main Page", onOpenGistPageClick);
        }
        
        GM_registerMenuCommand("Copy Data to Clipboard", onExportToClipboardClick);
        GM_registerMenuCommand("Export Data to File", exportDataToFile);
    }

    // --- UI Helpers ---

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

    /**
     * Render the status indicator and Remove button
     */
    function renderIndicator(element, isNew) {
        // Try multiple selectors for robustness
        let bar = element.querySelector('#engagement-bar');
        if (!bar) {
             // Fallback: try finding the meta block if engagement-bar is missing
             bar = element.querySelector('.ytd-video-meta-block') || element.querySelector('#meta');
        }

        if (!bar) {
            // Only warn if it's not a skeleton/loading element
            if (!element.querySelector('ytd-playlist-video-renderer')) {
                 console.warn('[YouTube Playlist Saver] Target container (engagement-bar/meta) not found for item:', element);
            }
            return;
        }

        // 1. Status Indicator
        const oldIndicator = bar.querySelector('.yt-saver-indicator');
        if (oldIndicator) oldIndicator.remove();

        const indicator = document.createElement('span');
        indicator.className = 'yt-saver-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';
        Object.assign(indicator.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            marginRight: '8px',
            color: isNew ? '#3ea6ff' : '#2ba640',
            verticalAlign: 'middle',
            display: 'inline-block' // Ensure visibility
        });

        // 2. Remove Button
        const oldRemoveBtn = bar.querySelector('.yt-saver-remove-btn');
        if (oldRemoveBtn) oldRemoveBtn.remove();

        const removeBtn = document.createElement('button');
        removeBtn.className = 'yt-saver-remove-btn';
        removeBtn.title = 'Remove from playlist';
        Object.assign(removeBtn.style, {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            marginLeft: '8px',
            verticalAlign: 'middle',
            opacity: '0.7',
            display: 'inline-block'
        });

        // Trash Icon Path
        const trashIconPath = 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z';
        removeBtn.appendChild(createIcon(trashIconPath, '#606060'));

        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent navigation
            // Visual feedback
            const originalColor = removeBtn.querySelector('path').style.fill;
            removeBtn.querySelector('path').style.fill = 'red';

            const success = await attemptRemoveVideo(element);
            if (!success) {
                // Revert on failure
                removeBtn.querySelector('path').style.fill = originalColor;
                alert('Failed to remove video. The menu structure might have changed.');
            } else {
                // Dim the row on success
                element.style.opacity = '0.3';
                element.style.pointerEvents = 'none';
            }
        });

        removeBtn.addEventListener('mouseenter', () => removeBtn.style.opacity = '1');
        removeBtn.addEventListener('mouseleave', () => removeBtn.style.opacity = '0.7');

        // Append order
        bar.prepend(removeBtn);
        bar.prepend(indicator);
    }

    const TRASH_ICON_PATHS = [
        "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
        "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z",
        "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z"
    ];

    /**
     * DOM Interaction to remove video
     */
    async function attemptRemoveVideo(videoContainer) {
        // 1. Find Action Menu Button (Three dots)
        const menuBtn = videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger');

        if (!menuBtn) {
            console.error('[YouTube Playlist Saver] Menu button not found.');
            return false;
        }

        menuBtn.click();

        // Helper to find the target item within the popup
        const findTargetItem = (popup) => {
            if (!popup) return null;
            const items = Array.from(popup.querySelectorAll('ytd-menu-service-item-renderer'));
            for (const item of items) {
                const text = item.textContent || "";
                if (text.includes('Remove from') || text.includes('から削除')) {
                    return item;
                }
                const path = item.querySelector('path');
                if (path) {
                    const d = path.getAttribute('d');
                    if (d && TRASH_ICON_PATHS.includes(d)) return item;
                }
            }
            return null;
        };

        // 2. Wait for Menu Popup AND Target Item (Combined Polling)
        // Retry for up to 8 seconds to handle slow UI responses
        const MAX_WAIT = 8000;
        const START_TIME = Date.now();
        let targetItem = null;

        while (Date.now() - START_TIME < MAX_WAIT) {
            // Check for popup existence
            const menuPopup = document.querySelector('ytd-menu-popup-renderer');
            if (menuPopup) {
                // Check for item existence
                targetItem = findTargetItem(menuPopup);
                if (targetItem) break;
            }
            // Wait 100ms before next check
            await new Promise(r => setTimeout(r, 100));
        }

        if (targetItem) {
            targetItem.click();
            return true;
        } else {
            console.warn(`[YouTube Playlist Saver] Remove option not found after ${MAX_WAIT}ms.`);
            // Attempt to close menu by clicking body
            document.body.click(); 
            return false;
        }
    }

    /**
     * Utility: Wait for an element to appear
     */
    /**
     * Utility: Wait for an element to appear (Polling version)
     * Replaced MutationObserver with polling to avoid hanging during massive DOM removals (e.g. navigation)
     */
    function waitForElement(selector, timeout = 3000) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const startTime = Date.now();
            const interval = setInterval(() => {
                if (document.querySelector(selector)) {
                    clearInterval(interval);
                    resolve(document.querySelector(selector));
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 100);
        });
    }

    /**
     * Check if the playlist loading spinner is active
     */
    function isSpinnerActive() {
        // Check for both the initial loading spinner (lite) and the continuation/pagination spinner
        // Targeted to playlist video list to avoid false positives from other parts of the page
        const spinners = document.querySelectorAll(
            'ytd-playlist-video-list-renderer tp-yt-paper-spinner, ' +
            'ytd-playlist-video-list-renderer tp-yt-paper-spinner-lite, ' +
            'ytd-continuation-item-renderer tp-yt-paper-spinner, ' +
            'ytd-continuation-item-renderer tp-yt-paper-spinner-lite'
        );

        for (const spinner of spinners) {
            // 1. Check if the spinner has the 'active' attribute (primary method)
            if (spinner.hasAttribute('active')) {
                return true;
            }

            // 2. Check internal structure for 'active' class (high precision fallback)
            // Based on spinner3.html, the internal #spinnerContainer gets the 'active' class
            const internalContainer = spinner.querySelector('#spinnerContainer');
            if (internalContainer && internalContainer.classList.contains('active')) {
                return true;
            }

            // 3. Fallback: Check aria-hidden and computed visibility
            // Some spinners might not use the active attribute but toggle visibility
            if (spinner.getAttribute('aria-hidden') !== 'true') {
                const style = window.getComputedStyle(spinner);
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Wait until the spinner disappears
     */
    async function waitUntilSpinnerDisappears() {
        if (!isSpinnerActive()) return;

        console.log('[YouTube Playlist Saver] Spinner detected, waiting...');

        const btn = document.getElementById('yt-saver-remove-above-btn');
        let originalText = '';
        if (btn) {
            originalText = btn.textContent;
            btn.textContent = 'Waiting for load...';
        }

        const MAX_WAIT_MS = 60000; // 60 seconds max wait
        const START_TIME = Date.now();

        while (isSpinnerActive()) {
            if (Date.now() - START_TIME > MAX_WAIT_MS) {
                console.warn('[YouTube Playlist Saver] Timed out waiting for spinner to disappear.');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (btn && originalText) {
            btn.textContent = originalText;
        }

        // Small buffer after spinner disappears
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // --- Filter Feature ---

    let filterState = {
        title: '',
        channel: ''
    };

    const PANEL_STATE_KEY = 'yt_panel_minimized';
    let isMinimized = GM_getValue(PANEL_STATE_KEY, false);

    let isProcessing = false;
    let isFiltering = false;
    let statusInterval = null;
    let countsInterval = null;
    let scrollHandler = null;

    function createFilterPanel() {
        if (document.getElementById('yt-saver-filter-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-saver-filter-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#f4f4f4', // Slightly tinted background
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            // gap: '8px', // Moved to contentContainer
            width: '200px',
            color: '#333',
            fontFamily: 'Roboto, Arial, sans-serif'
        });

        // --- Header (Title & Minimize Button) ---
        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
        });

        const titleLabel = document.createElement('span');
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.2.24';
        titleLabel.textContent = `Playlist Saver v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px' });

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        Object.assign(minimizeBtn.style, {
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '0 4px',
            lineHeight: '1',
            color: '#666'
        });

        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });

        const updatePanelMinState = (min) => {
            contentContainer.style.display = min ? 'none' : 'flex';
            minimizeBtn.textContent = min ? '+' : '−';
            isMinimized = min;
            GM_setValue(PANEL_STATE_KEY, min);
        };

        minimizeBtn.addEventListener('click', () => {
            updatePanelMinState(!isMinimized);
        });

        // Initialize state
        updatePanelMinState(isMinimized);

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(minimizeBtn);
        panel.appendChild(headerRow);
        panel.appendChild(contentContainer);

        // Helper to create input group with clear button
        const createInputGroup = (labelText, placeholder, stateKey) => {
            const container = document.createElement('div');
            Object.assign(container.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
            });

            const label = document.createElement('div');
            label.textContent = labelText;
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';

            const inputWrapper = document.createElement('div');
            Object.assign(inputWrapper.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            });

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder;
            input.value = filterState[stateKey] || ''; // Initialize from state
            Object.assign(input.style, {
                padding: '4px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                flex: '1'
            });

            const clearBtn = document.createElement('button');
            clearBtn.textContent = '×';
            clearBtn.title = 'Clear filter';
            Object.assign(clearBtn.style, {
                cursor: 'pointer',
                background: '#eee',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '20px',
                height: '24px',
                lineHeight: '1',
                textAlign: 'center',
                padding: '0'
            });

            const updateFilter = () => {
                filterState[stateKey] = input.value.toLowerCase();
                applyFilters();
            };

            input.addEventListener('input', debounce(updateFilter, 500));

            clearBtn.addEventListener('click', () => {
                input.value = '';
                updateFilter();
            });

            inputWrapper.appendChild(input);
            inputWrapper.appendChild(clearBtn);
            container.appendChild(label);
            container.appendChild(inputWrapper);

            return container;
        };

        const titleGroup = createInputGroup('Filter by Title:', 'e.g. Minecraft', 'title');
        const channelGroup = createInputGroup('Filter by Channel:', 'e.g. Official', 'channel');

        // Above Info
        const aboveDiv = document.createElement('div');
        aboveDiv.id = 'yt-saver-above-info';
        aboveDiv.textContent = 'Above: -';
        Object.assign(aboveDiv.style, {
            fontSize: '11px',
            color: '#666',
            marginTop: '4px',
            textAlign: 'right',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            maxHeight: '100px',
            overflowY: 'auto'
        });

        // Result Count
        const countDiv = document.createElement('div');
        countDiv.id = 'yt-saver-filter-count';
        countDiv.textContent = 'Results: 0 / 0';
        Object.assign(countDiv.style, {
            fontSize: '11px',
            color: '#666',
            marginTop: '4px',
            textAlign: 'right'
        });

        // Status Counts (New / Saved)
        const statusCountsDiv = document.createElement('div');
        statusCountsDiv.id = 'yt-saver-status-counts';
        statusCountsDiv.textContent = 'New: 0 | Saved: 0';
        Object.assign(statusCountsDiv.style, {
            fontSize: '11px',
            color: '#666',
            marginTop: '2px',
            textAlign: 'right'
        });

        // Debug: Spinner Status
        const spinnerStatusDiv = document.createElement('div');
        spinnerStatusDiv.id = 'yt-saver-spinner-status';
        spinnerStatusDiv.textContent = 'Spinner: Checking...';
        Object.assign(spinnerStatusDiv.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            marginTop: '4px',
            textAlign: 'right',
            color: '#666'
        });

        // Bulk Remove Button
        const removeAboveBtn = document.createElement('button');
        removeAboveBtn.id = 'yt-saver-remove-above-btn';
        removeAboveBtn.textContent = 'Remove Above';
        Object.assign(removeAboveBtn.style, {
            marginTop: '8px',
            padding: '6px',
            fontSize: '11px',
            backgroundColor: '#ffdddd',
            border: '1px solid #faa',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#d00',
            fontWeight: 'bold'
        });
        removeAboveBtn.addEventListener('click', removeAboveItems);

        contentContainer.appendChild(titleGroup);
        contentContainer.appendChild(channelGroup);
        contentContainer.appendChild(countDiv);
        contentContainer.appendChild(statusCountsDiv);
        contentContainer.appendChild(spinnerStatusDiv);

        // Filtering Status
        const filteringStatusDiv = document.createElement('div');
        filteringStatusDiv.id = 'yt-saver-filtering-status';
        filteringStatusDiv.textContent = 'Filtering: Idle';
        Object.assign(filteringStatusDiv.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            marginTop: '2px',
            textAlign: 'right',
            color: '#2ba640'
        });
        contentContainer.appendChild(filteringStatusDiv);

        // Processing (Removal) Status
        const processingStatusDiv = document.createElement('div');
        processingStatusDiv.id = 'yt-saver-processing-status';
        processingStatusDiv.textContent = 'Processing: Idle';
        Object.assign(processingStatusDiv.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            marginTop: '2px',
            textAlign: 'right',
            color: '#2ba640'
        });
        contentContainer.appendChild(processingStatusDiv);

        // Processing Detail
        const processingDetailDiv = document.createElement('div');
        processingDetailDiv.id = 'yt-saver-processing-detail';
        processingDetailDiv.textContent = '';
        Object.assign(processingDetailDiv.style, {
            fontSize: '10px',
            color: '#666',
            marginTop: '2px',
            textAlign: 'right',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
        });
        contentContainer.appendChild(processingDetailDiv);

        contentContainer.appendChild(aboveDiv);
        contentContainer.appendChild(removeAboveBtn);

        // --- Auto Scroll Settings UI ---
        const separator = document.createElement('hr');
        Object.assign(separator.style, { border: '0', borderTop: '1px solid #ddd', margin: '8px 0', width: '100%' });
        contentContainer.appendChild(separator);

        const asHeaderContainer = document.createElement('div');
        Object.assign(asHeaderContainer.style, { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '4px'
        });

        const asHeader = document.createElement('div');
        asHeader.textContent = 'Auto Scroll';
        Object.assign(asHeader.style, { fontWeight: 'bold', fontSize: '12px' });
        
        // Auto Scroll Toggle Button (Integrated)
        const asToggleBtn = document.createElement('button');
        asToggleBtn.id = 'yt-saver-as-toggle';
        asToggleBtn.textContent = 'OFF';
        Object.assign(asToggleBtn.style, {
            padding: '2px 8px',
            fontSize: '11px',
            backgroundColor: '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
        });
        asToggleBtn.addEventListener('click', () => toggleAutoScroll(asToggleBtn));

        asHeaderContainer.appendChild(asHeader);
        asHeaderContainer.appendChild(asToggleBtn);
        contentContainer.appendChild(asHeaderContainer);

        // Checkbox: Scroll to Bottom
        const asCheckboxContainer = document.createElement('div');
        Object.assign(asCheckboxContainer.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginBottom: '4px' });
        
        const asCheckbox = document.createElement('input');
        asCheckbox.type = 'checkbox';
        asCheckbox.checked = autoScrollSettings.scrollToBottom;
        asCheckbox.id = 'yt-saver-as-bottom';
        
        const asCheckboxLabel = document.createElement('label');
        asCheckboxLabel.textContent = 'Scroll to Bottom';
        asCheckboxLabel.htmlFor = 'yt-saver-as-bottom';

        // Step Input Helper
        const createScrollInput = (label, key, placeholder) => {
             const container = document.createElement('div');
             Object.assign(container.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginTop: '2px' });
             
             const lbl = document.createElement('div');
             lbl.textContent = label;
             lbl.style.flex = '1';

             const input = document.createElement('input');
             input.type = 'number';
             input.value = autoScrollSettings[key];
             input.placeholder = placeholder;
             Object.assign(input.style, { width: '50px', padding: '2px', border: '1px solid #ccc', borderRadius: '4px' });
             
             input.addEventListener('change', () => {
                 let val = parseFloat(input.value);
                 if (isNaN(val) || val < 0) val = key === 'interval' ? 1 : 0;
                 autoScrollSettings[key] = val;
                 saveAutoScrollSettings();
                 restartAutoScrollIfActive();
             });
             
             container.appendChild(lbl);
             container.appendChild(input);
             return { container, input };
        };

        const stepInputObj = createScrollInput('Step (px):', 'step', '300');
        const intervalInputObj = createScrollInput('Interval (sec):', 'interval', '5');

        asCheckbox.addEventListener('change', () => {
            autoScrollSettings.scrollToBottom = asCheckbox.checked;
            saveAutoScrollSettings();
            updateStepVisibility();
            restartAutoScrollIfActive();
        });

        function updateStepVisibility() {
            if (autoScrollSettings.scrollToBottom) {
                stepInputObj.container.style.display = 'none';
            } else {
                stepInputObj.container.style.display = 'flex';
            }
        }
        updateStepVisibility();
        
        asCheckboxContainer.appendChild(asCheckbox);
        asCheckboxContainer.appendChild(asCheckboxLabel);
        contentContainer.appendChild(asCheckboxContainer);

        contentContainer.appendChild(stepInputObj.container);
        contentContainer.appendChild(intervalInputObj.container);

        document.body.appendChild(panel);
        applyFilters(); // Initial count
        updateStatusCounts(); // Initial stats
    }

    function getIndex(item) {
        const indexEl = item.querySelector('#index');
        return indexEl ? parseInt(indexEl.textContent.trim(), 10) : null;
    }

    function getAboveItems() {
        const items = Array.from(document.querySelectorAll('ytd-playlist-video-renderer'));
        // Exclude hidden items AND already removed items (pointerEvents = none)
        const visibleFilterItems = items.filter(item =>
            item.style.display !== 'none' && item.style.pointerEvents !== 'none'
        );

        const viewportHeight = window.innerHeight;

        return visibleFilterItems.filter(item => {
            const rect = item.getBoundingClientRect();
            // Include if the item is fully above the bottom edge of the screen
            return rect.bottom <= viewportHeight;
        });
    }

    async function removeAboveItems() {
        const items = getAboveItems();
        if (items.length === 0) {
            alert('No "Above" items to remove.');
            return;
        }

        if (!confirm(`Are you sure you want to remove ${items.length} videos from the playlist?`)) return;

        // Automatically stop auto scroll if it's active
        if (scrollInterval) {
            const scrollBtn = document.getElementById('yt-saver-as-toggle');
            if (scrollBtn) toggleAutoScroll(scrollBtn);
        }

        isProcessing = true; // Start processing
        const btn = document.getElementById('yt-saver-remove-above-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Removing...';
            btn.style.opacity = '0.5';
        }

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Extract metadata for progress display
                const titleEl = item.querySelector('#video-title');
                const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
                const channelEl = item.querySelector('.ytd-channel-name a') || item.querySelector('#channel-name #text');
                const channel = channelEl ? channelEl.textContent.trim() : 'Unknown';

                const detailEl = document.getElementById('yt-saver-processing-detail');
                if (detailEl) {
                    detailEl.textContent = `${title} (${channel})`;
                    detailEl.title = `${title} (${channel})`; // Tooltip for full text
                }

                // Scroll into view gently
                item.scrollIntoView({ block: 'center', behavior: 'instant' });
                await new Promise(r => setTimeout(r, 250)); // Small wait after scroll

                // Wait for spinner to disappear if active
                await waitUntilSpinnerDisappears();

                try {
                    const success = await attemptRemoveVideo(item);
                    if (!success) {
                        console.warn(`[YouTube Playlist Saver] Failed to remove item index ${i}`);
                    } else {
                        // Mark as removed visually and logically to prevent double-processing
                        item.style.opacity = '0.3';
                        item.style.pointerEvents = 'none';
                    }
                } catch (err) {
                    console.error(`[YouTube Playlist Saver] Exception removing item index ${i}`, err);
                }

                // Delay between actions to prevent rate limiting or UI glitches
                await new Promise(r => setTimeout(r, 1000));
                
                // Update stats during removal
                updateStatusCounts();
            }
        } finally {
            isProcessing = false; // End processing
            
            const detailEl = document.getElementById('yt-saver-processing-detail');
            if (detailEl) {
                detailEl.textContent = '';
                detailEl.title = '';
            }

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Remove Above';
                btn.style.opacity = '1';
            }
            // Update info after removal
            applyFilters();
            updateStatusCounts();
        }
    }

    function updateAboveInfo() {
        const targetItems = getAboveItems();

        const aboveInfoEl = document.getElementById('yt-saver-above-info');
        if (!aboveInfoEl) return;

        if (targetItems.length === 0) {
            aboveInfoEl.textContent = 'Above: -';
            return;
        }

        const indices = targetItems.map(getIndex).filter(i => i !== null);

        if (indices.length === 0) {
            aboveInfoEl.textContent = 'Above: None';
            return;
        }

        // Format indices (Range compression)
        const ranges = [];
        let rangeStart = indices[0];
        let prev = indices[0];

        for (let i = 1; i < indices.length; i++) {
            const curr = indices[i];
            if (curr === prev + 1) {
                prev = curr;
            } else {
                ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
                rangeStart = curr;
                prev = curr;
            }
        }
        ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);

        aboveInfoEl.textContent = `Above: ${ranges.join(', ')}`;
        aboveInfoEl.title = `Above: ${ranges.join(', ')}`;
    }


    function updateMatchedIndicator(element, isMatched) {
        let bar = element.querySelector('#engagement-bar');
        if (!bar) {
             bar = element.querySelector('.ytd-video-meta-block') || element.querySelector('#meta');
        }
        if (!bar) return;

        const oldIndicator = bar.querySelector('.yt-saver-matched-indicator');
        if (oldIndicator) oldIndicator.remove();

        if (isMatched) {
            const indicator = document.createElement('span');
            indicator.className = 'yt-saver-matched-indicator';
            indicator.textContent = ' [MATCHED] ';
            Object.assign(indicator.style, {
                fontSize: '11px',
                fontWeight: 'bold',
                marginRight: '8px',
                color: '#ff9800', // Orange
                verticalAlign: 'middle',
                display: 'inline-block'
            });
            // Insert after NEW/SAVED indicator if exists, otherwise prepend
            const existingIndicator = bar.querySelector('.yt-saver-indicator');
            if (existingIndicator) {
                existingIndicator.after(indicator);
            } else {
                bar.prepend(indicator);
            }
        }
    }

    function applyFilterToItem(item) {
        // 1. Get Title
        const titleEl = item.querySelector('#video-title');
        const titleText = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

        // 2. Get Channel Name
        const channelEl = item.querySelector('.ytd-channel-name a') ||
            item.querySelector('#channel-name #text');
        const channelText = channelEl ? channelEl.textContent.trim().toLowerCase() : '';

        // 3. Check Matches
        const isFilterActive = filterState.title || filterState.channel;
        const matchTitle = !filterState.title || titleText.includes(filterState.title);
        const matchChannel = !filterState.channel || channelText.includes(filterState.channel);
        const isMatched = matchTitle && matchChannel;

        if (isMatched) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }

        updateMatchedIndicator(item, isFilterActive && isMatched);
    }

    function updateResultCount() {
        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        // Count items that are NOT hidden
        // Note: checking style.display is faster than :not([style*="display: none"]) query in large DOMs usually,
        // but simple querySelectorAll with :not might be fast enough.
        // Let's use array filter for safety and clarity if N is large.
        let visibleCount = 0;
        for (let i = 0; i < items.length; i++) {
            if (items[i].style.display !== 'none') {
                visibleCount++;
            }
        }

        const countEl = document.getElementById('yt-saver-filter-count');
        if (countEl) {
            countEl.textContent = `Results: ${visibleCount} / ${items.length}`;
        }
    }

    function updateStatusCounts() {
        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        let newCount = 0;
        let savedCount = 0;

        items.forEach(item => {
            const indicator = item.querySelector('.yt-saver-indicator');
            if (indicator) {
                const text = indicator.textContent || "";
                if (text.includes('NEW')) newCount++;
                else if (text.includes('SAVED')) savedCount++;
            }
        });

        const el = document.getElementById('yt-saver-status-counts');
        if (el) {
             // Avoid innerHTML to prevent Trusted Types violations
             while (el.firstChild) el.removeChild(el.firstChild);

             const newSpan = document.createElement('span');
             newSpan.style.color = '#3ea6ff';
             newSpan.textContent = `New: ${newCount}`;

             const savedSpan = document.createElement('span');
             savedSpan.style.color = '#2ba640';
             savedSpan.textContent = `Saved: ${savedCount}`;

             el.appendChild(newSpan);
             el.appendChild(document.createTextNode(' | '));
             el.appendChild(savedSpan);
        }
    }

    function applyFilters() {
        isFiltering = true;
        try {
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(applyFilterToItem);
            updateResultCount();
            // Moved updateAboveInfo to setTimeout to ensure layout (getBoundingClientRect) 
            // is calculated AFTER the DOM updates (display: none) have triggered a reflow.
        } finally {
            // Use setTimeout to ensure the "Active" state is visible even for fast sync operations
            // AND to wait for layout repaint
            setTimeout(() => {
                isFiltering = false;
                updateAboveInfo();
            }, 100);
        }
    }

    function processItem(item, playlistId, currentSessionSet) {
        // Apply filter immediately for new/re-scanned items
        applyFilterToItem(item);

        if (item.dataset.saverProcessed === playlistId) return;

        const videoId = extractVideoId(item);
        if (!videoId) return;

        // Extract metadata
        const titleEl = item.querySelector('#video-title');
        const title = titleEl ? titleEl.textContent.trim() : null;

        const channelEl = item.querySelector('.ytd-channel-name a') || item.querySelector('#channel-name #text');
        const channel = channelEl ? channelEl.textContent.trim() : null;

        const wasInDb = currentSessionSet.has(videoId);

        // Always attempt to queue/update. 
        // If ID exists but metadata is missing, this updates it.
        // If ID is new, this adds it.
        queueVideoId(playlistId, videoId, title, channel);

        if (!wasInDb) {
            currentSessionSet.add(videoId);
        }

        renderIndicator(item, !wasInDb);
        item.dataset.saverProcessed = playlistId;
    }

    // --- Auto Scroll Feature ---

    const AUTO_SCROLL_SETTINGS_KEY = 'yt_auto_scroll_settings';
    let autoScrollSettings = GM_getValue(AUTO_SCROLL_SETTINGS_KEY, {
        scrollToBottom: true,
        step: 300,
        interval: 5.0
    });
    let scrollInterval = null;

    function saveAutoScrollSettings() {
        GM_setValue(AUTO_SCROLL_SETTINGS_KEY, autoScrollSettings);
    }

    function toggleAutoScroll(btn) {
        // If btn is not provided, try to find it
        if (!btn) btn = document.getElementById('yt-saver-as-toggle');
        if (!btn) return;

        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            btn.textContent = 'OFF';
            btn.style.backgroundColor = '#ccc';
            btn.style.color = '#000';
        } else {
            btn.textContent = 'ON';
            btn.style.backgroundColor = '#2ba640';
            btn.style.color = '#fff';

            const intervalMs = Math.max(100, (autoScrollSettings.interval || 5) * 1000);
            const runScroll = () => {
                if (autoScrollSettings.scrollToBottom) {
                    window.scrollTo(0, document.documentElement.scrollHeight);
                } else {
                    window.scrollBy(0, autoScrollSettings.step || 300);
                }
            };

            // Run immediately once
            runScroll();
            scrollInterval = setInterval(runScroll, intervalMs);
        }
    }

    function restartAutoScrollIfActive() {
        // Only restart if currently active (interval exists)
        if (scrollInterval) {
            clearInterval(scrollInterval);
            const intervalMs = Math.max(100, (autoScrollSettings.interval || 5) * 1000);
            
            const runScroll = () => {
                if (autoScrollSettings.scrollToBottom) {
                     window.scrollTo(0, document.documentElement.scrollHeight);
                } else {
                     window.scrollBy(0, autoScrollSettings.step || 300);
                }
            };
            
            scrollInterval = setInterval(runScroll, intervalMs);
        }
    }

    function processAllVisible(playlistId, currentSessionSet) {
        isFiltering = true; // Activating filtering indicator during re-scan/loading
        try {
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => processItem(item, playlistId, currentSessionSet));
            updateResultCount();
        } finally {
            // Ensure indicator remains visible for 100ms
            setTimeout(() => {
                isFiltering = false;
                updateAboveInfo();
                updateStatusCounts();
            }, 100);
        }
    }

    function initObserver(listContainer, playlistId, currentSessionSet) {
        if (window._ytSaverObserver) window._ytSaverObserver.disconnect();

        const throttledProcess = throttle(() => {
            processAllVisible(playlistId, currentSessionSet);
        }, 1000);

        const observer = new MutationObserver((_mutations) => {
            throttledProcess();
        });

        // Performance: Stop observing subtree. Only observe direct child additions (new videos).
        observer.observe(listContainer, { childList: true, subtree: false });
        window._ytSaverObserver = observer;
        window._ytSaverObservedElement = listContainer;
    }

    async function run() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        console.log(`[YouTube Playlist Saver] Processing playlist: ${playlistId}`);
        createFilterPanel();

        // Initialize Scroll Listener if not already present
        if (!scrollHandler) {
            scrollHandler = throttle(() => {
                updateAboveInfo();
            }, 200);
            window.addEventListener('scroll', scrollHandler);
        }

        // Use local Cache
        const currentSessionSet = getSavedVideos(playlistId);

        // Start Status Intervals with Panel/Observer Resurrection Logic
        if (statusInterval) clearInterval(statusInterval);
        statusInterval = setInterval(() => {
            // 1. Check if panel is alive
            if (!document.getElementById('yt-saver-filter-panel')) {
                 console.warn('[YouTube Playlist Saver] Panel disappeared, recreating...');
                 createFilterPanel();
            }

            // 2. Check if list container is still in DOM (Observer check)
            const listContainer = document.querySelector('ytd-playlist-video-list-renderer #contents');
            if (listContainer && (!window._ytSaverObservedElement || window._ytSaverObservedElement !== listContainer || !document.contains(window._ytSaverObservedElement))) {
                 console.warn('[YouTube Playlist Saver] List container replaced or observer missing, re-initializing...');
                 initObserver(listContainer, playlistId, currentSessionSet);
            }

            // 3. UI Updates
            const isActive = isSpinnerActive();
            const spinnerStatusDiv = document.getElementById('yt-saver-spinner-status');
            if (spinnerStatusDiv) {
                spinnerStatusDiv.textContent = isActive ? 'Spinner: Active' : 'Spinner: Idle';
                spinnerStatusDiv.style.color = isActive ? '#d00' : '#2ba640';
            }

            const filterEl = document.getElementById('yt-saver-filtering-status');
            if (filterEl) {
                filterEl.textContent = isFiltering ? 'Filtering: Active' : 'Filtering: Idle';
                filterEl.style.color = isFiltering ? '#d00' : '#2ba640';
            }

            const procEl = document.getElementById('yt-saver-processing-status');
            if (procEl) {
                procEl.textContent = isProcessing ? 'Processing: Active' : 'Processing: Idle';
                procEl.style.color = isProcessing ? '#d00' : '#2ba640';
            }
        }, 500);

        if (countsInterval) clearInterval(countsInterval);
        countsInterval = setInterval(() => {
            updateStatusCounts();
        }, 10000);

        processAllVisible(playlistId, currentSessionSet);

        // Initial Observer setup
        const listContainer = document.querySelector('ytd-playlist-video-list-renderer #contents') ||
                             await waitForElement('ytd-playlist-video-list-renderer #contents', 5000);
                             
        if (listContainer) {
            initObserver(listContainer, playlistId, currentSessionSet);
        } else {
            console.warn('[YouTube Playlist Saver] Playlist container not found. Observer not started.');
        }
    }

    // --- Navigation Handling ---

    function cleanupUI() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
        if (countsInterval) {
            clearInterval(countsInterval);
            countsInterval = null;
        }
        if (scrollHandler) {
            window.removeEventListener('scroll', scrollHandler);
            scrollHandler = null;
        }

        const filterPanel = document.getElementById('yt-saver-filter-panel');
        if (filterPanel) filterPanel.remove();

        if (window._ytSaverObserver) {
            window._ytSaverObserver.disconnect();
            window._ytSaverObserver = null;
        }
    }

    // Performance: Cleanup EARLIER to avoid observer overhead during page teardown
    window.addEventListener('yt-navigate-start', cleanupUI);
    window.addEventListener('beforeunload', cleanupUI); // Extra safety for non-SPA navigation or close

    window.addEventListener('yt-navigate-finish', () => {
        // Flush pending save
        if (pendingSaveTimeout) {
            clearTimeout(pendingSaveTimeout);
            GM_setValue(DATA_KEY, cachedStorage);
            pendingSaveTimeout = null;
        }

        cleanupUI();
        run();
    });

    run();

})();
