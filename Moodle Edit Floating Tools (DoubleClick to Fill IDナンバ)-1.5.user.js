// ==UserScript==
// @name         Moodle Edit Floating Tools (DoubleClick to Fill IDナンバ)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Floating bar with Save/Cancel, wide IDナンバ input, placeholder is previous value, double-click placeholder to fill
// @match        https://moodle41.lms.ehime-u.ac.jp/moodle/question/bank/editquestion/question.php*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const LAST_IDNUMBER_KEY = 'moodle_last_idnumber';

    async function tryInject() {
        const idField = document.getElementById('fitem_id_idnumber');
        const realInput = document.getElementById('id_idnumber');
        const realSubmit = document.getElementById('id_submitbutton');
        const realCancel = document.getElementById('id_cancel');
        if (!(idField && realInput && realSubmit)) {
            setTimeout(tryInject, 400);
            return;
        }
        if (document.getElementById('moodle-edit-floatingtools')) return;

        // 直前値をGM_getValueで取得
        const lastValue = await GM_getValue(LAST_IDNUMBER_KEY, '');

        // 右上用にIDナンバ欄をコピー
        const idFieldClone = idField.cloneNode(true);
        const inputClone = idFieldClone.querySelector('input');
        if (inputClone) {
            inputClone.value = realInput.value;
            if (lastValue && !inputClone.value) {
                inputClone.placeholder = lastValue; // 前置きなし
            }
            // 横幅調整
            inputClone.style.minWidth = '200px';
            inputClone.style.maxWidth = '400px';
            // 入力値を元の欄と同期
            inputClone.addEventListener('input', e => {
                realInput.value = inputClone.value;
            });
            realInput.addEventListener('input', e => {
                inputClone.value = realInput.value;
            });

            // ダブルクリックでplaceholderを入力値にコピー
            inputClone.addEventListener('dblclick', function(e) {
                if (inputClone.placeholder && !inputClone.value) {
                    inputClone.value = inputClone.placeholder;
                    realInput.value = inputClone.value;
                    // 入力イベントを発火（他のJS連携対策）
                    inputClone.dispatchEvent(new Event('input', { bubbles: true }));
                    realInput.dispatchEvent(new Event('input', { bubbles: true }));
                    // カーソルを末尾に
                    inputClone.focus();
                    inputClone.setSelectionRange(inputClone.value.length, inputClone.value.length);
                }
            });
        }

        // 保存時にGM_setValueへ記憶
        realSubmit.addEventListener('click', function() {
            const val = realInput.value.trim();
            if (val) GM_setValue(LAST_IDNUMBER_KEY, val);
        });
        // 右上の保存ボタンも同様に保存
        const saveLastIdnumber = function() {
            const val = inputClone.value.trim();
            if (val) GM_setValue(LAST_IDNUMBER_KEY, val);
        };

        // 右上固定バー作成
        const floatingBar = document.createElement('div');
        floatingBar.id = 'moodle-edit-floatingtools';
        floatingBar.style.position = 'fixed';
        floatingBar.style.top = '12px';
        floatingBar.style.right = '24px';
        floatingBar.style.zIndex = '10000';
        floatingBar.style.background = 'rgba(255,255,255,0.97)';
        floatingBar.style.borderRadius = '10px';
        floatingBar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        floatingBar.style.padding = '8px 18px';
        floatingBar.style.display = 'flex';
        floatingBar.style.alignItems = 'center';
        floatingBar.style.gap = '1em';
        floatingBar.style.minWidth = '340px';
        floatingBar.style.maxWidth = '650px';

        floatingBar.appendChild(idFieldClone);

        // プロキシ「保存」ボタン
        const proxySubmit = document.createElement('button');
        proxySubmit.textContent = '変更を保存する';
        proxySubmit.className = realSubmit.className + ' btn-proxy-submit';
        proxySubmit.style.minWidth = '100px';
        proxySubmit.onclick = function(e) {
            e.preventDefault();
            saveLastIdnumber();
            realSubmit.click();
        };

        // プロキシ「キャンセル」ボタン
        let proxyCancel;
        if (realCancel) {
            proxyCancel = document.createElement('button');
            proxyCancel.textContent = 'キャンセル';
            proxyCancel.className = realCancel.className + ' btn-proxy-cancel';
            proxyCancel.style.minWidth = '100px';
            proxyCancel.onclick = function(e) {
                e.preventDefault();
                realCancel.click();
            };
        }

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.alignItems = 'center';
        btnGroup.style.gap = '0.7em';
        btnGroup.appendChild(proxySubmit);
        if (proxyCancel) btnGroup.appendChild(proxyCancel);
        floatingBar.appendChild(btnGroup);

        document.body.appendChild(floatingBar);

        GM_addStyle(`
            #moodle-edit-floatingtools .form-group {
                margin-bottom: 0 !important;
            }
            #moodle-edit-floatingtools input[type="text"] {
                min-width: 200px !important;
                max-width: 400px !important;
                width: 100%;
            }
            #moodle-edit-floatingtools button {
                min-width: 100px;
                font-size: 1em;
            }
            @media (max-width: 900px) {
                #moodle-edit-floatingtools {
                    flex-direction: column;
                    align-items: stretch;
                    right: 2vw;
                    min-width: unset;
                    max-width: 98vw;
                    padding: 8px 4vw;
                }
                #moodle-edit-floatingtools > * {
                    width: 100%;
                }
            }
        `);
    }
    tryInject();
})();
