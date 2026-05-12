// ==UserScript==
// @name         M365 Copilot Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.3.1
// @description  Count turns, artifacts, and images in M365 Copilot with persistent UI and compact mode
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://m365.cloud.microsoft/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-copilot-turn-counter/m365-copilot-turn-counter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-copilot-turn-counter/m365-copilot-turn-counter.user.js
// @grant        GM_info
// @grant        GM_getResourceText
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-common.js
// @resource     m365CommonHtml https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-common.html
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function () {
    'use strict';

    // Installation check API
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

    // --- Persistence ---
    const STORAGE_KEY = 'm365_tc_settings';
    const loadSettings = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    };
    const saveSettings = (updates) => {
        const current = loadSettings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
    };

    const settings = loadSettings();

    // --- State Management ---
    const seenTurns = new Set();
    const seenArtifacts = new Set();
    const seenImages = new Set();

    const getHash = (text) => {
        if (!text) return 'empty';
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(36);
    };

    // --- Selectors ---
    const SELECTORS = {
        VIRTUAL_CONTAINER: '.fui-Virtualizer, .fui-Virtualizer-Scroll-View-Dynamic__container',
        USER_MSG: 'div[aria-label^="You said:"], div[aria-label^="送信済み:"]',
        ARTIFACTS: [
            'div.fui-Card',
            '.fai-Citation',
            'a[aria-label*="引用"]',
            'table',
            '.fui-Table',
            'div[aria-label="コードのプレビュー"]',
            'button[aria-label="Pages で編集"]',
            'button.fai-Reference',
            'div[aria-label="ソース"]',
            '.scc-ChainOfThought__expandButton'
        ]
    };

    // --- UI Construction ---
    /* global M365FloatingPanel */
    const style = document.createElement('style');
    style.textContent = `
        .m365-tc-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            white-space: nowrap;
        }
        .m365-tc-val {
            font-weight: 700;
            color: #10a37f;
            font-variant-numeric: tabular-nums;
            margin-left: 15px;
        }
        .m365-tc-controls {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            gap: 8px;
        }
        .m365-tc-btn {
            flex: 1;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            border-radius: 6px;
            padding: 4px;
            cursor: pointer;
            font-size: 11px;
            text-align: center;
            transition: background 0.2s;
        }
        .m365-tc-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(style);

    const commonHtml = GM_getResourceText('m365CommonHtml');
    const panel = new M365FloatingPanel({
        id: 'm365-turn-counter-ui',
        title: 'Copilot Turn Counter',
        version: GM_info.script.version,
        storageKey: 'm365_tc_settings', // uses legacy key to preserve bounds
        template: commonHtml,
        defaultPosition: { right: '20px', top: '20px' },
        onDoubleClickHeader: () => {
            const isCompact = panel.containerNode.classList.toggle('compact');
            saveSettings({ isCompact });
            updateUI();
        }
    });

    if (settings.isCompact) panel.containerNode.classList.add('compact');

    const contentStr = `
        <div class="m365-tc-row"><span>Turns</span> <span class="m365-tc-val" id="m365-tc-turns">0</span></div>
        <div class="m365-tc-row"><span>Artifacts</span> <span class="m365-tc-val" id="m365-tc-artifacts">0</span></div>
        <div class="m365-tc-row"><span>Images</span> <span class="m365-tc-val" id="m365-tc-images">0</span></div>
        <div class="m365-tc-controls">
            <button class="m365-tc-btn" id="m365-btn-top">↑ Top</button>
            <button class="m365-tc-btn" id="m365-btn-bottom">↓ Bottom</button>
        </div>
    `;
    panel.setContent(contentStr);

    // --- Scrolling Interactivity ---
    const getScrollContainer = () => document.querySelector(SELECTORS.VIRTUAL_CONTAINER);

    const btnTop = document.getElementById('m365-btn-top');
    if (btnTop) {
        btnTop.addEventListener('click', () => {
            const scroller = getScrollContainer();
            if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const btnBottom = document.getElementById('m365-btn-bottom');
    if (btnBottom) {
        btnBottom.addEventListener('click', () => {
            const scroller = getScrollContainer();
            if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
        });
    }

    const updateUI = () => {
        const turns = seenTurns.size;
        document.getElementById('m365-tc-turns').textContent = turns;
        document.getElementById('m365-tc-artifacts').textContent = seenArtifacts.size;
        document.getElementById('m365-tc-images').textContent = seenImages.size;
        
        // Update header in compact mode
        if (panel.containerNode.classList.contains('compact')) {
            panel.setTitle(`Turns: ${turns}`);
        } else {
            panel.setTitle(`Copilot Turn Counter v${GM_info.script.version}`);
        }
    };

    const scanForItems = () => {
        const userMessages = document.querySelectorAll(SELECTORS.USER_MSG);
        userMessages.forEach(msg => {
            const label = msg.getAttribute('aria-label') || '';
            const msgHash = getHash(label);
            if (msgHash) seenTurns.add(msgHash);

            const imgs = msg.querySelectorAll('img');
            imgs.forEach(img => {
                if (img.src) seenImages.add(img.src);
            });
        });

        SELECTORS.ARTIFACTS.forEach(selector => {
            const items = document.querySelectorAll(selector);
            items.forEach((item, index) => {
                const id = item.id || getHash(item.ariaLabel || item.textContent || selector + index);
                seenArtifacts.add(id);
            });
        });

        updateUI();
    };

    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(scanForItems, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    scanForItems();

    // Navigation Reset
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            seenTurns.clear();
            seenArtifacts.clear();
            seenImages.clear();
            updateUI();
            scanForItems();
        }
    }, 1000);

})();
