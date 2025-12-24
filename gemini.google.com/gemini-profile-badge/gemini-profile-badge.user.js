// ==UserScript==
// @name         Gemini Profile Badge
// @namespace    userscript.moukaeritai.work
// @version      0.0.1
// @description  Add a custom text/emoji badge to the user profile on Gemini
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/app*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-profile-badge/gemini-profile-badge.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Constants
    const BADGE_STORAGE_KEY = 'gemini_profile_badge_text';
    const BADGE_DEFAULT_TEXT = '';

    // Main execution
    function init() {
        console.log('Gemini Profile Badge: Initialized');

        // TODO: Implement badge rendering logic here
        // 1. Identify valid profile element selectors from samples
        // 2. Setup MutationObserver
        // 3. Inject badge
    }

    // Settings
    function setupMenu() {
        GM_registerMenuCommand("Set Badge Text", () => {
            const currentText = GM_getValue(BADGE_STORAGE_KEY, BADGE_DEFAULT_TEXT);
            const newText = prompt("Enter text or emoji for the profile badge:", currentText);

            if (newText !== null) {
                GM_setValue(BADGE_STORAGE_KEY, newText);
                location.reload(); // Simple reload to apply changes for now
            }
        });
    }

    setupMenu();
    init();

})();
