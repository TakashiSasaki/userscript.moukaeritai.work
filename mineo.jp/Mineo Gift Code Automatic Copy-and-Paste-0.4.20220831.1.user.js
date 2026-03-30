// ==UserScript==
// @name         Mineo Gift Code Automatic Copy-and-Paste
// @namespace    userscript.moukaeritai.work
// @version      0.4.20220831.2
// @description  Mineoのギフトコードを自動的にクリップボードにコピーします。Mineoのギフトコードを入力することができるページで前記のギフトコードをペーストします。Mineoのギフト容量として自動的に9999を入力します。パケットチャージの入力欄を非表示にします。ゆずるねを自動的に宣言します。
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://my.mineo.jp/mvno_cp/*.action
// @match        https://userscript.moukaeritai.work/*
// @icon         https://www.google.com/s2/favicons?domain=mineo.jp
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/mineo.jp/Mineo%20Gift%20Code%20Automatic%20Copy-and-Paste-0.4.20220831.1.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/mineo.jp/Mineo%20Gift%20Code%20Automatic%20Copy-and-Paste-0.4.20220831.1.user.js
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
    var h1 = document.querySelector("form h1");
    if(h1 != null){
        if(h1.innerText == "パケットギフト発行完了") {
          const p = document.querySelector("form div p");
          if(p != null){
            const giftCode = p.innerText.match("[A-Z][A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9]");
            GM_setClipboard(giftCode, {type:'text', mimetype: 'text/plain'});
            GM_notification({text: giftCode, timeout: 1});
            GM_setValue("giftCode", giftCode);
            GM_setValue("redeemed", "no");
            //alert("ギフトコード保存完了" + GM_getValue("giftCode"));
          }
        }//パケットギフト発行完了
        if(h1.innerText == "パケットギフトお受け取り完了"){
            GM_setValue("redeemed", "yes");
        }//パケットギフトお受け取り完了
    }
    h1 = document.querySelector("h1");
    if(h1.innerText == "   "){
      const input = document.querySelector("form input[name='packetGiftCode']");
      if(input != null){
        //alert("ギフトコード" + GM_getValue("giftCode"));
        if(GM_getValue("redeemed") == "yes"){
          input.value = "";
        } else {
          input.value = GM_getValue("giftCode");
        }
      }
    }
    if(h1.innerText == "   "){
      const input = document.querySelector("form input[name='packetGiftYoryo']");
      if(input != null){
        input.value = 9999;
      }
    }
    //ゆずるね
    setTimeout(()=>{
      const input = document.querySelector("p.box_yzr_btn > input");
      if(input.value === "ゆずるね。を宣言する"){
        input.click();
      }
    }, 2000);

    setTimeout(()=>{
        const div = document.querySelector("div.boxCharge01");
        div.style.display = "none";
    }, 100);
    setTimeout(()=>{
        const div = document.querySelector("div#lotation_banner_navi");
        div.style.display = "none";
    }, 100);

    //メニューからギフトコード確認
    GM_registerMenuCommand("giftCode", ()=>alert(GM_getValue("giftCode")) , "g");
    GM_registerMenuCommand("redeemed", ()=>alert(GM_getValue("redeemed")) , "g");

    //不要な要素を非表示
    GM_addStyle("#graph_bg{display:none}");
    GM_addStyle("div.top p.caption {display:none}");
    GM_addStyle("#left_graphs div.graph_legend {display:none}");
    GM_addStyle("div.detailArea div.boxPasscket01 {display:none}");
    GM_addStyle("form div#pageStatus2 {display:none}");
    GM_addStyle("form h1.h1_basic {display:none}");
})();
