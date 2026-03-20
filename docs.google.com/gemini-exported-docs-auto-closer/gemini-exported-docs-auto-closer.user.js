// ==UserScript==
// @name         Gemini Exported Docs Auto-Closer
// @namespace    userscript.moukaeritai.work
// @version      0.4.1
// @description  Closes Google Docs tabs that were opened by the Gemini Artifact Exporter when it receives the 'gemini-docs-closer-force-close' custom event. UI and countdown have been removed.
// @author       Takashi Sasaki
// @match        https://docs.google.com/document/d/*
// @match        https://userscript.moukaeritai.work/*
// @grant        window.close
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/gemini-exported-docs-auto-closer/gemini-exported-docs-auto-closer.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/gemini-exported-docs-auto-closer/gemini-exported-docs-auto-closer.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Report version to landing page
    const SCRIPT_NAME = 'Gemini Exported Docs Auto-Closer';
    const reportVersion = () => {
        const version = typeof GM_info !== 'undefined' ? GM_info.script.version : '0.4.1';
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: { name: SCRIPT_NAME, version: version }
        }));
    };
    document.addEventListener('userscript-ping', reportVersion);
    reportVersion(); // Initial report

    // Check if the document was opened from Gemini (only for Google Docs)
    if (location.hostname.includes('docs.google.com')) {
        if (!document.referrer || !document.referrer.includes('gemini.google.com')) {
            return; // Not opened from Gemini, do nothing
        }
    } else {
        return; // Don't run logic on other domains (like the landing page)
    }

    console.log('[Gemini Docs Closer] Gemini referrer detected. Waiting for force-close event from worker.');

    document.addEventListener('gemini-docs-closer-force-close', () => {
        console.log('[Gemini Docs Closer] Force close event received. Attempting window.close().');
        window.close();

        // Fallback warning if window.close() is blocked
        setTimeout(() => {
            console.error('[Gemini Docs Closer] Auto-close failed (popup blocked?).');
        }, 1000);
    });

})();
