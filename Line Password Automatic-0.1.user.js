// ==UserScript==
// @name         Line Password Automatic
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        chrome-extension://ophjlpahpchlmihnnnihgmmeilfjmjjc/index.html
// @match        extension://ophjlpahpchlmihnnnihgmmeilfjmjjc/index.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=line.me
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    window.addEventHandler("load", ()=>{
        alert(1);
    });

    function fillpw(){
        document.querySelector("#line_login_pwd").value="1";
    }
})();