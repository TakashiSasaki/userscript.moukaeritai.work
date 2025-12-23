// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  YouTubeのプレイリストに含まれる動画IDを記録・管理します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?list=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/youtube.com/youtube-playlist-saver.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/youtube.com/youtube-playlist-saver.user.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Design Details:
     * - Key for GM_setValue: 'yt_playlist_data'
     * - Structure: { [playlistId]: Array<videoId> }
     */

    const DATA_KEY = 'yt_playlist_data';

    // Get current playlist ID from URL
    function getPlaylistId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('list');
    }

    // Load saved data for a specific playlist
    function getSavedVideos(playlistId) {
        const data = GM_getValue(DATA_KEY, {});
        return new Set(data[playlistId] || []);
    }

    // Save video ID to storage
    function saveVideoId(playlistId, videoId) {
        const data = GM_getValue(DATA_KEY, {});
        const savedList = data[playlistId] || [];
        if (!savedList.includes(videoId)) {
            savedList.push(videoId);
            data[playlistId] = savedList;
            GM_setValue(DATA_KEY, data);
            return true; // Newly saved
        }
        return false; // Already existed
    }

    // Extract Video ID from a video renderer element
    function extractVideoId(element) {
        const link = element.querySelector('a#video-title, a#thumbnail');
        if (link) {
            const href = link.getAttribute('href');
            const match = href.match(/[?&]v=([^&]+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    // Add indicator to the engagement bar
    function addIndicator(element, isNew) {
        const bar = element.querySelector('#engagement-bar');
        if (!bar) return;

        // Remove existing indicator if any (for SPA navigation/re-runs)
        const existing = bar.querySelector('.yt-saver-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('span');
        indicator.className = 'yt-saver-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';
        indicator.style.fontSize = '12px';
        indicator.style.fontWeight = 'bold';
        indicator.style.marginRight = '8px';
        indicator.style.color = isNew ? '#3ea6ff' : '#2ba640'; // YouTube blue vs green

        bar.prepend(indicator);
    }

    // Process a single video item
    function processVideoItem(item, playlistId, savedVideos) {
        if (item.hasAttribute('data-saver-processed')) return;

        const videoId = extractVideoId(item);
        if (!videoId) return;

        let isNew = false;
        if (!savedVideos.has(videoId)) {
            isNew = saveVideoId(playlistId, videoId);
            savedVideos.add(videoId); // Add to local set to avoid redundant saves in current session
        }

        addIndicator(item, isNew);
        item.setAttribute('data-saver-processed', 'true');
    }

    let initialized = false;

    // Initialize the observer and processing
    function init() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        console.log('[YT Saver] Initializing for playlist:', playlistId);
        const savedVideos = getSavedVideos(playlistId);

        // Process existing items
        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        items.forEach(item => processVideoItem(item, playlistId, savedVideos));

        // Observe for dynamic loading (infinite scroll)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'YTD-PLAYLIST-VIDEO-RENDERER') {
                            processVideoItem(node, playlistId, savedVideos);
                        } else {
                            const subItems = node.querySelectorAll('ytd-playlist-video-renderer');
                            subItems.forEach(item => processVideoItem(item, playlistId, savedVideos));
                        }
                    }
                });
            });
        });

        const listContainer = document.querySelector('ytd-section-list-renderer#contents, ytd-playlist-video-list-renderer #contents');
        if (listContainer) {
            observer.observe(listContainer, { childList: true, subtree: true });
        }
    }

    // Handle SPA navigation (detect URL changes)
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            if (location.href.includes('/playlist?list=')) {
                // Remove processed attributes to re-scan
                document.querySelectorAll('[data-saver-processed]').forEach(el => el.removeAttribute('data-saver-processed'));
                setTimeout(init, 2000);
            }
        }
    }, 1000);

    // Initial run with retry for dynamic rendering
    let retryCount = 0;
    const checkReady = setInterval(() => {
        if (document.querySelector('ytd-playlist-video-renderer')) {
            clearInterval(checkReady);
            init();
        } else if (retryCount++ > 10) {
            clearInterval(checkReady);
        }
    }, 1500);

})();
