// ==UserScript==
// @name         Microsoft 365 Copilot Conversation Deleter
// @namespace    https://userscript.moukaeritai.work/
// @version      0.3.0
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
    const STORAGE_KEY = 'copilot_deleter_settings';

    // DOM Selectors (Supporting both JP and EN)
    const SIDEBAR_EXPAND_SELECTOR = '#sidepaneExpandButton';
    // Active chat item in the sidebar (specifically sub-items which are actual conversations)
    const ACTIVE_CHAT_ITEM_SELECTOR = '.fui-NavSubItem[aria-current="page"]';
    // "More actions" button sibling to the active chat
    const SIDEBAR_MORE_SELECTOR = 'button[aria-label="その他"], button[aria-label="More actions"], button[aria-label="More"]';
    // Menu item for deletion
    const DELETE_MENU_ITEM_SELECTOR = 'div[role="menuitem"][aria-label*="削除"], div[role="menuitem"][aria-label*="Delete"]';

    let isDryRun = true;
    let isDraggingUI = false;

    function saveSettings(settings) {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (settings.hasOwnProperty('isDryRun')) isDryRun = settings.isDryRun;
        return settings;
    }

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

        const settings = loadSettings();
        const container = document.createElement('div');
        container.id = CONTAINER_ID;

        const pos = settings.position || { bottom: '20px', right: '25px' };

        Object.assign(container.style, {
            position: 'fixed',
            bottom: pos.bottom || 'auto',
            right: pos.right || 'auto',
            top: pos.top || 'auto',
            left: pos.left || 'auto',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            fontFamily: '"Segoe UI", "Segoe UI Web", sans-serif',
            cursor: 'grab'
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
            saveSettings({ isDryRun: isDryRun });
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

        const setWaitingState = (isWaiting) => {
            btn.disabled = isWaiting;
            if (isWaiting) {
                btn.style.backgroundColor = '#666';
                btn.innerHTML = '⏳ Deleting...';
                btn.style.cursor = 'not-allowed';
            } else {
                updateButtonStyle();
                btn.style.cursor = 'pointer';
            }
        };

        window.copilotDeleter = { setWaitingState };

        btn.onmousedown = () => btn.style.transform = 'scale(0.96)';
        btn.onmouseup = () => btn.style.transform = 'scale(1)';
        btn.addEventListener('click', handleDeleteChat);

        updateButtonStyle();

        // Draggable Logic
        let isDragging = false;
        let startX, startY, initialProps;

        container.addEventListener('mousedown', (e) => {
            if (e.target === checkbox || e.target === btn || e.target === toggleLabel) {
                if (e.target === toggleLabel) {
                    // Allow dragging from the label background
                } else {
                    return;
                }
            }
            isDragging = true;
            container.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            isDraggingUI = true;
            initialProps = {
                left: container.offsetLeft,
                top: container.offsetTop
            };

            // Switch to absolute positioning relative to viewport for dragging
            container.style.bottom = 'auto';
            container.style.right = 'auto';
            container.style.left = initialProps.left + 'px';
            container.style.top = initialProps.top + 'px';

            e.preventDefault();
        });

        let dragRAF;
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            if (dragRAF) cancelAnimationFrame(dragRAF);

            dragRAF = requestAnimationFrame(() => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                container.style.left = (initialProps.left + dx) + 'px';
                container.style.top = (initialProps.top + dy) + 'px';
            });
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            isDraggingUI = false;
            if (dragRAF) cancelAnimationFrame(dragRAF);
            container.style.cursor = 'grab';

            saveSettings({
                position: {
                    top: container.style.top,
                    left: container.style.left,
                    bottom: 'auto',
                    right: 'auto'
                }
            });
        });

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

        // 1. Find the active chat item and extract its title
        const activeItem = findInFrames(ACTIVE_CHAT_ITEM_SELECTOR);
        if (!activeItem) {
            console.error(`Copilot Deleter ${modeLabel}: Could not find active chat item.`);
            alert("Active conversation not found in sidebar.");
            return;
        }

        const sidebarTitle = (activeItem.getAttribute('aria-label') || activeItem.innerText || '').trim();
        console.log(`Copilot Deleter ${modeLabel}: Active Chat Title: "${sidebarTitle}"`);

        // 1.1 Identify the "next" conversation to select after deletion
        let nextItemToClick = null;
        try {
            // Traverse: .fui-NavSubItem -> .fui-SplitNavItem (or similar) -> li/div wrapper
            const currentWrapper = activeItem.closest('li') || activeItem.closest('[role="listitem"]') || activeItem.parentElement.parentElement;
            if (currentWrapper && currentWrapper.nextElementSibling) {
                // Find the clickable item inside the next sibling wrapper
                nextItemToClick = currentWrapper.nextElementSibling.querySelector(ACTIVE_CHAT_ITEM_SELECTOR.replace('[aria-current="page"]', '')) ||
                    currentWrapper.nextElementSibling.querySelector('.fui-NavSubItem') ||
                    currentWrapper.nextElementSibling.querySelector('button, a');

                if (nextItemToClick) {
                    console.log(`Copilot Deleter ${modeLabel}: Identified next item to click:`, nextItemToClick.getAttribute('aria-label') || nextItemToClick.innerText);
                }
            }
        } catch (e) {
            console.warn(`Copilot Deleter ${modeLabel}: Failed to identify next item.`, e);
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

                // 4. Final Confirmation Phase
                console.log(`Copilot Deleter [ACTUAL]: Waiting for confirmation dialog...`);
                await new Promise(r => setTimeout(r, 1000));

                // Try to find the title in the dialog. It's usually bolded inside the confirmation text.
                const dialogTitleCandidates = [
                    'div[role="dialog"] b',
                    'div[role="dialog"] strong',
                    'div[role="dialog"] span.fui-Text[style*="font-weight: 700"]',
                    'div[role="dialog"] [style*="font-weight: bold"]',
                    'div[role="dialog"] [class*="fkhj508"]'
                ];

                let dialogTitle = "";
                for (const sel of dialogTitleCandidates) {
                    const el = findInFrames(sel);
                    if (el && el.innerText.trim()) {
                        dialogTitle = el.innerText.trim();
                        break;
                    }
                }

                const confirmBtn = findByText(['削除する', 'Delete'], 'button.fui-Button--primary') ||
                    findByText(['削除する', 'Delete'], 'button.fui-Button');

                // Robust normalization for comparison
                const normalize = (s) => (s || '').replace(/\s+/g, '').replace(/[・…？！\?\!]/g, '').toLowerCase();
                const nSidebar = normalize(sidebarTitle);
                const nDialog = normalize(dialogTitle);

                console.log(`Copilot Deleter [ACTUAL]: Comparing Normalized Strings: Sidebar("${nSidebar}") vs Dialog("${nDialog}")`);

                if (nSidebar && nDialog && (nSidebar.includes(nDialog) || nDialog.includes(nSidebar))) {
                    console.log(`Copilot Deleter [ACTUAL]: Title match confirmed. Auto-confirming...`);
                    if (confirmBtn) {
                        if (window.copilotDeleter) window.copilotDeleter.setWaitingState(true);
                        confirmBtn.click();
                        console.log(`Copilot Deleter [ACTUAL]: Deletion confirmed. Waiting for removal...`);

                        // 5. Detection Logic for completion
                        let attempts = 0;
                        const checkRemoval = setInterval(() => {
                            const stillPresent = findInFrames(ACTIVE_CHAT_ITEM_SELECTOR);
                            const dialogPresent = findInFrames('div[role="dialog"]');
                            attempts++;

                            if ((!stillPresent && !dialogPresent) || attempts > 20) {
                                clearInterval(checkRemoval);
                                console.log(`Copilot Deleter [ACTUAL]: Deletion process finished.`);
                                if (window.copilotDeleter) window.copilotDeleter.setWaitingState(false);

                                // 6. Click the next item if identified
                                if (nextItemToClick) {
                                    console.log(`Copilot Deleter [ACTUAL]: Clicking next conversation...`);
                                    nextItemToClick.click();
                                }
                            }
                        }, 500);
                    }
                } else {
                    console.warn(`Copilot Deleter [ACTUAL]: Title mismatch. Manual confirmation required.`);
                    console.info(`Originals -> Sidebar: "${sidebarTitle}" | Dialog: "${dialogTitle}"`);
                    if (confirmBtn) highlightElement(confirmBtn);
                    alert(`Title mismatch!\nSidebar: "${sidebarTitle}"\nDialog: "${dialogTitle}"\nPlease click 'Delete' manually.`);
                }
            }
        } else if (!isDryRun) {
            console.error("Could not find the 'Delete' menu item.");
        }
    }

    function init() {
        let visibilityRAF;
        const checkVisibility = () => {
            if (isDraggingUI) return;

            if (visibilityRAF) cancelAnimationFrame(visibilityRAF);
            visibilityRAF = requestAnimationFrame(() => {
                const isOutlook = window.location.host.includes('outlook.office.com');
                const hasChatUrl = window.location.href.includes('/host/') || window.location.href.includes('/entity');

                // Check if there's actually an active conversation selected in the sidebar
                const activeChatItem = isOutlook ? findInFrames(ACTIVE_CHAT_ITEM_SELECTOR) : null;

                if (isOutlook && hasChatUrl && activeChatItem) {
                    createFloatingUI();
                } else {
                    const container = document.getElementById(CONTAINER_ID);
                    if (container) container.remove();
                }
            });
        };

        const observer = new MutationObserver(checkVisibility);
        observer.observe(document.body, { childList: true, subtree: true });

        // Add periodic check because iframe transitions might not trigger mutations in the top window
        setInterval(checkVisibility, 2000);

        // Initial check with a delay to allow the PWA to stabilize
        setTimeout(checkVisibility, 2500);
    }

    // Run initialization
    init();

})();
