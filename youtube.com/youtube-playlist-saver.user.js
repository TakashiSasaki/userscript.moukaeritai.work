// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.1.5
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

    // --- Performance Optimization: Batching & Caching ---
    let cachedData = null;
    let pendingSaveTimeout = null;

    function loadStorage() {
        if (cachedData) return cachedData;
        cachedData = GM_getValue(DATA_KEY, {});
        return cachedData;
    }

    function requestSave() {
        if (pendingSaveTimeout) clearTimeout(pendingSaveTimeout);
        pendingSaveTimeout = setTimeout(() => {
            GM_setValue(DATA_KEY, cachedData);
            console.log('[YouTube Playlist Saver] Batch save completed.');
            pendingSaveTimeout = null;
        }, 2000);
    }

    function getPlaylistId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('list');
    }

    function getSavedVideos(playlistId) {
        const data = loadStorage();
        return new Set(data[playlistId] || []);
    }

    function queueVideoId(playlistId, videoId) {
        const data = loadStorage();
        const list = data[playlistId] || [];
        if (!list.includes(videoId)) {
            list.push(videoId);
            data[playlistId] = list;
            requestSave();
            return true;
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

    function renderIndicator(element, isNew) {
        const bar = element.querySelector('#engagement-bar');
        if (!bar) return;

        const oldIndicator = bar.querySelector('.yt-saver-indicator');
        if (oldIndicator) oldIndicator.remove();

        const indicator = document.createElement('span');
        indicator.className = 'yt-saver-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';

        Object.assign(indicator.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            marginRight: '8px',
            color: isNew ? '#3ea6ff' : '#2ba640'
        });

        bar.prepend(indicator);
    }

    function processItem(item, playlistId, currentSessionSet) {
        if (item.dataset.saverProcessed === playlistId) return;

        const videoId = extractVideoId(item);
        if (!videoId) return;

        let isNew = false;
        if (!currentSessionSet.has(videoId)) {
            const queued = queueVideoId(playlistId, videoId);
            if (queued) {
                isNew = true;
                currentSessionSet.add(videoId);
            }
        }

        renderIndicator(item, isNew);
        item.dataset.saverProcessed = playlistId;
    }

    // --- Auto Scroll Feature ---

    let scrollInterval = null;
    const SCROLL_STEP = 300;
    const SCROLL_DELAY = 500;

    function toggleAutoScroll(btn) {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            btn.textContent = 'Auto Scroll: OFF';
            btn.style.backgroundColor = '#ccc';
            btn.style.color = '#000';
        } else {
            btn.textContent = 'Auto Scroll: ON';
            btn.style.backgroundColor = '#f00';
            btn.style.color = '#fff';
            scrollInterval = setInterval(() => {
                window.scrollBy(0, SCROLL_STEP);
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

    function run() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        console.log(`[YouTube Playlist Saver] Processing playlist: ${playlistId}`);
        addAutoScrollButton();

        // Use local Cache
        const currentSessionSet = getSavedVideos(playlistId);

        const processAllVisible = () => {
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => processItem(item, playlistId, currentSessionSet));
        };

        processAllVisible();

        if (window._ytSaverObserver) window._ytSaverObserver.disconnect();

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'YTD-PLAYLIST-VIDEO-RENDERER') {
                            processItem(node, playlistId, currentSessionSet);
                        } else {
                            const subItems = node.querySelectorAll('ytd-playlist-video-renderer');
                            subItems.forEach(item => processItem(item, playlistId, currentSessionSet));
                        }
                    }
                }
            }
        });

        const listContainer = document.querySelector('ytd-playlist-video-list-renderer #contents') || document.body;
        observer.observe(listContainer, { childList: true, subtree: true });

        window._ytSaverObserver = observer;
    }

    // --- Navigation Handling ---

    window.addEventListener('yt-navigate-finish', () => {
        // Flush pending save
        if (pendingSaveTimeout) {
            clearTimeout(pendingSaveTimeout);
            GM_setValue(DATA_KEY, cachedData);
            pendingSaveTimeout = null;
        }

        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            const btn = document.getElementById('yt-saver-scroll-btn');
            if (btn) btn.remove();
        }

        if (window._ytSaverObserver) window._ytSaverObserver.disconnect();
        run();
    });

    run();

})();
