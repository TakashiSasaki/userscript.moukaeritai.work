// ==UserScript==
// @name         Auto Paste in New Tab
// @namespace    userscript.moukaeritai.work
// @version      0.1.16
// @description  Emulates Shift+F11 and Ctrl+V in Google Docs.
// @author       Takashi Sasaki
// @match        https://docs.google.com/document/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/auto-paste-in-new-tab/auto-paste-in-new-tab.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/auto-paste-in-new-tab/auto-paste-in-new-tab.user.js
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


    // Load position
    const savedPos = GM_getValue('panelPosition', { bottom: '24px', right: '24px' });

    // Create UI container
    const panel = document.createElement('div');
    panel.id = 'auto-paste-new-tab-panel';
    panel.style.cssText = `
        position: fixed;
        ${savedPos.top ? `top: ${savedPos.top};` : `bottom: ${savedPos.bottom};`}
        ${savedPos.left ? `left: ${savedPos.left};` : `right: ${savedPos.right};`}
        background-color: #323232;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-family: Roboto, Arial, sans-serif;
        font-size: 13px;
        z-index: 999999;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        transition: opacity 0.3s;
        user-select: none;
        border: 1px solid rgba(255, 255, 255, 0.1);
        opacity: 0.8;
    `;

    // Version Handle (Drag handle)
    const versionSpan = document.createElement('span');
    versionSpan.style.cssText = `
        color: #aaa;
        font-size: 11px;
        cursor: move;
        font-weight: bold;
        padding: 2px 4px;
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
    `;
    versionSpan.textContent = `v${typeof GM_info !== 'undefined' ? GM_info.script.version : '0.1.13'}`;
    panel.appendChild(versionSpan);

    const pasteBtn = document.createElement('button');
    pasteBtn.textContent = 'Paste in new tab';
    pasteBtn.style.cssText = `
        background: #444;
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        padding: 2px 10px;
        font-size: 11px;
        font-weight: bold;
        transition: background 0.2s;
    `;
    pasteBtn.onmouseover = () => pasteBtn.style.background = '#555';
    pasteBtn.onmouseout = () => pasteBtn.style.background = '#444';

    pasteBtn.addEventListener('click', () => {
        checkTargetUserscript('Auto Paste in New Tab').then((installed) => { showTargetScriptStatus('Auto Paste in New Tab', installed); document.dispatchEvent(new CustomEvent('EmulateDocsPaste')); });
    });
    panel.appendChild(pasteBtn);

    document.body.appendChild(panel);

    // Dragging Logic
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    versionSpan.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset.x = e.clientX - panel.offsetLeft;
        offset.y = e.clientY - panel.offsetTop;
        panel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.top = (e.clientY - offset.y) + 'px';
        panel.style.left = (e.clientX - offset.x) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'opacity 0.3s';
            GM_setValue('panelPosition', { top: panel.style.top, left: panel.style.left });
        }
    });

    // Event Listener for Emulator
    document.addEventListener('EmulateDocsPaste', () => {
        const target = document.activeElement || document.body;

        // Emulate Shift+F11
        const shiftF11Down = new KeyboardEvent('keydown', {
            key: 'F11',
            code: 'F11',
            keyCode: 122,
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });
        const shiftF11Up = new KeyboardEvent('keyup', {
            key: 'F11',
            code: 'F11',
            keyCode: 122,
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });

        console.log('[Auto Paste in New Tab] Emulating Shift+F11');
        target.dispatchEvent(shiftF11Down);
        target.dispatchEvent(shiftF11Up);

        // Wait 500ms
        setTimeout(() => {
            const editMenu = document.getElementById('docs-edit-menu');
                if (editMenu) {
                    console.log('[Auto Paste in New Tab] Clicking Edit menu');
                    if (typeof editMenu.focus === 'function') editMenu.focus();
                    ['mousedown', 'mouseup', 'click'].forEach(type => {
                        editMenu.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, buttons: 1 }));
                    });

                    // Wait for the menu to render
                    let pasteItem = null;
                    let checkCount = 0;
                    
                    const findAndClickPaste = () => {
                        const candidates = Array.from(document.querySelectorAll('.goog-menuitem'));
                        console.log(`[Auto Paste in New Tab] Attempt ${checkCount+1}: Found ${candidates.length} '.goog-menuitem' elements on page.`);
                        
                        pasteItem = candidates.find(item => {
                            const text = item.textContent || '';
                            const isMatch = (text.includes('Ctrl+V') || text.includes('Paste') || text.includes('貼り付け')) 
                                && !text.includes('without') && !text.includes('書式なし') && !text.includes('マークダウン');
                            
                            if (text.trim() !== '') {
                                console.log(`[Auto Paste in New Tab] Inspecting item length ${text.length}: "${text.trim().substring(0, 30)}" -> Is Match: ${isMatch}`);
                            }
                            return isMatch;
                        });

                        if (pasteItem) {
                            const rect = pasteItem.getBoundingClientRect();
                            console.log(`[Auto Paste in New Tab] Matched Paste item rect: width=${rect.width}, height=${rect.height}`);
                        }

                        if (pasteItem && pasteItem.getBoundingClientRect().width > 0) {
                            console.log('[Auto Paste in New Tab] Dispatching precise MouseEvents to Paste menu item');
                            
                            // Simulate pointing device with accurate coordinates, which Docs uses to verify intent
                            const rect = pasteItem.getBoundingClientRect();
                            const options = {
                                bubbles: true,
                                cancelable: true,
                                buttons: 1,
                                clientX: rect.left + rect.width / 2,
                                clientY: rect.top + rect.height / 2
                            };
                            
                            pasteItem.dispatchEvent(new MouseEvent('mousedown', options));
                            options.buttons = 0;
                            pasteItem.dispatchEvent(new MouseEvent('mouseup', options));
                            
                        } else if (checkCount < 15) {
                            checkCount++;
                            setTimeout(findAndClickPaste, 250);
                        } else {
                            console.error('[Auto Paste in New Tab] Paste menu item not found or not visible after 15 attempts.');
                        }
                    };
                    
                    setTimeout(findAndClickPaste, 50);
                } else {
                    console.error('[Auto Paste in New Tab] Edit menu not found');
                }
        }, 500);
    });

})();