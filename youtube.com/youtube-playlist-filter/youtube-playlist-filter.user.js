// ==UserScript==
// @name         YouTube Playlist Filter
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  YouTubeプレイリストのフィルタリング、状態表示、既知動画の判定（Saver連携）を行います。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
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

    // --- Config & State ---
    const PANEL_POS_KEY = 'yt_filter_panel_position';
    const PANEL_MIN_KEY = 'yt_filter_panel_minimized';

    let isMinimized = GM_getValue(PANEL_MIN_KEY, false);
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '70px', right: '20px' });

    let filterState = { title: '', channel: '' };
    let isFiltering = false;
    let isProcessing = false;

    // We keep a local set of matching IDs to avoid redundant Saver calls
    // But Saver is the source of truth.
    // Wait for Saver API
    let SaverAPI = window.YouTubePlaylistSaver;

    // --- Retry / Connection Logic ---
    function connectToSaver() {
        if (window.YouTubePlaylistSaver) {
            SaverAPI = window.YouTubePlaylistSaver;
            console.log('[YouTube Playlist Filter] Connected to Saver API.');
            run(); // Start main logic
        } else {
            // Listen for ready event
            window.addEventListener('YouTubePlaylistSaverReady', (e) => {
                SaverAPI = e.detail;
                console.log('[YouTube Playlist Filter] Connected to Saver API (Event).');
                run();
            }, { once: true });

            // Fallback polling (in case script load order mess up)
            setTimeout(() => {
                if (!SaverAPI && window.YouTubePlaylistSaver) {
                    SaverAPI = window.YouTubePlaylistSaver;
                    run();
                } else if (!SaverAPI) {
                    console.warn('[YouTube Playlist Filter] Saver API not found. Some features disabled.');
                    // Still run, but without saving? Or wait? 
                    // Better to run UI but show warning?
                    run();
                }
            }, 2000);
        }
    }

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

    // --- UI Creation ---

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

    const TRASH_ICON_PATHS = [
        "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
        "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z",
        "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z"
    ];

    function createPanel() {
        if (document.getElementById('yt-filter-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-filter-panel';

        // Initial Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#f4f4f4',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            width: '200px',
            color: '#333',
            fontFamily: 'Roboto, Arial, sans-serif'
        });

        // Restore Position
        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        // --- Header (Draggable) ---
        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
            cursor: 'move'
        });

        // Drag Logic
        let isDragging = false;
        let dragStartX, dragStartY;
        let initialLeft, initialTop;

        headerRow.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return; // Ignore button clicks
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const rect = panel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
            panel.style.left = `${initialLeft}px`;
            panel.style.top = `${initialTop}px`;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            panel.style.left = `${initialLeft + dx}px`;
            panel.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panelPos = {
                    top: panel.style.top,
                    left: panel.style.left,
                    bottom: '',
                    right: ''
                };
                GM_setValue(PANEL_POS_KEY, panelPos);
            }
        });

        const titleLabel = document.createElement('span');
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.0';
        titleLabel.textContent = `Playlist Filter v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' });

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        Object.assign(minimizeBtn.style, {
            cursor: 'pointer', background: 'none', border: 'none',
            fontSize: '16px', fontWeight: 'bold', padding: '0 4px', color: '#666'
        });

        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, {
            display: 'flex', flexDirection: 'column', gap: '8px'
        });

        // Minimize Logic
        const updatePanelMinState = (min) => {
            contentContainer.style.display = min ? 'none' : 'flex';
            minimizeBtn.textContent = min ? '+' : '−';
            isMinimized = min;
            GM_setValue(PANEL_MIN_KEY, min);
        };
        minimizeBtn.addEventListener('click', () => updatePanelMinState(!isMinimized));
        updatePanelMinState(isMinimized);

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(minimizeBtn);
        panel.appendChild(headerRow);
        panel.appendChild(contentContainer);

        // --- Filter Inputs ---
        const createInputGroup = (label, placeholder, key) => {
            const div = document.createElement('div');
            Object.assign(div.style, { display: 'flex', flexDirection: 'column', gap: '2px' });

            const row = document.createElement('div');
            Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

            const lbl = document.createElement('span');
            lbl.textContent = label;
            lbl.style.fontSize = '12px';
            lbl.style.fontWeight = 'bold';

            const clearBtn = document.createElement('button');
            clearBtn.textContent = '×';
            Object.assign(clearBtn.style, {
                fontSize: '14px', cursor: 'pointer', border: 'none', background: 'none', padding: '0 4px', color: '#999'
            });

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder;
            Object.assign(input.style, {
                width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box'
            });
            input.value = filterState[key];

            input.addEventListener('input', () => {
                filterState[key] = input.value;
                applyFilters();
            });

            clearBtn.addEventListener('click', () => {
                filterState[key] = '';
                input.value = '';
                applyFilters();
            });

            row.appendChild(lbl);
            row.appendChild(clearBtn);
            div.appendChild(row);
            div.appendChild(input);
            return div;
        };

        contentContainer.appendChild(createInputGroup('Title Filter', 'Filter by title...', 'title'));
        contentContainer.appendChild(createInputGroup('Channel Filter', 'Filter by channel...', 'channel'));

        // --- Status Counts ---
        const countDiv = document.createElement('div');
        countDiv.id = 'yt-filter-count';
        countDiv.textContent = 'Results: - / -';
        countDiv.style.fontSize = '12px';
        contentContainer.appendChild(countDiv);

        const statusContainer = document.createElement('div');
        Object.assign(statusContainer.style, { fontSize: '11px', color: '#666', display: 'flex', flexDirection: 'column' });

        ['Saver', 'Filtering', 'Processing'].forEach(key => {
            const d = document.createElement('div');
            d.id = `yt-filter-status-${key.toLowerCase()}`;
            d.textContent = `${key}: Idle`;
            statusContainer.appendChild(d);
        });
        contentContainer.appendChild(statusContainer);

        // --- Remove Above ---
        const removeAboveBtn = document.createElement('button');
        removeAboveBtn.id = 'yt-filter-remove-above-btn';
        removeAboveBtn.textContent = 'Remove Above';
        Object.assign(removeAboveBtn.style, {
            padding: '4px 8px', fontSize: '11px', backgroundColor: '#d00',
            color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
        });

        const aboveDiv = document.createElement('div');
        aboveDiv.id = 'yt-filter-above-info';
        aboveDiv.textContent = 'Above: None';
        aboveDiv.style.fontSize = '11px';
        aboveDiv.style.marginBottom = '2px';

        removeAboveBtn.addEventListener('click', removeAboveItems);

        contentContainer.appendChild(document.createElement('hr'));
        contentContainer.appendChild(aboveDiv);
        contentContainer.appendChild(removeAboveBtn);

        document.body.appendChild(panel);
    }

    // --- Main Logic: Scanning & Indicators & Filtering ---

    // Set of IDs fully processed by UI (indicator added, status checked)
    const processedSet = new Set();
    const itemsAboveSet = new Set();
    let scrollHandler = null;

    function applyFilters() {
        isFiltering = true;
        updateStatus('filtering', true);

        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        let visible = 0;

        const titleLower = filterState.title.toLowerCase();
        const channelLower = filterState.channel.toLowerCase();

        items.forEach(item => {
            const titleEl = item.querySelector('#video-title');
            const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

            const channelEl = item.querySelector('.ytd-channel-name a') || item.querySelector('#channel-name #text');
            const channel = channelEl ? channelEl.textContent.trim().toLowerCase() : '';

            const matchTitle = !titleLower || title.includes(titleLower);
            const matchChannel = !channelLower || channel.includes(channelLower);

            if (matchTitle && matchChannel) {
                item.style.display = '';
                visible++;
            } else {
                item.style.display = 'none';
            }
        });

        // Update Counts
        const countEl = document.getElementById('yt-filter-count');
        if (countEl) countEl.textContent = `Results: ${visible} / ${items.length}`;

        updateStatus('filtering', false);
        // Delay Update Above Info to allow layout reflow
        setTimeout(updateAboveInfo, 100);
    }

    // Update individual visual indicator
    function renderIndicator(element, isNew) {
        // Find metadata bar
        let bar = element.querySelector('#engagement-bar') ||
            element.querySelector('.ytd-video-meta-block') ||
            element.querySelector('#meta');

        if (!bar) return;

        // Clean old
        const oldInd = bar.querySelector('.yt-filter-indicator');
        if (oldInd) oldInd.remove();
        const oldBtn = bar.querySelector('.yt-filter-remove-btn');
        if (oldBtn) oldBtn.remove();

        // Indicator
        const indicator = document.createElement('span');
        indicator.className = 'yt-filter-indicator';
        indicator.textContent = isNew ? ' [NEW] ' : ' [SAVED] ';
        Object.assign(indicator.style, {
            fontSize: '11px', fontWeight: 'bold', marginRight: '8px',
            color: isNew ? '#3ea6ff' : '#2ba640', verticalAlign: 'middle'
        });

        // Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'yt-filter-remove-btn';
        removeBtn.title = 'Remove from playlist';
        Object.assign(removeBtn.style, {
            background: 'none', border: 'none', cursor: 'pointer', padding: '0',
            marginLeft: '8px', verticalAlign: 'middle', opacity: '0.7'
        });
        removeBtn.appendChild(createIcon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', '#606060'));

        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const success = await attemptRemoveVideo(element);
            if (success) {
                element.style.opacity = '0.3';
                element.style.pointerEvents = 'none';
            } else {
                alert('Remove failed. Menu structure might have changed.');
            }
        });

        bar.prepend(removeBtn);
        bar.prepend(indicator);
    }

    async function attemptRemoveVideo(videoContainer) {
        const menuBtn = videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger');
        if (!menuBtn) return false;

        menuBtn.click();

        // Polling for popup
        const START = Date.now();
        while (Date.now() - START < 5000) {
            const popup = document.querySelector('ytd-menu-popup-renderer');
            if (popup) {
                // Find "Remove" item
                const items = Array.from(popup.querySelectorAll('ytd-menu-service-item-renderer'));
                for (const item of items) {
                    const text = item.textContent || "";
                    if (text.includes('Remove from') || text.includes('から削除')) {
                        item.click();
                        document.body.click(); // close menu
                        return true;
                    }
                    // Icon check
                    const path = item.querySelector('path');
                    if (path && TRASH_ICON_PATHS.includes(path.getAttribute('d'))) {
                        item.click();
                        document.body.click();
                        return true;
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
        document.body.click(); // close if fail
        return false;
    }

    function scan() {
        const playlistId = getPlaylistId();
        if (!playlistId) return;

        // If Saver is not available, we can't determine status accurately.
        // We will default to "SAVED" visually or just skip marking "NEW" unless we are sure?
        // Actually if Saver is missing, we can't save. So everything effectively is "New" but unsaveable.
        // We'll show "??" or just gray.
        if (!SaverAPI) updateStatus('saver', false); // Idle/Error

        const items = document.querySelectorAll('ytd-playlist-video-renderer');

        items.forEach(item => {
            if (processedSet.has(item)) return; // Already rendered

            const vid = extractVideoId(item);
            if (!vid) return;

            // Saver Check
            let isNew = false;
            if (SaverAPI) {
                const title = item.querySelector('#video-title')?.textContent?.trim() || null;
                const channel = item.querySelector('.ytd-channel-name a')?.textContent?.trim() || null;

                // save() returns true if it WAS new
                isNew = SaverAPI.save(playlistId, vid, title, channel);
            }

            renderIndicator(item, isNew);
            processedSet.add(item);

            // Observe for "Above" logic
            observerForabove.observe(item);
        });

        // Update counts occasionally
        const count = items.length;
        const visible = document.querySelectorAll('ytd-playlist-video-renderer:not([style*="display: none"])').length;
        const countEl = document.getElementById('yt-filter-count');
        if (countEl) countEl.textContent = `Results: ${visible} / ${count}`;
    }

    // --- Above Logic ---
    const observerForabove = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const rect = entry.boundingClientRect;
            // Rough check for "Above"
            if (!entry.isIntersecting && rect.bottom < 180) {
                itemsAboveSet.add(entry.target);
            } else {
                itemsAboveSet.delete(entry.target);
            }
        });
        updateAboveInfo();
    }, { root: null, threshold: 0 });

    function updateAboveInfo() {
        const div = document.getElementById('yt-filter-above-info');
        if (!div) return;

        const aboveCount = itemsAboveSet.size;
        div.textContent = `Above: ${aboveCount} items`;
    }

    async function removeAboveItems() {
        if (!confirm('Remove all items currently filtered and scrolled past (Above)?')) return;

        isProcessing = true;
        updateStatus('processing', true);

        const itemsToRemove = Array.from(itemsAboveSet).filter(el => el.style.display !== 'none');

        for (const item of itemsToRemove) {
            const success = await attemptRemoveVideo(item);
            if (success) {
                itemsAboveSet.delete(item);
                item.remove(); // Remove from DOM
            }
            await new Promise(r => setTimeout(r, 500)); // Delay
        }

        isProcessing = false;
        updateStatus('processing', false);
        // Reset observer/sets?
        // itemsAboveSet is monitored live, but since we removed them from DOM, they are gone.
    }

    // --- Status Helper ---
    function updateStatus(type, isActive) {
        const el = document.getElementById(`yt-filter-status-${type}`);
        if (el) {
            el.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${isActive ? 'Active' : 'Idle'}`;
            el.style.color = isActive ? '#d00' : '#2ba640';
        }
    }

    // --- Initialization ---

    function run() {
        createPanel();

        // Loop Scan
        setInterval(scan, 2000); // 2s scan
        setInterval(applyFilters, 5000); // Re-apply filter periodically to catch new items

        // Scroll Listener for Scan throttling?
        // We just use Interval for simplicity now, as DOM access is cheap enough.

        console.log('[YouTube Playlist Filter] Running...');
    }

    // Navigation Handling
    window.addEventListener('yt-navigate-finish', () => {
        // Reset state on navigation
        processedSet.clear();
        itemsAboveSet.clear();
        // Re-run
        setTimeout(run, 1000);
    });

    // Start
    connectToSaver();

})();
