// ==UserScript==
// @name         ChatGPT Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.1.2
// @description  Count user/assistant turns, images, and code blocks in ChatGPT
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Create UI container
    const container = document.createElement('div');
    container.id = 'chatgpt-turn-counter-ui';
    Object.assign(container.style, {
        position: 'fixed',
        top: '60px', // Adjusted to not overlap with header elements often
        right: '20px',
        backgroundColor: 'rgba(32, 33, 35, 0.9)', // Dark background matching ChatGPT dark theme vibe
        color: '#ececf1',
        padding: '12px',
        borderRadius: '8px',
        zIndex: '9999',
        fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji',
        fontSize: '14px',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        border: '1px solid #565869',
        pointerEvents: 'none', // Allow clicking through if needed, or make it draggable. For now, static.
        userSelect: 'none'
    });

    // We want it to be interactable (e.g. valid to select text?) -> pointerEvents auto if we want to copy from it. 
    // But usually these overlays should not block clicks to underlying elements if they are just display.
    // However, if it's in the corner, it might be fine.
    container.style.pointerEvents = 'auto';

    document.body.appendChild(container);

    const updateStats = () => {
        // Disconnect observer to prevent infinite loop where updating UI triggers observer
        observer.disconnect();

        const userTurns = document.querySelectorAll('article[data-turn="user"]');
        const assistantTurns = document.querySelectorAll('article[data-turn="assistant"]');

        let imageCount = 0;
        userTurns.forEach(turn => {
            const imgs = turn.querySelectorAll('img');
            imageCount += imgs.length;
        });

        let codeBlockCount = 0;
        assistantTurns.forEach(turn => {
            const pres = turn.querySelectorAll('pre');
            codeBlockCount += pres.length;
        });

        container.innerHTML = `
            <div style="margin-bottom: 4px; font-weight: bold;">Turn Counter</div>
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span>User:</span> <span>${userTurns.length}</span></div>
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span>Assistant:</span> <span>${assistantTurns.length}</span></div>
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span>Images:</span> <span>${imageCount}</span></div>
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span>Code Blocks:</span> <span>${codeBlockCount}</span></div>
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
