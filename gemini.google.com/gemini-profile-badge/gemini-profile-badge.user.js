// ==UserScript==
// @name         Gemini Profile Badge
// @namespace    userscript.moukaeritai.work
// @version      0.1.36
// @lastModified 2026-04-15
// @description  Add a custom text/emoji badge to the user profile area on Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @noframes
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

    // Reserve a load-order slot (no gus-version badge in this script)
    registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {

        const initUserScript = () => {

            // Constants
            const BADGE_STORAGE_KEY = 'gemini_profile_badge_text';
            const BADGE_DEFAULT_TEXT = '';
            const BADGE_CLASS = 'gemini-custom-profile-badge';

            /**
             * Finds the target element to inject the badge.
             * Based on toolbar.html sample:
             * Toolbar selector: #app-root > main > top-bar-actions > div
             * Target container: The .right-section inside the toolbar.
             * We want to insert the badge at the beginning of .right-section or before the first button container.
             */
            function findTargetContainer() {
                // Try precise selector first
                const toolbar = document.querySelector('top-bar-actions');
                if (!toolbar) return null;

                // In the sample, the structure is top-bar-actions > div.top-bar-actions (implied by sample class?)
                // Actually sample shows <div class="top-bar-actions"> at root of sample.
                // And comment says #app-root > main > top-bar-actions > div
                // Let's look for .right-section inside top-bar-actions
                const rightSection = toolbar.querySelector('.right-section');
                return rightSection;
            }

            /**
             * Creates or updates the badge element.
             */
            function renderBadge() {
                const badgeText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);

                // Remove existing badge if text is empty or to update it
                removeBadge();

                if (!badgeText) return;

                const targetContainer = findTargetContainer();
                if (!targetContainer) return;

                // Prevent duplicate injection loop if something goes wrong, though removeBadge handles it.
                if (targetContainer.querySelector('.' + BADGE_CLASS)) return;

                const badge = document.createElement('span');
                badge.className = BADGE_CLASS;
                badge.textContent = badgeText;

                // Style the badge to fit in the toolbar
                // Gemini header height is roughly 48-64px.
                // We simulate a pill-like look similar to the "PRO" badge seen in samples or just a clean text label.
                Object.assign(badge.style, {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1f1f1f', // Dark gray, assuming dark mode or neutral
                    color: '#e3e3e3',
                    padding: '4px 8px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginRight: '8px', // Space between badge and other right-section items
                    border: '1px solid #444',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'middle',
                    userSelect: 'none'
                });

                // Insert at the beginning of right-section
                targetContainer.insertBefore(badge, targetContainer.firstChild);
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
                const observer = new MutationObserver((_mutations) => {
                    // Check if badge is missing but required
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

        if (document.readyState === 'complete') {
            initUserScript();
        } else {
            window.addEventListener('load', initUserScript);
        }
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
