// ==UserScript==
// @name         YouTube Playlist Filter
// @namespace    userscript.moukaeritai.work
// @version      0.1.10
// @description  YouTubeプレイリストのフィルタリング、状態表示(MATCHED)、一括削除機能を提供します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1' || location.hostname === 'fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev') {
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
    const PLAYLIST_PATH = '/playlist';
    const PANEL_POS_KEY = 'yt_filter_panel_position';
    let isActive = false;
    let filterIntervalId = null;
    let observerInitTimerId = null;
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '70px', right: '20px' });

    let filterState = { title: '', channel: '' };
    let isFiltering = false;
    let isInputActive = false; // Flag to pause filtering during input

    let listObserver = null;
    let observerForRange = null;

    function isPlaylistPage() {
        return location.hostname === 'www.youtube.com' &&
            location.pathname === PLAYLIST_PATH &&
            location.search.length > 1;
    }

    // --- UI Creation ---

    // --- UI Creation ---

    function createPanel() {
        if (document.getElementById('yt-filter-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-filter-panel';

        // Initial Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#fff4e5',
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
            if (e.target.tagName === 'BUTTON') return;
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
                panelPos = { top: panel.style.top, left: panel.style.left, bottom: '', right: '' };
                GM_setValue(PANEL_POS_KEY, panelPos);
            }
        });

        const titleLabel = document.createElement('span');
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.10';
        titleLabel.textContent = `Playlist Filter v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' });

        const statusLabel = document.createElement('span');
        statusLabel.id = 'yt-filter-active-indicator';
        statusLabel.textContent = 'Inactive';
        Object.assign(statusLabel.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: '#e0e0e0',
            color: '#666'
        });

        const contentContainer = document.createElement('div');
        contentContainer.id = 'yt-filter-panel-content';
        Object.assign(contentContainer.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(statusLabel);
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

            // Pause filtering on focus
            input.addEventListener('focus', () => {
                isInputActive = true;
            });

            // Resume and apply on blur
            input.addEventListener('blur', () => {
                isInputActive = false;
                filterState[key] = input.value;
                applyFilters();
            });

            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    isInputActive = false; // Temporarily allow filter
                    filterState[key] = input.value;
                    input.blur(); // Trigger blur to apply
                }
            });

            clearBtn.addEventListener('click', () => {
                filterState[key] = '';
                input.value = '';
                isInputActive = false;
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

        // Apply Button
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply Filter';
        Object.assign(applyBtn.style, {
            width: '100%', padding: '6px', fontSize: '12px', cursor: 'pointer',
            backgroundColor: '#065fd4', color: 'white', border: 'none', borderRadius: '4px',
            marginTop: '4px'
        });
        applyBtn.addEventListener('click', () => {
            isInputActive = false;
            applyFilters();
        });
        contentContainer.appendChild(applyBtn);

        const statusContainer = document.createElement('div');
        Object.assign(statusContainer.style, { fontSize: '11px', color: '#666', display: 'flex', flexDirection: 'column' });

        ['Filtering'].forEach(key => {
            const d = document.createElement('div');
            d.id = `yt-filter-status-${key.toLowerCase()}`;
            d.textContent = `${key}: Idle`;
            statusContainer.appendChild(d);
        });
        contentContainer.appendChild(statusContainer);

        const rangeDiv = document.createElement('div');
        rangeDiv.id = 'yt-filter-range-info';
        rangeDiv.textContent = 'Range: None';
        rangeDiv.style.fontSize = '11px';
        rangeDiv.style.marginBottom = '2px';

        contentContainer.appendChild(document.createElement('hr'));
        contentContainer.appendChild(rangeDiv);

        document.body.appendChild(panel);
    }

    // --- Main Logic: Filtering & Matching Indicator ---

    const itemsAboveSet = new Set();
    const itemsVisibleSet = new Set();

    function renderMatchedIndicator(element, isMatched) {
        let bar = element.querySelector('#engagement-bar') ||
            element.querySelector('.ytd-video-meta-block') ||
            element.querySelector('#meta');

        if (!bar) return;

        const oldMatch = bar.querySelector('.yt-filter-matched');
        if (oldMatch) oldMatch.remove();

        if (isMatched) {
            const badge = document.createElement('span');
            badge.className = 'yt-filter-matched';
            badge.textContent = ' [MATCHED] ';
            Object.assign(badge.style, {
                fontSize: '11px', fontWeight: 'bold', marginRight: '8px',
                color: 'orange', verticalAlign: 'middle'
            });
            // We prepend, but if Saver also prepends, they stack.
            // Saver prepends [NEW]/[SAVED]. Filter prepends [MATCHED].
            // Order depends on which runs last or how prepend works (LIFO).
            // If both use prepend, the *last* one executed appears *first*.
            // Ideally we want [MATCHED] [NEW] or similar.
            bar.prepend(badge);
        }
    }

    function ensureRangeObserver() {
        if (observerForRange) return;

        observerForRange = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const rect = entry.boundingClientRect;
                if (entry.isIntersecting) {
                    itemsVisibleSet.add(entry.target);
                    itemsAboveSet.delete(entry.target);
                } else if (rect.bottom < 180) { // Still using 180 as threshold for "Above"
                    itemsAboveSet.add(entry.target);
                    itemsVisibleSet.delete(entry.target);
                } else {
                    // Below viewport
                    itemsAboveSet.delete(entry.target);
                    itemsVisibleSet.delete(entry.target);
                }
            });
            updateRangeInfo();
        }, { root: null, threshold: 0 });
    }

    function applyFilters() {
        if (!isActive || !isPlaylistPage()) return;
        if (isInputActive) return; // Skip if user is typing
        ensureRangeObserver();

        isFiltering = Boolean(filterState.title || filterState.channel);
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

            const isMatched = matchTitle && matchChannel;

            if (isMatched) {
                item.style.display = '';
                visible++;

                // Render [MATCHED] badge if filtering is active
                if (isFiltering) {
                    renderMatchedIndicator(item, true);
                } else {
                    renderMatchedIndicator(item, false); // Clear if no filter
                }

                // Add to observer for "Range" logic
                observerForRange.observe(item);

            } else {
                item.style.display = 'none';
                renderMatchedIndicator(item, false); // Clear
                observerForRange.unobserve(item);
            }
        });

        // Update Counts
        const countEl = document.getElementById('yt-filter-count');
        if (countEl) countEl.textContent = `Results: ${visible} / ${items.length}`;

        updateStatus('filtering', false);
        setTimeout(updateRangeInfo, 100);
    }

    // --- Range Logic ---
    function updateRangeInfo() {
        const div = document.getElementById('yt-filter-range-info');
        if (!div) return;

        let maxIndex = 0;
        let matchCount = 0;

        // Combine sets for display calculation
        // "Range" includes items strictly above AND currently visible items.
        const combined = new Set([...itemsAboveSet, ...itemsVisibleSet]);

        combined.forEach(el => {
            // Check if matched (display != none)
            if (el.style.display !== 'none') {
                matchCount++;
            }

            // Extract Index
            const indexEl = el.querySelector('#index');
            if (indexEl) {
                const idx = parseInt(indexEl.textContent.trim(), 10);
                if (!isNaN(idx) && idx > maxIndex) {
                    maxIndex = idx;
                }
            }
        });

        if (maxIndex > 0) {
            div.textContent = `Range: #1-#${maxIndex} (${matchCount} matches)`;
        } else {
            div.textContent = `Range: None`;
        }
    }

    // --- Mutation Observer for Async Loading ---
    function setupMutationObserver() {
        if (!isActive || listObserver || observerInitTimerId) return;

        const container = document.querySelector('ytd-playlist-video-list-renderer #contents');
        if (!container) {
            observerInitTimerId = window.setTimeout(() => {
                observerInitTimerId = null;
                setupMutationObserver();
            }, 1000);
            return;
        }

        listObserver = new MutationObserver((mutations) => {
            let added = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    added = true;
                    break;
                }
            }
            if (added) {
                // Throttle applied via the interval mostly, but we can force a check.
                // Or just let applyFilters run. 
                // Let's run applyFilters immediately (debounced if needed, but simple is fine)
                applyFilters();
            }
        });
        listObserver.observe(container, { childList: true });
    }

    function setPanelActiveState(active) {
        const label = document.getElementById('yt-filter-active-indicator');
        const content = document.getElementById('yt-filter-panel-content');
        const panel = document.getElementById('yt-filter-panel');
        if (!label || !content || !panel) return;

        label.textContent = active ? 'Active' : 'Inactive';
        label.style.backgroundColor = active ? '#e6f4ea' : '#e0e0e0';
        label.style.color = active ? '#188038' : '#666';

        content.style.display = active ? 'flex' : 'none';
        panel.style.opacity = active ? '1' : '0.85';
    }

    function showPanel() {
        const panel = document.getElementById('yt-filter-panel');
        if (panel) panel.style.display = 'flex';
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

    function startMain() {
        if (isActive || !isPlaylistPage()) return;
        isActive = true;

        createPanel();
        showPanel();
        setPanelActiveState(true);
        itemsAboveSet.clear();
        itemsVisibleSet.clear();

        setupMutationObserver();
        applyFilters();

        if (!filterIntervalId) {
            // Loop apply filters (to catch new items from scroll as backup)
            filterIntervalId = window.setInterval(applyFilters, 2000);
        }

        console.log('[YouTube Playlist Filter] Running...');
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;

        if (observerInitTimerId) {
            clearTimeout(observerInitTimerId);
            observerInitTimerId = null;
        }

        if (listObserver) {
            listObserver.disconnect();
            listObserver = null;
        }

        if (observerForRange) {
            observerForRange.disconnect();
            observerForRange = null;
        }

        if (filterIntervalId) {
            clearInterval(filterIntervalId);
            filterIntervalId = null;
        }

        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        showPanel();
        setPanelActiveState(false);
    }

    // Navigation Handling
    window.addEventListener('yt-navigate-start', stopMain);
    window.addEventListener('yt-navigate-finish', () => {
        if (isPlaylistPage()) {
            startMain();
        } else {
            stopMain();
        }
    });

    if (isPlaylistPage()) {
        startMain();
    }

})();
