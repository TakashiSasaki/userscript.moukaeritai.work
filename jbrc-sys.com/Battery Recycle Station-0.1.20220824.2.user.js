// ==UserScript==
// @name         Battery Recycle Station
// @namespace    userscript.moukaeritai.work
// @version      0.1.20220824.3
// @description  try to take over the world!
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://www.jbrc-sys.com/brsp/a2A/*
// @match        https://www.jbrc-sys.com/brsp/a2A
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jbrc.com
// @grant        GM_addStyle
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/jbrc-sys.com/Battery%20Recycle%20Station-0.1.20220824.2.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/jbrc-sys.com/Battery%20Recycle%20Station-0.1.20220824.2.user.js
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

    unhide();
    drawDivTampermonkey();
    const todofukenArray = getTodofukenArray();
    const shikugunArray = getShikugunArray();

    todofukenArray.forEach(todofuken=>{
        setTimeout(()=>drawTodofuken(todofuken.value, todofuken.innerText), 10);
    });
    try{
        setTimeout(()=>{
            document.querySelector("FORM.TodofukenForm BUTTON").focus();
        }, 10);
    } catch(e){
    }
    GM_addStyle("INPUT[name='TORIATUKAI_SEIHIN'] {width: 2em}");
    GM_addStyle("INPUT[name='CD_TODOFUKEN'] {width: 3em}");
    GM_addStyle("INPUT[name='TORIATUKAI_SEIHIN'] {width: 2em}");
    GM_addStyle("INPUT[name='CD_TODOFUKEN'] {width: 3em}");

    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            console.log(mutation.target);
        });
        saveList();

    });

    mutationObserver.observe(document.querySelector("BODY DIV:nth-child(1)"), {
        characterData:false,
        childList: true,
        subtree: true
    });
})();

//setTimeout(saveList, 1000);


function drawDivTampermonkey(){
    const divTampermonkey = document.createElement("DIV");
    divTampermonkey.id = "tampermonkey";
    document.body.appendChild(divTampermonkey);
    GM_addStyle("#tampermonkey {background: pink}");
    GM_addStyle("#tampermonkey FORM {display: inline}");
}

function unhide(){
    const inputElements = document.querySelectorAll("INPUT");
    inputElements.forEach((element)=>{
        if(element.type == "hidden"){
            element.type = "none";
            element.setAttribute("readonly", "1");
        }
    });
}

function getTodofukenArray(){
    try {
        const todofukenArray = JSON.parse(window.localStorage.getItem("todofukenArray"));
        if(todofukenArray != null && todofukenArray.length > 0) {
            return todofukenArray;
        }
    } catch(e){
    }
    const todofukenArray = [];
    const selectTodofuken = document.querySelector("#CD_TODOFUKEN");
    if(selectTodofuken){
        selectTodofuken.querySelectorAll("OPTION").forEach(option=>{
            todofukenArray.push({"innerText":option.innerText, "value":option.value});
        });
        window.localStorage.setItem("todofukenArray", JSON.stringify(todofukenArray));
    }
    return todofukenArray;
}//getTodofukenArray

function getShikugunArray(){
    const shikugunArray = [];
    const selectShikugun = document.querySelector("SELECT[name='MEI_KYOTEN_SIKUGUN'");
    if(!selectShikugun) return shikugunArray;
    const MEI_TODOFUKEN = document.querySelector("INPUT[name='MEI_TODOFUKEN']").value;
    const CD_TODOFUKEN = document.querySelector("INPUT[name='CD_TODOFUKEN']").value;
    selectShikugun.querySelectorAll("OPTION").forEach(option=>{
        shikugunArray.push(option.value);
    });
    window.localStorage.setItem(CD_TODOFUKEN, JSON.stringify(shikugunArray));
    return shikugunArray;
}


function createInput(name, value, hidden){
    const input = document.createElement("INPUT");
    input.name = name;
    input.value = value;
    input.hidden = hidden;
    return input;
}//createInput

