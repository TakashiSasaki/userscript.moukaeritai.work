# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.
gemini.google.com ドメインに特有の指示は [AGENTS.md](/gemini.google.com/AGENTS.md)に書かれている。
このファイル /gemini.google.com/gemini-export-to-docs/AGENTS.md は、gemini.google.com/gemini-export-to-docs/ ディレクトリに特有の指示が書かれている。

## Technical Implementation Notes (for Agents)

### 1-Turn Auto Export & Delete
- **Detection**: Uses a polling mechanism in `initMainFunctionality` (500ms interval, up to 5s) to wait for Gemini's asynchronous rendering of the chat history.
- **Selectors**:
  - Use **tag names** (e.g., `model-response`, `message-content`) instead of class names for turn detection, as classes like `.model-response` can be missing in some Gemini UI versions.
  - User messages are identified by the `user-query` tag.
- **Performance**: The main DOM scanning function (`processNodes`) is debounced by 500ms to prevent high CPU usage during AI response streaming.
- **Inter-script Communication**: Dispatches a `gemini-one-click-delete:request-delete` CustomEvent to trigger conversation deletion, and can dispatch `gemini-auto-select-next:request-next` when a 1-turn conversation does not satisfy the auto-export URL match rule.
- **Shared Snackbar Safety Stop**: Subscribes to the common `gemini-snackbar:shown` event. Any snackbar classified as non-success causes the script to stop auto export and turn off both `Auto Delete` and `Skip Non-Matching Conversations` for safety.

### Metadata & Context
- **@noframes**: This script MUST include the `@noframes` directive. Without it, the script runs in both the top-level window and any internal iframes (e.g., help widgets) on `gemini.google.com`, causing duplicate initialization and multiple instances appearing in Tampermonkey.
- **No `@history` metadata**: Remove any existing `@history` metadata entries from this userscript and do not add new ones. Versioning is tracked via `@version` and Git history, so inline history metadata is unnecessary.


### Horizontal 1-Turn Action Bar
AI側が1ターンしか返答を行っていない「初期回答」の時のみ画面の右下に自動的にポップアップするコントロールパネルを実装しています。

1.  **Auto Export Toggle**: `Auto Export: Off/On` の単一ボタンで、URL一致の自動判定と自動エクスポート処理の開始・停止を切り替えます。
2.  **Eligibility Indicator**: 現在表示中の会話が auto-export 条件を満たしているかを、`Matched / Waiting / Not Matched / Not 1-Turn` の状態と短い理由文で表示します。トグルの On/Off に関係なく更新されます。
3.  **Auto Delete Control**: エクスポート完了後にチャット履歴からスレッドを削除する `1-Click Delete Conversation` スクリプトを呼び出すかを選択するチェックボックス。
4.  **Skip Non-Matching Conversations Control**: 1ターン会話でURL一致条件を満たさなかった場合に `gemini-auto-select-next:request-next` を送信して次の会話へ移動するかを選択するチェックボックス。
5.  **Draggable Handle**: ユーザーは左端の `⠿` ハンドラをドラッグして好きな場所にパネルを移動できます（状態は localStorage の `gemini-export-panel-pos` に保存）。
- **Manual Expansion**: 条件不適合で `ge2d-disabled` が付いている間も、共通の最小化トグルによりユーザーは手動でパネルを展開できます。
- **Auto(URL) Detection**: 
  - Extracts URLs from `<user-query>` and `<message-content>` tags via regex `/(https?:\/\/[^\s"'<>()]+)/g`.
  - If auto export is toggled on via `gemini-export-auto-url-toggle`, and the user query contains exactly ONE URL, and the model response contains that same URL, it triggers `runExportProcess(true)` after a short countdown.
  - If the URL match fails and `gemini-export-auto-skip-nonmatch-toggle` is enabled, it dispatches `gemini-auto-select-next:request-next` once for that conversation after `user-query` and `message-content` are available, without waiting for the export menu button.
  - Conversation-scoped decision state prevents repeated auto-export or auto-skip triggers while the same conversation remains active.
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

2. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
