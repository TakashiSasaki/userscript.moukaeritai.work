// ==UserScript==
// @name         Save a Gemini message to Google Docs
// @namespace    https://x.com/TakashiSasaki/greasyfork/gemini-message-options-shortcut
// @version      0.5.5
// @description  Wraps clicks, uses waitForSelector, injects emoji export buttons inline and menu-adjacent without duplicates, force-highlights direct child DIVs. Includes injection banner and menu command.
// @author       Takashi Sasasaki
// @license      MIT
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/app/*
// @match        https://gemini.google.com/app
// @icon         https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685481c559f160ea06b.png
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'Save a Gemini message to Google Docs';
  // banner
  const banner = document.createElement('div');
  banner.textContent = SCRIPT_NAME;
  banner.style.cssText = `position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;border-radius:4px;z-index:999999;font-size:12px;font-family:sans-serif`;
  document.body.appendChild(banner);

  // config
  const USE_CTRL_KEY = true;
  const USE_SHIFT_KEY = true;
  const TRIGGER_KEY_D = 'D';
  const SEL_MENU_BTN = '[data-test-id="more-menu-button"]';
  const SEL_EXPORT_BTN = '[data-test-id="export-button"]';
  const SEL_SHARE_EXPORT = '[data-test-id="share-and-export-menu-button"]';
  const SEL_CONTAINER = 'response-container';
  const BTN_CLASS = 'gm-export-btn';
  const WAIT_SHORT = 150;
  const WAIT_MED = 200;
  const TIMEOUT = 3000;
  const INTERVAL = 100;

  function simulateClick(el) {
    el && el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  }

  function waitForSelector(selector, timeout=TIMEOUT) {
    return new Promise(res=>{
      let el;
      let waited=0;
      const id = setInterval(()=>{
        el=document.querySelector(selector);
        if(el|| waited>=timeout) { clearInterval(id); res(el); }
        waited+=INTERVAL;
      }, INTERVAL);
    });
  }

  function forceHighlight(el) {
    if(!el) return;
    el.style.setProperty('background-color','rgba(0,255,0,0.15)','important');
    el.style.setProperty('outline','3px solid lime','important');
  }

  async function findExportToDocs() {
    const end = Date.now()+TIMEOUT;
    while(Date.now()<end) {
      const btns = document.querySelectorAll(
        'button.mat-ripple.option, button[matripple].option, button.mat-mdc-menu-item'
      );
      for(const b of btns) {
        const lab = b.querySelector('span.item-label, span.mat-mdc-menu-item-text');
        const ico = b.querySelector('mat-icon[data-mat-icon-name="docs"]');
        if(lab && lab.textContent.trim()==='Export to Docs' && ico && b.offsetParent) return b;
      }
      await new Promise(r=>setTimeout(r,INTERVAL));
    }
    return null;
  }

  async function exportFor(container) {
    const menuBtn = container.querySelector(SEL_MENU_BTN);
    if(!menuBtn) return;
    simulateClick(menuBtn); await new Promise(r=>setTimeout(r,WAIT_MED));

    let exp = await waitForSelector(SEL_EXPORT_BTN);
    if(!exp) { simulateClick(document.body); await new Promise(r=>setTimeout(r,WAIT_SHORT)); exp = await waitForSelector(SEL_SHARE_EXPORT);}
    if(!exp) { console.error(`${SCRIPT_NAME} export menu not found`); return; }
    simulateClick(exp); await new Promise(r=>setTimeout(r,WAIT_MED));

    const docs = await findExportToDocs();
    if(!docs) { console.error(`${SCRIPT_NAME} 'Export to Docs' not found`); return; }
    docs.style.setProperty('background-color','yellow','important');
    docs.style.setProperty('border','2px solid red','important');
    docs.style.setProperty('outline','2px dashed orange','important');
    simulateClick(docs);
  }

  function createButton(container) {
    const btn = document.createElement('button');
    btn.textContent='📄';
    btn.className=BTN_CLASS;
    Object.assign(btn.style,{margin:'4px',padding:'4px',cursor:'pointer',fontSize:'14px',border:'none',background:'transparent'});
    btn.addEventListener('click',e=>{e.stopPropagation();exportFor(container);});
    return btn;
  }

  function processContainers() {
    document.querySelectorAll(SEL_CONTAINER).forEach(container => {
      // inline under avatar: allow one button after avatar
      const gutter = container.querySelector('div.avatar-gutter');
      const avatar = gutter?.querySelector('bard-avatar');
      if (avatar) {
        const next = avatar.nextSibling;
        if (!(next && next.classList && next.classList.contains(BTN_CLASS))) {
          avatar.parentNode.insertBefore(createButton(container), avatar.nextSibling);
        }
      }
      // menu-adjacent: allow one button after wrapper
      const wrapper = container.querySelector('div.menu-button-wrapper');
      const menuBtn = wrapper?.querySelector('button');
      if (menuBtn) {
        const nextMenu = wrapper.nextSibling;
        if (!(nextMenu && nextMenu.classList && nextMenu.classList.contains(BTN_CLASS))) {
          wrapper.parentNode.insertBefore(createButton(container), wrapper.nextSibling);
        }
      }
    });
    const visibles = Array.from(document.querySelectorAll(SEL_CONTAINER)).filter(c => c.offsetParent);
    if (!visibles.length) return;
    visibles.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const top = visibles[0];
    visibles.forEach(c=>{
      const direct = c.querySelector(':scope>div');
      if(!direct) return;
      if(c===top) forceHighlight(direct);
      else direct.style.setProperty('outline','3px dashed lime','important');
    });
  }

  new MutationObserver(processContainers).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',processContainers);
  window.addEventListener('scroll',processContainers);
  window.addEventListener('resize',processContainers);

  document.addEventListener('keydown',e=>{
    if(e.ctrlKey===USE_CTRL_KEY&&e.shiftKey===USE_SHIFT_KEY&&e.key.toUpperCase()===TRIGGER_KEY_D){
      e.preventDefault();e.stopPropagation();
      const first=Array.from(document.querySelectorAll(SEL_CONTAINER)).find(c=>c.offsetParent);
      first && exportFor(first);
    }
  },true);

  if(typeof GM_registerMenuCommand==='function') GM_registerMenuCommand(`Check ${SCRIPT_NAME}`,()=>alert(`${SCRIPT_NAME} is active`));
  console.log(`[${SCRIPT_NAME}] v0.5.5 loaded and active.`);
})();
