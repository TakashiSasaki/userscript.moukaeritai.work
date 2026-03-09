// ==UserScript==
// @name         Microsoft 365 Copilot Conversation Deleter
// @namespace    https://userscript.moukaeritai.work/
// @version      0.2.0
// @description  Adds a floating shortcut button to easily delete the currently viewed Copilot conversation in Outlook. Optimized for PWA/Iframe structure.
// @author       takas
// @match        https://outlook.office.com/host/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=office.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // UI Configuration
    const CONTAINER_ID = 'copilot-deleter-container';
    const BUTTON_ID = 'copilot-conversation-deleter-btn';
    const DRY_RUN_ID = 'copilot-deleter-dry-run';

    // DOM Selectors (Supporting both JP and EN)
    const SIDEBAR_EXPAND_SELECTOR = '#sidepaneExpandButton';
    // Active chat item in the sidebar
    const ACTIVE_CHAT_ITEM_SELECTOR = '.fui-NavSubItem[aria-current="page"], .fui-NavItem[aria-current="page"]';
    // "More actions" button sibling to the active chat
    const SIDEBAR_MORE_SELECTOR = 'button[aria-label="その他"], button[aria-label="More actions"], button[aria-label="More"]';
    // Menu item for deletion
    const DELETE_MENU_ITEM_SELECTOR = 'div[role="menuitem"][aria-label*="削除"], div[role="menuitem"][aria-label*="Delete"]';

    let isDryRun = true;

    /**
     * Helper to find an element across all frames/iframes on the page.
     */
    function findInFrames(selector, root = document) {
        let el = root.querySelector(selector);
        if (el) return el;

        const iframes = root.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                el = findInFrames(selector, doc);
                if (el) return el;
            } catch (e) {
                // Cross-origin iframes will throw error
            }
        }
        return null;
    }

    /**
     * Helper to find an element by text content within a root (or frames)
     */
    function findByText(textArr, selector = '*', root = document) {
        const elements = root.querySelectorAll(selector);
        for (const el of elements) {
            const content = el.textContent || '';
            if (textArr.some(t => content.includes(t))) return el;
        }

        const iframes = root.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                const el = findByText(textArr, selector, doc);
                if (el) return el;
            } catch (e) { }
        }
        return null;
    }

    function createFloatingUI() {
        if (document.getElementById(CONTAINER_ID)) return;

        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '20px',
            right: '25px',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            fontFamily: '"Segoe UI", "Segoe UI Web", sans-serif'
        });

        const toggleLabel = document.createElement('label');
        Object.assign(toggleLabel.style, {
            fontSize: '11px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            padding: '6px 10px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#333',
            border: '1px solid #ddd',
            userSelect: 'none',
            fontWeight: '500'
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = DRY_RUN_ID;
        checkbox.checked = isDryRun;
        checkbox.addEventListener('change', (e) => {
            isDryRun = e.target.checked;
            updateButtonStyle();
        });

        toggleLabel.appendChild(checkbox);
        toggleLabel.appendChild(document.createTextNode('Dry Run (Safety On)'));

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;

        Object.assign(btn.style, {
            padding: '12px 20px',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        });

        const updateButtonStyle = () => {
            if (isDryRun) {
                btn.style.backgroundColor = '#0078d4';
                btn.innerHTML = '🔍 Test Selectors (Dry)';
                btn.title = 'Highlight elements that would be clicked';
            } else {
                btn.style.backgroundColor = '#d13438';
                btn.innerHTML = '🗑️ Delete Chat (REAL)';
                btn.title = 'Proceed with actual conversation deletion';
            }
        };

        btn.onmousedown = () => btn.style.transform = 'scale(0.96)';
        btn.onmouseup = () => btn.style.transform = 'scale(1)';
        btn.addEventListener('click', handleDeleteChat);

        updateButtonStyle();

        container.appendChild(toggleLabel);
        container.appendChild(btn);
        document.body.appendChild(container);
    }

    function highlightElement(el) {
        if (!el) return;
        const previousOutline = el.style.outline;
        const previousTransition = el.style.transition;

        el.style.transition = 'outline 0.3s ease';
        el.style.outline = '5px solid #ff00ff';
        el.style.outlineOffset = '2px';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            el.style.outline = previousOutline;
            el.style.transition = previousTransition;
        }, 3000);
    }

    async function handleDeleteChat() {
        const modeLabel = isDryRun ? "[DRY RUN]" : "[ACTUAL]";
        console.log(`Copilot Deleter ${modeLabel}: Starting...`);

        // 0. Ensure Sidebar is expanded
        const expandBtn = findInFrames(SIDEBAR_EXPAND_SELECTOR);
        if (expandBtn) {
            const label = expandBtn.getAttribute('aria-label') || '';
            if (label.includes('開く') || label.includes('Open')) {
                console.log(`Copilot Deleter ${modeLabel}: Sidebar collapsed. Expanding...`);
                if (!isDryRun) {
                    expandBtn.click();
                    await new Promise(r => setTimeout(r, 600));
                } else {
                    highlightElement(expandBtn);
                }
            }
        }

        // 1. Find the active chat item
        const activeItem = findInFrames(ACTIVE_CHAT_ITEM_SELECTOR);
        if (!activeItem) {
            console.error(`Copilot Deleter ${modeLabel}: Could not find active chat item.`);
            alert("Active conversation not found in sidebar.");
            return;
        }

        // 2. Find the "More actions" button sibling
        const parent = activeItem.closest('.fui-SplitNavItem') || activeItem.parentElement;
        const moreBtn = parent.querySelector(SIDEBAR_MORE_SELECTOR);

        if (!moreBtn) {
            console.error(`Copilot Deleter ${modeLabel}: Could not find 'More' button in sidebar.`);
            highlightElement(activeItem);
            return;
        }

        console.log(`Copilot Deleter ${modeLabel}: Found More button.`);
        if (isDryRun) {
            highlightElement(moreBtn);
        } else {
            moreBtn.click();
        }

        // 3. Wait for menu and find "Delete"
        await new Promise(r => setTimeout(r, 600));
        const deleteItem = findInFrames(DELETE_MENU_ITEM_SELECTOR);

        if (deleteItem) {
            console.log(`Copilot Deleter ${modeLabel}: Found Delete menu item.`);
            if (isDryRun) {
                highlightElement(deleteItem);
            } else {
                deleteItem.click();

                // 4. Final Confirmation (Highlight for user)
                await new Promise(r => setTimeout(r, 800));
                const confirmBtn = findByText(['削除する', 'Delete'], 'button.fui-Button');
                if (confirmBtn) {
                    console.log(`Copilot Deleter ${modeLabel}: Found Confirmation button.`);
                    highlightElement(confirmBtn);
                    alert("Automation step reached confirmation. Click 'Delete' button to finish.");
                }
            }
        } else if (!isDryRun) {
            console.error("Could not find the 'Delete' menu item.");
        }
    }

    function init() {
        const observer = new MutationObserver(() => {
            const isCopilotPage = window.location.host.includes('outlook.office.com') &&
                (window.location.href.includes('/host/') || window.location.href.includes('/entity'));

            if (isCopilotPage) {
                createFloatingUI();
            } else {
                const container = document.getElementById(CONTAINER_ID);
                if (container) container.remove();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        if (window.location.host.includes('outlook.office.com') &&
            (window.location.href.includes('/host/') || window.location.href.includes('/entity'))) {
            createFloatingUI();
        }
    }

    // Run initialization
    init();

})();
