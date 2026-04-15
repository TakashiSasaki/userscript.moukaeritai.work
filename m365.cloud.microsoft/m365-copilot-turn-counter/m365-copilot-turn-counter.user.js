// ==UserScript==
// @name         M365 Copilot Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  Count turns, artifacts, and images in M365 Copilot chat
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

    // --- Main Logic ---

    // Initial state
    let stats = {
        turns: 0,
        artifacts: 0,
        images: 0
    };

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        #m365-turn-counter-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(32, 33, 35, 0.8);
            color: #fff;
            padding: 10px 15px;
            border-radius: 12px;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            z-index: 10000;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            cursor: move;
            user-select: none;
            transition: opacity 0.3s;
        }
        #m365-turn-counter-ui:hover {
            opacity: 1;
        }
        .m365-tc-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin: 4px 0;
        }
        .m365-tc-val {
            font-weight: 600;
            color: #10a37f;
        }
        .m365-tc-header {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    `;
    document.head.appendChild(style);

    // Create UI
    const container = document.createElement('div');
    container.id = 'm365-turn-counter-ui';
    container.innerHTML = `
        <div class="m365-tc-header">Copilot Stats v${GM_info.script.version}</div>
        <div class="m365-tc-content">
            <div class="m365-tc-row"><span>Turns</span> <span class="m365-tc-val" id="m365-tc-turns">0</span></div>
            <div class="m365-tc-row"><span>Artifacts</span> <span class="m365-tc-val" id="m365-tc-artifacts">0</span></div>
            <div class="m365-tc-row"><span>Images</span> <span class="m365-tc-val" id="m365-tc-images">0</span></div>
        </div>
    `;
    document.body.appendChild(container);

    const updateUI = () => {
        document.getElementById('m365-tc-turns').textContent = stats.turns;
        document.getElementById('m365-tc-artifacts').textContent = stats.artifacts;
        document.getElementById('m365-tc-images').textContent = stats.images;
    };

    // Placeholder for counter logic
    const scanConversation = () => {
        // TODO: Implement actual selectors for M365 Copilot
        // stats.turns = document.querySelectorAll('...').length;
        updateUI();
    };

    // MutationObserver with debounce
    let timer;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(scanConversation, 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Dragging logic
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset = {
            x: container.offsetLeft - e.clientX,
            y: container.offsetTop - e.clientY
        };
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        container.style.left = (e.clientX + offset.x) + 'px';
        container.style.top = (e.clientY + offset.y) + 'px';
        container.style.right = 'auto'; // Disable right-anchor when dragged
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

})();
