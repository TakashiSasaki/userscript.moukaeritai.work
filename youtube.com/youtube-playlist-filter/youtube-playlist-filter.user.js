// ==UserScript==
// @name         YouTube Playlist Filter
// @namespace    userscript.moukaeritai.work
// @version      0.1.62
// @lastModified 2026-04-11
// @description  YouTube繝励Ξ繧､繝ｪ繧ｹ繝医・繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ縲∫憾諷玖｡ｨ遉ｺ(MATCHED)縲∽ｸ諡ｬ蜑企勁讖溯・繧呈署萓帙＠縺ｾ縺吶・
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
    const RESULTS_UPDATE_DELAY_MS = 2000;
    let isActive = false;
    let filterIntervalId = null;
    let observerInitTimerId = null;

    let filterState = { queries: ['', '', '', '', ''], mode: 'title' };
    let isFiltering = false;
    let isInputActive = false;
    let panel = null;
    let listObserver = null;

    // --- Performance Optimization Globals ---
    let allCachedItems = new Set();
    let pendingProcessItems = new Set();
    const itemMetadataCache = new WeakMap();
    let isProcessing = false;
    let processTimerId = null;
    let resultsUpdateTimerId = null;
    let hasAppliedCurrentPage = false;
    let isResetting = false;

    // --- Helpers ---
    function normalizeText(str) {
        if (!str) return '';
        // Normalize to NFKC to handle full-width/half-width Japanese characters
        return str.normalize('NFKC').toLowerCase().trim();
    }

    /**
     * AND-in-OR matching:
     * Each non-empty query string is an OR branch.
     * Within one branch, space-separated tokens are AND conditions.
     * Returns true if any branch fully matches the target text.
     * Returns true if all queries are empty (no filter active).
     */
    function matchesFilter(targetText, queries) {
        const activeRows = queries
            .map(q => normalizeText(q))
            .filter(q => q.length > 0);

        if (activeRows.length === 0) return true;

        return activeRows.some(row => {
            const keywords = row.split(/\s+/).filter(k => k.length > 0);
            return keywords.every(keyword => targetText.includes(keyword));
        });
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

        const inputs = [];
        for (let i = 1; i <= 5; i++) {
            const input = panel.querySelector(`#yt-filter-query-input-${i}`);
            if (input) inputs.push(input);
        }
        return inputs;
    }

    function syncFilterStateFromInputs() {
        if (!panel) {
            return;
        }

        filterState.queries = [];
        for (let i = 1; i <= 5; i++) {
            filterState.queries.push(panel.querySelector(`#yt-filter-query-input-${i}`)?.value || '');
        }
        filterState.mode = panel.querySelector('input[name="yt-filter-mode"]:checked')?.value || 'title';
    }

    function setFilterInputsLocked(locked) {
        const style = locked ? FILTER_INPUT_LOCKED_STYLE : FILTER_INPUT_EDITABLE_STYLE;
        getFilterInputs().forEach((input) => {
            input.readOnly = locked;
            Object.assign(input.style, style);
            input.style.boxShadow = '';
        });

        if (!panel) {
            return;
        }

        panel.querySelectorAll('input[name="yt-filter-mode"]').forEach((radio) => {
            radio.disabled = locked;
        });
    }

    function setResetButtonBusy(busy) {
        if (!panel) return;
        const btn = panel.querySelector('#yt-filter-reset-btn');
        if (!btn) return;

        if (busy) {
            btn.textContent = 'Resetting...';
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.textContent = 'Reset Filter';
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = 'pointer';
        }
    }

    function resetAppliedFilteringState() {
        syncFilterStateFromInputs();
        isFiltering = false;
        hasAppliedCurrentPage = false;
        cancelScheduledResultsUpdate();

        const items = new Set([
            ...allCachedItems,
            ...document.querySelectorAll('ytd-playlist-video-renderer')
        ]);

        isResetting = true;
        setResetButtonBusy(true);

        // Defer heavy DOM work so the browser can paint "Resetting..." first
        setTimeout(() => {
            items.forEach((item) => {
                if (!item || !item.isConnected) {
                    return;
                }

                item.style.display = '';
                renderMatchedIndicator(item, false);
            });

            allCachedItems.clear();
            pendingProcessItems.clear();
            updateQueueInfo();
            resetFilterDisplayInfo();
            isResetting = false;
            setResetButtonBusy(false);
        }, 0);
    }

    function cancelScheduledResultsUpdate() {
        if (!resultsUpdateTimerId) {
            return;
        }

        clearTimeout(resultsUpdateTimerId);
        resultsUpdateTimerId = null;
    }

    function scheduleResultsUpdate({ immediate = false } = {}) {
        cancelScheduledResultsUpdate();

        if (immediate) {
            updateCounts();
            return;
        }

        resultsUpdateTimerId = window.setTimeout(() => {
            resultsUpdateTimerId = null;

            if (!isActive || !yusIsPlaylistPage() || !hasAppliedCurrentPage) {
                return;
            }

            updateCounts();
        }, RESULTS_UPDATE_DELAY_MS);
    }

    function beginFilterEditing(input) {
        if (isActive) {
            stopBackgroundWork();
        }

        isInputActive = true;
        setFilterInputsLocked(false);
        resetAppliedFilteringState();

        // input may be null when called from radio button change handler
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

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.59';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);
        yusRestorePosition(panel, PANEL_POS_KEY, { top: '20px', left: '20px' });
        const headerRow = panel.querySelector('#yt-filter-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-filter-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        // Wire up 5 query inputs
        for (let i = 1; i <= 5; i++) {
            const input = panel.querySelector(`#yt-filter-query-input-${i}`);
            if (!input) continue;

            input.value = filterState.queries[i - 1] || '';

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
        }

        panel.querySelectorAll('input[name="yt-filter-mode"]').forEach((radio) => {
            radio.checked = radio.value === filterState.mode;
            radio.addEventListener('change', () => {
                if (!radio.checked) {
                    return;
                }
                // Any mode change is a filter condition change: stop filtering and enter editing mode
                beginFilterEditing(null);
                filterState.mode = radio.value;
            });
        });

        const resetButton = panel.querySelector('#yt-filter-reset-btn');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (isResetting) return;
                if (isActive) {
                    stopBackgroundWork();
                }
                isInputActive = true;
                setFilterInputsLocked(false);
                resetAppliedFilteringState();

                // Clear all 5 inputs
                for (let i = 1; i <= 5; i++) {
                    const inp = panel.querySelector(`#yt-filter-query-input-${i}`);
                    if (inp) inp.value = '';
                }

                const firstInput = panel.querySelector('#yt-filter-query-input-1');
                if (firstInput) {
                    firstInput.focus();
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
        cancelScheduledResultsUpdate();

        const countEl = document.getElementById('yt-filter-count');
        if (countEl) countEl.textContent = 'Results: - / -';

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
        const isTitleMode = filterState.mode === 'title';

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
            scheduleResultsUpdate();
            updateStatus('processor', false);
            return;
        }

        let batchMatches = 0;
        console.groupCollapsed(`[Playlist Filter Debug] processChunk (batch size: ${itemsToProcess.length}, queries: ${JSON.stringify(filterState.queries)}, mode: "${filterState.mode}")`);

        try {
            itemsToProcess.forEach(item => {
                if (!item.isConnected) {
                    allCachedItems.delete(item);
                    return;
                }

                const metadata = getOrCreateItemMetadata(item);
                const title = metadata.normalizedTitle;
                const channel = metadata.normalizedChannel;

                const targetText = isTitleMode ? title : channel;
                const isMatched = matchesFilter(targetText, filterState.queries);

                if (isMatched) {
                    batchMatches++;
                    if (item.style.display !== '') item.style.display = '';

                    if (isFiltering) {
                        renderMatchedIndicator(item, true);
                    } else {
                        renderMatchedIndicator(item, false);
                    }
                } else {
                    if (item.style.display !== 'none') {
                        item.style.display = 'none';
                    }
                    renderMatchedIndicator(item, false);
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
        isFiltering = filterState.queries.some(q => q.trim().length > 0);
        hasAppliedCurrentPage = true;
        console.log(`[Playlist Filter Debug] applyFilters (query: "${filterState.query}", mode: "${filterState.mode}", isFiltering: ${isFiltering}, isInputActive: ${isInputActive})`);
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

        if (filterIntervalId) {
            clearInterval(filterIntervalId);
            filterIntervalId = null;
        }

        cancelScheduledResultsUpdate();
        isProcessing = false;
        updateStatus('monitor', false);
        updateStatus('scanner', false);
        updateStatus('processor', false);
    }

    function startBackgroundWork({ applyNow = true } = {}) {
        console.log(`[Playlist Filter Debug] startBackgroundWork (applyNow: ${applyNow})`);
        setupMutationObserver();
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
        updateQueueInfo();
        if (hasAppliedCurrentPage) {
            scheduleResultsUpdate();
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
