// ==UserScript==
// @name         YouTube Playlist Filter
// @namespace    userscript.moukaeritai.work
// @version      0.1.35
// @lastModified 2026-04-08
// @description  YouTubeプレイリストのフィルタリング、状態表示(MATCHED)、一括削除機能を提供します。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     youtubeCommonCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.css
// @resource     ytFilterTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-filter/youtube-playlist-filter.user.js
// ==/UserScript==

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusUpdatePanelVisibility */
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
    const PLAYLIST_PATH = '/playlist';
    const PANEL_POS_KEY = 'yt_filter_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_filter_is_minimized';
    const INIT_DELAY_RANGE_MS = { min: 1000, max: 2000 };
    let isActive = false;
    let filterIntervalId = null;
    let observerInitTimerId = null;

    let filterState = { title: '', channel: '' };
    let isFiltering = false;
    let isInputActive = false; // Flag to pause filtering during input
    let resumeTimerId = null;
    let panel = null;


    let listObserver = null;
    let observerForRange = null;

    // --- Performance Optimization Globals ---
    let allCachedItems = new Set();
    let pendingProcessItems = new Set();
    let isProcessing = false;
    let processTimerId = null;

    // --- Helpers ---
    function normalizeText(str) {
        if (!str) return '';
        // Normalize to NFKC to handle full-width/half-width Japanese characters
        return str.normalize('NFKC').toLowerCase().trim();
    }


    function isPlaylistPage() {
        const res = location.hostname === 'www.youtube.com' &&
            location.pathname === PLAYLIST_PATH &&
            location.search.length > 1;
        console.log(`[Playlist Filter Debug] isPlaylistPage: ${res} (path: ${location.pathname}, search: ${location.search})`);
        return res;
    }



    function createPanel() {
        if (document.getElementById('yt-filter-panel')) return;

        const templateStr = GM_getResourceText('ytFilterTemplate');
        if (!templateStr) {
            console.error('[YouTube Playlist Filter] Failed to load template.html');
            return;
        }

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.35';
        const html = templateStr.replace('{{VERSION}}', version);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        panel = wrapper.firstElementChild;

        yusRestorePosition(panel, PANEL_POS_KEY, { top: '20px', left: '20px' });
        const headerRow = panel.querySelector('#yt-filter-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-filter-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        const setupInputGroup = (key) => {
            const input = panel.querySelector(`#yt-filter-${key}-input`);
            const clearBtn = panel.querySelector(`#yt-filter-${key}-clear`);
            
            input.value = filterState[key];
            input.addEventListener('focus', pauseFilteringForInput);
            input.addEventListener('blur', () => {
                filterState[key] = input.value;
                scheduleResumeAfterInput();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    filterState[key] = input.value;
                    input.blur();
                }
            });
            clearBtn.addEventListener('click', () => {
                filterState[key] = '';
                input.value = '';
            });
        };

        setupInputGroup('title');
        setupInputGroup('channel');

        const applyBtn = panel.querySelector('#yt-filter-apply-btn');
        applyBtn.addEventListener('click', () => {
            filterState.title = panel.querySelector('#yt-filter-title-input').value;
            filterState.channel = panel.querySelector('#yt-filter-channel-input').value;

            if (isInputActive) {
                isInputActive = false;
                panel.querySelectorAll('input').forEach(inp => inp.blur());
            }

            if (!isActive) {
                startMain();
            } else {
                applyFilters();
            }
        });

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        });
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

        if (itemsToProcess.length === 0) {
            // Finished processing chunk
            console.log(`[Playlist Filter Debug] processChunk finished (total cached: ${allCachedItems.size})`);
            isProcessing = false;
            updateCounts();
            updateStatus('filtering', false);
            setTimeout(updateRangeInfo, 100);
            return;
        }

        let batchMatches = 0;
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

                // Enhanced title extraction: prefer 'title' attribute then 'innerText'
                const titleEl = item.querySelector('#video-title') || 
                                item.querySelector('a#video-title') ||
                                item.querySelector('.ytd-playlist-video-renderer #video-title') ||
                                item.querySelector('#video-title-link');
                
                const titleRaw = titleEl ? (titleEl.getAttribute('title') || titleEl.innerText || titleEl.textContent) : '';
                const title = normalizeText(titleRaw);

                // Enhanced channel extraction: prefer 'title' attribute then 'innerText'
                const channelEl = item.querySelector('.ytd-channel-name a') || 
                                  item.querySelector('#channel-name #text') ||
                                  item.querySelector('yt-formatted-string.ytd-channel-name');
                
                const channelRaw = channelEl ? (channelEl.getAttribute('title') || channelEl.innerText || channelEl.textContent) : '';
                const channel = normalizeText(channelRaw);

                const matchTitle = !titleLower || title.includes(titleLower);
                const matchChannel = !channelLower || channel.includes(channelLower);

                const isMatched = matchTitle && matchChannel;

                if (isMatched) {
                    batchMatches++;
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
            console.log(`[Playlist Filter Debug] Batch finished: ${batchMatches} matches found.`);
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
        yusSetPanelActive(panel, true);

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

        yusSetPanelActive(panel, false);
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
