// ==UserScript==
// @name         Gemini Profile Badge
// @namespace    userscript.moukaeritai.work
// @version      0.1.47
// @lastModified 2026-05-08
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
// @history       0.1.46 Removed backward-compatible gemini-history-loader listener from gemini-common.js.
// @history       0.1.43 UI表示タイトルから冗長な "Gemini " プレフィックスを除去。
// @history       0.1.42 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.1.41 ヘッダー右側のバージョン表示を廃止
// @history       0.1.40 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.1.39 UI改善: シングルクリックでの開閉に対応し、タイトルとバージョンの表示形式を [絵文字] [名称] v[バージョン] に統一
// @history       0.1.38 UI共通化: パネルの外枠を gemini-common.html に統合し、パネル内でバッジを編集できるように変更
// @history       0.1.34 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
// @history       0.1.47 Add global listener to gemini-common.js for remote UI toggling via gus-toggle-panel event.
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


            // Create inner content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.className = 'gpb-panel-inner';
            window.geminiSetInnerHTML(contentDiv, templateHTML, badgePolicy);

            // Assemble panel shell
            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: badgePolicy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
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
