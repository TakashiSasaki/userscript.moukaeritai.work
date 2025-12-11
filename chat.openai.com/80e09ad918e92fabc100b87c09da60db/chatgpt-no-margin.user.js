// ==UserScript==
// @name         Remove margin around messages in ChatGPT Conversation View
// @namespace    https://gist.github.com/TakashiSasaki/80e09ad918e92fabc100b87c09da60db/
// @version      2024-04-29.3
// @description  This script customizes the ChatGPT interface by reducing the margin around each message in the conversation view. It aims to create a tighter layout, thereby making the interface cleaner and allowing more content to be visible at once.
// @author       Takashi Sasaki
// @website      https://twitter.com/TakashiSasaki
// @match        https://chat.openai.com/g/*
// @match        https://chat.openai.com/c/*
// @match        https://chat.openai.com/
// @icon         https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png
// @grant        none
// @updateURL    https://gist.github.com/TakashiSasaki/80e09ad918e92fabc100b87c09da60db/raw/chatgpt-no-margin.user.js
// @downloadURL    https://gist.github.com/TakashiSasaki/80e09ad918e92fabc100b87c09da60db/raw/chatgpt-no-margin.user.js
// ==/UserScript==

function widen(div){
    if(div.nodeType === Node.ELEMENT_NODE && div.matches("div.flex.mx-auto")){
        div.style.marginLeft = "initial";
        div.style.marginRight = "initial";
        div.style.maxWidth = "initial";
    }}

(function() {
    'use strict';
    setTimeout(function() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if(mutation.type == "childList"){
                    console.log(mutation);
                    widen(mutation.target);
                    mutation.addedNodes.forEach(node => widen(node));
                } else if (mutation.type == "attributes") {
                    console.log(mutation);
                    widen(mutation.target);
                } else if (mutation.type == "characterData"){
                    //console.log(mutation);
                    //widen(mutation.target);
                } else {
                    console.log(mutation);
                }
            });
        });

        const config = { childList: true, subtree: true };

        const presentation = document.querySelector("main div[role='presentation']");
        console.log(presentation);
        observer.observe(presentation, config);
        presentation.querySelectorAll("div.flex.mx-auto").forEach(div=>{
            widen(div);
        });
    }, 1500); // 1.5秒後に監視を開始
})();