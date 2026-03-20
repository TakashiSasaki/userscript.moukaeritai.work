// ==UserScript==
// @name         Pocket Tweaker (obsoleted)
// @namespace    userscript.moukaeritai.work
// @version      0.2.5
// @description  [Obsoleted / Service ended] This Userscript fixes problems in Pocket (https://getpocket.com/) articles. 1) <pre> tag background color is too dark. 2) The display area of <article> tag is too narrow.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://getpocket.com/my-list
// @match        https://getpocket.com/read/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?domain=getpocket.com
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/getpocket.com/pocket-tweaker-obsoleted/pocket-tweaker.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/getpocket.com/pocket-tweaker-obsoleted/pocket-tweaker.user.js
// ==/UserScript==

(function() {
    'use strict';

    const installCheckHosts = [
        'userscript.moukaeritai.work'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname);

    if (isInstallCheckHost) {
        const report = () => {
            document.dispatchEvent(new CustomEvent('userscript-check-installed', {
                detail: {
                    name: GM_info.script.name,
                    version: GM_info.script.version
                }
            }));
        };
        report();
        document.addEventListener('userscript-ping', report);
        return;
    }

    function setArticleStyle(article){
        if(!article) return;
        article.style.maxWidth = "96%";
    }

    function setPreStyle(pre){
        if(!pre) return;
        pre.style.background = "initial";
        pre.style.borderColor ="--(color-textSecondary)";
        pre.style.borderStyle ="dashed";
        pre.style.margin = "initial";
        pre.style.width = "85vw";
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const applyStyles = () => {
        const bodyDiv = document.querySelector("BODY > DIV");
        if (!bodyDiv) return;

        const articles = bodyDiv.querySelectorAll("ARTICLE.reader");
        articles.forEach(article => {
            setArticleStyle(article);
            const pres = article.querySelectorAll("PRE");
            pres.forEach(setPreStyle);
        });
    };

    const debouncedApply = debounce(applyStyles, 200);

    const observer = new MutationObserver(() => {
        debouncedApply();
    });

    const targetNode = document.querySelector("BODY > DIV");
    if (targetNode) {
        observer.observe(targetNode, {
            characterData : true,
            attributes : true,
            childList: true,
            subtree: true,
        });
        // Initial application
        applyStyles();
    }
})();
