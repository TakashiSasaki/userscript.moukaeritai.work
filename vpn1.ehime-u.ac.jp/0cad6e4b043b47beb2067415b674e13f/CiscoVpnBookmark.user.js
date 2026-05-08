// ==UserScript==
// @name         Cisco SSL VPN Bookmark
// @namespace    http://tampermonkey.net/
// @version      0.5.5
// @description  Add local bookmark on the top page of Cisco SSL VPN Web Service
// @author       Takashi SASAKI https://twitter.com/TakashiSasaki
// @match        https://*/+CSCOE+/portal.html
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?domain=www.cisco.com
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://gist.github.com/TakashiSasaki/0cad6e4b043b47beb2067415b674e13f/raw/CiscoVpnBookmark.user.js
// @downloadURL  https://gist.github.com/TakashiSasaki/0cad6e4b043b47beb2067415b674e13f/raw/CiscoVpnBookmark.user.js

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
        const spanElement = document.createElement("SPAN");
        spanElement.innerText = "bookmarkUrl" + i;
        spanElement.style.marginRight = "0.3em";
        div.appendChild(spanElement);
        const input = document.createElement("INPUT");
        input.style.background = "pink";
        input.style.minWidth = "40em";
        input.id = "bookmarkUrl" + i;
        input.value = GM_getValue(input.id);
        if(input.value === "undefined") input.value = null;
        input.addEventListener("change", function(e){
            const inputElement = e.target;
            GM_setValue(inputElement.id, inputElement.value);
        });
        div.appendChild(input);
        const button = document.createElement("BUTTON");
        button.innerText = "use";
        button.addEventListener("click", function(e){
            const urlInput = document.querySelector("#unicorn_form_url");
            urlInput.style.background = "yellow";
            const inputValue = e.target.parentElement.querySelector("DIV INPUT").value;
            urlInput.value = inputValue;
        });
        div.appendChild(button);
        divs.push(div);
    }//for
    divs.forEach(x => {
        div.appendChild(x);
    });
    div.appendChild((function(){
        const divElement = document.createElement("DIV");
        const spanElement = document.createElement("SPAN");
        divElement.appendChild(spanElement);
        spanElement.innerText = "importFrom";
        spanElement.style.marginRight = "0.3em";
        const inputElement = document.createElement("INPUT");
        divElement.appendChild(inputElement);
        inputElement.style.minWidth = "40em";
        inputElement.style.background = "lime";
        inputElement.id = "importFrom";
        inputElement.placeholder = "URL from where bookmarks will be imported";
        inputElement.value = GM_getValue(inputElement.id);
        if(inputElement.value === "undefined"){
            inputElement.value = null;
        }
        inputElement.addEventListener("change", x => {
            GM_setValue(inputElement.id, inputElement.value);
        });
        const buttonElement = document.createElement("BUTTON");
        divElement.appendChild(buttonElement);
        buttonElement.innerText = "import";
        buttonElement.addEventListener("click", function(x){
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(x){
                if(this.readyState == 4){
                    if(this.status == 200){
                        const bookmarks = JSON.parse(this.responseText);
                        for(var i=0; i<10; ++i){
                            const inputElement = td.querySelector("#bookmarkUrl" + i);
                            inputElement.value = bookmarks["bookmarkUrl"+i];
                            GM_setValue(inputElement.id, inputElement.value);
                        }//for
                    }//if
                }//if
            }//onreadystatechange function
            xhr.open("GET", inputElement.value, true);
            xhr.send();
        });//buttonElement.addEventListener
        return divElement;
    })());

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
