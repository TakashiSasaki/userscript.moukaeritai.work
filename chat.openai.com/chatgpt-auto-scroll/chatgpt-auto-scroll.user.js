// ==UserScript==
// @name         ChatGPT Auto Scroll
// @namespace    userscript.moukaeritai.work
// @version      1.0.3
// @description  Automatically scrolls the conversation list to load all items.
// @author       Takashi SASAKI (https://twitter.com/TakashiSasaki)
// @match        https://chatgpt.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-scroll/chatgpt-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-scroll/chatgpt-auto-scroll.user.js
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Portal API Guard
    if (location.hostname === 'userscript.moukaeritai.work' || location.hostname === '127.0.0.1' || location.hostname === 'fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev') {
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

    const CONVERSATION_LIST_SELECTORS = [
        "nav div.overflow-y-auto",
        "#__next > div.overflow-hidden.w-full.h-full > div > div > div > div > nav > div.overflow-y-auto",
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col.overflow-y-auto",
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col > div > div",
        "#__next > div.overflow-hidden.w-full.h-full.relative.flex > div.dark.flex-shrink-0.overflow-x-hidden > div > div > div > nav > div.overflow-y-auto"
    ];

    const ERROR_MESSAGE_LIST_NOT_FOUND = "Unable to retrieve the conversation list. This may be due to changes in the DOM structure of ChatGPT.";
    const UPDATE_URL = "https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-scroll/chatgpt-auto-scroll.user.js";

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

    function isNewerVersion(current, remote) {
        const cParts = current.split('.').map(Number);
        const rParts = remote.split('.').map(Number);
        for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
            const c = cParts[i] || 0;
            const r = rParts[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    }

    function checkForUpdates() {
        GM_xmlhttpRequest({
            method: "GET",
            url: UPDATE_URL,
            onload: (response) => {
                const match = response.responseText.match(/@version\s+([\d.]+)/);
                if (match) {
                    const remoteVersion = match[1];
                    if (isNewerVersion(GM_info.script.version, remoteVersion)) {
                        if (confirm(`New version ${remoteVersion} is available. Update now?`)) {
                            window.location.href = UPDATE_URL;
                        }
                    } else {
                        alert("You are using the latest version.");
                    }
                }
            }
        });
    }

    function createFloatingPanel() {
        const panelId = 'chatgpt-auto-scroll-panel';
        if (document.getElementById(panelId)) return;

        const panel = document.createElement('div');
        panel.id = panelId;
        panel.style.cssText = `
            position: fixed; top: 20px; right: 20px; width: 220px;
            background: white; border: 1px solid #ccc; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999;
            font-family: sans-serif; font-size: 14px; color: #333;
        `;

        const header = document.createElement('div');
        header.innerText = `Auto Scroll v${GM_info.script.version}`;
        header.style.cssText = `
            background: #f7f7f8; padding: 10px; border-bottom: 1px solid #ccc;
            border-radius: 8px 8px 0 0; cursor: move; font-weight: bold;
            user-select: none; display: flex; justify-content: space-between;
        `;
        panel.appendChild(header);

        const content = document.createElement('div');
        content.style.padding = '15px';
        panel.appendChild(content);

        const btn = document.createElement('button');
        btn.innerText = 'Start Auto Scroll';
        btn.style.cssText = `
            width: 100%; padding: 8px; background: #10a37f; color: white;
            border: none; border-radius: 4px; cursor: pointer; font-weight: bold;
        `;
        btn.onclick = handleContinuousScrolling;
        content.appendChild(btn);

        const updateBtn = document.createElement('button');
        updateBtn.innerText = 'Check Updates';
        updateBtn.style.cssText = `
            width: 100%; padding: 8px; background: #6c757d; color: white;
            border: none; border-radius: 4px; cursor: pointer; font-weight: bold;
            margin-top: 10px;
        `;
        updateBtn.onclick = checkForUpdates;
        content.appendChild(updateBtn);

        document.body.appendChild(panel);

        // Dragging logic
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
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
            isDragging = false;
        });
    }

    setTimeout(createFloatingPanel, 1000);

    GM_registerMenuCommand("Start Auto Scroll", handleContinuousScrolling);
})();