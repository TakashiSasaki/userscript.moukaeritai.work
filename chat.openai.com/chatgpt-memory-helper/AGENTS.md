# Instructions for AI Agents / AIエージェントへの指示

## 1. Core Functionality / 中核機能
- **Goal**: Inject serial numbers into the list items within ChatGPT's memory management dialog.
- **Format**: The numbers should be in the format `#X of Y` (e.g., `#12 of 345`).
- **Mechanism**: The script observes the DOM for the appearance of the memory management dialog and then injects a `<span>` element with the serial number into each memory item.

- **目的**: ChatGPTのメモリ管理ダイアログ内のリスト項目に連番を注入します。
- **フォーマット**: 番号は `#X of Y` 形式（例: `#12 of 345`）とします。
- **仕組み**: スクリプトはDOMを監視し、メモリ管理ダイアログの出現を検知して、各メモリ項目に連番を含む`<span>`要素を注入します。

## 2. Scope and SPA Handling / スコープとSPA対応
- **Target URL**: The script specifically targets `https://chatgpt.com/#settings/Personalization`.
- **SPA Behavior**: ChatGPT is a Single Page Application (SPA). The script is installed domain-wide but must only activate its logic when the URL matches the target.
- **Navigation Detection**: Detect URL changes (via History API or DOM observation) to activate/deactivate the observer. Ensure no performance impact on other pages.

- **対象URL**: スクリプトは具体的に `https://chatgpt.com/#settings/Personalization` を対象とします。
- **SPAの挙動**: ChatGPTはシングルページアプリケーション（SPA）です。スクリプトはドメイン全体にインストールされますが、URLが対象と一致する場合のみロジックを有効にする必要があります。
- **遷移検知**: URLの変更（History APIやDOM監視経由）を検知し、オブザーバーの有効化/無効化を行ってください。他のページでのパフォーマンスに影響を与えないようにしてください。

## 3. Versioning / バージョン管理
- The initial version is `0.1.0`.
- Always bump the `@version` in `chatgpt-memory-helper.user.js` when making code changes (e.g., 0.1.0 -> 0.1.1).
- 初期バージョンは `0.1.0` です。
- コードを変更した際は、必ず `chatgpt-memory-helper.user.js` の `@version` を更新してください。

## 4. Metadata / メタデータ
- `@author`: Takashi Sasaki
- `@namespace`: userscript.moukaeritai.work
- `@homepageURL`: https://x.com/TakashiSasaki
- `@updateURL` and `@downloadURL` (must point to the `userscript.moukaeritai.work` branch / `userscript.moukaeritai.work` ブランチを指す必要があります):
  - `https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-memory-helper/chatgpt-memory-helper.user.js`

## 5. Selector and DOM Management / セレクタとDOMの管理
- The script relies on specific selectors to identify the memory dialog and the list items within it.
- **`TARGET_SELECTOR`**: This selector must target the individual memory items (e.g., `li` elements).
- **`OBSERVE_TARGET_SELECTOR`**: This selector must target a container that exists on the page and will contain the memory dialog when it opens.
- **Dynamic Injection**: Use a `MutationObserver` or `setInterval` to detect when the dialog is added to the DOM and then run the numbering logic. Ensure that numbers are not duplicated if the logic runs multiple times.

- スクリプトは、メモリダイアログとそこの中のリスト項目を特定するために、特定のセレクタに依存しています。
- **`TARGET_SELECTOR`**: このセレクタは、個々のメモリ項目（例: `li`要素）をターゲットにする必要があります。
- **`OBSERVE_TARGET_SELECTOR`**: このセレクタは、ページ上に存在し、メモリダイアログが開かれたときにそれを含むコンテナをターゲットにする必要があります。
- **動的注入**: `MutationObserver` または `setInterval` を使用して、ダイアログがDOMに追加されたことを検知し、番号付けロジックを実行します。ロジックが複数回実行されても番号が重複しないようにしてください。

## 6. HTML Sample Preprocessing / サンプルHTMLの前処理
- DOM snapshots (HTML files in the `samples/` directory) are used to design selectors for manipulating the DOM with the user script. To improve development efficiency and reduce file size, always perform the following preprocessing.
- A `preprocess_samples.py` script has been implemented to clean and standardize DOM snapshots in `samples/`. Run this script whenever adding new HTML samples.
- **Logic Applied**:
    1.  **Removal**: `<script>`, `<style>` tags, and HTML comment nodes are completely removed.
    2.  **Head Cleanup**: `<meta>` and `<link>` tags within the `<head>` element are removed.
    3.  **Resource Attribute Removal**: Remove `href`, `src`, and `srcset` attributes from all tags to prevent accidental resource loading, but preserve `id` and `class` attributes.
    4.  **SVG Cleanup**: `<svg>` tags are kept, but all their child nodes are removed to reduce file size.
    5.  **Attribute Cleanup**: Attributes with empty string values (e.g., `style=""`) are removed.
    6.  **Text Truncation**: All text nodes are truncated to 999 characters or less to keep file sizes manageable.
    7.  **Reformatting**: HTML is reformatted to a flat structure.
        -   **One tag/text node per line**.
        -   **No indentation** (to facilitate easier diffing and searching).

- DOMスナップショット（`samples/`ディレクトリ内のHTMLファイル）は、ユーザースクリプトでDOMを操作するためのセレクタを設計するために使用します。開発効率の向上とファイルサイズの削減のため、必ず以下の前処理を行ってください。
- `samples/` 内のDOMスナップショットをクリーンアップし、標準化するために `preprocess_samples.py` スクリプトが実装されています。新しいHTMLサンプルを追加するたびに、このスクリプトを実行してください。
- **適用されるロジック**:
    1.  **削除**: `<script>`、`<style>` タグ、およびHTMLコメントノードは完全に削除されます。
    2.  **Headのクリーンアップ**: `<head>` 要素内の `<meta>` および `<link>` タグは削除されます。
    3.  **リソース属性の削除**: 不要なリソース読み込みを防ぐため、すべてのタグから `href`、`src`、`srcset` 属性を削除します。ただし、セレクタ設計に必要な `id` および `class` 属性は保持します。
    4.  **SVGのクリーンアップ**: `<svg>` タグは保持されますが、ファイルサイズを削減するためにすべての子ノードは削除されます。
    5.  **属性のクリーンアップ**: 空の文字列値を持つ属性（例: `style=""`）は削除されます。
    6.  **テキストの切り捨て**: ファイルサイズを管理しやすくするため、すべてのテキストノードは999文字以下に切り捨てられます。
    7.  **再フォーマット**: HTMLはフラットな構造に再フォーマットされます。
        -   **1行に1つのタグ/テキストノード**。
        -   **インデントなし**（差分確認と検索を容易にするため）。

## 7. Commit Messages / コミットメッセージ
- Use Conventional Commits format (e.g., `feat:`, `fix:`, `refactor:`).
- Write commit messages in English.
- Conventional Commits形式を使用し、コミットメッセージは英語で記述してください。
