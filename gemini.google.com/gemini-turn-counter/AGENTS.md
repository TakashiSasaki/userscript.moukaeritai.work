# AGENTS.md

## Development Policy for `gemini-turn-counter`

This project is a port of the `chatgpt-turn-counter` userscript to the Google Gemini platform.

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
開発の効率化のため、DOM解析を行う前にブラウザから保存したHTML（ `samples/*.html` ）に対して以下の前処理を行うことを標準とします。

1.  **タグの削除**: `script`, `style`, `noscript`, `meta`, `link`
2.  **属性の削除**:
    *   イベントハンドラ (`on*`)
    *   空の属性（`style=""` など値が空文字のもの）
3.  **SVGの軽量化**: `<svg>` タグ自体は残すが、その子要素はすべて削除する（アイコンの位置情報として保持するため）。
4.  **コメントの削除**: すべてのHTMLコメントノードを削除する。
5.  **テキストの短縮**: 100文字を超える長いテキストノードは先頭100文字程度に切り詰める（`...` を付与）。
6.  **整形**: HTMLをPretty-printして可読性を高める。

これにより、ファイルサイズを削減し、DOM構造のノイズを減らして解析しやすくします。

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
