// ==UserScript==
// @name         ChatGPT Auto Scroll
// @namespace    https://moukaeritai.work/chatgpt-auto-scroll
// @version      1.0.0
// @description  Automatically scrolls the conversation list to load all items.
// @author       Takashi SASAKI (https://twitter.com/TakashiSasaki)
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const CONVERSATION_LIST_SELECTORS = [
        "nav div.overflow-y-auto",
        "#__next > div.overflow-hidden.w-full.h-full > div > div > div > div > nav > div.overflow-y-auto",
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col.overflow-y-auto",
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col > div > div",
        "#__next > div.overflow-hidden.w-full.h-full.relative.flex > div.dark.flex-shrink-0.overflow-x-hidden > div > div > div > nav > div.overflow-y-auto"
    ];

    const ERROR_MESSAGE_LIST_NOT_FOUND = "Unable to retrieve the conversation list. This may be due to changes in the DOM structure of ChatGPT.";

    let scrollObserver = null;
    let lastScrollTop = 0;

    function getConversationListElement() {
        for (const selector of CONVERSATION_LIST_SELECTORS) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    function handleContinuousScrolling() {
        const div = getConversationListElement();
        if (!div) {
            alert(ERROR_MESSAGE_LIST_NOT_FOUND);
            return;
        }

        const style = window.getComputedStyle(div);
        if (style.overflowY === 'auto' || style.overflowY === 'visible' || style.overflowY === 'scroll') {
            if (!scrollObserver) {
                scrollObserver = new MutationObserver(() => {
                    if (lastScrollTop !== div.scrollTop) {
                        lastScrollTop = div.scrollTop;
                        // Keep scrolling to the bottom to trigger loading more items
                        setTimeout(() => { div.scrollTop = div.scrollHeight }, 500);
                    }
                });
            }
            scrollObserver.observe(div, { childList: true, subtree: true, attributes: true });

            // Initial scroll to trigger loading
            div.scrollTop = div.scrollHeight;
            console.log("Continuous scrolling started.");
        }
    }

    GM_registerMenuCommand("Start Auto Scroll", handleContinuousScrolling);
})();