// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.2.44
// @description  [Backend] YouTubeプレイリストの動画IDを記録・管理します。UI機能は YouTube Playlist Filter に分離されました。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @connect      gist.githubusercontent.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver/youtube-playlist-saver.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver/youtube-playlist-saver.user.js
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

    const DATA_KEY = 'yt_playlist_data';
    const DATA_VERSION = 2;

    // --- Core Data Storage ---
    let cachedStorage = null;
    let pendingSaveTimeout = null;

    function loadStorage() {
        if (cachedStorage) return cachedStorage.playlists;

        let rawData = GM_getValue(DATA_KEY, {});

        // Migration: v0 -> v2
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

    // --- Public API Integration ---
    // Expose methods for other scripts (e.g., YouTube Playlist Filter) to use.

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
                return !existing; // True if genuinely new
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

        // Utility to export/import programmatically if needed
        getStorageSnapshot: function () {
            loadStorage();
            return cachedStorage;
        }
    };

    window.YouTubePlaylistSaver = SaverAPI;

    // Dispatch ready event for dependent scripts
    window.dispatchEvent(new CustomEvent('YouTubePlaylistSaverReady', { detail: SaverAPI }));
    console.log('[YouTube Playlist Saver] Backend Service Ready.');


    // --- Import / Export Logic (Kept here as it relates to the DB) ---

    function mergeImportedData(importedData) {
        if (!importedData) {
            alert('[YouTube Playlist Saver] Import failed: No data.');
            return;
        }

        // Normalize Input around v0/v1/v2 ... logic reused from original
        let sourcePlaylists = {};
        if (importedData.playlists) {
            sourcePlaylists = importedData.playlists;
        } else {
            const keys = Object.keys(importedData);
            if (keys.length > 0 && Array.isArray(importedData[keys[0]])) {
                sourcePlaylists = importedData;
            } else if (keys.length === 0) {
                alert('[YouTube Playlist Saver] Import failed: Data is empty.');
                return;
            } else {
                alert('[YouTube Playlist Saver] Import failed: Unknown data format.');
                return;
            }
        }

        const localPlaylists = loadStorage();
        let addedCount = 0;
        let updatedCount = 0;

        for (const [plId, content] of Object.entries(sourcePlaylists)) {
            if (!localPlaylists[plId]) localPlaylists[plId] = {};

            let entries = [];
            if (Array.isArray(content)) {
                entries = content.map(vid => [vid, null]);
            } else if (typeof content === 'object') {
                entries = Object.entries(content);
            }

            for (const [vid, remoteMeta] of entries) {
                const existing = localPlaylists[plId][vid];
                if (!existing) {
                    localPlaylists[plId][vid] = remoteMeta || { title: null, channel: null, addedAt: null };
                    addedCount++;
                } else if (remoteMeta) {
                    let changed = false;
                    if (existing.title === null && remoteMeta.title) { existing.title = remoteMeta.title; changed = true; }
                    if (existing.channel === null && remoteMeta.channel) { existing.channel = remoteMeta.channel; changed = true; }
                    if (existing.addedAt === null && remoteMeta.addedAt) { existing.addedAt = remoteMeta.addedAt; changed = true; }
                    if (changed) updatedCount++;
                }
            }
        }

        if (addedCount > 0 || updatedCount > 0) {
            requestSave();
            alert(`[YouTube Playlist Saver] Import successful!\nAdded: ${addedCount} videos\nUpdated Metadata: ${updatedCount} videos`);
            // Notify listeners that data changed
            window.dispatchEvent(new CustomEvent('YouTubePlaylistSaverDataChanged'));
        } else {
            alert('[YouTube Playlist Saver] Import finished. No new data found.');
        }
    }

    function importDataFromUrl(url) {
        console.log(`[YouTube Playlist Saver] Importing data from: ${url}`);
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (response) {
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
            onerror: function (err) {
                console.error(err);
                alert('[YouTube Playlist Saver] Network Error during import.');
            }
        });
    }

    function normalizeGistUrl(url) {
        const gistRawRegex = /^(https:\/\/gist\.githubusercontent\.com\/[^\/]+\/[^\/]+\/raw\/)[0-9a-f]{40}\/(.+)$/i;
        return url.replace(gistRawRegex, '$1$2');
    }

    function exportDataToFile() {
        loadStorage();
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
        input.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
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
        setTimeout(() => document.body.removeChild(input), 1000);
    }

    function onImportMenuClick() {
        const lastUrl = GM_getValue('yt_last_import_url', '');
        const url = prompt("YouTube Playlist Saver\n\nEnter the URL of the JSON data to import (Version 1+):\n(Gist Raw URLs will be normalized)", lastUrl);
        if (url && url.trim().startsWith('http')) {
            const cleanUrl = normalizeGistUrl(url.trim());
            GM_setValue('yt_last_import_url', cleanUrl);
            importDataFromUrl(cleanUrl);
        } else if (url) {
            alert('Invalid URL.');
        }
    }

    function onOpenGistPageClick() {
        const url = GM_getValue('yt_last_import_url', '');
        if (!url) return;
        const match = url.match(/https:\/\/gist\.githubusercontent\.com\/([^\/]+\/[^\/]+)\/raw/);
        if (match) {
            window.open(`https://gist.github.com/${match[1]}`, '_blank');
        } else {
            alert('Last import URL is not a standard Gist Raw URL.');
        }
    }

    function onExportToClipboardClick() {
        loadStorage();
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

    // Register Menu Commands (Only UI for Saver now)
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Import Data from URL", onImportMenuClick);
        GM_registerMenuCommand("Import Data from File", importDataFromFile);
        GM_registerMenuCommand("Copy Data to Clipboard", onExportToClipboardClick);
        GM_registerMenuCommand("Export Data to File", exportDataToFile);
        const lastUrl = GM_getValue('yt_last_import_url', '');
        if (lastUrl && lastUrl.includes('gist.githubusercontent.com')) {
            GM_registerMenuCommand("Open Gist Main Page", onOpenGistPageClick);
        }
    }

})();
