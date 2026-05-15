// ==UserScript==
// @name         Copy CPU benchmark table of Passmark
// @namespace    userscript.moukaeritai.work
// @version      0.5.20220820
// @description  This user script adds a button to copy CPU benchmark results at Passmark website. It will be stored in the clipboard as TSV which can be pasted to a spreadsheet.
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://www.cpubenchmark.net/cpu_list.php
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.cpubenchmark.net
// @grant        GM_setClipboard
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/cpubenchmark.net/Copy%20CPU%20benchmark%20table%20of%20Passmark-0.5.20220819.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/cpubenchmark.net/Copy%20CPU%20benchmark%20table%20of%20Passmark-0.5.20220819.user.js
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

    function copyTable(){
        const trArray = document.querySelectorAll("#cputable tbody tr");
        const rows = [];
        for(var i=0; i<trArray.length; ++i){
            const tdArray = trArray[i].querySelectorAll("td");
            const columns = [];
            for(var j=0; j<tdArray.length; ++j){
              columns.push(tdArray[j].innerText);
            }
            rows.push(columns);
        }
        var textArray = [];
        for(i=0; i<rows.length; ++i){
            for(j=0; j<rows[i].length; ++j){
                textArray.push(rows[i][j]);
                textArray.push("\t");
            }
            textArray.push("\n");
        }
        GM_setClipboard(textArray.join(""), {type:"text", mimetype:"text/plain"});
        alert("Copied " + rows.length + " rows.");
    }

    function setup(){
        const copyButton = document.createElement("BUTTON");
        copyButton.innerText = "Copy it to the clipboard";
        copyButton.addEventListener("click", copyTable);
        const columnSelectorWrapperDvi = document.querySelector("DIV.columnSelectorWrapper");
        columnSelectorWrapperDvi.appendChild(copyButton);
    }

    setTimeout(setup, 5000);
})();