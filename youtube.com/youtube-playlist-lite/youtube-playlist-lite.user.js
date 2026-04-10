// ==UserScript==
// @name         YouTube Playlist Lite
// @namespace    userscript.moukaeritai.work
// @version      0.1.45
// @description  YouTubeプレイリストでサムネイル、ヘッダー、ミニプレイヤーを継続的に削除して表示を軽量化するツールです。
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

/* global yusRestorePosition, yusMakeDraggable, yusCheckPanelPosition, yusMakeMinimizable, yusSetPanelActive, yusUpdatePanelVisibility, yusParseHTML, yusInitApp */
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
    const PANEL_POS_KEY = 'yt_lite_panel_position';
    const LEGACY_HIDE_THUMB_KEY = 'yt_lite_hide_thumbnails';
    const LEGACY_REMOVE_THUMB_KEY = 'yt_lite_force_remove';
    const LEGACY_HIDE_MINIPLAYER_KEY = 'yt_lite_hide_miniplayer';
    const LEGACY_REMOVE_MINIPLAYER_KEY = 'yt_lite_remove_miniplayer';
    const TARGET_THUMB_KEY = 'yt_lite_target_thumbnails';
    const TARGET_HEADER_KEY = 'yt_lite_target_header';
    const TARGET_MINIPLAYER_KEY = 'yt_lite_target_miniplayer';
    const MINIMIZED_STATE_KEY = 'yt_lite_is_minimized';
    const STORAGE_UNSET = '__unset__';
    let selectedTargets = {
        thumbnails: false,
        header: false,
        miniplayer: false
    };
    const PAGE_CONFIG = {
        playlist: {
            thumbSelector: 'ytd-playlist-video-renderer ytd-thumbnail',
            headerSelector: '#page-manager > ytd-browse > ytd-playlist-header-renderer',
            contentObserverRootSelector: '#page-manager > ytd-browse',
            thumbnailObserverRootSelector: 'ytd-playlist-video-list-renderer',
            miniplayerObserverRootSelector: 'ytd-app'
        }
    };
    const FALLBACK_PANEL_TEMPLATE = `
<div id="yt-lite-panel" class="yus-panel" style="--yus-panel-bg-rgb: 240, 248, 255; border-color: #00f; --yus-hover-color: #00f;">
    <div id="yt-lite-header" class="yus-header">
        <span id="yt-lite-title" class="yus-title" title="Double-click to toggle minimization">Lite v{{VERSION}}</span>
    </div>
    <div id="yt-lite-panel-content" class="yus-content">
        <div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
            <input type="checkbox" id="yt-lite-target-thumbnails">
            <label for="yt-lite-target-thumbnails" style="cursor: pointer;">Thumbnails</label>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
            <input type="checkbox" id="yt-lite-target-header">
            <label for="yt-lite-target-header" style="cursor: pointer;">Playlist Header</label>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
            <input type="checkbox" id="yt-lite-target-miniplayer">
            <label for="yt-lite-target-miniplayer" style="cursor: pointer;">Miniplayer</label>
        </div>
    </div>
</div>`;

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

    function loadState() {
        selectedTargets = {
            thumbnails: getMigratedTargetSelection(TARGET_THUMB_KEY, [LEGACY_HIDE_THUMB_KEY, LEGACY_REMOVE_THUMB_KEY], false),
            header: getStoredBoolean(TARGET_HEADER_KEY, false),
            miniplayer: getMigratedTargetSelection(TARGET_MINIPLAYER_KEY, [LEGACY_HIDE_MINIPLAYER_KEY, LEGACY_REMOVE_MINIPLAYER_KEY], false)
        };
    }

    function hasExpectedPanelControls(panelElement) {
        if (!panelElement) return false;
        return Boolean(
            panelElement.querySelector('#yt-lite-target-thumbnails') &&
            panelElement.querySelector('#yt-lite-target-header') &&
            panelElement.querySelector('#yt-lite-target-miniplayer')
        );
    }

    // --- Core Logic ---
    let panel = null;

    loadState();

    function applySettings() {
        const pageConfig = getPageConfig();
        if (!pageConfig) return;

        const hasRemovalTargets = (
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
        if (pageConfig) {
            if (selectedTargets.thumbnails) {
                clearExistingThumbnails(pageConfig);
            }
            if (selectedTargets.header) {
                clearExistingHeader(pageConfig);
            }
        }
        if (selectedTargets.miniplayer) {
            removeMiniplayerIfPresent();
        }
    }, 300);

    function nodeMatchesSelector(node, selector) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.matches && node.matches(selector)) return true;
        return Boolean(node.querySelector && node.querySelector(selector));
    }

    function hasPlaylistRelevantMutation(mutations, pageConfig) {
        const shouldCheckThumbnails = selectedTargets.thumbnails;
        const shouldCheckHeader = selectedTargets.header;

        return mutations.some((mutation) => {
            const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
            return nodes.some((node) => (
                (shouldCheckThumbnails && nodeMatchesSelector(node, pageConfig.thumbSelector)) ||
                (shouldCheckHeader && nodeMatchesSelector(node, pageConfig.headerSelector))
            ));
        });
    }

    function hasMiniplayerRelevantMutation(mutations) {
        return mutations.some((mutation) => {
            const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
            return nodes.some((node) => nodeMatchesSelector(node, 'ytd-miniplayer'));
        });
    }

    let playlistObserver = null;
    let miniplayerObserver = null;
    let playlistObserverRetryTimerId = null;
    let miniplayerObserverRetryTimerId = null;

    function startPlaylistObserver(pageConfig) {
        if (playlistObserver) return;
        if (!selectedTargets.thumbnails && !selectedTargets.header) return;

        const rootSelector = selectedTargets.thumbnails
            ? pageConfig.thumbnailObserverRootSelector
            : pageConfig.contentObserverRootSelector;
        const root = document.querySelector(rootSelector);
        if (!root) {
            if (!playlistObserverRetryTimerId) {
                playlistObserverRetryTimerId = setTimeout(() => {
                    playlistObserverRetryTimerId = null;
                    const nextPageConfig = getPageConfig();
                    if (nextPageConfig) {
                        startPlaylistObserver(nextPageConfig);
                    }
                }, 1000);
            }
            return;
        }

        playlistObserver = new MutationObserver((mutations) => {
            if (hasPlaylistRelevantMutation(mutations, pageConfig)) {
                performDebouncedCleanup();
            }
        });
        playlistObserver.observe(root, { childList: true, subtree: true });
    }

    function startMiniplayerObserver(pageConfig) {
        if (miniplayerObserver) return;
        if (!selectedTargets.miniplayer) return;

        const root = document.querySelector(pageConfig.miniplayerObserverRootSelector);
        if (!root) {
            if (!miniplayerObserverRetryTimerId) {
                miniplayerObserverRetryTimerId = setTimeout(() => {
                    miniplayerObserverRetryTimerId = null;
                    const nextPageConfig = getPageConfig();
                    if (nextPageConfig) {
                        startMiniplayerObserver(nextPageConfig);
                    }
                }, 1000);
            }
            return;
        }

        miniplayerObserver = new MutationObserver((mutations) => {
            if (hasMiniplayerRelevantMutation(mutations)) {
                performDebouncedCleanup();
            }
        });
        miniplayerObserver.observe(root, { childList: true, subtree: true });
    }

    function startObserver() {
        const pageConfig = getPageConfig();
        if (!pageConfig) return;
        startPlaylistObserver(pageConfig);
        startMiniplayerObserver(pageConfig);
    }

    function stopObserver() {
        if (playlistObserver) {
            playlistObserver.disconnect();
            playlistObserver = null;
        }
        if (miniplayerObserver) {
            miniplayerObserver.disconnect();
            miniplayerObserver = null;
        }
        if (playlistObserverRetryTimerId) {
            clearTimeout(playlistObserverRetryTimerId);
            playlistObserverRetryTimerId = null;
        }
        if (miniplayerObserverRetryTimerId) {
            clearTimeout(miniplayerObserverRetryTimerId);
            miniplayerObserverRetryTimerId = null;
        }
    }

    // --- UI Creation ---


    function createPanel() {
        if (document.getElementById('yt-lite-panel')) return;

        const version = (typeof GM_info !== 'undefined') && GM_info.script ? GM_info.script.version : '0.1.31';
        const templateStr = GM_getResourceText('ytLiteTemplate');
        const resourceHtml = templateStr ? templateStr.replace('{{VERSION}}', version) : '';
        panel = resourceHtml ? yusParseHTML(resourceHtml) : null;
        if (!hasExpectedPanelControls(panel)) {
            console.warn('[YouTube Playlist Lite] Template mismatch detected. Falling back to inline panel template.');
            panel = yusParseHTML(FALLBACK_PANEL_TEMPLATE.replace('{{VERSION}}', version));
        }

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

        document.body.appendChild(panel);
        yusUpdatePanelVisibility(panel);
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

    // --- Init & Navigation ---
    function cleanupFeatures() {
        stopObserver();
    }

    function startMain() {
        createPanel();
        attachPanelResizeHandler();
        yusSetPanelActive(panel, true);
        applySettings();
    }

    function stopMain() {
        detachPanelResizeHandler();
        yusSetPanelActive(panel, false);
        cleanupFeatures();
    }

    yusInitApp({
        appName: 'YouTube Playlist Lite',
        startMain: startMain,
        stopMain: stopMain
    });

})();
