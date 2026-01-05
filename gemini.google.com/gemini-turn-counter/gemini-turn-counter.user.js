// ==UserScript==
// @name         Gemini Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.1.2
// @description  Count user/model turns, images, and characters in Google Gemini
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Settings
    const SELECTORS = {
        userTurn: 'user-query',
        modelTurn: 'model-response',
        // User image selector based on analysis of user-query.html
        userImage: 'img[data-test-id="uploaded-img"]',
        // Text content selectors (broad approximation, refinement needed)
        userText: '.query-text',
        modelText: '.model-response-text, .response-content', // Needs verification on whole-dom
    };

    // Trusted Types Policy Creation
    let policy;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            policy = window.trustedTypes.createPolicy('geminiTurnCounter', {
                createHTML: (string) => string
            });
        } catch (e) {
            console.warn('Gemini Turn Counter: Failed to create trustedTypes policy', e);
        }
    }

    // Helper to safely set innerHTML
    const setInnerHTML = (element, html) => {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

    // Inject CSS styles (Ported from chatgpt-turn-counter with minor tweaks)
    const style = document.createElement('style');
    style.textContent = `
        #gemini-turn-counter-ui {
            position: fixed;
            top: 60px;
            right: 20px;
            background-color: rgba(30, 31, 32, 0.9); /* Gemini dark theme bg approx */
            color: #bdc1c6;
            border-radius: 8px;
            z-index: 9999;
            font-family: Google Sans, Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            border: 1px solid #444746;
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
        #gemini-turn-counter-ui.expanded {
            width: auto;
            height: auto;
            min-width: 180px;
            padding: 12px;
            display: block;
            cursor: default;
        }
        #gemini-turn-counter-ui .gtc-icon {
            display: block;
            line-height: 0;
        }
        #gemini-turn-counter-ui.expanded .gtc-icon {
            display: none;
        }
        #gemini-turn-counter-ui .gtc-content {
            display: none;
        }
        #gemini-turn-counter-ui.expanded .gtc-content {
            display: block;
        }
        .gtc-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            white-space: nowrap;
            margin-bottom: 4px;
        }
        .gtc-row:last-child {
            margin-bottom: 0;
        }
        .gtc-val {
            text-align: right;
            font-variant-numeric: tabular-nums;
            font-weight: bold;
        }
        .gtc-thumbnails {
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #444746;
        }
        .gtc-thumbnail {
            width: 20px;
            height: 20px;
            object-fit: cover;
            border-radius: 2px;
            border: 1px solid #444746;
            cursor: copy;
            transition: all 0.2s ease;
        }
        .gtc-thumbnail.copied {
            border: 2px solid #8ab4f8; /* Gemini Blue */
        }
        /* Modal & Tooltip styles would go here (omitted for initial brevity) */
    `;
    document.head.appendChild(style);

    // Create UI container
    const container = document.createElement('div');
    container.id = 'gemini-turn-counter-ui';

    // Icon SVG
    const iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="color: #a8c7fa;">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
    </svg>`;

    setInnerHTML(container, `
        <div class="gtc-icon">${iconSvg}</div>
        <div class="gtc-content">Loading...</div>
    `);
    document.body.appendChild(container);

    const contentDiv = container.querySelector('.gtc-content');

    // UI Events
    container.addEventListener('click', () => {
        container.classList.add('expanded');
    });
    container.addEventListener('mouseleave', () => {
        container.classList.remove('expanded');
    });

    // --- Core Logic ---

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

    const fetchImageData = async (src) => {
        try {
            // Check if src is already data URI
            if (src.startsWith('data:')) return src;

            const response = await fetch(src);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Failed to fetch image data:', e);
            return null;
        }
    };

    // Keep track of processed images to avoid refetching heavily
    // In a real script we might need better caching or just fetch on demand.

    const updateStats = () => {
        // Disconnect to avoid loops
        observer.disconnect();

        try {
            const userTurns = document.querySelectorAll(SELECTORS.userTurn);
            const modelTurns = document.querySelectorAll(SELECTORS.modelTurn);

            let userCharCount = 0;
            let collectedImages = [];

            userTurns.forEach(turn => {
                // Text count
                const textNodes = turn.querySelectorAll(SELECTORS.userText);
                textNodes.forEach(node => {
                    userCharCount += getTextContentLength(node);
                });

                // Image count
                const imgs = turn.querySelectorAll(SELECTORS.userImage);
                imgs.forEach(img => {
                    collectedImages.push(img.src);
                });
            });

            let modelCharCount = 0;
            modelTurns.forEach(turn => {
                // Model text selector is tricky, it usually contains many nested elements.
                // We'll try to grab the main container text for now.
                // Refinement: exclude 'sources' or other meta info if possible.
                modelCharCount += getTextContentLength(turn);
            });

            const imageCount = collectedImages.length;
            const thumbnailsHtml = imageCount > 0
                ? `<div class="gtc-thumbnails">
                    ${collectedImages.map(url => `<img src="${url}" class="gtc-thumbnail" />`).join('')}
                   </div>`
                : '';

            setInnerHTML(contentDiv, `
                <div style="margin-bottom: 8px; font-weight: bold; border-bottom:1px solid #555; padding-bottom:4px;">Gemini Turns</div>
                <div class="gtc-row"><span>User:</span> <span class="gtc-val">${userTurns.length} (${userCharCount.toLocaleString()})</span></div>
                <div class="gtc-row"><span>Model:</span> <span class="gtc-val">${modelTurns.length} (${modelCharCount.toLocaleString()})</span></div>
                <div class="gtc-row">
                    <span>Images:</span> 
                    <span>
                        <span class="gtc-val">${imageCount}</span>
                        ${imageCount > 0 ? '<button id="gtc-copy-all" style="margin-left: 8px; padding: 2px 6px; font-size: 11px; cursor: pointer;">Copy</button>' : ''}
                    </span>
                </div>
                ${thumbnailsHtml}
            `);

            // Attach Copy All event
            const copyBtn = contentDiv.querySelector('#gtc-copy-all');
            if (copyBtn) {
                copyBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    copyBtn.textContent = '...';

                    const imgTags = await Promise.all(collectedImages.map(async (url) => {
                        const dataUri = await fetchImageData(url);
                        return dataUri ? `<img src="${dataUri}" />` : '';
                    }));

                    const htmlToCopy = imgTags.join('');
                    if (htmlToCopy) {
                        const type = "text/html";
                        const blob = new Blob([htmlToCopy], { type });
                        const data = [new ClipboardItem({ [type]: blob })];
                        navigator.clipboard.write(data).then(() => {
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
                        }).catch(err => {
                            console.error(err);
                            copyBtn.textContent = 'Err';
                        });
                    }
                });
            }

        } finally {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    };

    const observer = new MutationObserver((mutations) => {
        // Simple debounce could be added here
        updateStats();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial run
    setTimeout(updateStats, 2000); // Wait a bit for initial load

})();
