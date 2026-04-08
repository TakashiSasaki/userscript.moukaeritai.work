// ==UserScript==
// @name         YouTube Playlist Lite
// @namespace    userscript.moukaeritai.work
// @version      0.1.36
// @description  YouTubeプレイリスト表示でサムネイルを非表示にして軽量化するためのツールです。
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
// @resource     ytLiteTemplate https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-lite/youtube-playlist-lite.user.js
// ==/UserScript==

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusUpdatePanelVisibility, yusParseHTML, yusInitApp, yusIsPlaylistPage */
(function () {
    'use strict';

    const commonCss = GM_getResourceText('youtubeCommonCSS');
    if (commonCss) {
        GM_addStyle(commonCss);
    }
    GM_addStyle(`
        #page-manager > ytd-browse > ytd-playlist-header-renderer {
            display: none !important;
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
    const PANEL_POS_KEY = 'yt_lite_panel_position';
    const LEGACY_HIDE_THUMB_KEY = 'yt_lite_hide_thumbnails';
    const LEGACY_REMOVE_THUMB_KEY = 'yt_lite_force_remove';
    const LEGACY_HIDE_MINIPLAYER_KEY = 'yt_lite_hide_miniplayer';
    const LEGACY_REMOVE_MINIPLAYER_KEY = 'yt_lite_remove_miniplayer';
    const TARGET_THUMB_KEY = 'yt_lite_target_thumbnails';
    const TARGET_HEADER_KEY = 'yt_lite_target_header';
    const TARGET_MINIPLAYER_KEY = 'yt_lite_target_miniplayer';
    const ACTION_MODE_KEY = 'yt_lite_action_mode';
    const MINIMIZED_STATE_KEY = 'yt_lite_is_minimized';
    const STORAGE_UNSET = '__unset__';
    let selectedTargets = {
        thumbnails: false,
        header: false,
        miniplayer: false
    };
    let actionMode = 'hide';
    const PAGE_CONFIG = {
        playlist: {
            thumbSelector: 'ytd-playlist-video-renderer ytd-thumbnail',
            headerSelector: '#page-manager > ytd-browse > ytd-playlist-header-renderer',
            observerRootSelector: 'body'
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

    function getStoredBoolean(key, defaultValue = false) {
        const stored = GM_getValue(key, STORAGE_UNSET);
        return stored === STORAGE_UNSET ? defaultValue : Boolean(stored);
    }

    function getMigratedTargetSelection(key, legacyKeys = [], defaultValue = false) {
        const stored = GM_getValue(key, STORAGE_UNSET);
        if (stored !== STORAGE_UNSET) {
            return Boolean(stored);
        }
        return legacyKeys.some((legacyKey) => GM_getValue(legacyKey, false)) || defaultValue;
    }

    function getMigratedActionMode() {
        const stored = GM_getValue(ACTION_MODE_KEY, STORAGE_UNSET);
        if (stored === 'hide' || stored === 'remove') {
            return stored;
        }
        if (GM_getValue(LEGACY_REMOVE_THUMB_KEY, false) || GM_getValue(LEGACY_REMOVE_MINIPLAYER_KEY, false)) {
            return 'remove';
        }
        if (GM_getValue(LEGACY_HIDE_THUMB_KEY, false) || GM_getValue(LEGACY_HIDE_MINIPLAYER_KEY, false)) {
            return 'hide';
        }
        return 'hide';
    }

    function loadState() {
        selectedTargets = {
            thumbnails: getMigratedTargetSelection(TARGET_THUMB_KEY, [LEGACY_HIDE_THUMB_KEY, LEGACY_REMOVE_THUMB_KEY], false),
            header: getStoredBoolean(TARGET_HEADER_KEY, false),
            miniplayer: getMigratedTargetSelection(TARGET_MINIPLAYER_KEY, [LEGACY_HIDE_MINIPLAYER_KEY, LEGACY_REMOVE_MINIPLAYER_KEY], false)
        };
        actionMode = getMigratedActionMode();
    }

    // --- Core Logic ---
    let styleElement = null;
    let panel = null;

    loadState();

    function applySettings() {
        const pageConfig = getPageConfig();
        if (!pageConfig) return;

        let css = '';
        if (actionMode === 'hide') {
            if (selectedTargets.thumbnails) {
                css += `${pageConfig.thumbSelector} { display: none !important; } `;
            }
            if (selectedTargets.header) {
                css += `${pageConfig.headerSelector} { display: none !important; } `;
            }
            if (selectedTargets.miniplayer) {
                css += `ytd-miniplayer { display: none !important; } `;
            }
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

        const hasRemovalTargets = actionMode === 'remove' && (
            selectedTargets.thumbnails ||
            selectedTargets.header ||
            selectedTargets.miniplayer
        );

        if (hasRemovalTargets) {
            stopObserver();
            startObserver();
            performDebouncedCleanup();
        } else {
            stopObserver();
        }

        updateActionButtons();
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

    function clearExistingHeader(pageConfig) {
        if (!pageConfig) return;
        const headers = document.querySelectorAll(pageConfig.headerSelector);
        headers.forEach(el => el.remove());
        if (headers.length > 0) {
            console.log(`[YouTube Playlist Lite] Removed ${headers.length} playlist header(s).`);
        }
    }

    const performDebouncedCleanup = debounce(() => {
        const pageConfig = getPageConfig();
        if (pageConfig && actionMode === 'remove') {
            if (selectedTargets.thumbnails) {
                clearExistingThumbnails(pageConfig);
            }
            if (selectedTargets.header) {
                clearExistingHeader(pageConfig);
            }
        }
        if (actionMode === 'remove' && selectedTargets.miniplayer) {
            removeMiniplayerIfPresent();
        }
    }, 150);

    let observer = null;
    function startObserver() {
        if (observer) return;
        if (actionMode !== 'remove') return;
        if (!selectedTargets.thumbnails && !selectedTargets.header && !selectedTargets.miniplayer) return;
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

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.31';
        const html = templateStr.replace('{{VERSION}}', version);

        panel = yusParseHTML(html);

        yusRestorePosition(panel, PANEL_POS_KEY, { bottom: '260px', right: '20px' });
        const headerRow = panel.querySelector('#yt-lite-header');
        yusMakeDraggable(panel, headerRow, PANEL_POS_KEY);

        const titleLabel = panel.querySelector('#yt-lite-title');
        yusMakeMinimizable(panel, titleLabel, MINIMIZED_STATE_KEY);

        const bindCheckbox = (id, key, targetKey) => {
            const cb = panel.querySelector(`#${id}`);
            cb.checked = selectedTargets[targetKey];
            cb.addEventListener('change', (e) => {
                selectedTargets[targetKey] = e.target.checked;
                GM_setValue(key, selectedTargets[targetKey]);
                applySettings();
            });
        };

        bindCheckbox('yt-lite-target-thumbnails', TARGET_THUMB_KEY, 'thumbnails');
        bindCheckbox('yt-lite-target-header', TARGET_HEADER_KEY, 'header');
        bindCheckbox('yt-lite-target-miniplayer', TARGET_MINIPLAYER_KEY, 'miniplayer');

        const hideBtn = panel.querySelector('#yt-lite-hide-btn');
        const removeBtn = panel.querySelector('#yt-lite-remove-btn');
        hideBtn.addEventListener('click', () => {
            actionMode = 'hide';
            GM_setValue(ACTION_MODE_KEY, actionMode);
            applySettings();
        });
        removeBtn.addEventListener('click', () => {
            actionMode = 'remove';
            GM_setValue(ACTION_MODE_KEY, actionMode);
            applySettings();
        });

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
        updateActionButtons();
        setTimeout(() => yusCheckPanelPosition(panel, PANEL_POS_KEY), 0);
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => yusCheckPanelPosition(panel, PANEL_POS_KEY));
        });
    }

    function updateActionButtons() {
        if (!panel) return;
        const hideBtn = panel.querySelector('#yt-lite-hide-btn');
        const removeBtn = panel.querySelector('#yt-lite-remove-btn');
        if (!hideBtn || !removeBtn) return;

        const activeStyle = {
            backgroundColor: '#dce8ff',
            color: '#003c99'
        };
        const inactiveStyle = {
            backgroundColor: '#fff',
            color: '#333'
        };

        Object.assign(hideBtn.style, actionMode === 'hide' ? activeStyle : inactiveStyle);
        Object.assign(removeBtn.style, actionMode === 'remove' ? activeStyle : inactiveStyle);
    }

    // --- Init & Navigation ---
    function cleanupFeatures() {
        stopObserver();
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    }

    function startMain() {
        createPanel();
        yusSetPanelActive(panel, true);
        applySettings();
    }

    function stopMain() {
        yusSetPanelActive(panel, false);
        cleanupFeatures();
    }

    yusInitApp({
        appName: 'YouTube Playlist Lite',
        startMain: startMain,
        stopMain: stopMain
    });

})();
