// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.1.1
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

    const DATA_KEY = 'yt_playlist_data';

    /**
     * Get current playlist ID from URL
     */
    function getPlaylistId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('list');
    }

    /**
     * Load saved videos for a specific playlist
     */
    function getSavedVideos(playlistId) {
        const data = GM_getValue(DATA_KEY, {});
        return new Set(data[playlistId] || []);
    }

    /**
     * Save a new video ID for a specific playlist
     */
    function saveVideoId(playlistId, videoId) {
        const data = GM_getValue(DATA_KEY, {});
        const list = data[playlistId] || [];
        if (!list.includes(videoId)) {
            list.push(videoId);
            data[playlistId] = list;
            GM_setValue(DATA_KEY, data);
            return true;
        }
        return false;
    }

    /**
     * Extract Video ID from the element
     */
    function extractVideoId(element) {
        // Typically inside <a id="video-title"> or <a id="thumbnail">
        const anchor = element.querySelector('a#video-title') || element.querySelector('a#thumbnail');
        if (anchor) {
            const href = anchor.getAttribute('href');
            // href format: /watch?v=VIDEO_ID&list=...
            const match = href && href.match(/[?&]v=([^&]+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    /**
     * Render the status indicator
     */
    function renderIndicator(element, isNew) {
        const bar = element.querySelector('#engagement-bar');
        if (!bar) return;

        // Clean up previous indicator if exists
        const oldIndicator = bar.querySelector('.yt-saver-indicator');
        if (oldIndicator) oldIndicator.remove();

        const indicator = document.createElement('span');
        indicator.className = 'yt-saver-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';

        // Style
        Object.assign(indicator.style, {
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '8px',
            color: isNew ? '#3ea6ff' : '#2ba640' // Blue for new, Green for saved
        });

        bar.prepend(indicator);
    }

    /**
     * Core processing logic for a single video renderer
     */
    function processItem(item, playlistId, localSavedSet) {
        // Skip if already processed in this runtime session to save resources
        if (item.dataset.saverProcessed === playlistId) return;

        const videoId = extractVideoId(item);
        if (!videoId) return;

        let isNew = false;
        // Check against our local set (which reflects DB state)
        if (!localSavedSet.has(videoId)) {
            const saved = saveVideoId(playlistId, videoId);
            if (saved) {
                isNew = true;
                localSavedSet.add(videoId);
            }
        }

        renderIndicator(item, isNew);
        item.dataset.saverProcessed = playlistId;
    }

    /**
     * Main execution function
     */
    function run() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        console.log(`[YouTube Playlist Saver] Running for playlist: ${playlistId}`);
        const savedVideos = getSavedVideos(playlistId);

        // Function to process all currently visible items
        const processAll = () => {
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => processItem(item, playlistId, savedVideos));
        };

        // 1. Process immediately
        processAll();

        // 2. Set up MutationObserver for infinite scroll & dynamic loading
        // Observing `ytd-playlist-video-list-renderer` or a high-level container is best.
        // We observe document.body to be safe as containers are dynamic.
        // Optimizing by targeting specific tag names in the callback.
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        // Check if the added node is a video item or contains one
                        if (node.tagName === 'YTD-PLAYLIST-VIDEO-RENDERER' ||
                            node.querySelector?.('ytd-playlist-video-renderer')) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
                if (shouldProcess) break;
            }
            if (shouldProcess) {
                processAll();
            }
        });

        const listContainer = document.querySelector('ytd-playlist-video-list-renderer') || document.body;
        observer.observe(listContainer, { childList: true, subtree: true });

        // Store observer to disconnect later if needed (e.g. on navigation)
        window._ytSaverObserver = observer;
    }

    // --- Initialization & Navigation Handling ---

    // YouTube uses a custom event `yt-navigate-finish` for SPA navigation
    window.addEventListener('yt-navigate-finish', () => {
        if (window._ytSaverObserver) {
            window._ytSaverObserver.disconnect();
        }
        run();
    });

    // Initial run
    run();

})();
