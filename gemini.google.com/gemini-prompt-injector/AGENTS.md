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

## モデル切替（高速、思考、Pro）の仕様

モデル選択はプロンプト入力エリア付近のドロップダウンメニューで行われます。

- **モデル選択ボタン**: `button[aria-label="モード選択ツールを開く"]` または `button.input-area-switch`
- **メニュー項目**: メニュー展開後に表示される `button[role="menuitem"]`
- **切り替え方法**:
  1. `document.querySelector('button[aria-label="モード選択ツールを開く"]').click()` でメニューを開く。
  2. 少し待機後、`document.querySelectorAll('button[role="menuitem"]')` からテキストに「高速」「思考」「Pro」を含む要素を探し、`.click()` する。

### 追加カスタムイベント仕様
- イベント名: `gemini-switch-model`
- イベント詳細: `detail.model` (string) に `"flash"`, `"thinking"`, `"pro"` のいずれかを指定。
- 使用例:
  ```javascript
  document.dispatchEvent(new CustomEvent('gemini-switch-model', { detail: { model: 'thinking' } }));
  ```
  
## Canvas機能有効化の仕様

Canvas機能はプロンプト入力エリア付近の「ツール」メニュー内にあります。

- **ツールメニューボタン**: `button.toolbox-drawer-button` （または `aria-label="ツール"`）
- **メニュー項目**: `button.toolbox-drawer-item-list-button`
- **キャンセルボタン (有効化状態)**: `button.toolbox-drawer-item-deselect-button`
- **有効化手順**:
  1. すでに有効化されている場合（キャンセルボタンが存在し、かつ textContent に "Canvas" が含まれる場合）はクリックしない。
  2. `document.querySelector('button.toolbox-drawer-button').click()` でツールメニューを開く。
  3. 少し待機後、`document.querySelectorAll('button.toolbox-drawer-item-list-button')` からテキストに「Canvas」を含む要素を探し、`.click()` する。

### 追加カスタムイベント仕様
- イベント名: `gemini-enable-canvas`
- イベント詳細: 指定なし。
- 使用例:
  ```javascript
  document.dispatchEvent(new CustomEvent('gemini-enable-canvas'));
  ```

## プロンプト送信の単独実行仕様

プロンプト入力エリアの送信ボタンを外部か独立してクリックするための仕様です。

- **送信ボタン**: `button.send-button` (または `button.submit.send-button`)
- **特徴**: テキスト入力がない状態ではマイクボタン等になっており、テキストが存在するときのみ送信ボタンが表示（有効化）されます。クラス名が機能に直結しており、`aria-label`等（言語依存）に依存しないためグローバルに堅牢です。
- **実行手順**:
  `document.querySelector('button.send-button')?.click();`

### 追加カスタムイベント仕様
- イベント名: `gemini-send-prompt`
- イベント詳細: 指定なし。
- 使用例:
  ```javascript
  document.dispatchEvent(new CustomEvent('gemini-send-prompt'));
  ```
