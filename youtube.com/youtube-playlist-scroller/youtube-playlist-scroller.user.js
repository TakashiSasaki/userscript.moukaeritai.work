// ==UserScript==
// @name         YouTube Playlist Scroller
// @namespace    userscript.moukaeritai.work
// @version      0.1.3
// @description  YouTubeプレイリストを自動的にスクロールし、バックグラウンドでの読み込みを支援します。
// @author       Takashi Sasaki
// @match        *://www.youtube.com/playlist?*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1') {
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

    const SETTINGS_KEY = 'yt_scroller_settings';
    const PANEL_STATE_KEY = 'yt_scroller_panel_minimized';
    const PANEL_POS_KEY = 'yt_scroller_panel_position';

    let settings = GM_getValue(SETTINGS_KEY, {
        scrollToBottom: true,
        step: 300,
        interval: 5.0
    });
    let isMinimized = GM_getValue(PANEL_STATE_KEY, false);
    let panelPos = GM_getValue(PANEL_POS_KEY, { top: '', left: '', bottom: '300px', right: '20px' });
    let scrollInterval = null;

    function saveSettings() {
        GM_setValue(SETTINGS_KEY, settings);
    }

    function toggleAutoScroll(btn) {
        if (!btn) btn = document.getElementById('yt-scroller-toggle-btn');
        if (!btn) return;

        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            btn.textContent = 'OFF';
            btn.style.backgroundColor = '#ccc';
            btn.style.color = '#000';
        } else {
            btn.textContent = 'ON';
            btn.style.backgroundColor = '#2ba640';
            btn.style.color = '#fff';

            const intervalMs = Math.max(100, (settings.interval || 5) * 1000);
            const runScroll = () => {
                if (settings.scrollToBottom) {
                    window.scrollTo(0, document.documentElement.scrollHeight);
                } else {
                    window.scrollBy(0, settings.step || 300);
                }
            };

            // Run immediately once
            runScroll();
            scrollInterval = setInterval(runScroll, intervalMs);
        }
    }

    function restartAutoScrollIfActive() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            const intervalMs = Math.max(100, (settings.interval || 5) * 1000);

            const runScroll = () => {
                if (settings.scrollToBottom) {
                    window.scrollTo(0, document.documentElement.scrollHeight);
                } else {
                    window.scrollBy(0, settings.step || 300);
                }
            };

            scrollInterval = setInterval(runScroll, intervalMs);
        }
    }

    function createPanel() {
        if (document.getElementById('yt-scroller-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-scroller-panel';

        // Initial Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#f4f4f4',
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
            // Prevent dragging if clicking the minimize button
            if (e.target === minimizeBtn) return;

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
        const version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.1';
        titleLabel.textContent = `Auto Scroller v${version}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' }); // pointerEvents none to ensure click goes to header

        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        Object.assign(minimizeBtn.style, {
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '0 4px',
            lineHeight: '1',
            color: '#666'
        });

        const contentContainer = document.createElement('div');
        Object.assign(contentContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });

        const updatePanelMinState = (min) => {
            contentContainer.style.display = min ? 'none' : 'flex';
            minimizeBtn.textContent = min ? '+' : '−';
            isMinimized = min;
            GM_setValue(PANEL_STATE_KEY, min);
        };

        minimizeBtn.addEventListener('click', () => {
            updatePanelMinState(!isMinimized);
        });

        updatePanelMinState(isMinimized);

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(minimizeBtn);
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
        toggleBtn.addEventListener('click', () => toggleAutoScroll(toggleBtn));

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
        const intervalInputObj = createScrollInput('Interval (sec):', 'interval', '5');

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

    function checkAndInit() {
        if (!document.getElementById('yt-scroller-panel')) {
            createPanel();
        }
    }

    // Initialize
    const run = () => {
        // Initial delay to let page load slightly
        setTimeout(checkAndInit, 1000);

        // Keepalive
        setInterval(() => {
            if (window.location.pathname === '/playlist') {
                checkAndInit();
                setupLoadingObserver(); // Ensure observer is attached
            } else {
                const p = document.getElementById('yt-scroller-panel');
                if (p) p.remove();
                if (loadingObserver) {
                    loadingObserver.disconnect();
                    loadingObserver = null;
                }
            }
        }, 2000);
    };

    // --- Loading Indicator Logic ---
    let loadingObserver = null;

    function setupLoadingObserver() {
        if (loadingObserver) return; // Already setup

        const container = document.querySelector('ytd-playlist-video-list-renderer');
        if (!container) return; // Not ready yet

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
    window.addEventListener('yt-navigate-finish', run);
    run();

})();
