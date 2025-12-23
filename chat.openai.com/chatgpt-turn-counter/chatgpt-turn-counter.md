# ChatGPT Turn Counter 開発ドキュメント

このドキュメントは、Tampermonkey等で動作するユーザースクリプト `chatgpt-turn-counter.user.js` の仕様と開発リソースについて記述します。

## 1. 概要と目的

本スクリプトは、ChatGPT上の会話において、メッセージ数や画像送信数、文字数などをリアルタイムにカウントし、画面上に表示することを目的としています。ユーザーの学習状況や対話量の定量化に役立ちます。

## 2. 機能一覧

### 2.1 カウンター機能 (Turn Counter)
以下の要素をカウントし、表示します。

*   **ユーザー送信数 (User)**: ユーザーがメッセージを送信した回数
    *   **文字数表示**: 送信メッセージに含まれるテキストノードのみを対象とした合計文字数を併記 (例: `5 (1,234 chars)`)。
*   **アシスタント応答数 (Assistant)**: アシスタントがレスポンスを返した回数
    *   **文字数表示**: 応答メッセージに含まれるテキストノードのみを対象とした合計文字数を併記。
*   **コード断片数 (Code Blocks)**: アシスタントの応答に含まれるコードブロック(`<pre>`)の数
*   **画像送信数 (Images)**: ユーザーが送信した画像の枚数

### 2.2 ユーザーインターフェイス (UI)
*   **初期状態**: 画面右上に小さなアイコンボタンとして表示（会話の邪魔にならない設計）。
*   **展開 ("Click to Expand")**: アイコンをクリックするとパネルが展開し、詳細なカウンター情報が表示される。
*   **自動折りたたみ ("Mouseleave to Collapse")**: マウスカーソルがUIパネルから離れると、自動的に元のアイコン状態に戻る。
*   **表示順序**: 各カウンターは以下の順序で表示する。
    1.  User (メッセージ数 + 文字数)
    2.  Assistant (メッセージ数 + 文字数)
    3.  Code Blocks (コード断片数)
    4.  Images (画像数)
*   **画像サムネイル**:
    *   Images行の下に、ユーザーが送信した画像のサムネイル一覧を表示する。
    *   サムネイルは極小サイズ（約20px四方）とし、タイリング表示する。
*   **デザイン**: ChatGPTのダークテーマに馴染む配色とSöhneフォントを使用。

## 3. 技術仕様

### 3.1 動作環境
*   **実行環境**: TamperMonkey などのユーザースクリプトマネージャー
*   **対象URLパターン**: `https://chatgpt.com/c/*`
    *   例: `https://chatgpt.com/c/6947a5eb-7f3c-8320-bed5-7c8199b5722c`
    *   URLの末尾はUUID形式の文字列で構成されます。
*   **名前空間**: `userscript.moukaeritai.work`

## 4. 開発リソース (DOM解析用サンプル)

`samples` ディレクトリには、安定したDOMセレクタを特定するためのHTMLサンプルが保存されています。開発時にはこれらのファイルを参照してください。

### 4.1 会話全体
*   **sample1-whole.html**: 会話セッション全体のDOM構造を示すサンプル。

### 4.2 コンポーネント別DOM断片
DOM構造の変化に強いセレクタを設計するため、各要素の断片を収集しています。DOM解析時は、余分なタグを含めず、対象となるコンテンツの主要なコンテナに注目してください。

*   **アシスタントの応答**: `sample1-assistant1.html`, `sample1-assistant2.html`
*   **ユーザーのメッセージ**: `sample1-user1.html`, `sample1-user2.html`, `sample1-user3.html`
*   **コードブロック**: `sample1-codefence1.html` (コードフェンス部分のDOM)
*   **ユーザー画像**: `sample1-image1.html` 〜 `sample1-image4.html` (インライン表示される`<img>`タグ)

## 5. プロジェクト管理情報

### 5.1 作者
*   **Name**: Takashi Sasaki
*   **URL**: [x.com/TakashiSasaki](https://x.com/TakashiSasaki)

### 5.2 バージョン管理運用
バージョン番号は `chatgpt-turn-counter.user.js` 内の `@version` メタデータにて管理します（形式: `major.minor.patch`）。

*   **Patch Level**: コードへの何らかの変更を行った際に自動的にバンプアップする。
*   **Minor Version**: ユーザーからの明示的な指示があった場合にバンプアップし、Patch Levelを `0` にリセットする。
*   **Major Version**: ユーザーが手動で変更するまで維持する。

### 5.3 自動アップデート (Automatic Updates)
本スクリプトは、Tampermonkey等の自動アップデート機能に対応しています。以下のURLにて最新版が公開されることを想定しています。

*   **Update URL**: [`https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/chat.openai.com/chatgpt-turn-counter/chatgpt-turn-counter.user.js`](https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/chat.openai.com/chatgpt-turn-counter/chatgpt-turn-counter.user.js)

`@updateURL` および `@downloadURL` メタデータにより、スクリプトマネージャーは定期的にこのURLをチェックし、新しいバージョンが公開されている場合に自動的に更新を行います。



## 2.3 サムネイル操作 (Thumbnail Interaction)
*   **ホバーツールチップ (Hover)**:
    *   サムネイル画像にマウスオーバーすると、少し待ってからツールチップを表示する。
    *   ツールチップには、画像をData URI化した際の推定サイズ（バイト数）を表示する (例: `DataURI: 1,234,567 bytes`)。
*   **クリック操作 (Copy Single Image)**:
    *   サムネイルをクリックすると、その画像のData URIを `src` 属性に持つ `<img>` タグ (`<img src="data:image/png;base64,...">`) をクリップボードにコピーする。
    *   クリップボードのMIMEタイプは `text/html` とし、リッチテキストエディタ等へ直接貼り付け可能にする。
    *   コピー成功時、対象のサムネイルを**赤い枠線**で囲み、コピー済みであることを視覚的にフィードバックする。

## 2.4 画像一括コピー機能 (Batch Copy)
*   **"Copy All" ボタン**: UIパネルの "Images" 行に配置。
*   **ホバー機能**:
    *   ボタンにマウスオーバーすると、表示されている全画像を結合した場合の合計サイズを計算し、ツールチップで表示する (例: `Total Size: 5,678,900 bytes`)。
    *   計算中は "Calculating..." と表示する。
*   **クリック操作 (Preview & Copy)**:
    *   ボタンをクリックすると、**プレビューモーダル (Modal)** を画面中央に表示する。
    *   モーダルには、生成されたHTMLソース（複数の `<img>` タグの羅列）が表示され、コピー前に内容を確認できる。
    *   モーダル内の **"Copy to Clipboard"** ボタンをクリックすることで、クリップボードへのコピーを実行する。
    *   コピー完了後、ボタンの表示が一時的に "Copied!" に変化する。
    *   **MIMEタイプ補正**: 画像取得時にサーバーが `application/octet-stream` などの汎用MIMEタイプを返した場合でも、画像のバイナリヘッダー（マジックナンバー）を解析し、正しいMIMEタイプ (`image/png`, `image/jpeg` 等) に修正してData URIを生成する。

