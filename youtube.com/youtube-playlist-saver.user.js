// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.1.4
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

    // --- Auto Scroll Feature ---

    let scrollInterval = null;
    const SCROLL_STEP = 300; // pixels
    const SCROLL_DELAY = 500; // ms

    function toggleAutoScroll(btn) {
        if (scrollInterval) {
            // Stop
            clearInterval(scrollInterval);
            scrollInterval = null;
            btn.textContent = 'Auto Scroll: OFF';
            btn.style.backgroundColor = '#ccc';
            btn.style.color = '#000';
        } else {
            // Start
            btn.textContent = 'Auto Scroll: ON';
            btn.style.backgroundColor = '#f00'; // YouTube Red
            btn.style.color = '#fff';
            scrollInterval = setInterval(() => {
                window.scrollBy(0, SCROLL_STEP);
                // Also check if we hit bottom and need to wait for loading? 
                // YouTube infinite scroll handles loading, we just keep nudging down.
            }, SCROLL_DELAY);
        }
    }

    function addAutoScrollButton() {
        if (document.getElementById('yt-saver-scroll-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'yt-saver-scroll-btn';
        btn.textContent = 'Auto Scroll: OFF';
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '10px 15px',
            backgroundColor: '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        });

        btn.addEventListener('click', () => toggleAutoScroll(btn));
        document.body.appendChild(btn);
    }

    /**
     * Main execution function
     */
    function run() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        console.log(`[YouTube Playlist Saver] Running for playlist: ${playlistId}`);

        // Inject UI
        addAutoScrollButton();

        const savedVideos = getSavedVideos(playlistId);

        // Function to process all currently visible items
        const processAll = () => {
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => processItem(item, playlistId, savedVideos));
        };

        // 1. Process immediately
        processAll();

        // 2. Set up MutationObserver for infinite scroll & dynamic loading
        if (window._ytSaverObserver) window._ytSaverObserver.disconnect();

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
        // Reset auto scroll on navigation
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            const btn = document.getElementById('yt-saver-scroll-btn');
            if (btn) btn.remove(); // Re-add in run()
        }
        if (window._ytSaverObserver) {
            window._ytSaverObserver.disconnect();
        }
        run();
    });

    // Initial run
    run();

})();
