// ==UserScript==
// @name         ChatGPT Auto Prompt Sender
// @namespace    userscript.moukaeritai.work
// @version      1.0.4
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

    // Note: Selectors might need updates for the latest ChatGPT UI.
    // Original logic preserved from version 1.0.0.20231004.

    setTimeout(function() {
        const div = document.querySelector("div:has(>form.stretch)");

        if (!div) {
            console.warn("ChatGPT Auto Prompt Sender: Target div not found. Selectors may need updating.");
            return;
        }

        const observer = new MutationObserver((mutationList, observer)=>{
            for(let mutation of mutationList){
                if(mutation.target.querySelector("div.absolute.right-2")){
                    const targetDiv = mutation.target.querySelector("div.absolute.right-2");
                    targetDiv.style.background = "yellow";
                    targetDiv.addEventListener("click", clickEvent=>{
                        const textarea = mutation.target.querySelector("textarea");
                        if(textarea) {
                            if(textarea.style.background === "red") {
                                textarea.style.background = null;
                            } else {
                                textarea.style.background = "red";
                            }
                        }
                    });
                    return;
                }
                if(mutation.target.querySelector("button.absolute")){
                    const textarea = mutation.target.querySelector("textarea");
                    if(textarea && textarea.style.background === "red"){
                        setTimeout(()=> {
                            const btn = mutation.target.querySelector("button.absolute");
                            if(btn) btn.click();
                        }, 1000);
                    }
                    if(textarea) textarea.style.background = null;
                }
            }
        });

        observer.observe(div, {attributes: true,
                               childList: true,
                               subtree: true
                              });
    }, 1000);
})();