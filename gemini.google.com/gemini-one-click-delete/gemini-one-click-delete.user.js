// ==UserScript==
// @name         Gemini 1-Click Delete Conversation
// @namespace    https://userscript.moukaeritai.work/
// @version      0.3.30
// @lastModified 2026-04-16
// @description  Adds a 1-click floating button with shortcut to delete the current Gemini conversation.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     geminiOneClickDeleteCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.css
// @resource     geminiOneClickDeleteHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @noframes
// @history       0.3.30 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.3.29 ヘッダー右側のバージョン表示を廃止
// @history       0.3.28 共通ライブラリの更新に伴うUI標準化とツールチップ의完全削除
// @history       0.3.27 UI改善: シングルクリックでの開閉に対応し、タイトルとバージョンの表示形式を [絵文字] [名称] v[バージョン] に統一
// @history       0.3.26 UI共通化: パネルの外枠を gemini-common.html に統合し、ダブルクリックで開閉するように変更
// @history       0.3.25 リソース化リファクタリング: UIテンプレート(HTML)を外部ファイルに分離
// @history       0.3.22 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
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
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiDeletePanel');

        const SELECTORS = {
            actionsMenuButton: 'button[data-test-id="conversation-actions-menu-icon-button"], button[data-test-id="actions-menu-button"], button[aria-label="Open menu for conversation actions."]',
            menuPanel: '.mat-mdc-menu-panel, .mat-bottom-sheet-container',
            deleteMenuItem: 'button[data-test-id="delete-button"]',
            dialogContainer: 'mat-dialog-container',
            confirmButton: 'button[data-test-id="confirm-button"]',
            sidebarItem: 'div[data-test-id="conversation"]',
            chatContainer: 'chat-window',
            messageContent: 'message-content, user-query-content, response-element'
        };

        // --- State Management ---
        let mainObserver = null;
        let keydownListener = null;
        let styleElement = null;
        let isInitialized = false;

        function simulateClick(element) {
            if (!element) return;
            element.dispatchEvent(new MouseEvent('click', {
                view: null,
                bubbles: true,
                cancelable: true
            }));
        }

        function addStyles() {
            // Inject shared common styles
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const commonStyle = document.createElement('style');
                commonStyle.textContent = commonCSS;
                commonStyle.id = 'gemini-common-styles';
                document.head.appendChild(commonStyle);
            }

            if (document.getElementById('gemini-delete-styles')) return null;
            const css = GM_getResourceText('geminiOneClickDeleteCSS');
            const style = GM_addStyle(css);
            if (style) {
                style.id = 'gemini-delete-styles';
                return style;
            } else {
                const el = document.querySelector('style:last-of-type');
                if (el) el.id = 'gemini-delete-styles';
                return el;
            }
        }

        async function handleDelete(triggerBtn) {
            console.log('Starting Delete Flow...');
            simulateClick(triggerBtn);

            let menu;
            try {
                menu = await window.geminiWaitForElement(SELECTORS.menuPanel, document, 5000);
            } catch {
                throw new Error('Menu panel did not appear.');
            }

            try {
                await window.geminiWaitForElement('button', menu, 2000);
            } catch {
                console.warn('Timeout waiting for buttons to populate in menu.');
            }

            let deleteBtn = menu.querySelector(SELECTORS.deleteMenuItem);

            if (!deleteBtn) {
                const buttons = Array.from(menu.querySelectorAll('button[role="menuitem"], button, mat-list-item'));
                deleteBtn = buttons.find(b =>
                    b.textContent.includes('Delete') ||
                    b.querySelector('mat-icon[data-mat-icon-name="delete"]')
                );
            }

            if (!deleteBtn) throw new Error('Delete button not found in menu.');

            simulateClick(deleteBtn);

            let dialog;
            try {
                dialog = await window.geminiWaitForElement(SELECTORS.dialogContainer, document, 5000);
            } catch {
                throw new Error('Confirmation dialog did not appear.');
            }

            try {
                await window.geminiWaitForElement('button', dialog, 2000);
            } catch {
                console.warn('Timeout waiting for buttons to populate in dialog.');
            }

            let confirmBtn = dialog.querySelector(SELECTORS.confirmButton);
            if (!confirmBtn) {
                const dialogBtns = Array.from(dialog.querySelectorAll('button'));
                confirmBtn = dialogBtns.find(b => b.textContent.includes('Delete') || b.classList.contains('mat-primary'));
            }

            if (!confirmBtn) throw new Error('Confirm button not found in dialog.');

            simulateClick(confirmBtn);
            console.log('Delete Confirmed.');
        }

        function findSidebarItem(conversationId) {
            if (!conversationId) return null;
            const items = document.querySelectorAll(SELECTORS.sidebarItem);
            for (const item of items) {
                const jslog = item.getAttribute('jslog') || '';
                if (jslog.includes(conversationId)) return item;
                if (item.innerHTML.includes(conversationId)) return item;
            }
            return null;
        }

        function updatePanelState() {
            const panel = document.getElementById('gemini-delete-panel');
            if (!panel) return;

            const delBtn = panel.querySelector('#gdp-global-delete-btn');
            if (!delBtn) return;

            const headerTriggers = Array.from(document.querySelectorAll(SELECTORS.actionsMenuButton))
                .filter(t => !t.closest('bard-sidenav') && !t.closest('side-navigation-content'));

            if (headerTriggers.length > 0) {
                delBtn.disabled = false;
                delBtn.title = '1-Click Delete Current Chat';
                delBtn._targetTrigger = headerTriggers[0];
                return;
            }

            const match = location.pathname.match(/\/(app|gem)\/([a-f0-9]{16})/);
            const conversationId = match ? match[2] : null;

            if (conversationId) {
                const sidebarItem = findSidebarItem(conversationId);
                if (sidebarItem) {
                    const trigger = sidebarItem.querySelector(SELECTORS.actionsMenuButton);
                    if (trigger) {
                        delBtn.disabled = false;
                        delBtn.title = '1-Click Delete (via Sidebar)';
                        delBtn._targetTrigger = trigger;
                        return;
                    }
                }
            }

            delBtn.disabled = true;
            delBtn.title = 'No active conversation found or menu missing';
            delBtn._targetTrigger = null;
        }

        function createDraggablePanel() {
            if (document.getElementById('gemini-delete-panel')) return;

            addStyles();

            const templateHTML = GM_getResourceText('geminiOneClickDeleteHTML');
            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            if (!templateHTML || !commonHTMLStr) {
                console.error('[Gemini 1-Click Delete] Resource not found');
                return;
            }


            // Create inner content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.className = 'gdp-content';
            window.geminiSetInnerHTML(contentDiv, templateHTML, policy);

            // Assemble panel shell
            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panelShell.id = 'gemini-delete-panel';
            document.body.appendChild(panelShell);

            const delBtn = panelShell.querySelector('#gdp-global-delete-btn');
            if (delBtn) {
                delBtn.addEventListener('click', async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (delBtn.disabled || delBtn.classList.contains('processing')) return;
                    if (delBtn._targetTrigger) {
                        delBtn.classList.add('processing');
                        try {
                            await handleDelete(delBtn._targetTrigger);
                        } catch (err) {
                            console.error('Delete failed:', err);
                            alert('Failed to delete conversation.');
                        } finally {
                            delBtn.classList.remove('processing');
                        }
                    }
                });
            }

            const dragHandle = panelShell.querySelector('.gus-panel-header');
            const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
            if (inactiveHandle) {
                window.geminiSetupDraggablePanel(panelShell, inactiveHandle, 'gemini_1click_delete_panel_pos', { right: '20px', bottom: '120px' });
            }
            if (dragHandle) {
                window.geminiSetupDraggablePanel(panelShell, dragHandle, 'gemini_1click_delete_panel_pos', { right: '20px', bottom: '120px' });
            }

            window.geminiSetupMinimizablePanel(panelShell, 'gemini_1click_delete_minimized', dragHandle, false);

            updatePanelState();
        }

        function processNodes() {
            const chatWindow = document.querySelector(SELECTORS.chatContainer);
            if (chatWindow) {
                createDraggablePanel();
                updatePanelState();
            }
        }

        async function handleKeyboardShortcut(e) {
            const isCtrlShiftBackspace = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace';
            if (!isCtrlShiftBackspace) return;

            const activeTag = document.activeElement.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
                return;
            }

            e.preventDefault();
            console.log('Shortcut detected: Triggering 1-Click Delete...');

            const panelBtn = document.querySelector('#gdp-global-delete-btn');
            if (panelBtn && !panelBtn.disabled) {
                panelBtn.click();
                return;
            }

            console.warn('Delete button not available or disabled.');
        }

        async function handleExternalDeleteRequest(_e) {
            console.log('[Gemini 1-Click Delete] Received external delete request.');
            await window.geminiSleep(1000);
            updatePanelState();

            const panelBtn = document.querySelector('#gdp-global-delete-btn');
            if (panelBtn && !panelBtn.disabled) {
                console.log('[Gemini 1-Click Delete] Triggering delete via panel button.');
                panelBtn.click();
            } else {
                console.warn('[Gemini 1-Click Delete] External request ignored: no active conversation or menu missing.');
            }
        }

        function initMainFunctionality() {
            if (isInitialized) return;
            console.log('[Gemini 1-Click Delete] Initializing...');

            styleElement = addStyles();
            processNodes();

            mainObserver = new MutationObserver(processNodes);
            mainObserver.observe(document.body, { childList: true, subtree: true });

            keydownListener = handleKeyboardShortcut;
            document.addEventListener('keydown', keydownListener);

            window.addEventListener('gemini-one-click-delete:request-delete', handleExternalDeleteRequest);

            isInitialized = true;
        }

        function cleanup() {
            if (!isInitialized) return;
            console.log('[Gemini 1-Click Delete] Cleaning up...');

            if (mainObserver) {
                mainObserver.disconnect();
                mainObserver = null;
            }
            if (keydownListener) {
                document.removeEventListener('keydown', keydownListener);
                keydownListener = null;
            }

            window.removeEventListener('gemini-one-click-delete:request-delete', handleExternalDeleteRequest);

            if (styleElement) {
                styleElement.remove();
                styleElement = null;
            }

            const panel = document.getElementById('gemini-delete-panel');
            if (panel) panel.remove();

            isInitialized = false;
        }

        function checkUrlAndManageScriptState() {
            const isChatPage = /^\/(app|gem)\//.test(location.pathname);
            if (isChatPage) {
                initMainFunctionality();
            } else {
                cleanup();
            }
        }

        let lastUrl = window.location.href;

        if (window.navigation) {
            window.navigation.addEventListener('navigatesuccess', () => {
                setTimeout(() => {
                    lastUrl = window.location.href;
                    checkUrlAndManageScriptState();
                }, 500);
            });
            console.log('[Gemini 1-Click Delete] Using Navigation API for SPA routing.');
        } else {
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    setTimeout(checkUrlAndManageScriptState, 500);
                }
            }, 500);
            console.log('[Gemini 1-Click Delete] Using setInterval fallback for SPA routing.');
        }

        if (document.body) {
            checkUrlAndManageScriptState();
        } else {
            window.addEventListener('DOMContentLoaded', checkUrlAndManageScriptState);
        }
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
