// @name         Grok Chat History Shortcut
// @namespace    userscript.moukaeritai.work
// @version      0.15
// @description  Click history, highlight panel, scroll to deep-pink span, focus it, and outline link on Grok Chat
// @match        https://grok.com/chat/*
// @match        https://userscript.moukaeritai.work/*
// @homepageURL  https://x.com/TakashiSasaki
// @author       Takashi Sasaki
// @icon         https://grok.com/favicon.ico
// @license      MIT
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/grok.com/grok-chat-history-shortcut/grok-chat-history-shortcut.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/grok.com/grok-chat-history-shortcut/grok-chat-history-shortcut.user.js
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function() {
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

    document.addEventListener('keydown', function(event) {
        // Trigger on Ctrl+Shift+Backspace
        if (event.ctrlKey && event.shiftKey && event.key === 'Backspace') {
            event.preventDefault();

            // Click the History button
            const historyButton = document.querySelector('button[aria-label="履歴"]');
            if (!historyButton) {
                console.warn('History button not found.');
                return;
            }
            historyButton.click();

            // Wait 200ms for the history panel to appear
            setTimeout(() => {
                // Select all potential panels by stable class combination
                const panels = Array.from(document.querySelectorAll(
                    'div.col-span-1.xl\\:col-span-2.h-full.overflow-auto.space-y-3.p-3.border-r.border-border'
                ));
                // Pick the one that is currently visible
                const panel = panels.find(el => el.offsetParent !== null);
                if (!panel) {
                    console.warn('History panel not found.');
                    return;
                }
                // Highlight the panel pink
                panel.style.backgroundColor = 'pink';

                // Wait another 200ms before handling nested span
                setTimeout(() => {
                    // Find the nested span inside the panel
                    const span = panel.querySelector(
                        'div > div.flex-grow.min-w-0 > div > span'
                    );
                    if (!span) {
                        console.warn('Deep-pink span not found.');
                        return;
                    }
                    // Highlight the span deep pink
                    span.style.backgroundColor = 'deeppink';
                    // Scroll the span into view within the panel
                    span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                    // Wait 200ms for scroll and focus effects
                    setTimeout(() => {
                        // Make the span focusable and focus it
                        span.setAttribute('tabindex', '0');
                        span.focus();

                        // Wait another 200ms before outlining the link
                        setTimeout(() => {
                            // Find the cmdk-item ancestor div
                            const cmdkItemDiv = span.closest('div[cmdk-item]');
                            if (!cmdkItemDiv) {
                                console.warn('Cmdk item div not found.');
                                return;
                            }
                            // Find the <a> inside that cmdk-item
                            const link = cmdkItemDiv.querySelector('a');
                            if (!link) {
                                console.warn('Link not found in cmdk-item.');
                                return;
                            }
                            // Remove any previous background color
                            link.style.backgroundColor = '';
                            // Add a 1px solid yellow border
                            link.style.border = '1px solid yellow';
                        }, 200);

                    }, 200);

                }, 200);

            }, 200);
        }
    });
})();
