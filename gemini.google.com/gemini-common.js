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
})();
