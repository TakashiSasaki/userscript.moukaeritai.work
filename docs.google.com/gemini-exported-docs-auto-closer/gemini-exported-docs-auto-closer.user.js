// ==UserScript==
// @name         Gemini Exported Docs Auto-Closer
// @namespace    userscript.moukaeritai.work
// @version      0.1.0
// @description  Automatically closes Google Docs tabs that were opened by the Gemini Artifact Exporter after 5 seconds.
// @author       Takashi Sasaki
// @match        https://docs.google.com/document/d/*
// @grant        window.close
// ==/UserScript==

(function () {
    'use strict';

    // Check if the document was opened from Gemini
    if (!document.referrer || !document.referrer.includes('gemini.google.com')) {
        return; // Not opened from Gemini, do nothing
    }

    let countdown = 5;
    let timerId = null;

    // Create UI container
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background-color: #323232;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-family: Roboto, Arial, sans-serif;
        font-size: 14px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        transition: opacity 0.3s;
    `;

    const message = document.createElement('span');
    message.textContent = `Auto-closing in ${countdown}s (Opened from Gemini)`;
    toast.appendChild(message);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        background: transparent;
        color: #8ab4f8;
        border: none;
        font-weight: bold;
        cursor: pointer;
        padding: 8px;
        margin: -8px;
    `;

    cancelBtn.addEventListener('click', () => {
        clearInterval(timerId);
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    });

    toast.appendChild(cancelBtn);
    document.body.appendChild(toast);

    // Start countdown
    console.log('[Gemini Docs Closer] Gemini referrer detected. Starting auto-close countdown.');
    timerId = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            message.textContent = `Auto-closing in ${countdown}s (Opened from Gemini)`;
        } else {
            clearInterval(timerId);
            message.textContent = 'Closing...';
            console.log('[Gemini Docs Closer] Countdown finished. Attempting window.close().');
            window.close();

            // Fallback warning if window.close() is blocked
            setTimeout(() => {
                message.textContent = 'Please close this tab manually.';
                cancelBtn.textContent = 'Dismiss';
            }, 1000);
        }
    }, 1000);

})();
