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
        const bar = element.querySelector('#engagement-bar');
        if (!bar) return;

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
            verticalAlign: 'middle'
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
            opacity: '0.7'
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

    /**
     * DOM Interaction to remove video
     */
    async function attemptRemoveVideo(videoContainer) {
        // 1. Find Action Menu Button (Three dots)
        const menuBtn = videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger'); // Fallback logic

        if (!menuBtn) {
            console.error('[YouTube Playlist Saver] Menu button not found.');
            return false;
        }

        menuBtn.click();

        // 2. Wait for Menu Popup
        const menuPopup = await waitForElement('ytd-menu-popup-renderer');
        if (!menuPopup) {
            console.error('[YouTube Playlist Saver] Popup not found.');
            return false;
        }

        // 3. Find "Remove from [Playlist]" option
        // Strategy: Look for the trash icon path or specific keywords if icons fail
        // Note: YouTube menu items are typically `ytd-menu-service-item-renderer`
        const items = Array.from(menuPopup.querySelectorAll('ytd-menu-service-item-renderer'));

        let targetItem = null;

        for (const item of items) {
            // Check text content
            const text = item.textContent || "";
            // Common languages: English, Japanese
            if (text.includes('Remove from') || text.includes('から削除')) {
                targetItem = item;
                break;
            }
            // Check icon path (Trash icon)
            const path = item.querySelector('path');
            if (path && path.getAttribute('d')?.startsWith('M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z')) {
                // Note: YouTube's trash icon path might vary. Text search is safer for "Remove from" context
                // Keeping logic simple: text search is usually sufficient for standard playlists
            }
        }

        // Strategy 2: If finding by text is ambiguous, usually the "Remove from..." is the trash icon item.
        // Let's refine text search to be safer.
        if (!targetItem) {
            // Fallback: specifically look for the Trash icon used in menus
            // Path often used by YouTube for delete/remove:
            const trashPaths = [
                "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z", // Standard material trash
                "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z" // Another common one
            ];
            targetItem = items.find(item => {
                const d = item.querySelector('path')?.getAttribute('d');
                return d && trashPaths.includes(d);
            });
        }

        if (targetItem) {
            targetItem.click();
            return true;
        } else {
            console.warn('[YouTube Playlist Saver] Remove option not found in menu.');
            // Close menu
            createIcon("").click(); // click anywhere else? actually clicking body might close it
            document.body.click(); // Attempt to close menu
            return false;
        }
    }

    /**
     * Utility: Wait for an element to appear
     */
    function waitForElement(selector, timeout = 1000) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver((mutations, obs) => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    obs.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    /**
     * Core processing logic for a single video renderer
     */
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
