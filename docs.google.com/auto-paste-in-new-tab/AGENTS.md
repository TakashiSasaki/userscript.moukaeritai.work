# Auto Paste in New Tab

## 目的
Google Docs上で新しいタブを開き、クリップボードの内容を自動でペーストするスクリプトです。

## 機能概要
- Google Docs (ドキュメント) の画面上にフローティングボタンを配置します。
- ユーザーはボタンを自由にドラッグして移動でき、その位置は記憶されます。
- ボタンを押下すると、内部的にカスタムイベント（例: `EmulateDocsPaste`）を発火します。
- カスタムイベントに反応して、`Shift+F11` をエミュレートし、500msの待機後にペースト操作をエミュレートします。
- ペースト操作は、設定によって `Ctrl+V` のキーボードイベント送信、または「編集」メニューからの「貼り付け」項目クリックを選択可能です。

## 対象サイト
- https://docs.google.com/document/*

---

## 実装ノート

### 概要
Google Docs上で、新規タブを開き（Shift+F11）、少し遅延してからペースト（Ctrl+V または 編集メニュー操作）をエミュレートするスクリプト。
対象URLは `docs.google.com/document/*` に限定される。

### イベント発火
対象がGoogle Docsということもあり、信頼されないイベント（`isTrusted: false`）によるキーボードイベントのエミュレートが機能するかは環境依存の可能性がある。
現状の要件として、「Shift+F11」と「Ctrl+V」を現在フォーカスのある要素（`document.activeElement` または `document.body`）に対して `KeyboardEvent` でディスパッチしている。

### メニューペーストのロジック（代替手段）
設定によって「編集」メニュー経由でのペーストを選択可能。
- 「編集」メニュー（`#docs-edit-menu`）に `mousedown`, `mouseup` を送ってメニューを開く。
- 少し待機した後、`.goog-menuitem` を検索。「Ctrl+V」や「Paste」や「貼り付け」を含む項目を見つけ、`mousedown`, `mouseup`, `click` を送ってペースト実行をエミュレート。  
- 検索の際、「書式なしで貼り付け」等のノイズを除外している。

### UI要件
- ラベル: `Paste in new tab`
- フローティング表示で、ドラッグ＆ドロップにより移動可能。
- `GM_setValue` / `GM_getValue` を用いて位置とペースト設定（`pasteMethod`）を永続化。
- `userscript-check-installed` イベント等、インストール検知の共通ロジックを実装。

### イベントフロー
1. ユーザーが「Paste in new tab」ボタンをクリックする。
2. `EmulateDocsPaste` カスタムイベントが `document` で発火する。
3. イベントリスナーが発火を検知し、`Shift+F11` をディスパッチ。
4. 500msの `setTimeout` で待機。
5. 設定（`pasteMethod`）に応じて、`Ctrl+V` をディスパッチするか、「編集」メニューを開いて「貼り付け」項目をクリックする。