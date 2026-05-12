// ==UserScript==
// @name         M365 Copilot One-Click Delete
// @namespace    userscript.moukaeritai.work
// @version      0.2.1
// @description  Adds a floating button and Ctrl+Shift+Backspace shortcut to delete the currently active M365 Copilot chat. Robust against design changes and multiple languages.
// @author       Takashi Sasaki
// @match        https://m365.cloud.microsoft/chat/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @grant        GM_getResourceText
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-common.js
// @resource     m365CommonHtml https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/m365.cloud.microsoft/m365-common.html
// @match https://userscript.moukaeritai.work/*
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

    // Constants
    const SELECTORS = {
        // Broaden active item search to be attribute-based
        ACTIVE_ITEM: '[aria-current="page"], [aria-selected="true"]',
        ITEM_CONTAINER: '.fui-SplitNavItem',
        // Support both Japanese and English aria-labels
        MORE_BTN_PATTERN: '[aria-label*="その他"], [aria-label*="More"], .fui-SplitNavItem__menuButton',
        MENU_ITEM: '[role="menuitem"], .fui-MenuItem',
        CONFIRM_BTN: 'button.fui-Button'
    };

    const TEXT_MATCHES = {
        DELETE_MENU: /削除|Delete/i,
        CONFIRM_BTN: /削除する|Delete/i
    };

    let isDeleting = false;

    // Custom CSS for Floating Panel
    const STYLE_ID = 'm365-deleter-style';
    const cssContent = `
        button.delete-btn {
            background-color: rgba(255, 59, 48, 0.2);
            border: 1px solid rgba(255, 59, 48, 0.5);
            color: #ff453a;
            border-radius: 6px;
            padding: 6px 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            width: 100%;
        }
        button.delete-btn:hover:not(:disabled) {
            background-color: rgba(255, 59, 48, 0.4);
            border-color: #ff453a;
        }
        button.delete-btn:disabled {
            border-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.3);
            background-color: transparent;
            cursor: not-allowed;
        }
        .shortcut-hint {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);
            text-align: center;
        }
    `;

    function injectStyle() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = cssContent;
            document.head.appendChild(style);
        }
    }

    // ==========================================
    // Deletion Logic
    // ==========================================

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function findElement(selector, pattern) {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.find(el => {
            const text = el.textContent || '';
            const label = el.getAttribute('aria-label') || '';
            return pattern.test(text) || pattern.test(label);
        });
    }

    async function executeDeleteSequence() {
        if (isDeleting) return;
        isDeleting = true;
        updateButtonState();

        try {
            // Step 1: Find active conversation
            // Search globally for current page indicator
            const activeNav = document.querySelector(SELECTORS.ACTIVE_ITEM);
            if (!activeNav) throw new Error('Active chat not found.');
            
            const container = activeNav.closest(SELECTORS.ITEM_CONTAINER);
            if (!container) throw new Error('Chat container not found.');

            // Ensure "More" button is visible
            container.scrollIntoView({ block: 'nearest' });
            container.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            await sleep(100);

            // Step 2: Click "More options"
            const moreBtn = container.querySelector(SELECTORS.MORE_BTN_PATTERN);
            if (!moreBtn) throw new Error('"More" button not found.');
            moreBtn.click();

            // Wait for menu
            await sleep(300);

            // Step 3: Click "Delete" in menu
            const deleteMenuItem = findElement(SELECTORS.MENU_ITEM, TEXT_MATCHES.DELETE_MENU);
            if (!deleteMenuItem) throw new Error('Delete item not found in menu.');
            deleteMenuItem.click();

            // Wait for confirmation
            await sleep(400);

            // Step 4: Click Confirm button
            const confirmBtn = findElement(SELECTORS.CONFIRM_BTN, TEXT_MATCHES.CONFIRM_BTN);
            if (!confirmBtn) throw new Error('Confirmation button not found.');
            
            confirmBtn.click();
            console.log('Chat deleted successfully.');

        } catch (err) {
            console.warn('M365 Deleter Error: ', err.message);
        } finally {
            await sleep(500);
            isDeleting = false;
            updateButtonState();
        }
    }

    // ==========================================
    // UI Panel
    // ==========================================

    let deleteBtnEl;

    function updateButtonState() {
        if (deleteBtnEl) {
            deleteBtnEl.disabled = isDeleting;
            deleteBtnEl.textContent = isDeleting ? 'Deleting...' : '🗑️ Delete Active Chat';
        }
    }

    /* global M365FloatingPanel */
    function createFloatingPanel() {
        if (document.getElementById('m365-deleter-panel')) return;

        const commonHtml = GM_getResourceText('m365CommonHtml');
        const panel = new M365FloatingPanel({
            id: 'm365-deleter-panel',
            title: '1-Click Delete',
            version: GM_info.script.version,
            storageKey: 'm365-chat-deleter-pos',
            template: commonHtml,
            defaultPosition: { right: '80px', bottom: '20px' }
        });

        const contentHtml = `
            <button class="delete-btn" id="m365-deleter-btn">🗑️ Delete Active Chat</button>
            <div class="shortcut-hint">Ctrl+Shift+Backspace</div>
        `;
        panel.setContent(contentHtml);

        deleteBtnEl = document.getElementById('m365-deleter-btn');
        updateButtonState();
        if (deleteBtnEl) {
            deleteBtnEl.onclick = executeDeleteSequence;
        }
    }

    function setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'Backspace') {
                e.preventDefault();
                if (!isDeleting) executeDeleteSequence();
            }
        });
    }

    function init() {
        injectStyle();
        createFloatingPanel();
        setupShortcuts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
