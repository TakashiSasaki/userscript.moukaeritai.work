// ==UserScript==
// @name         Gemini History Loader
// @namespace    userscript.moukaeritai.work
// @version      0.1.2
// @description  A utility script that forces Gemini to load the entire chat history by programmatically scrolling to the top. Listens for custom events to trigger the load.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js
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
    report();

    function log(msg) {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        const formattedMsg = `[History Loader ${timestamp}] ${msg}`;
        console.log(formattedMsg);
    }

    async function sleep(ms) {
        return new Promise(resolve => {
            const start = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - start >= ms) {
                    clearInterval(interval);
                    resolve();
                }
            }, Math.min(ms, 50));
        });
    }

    function isVisible(el) {
        if (!el || !el.isConnected) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.offsetParent !== null) return true;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    async function closeAllPanels() {
        const canvasCloseBtn = document.querySelector('button[data-test-id="close-button"]');
        if (canvasCloseBtn) {
            log('Closing Canvas panel to enable history loading...');
            canvasCloseBtn.click();
            await sleep(800);
        }

        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));

        const backdrop = document.querySelector('.mat-drawer-backdrop');
        if (backdrop && isVisible(backdrop)) {
            backdrop.click();
        }
        await sleep(500);
    }

    function getChatScroller() {
        let scroller = document.querySelector('infinite-scroller.chat-history') ||
            document.querySelector('chat-window-content infinite-scroller');

        if (!scroller) {
            const scrollers = Array.from(document.querySelectorAll('infinite-scroller'));
            scroller = scrollers.find(el => el.clientWidth > 300);
        }

        if (!scroller) {
            for (const el of document.querySelectorAll('*')) {
                if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 200 && el.clientWidth > 300) {
                    const ov = getComputedStyle(el).overflowY;
                    if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > 2000) {
                        if (!scroller || el.scrollHeight > scroller.scrollHeight) scroller = el;
                    }
                }
            }
        }
        return scroller || document.documentElement;
    }

    let isLoading = false;

    async function loadChatHistory(reqId) {
        if (isLoading) {
            log('Already loading history. Ignoring request.');
            return;
        }

        isLoading = true;
        log(`Starting to load chat history (reqId: ${reqId})...`);

        try {
            await closeAllPanels();

            let scroller = getChatScroller();
            log('Ascending to the true top of the conversation...');

            if (!scroller.hasAttribute('tabindex')) scroller.setAttribute('tabindex', '-1');
            scroller.focus({ preventScroll: true });

            let highestScrollHeight = scroller.scrollHeight;
            let prevFirstTurnContent = '';
            let topAttempts = 0;
            let stallCount = 0;

            while (topAttempts < 250) {
                const scrollStep = Math.max(800, scroller.clientHeight * 0.8);
                if (scroller === document.documentElement) {
                    window.scrollBy({ top: -scrollStep, behavior: 'instant' });
                } else {
                    scroller.scrollTop -= scrollStep;
                }

                await sleep(400);

                const currentScrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;

                if (currentScrollTop <= 10) {
                    await sleep(1500);

                    const currentFirstTurn = document.querySelector('message-content, .message-content');
                    const currentContent = currentFirstTurn ? currentFirstTurn.textContent.substring(0, 50) : '';

                    if (currentContent === prevFirstTurnContent && scroller.scrollHeight <= highestScrollHeight + 50) {
                        stallCount++;
                        log(`Waiting for history to load... (Attempt ${stallCount}/3)`);
                        if (stallCount >= 3) {
                            log('Reached absolute top of conversation.');
                            break;
                        }
                    } else {
                        stallCount = 0;
                        log('Loaded older conversation history. Continuing ascent...');
                    }

                    prevFirstTurnContent = currentContent;
                    if (scroller.scrollHeight > highestScrollHeight) {
                        highestScrollHeight = scroller.scrollHeight;
                    }
                } else {
                    stallCount = 0;
                }
                topAttempts++;
            }

            scroller.scrollTop = 0;
            await sleep(1000);

            log('History load complete.');
            document.dispatchEvent(new CustomEvent('gemini-history-loader:complete', {
                detail: { reqId: reqId, status: 'success' }
            }));

        } catch (error) {
            log(`Error loading history: ${error.message}`);
            document.dispatchEvent(new CustomEvent('gemini-history-loader:complete', {
                detail: { reqId: reqId, status: 'error', reason: error.message }
            }));
        } finally {
            isLoading = false;
        }
    }

    document.addEventListener('gemini-history-loader:request', (e) => {
        const reqId = e.detail && e.detail.reqId ? e.detail.reqId : `req_${Date.now()}`;
        loadChatHistory(reqId);
    });

})();