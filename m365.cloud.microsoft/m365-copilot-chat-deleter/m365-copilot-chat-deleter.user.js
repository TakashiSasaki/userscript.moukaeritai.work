// ==UserScript==
// @name         M365 Copilot One-Click Delete
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  Adds a floating button and Ctrl+Shift+Backspace shortcut to delete the currently active M365 Copilot chat.
// @author       Takashi Sasaki
// @match        https://m365.cloud.microsoft/chat/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://*.app.github.dev/*
// @grant        GM_info
// ==/UserScript==
// ===============================================================
// Installation Check Logic (required for all userscripts in this project)
// ==============================================================================
const installCheckHosts = [
    'userscript.moukaeritai.work',
    '127.0.0.1'
];
const installCheckSuffixes = [
    '.app.github.dev'
];

const isInstallCheckHost = installCheckHosts.includes(location.hostname) ||
    installCheckSuffixes.some(suffix => location.hostname.endsWith(suffix));

if (isInstallCheckHost) {
    const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    report();
    document.addEventListener('userscript-ping', report);
} else {

    // ==============================================================================
    // Main Logic
    // ==============================================================================
    (function () {
        'use strict';

        // Constants
        const SELECTORS = {
            ACTIVE_ITEM: 'button.fui-NavItem[aria-current="page"], button.fui-NavItem[aria-selected="true"]',
            ITEM_CONTAINER: '.fui-SplitNavItem',
            MORE_BTN: 'button[aria-label="その他"], button.fui-SplitNavItem__menuButton',
            MENU_ITEM: '[role="menuitem"], .fui-MenuItem',
            CONFIRM_BTN: 'button.fui-Button'
        };

        const TEXT_MATCHES = {
            DELETE_MENU: '削除',
            CONFIRM_BTN: '削除する'
        };

        let isDeleting = false;

        // Custom CSS for Floating Panel
        const STYLE_ID = 'm365-deleter-style';
        const cssContent = `
            #m365-deleter-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                background-color: var(--colorNeutralBackground1, rgba(255, 255, 255, 0.95));
                border: 1px solid var(--colorNeutralStroke1, #ccc);
                border-radius: 8px;
                padding: 10px 14px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                font-family: inherit;
                font-size: 13px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                user-select: none;
                cursor: default;
                color: var(--colorNeutralForeground1, #333);
                opacity: 0.85;
                transition: opacity 0.2s;
            }
            #m365-deleter-panel:hover {
                opacity: 1;
            }
            #m365-deleter-panel .header {
                font-weight: bold;
                margin-bottom: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--colorNeutralStroke2, #eee);
                padding-bottom: 4px;
            }
            #m365-deleter-panel .script-title {
                margin: 0;
            }
            #m365-deleter-panel .script-version {
                font-size: 10px;
                color: var(--colorNeutralForeground3, #777);
                margin-left: 8px;
            }
            #m365-deleter-panel button.delete-btn {
                background-color: transparent;
                border: 1px solid var(--colorPaletteRedBorderActive, #e00);
                color: var(--colorPaletteRedForeground1, #e00);
                border-radius: 4px;
                padding: 6px 12px;
                cursor: pointer;
                font-weight: 600;
                transition: background-color 0.2s, color 0.2s;
            }
            #m365-deleter-panel button.delete-btn:hover {
                background-color: var(--colorPaletteRedBackground3, #fcc);
            }
            #m365-deleter-panel button.delete-btn:disabled {
                border-color: #ccc;
                color: #ccc;
                background-color: transparent;
                cursor: not-allowed;
            }
            #m365-deleter-panel .shortcut-hint {
                font-size: 10px;
                color: var(--colorNeutralForeground3, #777);
                text-align: center;
                margin-top: 2px;
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

        function findElementByText(selector, textMatch) {
            const elements = Array.from(document.querySelectorAll(selector));
            return elements.find(el => el.textContent && el.textContent.includes(textMatch));
        }

        async function executeDeleteSequence() {
            if (isDeleting) return;
            isDeleting = true;
            updateButtonState();

            try {
                // Step 1: Find active conversation
                const activeNav = document.querySelector(SELECTORS.ACTIVE_ITEM);
                if (!activeNav) throw new Error('アクティブな会話が見つかりません。');
                
                const container = activeNav.closest(SELECTORS.ITEM_CONTAINER);
                if (!container) throw new Error('会話コンテナが見つかりません。');

                // Simulate hover to ensure "More" button is visible/interactable
                container.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                await sleep(50);

                // Step 2: Click "More options"
                const moreBtn = container.querySelector(SELECTORS.MORE_BTN);
                if (!moreBtn) throw new Error('「その他」ボタンが見つかりません。');
                moreBtn.click();

                // Wait for menu to appear
                await sleep(200);

                // Step 3: Click "Delete" in menu
                const deleteMenuItem = findElementByText(SELECTORS.MENU_ITEM, TEXT_MATCHES.DELETE_MENU);
                if (!deleteMenuItem) throw new Error('メニュー内に「削除」が見つかりません。');
                deleteMenuItem.click();

                // Wait for confirmation dialog to appear
                await sleep(300);

                // Step 4: Click Confirm button
                const confirmBtn = findElementByText(SELECTORS.CONFIRM_BTN, TEXT_MATCHES.CONFIRM_BTN);
                if (!confirmBtn) throw new Error('確認ダイアログの「削除する」ボタンが見つかりません。');
                
                // Confirm
                confirmBtn.click();
                console.log('会話を削除しました。');

            } catch (err) {
                console.warn('One-Click Delete Error: ', err.message);
                // Optional: Show error via UI
            } finally {
                await sleep(500); // UI cooldown
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
                deleteBtnEl.textContent = isDeleting ? '削除中...' : '🗑️ Active Chat 削除';
            }
        }

        function createFloatingPanel() {
            if (document.getElementById('m365-deleter-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'm365-deleter-panel';

            const header = document.createElement('div');
            header.className = 'header';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'script-title';
            titleSpan.textContent = '1-Click Delete';

            const versionSpan = document.createElement('span');
            versionSpan.className = 'script-version';
            versionSpan.textContent = `v${GM_info.script.version}`;

            header.appendChild(titleSpan);
            header.appendChild(versionSpan);

            deleteBtnEl = document.createElement('button');
            deleteBtnEl.className = 'delete-btn';
            updateButtonState();
            deleteBtnEl.onclick = executeDeleteSequence;

            const hint = document.createElement('div');
            hint.className = 'shortcut-hint';
            hint.textContent = 'Shortcut: Ctrl+Shift+Backspace';

            panel.appendChild(header);
            panel.appendChild(deleteBtnEl);
            panel.appendChild(hint);
            document.body.appendChild(panel);
        }

        // ==========================================
        // Keyboard Shortcuts
        // ==========================================

        function setupShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Check for Ctrl + Shift + Backspace
                if (e.ctrlKey && e.shiftKey && e.key === 'Backspace') {
                    // Prevent any default backspace behavior (like navigating back)
                    e.preventDefault();
                    if (!isDeleting) {
                        executeDeleteSequence();
                    }
                }
            });
        }

        // Initialization
        function init() {
            injectStyle();
            createFloatingPanel();
            setupShortcuts();
        }

        // Wait for body before starting
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

    })();
}
