// ==UserScript==
// @name         ChatGPT Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.2.0
// @description  Count user/assistant turns, images, and code blocks in ChatGPT
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://chatgpt.com/c/*
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
        .ctc-thumbnails {
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #565869;
        }
        .ctc-thumbnail {
            width: 20px;
            height: 20px;
            object-fit: cover;
            border-radius: 2px;
            border: 1px solid #565869;
            cursor: copy;
            transition: all 0.2s ease;
        }
        .ctc-thumbnail.copied {
            border: 2px solid red;
        }
        #ctc-tooltip {
            position: fixed;
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10000;
            white-space: nowrap;
            display: none;
            border: 1px solid #565869;
        }
    `;
    document.head.appendChild(style);

    // Create UI container
    const container = document.createElement('div');
    container.id = 'chatgpt-turn-counter-ui';

    // Create Tooltip container
    const tooltip = document.createElement('div');
    tooltip.id = 'ctc-tooltip';
    document.body.appendChild(tooltip);

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

    // Event Listeners for main container
    container.addEventListener('click', (e) => {
        // Prevent collapsing when interacting with inner elements if necessary
        // But for this current design, click expands it.
        container.classList.add('expanded');
    });

    container.addEventListener('mouseleave', () => {
        container.classList.remove('expanded');
        hideTooltip(); // Hide tooltip if we leave the container
    });

    // Thumbnail Hover & Click Logic
    let hoverTimeout = null;

    const showTooltip = (text, x, y) => {
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        tooltip.style.left = x + 10 + 'px';
        tooltip.style.top = y + 10 + 'px';
    };

    const hideTooltip = () => {
        tooltip.style.display = 'none';
        clearTimeout(hoverTimeout);
    };

    const fetchImageData = async (src) => {
        try {
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

    const copyToClipboard = (htmlStr) => {
        const type = "text/html";
        const blob = new Blob([htmlStr], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        navigator.clipboard.write(data).catch(console.error);
    };

    // Event Delegation for Thumbnails
    container.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('ctc-thumbnail')) {
            const img = e.target;

            // Debounce the tooltip showing
            hoverTimeout = setTimeout(async () => {
                const dataUri = await fetchImageData(img.src);
                if (dataUri) {
                    const sizeBytes = dataUri.length;
                    showTooltip(`DataURI: ${sizeBytes.toLocaleString()} bytes`, e.clientX, e.clientY);
                } else {
                    showTooltip('Failed to load data', e.clientX, e.clientY);
                }
            }, 500); // 500ms delay
        }
    });

    container.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('ctc-thumbnail')) {
            hideTooltip();
        }
    });

    container.addEventListener('mousemove', (e) => {
        if (e.target.classList.contains('ctc-thumbnail') && tooltip.style.display === 'block') {
            // Optional: make tooltip follow cursor?
            // For now, let's keep it simple fixed position from entry or update it.
            // Updating it might be better UX
            tooltip.style.left = e.clientX + 10 + 'px';
            tooltip.style.top = e.clientY + 10 + 'px';
        }
    });

    container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('ctc-thumbnail')) {
            e.stopPropagation(); // Prevent container click event if needed (though bubbling usually fine here for 'expand')

            const img = e.target;
            const dataUri = await fetchImageData(img.src);

            if (dataUri) {
                const imgTag = `<img src="${dataUri}" />`;
                copyToClipboard(imgTag);

                // Visual feedback
                img.classList.add('copied');
                // Remove feedback after a delay if desired, or keep it per requirements?
                // Requirement said "enclose with red line", relying on class.
                // Assuming permanent until refreshed or clicked another? 
                // Let's keep it.
            }
        }
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
        const imageUrls = [];

        userTurns.forEach(turn => {
            const imgs = turn.querySelectorAll('img');
            // Filter out user profile pictures if necessary (usually they have alt or specific classes, but simplicity first)
            // In ChatGPT, user uploaded images are usually in specific containers.
            // But 'img' selector is broad. Note: User avatar is also an img.
            // Let's rely on standard structure. Usually user images are large or in attachments.
            // For now, simplistic approach from previous version is maintained.

            imgs.forEach(img => {
                // simple heuristic to avoid 20px avatars if possible, or just include all
                if (img.width > 50 || img.naturalWidth > 50) {
                    // This might be risky if images aren't loaded yet.
                    // Let's just collect them all for now as per previous logic
                    // Previous logic: count += imgs.length
                }
                if (img.alt !== "User") { // Skip user avatar if it has alt="User" (common in some versions)
                    imageUrls.push(img.src);
                }
            });
            imageCount = imageUrls.length;

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

        const thumbnailsHtml = imageUrls.length > 0
            ? `<div class="ctc-thumbnails">
                ${imageUrls.map(url => `<img src="${url}" class="ctc-thumbnail" />`).join('')}
               </div>`
            : '';

        contentDiv.innerHTML = `
            <div style="margin-bottom: 4px; font-weight: bold;">Turn Counter</div>
            <div class="ctc-row"><span>User:</span> <span class="ctc-val">${userTurns.length} (${userCharCount.toLocaleString()} chars)</span></div>
            <div class="ctc-row"><span>Assistant:</span> <span class="ctc-val">${assistantTurns.length} (${assistantCharCount.toLocaleString()} chars)</span></div>
            <div class="ctc-row"><span>Code Blocks:</span> <span class="ctc-val">${codeBlockCount}</span></div>
            <div class="ctc-row">
                <span>Images:</span> 
                <span>
                    <span class="ctc-val">${imageCount}</span>
                    <button id="ctc-copy-all" style="margin-left: 8px; padding: 2px 6px; font-size: 11px; background: #444654; border: 1px solid #565869; color: #ececf1; border-radius: 4px; cursor: pointer;">Copy All</button>
                </span>
            </div>
            ${thumbnailsHtml}
        `;

        // Reconnect observer
        observer.observe(document.body, { childList: true, subtree: true });

        // Add Copy All listener (needs to be re-added since innerHTML replaced)
        const copyAllBtn = contentDiv.querySelector('#ctc-copy-all');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                copyAllBtn.disabled = true;
                const originalText = copyAllBtn.textContent;
                copyAllBtn.textContent = '...';

                const thumbnails = Array.from(contentDiv.querySelectorAll('.ctc-thumbnail'));
                if (thumbnails.length === 0) {
                    copyAllBtn.textContent = 'No images';
                    setTimeout(() => {
                        copyAllBtn.textContent = originalText;
                        copyAllBtn.disabled = false;
                    }, 2000);
                    return;
                }

                try {
                    const imgTags = await Promise.all(thumbnails.map(async (img) => {
                        const dataUri = await fetchImageData(img.src);
                        return dataUri ? `<img src="${dataUri}" />` : '';
                    }));

                    const validTags = imgTags.filter(tag => tag).join('');
                    if (validTags) {
                        copyToClipboard(validTags);
                        copyAllBtn.textContent = 'Copied!';
                    } else {
                        copyAllBtn.textContent = 'Failed';
                    }
                } catch (err) {
                    console.error('Copy all failed:', err);
                    copyAllBtn.textContent = 'Error';
                }

                setTimeout(() => {
                    copyAllBtn.textContent = originalText;
                    copyAllBtn.disabled = false;
                }, 2000);
            });
        }
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
