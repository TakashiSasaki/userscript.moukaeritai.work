# gemini-prompt-injector 実装ノート

## バージョン情報の取得方針
UIパネルなどでスクリプト自身のバージョン番号を表示する場合、コード中にハードコード（例: `0.4.4` のような文字列の直接埋め込みや、フォールバック値としての記述など）は行わず、以下のように `GM_info.script.version` を用いて動的に取得してください。

```javascript
const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '';
```

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
            window.geminiClickElement(sendButton);
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

- **モデル選択ボタン**: `button.input-area-switch` — ロケール非依存で堅牢
- **メニュー項目**: `button.bard-mode-list-button` — Gemini固有のセマンティッククラス
- **切り替え方法**:
  1. `window.geminiClickElement(document.querySelector('button.input-area-switch'))` でメニューを開く。
  2. 少し待機後、`document.querySelectorAll('button.bard-mode-list-button')` からテキストに「高速」「思考」「Pro」を含む要素を探し、`window.geminiClickElement(el)` する。

### 追加カスタムイベント仕様
- イベント名: `gemini-switch-model`
- イベント詳細: `detail.model` (string) に `"flash"`, `"thinking"`, `"pro"` のいずれかを指定。
- 使用例:
  ```javascript
  document.dispatchEvent(new CustomEvent('gemini-switch-model', { detail: { model: 'thinking' } }));
  ```
  
## Canvas機能有効化の仕様

Canvas機能はプロンプト入力エリア付近の「ツール」メニュー内にあります。

- **ツールメニューボタン**: `button.toolbox-drawer-button` — ロケール非依存で堅牢
- **メニュー項目**: `button.toolbox-drawer-item-list-button`
- **キャンセルボタン (有効化状態)**: `button.toolbox-drawer-item-deselect-button`
- **有効化手順**:
  1. すでに有効化されている場合（キャンセルボタンが存在し、かつ textContent に "Canvas" が含まれる場合）はクリックしない。
  2. `window.geminiClickElement(document.querySelector('button.toolbox-drawer-button'))` でツールメニューを開く。
  3. 少し待機後、`document.querySelectorAll('button.toolbox-drawer-item-list-button')` からテキストに「Canvas」を含む要素を探し、`window.geminiClickElement(el)` する。

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
  `window.geminiClickElement(document.querySelector('button.send-button'));`

### 追加カスタムイベント仕様
- イベント名: `gemini-send-prompt`
- イベント詳細: 指定なし。
- 使用例:
  ```javascript
  document.dispatchEvent(new CustomEvent('gemini-send-prompt'));
  ```



### State Persistence (GM_setValue)
The script uses `GM_setValue` to persist its state (such as UI position or toggles) across page reloads.

## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - バージョン表記はハードコードしないでください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。テキストの更新は `.button-text` などの専用要素を用いて行い、DOMを破壊しないように注意してください。
   - 新規タブでインストールした後にUIを自動更新するため、ボタンクリック時に `userscript-ping` を一定間隔で送信（ポーリング）する仕組みが `domain-landing.js` に組み込まれています。これにより利用者はリロード不要で「Installed」への変化を確認できます。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。

4. **インストールボタンの `href` は必ず GitHub Raw URL を使用すること（重要）**:
   - `index.html` 内の `.install-button` の `href` 属性には、**必ず**以下の形式の GitHub Raw URL を設定してください:
     ```
     https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/SCRIPT_NAME/SCRIPT_NAME.user.js
     ```
   - **ローカル相対パスを使用してはいけません**。`domain-landing.js` の `fetchVersion()` はこの `href` を使って GitHub から `@version` を取得するため、ローカルパスでは CORS エラーが発生しバージョン取得に失敗します。
   - **ハードコードされたバージョン文字列をボタンテキストに含めてはいけません**。バージョン表示は `domain-landing.js` が GitHub から動的に取得して注入するため、ハードコードすると古いバージョンが表示され続けます。
