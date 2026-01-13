// ==UserScript==
// @name         YouTube Playlist Lite
// @namespace    userscript.moukaeritai.work
// @version      0.1.13
// @description  YouTubeプレイリストや再生履歴でサムネイルを非表示にして軽量化するためのツールです。
// @antifeature  webRequestBlocking
// @author       Takashi Sasaki
// @match        *://www.youtube.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Handle installation check on the portal site
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

    // --- Configuration ---
    const PANEL_POS_KEY = 'yt_lite_panel_position';
    const HIDE_THUMB_KEY = 'yt_lite_hide_thumbnails';
    const FORCE_REMOVE_KEY = 'yt_lite_force_remove';
    const HIDE_MINIPLAYER_KEY = 'yt_lite_hide_miniplayer';
    const REMOVE_MINIPLAYER_KEY = 'yt_lite_remove_miniplayer';
    const INIT_DELAY_RANGE_MS = { min: 1000, max: 3000 };

    let isAutoMinimized = false;
    let panelPos = GM_getValue(PANEL_POS_KEY, { bottom: '260px', right: '20px' });
    let isHideThumbnails = GM_getValue(HIDE_THUMB_KEY, false);
    let isForceRemove = GM_getValue(FORCE_REMOVE_KEY, false);
    let isHideMiniplayer = GM_getValue(HIDE_MINIPLAYER_KEY, false);
    let isRemoveMiniplayer = GM_getValue(REMOVE_MINIPLAYER_KEY, false);
    const PAGE_CONFIG = {
        playlist: {
            thumbSelector: 'ytd-playlist-video-renderer ytd-thumbnail, ytd-playlist-header-renderer ytd-hero-playlist-thumbnail-renderer',
            matchSelector: 'ytd-thumbnail, ytd-hero-playlist-thumbnail-renderer',
            ancestorSelector: 'ytd-playlist-video-renderer, ytd-playlist-header-renderer',
            observerRootSelector: 'ytd-playlist-video-list-renderer #contents'
        },
        history: {
            thumbSelector: 'ytd-item-section-renderer a.yt-lockup-view-model__content-image, ytd-item-section-renderer yt-thumbnail-view-model',
            matchSelector: 'a.yt-lockup-view-model__content-image, yt-thumbnail-view-model',
            ancestorSelector: 'ytd-item-section-renderer',
            observerRootSelector: 'ytd-section-list-renderer #contents'
        }
    };

    function getPageConfig() {
        if (location.pathname === '/playlist') return PAGE_CONFIG.playlist;
        if (location.pathname.startsWith('/feed/history')) return PAGE_CONFIG.history;
        return null;
    }

    // --- Core Logic ---
    let styleElement = null;
    let panel = null;
    let contentContainer = null;

    function setPanelActiveState(active) {
        const label = document.getElementById('yt-lite-active-indicator');
        if (label) {
            label.textContent = active ? 'Active' : 'Inactive';
            label.style.backgroundColor = active ? '#e6f4ea' : '#e0e0e0';
            label.style.color = active ? '#188038' : '#666';
        }

        if (contentContainer) {
            contentContainer.style.display = active ? 'flex' : 'none';
        }

        if (panel) {
            panel.style.opacity = active ? '1' : '0.85';
        }
    }

    function updatePanelVisibility() {
        setPanelActiveState(!isAutoMinimized);
    }

    function applySettings() {
        const pageConfig = getPageConfig();
        if (!pageConfig) return;

        // Read latest values from storage to be sure
        isHideThumbnails = GM_getValue(HIDE_THUMB_KEY, false);
        isForceRemove = GM_getValue(FORCE_REMOVE_KEY, false);
        isHideMiniplayer = GM_getValue(HIDE_MINIPLAYER_KEY, false);
        isRemoveMiniplayer = GM_getValue(REMOVE_MINIPLAYER_KEY, false);

        // CSS Hide Mode
        let css = '';
        if (isHideThumbnails) {
            css += `${pageConfig.thumbSelector} { display: none !important; } `;
        }
        if (isHideMiniplayer) {
            css += `ytd-miniplayer { display: none !important; } `;
        }

        if (css) {
            if (!styleElement || !styleElement.isConnected) {
                styleElement = document.createElement('style');
                styleElement.id = 'yt-lite-styles';
                document.head.appendChild(styleElement);
            }
            styleElement.textContent = css;
        } else if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }

        // DOM Removal Mode
        if (isForceRemove) {
            stopObserver();
            startObserver();
            clearExistingThumbnails(pageConfig);
        } else {
            stopObserver();
        }

        if (isRemoveMiniplayer) {
            const miniplayer = document.querySelector('ytd-miniplayer');
            if (miniplayer) {
                miniplayer.remove();
                console.log('[YouTube Playlist Lite] Removed miniplayer.');
            }
        }
    }

    function clearExistingThumbnails(pageConfig) {
        if (!pageConfig) return;
        const thumbs = document.querySelectorAll(pageConfig.thumbSelector);
        thumbs.forEach(el => el.remove());
        if (thumbs.length > 0) {
            console.log(`[YouTube Playlist Lite] Removed ${thumbs.length} thumbnails.`);
        }
    }

    let observer = null;
    function startObserver() {
        if (observer) return;
        if (!GM_getValue(FORCE_REMOVE_KEY, false)) return;
        const pageConfig = getPageConfig();
        if (!pageConfig) return;
        const root = document.querySelector(pageConfig.observerRootSelector);
        if (!root) {
            setTimeout(startObserver, 1000);
            return;
        }
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node;
                        if (element.matches(pageConfig.matchSelector) && element.closest(pageConfig.ancestorSelector)) {
                            element.remove();
                        }
                        const targets = element.querySelectorAll(pageConfig.thumbSelector);
                        targets.forEach(target => {
                            if (target.closest(pageConfig.ancestorSelector)) {
                                target.remove();
                            }
                        });
                    }
                });
            }
        });
        observer.observe(root, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // --- UI Creation ---
    function createPanel() {
        if (document.getElementById('yt-lite-panel')) return;

        panel = document.createElement('div');
        panel.id = 'yt-lite-panel';

        // Styles
        Object.assign(panel.style, {
            position: 'fixed',
            zIndex: 9999,
            backgroundColor: '#f0f8ff',
            border: '1px solid #00f',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            width: '180px',
            color: '#333',
            fontFamily: 'Roboto, Arial, sans-serif'
        });

        if (panelPos.top) panel.style.top = panelPos.top;
        if (panelPos.left) panel.style.left = panelPos.left;
        if (panelPos.bottom) panel.style.bottom = panelPos.bottom;
        if (panelPos.right) panel.style.right = panelPos.right;

        const headerRow = document.createElement('div');
        Object.assign(headerRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', cursor: 'move' });

        let isDragging = false, dragStartX, dragStartY, initialLeft, initialTop;
        headerRow.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
            isDragging = true;
            dragStartX = e.clientX; dragStartY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialLeft = rect.left; initialTop = rect.top;
            panel.style.bottom = 'auto'; panel.style.right = 'auto';
            panel.style.left = `${initialLeft}px`; panel.style.top = `${initialTop}px`;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
            panel.style.top = `${initialTop + (e.clientY - dragStartY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panelPos = { top: panel.style.top, left: panel.style.left, bottom: '', right: '' };
                GM_setValue(PANEL_POS_KEY, panelPos);
            }
        });

        const titleLabel = document.createElement('span');
        const v = (typeof GM_info !== 'undefined') ? GM_info.script.version : '0.1.11';
        titleLabel.textContent = `Lite v${v}`;
        Object.assign(titleLabel.style, { fontWeight: 'bold', fontSize: '11px', pointerEvents: 'none' });

        const activeLabel = document.createElement('span');
        activeLabel.id = 'yt-lite-active-indicator';
        activeLabel.textContent = 'Inactive';
        Object.assign(activeLabel.style, {
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: '#e0e0e0',
            color: '#666'
        });

        contentContainer = document.createElement('div');
        contentContainer.id = 'yt-lite-panel-content';
        Object.assign(contentContainer.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(activeLabel);
        panel.appendChild(headerRow);
        panel.appendChild(contentContainer);

        // Options
        const createCheckbox = (id, text, checked, onChange) => {
            const container = document.createElement('div');
            Object.assign(container.style, { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' });
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.id = id; cb.checked = checked;
            cb.addEventListener('change', onChange);
            const lbl = document.createElement('label');
            lbl.htmlFor = id; lbl.textContent = text; lbl.style.cursor = 'pointer';
            container.appendChild(cb);
            container.appendChild(lbl);
            return container;
        };

        contentContainer.appendChild(createCheckbox('yt-lite-hide-thumb', 'Hide Thumbs (CSS)', isHideThumbnails, (e) => {
            GM_setValue(HIDE_THUMB_KEY, e.target.checked);
            applySettings();
        }));

        contentContainer.appendChild(createCheckbox('yt-lite-force-remove', 'Remove Thumbs (DOM)', isForceRemove, (e) => {
            GM_setValue(FORCE_REMOVE_KEY, e.target.checked);
            applySettings();
        }));

        contentContainer.appendChild(document.createElement('hr')).style.margin = '2px 0';

        contentContainer.appendChild(createCheckbox('yt-lite-hide-miniplayer', 'Hide Miniplayer (CSS)', isHideMiniplayer, (e) => {
            GM_setValue(HIDE_MINIPLAYER_KEY, e.target.checked);
            applySettings();
        }));

        contentContainer.appendChild(createCheckbox('yt-lite-remove-miniplayer', 'Remove Miniplayer (DOM)', isRemoveMiniplayer, (e) => {
            GM_setValue(REMOVE_MINIPLAYER_KEY, e.target.checked);
            applySettings();
        }));

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Thumbs Now';
        Object.assign(clearBtn.style, {
            padding: '4px', fontSize: '10px', backgroundColor: '#eef', border: '1px solid #99f', borderRadius: '4px', cursor: 'pointer'
        });
        clearBtn.addEventListener('click', () => {
             clearExistingThumbnails(getPageConfig());
             if (isRemoveMiniplayer) {
                 const mini = document.querySelector('ytd-miniplayer');
                 if (mini) mini.remove();
             }
        });
        contentContainer.appendChild(clearBtn);

        document.body.appendChild(panel);
        updatePanelVisibility();
    }

    // --- Init & Navigation ---
    function cleanupFeatures() {
        stopObserver();
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    }

    function refreshForLocation() {
        const pageConfig = getPageConfig();
        createPanel();

        if (!pageConfig) {
            isAutoMinimized = true;
            updatePanelVisibility();
            cleanupFeatures();
            return;
        }

        isAutoMinimized = false;
        updatePanelVisibility();
        applySettings();
    }

    function init() {
        window.addEventListener('yt-navigate-start', cleanupFeatures);
        window.addEventListener('yt-navigate-finish', () => {
            setTimeout(refreshForLocation, 500);
        });

        refreshForLocation();
        console.log('[YouTube Playlist Lite] Running...');
    }

    function getRandomInitDelayMs() {
        const span = INIT_DELAY_RANGE_MS.max - INIT_DELAY_RANGE_MS.min;
        return INIT_DELAY_RANGE_MS.min + Math.floor(Math.random() * (span + 1));
    }

    setTimeout(init, getRandomInitDelayMs());

})();
