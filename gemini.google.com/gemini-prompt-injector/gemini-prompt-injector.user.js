// ==UserScript==
// @name         Gemini Prompt Injector
// @namespace    userscript.moukaeritai.work
// @version      0.4.8
// @description  Injects a prompt into Gemini via an external custom event.
// @author       Takashi Sasaki
// @match        https://userscript.moukaeritai.work/*
// @match        https://gemini.google.com/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// ==/UserScript==

(function () {
    'use strict';

    const getTrustedHTML = (html) => {
        if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
            if (!window.geminiPromptInjectorPolicy) {
                try {
                    window.geminiPromptInjectorPolicy = trustedTypes.createPolicy('gemini-prompt-injector-policy', {
                        createHTML: (string) => string
                    });
                } catch (e) {
                    console.warn('[gemini-prompt-injector] TrustedTypes policy creation error:', e);
                    return html;
                }
            }
            return window.geminiPromptInjectorPolicy.createHTML(html);
        }
        return html;
    };

    const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    // Custom Event Helper for checking if target userscript is installed
    function checkTargetUserscript(targetName, timeout = 2000) {
        return new Promise((resolve) => {
            const handler = (e) => {
                if (e.detail && e.detail.name === targetName) {
                    clearTimeout(timeoutId);
                    document.removeEventListener('userscript-check-installed', handler);
                    resolve(e.detail);
                }
            };
            const timeoutId = setTimeout(() => {
                document.removeEventListener('userscript-check-installed', handler);
                resolve(null); // Not found or timed out
            }, timeout);
            document.addEventListener('userscript-check-installed', handler);
            document.dispatchEvent(new CustomEvent('userscript-ping'));
        });
    }

    // UI Helper for displaying status
    function showTargetScriptStatus(targetName, statusDetail) {
        const uiId = 'userscript-target-status-ui';
        let ui = document.getElementById(uiId);

        if (!ui) {
            ui = document.createElement('div');
            ui.id = uiId;
            ui.style.position = 'fixed';
            ui.style.zIndex = '999999';
            ui.style.padding = '8px 12px';
            ui.style.backgroundColor = 'rgba(28, 28, 30, 0.9)';
            ui.style.color = 'white';
            ui.style.borderRadius = '8px';
            ui.style.fontFamily = 'sans-serif';
            ui.style.fontSize = '12px';
            ui.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
            ui.style.cursor = 'move';
            ui.style.userSelect = 'none';

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
            let isDragging = false, startX, startY, startLeft, startTop;
            ui.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = ui.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                ui.style.right = 'auto'; // Disable right anchoring
                ui.style.bottom = 'auto'; // Disable bottom anchoring
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                ui.style.left = (startLeft + dx) + 'px';
                ui.style.top = (startTop + dy) + 'px';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    try {
                        if (typeof GM_setValue !== 'undefined') {
                            GM_setValue('userscript-status-ui-pos', JSON.stringify({
                                top: ui.style.top,
                                left: ui.style.left
                            }));
                        }
                    } catch { /* ignore */ }
                }
            });

            document.body.appendChild(ui);
        }

        const statusText = statusDetail
            ? `✅ ${targetName} (v${statusDetail.version})`
            : `❌ ${targetName} Not Found`;

        ui.textContent = '';
        const titleDiv = document.createElement('div');
        titleDiv.style.fontWeight = 'bold';
        titleDiv.textContent = 'Script Status:';
        ui.appendChild(titleDiv);
        const statusDiv = document.createElement('div');
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
            editor.innerHTML = getTrustedHTML(`<p>${escapedText}</p>`);

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

        const uiContainer = document.createElement('div');
        uiContainer.id = 'gpi-test-ui';
        uiContainer.style.position = 'fixed';
        uiContainer.style.zIndex = '999999';
        uiContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        uiContainer.style.border = '1px solid #ccc';
        uiContainer.style.borderRadius = '8px';
        uiContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        uiContainer.style.fontFamily = 'sans-serif';
        uiContainer.style.fontSize = '12px';
        uiContainer.style.color = '#333';
        uiContainer.style.userSelect = 'none';

        // Retrieve saved state or default
        let isMinimized = GM_getValue('gpi_ui_minimized', false);
        let savedX = GM_getValue('gpi_ui_x', window.innerWidth - 320);
        let savedY = GM_getValue('gpi_ui_y', window.innerHeight - 320);

        // Adjust position to ensure it stays within the window
        const uiWidth = isMinimized ? 50 : 300;
        const uiHeight = isMinimized ? 30 : 250;
        if (savedX < 0) savedX = 0;
        if (savedY < 0) savedY = 0;
        if (savedX + uiWidth > window.innerWidth) savedX = window.innerWidth - uiWidth;
        if (savedY + uiHeight > window.innerHeight) savedY = window.innerHeight - uiHeight;

        uiContainer.style.left = `${savedX}px`;
        uiContainer.style.top = `${savedY}px`;

        const header = document.createElement('div');
        header.style.padding = '8px';
        header.style.cursor = 'move';
        header.style.backgroundColor = '#f0f0f0';
        header.style.borderTopLeftRadius = '8px';
        header.style.borderTopRightRadius = '8px';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const title = document.createElement('span');
        const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '';
        title.textContent = scriptVersion ? `Prompt Injector (v${scriptVersion})` : 'Prompt Injector';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '12px';

        const minBtn = document.createElement('button');
        minBtn.innerHTML = getTrustedHTML(isMinimized
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h16v6H4v-6z" opacity="0.5"/><path d="M4 4h16v6H4V4z"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>');
        minBtn.style.cursor = 'pointer';
        minBtn.style.border = 'none';
        minBtn.style.background = 'transparent';
        minBtn.style.padding = '2px';
        minBtn.style.display = 'flex';
        minBtn.style.alignItems = 'center';
        minBtn.style.justifyContent = 'center';
        minBtn.title = isMinimized ? '復元' : '最小化';

        header.appendChild(title);
        header.appendChild(minBtn);
        uiContainer.appendChild(header);

        const content = document.createElement('div');
        content.style.padding = '8px';
        content.style.display = isMinimized ? 'none' : 'block';

        // Inject Prompt Group
        const group1 = document.createElement('div');
        group1.style.marginBottom = '8px';
        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '40px';
        textarea.style.marginBottom = '4px';
        textarea.style.boxSizing = 'border-box';
        textarea.placeholder = 'Test prompt...';
        const injectBtn = document.createElement('button');
        injectBtn.textContent = 'Inject & Send';
        injectBtn.style.width = '100%';
        injectBtn.style.cursor = 'pointer';
        injectBtn.onclick = () => {
            if (textarea.value) {
                checkTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-inject-prompt', { detail: { prompt: textarea.value } })); });
            }
        };
        group1.appendChild(textarea);
        group1.appendChild(injectBtn);

        // Send Prompt Group
        const group2 = document.createElement('div');
        group2.style.marginBottom = '8px';
        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send Current';
        sendBtn.style.width = '100%';
        sendBtn.style.cursor = 'pointer';
        sendBtn.onclick = () => {
            checkTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-send-prompt')); });
        };
        group2.appendChild(sendBtn);

        // Switch Model Group
        const group3 = document.createElement('div');
        group3.style.marginBottom = '8px';
        group3.style.display = 'flex';
        group3.style.gap = '4px';
        const selectModel = document.createElement('select');
        selectModel.style.flex = '1';
        ['flash', 'thinking', 'pro'].forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            selectModel.appendChild(opt);
        });
        const switchBtn = document.createElement('button');
        switchBtn.textContent = 'Switch';
        switchBtn.style.cursor = 'pointer';
        switchBtn.onclick = () => {
            checkTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-switch-model', { detail: { model: selectModel.value } })); });
        };
        group3.appendChild(selectModel);
        group3.appendChild(switchBtn);

        // Enable Canvas Group
        const group4 = document.createElement('div');
        const canvasBtn = document.createElement('button');
        canvasBtn.textContent = 'Enable Canvas';
        canvasBtn.style.width = '100%';
        canvasBtn.style.cursor = 'pointer';
        canvasBtn.onclick = () => {
            checkTargetUserscript('Gemini Prompt Injector').then((installed) => { showTargetScriptStatus('Gemini Prompt Injector', installed); document.dispatchEvent(new CustomEvent('gemini-enable-canvas')); });
        };
        group4.appendChild(canvasBtn);

        content.appendChild(group1);
        content.appendChild(group2);
        content.appendChild(group3);
        content.appendChild(group4);
        uiContainer.appendChild(content);

        document.body.appendChild(uiContainer);

        // Drag functionality
        let isDragging = false;
        let startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target === minBtn) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = uiContainer.offsetLeft;
            initialY = uiContainer.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            let newX = initialX + (e.clientX - startX);
            let newY = initialY + (e.clientY - startY);

            // Keep within bounds
            const width = uiContainer.offsetWidth;
            const height = uiContainer.offsetHeight;
            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + width > window.innerWidth) newX = window.innerWidth - width;
            if (newY + height > window.innerHeight) newY = window.innerHeight - height;

            uiContainer.style.left = `${newX}px`;
            uiContainer.style.top = `${newY}px`;
        }

        function onMouseUp() {
            if (isDragging) {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                GM_setValue('gpi_ui_x', uiContainer.offsetLeft);
                GM_setValue('gpi_ui_y', uiContainer.offsetTop);
            }
        }

        // Minimize functionality
        minBtn.onclick = () => {
            isMinimized = !isMinimized;
            content.style.display = isMinimized ? 'none' : 'block';
            minBtn.innerHTML = getTrustedHTML(isMinimized
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h16v6H4v-6z" opacity="0.5"/><path d="M4 4h16v6H4V4z"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>');
            minBtn.title = isMinimized ? '復元' : '最小化';
            GM_setValue('gpi_ui_minimized', isMinimized);

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTestUI);
    } else {
        initTestUI();
    }

})();
