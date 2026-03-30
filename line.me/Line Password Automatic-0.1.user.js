// ==UserScript==
// @name         Line Password Automatic
// @namespace    userscript.moukaeritai.work
// @version      0.2
// @description  try to take over the world!
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        chrome-extension://ophjlpahpchlmihnnnihgmmeilfjmjjc/index.html
// @match        extension://ophjlpahpchlmihnnnihgmmeilfjmjjc/index.html
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=line.me
// @grant        unsafeWindow
// @grant        GM_info
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
    window.addEventHandler("load", ()=>{
        alert(1);
    });

    function fillpw(){
        document.querySelector("#line_login_pwd").value="1";
    }
})();