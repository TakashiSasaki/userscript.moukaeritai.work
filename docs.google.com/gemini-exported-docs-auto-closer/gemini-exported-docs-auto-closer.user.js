// ==UserScript==
// @name         Gemini Exported Docs Auto-Closer
// @namespace    userscript.moukaeritai.work
// @version      0.2.1
// @lastModified 2026-03-10
// @description  Automatically closes Google Docs tabs that were opened by the Gemini Artifact Exporter after a configurable delay.
// @author       Takashi Sasaki
// @match        https://docs.google.com/document/d/*
// @match        https://userscript.moukaeritai.work/*
// @grant        window.close
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/gemini-exported-docs-auto-closer/gemini-exported-docs-auto-closer.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/gemini-exported-docs-auto-closer/gemini-exported-docs-auto-closer.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Report version to landing page
    const SCRIPT_NAME = 'Gemini Exported Docs Auto-Closer';
    const reportVersion = () => {
        const version = typeof GM_info !== 'undefined' ? GM_info.script.version : '0.2.1';
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: { name: SCRIPT_NAME, version: version }
        }));
    };
    document.addEventListener('userscript-ping', reportVersion);
    reportVersion(); // Initial report

    // Check if the document was opened from Gemini (only for Google Docs)
    if (location.hostname.includes('docs.google.com')) {
        if (!document.referrer || !document.referrer.includes('gemini.google.com')) {
            return; // Not opened from Gemini, do nothing
        }
    } else {
        return; // Don't run UI on other domains (like the landing page)
    }

    // Load settings
    let waitTime = parseInt(GM_getValue('waitTime', '5'));
    if (isNaN(waitTime) || waitTime < 3) waitTime = 3;

    let countdown = waitTime;
    let timerId = null;

    // Load position
    const savedPos = GM_getValue('panelPosition', { bottom: '24px', right: '24px' });

    // Trusted Types Policy for Google Docs
    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiDocsCloser_' + Math.random().toString(36).substr(2, 9), {
                createHTML: (string) => string
            });
        } catch (e) {
            console.warn('[Gemini Docs Closer] Failed to create trustedTypes policy', e);
        }
    }

    const setInnerHTML = (element, html) => {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

    // Create UI container (Draggable Panel)
    const panel = document.createElement('div');
    panel.id = 'gemini-closer-panel';
    panel.style.cssText = `
        position: fixed;
        ${savedPos.top ? `top: ${savedPos.top};` : `bottom: ${savedPos.bottom};`}
        ${savedPos.left ? `left: ${savedPos.left};` : `right: ${savedPos.right};`}
        background-color: #323232;
        color: white;
        padding: 0;
        border-radius: 8px;
        font-family: Roboto, Arial, sans-serif;
        font-size: 14px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        transition: opacity 0.3s;
        min-width: 280px;
        user-select: none;
    `;

    // Header (Drag handle)
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 8px 12px;
        background-color: #444;
        border-radius: 8px 8px 0 0;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #aaa;
    `;
    setInnerHTML(header, '<span>⠿ Gemini Auto-Closer</span>');
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.style.cssText = `
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    `;
    panel.appendChild(body);

    const message = document.createElement('div');
    message.style.fontSize = '15px';
    message.textContent = `Closing in ${countdown}s...`;
    body.appendChild(message);

    // Settings row
    const settingsRow = document.createElement('div');
    settingsRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #ccc;
    `;
    setInnerHTML(settingsRow, '<span>Wait:</span>');

    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '3';
    timeInput.value = waitTime;
    timeInput.style.cssText = `
        width: 45px;
        background: #222;
        color: white;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 2px 4px;
        font-family: inherit;
    `;
    timeInput.addEventListener('change', () => {
        let val = parseInt(timeInput.value);
        if (isNaN(val) || val < 3) val = 3;
        timeInput.value = val;
        waitTime = val;
        GM_setValue('waitTime', val);
        console.log(`[Gemini Docs Closer] Wait time updated to ${val}s`);
    });
    settingsRow.appendChild(timeInput);
    settingsRow.appendChild(document.createTextNode('sec'));

    body.appendChild(settingsRow);

    // Buttons row
    const buttonsRow = document.createElement('div');
    buttonsRow.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 4px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Stay here';
    cancelBtn.style.cssText = `
        background: #444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 6px 12px;
        font-size: 13px;
    `;

    cancelBtn.addEventListener('click', () => {
        clearInterval(timerId);
        message.textContent = 'Auto-close cancelled.';
        message.style.color = '#8ab4f8';
        setTimeout(() => {
            panel.style.opacity = '0';
            setTimeout(() => panel.remove(), 300);
        }, 2000);
    });

    buttonsRow.appendChild(cancelBtn);
    body.appendChild(buttonsRow);

    document.body.appendChild(panel);

    // Dragging Logic
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset.x = e.clientX - panel.offsetLeft;
        offset.y = e.clientY - panel.offsetTop;
        panel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.top = (e.clientY - offset.y) + 'px';
        panel.style.left = (e.clientX - offset.x) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'opacity 0.3s';
            GM_setValue('panelPosition', { top: panel.style.top, left: panel.style.left });
        }
    });

    // Start countdown
    console.log('[Gemini Docs Closer] Gemini referrer detected. Starting auto-close countdown.');
    timerId = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            message.textContent = `Closing in ${countdown}s...`;
        } else {
            clearInterval(timerId);
            message.textContent = 'Closing tab...';
            console.log('[Gemini Docs Closer] Countdown finished. Attempting window.close().');
            window.close();

            // Fallback warning if window.close() is blocked
            setTimeout(() => {
                message.textContent = 'Auto-close failed (popup blocked?).';
                cancelBtn.textContent = 'Dismiss';
            }, 1000);
        }
    }, 1000);

})();
