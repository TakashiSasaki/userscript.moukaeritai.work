// @name         Add Delete Button for Chat Conversations on Claude.ai
// @namespace    userscript.moukaeritai.work
// @version      0.5.1
// @description  Add a delete button to easily remove chat conversations on Claude.ai.
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://claude.ai/chat/*
// @match        https://claude.ai/chats
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/claude.ai/Add%20Delete%20Button%20for%20Chat%20Conversations%20on%20Claude.ai-0.4.20240326.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/claude.ai/Add%20Delete%20Button%20for%20Chat%20Conversations%20on%20Claude.ai-0.4.20240326.user.js
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



    // チャット会話を削除する関数
    function deleteChatConversation(url) {
        return fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
                // 他の必要なヘッダーを追加することができます
            },
            // オプションのボディーデータがある場合はここに追加できます
        })
            .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // 応答を JSON 形式で解析
        })
            .then(data => {
            return data; // 応答データを返す
        })
            .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
            throw new Error('Failed to delete chat conversation');
        });
    }

    // ボタンを作成する関数
    function createButton(href, lastActiveOrg) {
        // ボタン要素を作成
        const button = document.createElement('button');
        button.className = 'custom-button'; // 重複追加を避けるためのクラス名
        button.innerHTML = '🗑️'; // ゴミ箱絵文字を設定
        button.style.marginTop = '5px';
        button.setAttribute('data-href', href); // data-href 属性にアンカータグの href 属性の値を設定

        // ボタンに z-index を適用
        button.style.zIndex = '999';

        // ボタンに機能を追加
        button.addEventListener('click', function(event) {
            event.stopPropagation(); // ここでイベントの伝搬を阻止
            const hrefValue = button.getAttribute('data-href'); // ボタンの data-href 属性の値を取得
            const uuid = hrefValue.split('/').pop(); // hrefValue から UUID 文字列を取得
            const url = 'https://claude.ai/api/organizations/' + lastActiveOrg + '/chat_conversations/' + uuid;

            // DELETE リクエストを送信
            deleteChatConversation(url)
                .then(data => {
                alert('Chat conversation deleted successfully!');
                // 他の処理を追加することができます
            })
                .catch(error => {
                alert(error.message); // エラーメッセージを表示
            });
        });

        return button;
    }

    // ボタンを追加する関数
    function addButtons() {
        // 特定のアンカータグを全て選択
        const anchors = document.querySelectorAll('a.absolute.inset-0[href^="/chat/"]');
        anchors.forEach(anchor => {
            // すでにボタンが追加されているかを確認
            if (!anchor.querySelector('.custom-button')) {
                const button = createButton(anchor.getAttribute('href'), localStorage.getItem('lastActiveOrg'));
                // アンカータグの親要素の隣にボタンを追加
                anchor.parentNode.parentNode.insertBefore(button, anchor.parentNode.nextSibling);
            }
        });
    }

    // ページロード完了後に一度だけボタンを追加
    window.addEventListener('load', function() {
        setTimeout(addButtons, 3000);
    });

})();