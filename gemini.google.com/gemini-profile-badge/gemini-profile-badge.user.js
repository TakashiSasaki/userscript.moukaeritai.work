// ==UserScript==
// @name         Gemini Profile Badge
// @namespace    userscript.moukaeritai.work
// @version      0.1.37
// @lastModified 2026-04-16
// @description  Add a custom text/emoji badge to the user profile area on Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @resource     geminiProfileBadgeCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.css
// @resource     geminiProfileBadgeHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.html
// @noframes
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

    // Reserve a load-order slot
    registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {
        // Constants
        const BADGE_STORAGE_KEY = 'gemini_profile_badge_text';
        const BADGE_DEFAULT_TEXT = '';
        const BADGE_CLASS = 'gemini-custom-profile-badge';

        // Initialize Trusted Types Policy
        const badgePolicy = window.geminiCreateTrustedHTMLPolicy('gemini-profile-badge-policy');

        // Load Styles
        const customCSS = GM_getResourceText('geminiProfileBadgeCSS');
        if (customCSS && !document.getElementById('gemini-profile-badge-styles')) {
            const style = GM_addStyle(customCSS);
            if (style) style.id = 'gemini-profile-badge-styles';
        }

        /**
         * Finds the target element to inject the badge.
         * Toolbar selector: top-bar-actions
         * Target container: The .right-section inside the toolbar.
         */
        function findTargetContainer() {
            const toolbar = document.querySelector('top-bar-actions');
            if (!toolbar) return null;
            return toolbar.querySelector('.right-section');
        }

        /**
         * Creates or updates the badge element using the HTML template.
         */
        function renderBadge() {
            const badgeText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);

            // Remove existing badge if text is empty or to update it
            removeBadge();

            if (!badgeText) return;

            const targetContainer = findTargetContainer();
            if (!targetContainer) return;

            // Prevent duplicate injection
            if (targetContainer.querySelector('.' + BADGE_CLASS)) return;

            // Load Template
            const htmlTemplate = GM_getResourceText('geminiProfileBadgeHTML');
            if (!htmlTemplate) {
                console.error('Gemini Profile Badge: Template not found');
                return;
            }

            // Create temporary container for injection
            const tempDiv = document.createElement('div');
            window.geminiSetInnerHTML(tempDiv, htmlTemplate, badgePolicy);

            const badgeElement = tempDiv.firstElementChild;
            if (badgeElement) {
                badgeElement.textContent = badgeText;
                // Insert at the beginning of right-section
                targetContainer.insertBefore(badgeElement, targetContainer.firstChild);
            }
        }

        function removeBadge() {
            const existingBadges = document.querySelectorAll('.' + BADGE_CLASS);
            existingBadges.forEach(el => el.remove());
        }

        // Settings
        function setupMenu() {
            GM_registerMenuCommand("Set Badge Text", () => {
                const currentText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);
                const newText = prompt("Enter text or emoji for the Gemini profile badge:", currentText);

                if (newText !== null) {
                    GM_setValue(BADGE_STORAGE_KEY, newText);
                    renderBadge(); // Re-render immediately
                }
            });
        }

        // Observer to handle SPA navigation and dynamic loading
        function startObserver() {
            const observer = new MutationObserver(() => {
                const badgeText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);
                if (badgeText) {
                    const target = findTargetContainer();
                    if (target && !target.querySelector('.' + BADGE_CLASS)) {
                        renderBadge();
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Initialize
        function init() {
            console.log('Gemini Profile Badge: Initialized');
            setupMenu();
            renderBadge();
            startObserver();
        }

        init();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserScript);
    } else {
        initUserScript();
    }
})();
