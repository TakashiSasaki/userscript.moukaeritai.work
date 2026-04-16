// ==UserScript==
// @name         Gemini Prompt Injector
// @namespace    userscript.moukaeritai.work
// @version      0.2.23
// @description  Injects a prompt into Gemini via an external custom event.
// @lastModified 2026-04-16
// @author       Takashi Sasaki
// @match        https://userscript.moukaeritai.work/*
// @match        https://gemini.google.com/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     geminiPromptInjectorCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.css
// @resource     geminiPromptInjectorHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.html
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// @noframes
// @history       0.2.23 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.2.22 クリーンアップ: 不要になった古いUI用のCSSセレクタを削除し、共通テンプレートへの適合を強化
// @history       0.2.21 位置管理を geminiSetupDraggablePanel に完全委譲し、重複する手動位置ロジックを削除
// @history       0.2.19 UI構築ロジックを外部HTMLテンプレート (@resource) に移行し、コードの保守性を向上
// @history       0.2.18 UIパネルの最小化・復元をバージョン表示部分のダブルクリックで行うように変更（専用ボタンを削除）
// @history       0.2.17 外部CSS/JSファイルへの分離とコードの整理、リソースファイルの改名、デザインの大幅刷新。
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

            const policy = window.geminiCreateTrustedHTMLPolicy('gemini-prompt-injector-policy');

            // Inject shared common styles
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const commonStyle = document.createElement('style');
                commonStyle.textContent = commonCSS;
                commonStyle.id = 'gemini-common-styles';
                document.head.appendChild(commonStyle);
            }

            // Inject custom styles
            const customCSS = GM_getResourceText('geminiPromptInjectorCSS');
            if (customCSS && !document.getElementById('gemini-prompt-injector-styles')) {
                const style = GM_addStyle(customCSS);
                if (style) style.id = 'gemini-prompt-injector-styles';
            }


            // Main logic for gemini.google.com
            document.addEventListener('gemini-inject-prompt', (event) => {
                const promptText = event.detail?.prompt;
                if (!promptText) {
                    console.warn('[gemini-prompt-injector] No prompt text provided in the event detail.');
                    return;
                }

                const editor = document.querySelector('div.ql-editor[role="textbox"]');
                if (editor) {
                    // Set the prompt text by inserting it into a paragraph
                    // Escape HTML just in case
                    const escapedText = promptText.replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                    window.geminiSetInnerHTML(editor, `<p>${escapedText}</p>`, policy);

                    // Dispatch input event to notify the application
                    editor.dispatchEvent(new Event('input', { bubbles: true }));

                    // Wait a short delay before clicking send button to allow UI state to update
                    setTimeout(() => {
                        const sendButton = document.querySelector('button.send-button');
                        if (sendButton && !sendButton.disabled) {
                            sendButton.click();
                        } else {
                            console.warn('[gemini-prompt-injector] Send button not found or disabled.');
                        }
                    }, 100);
                } else {
                    console.warn('[gemini-prompt-injector] Prompt editor not found.');
                }
            });

            // Model switching logic
            document.addEventListener('gemini-switch-model', (event) => {
                const targetModel = event.detail?.model;
                if (!targetModel) {
                    console.warn('[gemini-prompt-injector] No model provided in the event detail.');
                    return;
                }

                const menuButton = document.querySelector('button.input-area-switch');
                if (!menuButton) {
                    console.warn('[gemini-prompt-injector] Model selector button not found.');
                    return;
                }

                // Open the menu
                menuButton.click();

                // Wait a short amount of time for the menu to render
                setTimeout(() => {
                    const menuItems = Array.from(document.querySelectorAll('button.bard-mode-list-button'));
                    let targetText = '';

                    switch (targetModel.toLowerCase()) {
                        case 'flash':
                        case '高速':
                        case '高速モード':
                            targetText = '高速';
                            break;
                        case 'thinking':
                        case '思考':
                        case '思考モード':
                            targetText = '思考';
                            break;
                        case 'pro':
                            targetText = 'Pro';
                            break;
                        default:
                            console.warn(`[gemini-prompt-injector] Unknown model requested: ${targetModel}`);
                            return;
                    }

                    const targetItem = menuItems.find(el => el.textContent.includes(targetText));
                    if (targetItem) {
                        targetItem.click();
                    } else {
                        console.warn(`[gemini-prompt-injector] Could not find menu item for model: ${targetModel}`);
                    }
                }, 150);
            });

            // Canvas enabling logic
            document.addEventListener('gemini-enable-canvas', () => {
                // Check if Canvas is already enabled (active deselect button present)
                const activeCanvasButtons = Array.from(document.querySelectorAll('button.toolbox-drawer-item-deselect-button'));
                const isCanvasActive = activeCanvasButtons.some(el => el.textContent.includes('Canvas') || el.getAttribute('aria-label')?.includes('Canvas'));
                if (isCanvasActive) {
                    console.log('[gemini-prompt-injector] Canvas is already enabled.');
                    return;
                }

                const toolsButton = document.querySelector('button.toolbox-drawer-button');
                if (!toolsButton) {
                    console.warn('[gemini-prompt-injector] Tools menu button not found.');
                    return;
                }

                // Open the tools menu
                toolsButton.click();

                // Wait for the menu to render
                setTimeout(() => {
                    const menuItems = Array.from(document.querySelectorAll('button.toolbox-drawer-item-list-button'));
                    const targetItem = menuItems.find(el => el.textContent.includes('Canvas'));
                    if (targetItem) {
                        targetItem.click();
                    } else {
                        console.warn('[gemini-prompt-injector] Could not find Canvas menu item.');
                    }
                }, 150);
            });

            // Send prompt logic
            document.addEventListener('gemini-send-prompt', () => {
                const sendButton = document.querySelector('button.send-button');
                if (sendButton) {
                    sendButton.click();
                } else {
                    console.warn('[gemini-prompt-injector] Send button not found. The prompt might be empty.');
                }
            });

            // Test UI implementation
            function initTestUI() {
                if (document.getElementById('gpi-test-ui')) return;

                const templateHTML = GM_getResourceText('geminiPromptInjectorHTML');
                const commonHTMLStr = GM_getResourceText('gusCommonHTML');
                if (!templateHTML || !commonHTMLStr) return;

                const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '';

                // Create inner content wrapper
                const contentDiv = document.createElement('div');
                contentDiv.className = 'gpi-content';
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

                panelShell.id = 'gpi-test-ui';
                document.body.appendChild(panelShell);

                // Setup unified UI behaviors
                const dragHandle = panelShell.querySelector('.gus-panel-header');
                const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
                if (inactiveHandle) {
                    window.geminiSetupDraggablePanel(panelShell, inactiveHandle, 'gpi_ui_pos', { right: '20px', bottom: '180px' });
                }
                if (dragHandle) {
                    window.geminiSetupDraggablePanel(panelShell, dragHandle, 'gpi_ui_pos', { right: '20px', bottom: '180px' });
                }

                window.geminiSetupMinimizablePanel(panelShell, 'gpi_ui_minimized', dragHandle, false);

                const uiContainer = panelShell;

                // Event Listeners
                const textarea = uiContainer.querySelector('#gpi-textarea');
                const injectBtn = uiContainer.querySelector('#gpi-btn-inject');
                const sendBtn = uiContainer.querySelector('#gpi-btn-send');
                const selectModel = uiContainer.querySelector('#gpi-select-model');
                const switchBtn = uiContainer.querySelector('#gpi-btn-switch');
                const canvasBtn = uiContainer.querySelector('#gpi-btn-canvas');

                if (injectBtn && textarea) {
                    injectBtn.onclick = () => {
                        if (textarea.value) {
                            window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => {
                                window.geminiShowTargetScriptStatus('gpi-status-container', 'Gemini Prompt Injector', installed);
                                document.dispatchEvent(new CustomEvent('gemini-inject-prompt', { detail: { prompt: textarea.value } }));
                            });
                        }
                    };
                }

                if (sendBtn) {
                    sendBtn.onclick = () => {
                        window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => {
                            window.geminiShowTargetScriptStatus('gpi-status-container', 'Gemini Prompt Injector', installed);
                            document.dispatchEvent(new CustomEvent('gemini-send-prompt'));
                        });
                    };
                }

                if (switchBtn && selectModel) {
                    switchBtn.onclick = () => {
                        window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => {
                            window.geminiShowTargetScriptStatus('gpi-status-container', 'Gemini Prompt Injector', installed);
                            document.dispatchEvent(new CustomEvent('gemini-switch-model', { detail: { model: selectModel.value } }));
                        });
                    };
                }

                if (canvasBtn) {
                    canvasBtn.onclick = () => {
                        window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => {
                            window.geminiShowTargetScriptStatus('gpi-status-container', 'Gemini Prompt Injector', installed);
                            document.dispatchEvent(new CustomEvent('gemini-enable-canvas'));
                        });
                    };
                }

            }

            function init() {
                if (/^\/(app|gem)\//.test(location.pathname)) {
                    initTestUI();
                }
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }

    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
