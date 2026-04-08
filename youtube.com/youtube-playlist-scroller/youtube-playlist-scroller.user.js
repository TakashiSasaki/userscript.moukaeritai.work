// ==UserScript==
// @name         YouTube Playlist Scroller
// @namespace    userscript.moukaeritai.work
// @version      0.1.27
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
    let scrollInterval = null;
    let isAutoScrollEnabled = false;
    let isActive = false;
    let loadingObserver = null;
    let loadingObserverTimerId = null;
    let loadingCheckIntervalId = null;
    let panel = null;
    const cachedSpinners = new Set();

    function saveSettings() {
        GM_setValue(SETTINGS_KEY, settings);
    }


    function updateToggleButtonState(btn, enabled) {
        if (!btn) return;
        btn.textContent = enabled ? 'ON' : 'OFF';
        btn.style.backgroundColor = enabled ? '#2ba640' : '#ccc';
        btn.style.color = enabled ? '#fff' : '#000';
    }

    function startAutoScroll() {
        stopAutoScroll();

        const intervalMs = Math.max(100, (settings.interval || 5) * 1000);
        const runScroll = () => {
            if (settings.scrollToBottom) {
                window.scrollTo(0, document.documentElement.scrollHeight);
            } else {
                window.scrollBy(0, settings.step || 300);
            }
        };

        runScroll();
        scrollInterval = setInterval(runScroll, intervalMs);
    }

    function stopAutoScroll() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    function applyAutoScrollState() {
        const btn = document.getElementById('yt-scroller-toggle-btn');
        updateToggleButtonState(btn, isAutoScrollEnabled);

        if (!isActive || !yusIsPlaylistPage()) {
            stopAutoScroll();
            return;
        }

        if (isAutoScrollEnabled) {
            startAutoScroll();
        } else {
            stopAutoScroll();
        }
    }

    function toggleAutoScroll() {
        isAutoScrollEnabled = !isAutoScrollEnabled;
        applyAutoScrollState();
    }

    function restartAutoScrollIfActive() {
        if (!isAutoScrollEnabled || !isActive || !yusIsPlaylistPage()) return;
        startAutoScroll();
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

        const toggleBtn = panel.querySelector('#yt-scroller-toggle-btn');
        toggleBtn.addEventListener('click', toggleAutoScroll);

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

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        });
    }


    function startMain() {
        if (isActive || !yusIsPlaylistPage()) return;
        isActive = true;

        createPanel();
        yusSetPanelActive(panel, true);
        applyAutoScrollState();
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

        if (loadingCheckIntervalId) {
            clearInterval(loadingCheckIntervalId);
            loadingCheckIntervalId = null;
        }
        cachedSpinners.clear();

        yusSetPanelActive(panel, false);
    }

    // --- Loading Indicator Logic ---

    function ensureLoadingObserver() {
        if (!isActive || loadingObserver || loadingObserverTimerId) return;

        const container = document.querySelector('ytd-playlist-video-list-renderer');
        if (!container) {
            loadingObserverTimerId = window.setTimeout(() => {
                loadingObserverTimerId = null;
                ensureLoadingObserver();
            }, 1000);
            return;
        }

        cachedSpinners.clear();
        const initialSpinners = container.querySelectorAll('tp-yt-paper-spinner, tp-yt-paper-spinner-lite');
        initialSpinners.forEach(spinner => cachedSpinners.add(spinner));

        loadingObserver = new MutationObserver((mutations) => {
            let shouldCheck = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'TP-YT-PAPER-SPINNER' || node.tagName === 'TP-YT-PAPER-SPINNER-LITE') {
                                cachedSpinners.add(node);
                                shouldCheck = true;
                            } else if (node.querySelectorAll) {
                                const newSpinners = node.querySelectorAll('tp-yt-paper-spinner, tp-yt-paper-spinner-lite');
                                if (newSpinners.length > 0) {
                                    newSpinners.forEach(spinner => cachedSpinners.add(spinner));
                                    shouldCheck = true;
                                }
                            }
                        }
                    }
                    for (const node of mutation.removedNodes) {
                         if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'TP-YT-PAPER-SPINNER' || node.tagName === 'TP-YT-PAPER-SPINNER-LITE') {
                                cachedSpinners.delete(node);
                                shouldCheck = true;
                            } else if (node.querySelectorAll) {
                                const removedSpinners = node.querySelectorAll('tp-yt-paper-spinner, tp-yt-paper-spinner-lite');
                                if (removedSpinners.length > 0) {
                                    removedSpinners.forEach(spinner => cachedSpinners.delete(spinner));
                                    shouldCheck = true;
                                }
                            }
                        }
                    }
                }
            }
            if (shouldCheck) {
                checkLoadingState();
            }
        });

        loadingObserver.observe(container, {
            childList: true,
            subtree: true
        });

        if (loadingCheckIntervalId) {
            clearInterval(loadingCheckIntervalId);
        }
        loadingCheckIntervalId = setInterval(() => {
            checkLoadingState();
        }, 500);

        // Initial check
        checkLoadingState();
    }

    function checkLoadingState() {
        if (!isActive || !yusIsPlaylistPage()) return;

        let isLoading = false;

        for (const spinner of cachedSpinners) {
            // Check if active (attribute) or not hidden (aria) AND visible in layout
            const isActiveState = spinner.hasAttribute('active') || spinner.getAttribute('aria-hidden') !== 'true';
            const isVisible = window.getComputedStyle(spinner).display !== 'none';
            if (isActiveState && isVisible) {
                isLoading = true;
                break;
            }
        }

        updatePanelLoadingState(isLoading);
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
