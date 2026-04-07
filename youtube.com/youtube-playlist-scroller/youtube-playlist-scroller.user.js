// ==UserScript==
// @name         YouTube Playlist Scroller
// @namespace    userscript.moukaeritai.work
// @version      0.1.16
// @description  YouTubeプレイリストを自動的にスクロールし、バックグラウンドでの読み込みを支援します。
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
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
// ==/UserScript==

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

    const PLAYLIST_PATH = '/playlist';
    const SETTINGS_KEY = 'yt_scroller_settings';
    const PANEL_POS_KEY = 'yt_scroller_panel_position';
    const MINIMIZED_STATE_KEY = 'yt_scroller_is_minimized';
    const INIT_DELAY_RANGE_MS = { min: 1000, max: 3000 };

    let settings = GM_getValue(SETTINGS_KEY, {
        scrollToBottom: true,
        step: 300,
        interval: 20.0
    });
    let panelPos = GM_getValue(PANEL_POS_KEY, { top: '', left: '', bottom: '300px', right: '20px' });
    let isManuallyMinimized = GM_getValue(MINIMIZED_STATE_KEY, false);
    let scrollInterval = null;
    let isAutoScrollEnabled = false;
    let isActive = false;
    let loadingObserver = null;
    let loadingObserverTimerId = null;
    let loadingCheckIntervalId = null;
    let panel = null;
    let contentContainer = null;
    const cachedSpinners = new Set();

    function saveSettings() {
        GM_setValue(SETTINGS_KEY, settings);
    }

    function isPlaylistPage() {
        return location.hostname === 'www.youtube.com' &&
            location.pathname === PLAYLIST_PATH &&
            location.search.length > 1;
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

        if (!isActive || !isPlaylistPage()) {
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
        if (!isAutoScrollEnabled || !isActive || !isPlaylistPage()) return;
        startAutoScroll();
    }

    function checkPanelPosition() {
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let newLeft = rect.left;
        let newTop = rect.top;
        let needsUpdate = false;

        if (rect.right > vw) {
            newLeft = Math.max(0, vw - rect.width);
            needsUpdate = true;
        }
        if (rect.left < 0) {
            newLeft = 0;
            needsUpdate = true;
        }
        if (rect.bottom > vh) {
            newTop = Math.max(0, vh - rect.height);
            needsUpdate = true;
        }
        if (rect.top < 0) {
            newTop = 0;
            needsUpdate = true;
        }

        if (needsUpdate) {
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
            panelPos = { top: panel.style.top, left: panel.style.left, bottom: '', right: '' };
            GM_setValue(PANEL_POS_KEY, panelPos);
        }
    }


    function createPanel() {
        if (document.getElementById('yt-scroller-panel')) return;

        panel = document.createElement('div');
        panel.id = 'yt-scroller-panel';
        panel.className = 'yus-panel';

        // Override colors for Scroller
        panel.style.backgroundColor = '#fffde7';
        panel.style.borderColor = '#ccc';
        panel.style.setProperty('--yus-hover-color', '#00f');

        // Apply saved position
        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        // --- Header (Title & Minimize Button) ---
        const headerRow = document.createElement('div');
        headerRow.className = 'yus-header';

        // Make header draggable
        headerRow.style.cursor = 'move';

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

            // Switch to absolute positioning if not already
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
            panel.style.left = `${initialLeft}px`;
            panel.style.top = `${initialTop}px`;

            e.preventDefault(); // Prevent text selection
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
                // Save new position
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
        titleLabel.className = 'yus-title';
        const v = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.16';
        titleLabel.textContent = `Auto Scroller v${v}`;
        titleLabel.title = 'Double-click to toggle minimization';

        titleLabel.addEventListener('dblclick', (e) => {
            isManuallyMinimized = !isManuallyMinimized;
            GM_setValue(MINIMIZED_STATE_KEY, isManuallyMinimized);
            updatePanelVisibility();
            e.stopPropagation();
        });

        const contentContainer = document.createElement('div');
        contentContainer.id = 'yt-scroller-panel-content';
        contentContainer.className = 'yus-content';

        headerRow.appendChild(titleLabel);
        panel.appendChild(headerRow);
        panel.appendChild(contentContainer);

        // --- Controls ---

        const controlsHeader = document.createElement('div');
        Object.assign(controlsHeader.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const statusLabel = document.createElement('div');
        statusLabel.textContent = 'Status: ';
        statusLabel.style.fontSize = '12px';

        const loadingStatus = document.createElement('span');
        loadingStatus.id = 'yt-scroller-loading-status';
        loadingStatus.textContent = 'Idle';
        loadingStatus.style.color = '#888';
        loadingStatus.style.marginLeft = '4px';
        statusLabel.appendChild(loadingStatus);

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'yt-scroller-toggle-btn';
        toggleBtn.textContent = 'OFF';
        Object.assign(toggleBtn.style, {
            padding: '2px 8px',
            fontSize: '11px',
            backgroundColor: '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
        });
        toggleBtn.addEventListener('click', toggleAutoScroll);

        controlsHeader.appendChild(statusLabel);
        controlsHeader.appendChild(toggleBtn);
        contentContainer.appendChild(controlsHeader);

        // Checkbox: Scroll to Bottom
        const asCheckboxContainer = document.createElement('div');
        Object.assign(asCheckboxContainer.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' });

        const asCheckbox = document.createElement('input');
        asCheckbox.type = 'checkbox';
        asCheckbox.checked = settings.scrollToBottom;
        asCheckbox.id = 'yt-scroller-bottom-check';

        const asCheckboxLabel = document.createElement('label');
        asCheckboxLabel.textContent = 'Scroll to Bottom';
        asCheckboxLabel.htmlFor = 'yt-scroller-bottom-check';

        // Settings Helpers
        const createScrollInput = (label, key, placeholder) => {
            const container = document.createElement('div');
            Object.assign(container.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginTop: '2px' });

            const lbl = document.createElement('div');
            lbl.textContent = label;
            lbl.style.flex = '1';

            const input = document.createElement('input');
            input.type = 'number';
            input.value = settings[key];
            input.placeholder = placeholder;
            Object.assign(input.style, { width: '50px', padding: '2px', border: '1px solid #ccc', borderRadius: '4px' });

            input.addEventListener('change', () => {
                let val = parseFloat(input.value);
                if (isNaN(val) || val < 0) val = key === 'interval' ? 1 : 0;
                settings[key] = val;
                saveSettings();
                restartAutoScrollIfActive();
            });

            container.appendChild(lbl);
            container.appendChild(input);
            return { container, input };
        };

        const stepInputObj = createScrollInput('Step (px):', 'step', '300');
        const intervalInputObj = createScrollInput('Interval (sec):', 'interval', '20');

        asCheckbox.addEventListener('change', () => {
            settings.scrollToBottom = asCheckbox.checked;
            saveSettings();
            updateStepVisibility();
            restartAutoScrollIfActive();
        });

        function updateStepVisibility() {
            if (settings.scrollToBottom) {
                stepInputObj.container.style.display = 'none';
            } else {
                stepInputObj.container.style.display = 'flex';
            }
        }
        updateStepVisibility();

        asCheckboxContainer.appendChild(asCheckbox);
        asCheckboxContainer.appendChild(asCheckboxLabel);
        contentContainer.appendChild(asCheckboxContainer);

        contentContainer.appendChild(stepInputObj.container);
        contentContainer.appendChild(intervalInputObj.container);

        document.body.appendChild(panel);
        updatePanelVisibility();
        setTimeout(checkPanelPosition, 0);
        window.addEventListener('resize', () => {
            requestAnimationFrame(checkPanelPosition);
        });

    }


    function updatePanelVisibility() {
        const content = document.getElementById('yt-scroller-panel-content');
        const panel = document.getElementById('yt-scroller-panel');
        if (!content || !panel) return;

        const isVisible = isActive && !isManuallyMinimized;
        content.style.display = isVisible ? 'flex' : 'none';
        
        if (isVisible) {
            panel.classList.add('yus-active');
        } else {
            panel.classList.remove('yus-active');
        }
    }


    function showPanel() {
        const panel = document.getElementById('yt-scroller-panel');
        if (panel) panel.style.display = 'flex';
    }

    function startMain() {
        if (isActive || !isPlaylistPage()) return;
        isActive = true;

        createPanel();
        showPanel();
        updatePanelVisibility();
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

        showPanel();
        updatePanelVisibility();
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
        if (!isActive || !isPlaylistPage()) return;

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

    // Navigation handling
    function init() {
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
        const span = INIT_DELAY_RANGE_MS.max - INIT_DELAY_RANGE_MS.min;
        return INIT_DELAY_RANGE_MS.min + Math.floor(Math.random() * (span + 1));
    }

    setTimeout(init, getRandomInitDelayMs());

})();
