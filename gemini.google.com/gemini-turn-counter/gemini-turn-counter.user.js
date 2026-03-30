// ==UserScript==
// @name         Gemini Turn Counter
// @namespace    userscript.moukaeritai.work
// @version      0.4.44
// @lastModified 2026-03-30
// @description  Count user/model turns, images, and characters in Google Gemini. Features a Deep Scan mode for long conversations.
// @author       Takashi Sasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     customCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/style.css
// @resource     templateHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
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

    const initUserScript = () => {
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

            const css = GM_getResourceText('customCSS');
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

        // Keep track of processed images to avoid refetching heavily
        // In a real script we might need better caching or just fetch on demand.

        // Global reference for external access
        let latestCollectedImages = [];

        /**
         * Reusable image-to-clipboard function
         * @param {Array} targetImages - Array of {src, type} objects
         * @param {number|boolean} heightLimit - Max height limit, or false/0 for no limit
         * @param {HTMLElement} [statusSpan] - Optional element to output progress
         * @returns {Promise<Blob>}
         */
        const copyImagesToHtmlClipboard = async (targetImages, heightLimit = false, statusSpan = null) => {
            if (!targetImages || targetImages.length === 0) throw new Error("No images to copy");

            let processedCount = 0;
            const promises = targetImages.map(async (imgData) => {
                const dataUri = await fetchImageData(imgData.src);
                processedCount++;
                if (statusSpan) statusSpan.textContent = `${processedCount}/${targetImages.length}`;

                let imgTag = '';
                if (dataUri) {
                    const styleAttr = heightLimit ? ` style="max-height: ${heightLimit}px;"` : '';
                    imgTag = `<img src="${dataUri}"${styleAttr} data-source-type="${imgData.type}" />`;
                }
                return imgTag;
            });

            const results = await Promise.all(promises);
            const htmlToCopy = results.join('');

            if (statusSpan) statusSpan.textContent = `${htmlToCopy.length} chars`;

            return new Blob([htmlToCopy], { type: "text/html" });
        };

        // --- Custom Event Listener for Data Request ---
        document.addEventListener('gemini-turn-counter-copy-images', (e) => {
            const { target = 'all', maxHeight = 200 } = e.detail || {};

            let targetImages = latestCollectedImages;
            if (target === 'user') {
                targetImages = latestCollectedImages.filter(i => i.type === 'user');
            } else if (target === 'model') {
                targetImages = latestCollectedImages.filter(i => i.type === 'model');
            }

            if (targetImages.length === 0) {
                document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images-result', {
                    detail: { success: false, message: 'No images found for target: ' + target }
                }));
                return;
            }

            // To comply with User Gesture constraints for clipboard API, the CustomEvent
            // MUST be dispatched synchronously during a user gesture (e.g. click).
            const clipboardPromise = copyImagesToHtmlClipboard(targetImages, maxHeight);
            const item = new ClipboardItem({ "text/html": clipboardPromise });

            navigator.clipboard.write([item]).then(() => {
                document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images-result', {
                    detail: { success: true, count: targetImages.length }
                }));
            }).catch(err => {
                console.error('Gemini Turn Counter: External Clipboard write failed:', err);
                document.dispatchEvent(new CustomEvent('gemini-turn-counter-copy-images-result', {
                    detail: { success: false, error: err.toString() }
                }));
            });
        });

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
                const container = document.getElementById('gemini-turn-counter-ui');
                if (!container) return; // Should not happen if initialized correctly

                const iconDiv = container.querySelector('.gtc-icon');
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

                // Update global reference
                latestCollectedImages = collectedImages;

                const imageCount = collectedImages.length;
                const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '0.4.31';

                if (iconDiv) {
                    iconDiv.textContent = `${gusEmoji}v${scriptVersion} | U:${userTurnsCount} M:${modelTurnsCount} A:${totalArtifacts} L:${totalLinkCards}`;
                    iconDiv.title = 'Gemini Turn Counter';
                }

                if (!contentDiv.hasAttribute('data-gtc-initialized')) {
                    const template = GM_getResourceText('templateHTML');
                    setInnerHTML(contentDiv, template.replace('{{scriptVersion}}', `${gusEmoji}${scriptVersion}`));
                    contentDiv.setAttribute('data-gtc-initialized', 'true');

                    // --- Initial Event Binding (Only Once) ---
                    const copyBtnU = contentDiv.querySelector('#gtc-copy-user');
                    const copyBtnM = contentDiv.querySelector('#gtc-copy-model');
                    const copyBtnAll = contentDiv.querySelector('#gtc-copy-all');
                    const statusSpan = contentDiv.querySelector('#gtc-copy-status');
                    const heightEnable = contentDiv.querySelector('#gtc-height-enable');
                    const heightInput = contentDiv.querySelector('#gtc-height-input');

                    const bindCopyEvent = (btn, originalLabel, typeFilter) => {
                        if (!btn) return;
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Dynamically evaluate targetImages when clicked
                            let targetImages = latestCollectedImages;
                            if (typeFilter) {
                                targetImages = targetImages.filter(i => i.type === typeFilter);
                            }

                            if (targetImages.length === 0) return;

                            btn.textContent = '...';
                            if (statusSpan) statusSpan.textContent = '0/' + targetImages.length;

                            const useHeightLimit = heightEnable ? heightEnable.checked : false;
                            const heightLimit = useHeightLimit && heightInput ? heightInput.value : false;

                            const clipboardPromise = copyImagesToHtmlClipboard(targetImages, heightLimit, statusSpan)
                                .catch(err => {
                                    console.error('Image processing failed', err);
                                    if (statusSpan) statusSpan.textContent = 'Err';
                                    throw err;
                                });

                            const item = new ClipboardItem({ "text/html": clipboardPromise });
                            navigator.clipboard.write([item]).then(() => {
                                btn.textContent = 'Copied!';
                                setTimeout(() => {
                                    btn.textContent = originalLabel;
                                    if (statusSpan && !statusSpan.textContent.includes('chars')) statusSpan.textContent = '';
                                }, 3000);
                            }).catch(err => {
                                console.error('Clipboard write failed:', err);
                                btn.textContent = 'Err';
                            });
                        });
                    };

                    bindCopyEvent(copyBtnU, '📋U', 'user');
                    bindCopyEvent(copyBtnM, '📋M', 'model');
                    bindCopyEvent(copyBtnAll, '📋All', null);

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

                const copyBtnU = contentDiv.querySelector('#gtc-copy-user');
                const copyBtnM = contentDiv.querySelector('#gtc-copy-model');
                const copyBtnAll = contentDiv.querySelector('#gtc-copy-all');
                const heightRow = contentDiv.querySelector('#gtc-row-height');

                if (imageCount > 0) {
                    copyBtnU.style.display = 'inline-block';
                    copyBtnM.style.display = 'inline-block';
                    copyBtnAll.style.display = 'inline-block';
                    heightRow.style.display = 'block';

                    copyBtnU.disabled = userImagesCount === 0;
                    copyBtnM.disabled = modelImagesCount === 0;
                } else {
                    copyBtnU.style.display = 'none';
                    copyBtnM.style.display = 'none';
                    copyBtnAll.style.display = 'none';
                    heightRow.style.display = 'none';
                }

                const thumbnailsContainer = contentDiv.querySelector('#gtc-thumbnails-container');
                if (imageCount > 0) {
                    const thumbnailsHtml = `<div class="gtc-thumbnails">
                        ${collectedImages.map(imgData => `<img src="${imgData.src}" class="gtc-thumbnail" style="${getThumbnailStyling(imgData.type)}" title="${imgData.type} image" />`).join('')}
                       </div>`;
                    setInnerHTML(thumbnailsContainer, thumbnailsHtml);
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

            const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; console.log('[GTC Deep Scan]', msg); };
            setStatus("Finding scroll container...");

            let scroller = document.querySelector('infinite-scroller.chat-history') ||
                           document.querySelector('chat-window-content infinite-scroller');
            if (!scroller) {
                const scrollers = Array.from(document.querySelectorAll('infinite-scroller'));
                scroller = scrollers.find(el => el.clientWidth > 300) || document.documentElement;
            }

            if (!scroller.hasAttribute('tabindex') && scroller !== document.documentElement) {
                scroller.setAttribute('tabindex', '-1');
            }
            if (scroller !== document.documentElement) scroller.focus({ preventScroll: true });

            setStatus("Ascending to top...");
            let highestScrollHeight = scroller.scrollHeight;
            let stallCount = 0;
            let attempts = 0;

            // Ascend to Top
            while (attempts < 250) {
                const scrollStep = Math.max(800, scroller.clientHeight * 0.8 || 800);
                if (scroller === document.documentElement) window.scrollBy({ top: -scrollStep, behavior: 'instant' });
                else scroller.scrollTop -= scrollStep;

                await window.geminiSleep(300);
                const currentTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;

                if (currentTop <= 10) {
                    await window.geminiSleep(1000); // give framework chance to load older turns
                    if (scroller.scrollHeight <= highestScrollHeight + 50) {
                        stallCount++;
                        if (stallCount >= 3) break; // Reached absolute top
                    } else {
                        stallCount = 0;
                        highestScrollHeight = scroller.scrollHeight;
                    }
                } else {
                    stallCount = 0;
                }
                attempts++;
            }

            if (scroller === document.documentElement) window.scrollTo({ top: 0, behavior: 'instant' });
            else scroller.scrollTop = 0;
            await window.geminiSleep(1000);

            setStatus("Descending and collecting...");

            // Deduplication structures
            const seenUserTurns = new Set();
            const seenModelTurns = new Set();
            const seenArtifacts = new Set();
            const seenLinkCards = new Set();
            const seenCodeBlocks = new Set();
            const seenTables = new Set();
            const seenThinkingBlocks = new Set();

            let overrideData = {
                userTurnsCount: 0, modelTurnsCount: 0,
                userCharCount: 0, modelCharCount: 0,
                totalArtifacts: 0, totalLinkCards: 0,
                totalCodeBlocks: 0, totalTables: 0, totalThinkingBlocks: 0,
                collectedImages: [] // using src as unique key logic within loop
            };
            const seenImages = new Set();

            const getHash = (el) => {
                // Very simple hash: using ID if available, otherwise first 50 chars of text content
                if (el.id) return el.id;
                const t = el.textContent.replace(/\\s+/g, ' ').trim().substring(0, 50);
                return t.length > 0 ? t : Math.random().toString();
            };

            attempts = 0;
            stallCount = 0;

            // Descend and collect
            while (attempts < 300) {
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

                const scrollStep = Math.max(800, scroller.clientHeight * 0.8 || 800);
                const currentTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;
                const maxScrollTop = scroller.scrollHeight - (scroller.clientHeight || window.innerHeight);

                // Using >= maxScrollTop - 50 to allow slight sub-pixel rounding
                if (currentTop >= maxScrollTop - 50) {
                    stallCount++;
                    if (stallCount >= 3) break;
                } else {
                    stallCount = 0;
                }

                if (scroller === document.documentElement) window.scrollBy({ top: scrollStep, behavior: 'instant' });
                else scroller.scrollTop += scrollStep;

                await window.geminiSleep(300);
                attempts++;
            }

            setStatus("Scan complete!");
            await window.geminiSleep(1000);
            setStatus("");

            if (scanBtn) scanBtn.disabled = false;

            // Push the collected deep scan data to updateStats
            updateStats(true, overrideData);

            isDeepScanning = false;
            // Re-attach observer
            if (mainObserver) mainObserver.observe(document.body, { childList: true, subtree: true });
        }

        /**
         * Main initialization for the script's features.
         */
        function initMainFunctionality() {
            if (isInitialized) return;
            console.log('[Gemini Turn Counter] Initializing...');

            addStyles();

            // Create UI container
            const container = document.createElement('div');
            container.id = 'gemini-turn-counter-ui';
            container.className = 'gus-panel';

            setInnerHTML(container, `
                <div class="gtc-icon gus-version">Loading...</div>
                <div class="gtc-content">Loading...</div>
            `);
            document.body.appendChild(container);
            uiContainer = container; // Store reference

            // UI Events
            let isDragging = false;
            let startX, startY, startLeft, startTop;

            const startDrag = (e) => {
                // Ignore drag if clicking interactive elements
                if (e.target.closest('button, input, .gtc-minimize-btn, .gtc-thumbnail')) return;

                isDragging = false;
                startX = e.clientX;
                startY = e.clientY;
                const rect = container.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;

                const handle = e.target;
                if(handle) {
                    handle.style.cursor = 'grabbing';
                }

                const onMouseMove = (eMove) => {
                    const dx = eMove.clientX - startX;
                    const dy = eMove.clientY - startY;
                    // Threshold to differentiate click vs drag
                    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                        isDragging = true;
                    }
                    if (isDragging) {
                        container.style.right = 'auto'; // Disable default right constraint
                        container.style.left = `${startLeft + dx}px`;
                        container.style.top = `${startTop + dy}px`;
                    }
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    if(handle) {
                        handle.style.cursor = 'grab';
                    }
                    if (isDragging) {
                        localStorage.setItem('gtc-pos-x', container.style.left);
                        localStorage.setItem('gtc-pos-y', container.style.top);
                        // Wait until next tick so the click handler can detect if we were dragging
                        setTimeout(() => isDragging = false, 0);
                    }
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const iconHandle = container.querySelector('.gtc-icon');
            if (iconHandle) iconHandle.addEventListener('mousedown', startDrag);

            container.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('gtc-version')) {
                    startDrag(e);
                }
            });

            container.addEventListener('click', (e) => {
                if (isDragging) {
                    // Prevent expanding/collapsing if the user just dragged the panel
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }

                if (e.target.closest('#gtc-minimize-btn')) {
                    container.classList.remove('expanded');
                    localStorage.setItem('gtc-minimized', 'true');
                    e.stopPropagation();
                } else if (!container.classList.contains('expanded')) {
                    container.classList.add('expanded');
                    localStorage.setItem('gtc-minimized', 'false');
                }
            });

            // Restore state (expansion)
            if (localStorage.getItem('gtc-minimized') === 'false') {
                container.classList.add('expanded');
            }

            // Restore state (position)
            const savedX = localStorage.getItem('gtc-pos-x');
            const savedY = localStorage.getItem('gtc-pos-y');
            if (savedX && savedY) {
                container.style.right = 'auto';
                container.style.left = savedX;
                container.style.top = savedY;
            }

            // Initial run
            setTimeout(updateStats, 500); // Wait a bit for initial load

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
            if (!isInitialized) return;
            console.log('[Gemini Turn Counter] Cleaning up...');

            if (mainObserver) {
                mainObserver.disconnect();
                mainObserver = null;
            }
            if (updateStatsTimeout) {
                clearTimeout(updateStatsTimeout);
                updateStatsTimeout = null;
            }
            // Keep UI and style even when cleaning up functional logic
            // if (uiContainer) {
            //     uiContainer.remove();
            //     uiContainer = null;
            // }

            if (uiContainer) {
                const contentEl = uiContainer.querySelector('.gtc-content');
                if (contentEl) {
                    contentEl.textContent = 'v0.4.35';
                }
            }

            isInitialized = false;
        }

        /**
         * Checks the URL and runs init or cleanup accordingly.
         */
        function checkUrlAndManageScriptState() {
            const isChatPage = /^\/(app|gem)\//.test(location.pathname);

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

        // Initial check on load
        if (document.body) {
            checkUrlAndManageScriptState();
        } else {
            window.addEventListener('DOMContentLoaded', checkUrlAndManageScriptState);
        }

    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
