// ==UserScript==
// @name         YouTube Playlist Filter
// @namespace    userscript.moukaeritai.work
// @version      0.1.26
// @lastModified  2026-04-06
// @description  YouTubeプレイリストのフィルタリング、状態表示(MATCHED)、一括削除機能を提供します。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// ==/UserScript==

(function () {
    'use strict';
const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    if (location.hostname === 'userscript.moukaeritai.work') {
        return;
    }

    // --- Config & State ---
    const PLAYLIST_PATH = '/playlist';
    const PANEL_POS_KEY = 'yt_filter_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_filter_is_minimized';
    const INIT_DELAY_RANGE_MS = { min: 1000, max: 2000 };
    let isActive = false;
    let isAutoMinimized = false;
    let isManuallyMinimized = GM_getValue(MINIMIZED_STATE_KEY, false);
    let filterIntervalId = null;
    let observerInitTimerId = null;
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '70px', right: '20px' });

    let filterState = { title: '', channel: '' };
    let isFiltering = false;
    let isInputActive = false; // Flag to pause filtering during input
    let resumeTimerId = null;


    let listObserver = null;
    let observerForRange = null;

    // --- Performance Optimization Globals ---
    let allCachedItems = new Set();
    let pendingProcessItems = new Set();
    let isProcessing = false;
    let processTimerId = null;


    function isPlaylistPage() {
        const res = location.hostname === 'www.youtube.com' &&
            location.pathname === PLAYLIST_PATH &&
            location.search.length > 1;
        console.log(`[Playlist Filter Debug] isPlaylistPage: ${res} (path: ${location.pathname}, search: ${location.search})`);
        return res;
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
                const rect = panel.getBoundingClientRect();
                // Save position as bottom/right to avoid overlapping with footer if possible
                const bottom = window.innerHeight - rect.bottom;
                const right = window.innerWidth - rect.right;
                panelPos = { bottom: `${bottom}px`, right: `${right}px` };
                GM_setValue(PANEL_POS_KEY, panelPos);
            }
        });

        const titleLabel = document.createElement('span');
        const v = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.21';
        titleLabel.textContent = `Playlist Filter v${v}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' });
        titleLabel.title = 'Double-click to toggle minimization';

        titleLabel.addEventListener('dblclick', (e) => {
            if (isAutoMinimized) return;
            isManuallyMinimized = !isManuallyMinimized;
            GM_setValue(MINIMIZED_STATE_KEY, isManuallyMinimized);
            updatePanelVisibility();
            e.stopPropagation();
        });

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
                pauseFilteringForInput();
            });

            // Sync state on blur, but do NOT apply filters automatically
            input.addEventListener('blur', () => {
                console.log(`[Playlist Filter Debug] Input blur for ${key}: "${input.value}"`);
                filterState[key] = input.value;
                scheduleResumeAfterInput(); // This just resumes the observer/timers, doesn't apply filter anymore
            });

            // Handle Enter key for convenience - still manual trigger
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    console.log(`[Playlist Filter Debug] Enter pressed for ${key}`);
                    filterState[key] = input.value;
                    input.blur();
                    // Optional: Should Enter apply? User said "Apply Filter button", 
                    // but Enter is standard. I'll leave it to only blur for now to be strict.
                }
            });

            clearBtn.addEventListener('click', () => {
                console.log(`[Playlist Filter Debug] Clear button clicked for ${key}`);
                filterState[key] = '';
                input.value = '';
                // Do NOT auto-apply even on clear, as per "manual only" request
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
            console.log(`[Playlist Filter Debug] Apply Filter button clicked (manual trigger)`);
            
            // Sync current input values just in case
            const inputs = contentContainer.querySelectorAll('input');
            inputs.forEach(inp => {
                if (inp.placeholder.includes('title')) filterState.title = inp.value;
                if (inp.placeholder.includes('channel')) filterState.channel = inp.value;
            });

            if (isInputActive) {
                console.log(`[Playlist Filter Debug] Manual override: forcibly setting isInputActive to false`);
                isInputActive = false;
                // If an input is focused, blur it to clean up UI/state
                inputs.forEach(inp => inp.blur());
            }

            // Ensure we are active
            if (!isActive) {
                console.log(`[Playlist Filter Debug] Manual trigger: script was inactive, starting main...`);
                startMain();
            } else {
                applyFilters();
            }
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
        updatePanelVisibility();
    }

    function updatePanelVisibility() {
        const content = document.getElementById('yt-filter-panel-content');
        const panel = document.getElementById('yt-filter-panel');
        if (!content || !panel) return;

        const minimized = isAutoMinimized || isManuallyMinimized;
        content.style.display = (isActive && !minimized) ? 'flex' : 'none';
        panel.style.opacity = (isActive && !minimized) ? '1' : '0.85';
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

    function scheduleProcessing() {
        if (isProcessing) {
            console.log(`[Playlist Filter Debug] scheduleProcessing skipped: isProcessing is true`);
            return;
        }
        if (processTimerId) {
            console.log(`[Playlist Filter Debug] scheduleProcessing skipped: processTimerId is active (${processTimerId})`);
            return;
        }

        processTimerId = setTimeout(() => {
            processTimerId = null;
            console.log(`[Playlist Filter Debug] scheduleProcessing -> processChunk start`);
            processChunk();
        }, 0);
    }

    function processChunk() {
        // Clear timer on entry (recursive or non-recursive)
        if (processTimerId) {
            console.log(`[Playlist Filter Debug] processChunk: clearing current processTimerId (${processTimerId})`);
            clearTimeout(processTimerId);
            processTimerId = null;
        }

        if (!isActive || !isPlaylistPage() || isInputActive) {
            isProcessing = false;
            updateStatus('filtering', false);
            return;
        }

        isProcessing = true;

        const CHUNK_SIZE = 50;
        const titleLower = filterState.title.toLowerCase();
        const channelLower = filterState.channel.toLowerCase();

        const itemsToProcess = [];
        for (const item of pendingProcessItems) {
            itemsToProcess.push(item);
            pendingProcessItems.delete(item);
            if (itemsToProcess.length >= CHUNK_SIZE) {
                break;
            }
        }

        if (itemsToProcess.length === 0) {
            // Finished processing chunk
            console.log(`[Playlist Filter Debug] processChunk finished (total cached: ${allCachedItems.size})`);
            isProcessing = false;
            updateCounts();
            updateStatus('filtering', false);
            setTimeout(updateRangeInfo, 100);
            return;
        }

        console.groupCollapsed(`[Playlist Filter Debug] processChunk (batch size: ${itemsToProcess.length}, title: "${titleLower}", channel: "${channelLower}")`);
        updateStatus('filtering', true);

        try {
            // Ensure observer is alive before use
            ensureRangeObserver();

            itemsToProcess.forEach(item => {
                if (!item.isConnected) {
                    console.log(`[Playlist Filter Debug] Item not connected, removing from cache`);
                    allCachedItems.delete(item);
                    return;
                }

                // Enhanced title extraction
                const titleEl = item.querySelector('#video-title') || 
                                item.querySelector('a#video-title') ||
                                item.querySelector('.ytd-playlist-video-renderer #video-title');
                const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

                // Enhanced channel extraction
                const channelEl = item.querySelector('.ytd-channel-name a') || 
                                  item.querySelector('#channel-name #text') ||
                                  item.querySelector('yt-formatted-string.ytd-channel-name');
                const channel = channelEl ? channelEl.textContent.trim().toLowerCase() : '';

                const matchTitle = !titleLower || title.includes(titleLower);
                const matchChannel = !channelLower || channel.includes(channelLower);

                const isMatched = matchTitle && matchChannel;

                if (isMatched) {
                    console.log(`[Playlist Filter Debug] [MATCH] "${title}" by "${channel}"`);
                    if (item.style.display !== '') item.style.display = '';

                    if (isFiltering) {
                        renderMatchedIndicator(item, true);
                    } else {
                        renderMatchedIndicator(item, false);
                    }

                    if (observerForRange) observerForRange.observe(item);
                } else {
                    console.log(`[Playlist Filter Debug] [HIDE] "${title}" by "${channel}"`);
                    if (item.style.display !== 'none') {
                        item.style.display = 'none';
                    }
                    renderMatchedIndicator(item, false);
                    if (observerForRange) observerForRange.unobserve(item);
                }
            });
        } catch (err) {
            console.error(`[Playlist Filter Debug] Error in processChunk loop:`, err);
        } finally {
            console.groupEnd();
            // Schedule next chunk
            processTimerId = setTimeout(processChunk, 0);
        }
    }

    function updateCounts() {
        let visibleCount = 0;
        let totalCount = 0;
        allCachedItems.forEach(item => {
            if (!item.isConnected) {
                allCachedItems.delete(item);
            } else {
                totalCount++;
                if (item.style.display !== 'none') {
                    visibleCount++;
                }
            }
        });
        const countEl = document.getElementById('yt-filter-count');
        if (countEl) countEl.textContent = `Results: ${visibleCount} / ${totalCount}`;
    }

    function applyFilters() {
        if (!isActive || !isPlaylistPage()) return;
        if (isInputActive) {
            console.log(`[Playlist Filter Debug] applyFilters skipped: input is active`);
            return;
        }
        ensureRangeObserver();

        isFiltering = Boolean(filterState.title || filterState.channel);
        console.log(`[Playlist Filter Debug] applyFilters (title: "${filterState.title}", channel: "${filterState.channel}", isFiltering: ${isFiltering}, isInputActive: ${isInputActive})`);
        updateStatus('filtering', true);

        // Add existing known items to re-process
        allCachedItems.forEach(item => pendingProcessItems.add(item));

        // Scan DOM for any items missed before MutationObserver or initial load
        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        items.forEach(item => {
            allCachedItems.add(item);
            pendingProcessItems.add(item);
        });

        scheduleProcessing();
    }

    // --- Range Logic ---
    function updateRangeInfo() {
        const div = document.getElementById('yt-filter-range-info');
        if (!div) return;

        let matchCount = 0;

        // Combine sets for display calculation
        // "Range" includes items strictly above AND currently visible items.
        const combined = new Set([...itemsAboveSet, ...itemsVisibleSet]);

        combined.forEach(el => {
            // Check if matched (display != none)
            if (el.style.display !== 'none') {
                matchCount++;
            }
        });

        div.textContent = matchCount > 0 ? `Range: ${matchCount} matches` : `Range: None`;
    }

    // --- Mutation Observer for Async Loading ---
    function setupMutationObserver() {
        if (!isActive || listObserver || observerInitTimerId) return;

        const container = document.querySelector('ytd-playlist-video-list-renderer #contents') || 
                          document.querySelector('ytd-playlist-video-list-renderer');
        if (!container) {
            observerInitTimerId = window.setTimeout(() => {
                observerInitTimerId = null;
                setupMutationObserver();
            }, 1000);
            return;
        }

        listObserver = new MutationObserver((mutations) => {
            let hasNewItems = false;
            for (const m of mutations) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName.toLowerCase() === 'ytd-playlist-video-renderer') {
                            allCachedItems.add(node);
                            pendingProcessItems.add(node);
                            hasNewItems = true;
                        } else {
                            const found = node.querySelectorAll('ytd-playlist-video-renderer');
                            if (found.length > 0) {
                                found.forEach(n => {
                                    allCachedItems.add(n);
                                    pendingProcessItems.add(n);
                                });
                                hasNewItems = true;
                            }
                        }
                    }
                });
            }
            if (hasNewItems) {
                console.log(`[Playlist Filter Debug] MutationObserver: Detected new items, scheduling processing`);
                ensureRangeObserver();
                scheduleProcessing();
            }
        });
        listObserver.observe(container, { childList: true, subtree: true });
    }

    function setPanelActiveState(active) {
        const label = document.getElementById('yt-filter-active-indicator');
        const panel = document.getElementById('yt-filter-panel');
        if (!label || !panel) return;

        label.textContent = active ? 'Active' : 'Inactive';
        label.style.backgroundColor = active ? '#e6f4ea' : '#e0e0e0';
        label.style.color = active ? '#188038' : '#666';

        updatePanelVisibility();
    }

    function showPanel() {
        const panel = document.getElementById('yt-filter-panel');
        if (panel) panel.style.display = 'flex';
    }

    function stopBackgroundWork() {
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
    }

    function startBackgroundWork({ applyNow = true } = {}) {
        console.log(`[Playlist Filter Debug] startBackgroundWork (applyNow: ${applyNow})`);
        setupMutationObserver();
        ensureRangeObserver(); // Always ensure range observer is alive
        if (applyNow) {
            applyFilters();
        }

        if (!filterIntervalId) {
            // Use lightweight recheck instead of full DOM scan
            filterIntervalId = window.setInterval(recheckCachedItems, 5000);
        }
    }


    function recheckCachedItems() {
        if (!isActive || !isPlaylistPage() || isInputActive) return;
        allCachedItems.forEach(item => pendingProcessItems.add(item));
        scheduleProcessing();
    }

    function pauseFilteringForInput() {
        if (isInputActive) return;
        isInputActive = true;
        if (resumeTimerId) {
            clearTimeout(resumeTimerId);
            resumeTimerId = null;
        }
        if (!isActive) return;
        stopBackgroundWork();
    }

    function scheduleResumeAfterInput() {
        if (!isInputActive) return;
        if (resumeTimerId) {
            clearTimeout(resumeTimerId);
        }
        resumeTimerId = window.setTimeout(() => {
            resumeTimerId = null;
            resumeFilteringAfterInput();
        }, 500);
    }

    function resumeFilteringAfterInput() {
        if (!isInputActive) return;
        if (resumeTimerId) {
            clearTimeout(resumeTimerId);
            resumeTimerId = null;
        }
        isInputActive = false;
        if (!isActive || !isPlaylistPage()) return;

        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        console.log(`[Playlist Filter Debug] resumeFilteringAfterInput: Resuming background work (WITHOUT auto-apply)`);
        startBackgroundWork({ applyNow: false });
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
        allCachedItems.clear();
        pendingProcessItems.clear();


        startBackgroundWork({ applyNow: true });

        console.log('[Playlist Filter Debug] startMain: Active and running');
        console.log('[YouTube Playlist Filter] Running...');
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;
        isInputActive = false;
        if (resumeTimerId) {
            clearTimeout(resumeTimerId);
            resumeTimerId = null;
        }


        stopBackgroundWork();

        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        allCachedItems.clear();
        pendingProcessItems.clear();

        showPanel();
        setPanelActiveState(false);
    }

    function init() {
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
    }

    function getRandomInitDelayMs() {
        const res = INIT_DELAY_RANGE_MS.min + Math.floor(Math.random() * (INIT_DELAY_RANGE_MS.max - INIT_DELAY_RANGE_MS.min + 1));
        console.log(`[Playlist Filter Debug] init scheduled in ${res}ms`);
        return res;
    }

    setTimeout(() => {
        console.log(`[Playlist Filter Debug] init timer fired`);
        init();
    }, getRandomInitDelayMs());

})();
