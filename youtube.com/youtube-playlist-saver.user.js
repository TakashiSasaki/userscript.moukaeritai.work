// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.1.17
// @description  YouTubeのプレイリストに含まれる動画IDを記録・管理します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?list=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-saver.user.js
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

        // 2. Wait for Menu Popup (Increased timeout to 3000ms)
        const menuPopup = await waitForElement('ytd-menu-popup-renderer', 3000);
        if (!menuPopup) {
            console.error('[YouTube Playlist Saver] Popup not found.');
            return false;
        }

        // 3. Find "Remove from [Playlist]" option with retry (Polling)
        // YouTube menus might render content slightly after the popup container appears.
        const findTargetItem = () => {
            const items = Array.from(menuPopup.querySelectorAll('ytd-menu-service-item-renderer'));
            for (const item of items) {
                // Check text content
                const text = item.textContent || "";
                if (text.includes('Remove from') || text.includes('から削除')) {
                    return item;
                }
                // Check icon path (Trash icon)
                const path = item.querySelector('path');
                // Standard material trash path or variants
                const trashPaths = [
                    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
                    "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z"
                ];
                if (path) {
                    const d = path.getAttribute('d');
                    if (d && trashPaths.includes(d)) return item;
                }
            }
            return null;
        };

        let targetItem = null;
        const POLL_RETRIES = 20; // 20 * 100ms = 2000ms wait for content
        for (let i = 0; i < POLL_RETRIES; i++) {
            targetItem = findTargetItem();
            if (targetItem) break;
            await new Promise(r => setTimeout(r, 100));
        }

        // Legacy fallback logic removed as it's now covered by the polling finder

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
        }
    }

    // --- Filter Feature ---

    // --- Filter Feature ---

    const FILTER_SETTINGS_KEY = 'yt_filter_settings';

    let filterState = GM_getValue(FILTER_SETTINGS_KEY, {
        title: '',
        channel: ''
    });

    function saveFilterState() {
        GM_setValue(FILTER_SETTINGS_KEY, filterState);
    }

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
            gap: '8px',
            width: '200px',
            color: '#333',
            fontFamily: 'Roboto, Arial, sans-serif'
        });

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
                saveFilterState();
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

        panel.appendChild(titleGroup);
        panel.appendChild(channelGroup);
        panel.appendChild(countDiv);
        panel.appendChild(aboveDiv);
        panel.appendChild(removeAboveBtn);

        document.body.appendChild(panel);
        applyFilters(); // Initial count

        // Scroll listener for "Above" info
        window.addEventListener('scroll', throttle(() => {
            updateAboveInfo();
        }, 200));
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

        const btn = document.getElementById('yt-saver-remove-above-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Removing...';
            btn.style.opacity = '0.5';
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Scroll into view gently
            item.scrollIntoView({ block: 'center', behavior: 'instant' });
            await new Promise(r => setTimeout(r, 100)); // Small wait after scroll

            try {
                const success = await attemptRemoveVideo(item);
                if (!success) {
                    console.warn(`[YouTube Playlist Saver] Failed to remove item index ${i}`);
                }
            } catch (err) {
                console.error(`[YouTube Playlist Saver] Exception removing item index ${i}`, err);
            }

            // Delay between actions to prevent rate limiting or UI glitches
            await new Promise(r => setTimeout(r, 1000));
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Remove Above';
            btn.style.opacity = '1';
        }

        // Update info after removal
        applyFilters();
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

    function applyFilters() {
        const items = document.querySelectorAll('ytd-playlist-video-renderer');

        items.forEach(item => {
            // 1. Get Title
            const titleEl = item.querySelector('#video-title');
            const titleText = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

            // 2. Get Channel Name
            // Usually found in #channel-name or a.yt-simple-endpoint.yt-formatted-string
            const channelEl = item.querySelector('.ytd-channel-name a') ||
                item.querySelector('#channel-name #text');
            const channelText = channelEl ? channelEl.textContent.trim().toLowerCase() : '';

            // 3. Check Matches
            const matchTitle = !filterState.title || titleText.includes(filterState.title);
            const matchChannel = !filterState.channel || channelText.includes(filterState.channel);

            if (matchTitle && matchChannel) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        updateResultCount();
        updateAboveInfo(); // Update above info when filters change
    }

    /**
     * Core processing logic for a single video renderer
     */
    function processItem(item, playlistId, currentSessionSet) {
        // Apply filter immediately for new items
        const titleEl = item.querySelector('#video-title');
        const titleText = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
        const channelEl = item.querySelector('.ytd-channel-name a') || item.querySelector('#channel-name #text');
        const channelText = channelEl ? channelEl.textContent.trim().toLowerCase() : '';

        const matchTitle = !filterState.title || titleText.includes(filterState.title);
        const matchChannel = !filterState.channel || channelText.includes(filterState.channel);

        if (!(matchTitle && matchChannel)) {
            item.style.display = 'none';
        } else {
            item.style.display = '';
        }

        // REMOVED O(N^2) COUNT UPDATE FROM HERE

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

    async function run() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        console.log(`[YouTube Playlist Saver] Processing playlist: ${playlistId}`);
        addAutoScrollButton();
        createFilterPanel();

        // Use local Cache
        const currentSessionSet = getSavedVideos(playlistId);

        const processAllVisible = () => {
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => processItem(item, playlistId, currentSessionSet));
            updateResultCount(); // Update count ONCE after batch processing
        };

        processAllVisible();

        if (window._ytSaverObserver) window._ytSaverObserver.disconnect();

        // Target the specific playlist container
        let listContainer = document.querySelector('ytd-playlist-video-list-renderer #contents');
        if (!listContainer) {
            // Wait for it slightly if not immediately available (e.g. soft nav)
            listContainer = await waitForElement('ytd-playlist-video-list-renderer #contents', 5000);
        }

        if (!listContainer) {
            console.warn('[YouTube Playlist Saver] Playlist container not found. Observer not started to save performance.');
            return;
        }

        // Lazy Observer: Just re-scan everything slightly throttled when mutations occur.
        // This is much lighter than analyzing every mutation record if we just want to catch new items.
        // And since processItem is safe to call repeatedly, this works well.
        const throttledProcess = throttle(() => {
            processAllVisible();
        }, 1000);

        const observer = new MutationObserver((mutations) => {
            // Check if any added nodes are relevant? 
            // Or just blindly run throttled process.
            // Let's just run. The throttle protects us.
            throttledProcess();
        });

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
            if (btn) btn.remove(); // Re-add in run()
        }

        const filterPanel = document.getElementById('yt-saver-filter-panel');
        if (filterPanel) filterPanel.remove();

        if (window._ytSaverObserver) window._ytSaverObserver.disconnect();
        run();
    });

    run();

})();
