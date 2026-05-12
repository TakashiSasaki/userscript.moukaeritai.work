// ==UserScript==
// @name         Cisco SSL VPN Bookmark
// @namespace    userscript.moukaeritai.work
// @version      0.4
// @description  Add local bookmark on the top page of Cisco SSL VPN Web Service
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://*.ac.jp/+CSCOE+/portal.html
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?domain=www.cisco.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/vpn1.ehime-u.ac.jp/Cisco%20SSL%20VPN%20Bookmark-0.3.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/vpn1.ehime-u.ac.jp/Cisco%20SSL%20VPN%20Bookmark-0.3.user.js
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

    // Your code here...
    const urlInput = document.querySelector("#unicorn_form_url");
    urlInput.style.background = "yellow";

    const td = document.querySelector("#main_ctrl > td > table > tbody > tr > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(3) > td");
    const div = document.createElement("div");
    td.appendChild(div);

    const divs = [];
    for(var i=0; i<10; ++i){
        const div = document.createElement("DIV");
        const input = document.createElement("INPUT");
        input.style.background = "pink";
        input.style.minWidth = "40em";
        input.id = "bookmarkUrl" + i;
        input.value = GM_getValue(input.id);
        input.addEventListener("change", onInputChange);
        const button = document.createElement("BUTTON");
        button.innerText = "入力";
        button.addEventListener("click", onButtonClick);
        div.appendChild(input);
        div.appendChild(button);
        divs.push(div);
    }//for
    divs.forEach(x => {
        div.appendChild(x);
    });
})();

function onButtonClick(e){
    const urlInput = document.querySelector("#unicorn_form_url");
    urlInput.style.background = "yellow";
    const inputValue = e.target.parentElement.querySelector("DIV INPUT").value;
    urlInput.value = inputValue;
}

function onInputChange(e){
    const inputElement = e.target;
    GM_setValue(inputElement.id, inputElement.value);
}
