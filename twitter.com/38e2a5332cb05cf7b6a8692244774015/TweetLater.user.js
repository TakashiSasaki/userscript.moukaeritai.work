// ==UserScript==
// @name         Schedule to tweet at 5 minute later
// @namespace    userscript.moukaeritai.work
// @version      0.9.1
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
// ==/UserScript==
(function() {
    'use strict';
    const target = document.querySelector("#react-root > div > div");
    //console.log(target);
    const observer = new MutationObserver(records => {
        //alert("MutationObserver detected something.");
        if(location.href === "https://twitter.com/compose/tweet/schedule"){
            setTimeout(() => {
                setTo5minLater();
            }, 2000);
        }

        /* remove tweet button */
        //if(location.href === "https://twitter.com/home"){
        //    const button = document.querySelector("#react-root > div > div > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010 > main > div > div > div > div > div > div.css-1dbjc4n.r-14lw9ot.r-184en5c > div > div.css-1dbjc4n.r-14lw9ot.r-oyd9sg > div:nth-child(1) > div > div > div > div.css-1dbjc4n.r-1iusvr4.r-16y2uox.r-1777fci.r-1h8ys4a.r-1bylmt5.r-13tjlyg.r-7qyjyx.r-1ftll1t > div:nth-child(3) > div > div > div:nth-child(2) > div.css-18t94o4.css-1dbjc4n.r-l5o3uw.r-42olwf.r-sdzlij.r-1phboty.r-rs99b7.r-19u6a5r.r-2yi16.r-1qi8awa.r-1ny4l3l.r-ymttw5.r-o7ynqc.r-6416eg.r-lrvibr");
        //    if(button != null) {
        //        button.style.display = "none";
        //    }
        //}

        /* remove tweet button */
        //if(location.href === "https://twitter.com/compose/tweet"){
        //    const button = document.querySelector("#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1habvwh.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-rsyp9y.r-1pjcn9w.r-htvplk.r-1udh08x.r-1potc6q > div > div.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1jgb5lz.r-1ye8kvj.r-13qz1uu > div > div > div > div:nth-child(2) > div > div > div > div > div.css-1dbjc4n.r-1iusvr4.r-16y2uox.r-1777fci.r-1h8ys4a.r-1bylmt5.r-13tjlyg.r-7qyjyx.r-1ftll1t > div:nth-child(3) > div > div > div:nth-child(2) > div.css-18t94o4.css-1dbjc4n.r-l5o3uw.r-42olwf.r-sdzlij.r-1phboty.r-rs99b7.r-19u6a5r.r-2yi16.r-1qi8awa.r-1ny4l3l.r-ymttw5.r-o7ynqc.r-6416eg.r-lrvibr");
        //    if(button != null) {
        //        button.style.display = "none";
        //    }
        //}
    });
    observer.observe(target, {
        childList: true,
        subtree: true});

    function setTo5minLater() {
        //const span = document.querySelector("#modal-header span")
        const now = new Date().getTime();
        selectOptions(now + 60 * 1000 * 5);
    }

    function selectOptions(epoch) {
        const span = document.querySelector("#modal-header > span");
        if(span == null) return;
        if(span.innerText !== 'Schedule') return;
        console.log(epoch);
        observer.disconnect();
        const later5minDate = new Date(epoch);
        const month = later5minDate.getMonth();
        const date = later5minDate.getDate();
        const hours = later5minDate.getHours();
        const minutes = later5minDate.getMinutes();

        const selector1 = document.querySelector("div[aria-label='Date'] :nth-of-type(1) select option:nth-of-type(" + (month + 2) + ")");
        //console.log(selector1);
        if(selector1 != null) selector1.selected = "1";

        const selector2 = document.querySelector("div[aria-label='Date'] :nth-of-type(2) select option:nth-of-type(" + (date + 1) + ")");
        //console.log(selector2);
        if(selector2 != null) selector2.selected = "1";

        //const selector3 = document.querySelector("div[aria-label='Date'] :nth-of-type(3) select option:nth-of-type(" + (125 - year) + ")");
        //console.log(selector3);
        //if(selector3 != null) selector3.selected = "1";

        const selector4 = document.querySelector("div[aria-label='Time'] > div:nth-of-type(2) > div:nth-of-type(1) > select  option:nth-of-type(" + (hours + 2) + ")");
        //console.log(selector4);
        if(selector4 != null) selector4.selected = "1";

        const selector5 = document.querySelector("div[aria-label='Time'] > div:nth-of-type(2) > div:nth-of-type(2) > select option:nth-of-type(" + (minutes + 2) + ")");
        //console.log(selector5);
        if(selector5 != null) selector5.selected = "1";

        //console.log(target);
        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }
})();