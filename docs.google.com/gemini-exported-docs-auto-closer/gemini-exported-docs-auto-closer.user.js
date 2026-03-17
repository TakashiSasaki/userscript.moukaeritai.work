// ==UserScript==
// @name         Gemini Exported Docs Auto-Closer
// @namespace    userscript.moukaeritai.work
// @version      0.2.3
// @lastModified 2026-03-12
// @description  Automatically closes Google Docs tabs that were opened by the Gemini Artifact Exporter after a configurable delay. (Horizontal UI)
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
        const version = typeof GM_info !== 'undefined' ? GM_info.script.version : '0.2.2';
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

    let isPaused = false;
    let isCancelled = false;

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

    // Create UI container (Horizontal Button-Like Panel)
    const panel = document.createElement('div');
    panel.id = 'gemini-closer-panel';
    panel.style.cssText = `
        position: fixed;
        ${savedPos.top ? `top: ${savedPos.top};` : `bottom: ${savedPos.bottom};`}
        ${savedPos.left ? `left: ${savedPos.left};` : `right: ${savedPos.right};`}
        background-color: #323232;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-family: Roboto, Arial, sans-serif;
        font-size: 13px;
        z-index: 999999;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        transition: opacity 0.3s;
        user-select: none;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Version Handle (Drag handle)
    const versionSpan = document.createElement('span');
    versionSpan.style.cssText = `
        color: #aaa;
        font-size: 11px;
        cursor: move;
        font-weight: bold;
        padding: 2px 4px;
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
    `;
    versionSpan.textContent = `v${typeof GM_info !== 'undefined' ? GM_info.script.version : '0.2.3'}`;
    panel.appendChild(versionSpan);

    const message = document.createElement('span');
    message.style.whiteSpace = 'nowrap';
    message.textContent = `Closing in ${countdown}s...`;
    panel.appendChild(message);

    // Settings
    const settingsSpan = document.createElement('span');
    settingsSpan.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        color: #ccc;
    `;
    setInnerHTML(settingsSpan, '<span>Wait:</span>');

    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '3';
    timeInput.value = waitTime;
    timeInput.style.cssText = `
        width: 40px;
        background: #222;
        color: white;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 1px 2px;
        font-family: inherit;
        font-size: 12px;
    `;
    timeInput.addEventListener('change', () => {
        let val = parseInt(timeInput.value);
        if (isNaN(val) || val < 3) val = 3;
        timeInput.value = val;
        waitTime = val;
        GM_setValue('waitTime', val);
        console.log(`[Gemini Docs Closer] Wait time updated to ${val}s`);
    });
    settingsSpan.appendChild(timeInput);
    settingsSpan.appendChild(document.createTextNode('s'));
    panel.appendChild(settingsSpan);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Stay';
    cancelBtn.style.cssText = `
        background: #444;
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        padding: 2px 10px;
        font-size: 11px;
        font-weight: bold;
        transition: background 0.2s;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#555';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#444';

    cancelBtn.addEventListener('click', () => {
        isCancelled = true;
        clearInterval(timerId);
        message.textContent = 'Cancelled.';
        message.style.color = '#8ab4f8';
        setTimeout(() => {
            panel.style.opacity = '0';
            setTimeout(() => panel.remove(), 300);
        }, 2000);
    });
    panel.appendChild(cancelBtn);

    document.body.appendChild(panel);

    // Pause/Resume on Hover
    panel.addEventListener('mouseenter', () => {
        if (!isCancelled) {
            isPaused = true;
            message.textContent = `Paused (${countdown}s)`;
        }
    });

    panel.addEventListener('mouseleave', () => {
        if (!isCancelled) {
            isPaused = false;
            message.textContent = `Closing in ${countdown}s...`;
        }
    });

    // Custom Events for Pause/Resume
    document.addEventListener('gemini-docs-closer-pause', () => {
        if (!isCancelled && document.body.contains(panel)) {
            isPaused = true;
            message.textContent = `Paused (${countdown}s)`;
        }
    });

    document.addEventListener('gemini-docs-closer-resume', () => {
        if (!isCancelled && document.body.contains(panel)) {
            isPaused = false;
            message.textContent = `Closing in ${countdown}s...`;
        }
    });

    // Dragging Logic
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    versionSpan.addEventListener('mousedown', (e) => {
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
        if (isCancelled || !document.body.contains(panel)) {
            clearInterval(timerId);
            return;
        }

        if (isPaused) {
            // Keep message updated with Paused state, do not decrement countdown
            message.textContent = `Paused (${countdown}s)`;
            return;
        }

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
