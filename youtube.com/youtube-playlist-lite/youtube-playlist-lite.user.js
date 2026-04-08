// ==UserScript==
// @name         YouTube Playlist Lite
// @namespace    userscript.moukaeritai.work
// @version      0.1.28
// @description  YouTubeプレイリスト表示でサムネイルを非表示にして軽量化するためのツールです。
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
// @resource     ytLiteTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// ==/UserScript==

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusUpdatePanelVisibility, yusParseHTML */
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

    // --- Configuration ---
    const PANEL_POS_KEY = 'yt_lite_panel_position';
    const HIDE_THUMB_KEY = 'yt_lite_hide_thumbnails';
    const FORCE_REMOVE_KEY = 'yt_lite_force_remove';
    const HIDE_MINIPLAYER_KEY = 'yt_lite_hide_miniplayer';
    const REMOVE_MINIPLAYER_KEY = 'yt_lite_remove_miniplayer';
    const INIT_DELAY_RANGE_MS = { min: 1000, max: 3000 };
    const MINIMIZED_STATE_KEY = 'yt_lite_is_minimized';

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
        }
    };

    function getPageConfig() {
        if (location.pathname.startsWith('/playlist')) return PAGE_CONFIG.playlist;
        return null;
    }

    // --- Utilities ---
    function debounce(fn, ms) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // --- Core Logic ---
    let styleElement = null;
    let panel = null;

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
            performDebouncedCleanup();
        } else {
            stopObserver();
        }

        // Miniplayer Removal (One-time check on settings apply)
        if (isRemoveMiniplayer) {
            removeMiniplayerIfPresent();
        }
    }

    function removeMiniplayerIfPresent() {
        const miniplayer = document.querySelector('ytd-miniplayer');
        if (miniplayer) {
            miniplayer.remove();
            console.log('[YouTube Playlist Lite] Removed miniplayer.');
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

    const performDebouncedCleanup = debounce(() => {
        const pageConfig = getPageConfig();
        if (pageConfig && isForceRemove) {
            clearExistingThumbnails(pageConfig);
        }
        if (isRemoveMiniplayer) {
            removeMiniplayerIfPresent();
        }
    }, 150);

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

        observer = new MutationObserver(performDebouncedCleanup);
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

        const templateStr = GM_getResourceText('ytLiteTemplate');
        if (!templateStr) {
            console.error('[YouTube Playlist Lite] Failed to load template.html');
            return;
        }

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.28';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);

        yusRestorePosition(panel, PANEL_POS_KEY, { bottom: '260px', right: '20px' });
        const headerRow = panel.querySelector('#yt-lite-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-lite-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        const bindCheckbox = (id, key) => {
            const cb = panel.querySelector(`#${id}`);
            cb.checked = GM_getValue(key, false);
            cb.addEventListener('change', (e) => {
                GM_setValue(key, e.target.checked);
                applySettings();
            });
        };

        bindCheckbox('yt-lite-hide-thumb', HIDE_THUMB_KEY);
        bindCheckbox('yt-lite-force-remove', FORCE_REMOVE_KEY);
        bindCheckbox('yt-lite-hide-miniplayer', HIDE_MINIPLAYER_KEY);
        bindCheckbox('yt-lite-remove-miniplayer', REMOVE_MINIPLAYER_KEY);

        const clearBtn = panel.querySelector('#yt-lite-clear-btn');
        clearBtn.addEventListener('click', () => {
             clearExistingThumbnails(getPageConfig());
             if (isRemoveMiniplayer) {
                 const mini = document.querySelector('ytd-miniplayer');
                 if (mini) mini.remove();
             }
        });

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        });
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
        yusSetPanelActive(panel, !!pageConfig);

        if (!pageConfig) {
            cleanupFeatures();
            return;
        }

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
