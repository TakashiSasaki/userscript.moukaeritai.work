// ==UserScript==
// @name         Mute X Tweets on Search
// @namespace    https://gist.githubusercontent.com/TakashiSasaki/89402d3b8c2896b161bf8add4295e150
// @version      2024-04-29.2
// @description  Automatically hides tweets from a muted user in the search results on X (formerly Twitter) when 'u' is pressed.
// @author       Takashi Sasaki
// @match        https://twitter.com/search?*
// @match        https://userscript.moukaeritai.work/*
// @match        https://twitter.com/home
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        none
// @updateURL    https://gist.githubusercontent.com/TakashiSasaki/89402d3b8c2896b161bf8add4295e150/raw/mute-x-tweets-on-search.user.js
// @downloadURL    https://gist.githubusercontent.com/TakashiSasaki/89402d3b8c2896b161bf8add4295e150/raw/mute-x-tweets-on-search.user.js
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==


(function() {
    'use strict';
    setTimeout(() => {
        const element = document.querySelector('main');
        if (!element) return; // elementがnullまたはundefinedの場合、処理を中止
        console.log(element);
        element.addEventListener("keydown", event => {
            const active_element = document.activeElement;
            console.log(active_element);
            console.log(event.key);
            if (event.key !== "u") {
                return; // 押されたキーが 'u' でなければイベントハンドラを終了
            }
            event.stopPropagation(); // 他の要素へのイベントの伝播を防ぐ
            // アクティブ要素から特定の構造を持つ要素のテキストを取得
            const twitter_id = document.activeElement.querySelector("a > div > span")?.innerText;
            if (!twitter_id) return; // twitter_idが取得できない場合、処理を中止
            console.log(twitter_id);
            if (!twitter_id.startsWith('@')) {
                return; // twitter_idが'@'で始まらない場合、処理を中止
            }
            // twitter_idが'@'で始まる場合の処理
            const articles = element.querySelectorAll("article");
            articles.forEach(article => {
                const spanText = article.querySelector("a > div > span")?.innerText;
                if (spanText === twitter_id) {
                    article.style.display = 'none'; // innerText が twitter_id と一致する article を非表示にする
                }
            });
        });
    }, 2000);

    // --- Version Check & Ping ---
    const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'userscript-ping') {
            report();
        }
    });
    // For standalone scripts that aren't modules, execute report immediately if on catalog
    if (location.hostname === 'userscript.moukaeritai.work') {
        report();
    }

})();
