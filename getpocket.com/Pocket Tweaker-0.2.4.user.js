// ==UserScript==
// @name         Pocket Tweaker
// @namespace    https://gist.github.com/TakashiSasaki/c9b96fc39fb4992aac2fab56db9592a0/raw/PocketTweaking.js
// @version      0.2.4
// @description  This Userscript fixes the following problems in Pocket (https://getpocket.com/) articles. 1) <pre> tag background color is too dark. 2) The display area of <article> tag is too narrow.
// @author       Takashi SASAKI (https://twitter.com/TakashiSasaki)
// @match        https://getpocket.com/my-list
// @match        https://getpocket.com/read/*
// @icon         https://www.google.com/s2/favicons?domain=getpocket.com
// @grant        none
// @updateURL    https://gist.github.com/TakashiSasaki/c9b96fc39fb4992aac2fab56db9592a0/raw/PocketTweaking.js
// @downloadURL  https://gist.github.com/TakashiSasaki/c9b96fc39fb4992aac2fab56db9592a0/raw/PocketTweaking.js
// ==/UserScript==

function setArticleStyle(article){
    //const article = document.querySelector("body > div > main > article");
    if(!article) return;
    article.style.maxWidth = "96%";
}//setArticleStyle

function setPreStyle(pre){
    //const pres = document.querySelectorAll("body > div > main > article pre");
    if(!pre) return;
    pre.style.background = "initial";
    pre.style.borderColor ="--(color-textSecondary)";
    pre.style.borderStyle ="dashed";
    pre.style.margin = "initial";
    pre.style.width = "85vw";
}//setPreStyle

function setStyleDeferred(){
    setTimeout(()=>{
    }, 10);
}

(function() {
    'use strict';
    document.querySelector("body").addEventListener("load", setStyleDeferred);

    const observer = new MutationObserver( mutations =>{
        mutations.forEach( mutation => {
            console.log(mutation.target.tagName);

            if(mutation.target.classList.contains("reader")){
            }//if

            if(mutation.target.tagName === "ARTICLE"){
                if(mutation.target.classList.contains("reader")){
                   setArticleStyle(mutation.target);
                }
                const pres = mutation.target.querySelectorAll("PRE");
                if(pres){
                    pres.forEach(pre=>setPreStyle(pre));
                }
            }//if
        }//if
      );
    });

    observer.observe(document.querySelector("BODY > DIV"), {
        characterData : true,
        attributes : true,
        attributeOldValue: false,
        characterDataOldValue: false,
        childList: true,
        subtree: true,
    });
})();
