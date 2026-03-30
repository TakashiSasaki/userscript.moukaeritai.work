/* === Gemini Userscript Common JavaScript === */
/* Loaded via @require by all gemini.google.com userscripts */

(function () {
    'use strict';

    const EMOJIS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

    /**
     * Registers a Gemini userscript and assigns it a load-order emoji number.
     *
     * The load counter is stored in `document.documentElement.dataset.geminiUserscriptCount`
     * so that all userscript sandboxes share the same counter via the DOM.
     *
     * @param {string} scriptName - Display name of the script (GM_info.script.name)
     * @param {string} version    - Version string (GM_info.script.version), e.g. "0.4.48"
     * @returns {{ order: number, emoji: string }}
     *   order: 1-based load order
     *   emoji: circled number character e.g. "①"
     *
     * @example
     * // At the top of the script IIFE body:
     * const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);
     * // Then use gusEmoji when building version badge text:
     * // `${gusEmoji}v${version}` → "①v0.4.48"
     */
    window.registerGeminiUserscript = function (scriptName, version) {
        const root = document.documentElement;
        const count = parseInt(root.dataset.geminiUserscriptCount || '0') + 1;
        root.dataset.geminiUserscriptCount = String(count);
        const emoji = EMOJIS[count - 1] || '(' + count + ')';
        console.log('[GUS] ' + emoji + scriptName + ' v' + version + ' (load order: ' + count + ')');
        return { order: count, emoji: emoji };
    };


    /**
     * Pauses execution for a specified duration.
     * Uses background-aware polling to prevent Chrome from aggressively
     * throttling/suspending pure setTimeout in background tabs.
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns {Promise<void>}
     */
    window.geminiSleep = function (ms) {
        return new Promise(resolve => {
            const start = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - start >= ms) {
                    clearInterval(interval);
                    resolve();
                }
            }, Math.min(ms, 50));
        });
    };

    /**
     * Waits for an element to appear in the DOM.
     * @param {string} selector - The CSS selector of the element to wait for.
     * @param {ParentNode} [context=document] - The context within which to search.
     * @param {number} [timeout=5000] - The maximum time to wait in milliseconds.
     * @returns {Promise<Element>} - Resolves with the element or rejects with an Error if timeout is reached.
     */
    window.geminiWaitForElement = function (selector, context = document, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const el = context.querySelector(selector);
            if (el) return resolve(el);

            let timeoutId = null;
            const observer = new MutationObserver(() => {
                const el = context.querySelector(selector);
                if (el) {
                    if (timeoutId) clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(context === document ? document.body : context, {
                childList: true,
                subtree: true
            });

            timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    };
})();
