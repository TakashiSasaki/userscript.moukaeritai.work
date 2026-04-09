// ==UserScript==
// @name         YouTube Playlist Scroller
// @namespace    userscript.moukaeritai.work
// @version      0.1.30
// @description  YouTubeプレイリストを自動的にスクロールし、バックグラウンドでの読み込みを支援します。
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
// @resource     ytScrollerTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
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

    const SETTINGS_KEY = 'yt_scroller_settings';
    const PANEL_POS_KEY = 'yt_scroller_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_scroller_is_minimized';

    let settings = GM_getValue(SETTINGS_KEY, {
        scrollToBottom: true,
        step: 300,
        interval: 20.0
    });
    const SPINNER_SELECTOR = 'tp-yt-paper-spinner, tp-yt-paper-spinner-lite';
    const BASE_OBSERVER_RETRY_DELAY_MS = 250;
    const MAX_OBSERVER_RETRY_DELAY_MS = 2000;

    let scrollTimerId = null;
    let isAutoScrollEnabled = false;
    let autoScrollEndAt = null;
    let autoScrollStopTimerId = null;
    let remainingTimeTimerId = null;
    let activeDurationSeconds = null;
    let isActive = false;
    let loadingObserver = null;
    let loadingObserverTimerId = null;
    let loadingStateCheckTimerId = null;
    let loadingMutationProcessTimerId = null;
    let loadingObserverRetryDelayMs = BASE_OBSERVER_RETRY_DELAY_MS;
    let panel = null;
    const cachedSpinners = new Set();
    const pendingSpinnerAdds = new Set();
    const pendingSpinnerRemovals = new Set();
    let lastLoadingState = null;
    let lastKnownScrollHeight = 0;
    let panelResizeHandler = null;

    function saveSettings() {
        GM_setValue(SETTINGS_KEY, settings);
    }


    function formatRemainingTime(ms) {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes > 0) {
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
        return `${seconds}s`;
    }

    function updateRemainingTimeDisplay() {
        const remainingEl = document.getElementById('yt-scroller-remaining-time');
        if (!remainingEl) return;

        if (!isAutoScrollEnabled || !autoScrollEndAt) {
            remainingEl.textContent = 'Stopped';
            remainingEl.style.color = '#888';
            remainingEl.style.fontWeight = 'normal';
            return;
        }

        const remainingMs = Math.max(0, autoScrollEndAt - Date.now());
        remainingEl.textContent = formatRemainingTime(remainingMs);
        remainingEl.style.color = '#003c99';
        remainingEl.style.fontWeight = 'bold';
    }

    function scheduleRemainingTimeUpdate() {
        if (remainingTimeTimerId) {
            clearTimeout(remainingTimeTimerId);
            remainingTimeTimerId = null;
        }

        if (!isAutoScrollEnabled || !autoScrollEndAt || !isActive || !yusIsPlaylistPage()) {
            updateRemainingTimeDisplay();
            return;
        }

        updateRemainingTimeDisplay();
        remainingTimeTimerId = window.setTimeout(() => {
            remainingTimeTimerId = null;
            scheduleRemainingTimeUpdate();
        }, 1000);
    }

    function updateDurationButtonsState() {
        if (!panel) return;

        panel.querySelectorAll('[data-duration-seconds]').forEach((button) => {
            const buttonSeconds = Number(button.getAttribute('data-duration-seconds'));
            const isActiveDuration = isAutoScrollEnabled && activeDurationSeconds === buttonSeconds;
            button.style.backgroundColor = isActiveDuration ? '#dce8ff' : '#fff';
            button.style.borderColor = isActiveDuration ? '#6699ff' : '#ccc';
            button.style.color = isActiveDuration ? '#003c99' : '#333';
        });
    }

    function getAutoScrollDelayMs() {
        return Math.max(250, (settings.interval || 5) * 1000);
    }

    function scheduleNextAutoScroll(delayMs = getAutoScrollDelayMs(), force = false) {
        if (!isAutoScrollEnabled || !isActive || !yusIsPlaylistPage()) return;

        if (scrollTimerId) {
            if (!force) return;
            clearTimeout(scrollTimerId);
        }

        scrollTimerId = window.setTimeout(() => {
            scrollTimerId = null;
            runAutoScrollCycle();
        }, Math.max(0, delayMs));
    }

    function runAutoScrollCycle() {
        if (!isAutoScrollEnabled || !isActive || !yusIsPlaylistPage()) return;

        if (lastLoadingState === true) {
            scheduleNextAutoScroll(getAutoScrollDelayMs(), true);
            return;
        }

        const scrollingElement = document.scrollingElement || document.documentElement;
        const scrollHeight = scrollingElement.scrollHeight;
        const viewportBottom = window.scrollY + window.innerHeight;
        const threshold = settings.scrollToBottom
            ? 80
            : Math.max(80, Math.min(settings.step || 300, 300));
        const isNearBottom = viewportBottom >= scrollHeight - threshold;
        let didScroll = false;

        if (settings.scrollToBottom) {
            const hasNewContent = scrollHeight > lastKnownScrollHeight;
            if (!isNearBottom || hasNewContent) {
                window.scrollTo(0, scrollHeight);
                didScroll = true;
            }
        } else {
            window.scrollBy(0, settings.step || 300);
            didScroll = true;
        }

        lastKnownScrollHeight = scrollHeight;
        scheduleNextAutoScroll(didScroll ? getAutoScrollDelayMs() : Math.max(500, getAutoScrollDelayMs()), true);
    }

    function startAutoScroll() {
        if (scrollTimerId) {
            clearTimeout(scrollTimerId);
            scrollTimerId = null;
        }
        lastKnownScrollHeight = 0;
        scheduleNextAutoScroll(0, true);
    }

    function stopAutoScroll() {
        if (scrollTimerId) {
            clearTimeout(scrollTimerId);
            scrollTimerId = null;
        }
        if (autoScrollStopTimerId) {
            clearTimeout(autoScrollStopTimerId);
            autoScrollStopTimerId = null;
        }
        if (remainingTimeTimerId) {
            clearTimeout(remainingTimeTimerId);
            remainingTimeTimerId = null;
        }
        isAutoScrollEnabled = false;
        autoScrollEndAt = null;
        activeDurationSeconds = null;
        lastKnownScrollHeight = 0;
        updateDurationButtonsState();
        updateRemainingTimeDisplay();
    }

    function startTimedAutoScroll(durationSeconds) {
        if (!isActive || !yusIsPlaylistPage()) return;

        if (autoScrollStopTimerId) {
            clearTimeout(autoScrollStopTimerId);
        }

        isAutoScrollEnabled = true;
        activeDurationSeconds = durationSeconds;
        autoScrollEndAt = Date.now() + (durationSeconds * 1000);
        autoScrollStopTimerId = window.setTimeout(() => {
            autoScrollStopTimerId = null;
            stopAutoScroll();
        }, durationSeconds * 1000);

        updateDurationButtonsState();
        scheduleRemainingTimeUpdate();
        startAutoScroll();
    }

    function restartAutoScrollIfActive() {
        if (!isAutoScrollEnabled || !isActive || !yusIsPlaylistPage()) return;
        updateDurationButtonsState();
        scheduleRemainingTimeUpdate();
        startAutoScroll();
    }

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

    function collectSpinnerElements(node, targetSet) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

        if (node.matches && node.matches(SPINNER_SELECTOR)) {
            targetSet.add(node);
        }

        if (node.childElementCount > 0 && node.querySelectorAll) {
            node.querySelectorAll(SPINNER_SELECTOR).forEach((spinner) => targetSet.add(spinner));
        }
    }

    function scheduleLoadingMutationProcessing() {
        if (!isActive || loadingMutationProcessTimerId) return;

        loadingMutationProcessTimerId = window.setTimeout(() => {
            loadingMutationProcessTimerId = null;
            processPendingLoadingMutations();
        }, 50);
    }

    function processPendingLoadingMutations() {
        if (!isActive) return;

        let shouldCheck = false;

        if (pendingSpinnerRemovals.size > 0) {
            pendingSpinnerRemovals.forEach((spinner) => cachedSpinners.delete(spinner));
            pendingSpinnerRemovals.clear();
            shouldCheck = true;
        }

        if (pendingSpinnerAdds.size > 0) {
            pendingSpinnerAdds.forEach((spinner) => cachedSpinners.add(spinner));
            pendingSpinnerAdds.clear();
            shouldCheck = true;
        }

        if (shouldCheck) {
            scheduleLoadingStateCheck();
        }
    }


    function createPanel() {
        if (document.getElementById('yt-scroller-panel')) return;

        const templateStr = GM_getResourceText('ytScrollerTemplate');
        if (!templateStr) {
            console.error('[YouTube Playlist Scroller] Failed to load template.html');
            return;
        }

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.23';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);

        yusRestorePosition(panel, PANEL_POS_KEY, { bottom: '300px', right: '20px' });
        const headerRow = panel.querySelector('#yt-scroller-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-scroller-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        panel.querySelectorAll('[data-duration-seconds]').forEach((button) => {
            button.addEventListener('click', () => {
                const durationSeconds = Number(button.getAttribute('data-duration-seconds'));
                if (durationSeconds > 0) {
                    startTimedAutoScroll(durationSeconds);
                }
            });
        });

        const asCheckbox = panel.querySelector('#yt-scroller-bottom-check');
        asCheckbox.checked = settings.scrollToBottom;

        const stepInputContainer = panel.querySelector('#yt-scroller-step-container');
        const stepInput = panel.querySelector('#yt-scroller-step-input');
        const intervalInput = panel.querySelector('#yt-scroller-interval-input');

        stepInput.value = settings.step;
        intervalInput.value = settings.interval;

        const updateStepVisibility = () => {
            if (settings.scrollToBottom) {
                stepInputContainer.style.display = 'none';
            } else {
                stepInputContainer.style.display = 'flex';
            }
        };

        const attachInputLogic = (inputEl, key) => {
            inputEl.addEventListener('change', () => {
                let val = parseFloat(inputEl.value);
                if (isNaN(val) || val < 0) val = key === 'interval' ? 1 : 0;
                settings[key] = val;
                saveSettings();
                restartAutoScrollIfActive();
            });
        };

        attachInputLogic(stepInput, 'step');
        attachInputLogic(intervalInput, 'interval');

        asCheckbox.addEventListener('change', () => {
            settings.scrollToBottom = asCheckbox.checked;
            saveSettings();
            updateStepVisibility();
            restartAutoScrollIfActive();
        });

        updateStepVisibility();
        updateDurationButtonsState();
        updateRemainingTimeDisplay();

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
    }


    function startMain() {
        if (isActive || !yusIsPlaylistPage()) return;
        isActive = true;

        createPanel();
        attachPanelResizeHandler();
        yusSetPanelActive(panel, true);
        updateDurationButtonsState();
        updateRemainingTimeDisplay();
        ensureLoadingObserver();
    }

    function stopMain() {
        if (!isActive) return;
        isActive = false;

        stopAutoScroll();

        if (loadingObserverTimerId) {
            clearTimeout(loadingObserverTimerId);
            loadingObserverTimerId = null;
        }

        if (loadingObserver) {
            loadingObserver.disconnect();
            loadingObserver = null;
        }

        if (loadingStateCheckTimerId) {
            clearTimeout(loadingStateCheckTimerId);
            loadingStateCheckTimerId = null;
        }
        if (loadingMutationProcessTimerId) {
            clearTimeout(loadingMutationProcessTimerId);
            loadingMutationProcessTimerId = null;
        }
        cachedSpinners.clear();
        pendingSpinnerAdds.clear();
        pendingSpinnerRemovals.clear();
        lastLoadingState = null;
        loadingObserverRetryDelayMs = BASE_OBSERVER_RETRY_DELAY_MS;
        detachPanelResizeHandler();

        yusSetPanelActive(panel, false);
    }

    // --- Loading Indicator Logic ---

    function ensureLoadingObserver() {
        if (!isActive || loadingObserver || loadingObserverTimerId) return;

        const container = document.querySelector('ytd-playlist-video-list-renderer');
        if (!container) {
            const retryDelay = loadingObserverRetryDelayMs;
            loadingObserverRetryDelayMs = Math.min(loadingObserverRetryDelayMs * 2, MAX_OBSERVER_RETRY_DELAY_MS);
            loadingObserverTimerId = window.setTimeout(() => {
                loadingObserverTimerId = null;
                ensureLoadingObserver();
            }, retryDelay);
            return;
        }

        loadingObserverRetryDelayMs = BASE_OBSERVER_RETRY_DELAY_MS;
        cachedSpinners.clear();
        const initialSpinners = container.querySelectorAll(SPINNER_SELECTOR);
        initialSpinners.forEach(spinner => cachedSpinners.add(spinner));

        loadingObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        collectSpinnerElements(node, pendingSpinnerAdds);
                    }
                    for (const node of mutation.removedNodes) {
                        collectSpinnerElements(node, pendingSpinnerRemovals);
                    }
                }
                if (
                    mutation.type === 'attributes' &&
                    mutation.target &&
                    mutation.target.nodeType === Node.ELEMENT_NODE &&
                    mutation.target.matches &&
                    mutation.target.matches(SPINNER_SELECTOR)
                ) {
                    pendingSpinnerAdds.add(mutation.target);
                }
            }
            scheduleLoadingMutationProcessing();
        });

        loadingObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['active', 'aria-hidden', 'hidden', 'style']
        });

        // Initial check
        checkLoadingState();
    }

    function scheduleLoadingStateCheck() {
        if (!isActive || loadingStateCheckTimerId) return;

        loadingStateCheckTimerId = window.setTimeout(() => {
            loadingStateCheckTimerId = null;
            checkLoadingState();
        }, 50);
    }

    function checkLoadingState() {
        if (!isActive || !yusIsPlaylistPage()) return;

        let isLoading = false;

        for (const spinner of Array.from(cachedSpinners)) {
            if (!spinner.isConnected) {
                cachedSpinners.delete(spinner);
                continue;
            }

            if (spinner.hidden) {
                continue;
            }

            // Check if active (attribute) or not hidden (aria) AND visible in layout
            const isActiveState = spinner.hasAttribute('active') || spinner.getAttribute('aria-hidden') !== 'true';
            if (!isActiveState) {
                continue;
            }

            const inlineStyle = spinner.getAttribute('style');
            if (inlineStyle && /display\s*:\s*none/i.test(inlineStyle)) {
                continue;
            }

            const isVisible = window.getComputedStyle(spinner).display !== 'none';
            if (isActiveState && isVisible) {
                isLoading = true;
                break;
            }
        }

        if (lastLoadingState === isLoading) {
            return;
        }
        lastLoadingState = isLoading;
        updatePanelLoadingState(isLoading);

        if (!isLoading) {
            scheduleNextAutoScroll(0, true);
        }
    }

    function updatePanelLoadingState(isLoading) {
        const statusEl = document.getElementById('yt-scroller-loading-status');
        if (!statusEl) return;

        if (isLoading) {
            statusEl.textContent = 'Loading...';
            statusEl.style.color = '#ff0000';
            statusEl.style.fontWeight = 'bold';
        } else {
            statusEl.textContent = 'Idle';
            statusEl.style.color = '#888';
            statusEl.style.fontWeight = 'normal';
        }
    }


    yusInitApp({
        appName: 'YouTube Playlist Scroller',
        startMain: startMain,
        stopMain: stopMain
    });

})();
