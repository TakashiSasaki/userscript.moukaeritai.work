// ==UserScript==
// @name         gemini-prompt-injector
// @namespace    userscript.moukaeritai.work
// @version      0.2.0
// @description  Injects a prompt into Gemini via an external custom event.
// @author       Takashi Sasaki
// @match        https://userscript.moukaeritai.work/*
// @match        https://gemini.google.com/*
// @grant        GM_info
// @homepageURL  https://x.com/TakashiSasaki
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js
// ==/UserScript==

(function() {
    'use strict';

    const installCheckHosts = [
        'userscript.moukaeritai.work'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname);

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
        return;
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
            editor.innerHTML = `<p>${escapedText}</p>`;
            
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

        const menuButton = document.querySelector('button[aria-label="モード選択ツールを開く"]') || document.querySelector('button.input-area-switch');
        if (!menuButton) {
            console.warn('[gemini-prompt-injector] Model selector button not found.');
            return;
        }

        // Open the menu
        menuButton.click();

        // Wait a short amount of time for the menu to render
        setTimeout(() => {
            const menuItems = Array.from(document.querySelectorAll('button[role="menuitem"]'));
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

})();
