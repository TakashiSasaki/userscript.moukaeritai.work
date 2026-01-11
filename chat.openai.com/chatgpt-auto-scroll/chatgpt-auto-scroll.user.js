// ==UserScript==
// @name         ChatGPT Auto Scroll
// @namespace    userscript.moukaeritai.work
// @version      1.0.11
// @description  Automatically scrolls the conversation list to load all items.
// @author       Takashi SASAKI (https://twitter.com/TakashiSasaki)
// @match        https://chatgpt.com/*
// @match        https://userscript.moukaeritai.work/*
// @match        http://127.0.0.1:5500/*
// @match        https://fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-scroll/chatgpt-auto-scroll.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-auto-scroll/chatgpt-auto-scroll.user.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
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
        "nav.overflow-y-auto",
        "#stage-slideover-sidebar nav",
        "nav div.overflow-y-auto",
        "#__next > div.overflow-hidden.w-full.h-full > div > div > div > div > nav > div.overflow-y-auto",
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col.overflow-y-auto",
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col > div > div",
        "#__next > div.overflow-hidden.w-full.h-full.relative.flex > div.dark.flex-shrink-0.overflow-x-hidden > div > div > div > nav > div.overflow-y-auto"
    ];

    const ERROR_MESSAGE_LIST_NOT_FOUND = "Unable to retrieve the conversation list. This may be due to changes in the DOM structure of ChatGPT.";

    let scrollObserver = null;
    let lastScrollTop = 0;
    let isScrolling = false;
    let scrollCount = 0;
    let scrollTimeout = null;
    let isCooldown = false;

    function getConversationListElement() {
        for (const selector of CONVERSATION_LIST_SELECTORS) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    function updateUI() {
        const statusEl = document.getElementById('chatgpt-auto-scroll-status');
        const btnEl = document.getElementById('chatgpt-auto-scroll-button');
        if (statusEl) {
            let stateText = 'Idle';
            if (isScrolling) {
                stateText = isCooldown ? 'Cooldown' : 'Running';
            }
            statusEl.innerHTML = `State: ${stateText}<br>Scrolls: ${scrollCount}<br>Top: ${Math.floor(lastScrollTop)}`;
        }
        if (btnEl) {
            btnEl.innerText = isScrolling ? 'Stop Scroll' : 'Start Scroll';
            btnEl.style.background = isScrolling ? '#ef4146' : '#10a37f';
        }
    }

    function toggleScrolling() {
        if (isScrolling) {
            if (scrollObserver) {
                scrollObserver.disconnect();
                scrollObserver = null;
            }
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
                scrollTimeout = null;
            }
            isScrolling = false;
            isCooldown = false;
            updateUI();
        } else {
            const div = getConversationListElement();
            if (!div) {
                alert(ERROR_MESSAGE_LIST_NOT_FOUND);
                return;
            }

            const style = window.getComputedStyle(div);
            if (style.overflowY === 'auto' || style.overflowY === 'visible' || style.overflowY === 'scroll') {
                isScrolling = true;
                isCooldown = false;
                scrollCount = 0;
                updateUI();

                scrollObserver = new MutationObserver(() => {
                    if (scrollTimeout) clearTimeout(scrollTimeout);

                    if (!isCooldown) {
                        isCooldown = true;
                        updateUI();
                    }

                    scrollTimeout = setTimeout(() => {
                        if (isScrolling) {
                            div.scrollTop = div.scrollHeight;
                            lastScrollTop = div.scrollTop;
                            scrollCount++;
                            isCooldown = false;
                            updateUI();
                        }
                    }, 1000);
                });
                scrollObserver.observe(div, { childList: true, subtree: true, attributes: true });
                div.scrollTop = div.scrollHeight;
            }
        }
    }

    function createFloatingPanel() {
        const panelId = 'chatgpt-auto-scroll-panel';
        if (document.getElementById(panelId)) return;

        const panel = document.createElement('div');

        const savedTop = GM_getValue('panelTop', '10px');
        const savedLeft = GM_getValue('panelLeft', null);
        let positionStyle = 'top: 10px; right: 10px;';
        if (savedLeft !== null) {
            positionStyle = `top: ${savedTop}; left: ${savedLeft}; right: auto;`;
        }

        panel.id = panelId;
        panel.style.cssText = `
            position: fixed; ${positionStyle} width: 140px;
            background: white; border: 1px solid #ccc; border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10000;
            font-family: sans-serif; font-size: 11px; color: #333;
        `;

        const header = document.createElement('div');
        header.innerText = `Auto Scroll v${GM_info.script.version}`;
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
        status.id = 'chatgpt-auto-scroll-status';
        status.style.cssText = 'margin-bottom: 8px; font-size: 10px; line-height: 1.4; color: #555;';
        content.appendChild(status);

        const btn = document.createElement('button');
        btn.id = 'chatgpt-auto-scroll-button';
        btn.innerText = 'Start Scroll';
        btn.style.cssText = `
            width: 100%; padding: 4px; background: #10a37f; color: white;
            border: none; border-radius: 3px; cursor: pointer; font-weight: bold;
            font-size: 11px;
        `;
        btn.onclick = toggleScrolling;
        content.appendChild(btn);

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
            if (isDragging) {
                isDragging = false;
                GM_setValue('panelTop', panel.style.top);
                GM_setValue('panelLeft', panel.style.left);
            }
        });
        updateUI();
    }

    setInterval(createFloatingPanel, 1000);

})();