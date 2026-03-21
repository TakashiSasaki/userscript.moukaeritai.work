# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

## Technical Implementation Notes (for Agents)

### 1-Turn Auto Export & Delete
- **Detection**: Uses a polling mechanism in `initMainFunctionality` (500ms interval, up to 5s) to wait for Gemini's asynchronous rendering of the chat history.
- **Selectors**:
  - Use **tag names** (e.g., `model-response`, `message-content`) instead of class names for turn detection and button injection, as classes like `.model-response` can be missing in some Gemini UI versions.
  - User messages are identified by the `user-query` tag.
- **Performance**: The main DOM scanning function (`processNodes`) is debounced by 500ms to prevent high CPU usage during AI response streaming.
- **Inter-script Communication**: Dispatches a `gemini-one-click-delete:request-delete` CustomEvent to trigger conversation deletion.

### Horizontal 1-Turn Action Bar
- **Draggable Handle**: The bar's far left element (marked with `⠿`) acts as a drag handle. Uses `mousedown`, `mousemove`, and `mouseup` on `document` to handle dragging.
- **Persistence**: Saves the current `top` and `left` coordinates to `gemini-export-panel-pos` using `GM_setValue` upon `mouseup`.
- **Manual Toggle**: Saves the state of the auto-delete checkbox to `gemini-export-auto-delete-toggle` via `GM_setValue` to persist user preference.
- **Auto(URL) Detection**: 
  - Extracts URLs from `<user-query>` and `<message-content>` tags via regex `/(https?:\/\/[^\s"'<>()]+)/g`.
  - If enabled via `gemini-export-auto-url-toggle`, and the user query contains exactly ONE URL, and the model response contains that same URL, it triggers `runExportProcess` with forced deletion after a configurable delay (`gemini-export-auto-url-delay`).
  - An `autoExportTriggered` lock prevents infinite trigger loops while tracking the same conversation state.
- **Initial Positioning**: On load, it checks for `gemini-export-panel-pos` and applies it to the panel's style. Defaults to `bottom: 20px; right: 20px;`.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - バージョン番号はハードコードしないでください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持し、インラインスクリプトによってボタン全体のDOM（アイコン等）が上書きされないように、テキスト書き換え対象の要素（例: `<span class="button-text">`）を操作するようにしてください。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
