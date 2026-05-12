// ==UserScript==
// @name         Gemini Userscript Manager
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @lastModified 2026-05-08
// @description  UI for managing all Gemini related userscripts (check status, compare versions, bulk toggle UI).
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     gumCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-userscript-manager/gemini-userscript-manager.css
// @resource     gumHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-userscript-manager/gemini-userscript-manager.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-userscript-manager/gemini-userscript-manager.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-userscript-manager/gemini-userscript-manager.user.js
// @noframes
// @history       0.1.0 Initial version.
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function () {
    'use strict';

    if (window.location.hostname === 'userscript.moukaeritai.work') {
        // Just for ping handling on the landing page if needed
        return;
    }

    const { emoji: gusEmoji, order: gusOrder } = window.registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const CONSTANTS = {
        STORAGE_KEY_POS: 'gum-pos',
        STORAGE_KEY_MINIMIZED: 'gum-minimized',
        GITHUB_BASE: 'https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/'
    };

    const KNOWN_SCRIPTS = [
        { id: 'gemini-artifact-exporter', name: 'Gemini Artifact Exporter' },
        { id: 'gemini-auto-scroll', name: 'Gemini Auto-Scroll' },
        { id: 'gemini-auto-select-next', name: 'Gemini Auto-Select Next' },
        { id: 'gemini-export-to-docs', name: 'Gemini 1-Click Export to Docs' },
        { id: 'gemini-one-click-delete', name: 'Gemini 1-Click Delete Conversation' },
        { id: 'gemini-profile-badge', name: 'Gemini Profile Badge' },
        { id: 'gemini-prompt-injector', name: 'Gemini Prompt Injector' },
        { id: 'gemini-saved-info', name: 'Gemini Saved Info Helper' },
        { id: 'gemini-search-snippet-helper', name: 'Gemini Search Snippet Helper' },
        { id: 'gemini-turn-counter', name: 'Gemini Turn Counter' },
        { id: 'gemini-artifact-exporter-worker', name: 'Gemini Artifact Exporter (Worker)' },
        { id: 'gemini-userscript-manager', name: 'Gemini Userscript Manager' }
    ];

    const state = {
        scripts: KNOWN_SCRIPTS.map(s => ({ ...s, installed: false, installedVersion: '-', latestVersion: '...' }))
    };

    let uiUpdateTimeout = null;
    let panelInstance = null;

    // --- Utility: Trusted Types ---
    const policy = window.geminiCreateTrustedHTMLPolicy('gum-policy');

    // --- Utility: Fetch Version ---
    function fetchVersion(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function (response) {
                    if (response.status === 200) {
                        const match = response.responseText.match(/@version\s+([0-9.]+)/);
                        if (match && match[1]) resolve(match[1]);
                        else resolve(null);
                    } else resolve(null);
                },
                onerror: function () { resolve(null); }
            });
        });
    }

    function compareVersions(v1, v2) {
        if (!v1 || !v2 || v2 === '-') return 1;
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const num1 = p1[i] || 0;
            const num2 = p2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    }

    async function checkVersions() {
        for (let i = 0; i < state.scripts.length; i++) {
            const script = state.scripts[i];
            const url = `${CONSTANTS.GITHUB_BASE}${script.id}/${script.id}.user.js`;
            const version = await fetchVersion(url);
            if (version) {
                script.latestVersion = version;
            } else {
                script.latestVersion = 'Error';
            }
            renderTable(); // Update immediately as we get each
        }
    }

    // Listen for ping responses from installed scripts
    document.addEventListener('userscript-check-installed', (event) => {
        const { name, version } = event.detail;
        const script = state.scripts.find(s => s.name === name);
        if (script) {
            script.installed = true;
            script.installedVersion = version;
            scheduleUIRender();
        }
    });

    function scheduleUIRender() {
        if (uiUpdateTimeout) clearTimeout(uiUpdateTimeout);
        uiUpdateTimeout = setTimeout(() => { renderTable(); }, 200);
    }

    function toggleScriptUI(targetName, action) {
        document.dispatchEvent(new CustomEvent('gus-toggle-panel', { detail: { target: targetName, action: action } }));
    }

    function renderTable() {
        if (!panelInstance) return;
        const tbody = panelInstance.querySelector('#gum-table-body');
        if (!tbody) return;

        let html = '';
        for (const script of state.scripts) {
            const isManager = script.id === 'gemini-userscript-manager';
            const hasUpdate = compareVersions(script.latestVersion, script.installedVersion) > 0 && script.installed;
            const statusClass = hasUpdate ? 'gum-status-update' : (script.installed ? 'gum-status-ok' : 'gum-status-missing');
            const statusText = hasUpdate ? 'Update' : (script.installed ? 'OK' : 'Missing');

            html += `
                <tr>
                    <td class="gum-name" title="${script.name}">${script.name}</td>
                    <td class="gum-version">${script.installedVersion}</td>
                    <td class="gum-version">${script.latestVersion}</td>
                    <td class="gum-status ${statusClass}">${statusText}</td>
                    <td class="gum-actions">
                        ${isManager ? '' : `
                            <button class="gum-btn-sm gum-show" data-target="${script.name}">👁</button>
                            <button class="gum-btn-sm gum-hide" data-target="${script.name}">-</button>
                        `}
                    </td>
                </tr>
            `;
        }
        window.geminiSetInnerHTML(tbody, html, policy);

        // Attach listeners
        tbody.querySelectorAll('.gum-show').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.geminiClickElement(btn); // standard click wrapper
                toggleScriptUI(e.target.dataset.target, 'expand');
            });
        });
        tbody.querySelectorAll('.gum-hide').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.geminiClickElement(btn);
                toggleScriptUI(e.target.dataset.target, 'minimize');
            });
        });
    }

    async function initUI() {
        GM_addStyle(GM_getResourceText('geminiCommon'));
        GM_addStyle(GM_getResourceText('gumCSS'));
        const commonHtml = GM_getResourceText('gusCommonHTML');
        const customHtml = GM_getResourceText('gumHTML');

        const tempContainer = document.createElement('div');
        window.geminiSetInnerHTML(tempContainer, customHtml, policy);
        const customContent = tempContainer.firstElementChild;

        const panelShell = window.geminiCreateCommonPanel({
            htmlString: commonHtml,
            policy: policy,
            title: 'Gemini Userscript Manager',
            icon: '⚙️',
            version: `${gusEmoji}${GM_info.script.version}`,
            contentElement: customContent,
            name: GM_info.script.name
        });

        document.body.appendChild(panelShell);
        panelInstance = panelShell;

        // Setup drag/minimize
        const dragHandle = panelShell.querySelector('.gus-version');
        window.geminiSetupDraggablePanel(panelShell, dragHandle, CONSTANTS.STORAGE_KEY_POS, { right: '20px', top: '100px' });
        window.geminiSetupMinimizablePanel(panelShell, CONSTANTS.STORAGE_KEY_MINIMIZED, dragHandle, false);

        // Global Action Listeners
        panelShell.querySelector('#gum-btn-show-all').addEventListener('click', () => {
            toggleScriptUI('all', 'expand');
        });
        panelShell.querySelector('#gum-btn-hide-all').addEventListener('click', () => {
            toggleScriptUI('all', 'minimize');
        });
        panelShell.querySelector('#gum-btn-refresh').addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('userscript-ping'));
            checkVersions();
        });

        // Initial fetch
        setTimeout(() => { document.dispatchEvent(new CustomEvent('userscript-ping')); }, 500);
        checkVersions();
    }

    // Initialize once document is somewhat ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

})();
