// ==UserScript==
// @name         YouTube Playlist Filter
// @namespace    userscript.moukaeritai.work
// @version      0.1.55
// @lastModified 2026-04-10
// @description  YouTubeプレイリストのフィルタリング、状態表示(MATCHED)、一括削除機能を提供します。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        https://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     youtubeCommonCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.css
// @resource     ytFilterTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// ==/UserScript==

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusUpdatePanelVisibility, yusParseHTML, yusInitApp, yusIsPlaylistPage */
(function () {
    'use strict';

    const commonCss = GM_getResourceText('youtubeCommonCSS');
    if (commonCss) {
        GM_addStyle(commonCss);
    }
    GM_addStyle(`
        .yus-panel,
        .yus-panel.yus-active {
            --yus-panel-opacity: 1 !important;
            background-color: rgb(var(--yus-panel-bg-rgb)) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
    `);
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
    const PANEL_POS_KEY = 'yt_filter_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_filter_is_minimized';
    const FILTER_INPUT_EDITABLE_STYLE = {
        backgroundColor: '#fff7e8',
        borderColor: '#d69e5b',
        color: '#5c3b00',
        caretColor: '#5c3b00'
    };
    const FILTER_INPUT_LOCKED_STYLE = {
        backgroundColor: '#dce8ff',
        borderColor: '#6699ff',
        color: '#003c99',
        caretColor: 'transparent'
    };
    const FILTER_INPUT_FOCUS_STYLE = {
        boxShadow: '0 0 0 2px rgba(16, 163, 127, 0.28)',
        borderColor: '#10a37f'
    };
    let isActive = false;
    let filterIntervalId = null;
    let observerInitTimerId = null;

    let filterState = { title: '', channel: '' };
    let isFiltering = false;
    let isInputActive = false;
    let panel = null;


    let listObserver = null;
    let observerForRange = null;

    // --- Performance Optimization Globals ---
    let allCachedItems = new Set();
    let pendingProcessItems = new Set();
    const itemMetadataCache = new WeakMap();
    let isProcessing = false;
    let processTimerId = null;
    let hasAppliedCurrentPage = false;

    // --- Helpers ---
    function normalizeText(str) {
        if (!str) return '';
        // Normalize to NFKC to handle full-width/half-width Japanese characters
        return str.normalize('NFKC').toLowerCase().trim();
    }

    function getNodeText(element) {
        if (!element) return '';
        return element.getAttribute('title') || element.innerText || element.textContent || '';
    }

    function getOrCreateItemMetadata(item) {
        const cached = itemMetadataCache.get(item);
        if (cached) {
            return cached;
        }

        const titleEl = item.querySelector('#video-title') ||
            item.querySelector('a#video-title') ||
            item.querySelector('.ytd-playlist-video-renderer #video-title') ||
            item.querySelector('#video-title-link');
        const channelEl = item.querySelector('.ytd-channel-name a') ||
            item.querySelector('#channel-name #text') ||
            item.querySelector('yt-formatted-string.ytd-channel-name');

        const metadata = {
            normalizedTitle: normalizeText(getNodeText(titleEl)),
            normalizedChannel: normalizeText(getNodeText(channelEl))
        };

        itemMetadataCache.set(item, metadata);
        return metadata;
    }

    function getFilterInputs() {
        if (!panel) {
            return [];
        }

        return ['title', 'channel']
            .map((key) => panel.querySelector(`#yt-filter-${key}-input`))
            .filter(Boolean);
    }

    function syncFilterStateFromInputs() {
        if (!panel) {
            return;
        }

        filterState.title = panel.querySelector('#yt-filter-title-input')?.value || '';
        filterState.channel = panel.querySelector('#yt-filter-channel-input')?.value || '';
    }

    function setFilterInputsLocked(locked) {
        const style = locked ? FILTER_INPUT_LOCKED_STYLE : FILTER_INPUT_EDITABLE_STYLE;
        getFilterInputs().forEach((input) => {
            input.readOnly = locked;
            Object.assign(input.style, style);
            input.style.boxShadow = '';
        });
    }

    function resetAppliedFilteringState() {
        syncFilterStateFromInputs();
        isFiltering = false;
        hasAppliedCurrentPage = false;

        const items = new Set([
            ...allCachedItems,
            ...document.querySelectorAll('ytd-playlist-video-renderer')
        ]);

        items.forEach((item) => {
            if (!item || !item.isConnected) {
                return;
            }

            item.style.display = '';
            renderMatchedIndicator(item, false);
            if (observerForRange) {
                observerForRange.unobserve(item);
            }
        });

        allCachedItems.clear();
        pendingProcessItems.clear();
        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        updateQueueInfo();
        resetFilterDisplayInfo();
    }

    function beginFilterEditing(input) {
        if (isActive) {
            stopBackgroundWork();
        }

        isInputActive = true;
        setFilterInputsLocked(false);
        resetAppliedFilteringState();

        if (input) {
            input.focus();
            const cursorPos = input.value.length;
            if (typeof input.setSelectionRange === 'function') {
                input.setSelectionRange(cursorPos, cursorPos);
            }
        }
    }

    function commitFilterInputs() {
        syncFilterStateFromInputs();
        setFilterInputsLocked(true);
        isInputActive = false;

        if (!isActive || !yusIsPlaylistPage()) return;

        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        console.log('[Playlist Filter Debug] commitFilterInputs: Starting background work with locked inputs');
        startBackgroundWork({ applyNow: true });
    }





    function createPanel() {
        if (document.getElementById('yt-filter-panel')) return;

        const templateStr = GM_getResourceText('ytFilterTemplate');
        if (!templateStr) {
            console.error('[YouTube Playlist Filter] Failed to load template.html');
            return;
        }

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.55';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);
        yusRestorePosition(panel, PANEL_POS_KEY, { top: '20px', left: '20px' });
        const headerRow = panel.querySelector('#yt-filter-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-filter-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        const setupInputGroup = (key) => {
            const input = panel.querySelector(`#yt-filter-${key}-input`);

            input.value = filterState[key];
            input.addEventListener('focus', () => {
                Object.assign(input.style, FILTER_INPUT_FOCUS_STYLE);
            });
            input.addEventListener('blur', () => {
                input.style.boxShadow = '';
                if (input.readOnly) {
                    input.style.borderColor = FILTER_INPUT_LOCKED_STYLE.borderColor;
                } else {
                    input.style.borderColor = FILTER_INPUT_EDITABLE_STYLE.borderColor;
                }
            });
            input.addEventListener('click', () => {
                if (input.readOnly) {
                    beginFilterEditing(input);
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commitFilterInputs();
                }
            });
        };

        setupInputGroup('title');
        setupInputGroup('channel');

        const resetButton = panel.querySelector('#yt-filter-reset-btn');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (isActive) {
                    stopBackgroundWork();
                }
                isInputActive = true;
                setFilterInputsLocked(false);
                resetAppliedFilteringState();

                const titleInput = panel.querySelector('#yt-filter-title-input');
                if (titleInput) {
                    titleInput.focus();
                }
            });
        }

        setFilterInputsLocked(false);

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
        updateQueueInfo();
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
    }

    let panelResizeHandler = null;
    function attachPanelResizeHandler() {
        if (panelResizeHandler || !panel) return;
        panelResizeHandler = () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        };
        window.addEventListener('resize', panelResizeHandler);
    }

    function detachPanelResizeHandler() {
        if (!panelResizeHandler) return;
        window.removeEventListener('resize', panelResizeHandler);
        panelResizeHandler = null;
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

    function updateQueueInfo() {
        const queueEl = document.getElementById('yt-filter-queue-info');
        if (!queueEl) return;

        queueEl.textContent = `Queue: ${pendingProcessItems.size} items`;
    }

    function resetFilterDisplayInfo() {
        const countEl = document.getElementById('yt-filter-count');
        if (countEl) countEl.textContent = 'Results: - / -';

        const rangeEl = document.getElementById('yt-filter-range-info');
        if (rangeEl) rangeEl.textContent = 'Range: None';
    }

    function processChunk() {
        // Clear timer on entry (recursive or non-recursive)
        if (processTimerId) {
            console.log(`[Playlist Filter Debug] processChunk: clearing current processTimerId (${processTimerId})`);
            clearTimeout(processTimerId);
            processTimerId = null;
        }

        if (!isActive || !yusIsPlaylistPage() || isInputActive) {
            isProcessing = false;
            updateStatus('processor', false);
            return;
        }

        isProcessing = true;
        updateStatus('processor', true);

        const CHUNK_SIZE = 30;
        const titleLower = normalizeText(filterState.title);
        const channelLower = normalizeText(filterState.channel);

        const itemsToProcess = [];
        for (const item of pendingProcessItems) {
            itemsToProcess.push(item);
            pendingProcessItems.delete(item);
            if (itemsToProcess.length >= CHUNK_SIZE) {
                break;
            }
        }
        updateQueueInfo();

        if (itemsToProcess.length === 0) {
            // Finished processing chunk
            console.log(`[Playlist Filter Debug] processChunk finished (total cached: ${allCachedItems.size})`);
            isProcessing = false;
            updateCounts();
            updateStatus('processor', false);
            setTimeout(updateRangeInfo, 100);
            return;
        }

        let batchMatches = 0;
        console.groupCollapsed(`[Playlist Filter Debug] processChunk (batch size: ${itemsToProcess.length}, title: "${titleLower}", channel: "${channelLower}")`);

        try {
            // Ensure observer is alive before use
            ensureRangeObserver();

            itemsToProcess.forEach(item => {
                if (!item.isConnected) {
                    allCachedItems.delete(item);
                    itemsAboveSet.delete(item);
                    itemsVisibleSet.delete(item);
                    return;
                }

                const metadata = getOrCreateItemMetadata(item);
                const title = metadata.normalizedTitle;
                const channel = metadata.normalizedChannel;

                const matchTitle = !titleLower || title.includes(titleLower);
                const matchChannel = !channelLower || channel.includes(channelLower);

                const isMatched = matchTitle && matchChannel;

                if (isMatched) {
                    batchMatches++;
                    if (item.style.display !== '') item.style.display = '';

                    if (isFiltering) {
                        renderMatchedIndicator(item, true);
                    } else {
                        renderMatchedIndicator(item, false);
                    }

                    if (observerForRange) observerForRange.observe(item);
                } else {
                    if (item.style.display !== 'none') {
                        item.style.display = 'none';
                    }
                    renderMatchedIndicator(item, false);
                    itemsAboveSet.delete(item);
                    itemsVisibleSet.delete(item);
                    if (observerForRange) observerForRange.unobserve(item);
                }
            });
            console.log(`[Playlist Filter Debug] Batch finished: ${batchMatches} matches found.`);
        } catch (err) {
            console.error(`[Playlist Filter Debug] Error in processChunk loop:`, err);
        } finally {
            console.groupEnd();
            if (!isActive || !yusIsPlaylistPage() || isInputActive) {
                isProcessing = false;
                updateStatus('processor', false);
                return;
            }

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
        if (!isActive || !yusIsPlaylistPage()) return;
        if (isInputActive) {
            console.log(`[Playlist Filter Debug] applyFilters skipped: input is active`);
            return;
        }
        ensureRangeObserver();

        isFiltering = Boolean(filterState.title || filterState.channel);
        hasAppliedCurrentPage = true;
        console.log(`[Playlist Filter Debug] applyFilters (title: "${filterState.title}", channel: "${filterState.channel}", isFiltering: ${isFiltering}, isInputActive: ${isInputActive})`);
        updateStatus('scanner', true);

        allCachedItems.clear();
        pendingProcessItems.clear();
        const items = document.querySelectorAll('ytd-playlist-video-renderer');
        items.forEach(item => {
            allCachedItems.add(item);
            pendingProcessItems.add(item);
        });

        updateQueueInfo();
        scheduleProcessing();
        updateStatus('scanner', false);
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
            if (!hasAppliedCurrentPage) {
                return;
            }
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
                updateQueueInfo();
                scheduleProcessing();
            }
        });
        listObserver.observe(container, { childList: true, subtree: true });
        updateStatus('monitor', true);
    }

    function stopBackgroundWork() {
        if (processTimerId) {
            clearTimeout(processTimerId);
            processTimerId = null;
        }

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

        isProcessing = false;
        updateStatus('monitor', false);
        updateStatus('scanner', false);
        updateStatus('processor', false);
    }

    function startBackgroundWork({ applyNow = true } = {}) {
        console.log(`[Playlist Filter Debug] startBackgroundWork (applyNow: ${applyNow})`);
        setupMutationObserver();
        ensureRangeObserver(); // Always ensure range observer is alive
        if (applyNow) {
            applyFilters();
        }

        if (!filterIntervalId) {
            // Use lightweight cleanup instead of full re-processing
            filterIntervalId = window.setInterval(recheckCachedItems, 5000);
        }
    }


    function recheckCachedItems() {
        if (!isActive || !yusIsPlaylistPage() || isInputActive) return;
        updateStatus('scanner', true);

        allCachedItems.forEach(item => {
            if (!item.isConnected) {
                allCachedItems.delete(item);
            }
        });
        pendingProcessItems.forEach(item => {
            if (!item.isConnected) {
                pendingProcessItems.delete(item);
            }
        });
        itemsAboveSet.forEach(item => {
            if (!item.isConnected) {
                itemsAboveSet.delete(item);
            }
        });
        itemsVisibleSet.forEach(item => {
            if (!item.isConnected) {
                itemsVisibleSet.delete(item);
            }
        });

        updateQueueInfo();
        if (hasAppliedCurrentPage) {
            updateCounts();
            updateRangeInfo();
        } else {
            resetFilterDisplayInfo();
        }
        updateStatus('scanner', false);
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
        if (isActive || !yusIsPlaylistPage()) return;
        isActive = true;

        createPanel();
        attachPanelResizeHandler();
        yusSetPanelActive(panel, true);

        hasAppliedCurrentPage = false;
        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        allCachedItems.clear();
        pendingProcessItems.clear();
        updateQueueInfo();
        resetFilterDisplayInfo();


        console.log('[Playlist Filter Debug] startMain: Active and running');
        console.log('[YouTube Playlist Filter] Running...');
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;
        isInputActive = false;

        stopBackgroundWork();

        hasAppliedCurrentPage = false;
        itemsAboveSet.clear();
        itemsVisibleSet.clear();
        allCachedItems.clear();
        pendingProcessItems.clear();
        updateQueueInfo();
        resetFilterDisplayInfo();

        detachPanelResizeHandler();
        yusSetPanelActive(panel, false);
    }


    yusInitApp({
        appName: 'YouTube Playlist Filter',
        startMain: startMain,
        stopMain: stopMain
    });

})();
