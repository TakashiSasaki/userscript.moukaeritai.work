# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.
gemini.google.com ドメインに特有の指示は [AGENTS.md](/gemini.google.com/AGENTS.md)に書かれている。
このファイル /gemini.google.com/gemini-export-to-docs/AGENTS.md は、gemini.google.com/gemini-export-to-docs/ ディレクトリに特有の指示が書かれている。

## Technical Implementation Notes (for Agents)

### 1-Turn Auto Export & Delete
- **Detection**: Uses a polling mechanism in `initMainFunctionality` (500ms interval, up to 5s) to wait for Gemini's asynchronous rendering of the chat history.
- **Selectors**:
  - Use **tag names** (e.g., `model-response`, `message-content`) instead of class names for turn detection and button injection, as classes like `.model-response` can be missing in some Gemini UI versions.
  - User messages are identified by the `user-query` tag.
- **Performance**: The main DOM scanning function (`processNodes`) is debounced by 500ms to prevent high CPU usage during AI response streaming.
- **Inter-script Communication**: Dispatches a `gemini-one-click-delete:request-delete` CustomEvent to trigger conversation deletion.

### Horizontal 1-Turn Action Bar
AI側が1ターンしか返答を行っていない「初期回答」の時のみ画面の右下に自動的にポップアップするコントロールパネルを実装しています。

1.  **Auto URL Match Control**: プロンプトと回答の中に1つだけURLが含まれており、それらが一致する場合に自動的にエクスポート処理をキックする `Enable` チェックボックスを管理します。
2.  **Auto Delete Control**: エクスポート完了後にチャット履歴からスレッドを削除する `1-Click Delete Conversation` スクリプトを呼び出すかを選択するチェックボックス。
3.  **Auto-Copy Images Control**: エクスポート時に画面上に画像が含まれていれば、自動的に `gemini-turn-counter-copy-images` イベントを用いて画像をクリップボードにコピーさせるチェックボックス。
4.  **Export/Delete Exec Button**: 手動で上記の設定を基にエクスポート＆削除処理を開始するボタン。
5.  **Draggable Handle**: ユーザーは左端の `⠿` ハンドラをドラッグして好きな場所にパネルを移動できます（状態は localStorage の `gemini-export-panel-pos` に保存）。
6.  **Dependency Checking**: `Auto-Select Next`, `1-Click Delete Conversation`, `Gemini Turn Counter` がインストールされているかを自動判別し、各種アイコンを表示する機能。
- **Auto(URL) Detection**: 
  - Extracts URLs from `<user-query>` and `<message-content>` tags via regex `/(https?:\/\/[^\s"'<>()]+)/g`.
  - If enabled via `gemini-export-auto-url-toggle`, and the user query contains exactly ONE URL, and the model response contains that same URL, it triggers `runExportProcess` with forced deletion after a configurable delay (`gemini-export-auto-url-delay`).
  - An `autoExportTriggered` lock prevents infinite trigger loops while tracking the same conversation state.
- **Initial Positioning**: On load, it checks for `gemini-export-panel-pos` and applies it to the panel's style. Defaults to `bottom: 20px; right: 20px;`.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期とインストールボタンの要件**:
   - バージョン番号はハードコードしないでください。
   - 各インストールボタン（メイン・依存関係ともに）のリンク先(`href`)は、必ずGitHub上の該当 `.user.js` ファイルの **Raw URL** とし、別タブで開くよう `target="_blank"` を指定してください。
   - バージョン比較で「インストール済み(`Installed`)」と判定された場合でも、ユーザーがRawコードを確認できるよう、JavaScript側で `pointer-events: none;` 等を用いたボタンの無効化（クリッカブルの解除）は決して行わないでください。
   - インストールボタンの構造は、動的なバージョン比較機能のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む）を維持し、さらにボタン全体が横長（`display: inline-flex;`）に表示されるレイアウトを維持してください。
   - インラインスクリプトによってボタン全体のDOM（アイコン等）が上書きされないように、テキスト書き換え対象の要素（例: `<span class="button-text">`）のみを操作するようにしてください。
   - 新規タブでインストールした後にUIを自動更新するため、メインのインストールボタンおよび依存関係カードのインストールボタン（`.dep-install-btn`）のクリック時に `userscript-ping` を2秒間隔で計5回（10秒間）送信するポーリング処理が実装されています。これにより利用者はページをリロードすることなく「Installed」への変化を確認できます。

2. **依存関係の動的ステータス明記**:
   - このスクリプトが依存する他のユーザースクリプトがある場合、`index.html` 上に最新バージョン（`fetch`で取得）とインストール済みバージョン（`userscript-check-installed` イベントで取得）が表示される動的なカードリスト構造（`<div class="dep-card">`等）を維持し、ユーザーが依存元のバージョン情報をひと目で確認できるようにしてください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
