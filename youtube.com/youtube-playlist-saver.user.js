// ==UserScript==
// @name         YouTube Playlist Saver
// @namespace    userscript.moukaeritai.work
// @version      0.2.6
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
    const DATA_VERSION = 1;

    // --- Performance Optimization: Batching & Caching ---
    let cachedStorage = null; // Stores { version: N, playlists: { ... } }
    let pendingSaveTimeout = null;

    function loadStorage() {
        if (cachedStorage) return cachedStorage.playlists;
        
        let rawData = GM_getValue(DATA_KEY, {});

        // Migration logic: Check if it's the old format (no version)
        if (rawData.version === undefined) {
            console.log('[YouTube Playlist Saver] Migrating data to Version ' + DATA_VERSION);
            // Wrap existing data (which is just the playlists map) into the new structure
            cachedStorage = {
                version: DATA_VERSION,
                playlists: rawData
            };
            // Save immediately to persist the migration
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

    function getPlaylistId() {
        if (window.location.pathname !== '/playlist') return null;
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

    // --- Import Feature ---

    function mergeImportedData(importedData) {
        if (!importedData || importedData.version < 1 || !importedData.playlists) {
            alert('[YouTube Playlist Saver] Import failed: Invalid data format. Only Version 1+ is supported.');
            return;
        }

        const localPlaylists = loadStorage(); // Returns reference to cachedStorage.playlists
        let addedCount = 0;

        for (const [plId, videos] of Object.entries(importedData.playlists)) {
            if (!Array.isArray(videos)) continue;

            if (!localPlaylists[plId]) {
                localPlaylists[plId] = [];
            }

            const currentSet = new Set(localPlaylists[plId]);
            
            for (const vid of videos) {
                if (!currentSet.has(vid)) {
                    localPlaylists[plId].push(vid);
                    addedCount++;
                }
            }
        }

        if (addedCount > 0) {
            requestSave();
            alert(`[YouTube Playlist Saver] Import successful! Merged ${addedCount} new video ID(s).`);
            
            // Refresh view if needed
            const items = document.querySelectorAll('ytd-playlist-video-renderer');
            items.forEach(item => {
                delete item.dataset.saverProcessed; // Force re-scan on next observer trigger
            });
        } else {
            alert('[YouTube Playlist Saver] Import finished. No new data found.');
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

    function onImportMenuClick() {
        const lastUrl = GM_getValue('yt_last_import_url', '');
        const url = prompt("YouTube Playlist Saver\n\nEnter the URL of the JSON data to import (Version 1+):", lastUrl);
        if (url && url.trim().startsWith('http')) {
            const cleanUrl = url.trim();
            GM_setValue('yt_last_import_url', cleanUrl);
            importDataFromUrl(cleanUrl);
        } else if (url) {
            alert('Invalid URL. Must start with http.');
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
        GM_registerMenuCommand("Copy Data to Clipboard", onExportToClipboardClick);
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
                    "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z",
                    "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z"
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


        if (targetItem) {
            targetItem.click();
            return true;
        } else {
            console.warn('[YouTube Playlist Saver] Remove option not found in menu.');
            // Close menu
            document.body.click(); // Attempt to close menu
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
        }
    }

    // --- Filter Feature ---

    // --- Filter Feature ---

    const FILTER_SETTINGS_KEY = 'yt_filter_settings';

    let filterState = GM_getValue(FILTER_SETTINGS_KEY, {
        title: '',
        channel: ''
    });

    let isProcessing = false;
    let isFiltering = false;
    let statusInterval = null;
    let scrollHandler = null;

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

        panel.appendChild(titleGroup);
        panel.appendChild(channelGroup);
        panel.appendChild(countDiv);
        panel.appendChild(statusCountsDiv);
        panel.appendChild(spinnerStatusDiv);

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
        panel.appendChild(filteringStatusDiv);

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
        panel.appendChild(processingStatusDiv);

        panel.appendChild(aboveDiv);
        panel.appendChild(removeAboveBtn);

        // --- Auto Scroll Settings UI ---
        const separator = document.createElement('hr');
        Object.assign(separator.style, { border: '0', borderTop: '1px solid #ddd', margin: '8px 0', width: '100%' });
        panel.appendChild(separator);

        const asHeader = document.createElement('div');
        asHeader.textContent = 'Auto Scroll Settings';
        Object.assign(asHeader.style, { fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' });
        panel.appendChild(asHeader);

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
        panel.appendChild(asCheckboxContainer);

        panel.appendChild(stepInputObj.container);
        panel.appendChild(intervalInputObj.container);

        document.body.appendChild(panel);
        applyFilters(); // Initial count
        updateStatusCounts(); // Initial stats

        // Scroll listener for "Above" info
        scrollHandler = throttle(() => {
            updateAboveInfo();
        }, 200);
        window.addEventListener('scroll', scrollHandler);

        // Real-time status check
        statusInterval = setInterval(() => {
            const isActive = isSpinnerActive();
            spinnerStatusDiv.textContent = isActive ? 'Spinner: Active' : 'Spinner: Idle';
            spinnerStatusDiv.style.color = isActive ? '#d00' : '#2ba640';

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
            
            // Periodically update counts to catch up with any missed changes
            updateStatusCounts();
        }, 500);
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

                // Scroll into view gently
                item.scrollIntoView({ block: 'center', behavior: 'instant' });
                await new Promise(r => setTimeout(r, 100)); // Small wait after scroll

                // Wait for spinner to disappear if active
                await waitUntilSpinnerDisappears();

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
                
                // Update stats during removal
                updateStatusCounts();
            }
        } finally {
            isProcessing = false; // End processing
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


    function applyFilterToItem(item) {
        // 1. Get Title
        const titleEl = item.querySelector('#video-title');
        const titleText = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

        // 2. Get Channel Name
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
             el.innerHTML = `<span style="color:#3ea6ff">New: ${newCount}</span> | <span style="color:#2ba640">Saved: ${savedCount}</span>`;
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
        const btn = document.getElementById('yt-saver-scroll-btn');
        // Only restart if currently active (interval exists)
        if (btn && scrollInterval) {
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

    function cleanupUI() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
        if (scrollHandler) {
            window.removeEventListener('scroll', scrollHandler);
            scrollHandler = null;
        }
        const scrollBtn = document.getElementById('yt-saver-scroll-btn');
        if (scrollBtn) scrollBtn.remove();

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
            GM_setValue(DATA_KEY, cachedData);
            pendingSaveTimeout = null;
        }

        cleanupUI();
        run();
    });

    run();

})();
