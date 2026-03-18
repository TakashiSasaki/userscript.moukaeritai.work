// ==UserScript==
// @name         Auto Paste in New Tab
// @namespace    userscript.moukaeritai.work
// @version      0.1.9
// @description  Emulates Shift+F11 and Ctrl+V in Google Docs.
// @author       Takashi Sasaki
// @match        https://docs.google.com/document/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/auto-paste-in-new-tab/auto-paste-in-new-tab.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/auto-paste-in-new-tab/auto-paste-in-new-tab.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Install check logic
    const installCheckHosts = [
        'userscript.moukaeritai.work'
    ];
    const isInstallCheckHost = installCheckHosts.includes(location.hostname);
    if (isInstallCheckHost) {
        const report = () => {
            document.dispatchEvent(new CustomEvent('userscript-check-installed', {
                detail: {
                    name: typeof GM_info !== 'undefined' ? GM_info.script.name : 'Auto Paste in New Tab',
                    version: typeof GM_info !== 'undefined' ? GM_info.script.version : '0.1.9'
                }
            }));
        };
        report();
        document.addEventListener('userscript-ping', report);
        return;
    }

    // Load position and settings
    const savedPos = GM_getValue('panelPosition', { bottom: '24px', right: '24px' });
    let pasteMethod = GM_getValue('pasteMethod', 'menu');

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
    versionSpan.textContent = `v${typeof GM_info !== 'undefined' ? GM_info.script.version : '0.1.9'}`;
    panel.appendChild(versionSpan);

    const methodSelect = document.createElement('select');
    methodSelect.style.cssText = `
        background: #444;
        color: white;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 2px 4px;
        font-size: 11px;
        cursor: pointer;
        outline: none;
    `;
    const optionMenu = document.createElement('option');
    optionMenu.value = 'menu';
    optionMenu.textContent = 'Menu (Edit>Paste)';
    const optionEvent = document.createElement('option');
    optionEvent.value = 'event';
    optionEvent.textContent = 'Event (Ctrl+V)';
    methodSelect.appendChild(optionMenu);
    methodSelect.appendChild(optionEvent);
    methodSelect.value = pasteMethod;

    methodSelect.addEventListener('change', (e) => {
        pasteMethod = e.target.value;
        GM_setValue('pasteMethod', pasteMethod);
    });
    panel.appendChild(methodSelect);

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
        document.dispatchEvent(new CustomEvent('EmulateDocsPaste'));
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
            if (pasteMethod === 'event') {
                // Emulate Ctrl+V
                const ctrlVDown = new KeyboardEvent('keydown', {
                    key: 'v',
                    code: 'KeyV',
                    keyCode: 86,
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true
                });
                const ctrlVUp = new KeyboardEvent('keyup', {
                    key: 'v',
                    code: 'KeyV',
                    keyCode: 86,
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true
                });

                console.log('[Auto Paste in New Tab] Emulating Ctrl+V');
                target.dispatchEvent(ctrlVDown);
                target.dispatchEvent(ctrlVUp);
            } else if (pasteMethod === 'menu') {
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
                            console.log('[Auto Paste in New Tab] Focusing and pressing Enter on Paste menu item');
                            if (typeof pasteItem.focus === 'function') pasteItem.focus();
                            
                            ['keydown', 'keypress', 'keyup'].forEach(type => {
                                pasteItem.dispatchEvent(new KeyboardEvent(type, {
                                    bubbles: true,
                                    cancelable: true,
                                    key: 'Enter',
                                    code: 'Enter',
                                    keyCode: 13,
                                    which: 13
                                }));
                            });
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
            }
        }, 500);
    });

})();