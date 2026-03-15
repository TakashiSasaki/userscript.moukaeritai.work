# M365 Copilot Notebook Styler - Agent Notes

### 対象ドメインとURL
- `m365.cloud.microsoft`
- 主な対象URL: 
  - `https://m365.cloud.microsoft/chat/*` 
  - `https://m365.cloud.microsoft/notebooks/*`

### 設計戦略
Fluent UIの動的なクラス名（例: `___1skyeoy`）への依存を避けるため、DOMの構造的な特徴を利用して各ペインを特定しています。

1. **特定プロセス (`findAndTagPanes`)**:
   - `https://m365.cloud.microsoft/notebooks/*` では、ノートブックUIの全体が `iframe[title="Notebooks"]` 内 (`srcdoc`) にカプセル化されています。
   - スクリプトは `getTargetDocument()` にて対象ドキュメントを特定（`iframe.contentDocument` または親 `document`）し、その中で要素を探索します。
   - まず、明示的な属性を持つ中央ワークスペース `div[scrollable="true"]` を探します。
   - その親要素（通常はFlexコンテナ）を取得し、子要素を走査します。
   - ペイン間の仕切りである `div[role="separator"]` と中央ワークスペースの位置関係から、左ナビゲーション（中央の直前）、中央、右チャット（セパレーターの直後）を特定します。
2. **スタイルの適用**:
   - 特定した要素に対し、安定したカスタムクラス (`.m365-pane-left`, `.m365-pane-center`, `.m365-pane-right`) を付与します。
   - `MutationObserver` (`mainObserver` および `iframeObserver`) を使用し、SPAのページ遷移や `iframe` の遅延読み込み時にも確実にクラスを付与し直すようにしています（デバウンス処理あり）。ユーザーが異なるページを行き来した際のコンテキストの切り替えも監視します。

### セレクタリスト
- **ルート状態**: `body.m365-styler-active` (CSSの適用ON/OFF制御用)
- **中央ペイン侯補**: `div[scrollable="true"]`
- **セパレーター**: `div[role="separator"]`
- **付与するクラス**: 
  - 左: `m365-pane-left`
  - 中央: `m365-pane-center`
  - 右: `m365-pane-right`

### 状態管理
- `GM_getValue` / `GM_setValue` を使用し、キー `m365-copilot-styler-enabled` でトグルの状態を保存しています。

### 今後の課題・拡張
- UIの構造が大幅に変更された場合、構造的探索 (`findAndTagPanes`) のロジックを見直す必要があります。
