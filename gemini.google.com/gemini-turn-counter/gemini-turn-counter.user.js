// ==UserScript==
// @name         Gemini Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.1.10
// @description  Count user/model turns, images, and characters in Google Gemini
// @author       Takashi Sasaki
// @match        https://gemini.google.com/app/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work') {
        window.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
        return;
    }

    // Settings
    const SELECTORS = {
        userTurn: 'user-query',
        modelTurn: 'model-response',
        // User image selector based on analysis of user-query.html
        userImage: 'img[data-test-id="uploaded-img"]',
        // Text content selectors (broad approximation, refinement needed)
        userText: '.query-text',
        modelText: '.model-response-text, .response-content', // Needs verification on whole-dom
        // Code block selector (based on samples/code-block.html)
        codeBlock: 'code-block',
        // Table selector (based on samples/table-block.html)
        tableBlock: 'table-block' // or 'table' inside model response
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
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            position: relative;
        }
        #gemini-turn-counter-ui.expanded .gtc-icon {
            display: none;
        }
        .gtc-icon-badge {
            position: absolute;
            bottom: 2px;
            right: 2px;
            background-color: #8ab4f8;
            color: #202124;
            font-size: 10px;
            font-weight: bold;
            padding: 0 4px;
            border-radius: 10px;
            min-width: 14px;
            text-align: center;
            line-height: 14px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
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
            max-width: 220px; /* Limit width to enforce wrapping */
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
        #gtc-copy-status {
            font-size: 10px;
            margin-left: 5px;
            color: #8ab4f8;
        }
        .gtc-setting-row {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 4px;
            font-size: 11px;
            color: #bdc1c6;
        }
        .gtc-input {
            background: #1e1f20;
            border: 1px solid #444746;
            color: #e3e3e3;
            width: 40px;
            padding: 1px 2px;
            border-radius: 2px;
            font-size: 11px;
            text-align: right;
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
        <div class="gtc-icon">
            ${iconSvg}
            <span class="gtc-icon-badge">0</span>
        </div>
        <div class="gtc-content">Loading...</div>
    `);
    document.body.appendChild(container);

    const contentDiv = container.querySelector('.gtc-content');
    const badgeSpan = container.querySelector('.gtc-icon-badge');

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

    const fetchImageData = (src) => {
        return new Promise((resolve) => {
            // Check if src is already data URI
            if (src.startsWith('data:')) {
                resolve(src);
                return;
            }

            GM_xmlhttpRequest({
                method: "GET",
                url: src,
                responseType: "blob",
                onload: (response) => {
                    const blob = response.response;
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                },
                onerror: (e) => {
                    console.error('Gemini Turn Counter: Failed to fetch image data with GM_xmlhttpRequest', e);
                    resolve(null);
                }
            });
        });
    };

    // Keep track of processed images to avoid refetching heavily
    // In a real script we might need better caching or just fetch on demand.

    const updateStats = () => {
        // Disconnect to avoid loops
        observer.disconnect();

        try {
            const userTurns = document.querySelectorAll(SELECTORS.userTurn);
            const modelTurns = document.querySelectorAll(SELECTORS.modelTurn);

            // Update Badge
            if (badgeSpan) {
                badgeSpan.textContent = modelTurns.length;
                // Optional: Hide badge if 0? 
                // badgeSpan.style.display = modelTurns.length > 0 ? 'block' : 'none';
            }

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
            let totalCodeBlocks = 0;
            let totalTables = 0;

            modelTurns.forEach(turn => {
                // Model text selector is tricky, it usually contains many nested elements.
                // We'll try to grab the main container text for now.
                // Refinement: exclude 'sources' or other meta info if possible.
                modelCharCount += getTextContentLength(turn);

                // Count Code Blocks
                const logs = turn.querySelectorAll(SELECTORS.codeBlock);
                totalCodeBlocks += logs.length;

                // Count Tables
                const tables = turn.querySelectorAll(SELECTORS.tableBlock);
                totalTables += tables.length;
            });

            const imageCount = collectedImages.length;
            const thumbnailsHtml = imageCount > 0
                ? `<div class="gtc-thumbnails">
                    ${collectedImages.map(url => `<img src="${url}" class="gtc-thumbnail" />`).join('')}
                   </div>`
                : '';

            setInnerHTML(contentDiv, `
                <div style="margin-bottom: 8px; font-weight: bold; border-bottom:1px solid #555; padding-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                    <span>Gemini Turns</span>
                    <span style="font-size:10px; font-weight:normal; opacity:0.7;">v0.1.8</span>
                </div>
                <div class="gtc-row"><span>User:</span> <span class="gtc-val">${userTurns.length} (${userCharCount.toLocaleString()})</span></div>
                <div class="gtc-row"><span>Model:</span> <span class="gtc-val">${modelTurns.length} (${modelCharCount.toLocaleString()})</span></div>
                <div class="gtc-row" style="border-top:1px solid #444; margin-top:4px; padding-top:4px;"></div>
                <div class="gtc-row">
                     <span>Code Blocks:</span> <span class="gtc-val">${totalCodeBlocks}</span>
                </div>
                <div class="gtc-row">
                     <span>Tables:</span> <span class="gtc-val">${totalTables}</span>
                </div>
                <div class="gtc-row">
                    <span>Images:</span> 
                    <span>
                        <span class="gtc-val">${imageCount}</span>
                        ${imageCount > 0 ?
                    `<button id="gtc-copy-all" style="margin-left: 8px; padding: 2px 6px; font-size: 11px; cursor: pointer;">Copy</button>
                                 <span id="gtc-copy-status"></span>`
                    : ''}
                    </span>
                </div>
                ${imageCount > 0 ? `
                <div class="gtc-setting-row">
                    <input type="checkbox" id="gtc-height-enable" checked style="margin: 0; vertical-align: middle;">
                    <label for="gtc-height-enable" style="cursor: pointer; vertical-align: middle;">Max Height:</label>
                    <input type="number" id="gtc-height-input" value="200" class="gtc-input"> px
                </div>` : ''}
                ${thumbnailsHtml}
            `);

            // Attach Copy All event
            const copyBtn = contentDiv.querySelector('#gtc-copy-all');
            const statusSpan = contentDiv.querySelector('#gtc-copy-status');
            const heightEnable = contentDiv.querySelector('#gtc-height-enable');
            const heightInput = contentDiv.querySelector('#gtc-height-input');

            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyBtn.textContent = '...';
                    if (statusSpan) statusSpan.textContent = '0/' + collectedImages.length;

                    const useHeightLimit = heightEnable ? heightEnable.checked : false;
                    const heightLimit = heightInput ? heightInput.value : 200;

                    // Use Promise-based ClipboardItem construction to prevent "Document is not focused" error
                    const clipboardPromise = (async () => {
                        try {
                            const imgTags = [];
                            let processedCount = 0;

                            const promises = collectedImages.map(async (url) => {
                                const dataUri = await fetchImageData(url);
                                processedCount++;
                                if (statusSpan) statusSpan.textContent = `${processedCount}/${collectedImages.length}`;

                                let imgTag = '';
                                if (dataUri) {
                                    const styleAttr = useHeightLimit ? ` style="max-height: ${heightLimit}px;"` : '';
                                    imgTag = `<img src="${dataUri}"${styleAttr} />`;
                                }
                                return imgTag;
                            });

                            const results = await Promise.all(promises);
                            const htmlToCopy = results.join('');

                            if (statusSpan) statusSpan.textContent = `${htmlToCopy.length} chars`;

                            return new Blob([htmlToCopy], { type: "text/html" });
                        } catch (err) {
                            console.error('Image processing failed', err);
                            if (statusSpan) statusSpan.textContent = 'Err';
                            throw err;
                        }
                    })();

                    const item = new ClipboardItem({ "text/html": clipboardPromise });
                    navigator.clipboard.write([item]).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                            if (statusSpan && !statusSpan.textContent.includes('chars')) statusSpan.textContent = '';
                        }, 3000);
                    }).catch(err => {
                        console.error('Clipboard write failed:', err);
                        copyBtn.textContent = 'Err';
                    });
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
