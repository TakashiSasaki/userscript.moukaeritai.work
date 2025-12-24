// ==UserScript==
// @name         ChatGPT Profile Badge
// @namespace    userscript.moukaeritai.work
// @version      0.2.1
// @description  Add a custom string to the user profile section on ChatGPT.
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/TakashiSasaki/world/raw/main/chat.openai.com/chatgpt-profile-badge/chatgpt-profile-badge.user.js
// @downloadURL  https://github.com/TakashiSasaki/world/raw/main/chat.openai.com/chatgpt-profile-badge/chatgpt-profile-badge.user.js
// ==/UserScript==

(function() {
    'use strict';

    const BADGE_ID = 'chatgpt-profile-badge-container';
    const STORAGE_KEY = 'badge_text';

    /**
     * Removes the currently displayed badge.
     */
    function removeBadge() {
        const badge = document.getElementById(BADGE_ID);
        if (badge) {
            const parent = badge.parentElement;
            if (parent) {
                delete parent.dataset.badgeInjected;
            }
            badge.remove();
        }
    }

    /**
     * Creates and injects the badge element into the target container.
     * @param {HTMLElement} nameContainer - The flex container holding the user's name.
     */
    async function createAndInjectBadge(nameContainer) {
        // Prevent duplicate badges by checking for a custom attribute on the container
        if (nameContainer.dataset.badgeInjected) {
            return;
        }

        const badgeText = await GM_getValue(STORAGE_KEY);
        if (!badgeText || typeof badgeText !== 'string' || badgeText.trim() === '') {
            return;
        }

        const badge = document.createElement('span');
        badge.id = BADGE_ID;
        badge.textContent = badgeText;
        
        // Style the badge to match the "Plus" label, with some adjustments for a "badge" look.
        badge.className = 'text-token-text-secondary inline-flex items-center text-xs font-normal';
        badge.style.marginLeft = '8px';
        badge.style.padding = '2px 8px';
        badge.style.borderRadius = '6px';
        badge.style.backgroundColor = 'var(--token-bg-surface-secondary)';
        badge.style.whiteSpace = 'nowrap';

        nameContainer.appendChild(badge);
        nameContainer.dataset.badgeInjected = 'true'; // Mark as injected
    }

    /**
     * Finds the target element and triggers badge injection.
     * This function is designed to be called repeatedly by the MutationObserver.
     */
    function findTargetAndInject() {
        // Use a stable selector targeting the profile button first.
        const profileButton = document.querySelector('[data-testid="accounts-profile-button"]');
        if (!profileButton) {
            return;
        }

        // Within the profile button, find the element that contains the user's name.
        // The '.truncate' class can be ambiguous, so we specify 'div.truncate' to target the username
        // element more reliably, as the subscription tier is in a 'span'.
        const nameContainer = profileButton.querySelector('div.truncate')?.parentElement;
        
        if (nameContainer) {
            createAndInjectBadge(nameContainer);
        }
    }

    // Register a menu command to allow the user to set the badge text.
    GM_registerMenuCommand('Set Badge Text', async () => {
        const currentText = await GM_getValue(STORAGE_KEY, '');
        const newText = prompt('Enter the text for your profile badge. Leave empty to remove it.', currentText);

        if (newText !== null) { // prompt returns null if the user clicks "Cancel"
            await GM_setValue(STORAGE_KEY, newText.trim());
            removeBadge(); // Remove the old badge to allow for re-injection
            findTargetAndInject(); // Immediately attempt to update the badge
        }
    });

    // Use MutationObserver to non-blockingly wait for the profile element to appear.
    const observer = new MutationObserver(() => {
        // The callback just re-runs the check. It's simple and robust.
        findTargetAndInject();
    });

    // Start observing the document body for changes that might add our target element.
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial check in case the element is already present when the script runs.
    findTargetAndInject();

})();
