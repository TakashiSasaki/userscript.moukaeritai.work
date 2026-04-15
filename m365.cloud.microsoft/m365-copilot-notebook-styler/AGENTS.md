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
   - 1. **セパレーターの特定 (Separator Anchor)**
   - `div[role="separator"]` をプライマリ・アンカーとして検索します。
   - その親コンテナ内の兄弟要素の順序に基づいて各ペインを特定します。
   - 2. **ペインの特定**
   - セパレーターの直前の兄弟要素を「中央ペイン (Center Pane)」と見なします（エディタまたはチャット履歴）。
   - セパレーターの直後の兄弟要素を「右ペイン (Right Pane)」と見なします（通常は Copilot チャットパネル）。
   - 中央ペインのさらに前の兄弟要素を「左ペイン (Left Pane)」と見なします（ナビゲーションツリー）。

### セレクタリスト
- **アンカー**: `div[role="separator"]`
- **左ペイン**: `.m365-pane-left` (動的に付与)
- **中央ペイン**: `.m365-pane-center` (動的に付与)
- **右ペイン**: `.m365-pane-right` (動的に付与)

### 状態管理
- `GM_getValue` / `GM_setValue` を使用し、キー `m365-copilot-styler-enabled` でトグルの状態を保存しています。

### 今後の課題・拡張
- UIの構造が大幅に変更された場合、構造的探索 (`findAndTagPanes`) のロジックを見直す必要があります。


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - スクリプトのバージョンが更新された場合は、関連するすべての `index.html` 内にハードコードされているバージョン表記も忘れずに更新してください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
