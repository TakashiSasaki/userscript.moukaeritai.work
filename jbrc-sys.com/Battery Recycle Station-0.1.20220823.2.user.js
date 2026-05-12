// ==UserScript==
// @name         Battery Recycle Station
// @namespace    http://tampermonkey.net/
// @version      0.1.20220823.2
// @description  try to take over the world!
// @author       Takashi SASAKI
// @website      https://twitter.com/TakashiSasaki
// @match        https://www.jbrc-sys.com/brsp/a2A/*
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jbrc.com
// @grant        GM_addStyle
// @updateURL    https://gist.github.com/TakashiSasaki/4d507c70fdc60faff72c60fb183d0360/raw/jbrc-battery-recycle-station.user.js
// @downloadURL  https://gist.github.com/TakashiSasaki/4d507c70fdc60faff72c60fb183d0360/raw/jbrc-battery-recycle-station.user.js
// @match https://userscript.moukaeritai.work/*
// ==/UserScript==

(function() {
    'use strict';

    unhide();
    drawDivTampermonkey();
    const todofukenArray = getTodofukenArray();
    const shikugunArray = getShikugunArray();

    todofukenArray.forEach(todofuken=>{
        setTimeout(()=>drawTodofuken(todofuken.value, todofuken.innerText), 10);
    });
    GM_addStyle("INPUT[name='TORIATUKAI_SEIHIN'] {width: 2em}");
    GM_addStyle("INPUT[name='CD_TODOFUKEN'] {width: 3em}");
    GM_addStyle("INPUT[name='TORIATUKAI_SEIHIN'] {width: 2em}");
    GM_addStyle("INPUT[name='CD_TODOFUKEN'] {width: 3em}");

})();

setTimeout(saveList, 1000);


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
}

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
        //form.classList.add("tampermonkey");
        form.setAttribute("method", "post");
        form.setAttribute("action", "https://www.jbrc-sys.com/brsp/a2A/.G01@search");
        const input_a2sid = document.createElement("INPUT");
        input_a2sid.name = "a2sid";
        input_a2sid.value = a2sid;
        input_a2sid.hidden = true;
        form.appendChild(input_a2sid);
        const input_TORIATUKAI_SEIHIN = document.createElement("INPUT");
        input_TORIATUKAI_SEIHIN.name = "TORIATUKAI_SEIHIN";
        input_TORIATUKAI_SEIHIN.value = 1;
        input_TORIATUKAI_SEIHIN.hidden = true;
        form.appendChild(input_TORIATUKAI_SEIHIN);
        const input_MEI_TODOFUKEN = document.createElement("INPUT");
        input_MEI_TODOFUKEN.name = "MEI_TODOFUKEN";
        input_MEI_TODOFUKEN.value = MEI_TODOFUKEN;
        input_MEI_TODOFUKEN.hidden = true;
        form.appendChild(input_MEI_TODOFUKEN);
        const input_CD_TODOFUKEN = document.createElement("INPUT");
        input_CD_TODOFUKEN.name = "CD_TODOFUKEN";
        input_CD_TODOFUKEN.value = CD_TODOFUKEN;
        input_CD_TODOFUKEN.hidden = true;
        form.appendChild(input_CD_TODOFUKEN);
        const input_MEI_KYOTEN_SIKUGUN = document.createElement("INPUT");
        input_MEI_KYOTEN_SIKUGUN.name = "MEI_KYOTEN_SIKUGUN";
        input_MEI_KYOTEN_SIKUGUN.value = shikugun;
        input_MEI_KYOTEN_SIKUGUN.hidden = true;
        form.appendChild(input_MEI_KYOTEN_SIKUGUN);
        const input_SORT_KEY = document.createElement("INPUT");
        input_SORT_KEY.name = "SORT_KEY";
        input_SORT_KEY.value = "KAISYU_KYOTEN_JYUSYO_ASC";
        input_SORT_KEY.hidden = true;
        form.appendChild(input_SORT_KEY);
        const input_PAGING_OFFSET = document.createElement("INPUT");
        input_PAGING_OFFSET.name = "PAGING_OFFSET";
        input_PAGING_OFFSET.value = 1;
        input_PAGING_OFFSET.hidden = true;
        form.appendChild(input_PAGING_OFFSET);
        const input_DISP_MODE = document.createElement("INPUT");
        input_DISP_MODE.name = "DISP_MODE";
        input_DISP_MODE.value = 2;
        input_DISP_MODE.hidden = true;
        form.appendChild(input_DISP_MODE);
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
    div.appendChild(todofukenForm);

    const shikugunForms = getShikugunForms(CD_TODOFUKEN, MEI_TODOFUKEN);
    shikugunForms.forEach(shikugunForm=>{
        div.appendChild(shikugunForm);
    });
}

function createTodofukenForm(CD_TODOFUKEN, MEI_TODOFUKEN){
    const form = document.createElement("FORM");
    form.setAttribute("method", "post");
    form.setAttribute("action", "https://www.jbrc-sys.com/brsp/a2A/.G01@next");
    //form.setAttribute("name", "main");
    const input_a2sid = document.createElement("INPUT");
    input_a2sid.name = "a2sid";
    const a2sid = document.querySelector("INPUT[name='a2sid']").value;
    input_a2sid.value =a2sid;
    input_a2sid.hidden = true;
    form.appendChild(input_a2sid);
    const input_TORIATUKAI_SEIHIN = document.createElement("INPUT");
    input_TORIATUKAI_SEIHIN.name ="TORIATUKAI_SEIHIN";
    input_TORIATUKAI_SEIHIN.value = 1;
    input_TORIATUKAI_SEIHIN.hidden = true;
    form.appendChild(input_TORIATUKAI_SEIHIN);
    const input_CD_TODOFUKEN = document.createElement("INPUT");
    input_CD_TODOFUKEN.name ="CD_TODOFUKEN";
    input_CD_TODOFUKEN.value = CD_TODOFUKEN;
    input_CD_TODOFUKEN.hidden = true;
    form.appendChild(input_CD_TODOFUKEN);
    const button = document.createElement("BUTTON");
    button.setAttribute("type", "submit");
    button.innerText = MEI_TODOFUKEN;
    form.appendChild(button);
    return form;
}

function saveList(){
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
        window.localStorage.setItem("" + CD_TODOFUKEN + MEI_KYOTEN_SIKUGUN + i, JSON.stringify(trData));
    }
}

function countShops(CD_TODOFUKEN, MEI_KYOTEN_SIKUGUN){
    var i = 0;
    for(;;++i){
        const x = window.localStorage.getItem("" + CD_TODOFUKEN + MEI_KYOTEN_SIKUGUN + i);
        if(x === null){
            return i;
        }
    }
}
