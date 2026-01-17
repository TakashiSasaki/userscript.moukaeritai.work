# Agent Implementation Notes: ChatGPT No Margin

This document provides technical details and implementation strategies for the `chatgpt-no-margin` userscript.

## 1. Technical Strategy

### Goal
Remove the maximum width constraints and margins from the main conversation container in ChatGPT to utilize the full viewport width.

### Implementation Logic
Use `MutationObserver` to detect and modify the following elements dynamically as they are added or modified in the DOM.

**Target Elements & Actions:**

1.  **Inner Flex Container**: `div.flex.mx-auto`
    *   Action: Set `marginLeft = 0`, `marginRight = 0`, `maxWidth = 100%`.
2.  **Outer Text Wrapper**: `div.text-base.mx-auto`
    *   Action: Set `marginLeft = 0`, `marginRight = 0`, `maxWidth = 100%`.
3.  **CSS Variable**: `--thread-content-max-width` (Tailwind arbitrary value)
    *   Action: If detected in inline styles, override it to `100%`.

## 2. DOM Selectors (As of 2026-01-11)

| Element | Selector Pattern | Purpose |
| :--- | :--- | :--- |
| **Main Container** | `main div[role='presentation']` | Primary observation target. |
| **Message Wrapper** | `div.text-base.mx-auto` | Outer wrapper often defining the max-width. |
| **Message Flex** | `div.flex.mx-auto` | Inner flex container for message content. |
| **CSS Var Target** | Element with style prop | Elements using `max-w-[var(--thread-content-max-width)]`. |

## 3. Observation Strategy

-   **Observer Target**: `main div[role='presentation']` (fallback to `document.body` if not found immediately).
-   **Config**: `{ childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] }`.
-   **Performance**: The observer callback checks `nodeType` and `matches` selector efficiently. Logic is idempotent (setting style properties repeatedly is safe).
-   **Timing**: A 1.5s delay (`setTimeout`) is used on startup to ensure the initial DOM is ready before attaching the observer.

## 4. Portal API & Guard
The script includes the standard Portal API Guard to interact with `userscript.moukaeritai.work`.
-   **Domains**: `userscript.moukaeritai.work`, `127.0.0.1:5500`, `fuzzy-halibut-*.app.github.dev`.
-   **Events**: Dispatches `userscript-check-installed` and listens for `userscript-ping`.

## 5. Build & Verification
-   **Linting**: Run `npx eslint chat.openai.com/chatgpt-no-margin/chatgpt-no-margin.user.js` before committing.
-   **Version**: Follow semantic versioning. Current: `1.1.0`.

## 6. HTML Sample Preprocessing / サンプルHTMLの前処理
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

- DOMスナップショット（`samples/`ディレクトリ内のHTMLファイル）は、ユーザースクリプトでDOMを操作するためのセレクタを設計するために使用します。開発効率の向上とファイルサイズの削減のため、必ず以下の前処理を行ってください。
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