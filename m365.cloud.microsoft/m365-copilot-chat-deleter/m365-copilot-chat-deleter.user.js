// ==UserScript==
// @name         M365 Copilot One-Click Delete
// @namespace    userscript.moukaeritai.work
// @version      0.2.0
// @description  Adds a floating button and Ctrl+Shift+Backspace shortcut to delete the currently active M365 Copilot chat. Robust against design changes and multiple languages.
// @author       Takashi Sasaki
// @match        https://m365.cloud.microsoft/chat/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
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
        #m365-deleter-panel {
            position: fixed;
            bottom: 20px;
            right: 80px; /* Offset to not overlap with Turn Counter if both active */
            z-index: 10000;
            background-color: var(--colorNeutralBackground1, rgba(32, 33, 35, 0.85));
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 10px 14px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            user-select: none;
            cursor: default;
            backdrop-filter: blur(10px);
            opacity: 0.85;
            transition: opacity 0.2s;
        }
        #m365-deleter-panel:hover {
            opacity: 1;
        }
        #m365-deleter-panel .header {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 4px;
        }
        #m365-deleter-panel button.delete-btn {
            background-color: rgba(255, 59, 48, 0.2);
            border: 1px solid rgba(255, 59, 48, 0.5);
            color: #ff453a;
            border-radius: 6px;
            padding: 6px 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        #m365-deleter-panel button.delete-btn:hover:not(:disabled) {
            background-color: rgba(255, 59, 48, 0.4);
            border-color: #ff453a;
        }
        #m365-deleter-panel button.delete-btn:disabled {
            border-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.3);
            background-color: transparent;
            cursor: not-allowed;
        }
        #m365-deleter-panel .shortcut-hint {
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

    function createFloatingPanel() {
        if (document.getElementById('m365-deleter-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'm365-deleter-panel';

        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `<span>1-Click Delete</span><span>v${GM_info.script.version}</span>`;

        deleteBtnEl = document.createElement('button');
        deleteBtnEl.className = 'delete-btn';
        updateButtonState();
        deleteBtnEl.onclick = executeDeleteSequence;

        const hint = document.createElement('div');
        hint.className = 'shortcut-hint';
        hint.textContent = 'Ctrl+Shift+Backspace';

        panel.appendChild(header);
        panel.appendChild(deleteBtnEl);
        panel.appendChild(hint);
        document.body.appendChild(panel);
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
