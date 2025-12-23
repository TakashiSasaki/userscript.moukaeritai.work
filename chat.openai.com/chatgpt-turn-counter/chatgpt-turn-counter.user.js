// ==UserScript==
// @name         ChatGPT Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.1.4
// @description  Count user/assistant turns, images, and code blocks in ChatGPT
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Inject CSS styles
    const style = document.createElement('style');
    style.textContent = `
        #chatgpt-turn-counter-ui {
            position: fixed;
            top: 60px;
            right: 20px;
            background-color: rgba(32, 33, 35, 0.9);
            color: #ececf1;
            border-radius: 8px;
            z-index: 9999;
            font-family: Söhne, ui-sans-serif, system-ui, -apple-system, sans-serif;
            font-size: 14px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            border: 1px solid #565869;
            transition: all 0.3s ease;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            width: 40px;
            height: 40px;
            padding: 0;
            user-select: none;
        }
        #chatgpt-turn-counter-ui.expanded {
            width: auto;
            height: auto;
            min-width: 180px;
            padding: 12px;
            display: block;
            cursor: default;
        }
        #chatgpt-turn-counter-ui .ctc-icon {
            display: block;
            line-height: 0;
        }
        #chatgpt-turn-counter-ui.expanded .ctc-icon {
            display: none;
        }
        #chatgpt-turn-counter-ui .ctc-content {
            display: none;
        }
        #chatgpt-turn-counter-ui.expanded .ctc-content {
            display: block;
        }
        .ctc-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            white-space: nowrap;
        }
        .ctc-val {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
    `;
    document.head.appendChild(style);

    // Create UI container
    const container = document.createElement('div');
    container.id = 'chatgpt-turn-counter-ui';

    // Icon SVG (Chat bubble with lines)
    const iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
        <path d="M8 8H16V10H8V8Z" fill="#121212"/>
        <path d="M8 12H16V14H8V12Z" fill="#121212"/>
    </svg>`;

    container.innerHTML = `
        <div class="ctc-icon">${iconSvg}</div>
        <div class="ctc-content"></div>
    `;

    document.body.appendChild(container);
    const contentDiv = container.querySelector('.ctc-content');

    // Event Listeners
    container.addEventListener('click', () => {
        container.classList.add('expanded');
    });

    container.addEventListener('mouseleave', () => {
        container.classList.remove('expanded');
    });

    // Helper to calculate text length from text nodes only
    const getTextContentLength = (element) => {
        if (!element) return 0;
        let length = 0;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            length += node.nodeValue.length;
        }
        return length;
    };

    const updateStats = () => {
        // Disconnect observer to prevent infinite loop where updating UI triggers observer
        observer.disconnect();

        const userTurns = document.querySelectorAll('article[data-turn="user"]');
        const assistantTurns = document.querySelectorAll('article[data-turn="assistant"]');

        let userCharCount = 0;
        let imageCount = 0;
        userTurns.forEach(turn => {
            const imgs = turn.querySelectorAll('img');
            imageCount += imgs.length;

            const contentNode = turn.querySelector('.whitespace-pre-wrap') || turn;
            userCharCount += getTextContentLength(contentNode);
        });

        let assistantCharCount = 0;
        let codeBlockCount = 0;
        assistantTurns.forEach(turn => {
            const pres = turn.querySelectorAll('pre');
            codeBlockCount += pres.length;

            // Typically assistant messages are in .markdown
            const contentNode = turn.querySelector('.markdown') || turn;
            assistantCharCount += getTextContentLength(contentNode);
        });

        contentDiv.innerHTML = `
            <div style="margin-bottom: 4px; font-weight: bold;">Turn Counter</div>
            <div class="ctc-row"><span>User:</span> <span class="ctc-val">${userTurns.length} (${userCharCount.toLocaleString()} chars)</span></div>
            <div class="ctc-row"><span>Assistant:</span> <span class="ctc-val">${assistantTurns.length} (${assistantCharCount.toLocaleString()} chars)</span></div>
            <div class="ctc-row"><span>Images:</span> <span class="ctc-val">${imageCount}</span></div>
            <div class="ctc-row"><span>Code Blocks:</span> <span class="ctc-val">${codeBlockCount}</span></div>
        `;

        // Reconnect observer
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // Use MutationObserver to detect changes in the DOM (new messages)
    const observer = new MutationObserver((mutations) => {
        updateStats();
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial run
    updateStats();

})();