function getShikugunForms(CD_TODOFUKEN, MEI_TODOFUKEN){
    var shikugunArray;
    try{
        shikugunArray = JSON.parse(window.localStorage.getItem(CD_TODOFUKEN));
        if(shikugunArray === null) return [];
    } catch(e) {
        return [];
    }
    const shikugunForms = [];
    const a2sid = document.querySelector("INPUT[name='a2sid']").value;
    shikugunArray.forEach(shikugun => {
        const form = document.createElement("FORM");
        form.classList.add("ShikugunForm");
        form.setAttribute("method", "post");
        form.setAttribute("action", "https://www.jbrc-sys.com/brsp/a2A/.G01@search");
        form.appendChild(createInput("a2sid", a2sid, true));
        form.appendChild(createInput("TORIATUKAI_SEIHIN", 1, true));
        form.appendChild(createInput("MEI_TODOFUKEN", MEI_TODOFUKEN, true));
        form.appendChild(createInput("CD_TODOFUKEN", CD_TODOFUKEN, true));
        form.appendChild(createInput("MEI_KYOTEN_SIKUGUN", shikugun, true));
        form.appendChild(createInput("SORT_KEY","KAISYU_KYOTEN_JYUSYO_ASC", true));
        form.appendChild(createInput("PAGING_OFFSET", countShops(CD_TODOFUKEN, shikugun) +1, true));
        form.appendChild(createInput("DISP_MODE", 2, true));
        const button = document.createElement("BUTTON");
        button.innerText = MEI_TODOFUKEN + " " + shikugun + "("+ countShops(CD_TODOFUKEN, shikugun) +")";
        button.setAttribute("type", "submit");
        form.appendChild(button);
        shikugunForms.push(form);
    });
    return shikugunForms;
}

function drawTodofuken(CD_TODOFUKEN, MEI_TODOFUKEN){
    var div = document.querySelector("#" +MEI_TODOFUKEN);
    if(div === null){
        div = document.createElement("DIV");
        div.id = ""+MEI_TODOFUKEN;
        document.querySelector("#tampermonkey").appendChild(div);
    }
    div.innerHTML = "";

    const todofukenForm = createTodofukenForm(CD_TODOFUKEN, MEI_TODOFUKEN);
    if(!window.localStorage.getItem(CD_TODOFUKEN)) {
        div.appendChild(todofukenForm);
    }

    const shikugunForms = getShikugunForms(CD_TODOFUKEN, MEI_TODOFUKEN);
    shikugunForms.forEach(shikugunForm=>{
        div.appendChild(shikugunForm);
    });
}

function createTodofukenForm(CD_TODOFUKEN, MEI_TODOFUKEN){
    const form = document.createElement("FORM");
    form.classList.add("TodofukenForm");
    form.setAttribute("method", "post");
    form.setAttribute("action", "https://www.jbrc-sys.com/brsp/a2A/.G01@next");
    const a2sid = document.querySelector("INPUT[name='a2sid']").value;
    form.appendChild(createInput("a2sid", a2sid, true));
    form.appendChild(createInput("TORIATUKAI_SEIHIN", 1, true));
    form.appendChild(createInput("CD_TODOFUKEN", CD_TODOFUKEN, true));
    const button = document.createElement("BUTTON");
    button.setAttribute("type", "submit");
    button.innerText = MEI_TODOFUKEN;
    form.appendChild(button);
    return form;
}

function saveList(){
    const start = parseInt(document.querySelector("DIV.pager SPAN:nth-child(2)").innerText);
    const trArray = document.querySelectorAll("#a2Paging TABLE.list TBODY TR");
    for(var i=0; i<trArray.length; ++i){
        const CD_TODOFUKEN = document.querySelector("INPUT[name='CD_TODOFUKEN'").value;
        const MEI_KYOTEN_SIKUGUN = document.querySelector("SELECT OPTION[selected='selected'").value;
        const trData = {};
        trData.CD_TODOFUKEN = CD_TODOFUKEN;
        trData.MEI_KYOTEN_SIKUGUN = MEI_KYOTEN_SIKUGUN;
        trData.name = trArray[i].querySelector(":nth-child(1)").innerText;
        trData.address = trArray[i].querySelector(":nth-child(2) A").innerText;
        trData.tel = trArray[i].querySelector(":nth-child(3)").innerText;
        window.localStorage.setItem("" + CD_TODOFUKEN + MEI_KYOTEN_SIKUGUN + (start+i), JSON.stringify(trData));
    }
    return i;
}

function countShops(CD_TODOFUKEN, MEI_KYOTEN_SIKUGUN){
    var i = 0;
    for(;;++i){
        const x = window.localStorage.getItem("" + CD_TODOFUKEN + MEI_KYOTEN_SIKUGUN + (i+1));
        if(x === null){
            return i;
        }
    }
}
