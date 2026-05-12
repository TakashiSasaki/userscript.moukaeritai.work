// ==UserScript==
// @name         M365 Copilot Notebook Styler
// @namespace    userscript.moukaeritai.work
// @version      0.2.1
// @description  Adds subtle background colors to M365 Copilot Notebook panes to clarify boundaries. Updated for modern design.
// @author       Takashi Sasaki
// @match        https://m365.cloud.microsoft/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_getValue
// @grant        GM_setValue
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
    /* global M365FloatingPanel */
    function createUI() {
        if (document.getElementById('m365-styler-panel')) return;

        const commonHtml = GM_getResourceText('m365CommonHtml');
        const panel = new M365FloatingPanel({
            id: 'm365-styler-panel',
            title: 'Pane Styler',
            version: GM_info.script.version,
            storageKey: 'm365-notebook-styler-pos',
            template: commonHtml,
            defaultPosition: { right: '140px', top: '20px' }
        });

        const contentStr = `
            <label class="m365-st-toggle" title="Enable/Disable subtle background colors" style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;">
                <input type="checkbox" id="m365-st-enabled" ${isEnabled ? 'checked' : ''}>
                <span>Colorize Panes</span>
            </label>
        `;
        panel.setContent(contentStr);

        const checkbox = document.getElementById('m365-st-enabled');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                isEnabled = e.target.checked;
                GM_setValue('m365-copilot-styler-enabled', isEnabled);
                updateBodyClass();
            });
        }
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
