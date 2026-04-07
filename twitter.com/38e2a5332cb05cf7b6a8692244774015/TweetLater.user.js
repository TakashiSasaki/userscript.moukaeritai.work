// ==UserScript==
// @name         Schedule to tweet at 5 minute later
// @namespace    userscript.moukaeritai.work
// @version      0.9.2
// @description  Set the scheduled time to 5 minutes after the current time in the scheduled tweet dialog.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://twitter.com/
// @match        https://twitter.com/home
// @match        https://twitter.com/compose/tweet
// @match        https://twitter.com/compose/tweet/schedule
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @grant        none
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/twitter.com/38e2a5332cb05cf7b6a8692244774015/TweetLater.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/twitter.com/38e2a5332cb05cf7b6a8692244774015/TweetLater.user.js
// @lastModified 2026-04-07
// ==/UserScript==
(function() {
    'use strict';
    const target = document.querySelector("#react-root > div > div");
    const observer = new MutationObserver(() => {
        if(location.href === "https://twitter.com/compose/tweet/schedule"){
            setTimeout(() => {
                setTo5minLater();
            }, 2000);
        }
    });
    observer.observe(target, {
        childList: true,
        subtree: true});

    function setTo5minLater() {
        const now = new Date().getTime();
        selectOptions(now + 60 * 1000 * 5);
    }

    function selectOptions(epoch) {
        const span = document.querySelector("#modal-header > span");
        if(span == null) return;
        if(span.innerText !== 'Schedule') return;
        observer.disconnect();
        const later5minDate = new Date(epoch);
        const month = later5minDate.getMonth();
        const date = later5minDate.getDate();
        const hours = later5minDate.getHours();
        const minutes = later5minDate.getMinutes();

        const selector1 = document.querySelector("div[aria-label='Date'] :nth-of-type(1) select option:nth-of-type(" + (month + 2) + ")");
        if(selector1 != null) selector1.selected = "1";

        const selector2 = document.querySelector("div[aria-label='Date'] :nth-of-type(2) select option:nth-of-type(" + (date + 1) + ")");
        if(selector2 != null) selector2.selected = "1";

        const selector4 = document.querySelector("div[aria-label='Time'] > div:nth-of-type(2) > div:nth-of-type(1) > select  option:nth-of-type(" + (hours + 2) + ")");
        if(selector4 != null) selector4.selected = "1";

        const selector5 = document.querySelector("div[aria-label='Time'] > div:nth-of-type(2) > div:nth-of-type(2) > select option:nth-of-type(" + (minutes + 2) + ")");
        if(selector5 != null) selector5.selected = "1";

        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }
})();
