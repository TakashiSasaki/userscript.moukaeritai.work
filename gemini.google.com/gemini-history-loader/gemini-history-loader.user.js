// ==UserScript==
// @name         Gemini History Loader
// @namespace    userscript.moukaeritai.work
// @version      0.1.21
// @lastModified 2026-04-15
// @description  A utility script that forces Gemini to load the entire chat history by programmatically scrolling to the top. Features a compact floating UI that expands when loading history.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     css https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/style.css
// @resource     templateHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/template.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js
// @noframes
// @history       0.1.21 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
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

        const initUserScript = () => {

            const policy = window.geminiCreateTrustedHTMLPolicy('geminiHistoryLoader');

            if (typeof GM_addStyle !== 'undefined' && typeof GM_getResourceText !== 'undefined') {
                // Inject shared common styles
                const commonCSS = GM_getResourceText('geminiCommon');
                if (commonCSS && !document.getElementById('gemini-common-styles')) {
                    const commonStyle = document.createElement('style');
                    commonStyle.textContent = commonCSS;
                    commonStyle.id = 'common-styles';
                    document.head.appendChild(commonStyle);
                }

                const css = GM_getResourceText('css');
                if (css) {
                    GM_addStyle(css);
                }
            }

            // --- Trusted Types ---



            function log(msg) {
                const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
                const formattedMsg = `[History Loader ${timestamp}] ${msg}`;
                console.log(formattedMsg);
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
                    await window.geminiSleep(800);
                }

                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));

                const backdrop = document.querySelector('.mat-drawer-backdrop');
                if (backdrop && isVisible(backdrop)) {
                    backdrop.click();
                }
                await window.geminiSleep(500);
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

            const PANEL_POSITION_KEY = 'gemini-history-loader-pos';
            let uiPanel = null;
            let progressTextEl = null;
            let statusTextEl = null;

            function createUI() {
                if (uiPanel) return;

                uiPanel = document.createElement('div');
                uiPanel.id = 'gemini-history-loader-panel';
                uiPanel.className = 'gus-panel';

                const templateStr = GM_getResourceText('templateHTML').replace(/{{scriptVersion}}/g, `🔄 ${GM_info.script.version} ${gusEmoji}`);
                window.geminiSetInnerHTML(uiPanel, templateStr, policy);
                document.body.appendChild(uiPanel);

                progressTextEl = uiPanel.querySelector('#ghl-progress-text');
                statusTextEl = uiPanel.querySelector('#ghl-status-text');

                const versionHandle = uiPanel.querySelector('.ghl-script-version');
                if (versionHandle) {
                    window.geminiSetupDraggablePanel(uiPanel, versionHandle, PANEL_POSITION_KEY, { right: '20px', top: '100px' });
                }
            }



            function updateProgressUI(status, progress) {
                if (!uiPanel) return;
                if (statusTextEl) statusTextEl.textContent = status;
                if (progressTextEl) progressTextEl.textContent = progress;
            }

            function toggleUIExpanded(isExpanded) {
                if (!uiPanel) return;
                if (isExpanded) {
                    uiPanel.classList.add('ghl-expanded');
                } else {
                    uiPanel.classList.remove('ghl-expanded');
                    updateProgressUI('Idle', ''); // Reset
                }
            }

            let isLoading = false;

            async function loadChatHistory(reqId) {
                if (!uiPanel) createUI();

                if (isLoading) {
                    log('Already loading history. Ignoring request.');
                    return;
                }

                isLoading = true;
                toggleUIExpanded(true);
                updateProgressUI('Starting...', 'Closing panels...');

                log(`Starting to load chat history (reqId: ${reqId})...`);

                try {
                    await closeAllPanels();

                    let scroller = getChatScroller();
                    log('Ascending to the true top of the conversation...');
                    updateProgressUI('Loading History...', 'Ascending...');

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

                        await window.geminiSleep(400);

                        const currentScrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;

                        if (currentScrollTop <= 10) {
                            await window.geminiSleep(1500);

                            const currentFirstTurn = document.querySelector('message-content, .message-content');
                            const currentContent = currentFirstTurn ? currentFirstTurn.textContent.substring(0, 50) : '';

                            if (currentContent === prevFirstTurnContent && scroller.scrollHeight <= highestScrollHeight + 50) {
                                stallCount++;
                                log(`Waiting for history to load... (Attempt ${stallCount}/3)`);
                                updateProgressUI('Loading History...', `Scroll Attempt: ${topAttempts}\nStall count: ${stallCount}/3`);
                                if (stallCount >= 3) {
                                    log('Reached absolute top of conversation.');
                                    updateProgressUI('Loading History...', 'Reached top of conversation.');
                                    break;
                                }
                            } else {
                                stallCount = 0;
                                log('Loaded older conversation history. Continuing ascent...');
                                updateProgressUI('Loading History...', `Loaded older history.\nContinuing ascent... (Step: ${topAttempts})`);
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
                    await window.geminiSleep(1000);

                    log('History load complete.');
                    updateProgressUI('Complete', 'Dispatching events...');
                    await window.geminiSleep(500);

                    document.dispatchEvent(new CustomEvent('gemini-history-loader:complete', {
                        detail: { reqId: reqId, status: 'success' }
                    }));

                } catch (error) {
                    log(`Error loading history: ${error.message}`);
                    updateProgressUI('Error', error.message);
                    await window.geminiSleep(2000);
                    document.dispatchEvent(new CustomEvent('gemini-history-loader:complete', {
                        detail: { reqId: reqId, status: 'error', reason: error.message }
                    }));
                } finally {
                    isLoading = false;
                    toggleUIExpanded(false);
                }
            }

            // Auto-create UI on load so users see it's installed
            window.addEventListener('load', () => {
                if (/^\/(app|gem)\//.test(location.pathname)) {
                    setTimeout(createUI, 1000);
                }
            });

            if (window.navigation) {
                window.navigation.addEventListener('navigatesuccess', () => {
                    if (/^\/(app|gem)\//.test(location.pathname)) {
                        if (!uiPanel) setTimeout(createUI, 1000);
                    } else {
                        if (uiPanel) {
                            uiPanel.remove();
                            uiPanel = null;
                        }
                    }
                });
            }

            document.addEventListener('gemini-history-loader:request', (e) => {
                const reqId = e.detail && e.detail.reqId ? e.detail.reqId : `req_${Date.now()}`;
                loadChatHistory(reqId);
            });

        };

        if (document.readyState === 'complete') {
            initUserScript();
        } else {
            window.addEventListener('load', initUserScript);
        }
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();