# gemini-prompt-injector 実装ノート

## プロンプト入力欄と送信ボタンの仕様

- **プロンプト入力欄**: `div.ql-editor[role="textbox"]` または `[aria-label="Gemini へのプロンプトを入力"]`
  - 実態は Quill リッチテキストエディタ。内部に `<p>` タグを持つ。
- **送信ボタン**: `button.send-button` または `[aria-label="プロンプトを送信"]`
  - 入力欄にコンテンツが存在するときのみ表示/活性化される。

## プログラムからテキストを設定して送信する方法

`value` プロパティの変更ではなく、以下のように `innerHTML` を操作し、`input` イベントを発火させる必要がある。

```javascript
const editor = document.querySelector('.ql-editor');
if (editor) {
    // 1. テキストを設定 (内部にpタグを配置する)
    editor.innerHTML = `<p>${promptText}</p>`;
    
    // 2. input イベントを発生させてアプリケーションに入力を認識させる
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 3. 少し待ってから送信ボタンをクリック (DOMの更新・ボタンの活性化待ち)
    setTimeout(() => {
        const sendButton = document.querySelector('button.send-button');
        if (sendButton) {
            sendButton.click();
        }
    }, 100);
}
```

## カスタムイベントの仕様
- イベント名: `gemini-inject-prompt`
- イベント詳細: `detail.prompt` (string) に入力するテキストを含める
- 使用例:
  ```javascript
  document.dispatchEvent(new CustomEvent('gemini-inject-prompt', {
      detail: { prompt: "こんにちは、Gemini!" }
  }));
  ```
