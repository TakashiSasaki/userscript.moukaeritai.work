// ==UserScript==
// @name         YouTube Playlist Remover
// @namespace    userscript.moukaeritai.work
// @version      0.1.71
// @lastModified  2026-04-10
// @description  YouTubeプレイリストで、スクロールして通り過ぎた（Above）動画、またはフィルタリングされた動画を一括削除する機能を提供します。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        https://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     youtubeCommonCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.css
// @resource     ytRemoverTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/youtube-playlist-remover.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-remover/youtube-playlist-remover.user.js
// ==/UserScript==

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusParseHTML, yusInitApp, yusIsPlaylistPage */
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

    // --- Configuration ---
    const PANEL_POS_KEY = 'yt_remover_panel_position';
    const WAIT_FOR_DISAPPEARANCE_KEY = 'yt_remover_wait_for_disappearance';
    const ONLY_MATCHED_KEY = 'yt_remover_only_matched';
    const MINIMIZED_STATE_KEY = 'yt_remover_is_minimized';
    const ACTION_LABEL_REMOVE = 'Remove Items';
    const ACTION_LABEL_ADD = 'Add Items';

    let isActive = false;
    let refreshIntervalId = null;
    let waitForDisappearance = GM_getValue(WAIT_FOR_DISAPPEARANCE_KEY, true);
    let onlyRemoveMatched = GM_getValue(ONLY_MATCHED_KEY, false);
    let removeButton = null;
    let isRemoving = false;
    let filterListenerBound = false;
    let candidatesInfoRefreshId = null;
    const filterInputValues = new WeakMap();
    let removalQueue = [];
    let queuedItems = new Set();
    let completedItems = new Set();
    let inFlightItem = null;

    // --- Statistics ---
    let deletionStatsElement = null;

    function calculateStatistics(times) {
        if (!times || times.length === 0) return null;
        const min = times.reduce((a, b) => Math.min(a, b), Infinity);
        const max = times.reduce((a, b) => Math.max(a, b), -Infinity);
        const sum = times.reduce((a, b) => a + b, 0);
        const avg = sum / times.length;

        const sorted = [...times].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        return { min, max, avg, median, count: times.length };
    }

    function updateDeletionStats(stats) {
        if (!deletionStatsElement) return;
        if (!stats) {
            deletionStatsElement.textContent = '';
            deletionStatsElement.style.display = 'none';
            return;
        }
        const { min, max, avg, median, count } = stats;
        deletionStatsElement.style.display = 'block';
        deletionStatsElement.textContent = '';

        const title = document.createElement('div');
        title.textContent = `Stats (${count} items):`;
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '2px';

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '2px';

        const minEl = document.createElement('span');
        minEl.textContent = `Min: ${min}ms`;
        const maxEl = document.createElement('span');
        maxEl.textContent = `Max: ${max}ms`;
        const avgEl = document.createElement('span');
        avgEl.textContent = `Avg: ${Math.round(avg)}ms`;
        const medEl = document.createElement('span');
        medEl.textContent = `Med: ${Math.round(median)}ms`;

        grid.appendChild(minEl);
        grid.appendChild(maxEl);
        grid.appendChild(avgEl);
        grid.appendChild(medEl);

        deletionStatsElement.appendChild(title);
        deletionStatsElement.appendChild(grid);
    }

    // --- Constants ---
    const TRASH_ICON_PATHS = [
        "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
        "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H8v15h10V5z",
        "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z"
    ];

    // --- State ---
    let observer = null;
    let mutationObserver = null;
    let playlistContainer = null;
    let panel = null;



    function createPanel() {
        if (document.getElementById('yt-remover-panel')) return;

        const templateStr = GM_getResourceText('ytRemoverTemplate');
        if (!templateStr) {
            console.error('[YouTube Playlist Remover] Failed to load template.html');
            return;
        }

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.71';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);

        yusRestorePosition(panel, PANEL_POS_KEY, { bottom: '150px', right: '20px' });
        const headerRow = panel.querySelector('#yt-remover-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-remover-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        deletionStatsElement = panel.querySelector('#yt-remover-stats');

        const waitCheckbox = panel.querySelector('#yt-remover-wait-checkbox');
        waitCheckbox.checked = waitForDisappearance;
        waitCheckbox.addEventListener('change', (e) => {
            waitForDisappearance = e.target.checked;
            GM_setValue(WAIT_FOR_DISAPPEARANCE_KEY, waitForDisappearance);
        });

        const matchedCheckbox = panel.querySelector('#yt-remover-matched-checkbox');
        matchedCheckbox.checked = onlyRemoveMatched;
        matchedCheckbox.addEventListener('change', (e) => {
            onlyRemoveMatched = e.target.checked;
            GM_setValue(ONLY_MATCHED_KEY, onlyRemoveMatched);
            scheduleCandidatesInfoRefresh();
        });

        removeButton = panel.querySelector('#yt-remover-action-btn');
        removeButton.addEventListener('click', removeRangeItems);

        document.body.appendChild(panel);
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

    // --- Updates ---

    function updateStatus(text, isActive = false) {
        const el = document.getElementById('yt-remover-status');
        if (el) {
            el.textContent = `Status: ${text}`;
            el.style.color = isActive ? '#d00' : '#333';
        }
    }

    function updatePhase(text, isActive = false) {
        const el = document.getElementById('yt-remover-phase');
        if (el) {
            el.textContent = `Phase: ${text}`;
            el.style.color = isActive ? '#d00' : '#555';
        }
    }

    function updateCandidatesInfo() {
        const el = document.getElementById('yt-remover-candidates-info');
        if (!el) return;

        const count = isRemoving
            ? getCurrentRemovalCandidates().length
            : candidateStore.getCount({ matchedOnly: onlyRemoveMatched });
        el.textContent = count > 0 ? `Removable: ${count} items` : 'Removable: None';
    }

    function scheduleCandidatesInfoRefresh() {
        if (candidatesInfoRefreshId !== null) return;

        candidatesInfoRefreshId = requestAnimationFrame(() => {
            candidatesInfoRefreshId = null;
            updateCandidatesInfo();
        });
    }

    function hasMatchedBadge(item) {
        if (!item) return false;

        // Find by class across the whole item (fastest native check)
        return !!item.querySelector('.yt-filter-matched');
    }

    function createCandidateStore() {
        const items = new Set();
        let matchedStates = new WeakMap();
        let matchedCount = 0;

        function readMatchedState(item) {
            return hasMatchedBadge(item);
        }

        function syncMatchedState(item) {
            if (!items.has(item)) return false;
            const previous = matchedStates.get(item) === true;
            const next = readMatchedState(item);
            if (previous !== next) {
                matchedCount += next ? 1 : -1;
                matchedStates.set(item, next);
            }
            return next;
        }

        return {
            add(item) {
                if (!item || items.has(item)) {
                    return false;
                }

                const isMatched = readMatchedState(item);
                items.add(item);
                matchedStates.set(item, isMatched);
                if (isMatched) {
                    matchedCount++;
                }
                return true;
            },
            remove(item) {
                if (!items.has(item)) {
                    return false;
                }

                if (matchedStates.get(item) === true) {
                    matchedCount--;
                }
                matchedStates.delete(item);
                items.delete(item);
                return true;
            },
            clear() {
                items.clear();
                matchedStates = new WeakMap();
                matchedCount = 0;
            },
            has(item) {
                return items.has(item);
            },
            sync(item) {
                return syncMatchedState(item);
            },
            isMatched(item, { refresh = false } = {}) {
                if (!items.has(item)) {
                    return false;
                }
                if (refresh) {
                    return syncMatchedState(item);
                }
                return matchedStates.get(item) === true;
            },
            getCount({ matchedOnly = false } = {}) {
                return matchedOnly ? matchedCount : items.size;
            },
            get size() {
                return items.size;
            },
            toArray() {
                return Array.from(items);
            }
        };
    }

    // Items that are "Above" the viewport (scanned) AND currently Visible (not filtered out).
    // These are the targets for the "Remove Above" action.
    const candidateStore = createCandidateStore();

    function resetRemovalQueueState() {
        removalQueue = [];
        queuedItems = new Set();
        completedItems = new Set();
        inFlightItem = null;
    }

    function isItemHiddenByFilter(element, rect = null) {
        if (!element || !element.isConnected) return true;
        if (element.hidden || element.getAttribute('aria-hidden') === 'true') return true;
        if (rect) {
            return rect.width === 0 && rect.height === 0;
        }
        return element.offsetParent === null;
    }

    function isPlaylistFilterInput(target) {
        if (!(target instanceof HTMLInputElement)) return false;
        if (target.closest('ytd-masthead')) return false;
        const container = target.closest('ytd-playlist-video-list-renderer, ytd-playlist-header-renderer, ytd-playlist-sidebar-primary-info-renderer, ytd-playlist-search-box-renderer');
        if (!container) return false;
        const type = (target.getAttribute('type') || '').toLowerCase();
        if (type === 'search') return true;
        const label = (target.getAttribute('aria-label') || target.getAttribute('placeholder') || '').toLowerCase();
        const name = (target.getAttribute('name') || target.getAttribute('id') || '').toLowerCase();
        return label.includes('search') || label.includes('filter') || label.includes('検索') || name.includes('search') || name.includes('filter');
    }

    function handleFilterInputEvent(event) {
        if (!isActive || !yusIsPlaylistPage() || isRemoving) return;
        const target = event.target;
        if (!isPlaylistFilterInput(target)) return;
        const value = target.value || '';
        const lastValue = filterInputValues.get(target);
        if (lastValue === value) return;
        filterInputValues.set(target, value);
        candidateStore.clear();
        scheduleCandidatesInfoRefresh();
    }

    function ensureFilterListeners() {
        if (filterListenerBound) return;
        document.addEventListener('input', handleFilterInputEvent, true);
        document.addEventListener('change', handleFilterInputEvent, true);
        filterListenerBound = true;
    }

    function removeFilterListeners() {
        if (!filterListenerBound) return;
        document.removeEventListener('input', handleFilterInputEvent, true);
        document.removeEventListener('change', handleFilterInputEvent, true);
        filterListenerBound = false;
    }

    function getCurrentRemovalCandidates() {
        return Array.from(document.querySelectorAll('ytd-playlist-video-renderer'))
            .filter((el) => {
                const isBasicsOk = candidateStore.has(el) && el.isConnected && !isItemHiddenByFilter(el);
                if (!isBasicsOk) return false;
                if (queuedItems.has(el) || completedItems.has(el) || inFlightItem === el) return false;

                if (onlyRemoveMatched) {
                    return candidateStore.isMatched(el, { refresh: true });
                }
                return true;
            })
            .reverse();
    }

    function enqueueCurrentCandidates() {
        const candidates = getCurrentRemovalCandidates();
        candidates.forEach((item) => {
            removalQueue.push(item);
            queuedItems.add(item);
        });
        scheduleCandidatesInfoRefresh();
        return candidates.length;
    }

    // --- Observer Logic ---
    // We only want to delete items that are:
    // 1. Above the viewport.
    // 2. Visible (display != none). If Filter script hides them, we must NOT delete them.

    function setupMutationObserver() {
        if (mutationObserver) return;

        // Find the container where items are added
        playlistContainer = document.querySelector('ytd-playlist-video-list-renderer #contents') ||
            document.querySelector('ytd-playlist-video-list-renderer');

        if (!playlistContainer) {
            // If container isn't there yet, try again soon
            setTimeout(setupMutationObserver, 1000);
            return;
        }

        mutationObserver = new MutationObserver((mutations) => {
            if (!isActive) return;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName && node.tagName.toLowerCase() === 'ytd-playlist-video-renderer') {
                            ensureObserver();
                            observer.observe(node);
                        } else {
                            // Check if the item is nested inside the added node
                            const items = node.querySelectorAll('ytd-playlist-video-renderer');
                            if (items.length > 0) {
                                ensureObserver();
                                items.forEach(item => observer.observe(item));
                            }
                        }
                    }
                });
            });
        });

        mutationObserver.observe(playlistContainer, { childList: true, subtree: true });
    }

    function ensureObserver() {
        if (observer) return;
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const rect = entry.boundingClientRect;
                const el = entry.target;

                if (isItemHiddenByFilter(el, rect)) {
                    // If hidden, remove from set immediately to be safe
                    candidateStore.remove(el);
                    return;
                }

                if (rect.bottom < 180 || entry.isIntersecting) {
                    // "Range" = Above viewport OR Currently Visible in viewport
                    if (!candidateStore.add(el)) {
                        candidateStore.sync(el);
                    }
                } else {
                    // Strictly below viewport (not yet seen/scanned potentially)
                    // Note: This logic assumes we scroll down. 
                    candidateStore.remove(el);
                }
            });
            scheduleCandidatesInfoRefresh();
        }, { root: null, threshold: 0 });
    }



    function lightweightCleanup() {
        if (!isActive || !yusIsPlaylistPage()) return;

        // Only clean up set if items were removed from DOM or became hidden
        candidateStore.toArray().forEach(item => {
            if (isItemHiddenByFilter(item)) {
                candidateStore.remove(item);
            } else {
                candidateStore.sync(item);
            }
        });
        scheduleCandidatesInfoRefresh();
    }


    // --- Removal Logic ---

    function highlightOutline(element) {
        if (!element) return;
        element.style.outline = '2px solid #d00';
        element.style.outlineOffset = '2px';
    }

    function clearOutline(element) {
        if (!element) return;
        element.style.outline = '';
        element.style.outlineOffset = '';
    }

    function updateRemoveButtonLabel(text) {
        if (!removeButton) return;
        removeButton.textContent = text;
    }

    function isElementVisible(element) {
        if (!element || !element.isConnected) return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
    }

    function getVisibleMenuPopup() {
        const popups = Array.from(document.querySelectorAll('ytd-menu-popup-renderer'));
        for (let i = popups.length - 1; i >= 0; i--) {
            if (isElementVisible(popups[i])) {
                return popups[i];
            }
        }
        return null;
    }

    async function attemptRemoveVideo(videoContainer) {
        updatePhase('Opening menu...', true);
        // Shift focus to the container itself first
        videoContainer.focus();

        // 1. Identify the menu button (prefer aria-label for stability)
        const menuBtn = videoContainer.querySelector('#menu button[aria-label="操作メニュー"]') ||
            videoContainer.querySelector('#menu button') ||
            videoContainer.querySelector('button.dropdown-trigger');

        if (!menuBtn) return false;

        if (!videoContainer.isConnected || videoContainer.hidden || videoContainer.style.display === 'none') {
            return false;
        }

        menuBtn.focus(); // Shift focus before clicking
        menuBtn.click();
        await new Promise(r => setTimeout(r, 100));

        const START = Date.now();
        let waitedForMenu = false;
        while (Date.now() - START < 10000) {
            const popup = getVisibleMenuPopup();
            if (popup) {
                updatePhase('Menu open', true);
                highlightOutline(popup);
                if (!waitedForMenu) {
                    await new Promise(r => setTimeout(r, 300));
                    waitedForMenu = true;
                }
                // 2. Select all menu items using role="menuitem" for better coverage
                const items = Array.from(popup.querySelectorAll('[role="menuitem"]'));
                for (const item of items) {
                    const text = item.textContent || "";
                    // Check text in multiple languages
                    const isRemove = text.includes('から削除') || text.includes('Remove from');

                    // 3. Or check icon path (trash can)
                    const path = item.querySelector('path');
                    const isTrash = path && TRASH_ICON_PATHS.includes(path.getAttribute('d'));

                    if (isRemove || isTrash) {
                        updatePhase('Selecting remove', true);
                        // 4. Click tp-yt-paper-item inside for better emulation if it exists
                        const target = item.querySelector('tp-yt-paper-item') || item;
                        target.focus(); // Shift focus before clicking

                        highlightOutline(target);
                        target.click();

                        document.body.click(); // Close menu
                        return true;
                    }
                }
            }
            if (!waitedForMenu) {
                updatePhase('Waiting menu...', true);
            }
            await new Promise(r => setTimeout(r, 500));
        }
        document.body.click();
        return false;
    }

    async function attemptRemoveVideoWithScrollFallback(videoContainer) {
        const successWithoutScroll = await attemptRemoveVideo(videoContainer);
        if (successWithoutScroll || !isActive) {
            return successWithoutScroll;
        }

        updatePhase('Scrolling...', true);
        videoContainer.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        highlightOutline(videoContainer);
        await new Promise(r => setTimeout(r, 100));

        return attemptRemoveVideo(videoContainer);
    }

    async function waitForItemDisappearance(item, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const style = window.getComputedStyle(item);
            // Check if removed from DOM or hidden
            if (!item.isConnected || item.style.display === 'none' || item.hidden || style.display === 'none' || style.visibility === 'hidden') {
                return true;
            }
            const rect = item.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                return true;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    async function removeRangeItems() {
        if (!isActive || !yusIsPlaylistPage()) return;
        if (isRemoving) {
            const addedCount = enqueueCurrentCandidates();
            updateRemoveButtonLabel(ACTION_LABEL_ADD);
            if (addedCount > 0) {
                updateStatus(`Added ${addedCount} item(s) (queued: ${removalQueue.length})`, true);
            } else {
                updateStatus(`No new items to add (queued: ${removalQueue.length})`, true);
            }
            return;
        }

        resetRemovalQueueState();
        const initialCount = enqueueCurrentCandidates();
        if (initialCount === 0) {
            updateRemoveButtonLabel(ACTION_LABEL_REMOVE);
            return;
        }

        isRemoving = true;
        updateRemoveButtonLabel(ACTION_LABEL_ADD);

        // Reset stats
        const deletionTimes = [];
        updateDeletionStats(null);

        try {
            updateStatus(`Removing... (queued: ${removalQueue.length})`, true);
            updatePhase('Preparing...', true);

            while (removalQueue.length > 0) {
                if (!isActive) break;

                const item = removalQueue.shift();
                queuedItems.delete(item);
                inFlightItem = item;
                scheduleCandidatesInfoRefresh();

                if (!item || completedItems.has(item)) {
                    inFlightItem = null;
                    continue;
                }

                const isCandidateValid = candidateStore.has(item) && item.isConnected && !isItemHiddenByFilter(item);
                if (!isCandidateValid) {
                    completedItems.add(item);
                    inFlightItem = null;
                    continue;
                }
                if (onlyRemoveMatched && !candidateStore.isMatched(item, { refresh: true })) {
                    completedItems.add(item);
                    inFlightItem = null;
                    continue;
                }

                const indexVal = item.querySelector('#index')?.textContent?.trim() || '?';
                updateStatus(`Removing #${indexVal} (queued: ${removalQueue.length})`, true);
                highlightOutline(item);

                const startRemove = Date.now();
                const success = await attemptRemoveVideoWithScrollFallback(item);
                const endRemove = Date.now();

                if (success) {
                    deletionTimes.push(endRemove - startRemove);
                    // Update stats in real-time
                    const stats = calculateStatistics(deletionTimes);
                    updateDeletionStats(stats);
                }

                if (!isActive) break;

                if (success) {
                    if (waitForDisappearance) {
                        updatePhase('Waiting for disappearance...', true);
                        // Wait for the item to actually disappear from the list (removed by YouTube)
                        const disappeared = await waitForItemDisappearance(item, 8000); // Wait up to 8s
                        if (disappeared) {
                            candidateStore.remove(item);
                            completedItems.add(item);
                        } else {
                            console.warn('[YouTube Playlist Remover] Item removal timed out:', item);
                        }
                    } else {
                        candidateStore.remove(item);
                        completedItems.add(item);
                    }
                    scheduleCandidatesInfoRefresh();
                }

                if (item.isConnected) {
                    clearOutline(item);
                }

                if (!isActive) break;

                // Small buffer between items
                updatePhase('Cooldown...', true);
                await new Promise(r => setTimeout(r, 300));
                inFlightItem = null;
                scheduleCandidatesInfoRefresh();
            }

            if (deletionTimes.length > 0) {
                const stats = calculateStatistics(deletionTimes);
                updateDeletionStats(stats);
            }

            if (!isActive) {
                updateStatus('Aborted');
                updatePhase('Navigated away');
            } else {
                updateStatus('Idle');
                updatePhase('Idle');
            }

        } catch (e) {
            console.error('[YouTube Playlist Remover] Error during removal:', e);
            updateStatus('Error');
            updatePhase('Check console');
        } finally {
            inFlightItem = null;
            updateRemoveButtonLabel(ACTION_LABEL_REMOVE);
            isRemoving = false;
            resetRemovalQueueState();
            scheduleCandidatesInfoRefresh();
        }
    }


    // --- Init ---
    function startMain() {
        if (isActive || !yusIsPlaylistPage()) return;
        ensureFilterListeners();
        isActive = true;

        createPanel();
        attachPanelResizeHandler();
        yusSetPanelActive(panel, true);
        candidateStore.clear();

        ensureObserver();
        const existingItems = document.querySelectorAll('ytd-playlist-video-renderer');
        existingItems.forEach(item => {
            observer.observe(item);
        });
        setupMutationObserver();

        updateStatus('Idle');
        updatePhase('Idle');
        updateRemoveButtonLabel(ACTION_LABEL_REMOVE);
        scheduleCandidatesInfoRefresh();

        if (!refreshIntervalId) {
            refreshIntervalId = window.setInterval(lightweightCleanup, 5000);
        }

        console.log('[YouTube Playlist Remover] Running...');
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;

        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
            refreshIntervalId = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }
        playlistContainer = null;

        candidateStore.clear();
        isRemoving = false;
        resetRemovalQueueState();
        if (candidatesInfoRefreshId !== null) {
            cancelAnimationFrame(candidatesInfoRefreshId);
            candidatesInfoRefreshId = null;
        }
        removeFilterListeners();
        detachPanelResizeHandler();
        updateRemoveButtonLabel(ACTION_LABEL_REMOVE);
        updateStatus('Idle');
        updatePhase('Idle');
        yusSetPanelActive(panel, false);
        updateCandidatesInfo();
    }


    yusInitApp({
        appName: 'YouTube Playlist Remover',
        startMain: startMain,
        stopMain: stopMain
    });

})();
