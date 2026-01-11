// ==UserScript==
// @name         ChatGPT No Margin
// @namespace    userscript.moukaeritai.work
// @version      1.2.3
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

    // Main Logic: Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        /* --- Chat View --- */

        /* 1. Override the max-width variable used by ChatGPT's layout system */
        :root, [class*="[--thread-content-max-width"] {
            --thread-content-max-width: 100% !important;
            --thread-content-margin: 0px !important;
        }

        /* 2. Force the outer message wrapper to use full width and remove auto margins */
        .text-base.mx-auto {
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }

        /* 3. Ensure the inner container respects the variable override */
        div[class*="max-w-[var(--thread-content-max-width)]"],
        div[class*="max-w-(--thread-content-max-width)"] {
            max-width: 100% !important;
        }

        /* --- Canvas View --- */

        /* 4. Canvas Content: Remove fixed width from the ProseMirror editor (Main Canvas) */
        /* Note: For Embedded Canvas (inside article), we do NOT force max-width 100%, 
           allowing the 'prose' class to maintain readable line lengths. */
        :not(article) .ProseMirror {
            width: 100% !important;
            max-width: 100% !important;
        }
        
        /* Ensure Embedded Canvas ProseMirror takes width but respects prose max-width */
        article .ProseMirror {
            width: 100% !important;
        }

        /* 5. Canvas Wrapper: Remove fixed margins from the container holding the editor */
        /* Targeting the flex container inside the scrollable area */
        div.flex.h-full.justify-center[style*="margin"] {
            margin-left: 1rem !important; /* Keep a tiny padding for aesthetics */
            margin-right: 1rem !important;
        }
        
        /* Generic fallback for Canvas flex containers if specific style selector fails */
        section.popover .react-scroll-to-bottom--css-vrzkg-1n7m0yu > div > div > div {
             margin-left: 0 !important;
             margin-right: 0 !important;
             width: 100% !important;
        }

        /* 6. Embedded Canvas Card: Ensure it has some margin and doesn't touch the screen edges */
        article .popover.rounded-3xl {
             width: calc(100% - 3rem) !important;
             margin-left: auto !important;
             margin-right: auto !important;
        }
    `;
    document.head.appendChild(style);
    console.log("ChatGPT No Margin: CSS styles injected.");

})();