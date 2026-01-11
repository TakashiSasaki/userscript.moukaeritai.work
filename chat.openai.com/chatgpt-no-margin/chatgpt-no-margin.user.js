// ==UserScript==
// @name         Remove margin around messages in ChatGPT Conversation View
// @namespace    userscript.moukaeritai.work
// @version      1.1.0
// @description  This script customizes the ChatGPT interface by reducing the margin around each message in the conversation view. It aims to create a tighter layout, thereby making the interface cleaner and allowing more content to be visible at once.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-no-margin/chatgpt-no-margin.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-no-margin/chatgpt-no-margin.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Portal API Guard
    if (location.href.startsWith("https://userscript.moukaeritai.work") ||
        location.href.startsWith("http://127.0.0.1:5500") ||
        location.href.startsWith("https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev")) {

        // Dispatch installed event
        window.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));

        // Listen for ping
        window.addEventListener('userscript-ping', () => {
            window.dispatchEvent(new CustomEvent('userscript-pong', {
                detail: {
                    name: GM_info.script.name,
                    version: GM_info.script.version
                }
            }));
        });

        return;
    }

    // Main Logic
    function widen(element) {
        if (element.nodeType !== Node.ELEMENT_NODE) return;

        // Target the inner message container (often has flex and mx-auto)
        // In recent ChatGPT, it might be: class="... mx-auto max-w-(--thread-content-max-width) flex-1 ... flex ..."
        if (element.matches("div.flex.mx-auto")) {
            element.style.marginLeft = "0px";
            element.style.marginRight = "0px";
            element.style.maxWidth = "100%";
        }

        // Target the outer message wrapper (often has text-base and mx-auto)
        // In recent ChatGPT: class="text-base my-auto mx-auto ... px-(--thread-content-margin)"
        if (element.matches("div.text-base.mx-auto")) {
            element.style.marginLeft = "0px";
            element.style.marginRight = "0px";
            element.style.maxWidth = "100%";
            // Optional: Reduce side padding if desired, but user asked for "no margin" specifically.
            // Keeping some padding is usually good for readability, but we can minimize it if needed.
            // element.style.paddingLeft = "1rem";
            // element.style.paddingRight = "1rem";
        }

        // Also try to override the CSS variable specifically if it exists in style
        // This targets the specific Tailwind arbitrary property class usage pattern if accessible
        if (element.style.getPropertyValue('--thread-content-max-width')) {
             element.style.setProperty('--thread-content-max-width', '100%');
        }
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        widen(node);
                        // Search for targets inside the added node
                        node.querySelectorAll("div.flex.mx-auto, div.text-base.mx-auto").forEach(widen);
                    }
                });
            } else if (mutation.type === "attributes") {
                widen(mutation.target);
            }
        });
    });

    // Start observing after a delay to ensure the page has loaded initial content
    setTimeout(() => {
        const presentation = document.querySelector("main div[role='presentation']") || document.body;

        observer.observe(presentation, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        // Initial application
        document.querySelectorAll("div.flex.mx-auto, div.text-base.mx-auto").forEach(widen);
        console.log("ChatGPT No Margin script activated.");
    }, 1500);
})();