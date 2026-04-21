// ==UserScript==
// @name         Gemini Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.4.69
// @lastModified 2026-04-20
// @history       0.4.69 Implemented auto-copy for images on chat change or page exit; removed manual copy UI.
// @history       0.4.68 Refactored runDeepScan to use window.geminiLoadFullChatHistory and window.geminiProgressiveScrollDown from gemini-common.js.
// @history       0.4.67 Removed backward-compatible gemini-history-loader listener from gemini-common.js.
// @description  Count user/model turns, images, and characters in Google Gemini. Features a Deep Scan mode for long conversations.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     geminiTurnCounterCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.css
// @resource     geminiTurnCounterHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function () {
    'use strict';
    const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    if (location.hostname === 'userscript.moukaeritai.work') {
        return;
    }
    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const policy = window.geminiCreateTrustedHTMLPolicy('geminiTurnCounter');
    const PANEL_ID = 'gemini-turn-counter-ui';
    const CHAT_PAGE_PATTERN = /^\/(?:app|gem)(?:\/|$)/;
    // Removed initial URL check as it will be handled dynamically

    // Settings
    const SELECTORS = {
        userTurn: 'user-query',
        modelTurn: 'model-response',
        // User image selector based on attributes, excluding profile pictures (avatars)
        userImage: 'img[data-test-id="uploaded-img"]',
        // Text content selectors (broad approximation, refinement needed)
        userText: '.query-text',
        modelText: '.model-response-text, .response-content', // Needs verification on whole-dom
        // Code block selector (based on samples/code-block.html)
        codeBlock: 'code-block',
        // Table selector (based on samples/table-block.html)
        tableBlock: 'table-block', // or 'table' inside model response
        // Artifact selector
        artifact: 'immersive-entry-chip, entry-chip',
        // Product integrations and Maps (Link Cards)
        linkCard: '.list-item-container.link, yt-core-attributed-string, [data-test-id="link-preview"], a.link[href*="google.com/maps"]',
        // Model generated images
        modelImage: 'button.image-button img',
        // Thinking process blocks
        thinkingBlock: 'thinking-block, thought-chip'
    };

    // --- State Management ---
    let mainObserver = null;
    let isInitialized = false;
    let uiContainer = null; // Store reference to the main UI container
    let updateStatsTimeout = null;
    let isDeepScanning = false; // Flag to pause auto-updating during manual deep scan

    // --- Auto-Copy State ---
    let preparedHtmlString = "";
    let preparedImagesHash = "";
    let lastCopiedImagesHash = "";
    let isPreparing = false;
    let lastChatId = "";

    // Trusted Types Policy Creation

    // Helper to safely set innerHTML


    // Inject CSS styles
    function addStyles() {
        // Inject shared common styles
        const commonCSS = GM_getResourceText('geminiCommon');
        if (commonCSS && !document.getElementById('gemini-common-styles')) {
            const commonStyle = document.createElement('style');
            commonStyle.textContent = commonCSS;
            commonStyle.id = 'gemini-common-styles';
            document.head.appendChild(commonStyle);
        }

        const css = GM_getResourceText('geminiTurnCounterCSS');
        const style = GM_addStyle(css);
        if (style) {
            style.id = 'gemini-turn-counter-style';
            return style;
        } else {
            const el = document.querySelector('style:last-of-type');
            if (el) el.id = 'gemini-turn-counter-style';
            return el;
        }
    }

    // Create UI container
    // Removed direct UI creation, moved to initMainFunctionality

    // UI Events
    // Moved to initMainFunctionality

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
    const getImagesHash = (images) => {
        return images.map(img => img.src).join('|');
    };

    /**
     * Internal image-to-HTML helper for background preparation
     * @param {Array} targetImages - Array of {src, type} objects
     * @param {number|boolean} heightLimit - Max height limit, or false/0 for no limit
     * @returns {Promise<string>}
     */
    const prepareImagesHtml = async (targetImages, heightLimit = 200) => {
        if (!targetImages || targetImages.length === 0) return "";

        const promises = targetImages.map(async (imgData) => {
            const dataUri = await fetchImageData(imgData.src);
            if (dataUri) {
                const styleAttr = heightLimit ? ` style="max-height: ${heightLimit}px;"` : '';
                return `<img src="${dataUri}"${styleAttr} data-source-type="${imgData.type}" />`;
            }
            return '';
        });

        const results = await Promise.all(promises);
        return results.join('');
    };

    const triggerAutoCopy = () => {
        if (!preparedHtmlString || preparedImagesHash === "") return;
        if (preparedImagesHash === lastCopiedImagesHash) return;

        try {
            GM_setClipboard(preparedHtmlString, 'html');
            console.log('[Gemini Turn Counter] Auto-copied images to clipboard.');
            lastCopiedImagesHash = preparedImagesHash;
        } catch (err) {
            console.error('[Gemini Turn Counter] Auto-copy failed:', err);
        }
    };

    const prepareAutoCopyData = async (images) => {
        const hash = getImagesHash(images);
        if (hash === preparedImagesHash || isPreparing) return;

        isPreparing = true;
        try {
            const html = await prepareImagesHtml(images, 200);
            preparedHtmlString = html;
            preparedImagesHash = hash;
            console.log('[Gemini Turn Counter] Background preparation complete.');
        } catch (err) {
            console.error('[Gemini Turn Counter] Preparation failed:', err);
        } finally {
            isPreparing = false;
        }
    };

    const updateStats = (forceUpdate = false, overrideData = null) => {
        if (isDeepScanning && !forceUpdate) return; // Ignore mutations during deep scan

        // Disconnect to avoid loops
        if (mainObserver) mainObserver.disconnect();

        try {
            let userTurnsCount = 0, modelTurnsCount = 0;
            let userCharCount = 0, modelCharCount = 0;
            let totalArtifacts = 0, totalLinkCards = 0, totalCodeBlocks = 0, totalTables = 0, totalThinkingBlocks = 0;
            let collectedImages = [];

            if (overrideData) {
                // Use data collected from deep scan
                userTurnsCount = overrideData.userTurnsCount;
                modelTurnsCount = overrideData.modelTurnsCount;
                userCharCount = overrideData.userCharCount;
                modelCharCount = overrideData.modelCharCount;
                totalArtifacts = overrideData.totalArtifacts;
                totalLinkCards = overrideData.totalLinkCards;
                totalCodeBlocks = overrideData.totalCodeBlocks;
                totalTables = overrideData.totalTables;
                totalThinkingBlocks = overrideData.totalThinkingBlocks;
                collectedImages = overrideData.collectedImages;
            } else {
                // Standard observable window scrape
                const userTurns = document.querySelectorAll(SELECTORS.userTurn);
                const modelTurns = document.querySelectorAll(SELECTORS.modelTurn);
                userTurnsCount = userTurns.length;
                modelTurnsCount = modelTurns.length;

                userTurns.forEach(turn => {
                    const textNodes = turn.querySelectorAll(SELECTORS.userText);
                    textNodes.forEach(node => { userCharCount += getTextContentLength(node); });
                    const imgs = turn.querySelectorAll(SELECTORS.userImage);
                    imgs.forEach(img => { collectedImages.push({ src: img.src, type: 'user' }); });
                });

                modelTurns.forEach(turn => {
                    modelCharCount += getTextContentLength(turn);
                    totalCodeBlocks += turn.querySelectorAll(SELECTORS.codeBlock).length;
                    totalTables += turn.querySelectorAll(SELECTORS.tableBlock).length;
                    totalArtifacts += turn.querySelectorAll(SELECTORS.artifact).length;
                    totalLinkCards += turn.querySelectorAll(SELECTORS.linkCard).length;
                    totalThinkingBlocks += turn.querySelectorAll(SELECTORS.thinkingBlock).length;

                    const modelImgs = turn.querySelectorAll(SELECTORS.modelImage);
                    modelImgs.forEach(img => { collectedImages.push({ src: img.src, type: 'model' }); });
                });
            }

            // Get UI container elements
            const container = document.getElementById(PANEL_ID);
            if (!container) return; // Should not happen if initialized correctly

            const contentDiv = container.querySelector('.gtc-content');

            if (!overrideData) {
                const userTurns = document.querySelectorAll(SELECTORS.userTurn);
                userTurns.forEach(turn => {
                    // Text count
                    const textNodes = turn.querySelectorAll(SELECTORS.userText);
                    textNodes.forEach(node => {
                        userCharCount += getTextContentLength(node);
                    });

                    // Note: image count is already collected globally above, doing it again here causes duplicate counts
                });

                const modelTurns = document.querySelectorAll(SELECTORS.modelTurn);
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

                    // Count Artifacts
                    const artifacts = turn.querySelectorAll(SELECTORS.artifact);
                    totalArtifacts += artifacts.length;

                    // Count Link Cards
                    const linkCards = turn.querySelectorAll(SELECTORS.linkCard);
                    totalLinkCards += linkCards.length;

                    // Count Thinking Blocks
                    const thinkingBlocks = turn.querySelectorAll(SELECTORS.thinkingBlock);
                    totalThinkingBlocks += thinkingBlocks.length;

                    // Note: model images already collected globally above
                });
            }

            // Update stats logic completed for this turn
            const imageCount = collectedImages.length;

            if (imageCount > 0) {
                prepareAutoCopyData(collectedImages);
            }

            if (!contentDiv.hasAttribute('data-gtc-initialized')) {
                const template = GM_getResourceText('geminiTurnCounterHTML');
                window.geminiSetInnerHTML(contentDiv, template, policy);
                contentDiv.setAttribute('data-gtc-initialized', 'true');

                const deepScanBtn = document.getElementById('gtc-deep-scan-btn');
                if (deepScanBtn) {
                    deepScanBtn.addEventListener('click', runDeepScan);
                }
            }

            const getThumbnailStyling = (type) => {
                return type === 'model' ? 'border: 2px solid #a8c7fa;' : '';
            };

            // --- Update UI Text Nodes and Visibilities ---
            contentDiv.querySelector('#gtc-val-user').textContent = `${userTurnsCount} (${userCharCount.toLocaleString()})`;
            contentDiv.querySelector('#gtc-val-model').textContent = `${modelTurnsCount} (${modelCharCount.toLocaleString()})`;
            contentDiv.querySelector('#gtc-val-artifacts').textContent = totalArtifacts;
            contentDiv.querySelector('#gtc-val-linkcards').textContent = totalLinkCards;
            contentDiv.querySelector('#gtc-val-codeblocks').textContent = totalCodeBlocks;
            contentDiv.querySelector('#gtc-val-tables').textContent = totalTables;

            const thinkingRow = contentDiv.querySelector('#gtc-row-thinking');
            if (thinkingRow) {
                thinkingRow.style.display = totalThinkingBlocks > 0 ? 'flex' : 'none';
                contentDiv.querySelector('#gtc-val-thinking').textContent = totalThinkingBlocks;
            }

            const userImagesCount = collectedImages.filter(i => i.type === 'user').length;
            const modelImagesCount = collectedImages.filter(i => i.type === 'model').length;
            contentDiv.querySelector('#gtc-val-images-ratio').textContent = `${userImagesCount}:${modelImagesCount}`;

            const thumbnailsContainer = contentDiv.querySelector('#gtc-thumbnails-container');
            if (imageCount > 0) {
                const thumbnailsHtml = `<div class="gtc-thumbnails">
                            ${collectedImages.map(imgData => `<img src="${imgData.src}" class="gtc-thumbnail" style="${getThumbnailStyling(imgData.type)}" title="${imgData.type} image" />`).join('')}
                           </div>`;
                window.geminiSetInnerHTML(thumbnailsContainer, thumbnailsHtml, policy);
            } else {
                thumbnailsContainer.textContent = '';
            }

        } finally {
            if (mainObserver && !isDeepScanning) mainObserver.observe(document.body, { childList: true, subtree: true });
        }
    };

    /**
     * Executes a deep scan of the conversation by scrolling up and down,
     * collecting all components deduplicated by hash/IDs.
     */
    async function runDeepScan() {
        if (isDeepScanning) return;
        isDeepScanning = true;

        const scanBtn = document.getElementById('gtc-deep-scan-btn');
        const statusEl = document.getElementById('gtc-scan-status');
        if (scanBtn) scanBtn.disabled = true;

        const setStatus = (msg) => {
            if (statusEl) statusEl.textContent = msg;
            console.log('[GTC Deep Scan]', msg);
        };

        try {
            setStatus("Preparing scan...");

            // --- Phase 1: Ascent ---
            const loadResult = await window.geminiLoadFullChatHistory({
                onProgress: (status, detail) => setStatus(`${status}\n${detail}`),
                closeOtherPanels: true
            });

            if (!loadResult.success) {
                console.warn('[GTC Deep Scan] Ascent encountered issues:', loadResult.reason);
            }

            // --- Phase 2: Descent and Collection ---
            setStatus("Descending and collecting...");

            // Deduplication structures
            const seenUserTurns = new Set();
            const seenModelTurns = new Set();
            const seenArtifacts = new Set();
            const seenLinkCards = new Set();
            const seenCodeBlocks = new Set();
            const seenTables = new Set();
            const seenThinkingBlocks = new Set();
            const seenImages = new Set();

            const overrideData = {
                userTurnsCount: 0, modelTurnsCount: 0,
                userCharCount: 0, modelCharCount: 0,
                totalArtifacts: 0, totalLinkCards: 0,
                totalCodeBlocks: 0, totalTables: 0, totalThinkingBlocks: 0,
                collectedImages: []
            };

            const getHash = (el) => {
                if (el.id) return el.id;
                const t = el.textContent.replace(/\s+/g, ' ').trim().substring(0, 50);
                return t.length > 0 ? t : Math.random().toString();
            };

            await window.geminiProgressiveScrollDown({
                onProgress: (status, detail) => setStatus(detail),
                onStep: async () => {
                    // Collect current view data
                    document.querySelectorAll(SELECTORS.userTurn).forEach(turn => {
                        const hash = getHash(turn);
                        if (!seenUserTurns.has(hash)) {
                            seenUserTurns.add(hash);
                            overrideData.userTurnsCount++;
                            turn.querySelectorAll(SELECTORS.userText).forEach(node => {
                                overrideData.userCharCount += getTextContentLength(node);
                            });
                            turn.querySelectorAll(SELECTORS.userImage).forEach(img => {
                                if (!seenImages.has(img.src)) {
                                    seenImages.add(img.src);
                                    overrideData.collectedImages.push({ src: img.src, type: 'user' });
                                }
                            });
                        }
                    });

                    document.querySelectorAll(SELECTORS.modelTurn).forEach(turn => {
                        const hash = getHash(turn);
                        if (!seenModelTurns.has(hash)) {
                            seenModelTurns.add(hash);
                            overrideData.modelTurnsCount++;
                            overrideData.modelCharCount += getTextContentLength(turn);

                            turn.querySelectorAll(SELECTORS.codeBlock).forEach(cb => {
                                const cbHash = getHash(cb);
                                if (!seenCodeBlocks.has(cbHash)) { seenCodeBlocks.add(cbHash); overrideData.totalCodeBlocks++; }
                            });
                            turn.querySelectorAll(SELECTORS.tableBlock).forEach(tb => {
                                const tbHash = getHash(tb);
                                if (!seenTables.has(tbHash)) { seenTables.add(tbHash); overrideData.totalTables++; }
                            });
                            turn.querySelectorAll(SELECTORS.artifact).forEach(ar => {
                                const arHash = getHash(ar);
                                if (!seenArtifacts.has(arHash)) { seenArtifacts.add(arHash); overrideData.totalArtifacts++; }
                            });
                            turn.querySelectorAll(SELECTORS.linkCard).forEach(lc => {
                                const lcHash = getHash(lc);
                                if (!seenLinkCards.has(lcHash)) { seenLinkCards.add(lcHash); overrideData.totalLinkCards++; }
                            });
                            turn.querySelectorAll(SELECTORS.thinkingBlock).forEach(tk => {
                                const tkHash = getHash(tk);
                                if (!seenThinkingBlocks.has(tkHash)) { seenThinkingBlocks.add(tkHash); overrideData.totalThinkingBlocks++; }
                            });
                            turn.querySelectorAll(SELECTORS.modelImage).forEach(img => {
                                if (!seenImages.has(img.src)) {
                                    seenImages.add(img.src);
                                    overrideData.collectedImages.push({ src: img.src, type: 'model' });
                                }
                            });
                        }
                    });
                }
            });

            setStatus("Scan complete!");
            await window.geminiSleep(1000);
            setStatus("");

            // Push the collected deep scan data to updateStats
            updateStats(true, overrideData);

        } catch (error) {
            console.error('[GTC Deep Scan] Fatal error during scan:', error);
            setStatus("Scan failed.");
        } finally {
            if (scanBtn) scanBtn.disabled = false;
            isDeepScanning = false;
            // Re-attach observer
            if (mainObserver) mainObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    /**
     * Main initialization for the script's features.
     */
    function initMainFunctionality() {
        const existingPanel = document.getElementById(PANEL_ID);

        if (isInitialized && uiContainer && uiContainer === existingPanel) {
            return;
        }
        console.log('[Gemini Turn Counter] Initializing...');

        addStyles();

        if (existingPanel) {
            uiContainer = existingPanel;
        } else {
            // Create inner content wrapper
            const contentDiv = document.createElement('div');
            contentDiv.className = 'gtc-content';
            contentDiv.textContent = 'Loading...';

            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            const panelShell = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panelShell.id = PANEL_ID;
            document.body.appendChild(panelShell);
            uiContainer = panelShell;

            const dragHandle = panelShell.querySelector('.gus-panel-header');
            const inactiveHandle = panelShell.querySelector('.gus-inactive-content');
            if (inactiveHandle) {
                window.geminiSetupDraggablePanel(panelShell, inactiveHandle, 'gtc-pos-ui', { right: '20px', top: '160px', left: 'auto' });
            }
            if (dragHandle) {
                window.geminiSetupDraggablePanel(panelShell, dragHandle, 'gtc-pos-ui', { right: '20px', top: '160px', left: 'auto' });
            }

            // Set up minimizable panel using double-click on title
            window.geminiSetupMinimizablePanel(panelShell, 'gtc-minimized', dragHandle, true);

            // Restore state (position)
            const savedX = localStorage.getItem('gtc-pos-x');
            const savedY = localStorage.getItem('gtc-pos-y');
            if (savedX && savedY) {
                panelShell.style.right = 'auto';
                panelShell.style.left = savedX;
                panelShell.style.top = savedY;
            }

            // Global trigger for page exit
            window.addEventListener('beforeunload', triggerAutoCopy);
            lastChatId = (location.pathname.match(CHAT_PAGE_PATTERN) || [])[0] || "";
        }

        // Initial run
        setTimeout(updateStats, 500); // Wait a bit for initial load

        if (mainObserver) {
            mainObserver.disconnect();
        }
        mainObserver = new MutationObserver((_mutations) => {
            if (updateStatsTimeout) {
                clearTimeout(updateStatsTimeout);
            }
            updateStatsTimeout = setTimeout(updateStats, 300); // 300ms debounce
        });
        mainObserver.observe(document.body, { childList: true, subtree: true });

        isInitialized = true;
    }

    /**
     * Cleans up all injected elements, observers, and listeners.
     */
    function cleanup() {
        const existingPanel = uiContainer || document.getElementById(PANEL_ID);
        if (!isInitialized && !existingPanel && !mainObserver && !updateStatsTimeout) return;
        console.log('[Gemini Turn Counter] Cleaning up...');

        if (mainObserver) {
            mainObserver.disconnect();
            mainObserver = null;
        }
        if (updateStatsTimeout) {
            clearTimeout(updateStatsTimeout);
            updateStatsTimeout = null;
        }
        if (existingPanel) {
            existingPanel.remove();
        }
        uiContainer = null;
        isDeepScanning = false;
        isInitialized = false;
    }

    /**
     * Checks the URL and runs init or cleanup accordingly.
     */
    function checkUrlAndManageScriptState() {
        const isChatPage = CHAT_PAGE_PATTERN.test(location.pathname);

        if (isChatPage) {
            initMainFunctionality();
        } else {
            cleanup();
        }
    }

    // --- Entry Point ---
    // Use the modern Navigation API for efficient, event-driven SPA routing detection.
    // Fallback to a lightweight setInterval for unsupported browser environments.

    let lastUrl = location.href;

    function handleUrlChange() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('[Gemini Turn Counter] URL changed:', location.href);

            // Check if Chat ID changed
            const newChatMatch = location.pathname.match(/\/app\/([a-z0-9]+)/);
            const newChatId = newChatMatch ? newChatMatch[1] : "";
            
            if (newChatId !== lastChatId && lastChatId !== "") {
                console.log('[Gemini Turn Counter] Chat ID changed. Triggering auto-copy.');
                triggerAutoCopy();
            }
            lastChatId = newChatId;

            // Delay slightly to ensure the new DOM is partially rendered before initialization
            setTimeout(checkUrlAndManageScriptState, 500);
        }
    }

    if (window.navigation) {
        // Modern approach: Extremely performant, fired only on navigation events
        window.navigation.addEventListener('navigatesuccess', () => {
            handleUrlChange();
        });
        console.log('[Gemini Turn Counter] Using Navigation API for SPA routing.');
    } else {
        // Fallback: Extremely lightweight URL comparison poll (microseconds impact)
        setInterval(handleUrlChange, 500);
        console.log('[Gemini Turn Counter] Using setInterval fallback for SPA routing.');
    }

    if (document.readyState === 'complete') {
        checkUrlAndManageScriptState();
    } else {
        window.addEventListener('load', checkUrlAndManageScriptState, { once: true });
    }
})();
