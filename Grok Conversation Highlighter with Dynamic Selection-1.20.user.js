// ==UserScript==
// @name         Grok Conversation Highlighter with Dynamic Selection
// @namespace    https://x.com/TakashiSasaki
// @version      1.20
// @description  Auto-scroll, dynamically find the highlighted item by its gray wrapper, then click & highlight the “もっと見る” button in cyan
// @author       Takashi Sasasaki
// @match        https://x.com/i/grok?conversation=*
// @icon         https://x.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  /** Wait until an element matching selector appears in DOM */
  function waitFor(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      let elapsed = 0;
      const id = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(id);
          resolve(el);
        } else if (elapsed > timeout) {
          clearInterval(id);
          reject(new Error(`Timeout waiting for ${selector}`));
        }
        elapsed += 100;
      }, 100);
    });
  }

  // Insert Trash button
  const trashWrapperSel =
    '#react-root div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz ' +
    'main > div > div > div > div > div > div.css-175oi2r.r-aqfbo4.r-gtdqiz.r-1gn8etr.r-1g40b8q ' +
    'div:nth-child(1) > div > div > div > div > div > div > ' +
    'div:nth-child(2) > div > div.css-175oi2r.r-obd0qt.r-13awgt0.r-1777fci > div.css-175oi2r.r-1awozwy.r-18u37iz';
  waitFor(trashWrapperSel)
    .then(wrapper => {
      const btn = document.createElement('button');
      btn.ariaLabel = 'Delete Conversation';
      btn.type = 'button';
      btn.className = 'css-175oi2r r-1phboty r-rs99b7 r-lrvibr r-1q9bdsx r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l';
      btn.style.cssText = 'border:none;background:transparent';
      btn.innerHTML = `<div style="color:rgb(15,20,25)"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:24px;height:24px"><path d="M3 6h18v2H3V6zm2 3h14v12a2 2 0 0 1-2 2H7 a2 2 0 0 1-2-2V9zm3 2v8h2v-8H8zm4 0v8h2v-8h-2 zm4 0v8h2v-8h-2zM9 4V3h6v1h5v2H4V4h5z"/></svg></div>`;
      wrapper.appendChild(btn);
      btn.addEventListener('click', () => {
        const hist = document.querySelector('button[aria-label="チャット履歴"]');
        if (hist) hist.click();
        setTimeout(processHistoryPane, 200);
      });
    })
    .catch(console.error);

  async function processHistoryPane() {
    try {
      // 1) Wait for outer history container
      const outer = await waitFor('#layers > div:nth-child(2) div.css-175oi2r.r-1ny4l3l');

      // 2) Scroll inner pane until gray wrapper appears
      const scrollable = outer.querySelector('div.css-175oi2r.r-150rngu');
      if (scrollable) {
        for (let i = 0; i < 20; i++) {
          const wrapper = scrollable.querySelector('div.r-bqz1g2');
          if (wrapper) break;
          scrollable.scrollBy(0, scrollable.clientHeight);
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // 3) Find the gray wrapper and its parent <a>
      const wrapperDiv = outer.querySelector('div.r-bqz1g2');
      if (!wrapperDiv) {
        console.warn('No wrapper found');
        return;
      }
      const link = wrapperDiv.closest('a.css-175oi2r.r-10sqg0u.r-1ny4l3l');
      if (!link) {
        console.warn('No parent link for wrapper');
        return;
      }

      // 4) Highlight the link
      Object.assign(link.style, {
        background: 'orange',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '6px'
      });
      link.scrollIntoView({behavior:'smooth', block:'center'});

      // 5) Wait for the "もっと見る" button inside that link
      const moreBtn = await waitFor('a.css-175oi2r.r-10sqg0u.r-1ny4l3l[style*="background: orange"] button[aria-label="もっと見る"]');
      moreBtn.click();
      Object.assign(moreBtn.style, {
        background: 'cyan',
        color: 'white',
        padding: '4px',
        borderRadius: '4px'
      });

    } catch (e) {
      console.error(e);
    }
  }

  // Also rerun when native history clicked
  document.addEventListener('click', e => {
    if (e.target.closest('button[aria-label="チャット履歴"]')) {
      setTimeout(processHistoryPane, 200);
    }
  });
})();
