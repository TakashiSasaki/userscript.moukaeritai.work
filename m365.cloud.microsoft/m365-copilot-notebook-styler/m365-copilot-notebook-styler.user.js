// ==UserScript==
// @name         M365 Copilot Notebook Styler
// @namespace    userscript.moukaeritai.work
// @version      0.2.0
// @description  Adds subtle background colors to M365 Copilot Notebook panes to clarify boundaries. Updated for modern design.
// @author       Takashi Sasaki
// @match        https://m365.cloud.microsoft/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_getValue
// @grant        GM_setValue
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

    // --- Settings & Persistence ---
    const STORAGE_KEY = 'm365-notebook-styler-settings';
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
    let isEnabled = GM_getValue('m365-copilot-styler-enabled', true);

    // --- CSS Implementation ---
    const STYLE_ID = 'm365-copilot-styler-css';
    const cssContent = `
        body.m365-styler-active .m365-pane-left {
            background-color: var(--colorNeutralBackground3, rgba(128, 128, 128, 0.04)) !important;
        }
        body.m365-styler-active .m365-pane-center {
            background-color: var(--colorNeutralBackground1, transparent) !important;
        }
        body.m365-styler-active .m365-pane-right {
            background-color: var(--colorBrandBackground2, rgba(0, 120, 212, 0.04)) !important;
        }

        #m365-styler-panel {
            position: fixed;
            top: 20px;
            right: 140px; /* Offset to avoid overlap */
            z-index: 10000;
            background-color: rgba(32, 33, 35, 0.85);
            color: #fff;
            padding: 12px 16px;
            border-radius: 14px;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            user-select: none;
            transition: opacity 0.3s;
            opacity: 0.85;
            min-width: 130px;
        }
        #m365-styler-panel:hover {
            opacity: 1;
        }
        .m365-st-header {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 8px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 4px;
        }
        #m365-st-drag-handle {
            cursor: move;
            flex-grow: 1;
        }
        .m365-st-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 12px;
        }
    `;

    function injectStyle() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = cssContent;
            document.head.appendChild(style);
        }
        updateBodyClass();
    }

    function updateBodyClass() {
        document.body.classList.toggle('m365-styler-active', isEnabled);
    }

    // --- Pane Tagging Logic ---
    function findAndTagPanes() {
        const separators = document.querySelectorAll('div[role="separator"]');
        separators.forEach(sep => {
            const container = sep.parentElement;
            if (!container) return;
            const children = Array.from(container.children);
            const sepIndex = children.indexOf(sep);

            // Anchoring from separator
            if (sepIndex > 0) {
                const centerPane = children[sepIndex - 1];
                centerPane.classList.add('m365-pane-center');
                
                if (sepIndex > 1) {
                    const leftPane = children[sepIndex - 2];
                    leftPane.classList.add('m365-pane-left');
                }
            }

            if (sepIndex < children.length - 1) {
                const rightPane = children[sepIndex + 1];
                rightPane.classList.add('m365-pane-right');
            }
        });
    }

    // --- UI Implementation ---
    function createUI() {
        if (document.getElementById('m365-styler-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'm365-styler-panel';

        if (settings.position) {
            panel.style.left = settings.position.left + 'px';
            panel.style.top = settings.position.top + 'px';
            panel.style.right = 'auto';
        }

        panel.innerHTML = `
            <div class="m365-st-header">
                <span id="m365-st-drag-handle">Pane Styler v${GM_info.script.version}</span>
            </div>
            <label class="m365-st-toggle" title="Enable/Disable subtle background colors">
                <input type="checkbox" id="m365-st-enabled" ${isEnabled ? 'checked' : ''}>
                <span>Colorize Panes</span>
            </label>
        `;
        document.body.appendChild(panel);

        document.getElementById('m365-st-enabled').addEventListener('change', (e) => {
            isEnabled = e.target.checked;
            GM_setValue('m365-copilot-styler-enabled', isEnabled);
            updateBodyClass();
        });

        // Dragging Logic
        const dragHandle = document.getElementById('m365-st-drag-handle');
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragOffset = {
                x: panel.offsetLeft - e.clientX,
                y: panel.offsetTop - e.clientY
            };
            panel.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = (e.clientX + dragOffset.x) + 'px';
            panel.style.top = (e.clientY + dragOffset.y) + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = 'opacity 0.3s';
                saveSettings({
                    position: {
                        left: parseInt(panel.style.left, 10),
                        top: parseInt(panel.style.top, 10)
                    }
                });
            }
        });
    }

    // --- Runtime ---
    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(findAndTagPanes, 500);
    });

    function init() {
        injectStyle();
        createUI();
        findAndTagPanes();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
