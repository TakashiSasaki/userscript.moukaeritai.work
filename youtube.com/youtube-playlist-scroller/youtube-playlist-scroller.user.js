// ==UserScript==
// @name         YouTube Playlist Scroller
// @namespace    userscript.moukaeritai.work
// @version      0.1.7
// @description  YouTubeプレイリストを自動的にスクロールし、バックグラウンドでの読み込みを支援します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
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

    const PLAYLIST_PATH = '/playlist';
    const SETTINGS_KEY = 'yt_scroller_settings';
    const PANEL_POS_KEY = 'yt_scroller_panel_position';

    let settings = GM_getValue(SETTINGS_KEY, {
        scrollToBottom: true,
        step: 300,
        interval: 20.0
    });
    let panelPos = GM_getValue(PANEL_POS_KEY, { top: '', left: '', bottom: '300px', right: '20px' });
    let scrollInterval = null;
    let isAutoScrollEnabled = false;
    let isActive = false;
    let loadingObserver = null;
    let loadingObserverTimerId = null;

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

    function createPanel() {
        if (document.getElementById('yt-scroller-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-scroller-panel';

        // Initial Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#fffde7',
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

        // Apply saved position
        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        // --- Header (Title & Minimize Button) ---
        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
        });

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
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.7';
        titleLabel.textContent = `Auto Scroller v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' });

        const activeLabel = document.createElement('span');
        activeLabel.id = 'yt-scroller-active-indicator';
        activeLabel.textContent = 'Inactive';
        Object.assign(activeLabel.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: '#e0e0e0',
            color: '#666'
        });

        const contentContainer = document.createElement('div');
        contentContainer.id = 'yt-scroller-panel-content';
        Object.assign(contentContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(activeLabel);
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
    }

    function setPanelActiveState(active) {
        const label = document.getElementById('yt-scroller-active-indicator');
        const content = document.getElementById('yt-scroller-panel-content');
        const panel = document.getElementById('yt-scroller-panel');
        if (!label || !content || !panel) return;

        label.textContent = active ? 'Active' : 'Inactive';
        label.style.backgroundColor = active ? '#e6f4ea' : '#e0e0e0';
        label.style.color = active ? '#188038' : '#666';

        content.style.display = active ? 'flex' : 'none';
        panel.style.opacity = active ? '1' : '0.85';
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
        setPanelActiveState(true);
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

        showPanel();
        setPanelActiveState(false);
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

        loadingObserver = new MutationObserver(() => {
            checkLoadingState();
        });

        loadingObserver.observe(container, {
            childList: true,
            subtree: true // Need subtree because spinner might be nested in #spinner-container
        });

        // Initial check
        checkLoadingState();
    }

    function checkLoadingState() {
        if (!isActive || !isPlaylistPage()) return;
        // Broad check for any spinner in the list renderer
        const spinners = document.querySelectorAll('ytd-playlist-video-list-renderer tp-yt-paper-spinner, ytd-playlist-video-list-renderer tp-yt-paper-spinner-lite');
        let isLoading = false;

        for (const spinner of spinners) {
            // Check if active (attribute) or not hidden (aria) AND visible in layout
            const isActive = spinner.hasAttribute('active') || spinner.getAttribute('aria-hidden') !== 'true';
            const isVisible = window.getComputedStyle(spinner).display !== 'none';
            if (isActive && isVisible) {
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
