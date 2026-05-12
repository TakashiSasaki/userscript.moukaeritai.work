// ==UserScript==
// @name         Copy CPU benchmark table of Passmark
// @namespace    https://gist.github.com/TakashiSasaki/45afd852232e4a2a9fa39b5f5f32a6ce
// @version      0.5.20220819
// @description  This user script adds a button to copy CPU benchmark results at Passmark website. It will be stored in the clipboard as TSV which can be pasted to a spreadsheet.
// @author       Takashi SASAKI
// @homepage     https://twitter.com/TakashiSasaki
// @match        https://www.cpubenchmark.net/cpu_list.php
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.cpubenchmark.net
// @grant        GM_setClipboard
// @updateURL    https://gist.github.com/TakashiSasaki/45afd852232e4a2a9fa39b5f5f32a6ce/raw/copy-passmark-cpu-benchmark.user.js
// @downloadURL  https://gist.github.com/TakashiSasaki/45afd852232e4a2a9fa39b5f5f32a6ce/raw/copy-passmark-cpu-benchmark.user.js
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function() {
    'use strict';

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
