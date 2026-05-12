// ==UserScript==
// @name         ChatGPT Auto Prompt Sender
// @namespace    userscript.moukaeritai.work
// @version      1.0.5
// @description  Automates sending of next pre-filled prompt in ChatGPT after current response completion.
// @author       Takashi SASAKI (https://x.com/TakashiSasaki)
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-sender/chatgpt-auto-sender.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-sender/chatgpt-auto-sender.user.js
// @grant        GM_info
// @license      MIT
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function() {
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

    // Updated Selectors (April 2026)
    const SEND_BUTTON_SELECTOR = '[data-testid="send-button"]';
    const PROMPT_TEXTAREA_SELECTOR = 'textarea, [data-testid="content-editor-container"] [contenteditable="true"]';

    setTimeout(function() {
        const main = document.querySelector("main");

        if (!main) {
            console.warn("ChatGPT Auto Prompt Sender: Main container not found.");
            return;
        }

        const observer = new MutationObserver((mutationList, _observer)=>{
            for(let _mutation of mutationList){
                const sendBtn = document.querySelector(SEND_BUTTON_SELECTOR);
                if (sendBtn) {
                    // Visual feedback: help identify when the script is active
                    if (sendBtn.style.background !== "yellow" && !sendBtn.disabled) {
                         sendBtn.style.background = "yellow";
                         sendBtn.addEventListener("click", _clickEvent => {
                             const textarea = document.querySelector(PROMPT_TEXTAREA_SELECTOR);
                             if (textarea) {
                                 if (textarea.dataset.autoSendEnabled === "true") {
                                     textarea.dataset.autoSendEnabled = "false";
                                     textarea.style.border = "";
                                 } else {
                                     textarea.dataset.autoSendEnabled = "true";
                                     textarea.style.border = "2px solid red";
                                 }
                             }
                         }, { once: true });
                    }
                }

                // Auto-send logic: if the button becomes a "Send" button (not "Stop") and auto-send is enabled
                if (sendBtn && !sendBtn.disabled) {
                    const textarea = document.querySelector(PROMPT_TEXTAREA_SELECTOR);
                    if (textarea && textarea.dataset.autoSendEnabled === "true" && (textarea.value || textarea.textContent).trim() !== "") {
                        setTimeout(() => {
                            const currentBtn = document.querySelector(SEND_BUTTON_SELECTOR);
                            if (currentBtn && !currentBtn.disabled) {
                                currentBtn.click();
                            }
                        }, 1000);
                        // Reset state after sending
                        textarea.dataset.autoSendEnabled = "false";
                        textarea.style.border = "";
                    }
                }
            }
        });

        observer.observe(main, {
            attributes: true,
            childList: true,
            subtree: true
        });
    }, 1000);
})();