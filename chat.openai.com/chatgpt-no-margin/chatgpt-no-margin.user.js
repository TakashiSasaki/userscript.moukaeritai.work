// ==UserScript==
// @name         ChatGPT No Margin
// @namespace    userscript.moukaeritai.work
// @version      1.2.5
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
// @grant        GM_setValue
// @grant        GM_getValue
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
    let isEnabled = GM_getValue('isEnabled', true);
    let styleElement = null;

    const CSS_CONTENT = `
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

        /* 4. Canvas Content: Force full width on editor containers */
        /* Override 'prose' max-width (65ch) to fill the screen/card */
        .ProseMirror, 
        #prosemirror-editor-container {
            width: 100% !important;
            max-width: 100% !important;
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

    function applyStyles() {
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.textContent = CSS_CONTENT;
            document.head.appendChild(styleElement);
            console.log("ChatGPT No Margin: CSS styles injected.");
        }
    }

    function removeStyles() {
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            styleElement = null;
            console.log("ChatGPT No Margin: CSS styles removed.");
        }
    }

    function toggleState() {
        isEnabled = !isEnabled;
        GM_setValue('isEnabled', isEnabled);
        if (isEnabled) {
            applyStyles();
        } else {
            removeStyles();
        }
        updateUI();
    }

    function updateUI() {
        const statusEl = document.getElementById('chatgpt-no-margin-status');
        const btnEl = document.getElementById('chatgpt-no-margin-button');
        if (statusEl) {
            statusEl.innerText = `Status: ${isEnabled ? 'Active' : 'Inactive'}`;
            statusEl.style.color = isEnabled ? '#10a37f' : '#666';
        }
        if (btnEl) {
            btnEl.innerText = isEnabled ? 'Disable No Margin' : 'Enable No Margin';
            btnEl.style.background = isEnabled ? '#ef4146' : '#10a37f';
        }
    }

    function createFloatingPanel() {
        const panelId = 'chatgpt-no-margin-panel';
        if (document.getElementById(panelId)) return;

        const panel = document.createElement('div');

        const savedTop = GM_getValue('panelTop', '50px');
        const savedLeft = GM_getValue('panelLeft', '10px');
        
        panel.id = panelId;
        panel.style.cssText = `
            position: fixed; top: ${savedTop}; left: ${savedLeft}; width: 150px;
            background: white; border: 1px solid #ccc; border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10000;
            font-family: sans-serif; font-size: 11px; color: #333;
            cursor: move;
        `;

        const header = document.createElement('div');
        header.innerText = `No Margin v${GM_info.script.version}`;
        header.style.cssText = `
            background: #f0f0f0; padding: 4px; border-bottom: 1px solid #ccc;
            border-radius: 4px 4px 0 0; cursor: move; font-weight: bold;
            user-select: none; text-align: center;
        `;
        panel.appendChild(header);

        const content = document.createElement('div');
        content.style.padding = '6px';
        panel.appendChild(content);

        const status = document.createElement('div');
        status.id = 'chatgpt-no-margin-status';
        status.style.cssText = 'margin-bottom: 8px; font-weight: bold; font-size: 11px;';
        content.appendChild(status);

        const btn = document.createElement('button');
        btn.id = 'chatgpt-no-margin-button';
        btn.style.cssText = `
            width: 100%; padding: 4px; color: white;
            border: none; border-radius: 3px; cursor: pointer; font-weight: bold;
            font-size: 11px;
        `;
        btn.onclick = toggleState;
        content.appendChild(btn);

        document.body.appendChild(panel);

        // Dragging logic
        let isDragging = false;
        let offsetX, offsetY;

        panel.addEventListener('mousedown', (e) => {
            if (e.target === btn) return;
            isDragging = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                panel.style.left = `${e.clientX - offsetX}px`;
                panel.style.top = `${e.clientY - offsetY}px`;
                panel.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                GM_setValue('panelTop', panel.style.top);
                GM_setValue('panelLeft', panel.style.left);
            }
        });
        updateUI();
    }

    // Initialize
    if (isEnabled) {
        applyStyles();
    }
    
    // Periodically check/re-create panel (SPA friendly)
    setInterval(createFloatingPanel, 1000);

})();