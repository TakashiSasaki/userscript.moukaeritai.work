// ==UserScript==
// @name         Gemini Profile Badge
// @namespace    userscript.moukaeritai.work
// @version      0.1.38
// @lastModified 2026-04-16
// @description  Add a custom text/emoji badge to the user profile area on Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @resource     geminiProfileBadgeCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.css
// @resource     geminiProfileBadgeHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.html
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @noframes
// @history       0.1.38 UI共通化: パネルの外枠を gemini-common.html に統合し、パネル内でバッジを編集できるように変更
// @history       0.1.37 リソース化リファクタリング: UIテンプレート(HTML)とCSSを外部ファイルに分離
// @history       0.1.34 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
// ==/UserScript==

(function () {
    'use strict';

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

    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {
        // Constants
        const BADGE_STORAGE_KEY = 'gemini_profile_badge_text';
        const BADGE_DEFAULT_TEXT = '';
        const PANEL_POSITION_KEY = 'gemini_profile_badge_panel_pos';

        // Initialize Trusted Types Policy
        const badgePolicy = window.geminiCreateTrustedHTMLPolicy('gemini-profile-badge-policy');

        // Load Styles
        const customCSS = GM_getResourceText('geminiProfileBadgeCSS');
        if (customCSS && !document.getElementById('gemini-profile-badge-styles')) {
            const style = GM_addStyle(customCSS);
            if (style) style.id = 'gemini-profile-badge-styles';
        }

        /**
         * Creates the badge panel using the common panel template.
         */
        function createBadgePanel() {
            if (document.getElementById('gemini-profile-badge-panel')) return document.getElementById('gemini-profile-badge-panel');

            const templateHTML = GM_getResourceText('geminiProfileBadgeHTML');
            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            if (!templateHTML || !commonHTMLStr) {
                console.error('[Gemini Profile Badge] Resources not found');
                return null;
            }

            const scriptVersion = GM_info.script.version;

            // Create inner content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.className = 'gpb-panel-inner';
            window.geminiSetInnerHTML(contentDiv, templateHTML, badgePolicy);

            // Assemble panel shell
            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: badgePolicy,
                title: `🏷️ ${scriptVersion} ${gusEmoji}`,
                icon: `🏷️ ${scriptVersion} ${gusEmoji}`,
                contentElement: contentDiv
            });

            panelShell.id = 'gemini-profile-badge-panel';
            document.body.appendChild(panelShell);

            const displayEl = panelShell.querySelector('.gpb-badge-preview');
            const editBtn = panelShell.querySelector('.gpb-edit-btn');

            const updateDisplay = () => {
                const badgeText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);
                if (displayEl) {
                    displayEl.textContent = badgeText || '(Not set)';
                    displayEl.style.fontStyle = badgeText ? 'normal' : 'italic';
                    displayEl.style.opacity = badgeText ? '1' : '0.5';
                }
            };

            if (editBtn) {
                editBtn.onclick = () => {
                    const currentText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);
                    const newText = prompt("Enter text or emoji for the Gemini profile badge:", currentText);
                    if (newText !== null) {
                        GM_setValue(BADGE_STORAGE_KEY, newText);
                        updateDisplay();
                    }
                };
            }

            // Set up dragging logic
            const dragHandle = panelShell.querySelector('.gus-panel-header');
            const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
            if (dragHandle) window.geminiSetupDraggablePanel(panelShell, dragHandle, PANEL_POSITION_KEY, { top: '80px', right: '20px', left: 'auto' });
            if (inactiveHandle) window.geminiSetupDraggablePanel(panelShell, inactiveHandle, PANEL_POSITION_KEY, { top: '80px', right: '20px', left: 'auto' });

            // Minimizable Logic
            window.geminiSetupMinimizablePanel(panelShell, 'gpb-minimized', dragHandle, false);

            updateDisplay();
            return panelShell;
        }

        // Initialize
        createBadgePanel();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserScript);
    } else {
        initUserScript();
    }
})();
