// ==UserScript==
// @name         M365 Copilot Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.2.0
// @description  Count turns, artifacts, and images in M365 Copilot chat with virtualization support
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://m365.cloud.microsoft/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-copilot-turn-counter/m365-copilot-turn-counter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-copilot-turn-counter/m365-copilot-turn-counter.user.js
// @grant        GM_info
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

    // --- State Management ---
    const seenTurns = new Set();
    const seenArtifacts = new Set();
    const seenImages = new Set();

    // Hashing helper for stable identification
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
        // Note: Assistant labels vary by context (Copilot, Research Agent, Notebook Workspace name)
        // We look for elements that have aria-label ending with "said:" or starting with "Copilot" in assistant context.
        ASSISTANT_MSG_HINT: 'div[aria-label$="said:"], div[aria-label^="Copilot"]',
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
    const style = document.createElement('style');
    style.textContent = `
        #m365-turn-counter-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(32, 33, 35, 0.85);
            color: #fff;
            padding: 12px 16px;
            border-radius: 14px;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            cursor: default;
            user-select: none;
            min-width: 140px;
        }
        .m365-tc-header {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .m365-tc-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
        }
        .m365-tc-val {
            font-weight: 700;
            color: #10a37f;
            font-variant-numeric: tabular-nums;
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
        .m365-tc-btn:active {
            transform: translateY(1px);
        }
        #m365-tc-drag-handle {
            cursor: move;
            flex-grow: 1;
        }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'm365-turn-counter-ui';
    container.innerHTML = `
        <div class="m365-tc-header">
            <span id="m365-tc-drag-handle">Copilot Stats v${GM_info.script.version}</span>
        </div>
        <div class="m365-tc-content">
            <div class="m365-tc-row"><span>Turns</span> <span class="m365-tc-val" id="m365-tc-turns">0</span></div>
            <div class="m365-tc-row"><span>Artifacts</span> <span class="m365-tc-val" id="m365-tc-artifacts">0</span></div>
            <div class="m365-tc-row"><span>Images</span> <span class="m365-tc-val" id="m365-tc-images">0</span></div>
        </div>
        <div class="m365-tc-controls">
            <button class="m365-tc-btn" id="m365-btn-top" title="Scroll to Top">↑ Top</button>
            <button class="m365-tc-btn" id="m365-btn-bottom" title="Scroll to Bottom">↓ Bottom</button>
        </div>
    `;
    document.body.appendChild(container);

    const updateUI = () => {
        document.getElementById('m365-tc-turns').textContent = seenTurns.size;
        document.getElementById('m365-tc-artifacts').textContent = seenArtifacts.size;
        document.getElementById('m365-tc-images').textContent = seenImages.size;
    };

    // --- Main Logid ---

    const scanForItems = () => {
        // 1. Scan for Turns (User Messages)
        const userMessages = document.querySelectorAll(SELECTORS.USER_MSG);
        userMessages.forEach(msg => {
            const label = msg.getAttribute('aria-label') || '';
            const msgHash = getHash(label);
            if (msgHash) seenTurns.add(msgHash);

            // 2. Scan for Images within User Messages
            const imgs = msg.querySelectorAll('img');
            imgs.forEach(img => {
                if (img.src) seenImages.add(img.src);
            });
        });

        // 3. Scan for Artifacts
        SELECTORS.ARTIFACTS.forEach(selector => {
            const items = document.querySelectorAll(selector);
            items.forEach((item, index) => {
                // Try to find a stable ID. If not available, use label + proximity
                const id = item.id || getHash(item.ariaLabel || item.textContent || selector + index);
                seenArtifacts.add(id);
            });
        });

        updateUI();
    };

    // MutationObserver with debounce
    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(scanForItems, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial scan
    scanForItems();

    // --- Control Handlers ---

    const getScrollContainer = () => {
        return document.querySelector(SELECTORS.VIRTUAL_CONTAINER);
    };

    document.getElementById('m365-btn-top').addEventListener('click', () => {
        const scroller = getScrollContainer();
        if (scroller) {
            scroller.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    document.getElementById('m365-btn-bottom').addEventListener('click', () => {
        const scroller = getScrollContainer();
        if (scroller) {
            scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    });

    // Reset logic on navigation (URL change)
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

    // --- Dragging logic ---
    const dragHandle = document.getElementById('m365-tc-drag-handle');
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset = {
            x: container.offsetLeft - e.clientX,
            y: container.offsetTop - e.clientY
        };
        container.style.transition = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        container.style.left = (e.clientX + offset.x) + 'px';
        container.style.top = (e.clientY + offset.y) + 'px';
        container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            container.style.transition = 'opacity 0.3s';
        }
    });

})();
