# AGENTS.md

## Development Policy for `gemini-turn-counter`

This project is a port of the `chatgpt-turn-counter` userscript to the Google Gemini platform.

## Install Detection API
The userscript includes the install-detection guard required by the portal index and only injects this API on the following hosts:

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

Behavior on those hosts:

- **Dispatch**: `userscript-check-installed` is dispatched on page load.
- **Listener**: `userscript-ping` is listened for and replied to, then the script returns early.

### Design Philosophy
1.  **Parity**: Aim for feature parity with `chatgpt-turn-counter` where applicable.
    -   Turn counting (User/Model)
    -   Character counting
    -   UI interaction (Collapsed Icon -> Expanded Panel)
2.  **Adaptability**: Gemini's DOM structure differs from ChatGPT. We must verify selectors carefully.
    -   Use `samples/` directory to store HTML snapshots of Gemini's interface for testing selectors.
3.  **Simplicity**: Start with core turn counting. Add complex features (like image extraction or code block counting) in subsequent iterations if DOM complexity permits.

### 4.2 関連ファイル
*   **AGENTS.md**: AIエージェント向けの開発方針・コンテキスト記録。

### 4.3 前処理（Preprocessing）
- DOM snapshots (HTML files in the `samples/` directory) are used to design selectors for manipulating the DOM with the user script. To improve development efficiency and reduce file size, always perform the following preprocessing.
- A `preprocess_samples.py` script has been implemented to clean and standardize DOM snapshots in `samples/`. Run this script whenever adding new HTML samples.
- **Logic Applied**:
    1.  **Removal**: `<script>`, `<style>` tags, and HTML comment nodes are completely removed.
    2.  **Head Cleanup**: `<meta>` and `<link>` tags within the `<head>` element are removed.
    3.  **SVG Cleanup**: `<svg>` tags are kept, but all their child nodes are removed to reduce file size.
    4.  **Attribute Cleanup**: Attributes with empty string values (e.g., `style=""`) are removed.
    5.  **Text Truncation**: All text nodes are truncated to 999 characters or less to keep file sizes manageable.
    6.  **Reformatting**: HTML is reformatted to a flat structure.
        -   **One tag/text node per line**.
        -   **No indentation** (to facilitate easier diffing and searching).

- `samples/` 内のDOMスナップショットをクリーンアップし、標準化するために `preprocess_samples.py` スクリプトが実装されています。新しいHTMLサンプルを追加するたびに、このスクリプトを実行してください。
- **適用されるロジック**:
    1.  **削除**: `<script>`、`<style>` タグ、およびHTMLコメントノードは完全に削除されます。
    2.  **Headのクリーンアップ**: `<head>` 要素内の `<meta>` および `<link>` タグは削除されます。
    3.  **SVGのクリーンアップ**: `<svg>` タグは保持されますが、ファイルサイズを削減するためにすべての子ノードは削除されます。
    4.  **属性のクリーンアップ**: 空の文字列値を持つ属性（例: `style=""`）は削除されます。
    5.  **テキストの切り捨て**: ファイルサイズを管理しやすくするため、すべてのテキストノードは999文字以下に切り捨てられます。
    6.  **再フォーマット**: HTMLはフラットな構造に再フォーマットされます。
        -   **1行に1つのタグ/テキストノード**。
        -   **インデントなし**（差分確認と検索を容易にするため）。

### 4.4 バージョン管理ポリシー
ユーザースクリプト (`gemini-turn-counter.user.js` 等) に何らかの変更を加えた際は、必ず `@version` のパッチレベル（末尾の数字）をインクリメントしてください。

例: `0.1.0` -> `0.1.1`

これは、Tampermonkey等の自動更新機能が正常に動作するために必須です。

### Reference
-   **Source Project**: `chatgpt-turn-counter` (located in `../../chat.openai.com/chatgpt-turn-counter/`)
-   **Key Logic**:
    -   `MutationObserver` to watch for new messages.
    -   `getTextContentLength` for accurate character counts (ignoring HTML tags).
    -   Floating UI with toggle state.

### File Structure
-   `gemini-turn-counter.user.js`: The main script.
-   `gemini-turn-counter.md`: The design and specification document.
-   `samples/`: Directory for DOM snapshots (to be created).
