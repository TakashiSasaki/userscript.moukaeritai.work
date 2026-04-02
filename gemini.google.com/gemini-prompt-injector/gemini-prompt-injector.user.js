// ==UserScript==
// @name         Gemini Prompt Injector
// @namespace    userscript.moukaeritai.work
// @version      0.2.8
// @description  Injects a prompt into Gemini via an external custom event.
// @lastModified 2026-04-02
// @author       Takashi Sasaki
// @match        https://userscript.moukaeritai.work/*
// @match        https://gemini.google.com/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     customCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/style.css
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// @noframes
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
            const customCSS = GM_getResourceText('customCSS');
            if (customCSS && !document.getElementById('gemini-prompt-injector-styles')) {
                const style = GM_addStyle(customCSS);
                if (style) style.id = 'gemini-prompt-injector-styles';
            }





            // UI Helper for displaying status
            function showTargetScriptStatus(targetName, statusDetail) {
                const uiId = 'userscript-target-status-ui';
                let ui = document.getElementById(uiId);

                if (!ui) {
                    ui = document.createElement('div');
                    ui.id = uiId;
                    ui.className = 'gus-panel';

                    // Restore position
                    let posStr = '{"bottom": "20px", "right": "20px"}';
                    try {
                        if (typeof GM_getValue !== 'undefined') {
                            posStr = GM_getValue('userscript-status-ui-pos', posStr);
                        }
                    } catch { /* ignore */ }

                    let pos = JSON.parse(posStr);
                    if (pos.top) ui.style.top = pos.top;
                    if (pos.bottom && !pos.top) ui.style.bottom = pos.bottom;
                    if (pos.left) ui.style.left = pos.left;
                    if (pos.right && !pos.left) ui.style.right = pos.right;

                    // Make draggable
                    window.geminiSetupDraggablePanel(ui, ui, 'userscript-status-ui-pos', { right: '20px', top: '100px' });

                    document.body.appendChild(ui);
                }

                const statusText = statusDetail
                    ? `✅ ${targetName} (v${statusDetail.version})`
                    : `❌ ${targetName} Not Found`;

                ui.textContent = '';
                const titleDiv = document.createElement('div');
                titleDiv.className = 'target-status-title';
                titleDiv.textContent = 'Script Status:';
                ui.appendChild(titleDiv);
                const statusDiv = document.createElement('div');
                statusDiv.className = 'target-status-text';
                statusDiv.textContent = statusText;
                ui.appendChild(statusDiv);

                // Auto hide after 5 seconds if successful, keep if failed
                if (statusDetail) {
                    setTimeout(() => {
                        if (ui && ui.parentNode) ui.parentNode.removeChild(ui);
                    }, 5000);
                }
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

                // Retrieve saved state or default (must be before any use of isGpiUIMinimized)
                // Prefer 'let' with specific names to to avoid TDZ issues in Tampermonkey's sandboxed Promise wrapping
                let isGpiUIMinimized = GM_getValue('gpi_ui_minimized', false);
                let gpiSavedX = GM_getValue('gpi_ui_x', window.innerWidth - 320);
                let gpiSavedY = GM_getValue('gpi_ui_y', window.innerHeight - 320);

                const uiContainer = document.createElement('div');
                uiContainer.id = 'gpi-test-ui';
                uiContainer.className = 'gus-panel';
                if (isGpiUIMinimized) uiContainer.classList.add('minimized');

                // Adjust position to ensure it stays within the window
                const uiWidth = isGpiUIMinimized ? 50 : 300;
                const uiHeight = isGpiUIMinimized ? 30 : 250;
                if (gpiSavedX < 0) gpiSavedX = 0;
                if (gpiSavedY < 0) gpiSavedY = 0;
                if (gpiSavedX + uiWidth > window.innerWidth) gpiSavedX = window.innerWidth - uiWidth;
                if (gpiSavedY + uiHeight > window.innerHeight) gpiSavedY = window.innerHeight - uiHeight;

                uiContainer.style.left = `${gpiSavedX}px`;
                uiContainer.style.top = `${gpiSavedY}px`;

                const header = document.createElement('div');
                header.className = 'gpi-header';

                const title = document.createElement('span');
                title.className = 'gus-version';
                const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '';
                title.textContent = scriptVersion ? `💉 ${scriptVersion} ${gusEmoji}` : 'Prompt Injector';
                title.title = 'Gemini Prompt Injector';

                const minBtn = document.createElement('button');
                minBtn.className = 'gpi-min-btn';
                window.geminiSetInnerHTML(minBtn, isGpiUIMinimized
                    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h16v6H4v-6z" opacity="0.5"/><path d="M4 4h16v6H4V4z"/></svg>'
                    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>', policy);
                minBtn.title = isGpiUIMinimized ? '復元' : '最小化';

                header.appendChild(title);
                header.appendChild(minBtn);
                uiContainer.appendChild(header);

                const content = document.createElement('div');
                content.className = 'gpi-content';
                content.style.display = isGpiUIMinimized ? 'none' : 'block';

                // Inject Prompt Group
                const group1 = document.createElement('div');
                group1.className = 'gpi-group';
                const textarea = document.createElement('textarea');
                textarea.className = 'gpi-textarea';
                textarea.placeholder = 'Test prompt...';
                const injectBtn = document.createElement('button');
                injectBtn.className = 'gpi-button';
                injectBtn.textContent = 'Inject & Send';
                injectBtn.onclick = () => {
                    if (textarea.value) {
                        window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-inject-prompt', { detail: { prompt: textarea.value } })); });
                    }
                };
                group1.appendChild(textarea);
                group1.appendChild(injectBtn);

                // Send Prompt Group
                const group2 = document.createElement('div');
                group2.className = 'gpi-group';
                const sendBtn = document.createElement('button');
                sendBtn.className = 'gpi-button';
                sendBtn.textContent = 'Send Current';
                sendBtn.onclick = () => {
                    window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-send-prompt')); });
                };
                group2.appendChild(sendBtn);

                // Switch Model Group
                const group3 = document.createElement('div');
                group3.className = 'gpi-row';
                const selectModel = document.createElement('select');
                selectModel.className = 'gpi-select';
                ['flash', 'thinking', 'pro'].forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    selectModel.appendChild(opt);
                });
                const switchBtn = document.createElement('button');
                switchBtn.className = 'gpi-button';
                switchBtn.style.width = 'auto';
                switchBtn.textContent = 'Switch';
                switchBtn.onclick = () => {
                    window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-switch-model', { detail: { model: selectModel.value } })); });
                };
                group3.appendChild(selectModel);
                group3.appendChild(switchBtn);

                // Enable Canvas Group
                const group4 = document.createElement('div');
                group4.className = 'gpi-group';
                const canvasBtn = document.createElement('button');
                canvasBtn.className = 'gpi-button';
                canvasBtn.textContent = 'Enable Canvas';
                canvasBtn.onclick = () => {
                    window.geminiCheckTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-enable-canvas')); });
                };
                group4.appendChild(canvasBtn);

                content.appendChild(group1);
                content.appendChild(group2);
                content.appendChild(group3);
                content.appendChild(group4);
                uiContainer.appendChild(content);

                document.body.appendChild(uiContainer);

                // Drag functionality
                window.geminiSetupDraggablePanel(uiContainer, title, 'gpi_ui_pos', { right: '20px', bottom: '180px' });

                // Minimize functionality
                minBtn.onclick = () => {
                    isGpiUIMinimized = !isGpiUIMinimized;
                    content.style.display = isGpiUIMinimized ? 'none' : 'block';
                    if (isGpiUIMinimized) uiContainer.classList.add('minimized');
                    else uiContainer.classList.remove('minimized');

                    window.geminiSetInnerHTML(minBtn, isGpiUIMinimized
                        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h16v6H4v-6z" opacity="0.5"/><path d="M4 4h16v6H4V4z"/></svg>'
                        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>', policy);
                    minBtn.title = isGpiUIMinimized ? '復元' : '最小化';
                    GM_setValue('gpi_ui_minimized', isGpiUIMinimized);

                    // Re-adjust position after resize
                    let currentX = uiContainer.offsetLeft;
                    let currentY = uiContainer.offsetTop;
                    const width = uiContainer.offsetWidth;
                    const height = uiContainer.offsetHeight;

                    if (currentX + width > window.innerWidth) {
                        uiContainer.style.left = `${window.innerWidth - width}px`;
                        GM_setValue('gpi_ui_x', window.innerWidth - width);
                    }
                    if (currentY + height > window.innerHeight) {
                        uiContainer.style.top = `${window.innerHeight - height}px`;
                        GM_setValue('gpi_ui_y', window.innerHeight - height);
                    }
                };

                // Re-adjust position on window resize
                window.addEventListener('resize', () => {
                    let currentX = uiContainer.offsetLeft;
                    let currentY = uiContainer.offsetTop;
                    const width = uiContainer.offsetWidth;
                    const height = uiContainer.offsetHeight;

                    let adjusted = false;
                    if (currentX + width > window.innerWidth) {
                        currentX = window.innerWidth - width;
                        adjusted = true;
                    }
                    if (currentY + height > window.innerHeight) {
                        currentY = window.innerHeight - height;
                        adjusted = true;
                    }
                    if (currentX < 0) { currentX = 0; adjusted = true; }
                    if (currentY < 0) { currentY = 0; adjusted = true; }

                    if (adjusted) {
                        uiContainer.style.left = `${currentX}px`;
                        uiContainer.style.top = `${currentY}px`;
                        GM_setValue('gpi_ui_x', currentX);
                        GM_setValue('gpi_ui_y', currentY);
                    }
                });
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
