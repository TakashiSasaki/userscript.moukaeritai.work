// ==UserScript==
// @name         Cisco SSL VPN Bookmark
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add local bookmark on the top page of Cisco SSL VPN Web Service
// @author       You
// @match        https://*.ac.jp/+CSCOE+/portal.html
// @icon         https://www.google.com/s2/favicons?domain=www.cisco.com
// @grant        GM_setValue
// @grant        GM_getValue

// ==/UserScript==

(function() {
    'use strict';

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
