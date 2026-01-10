# YouTube Script Agent Guidelines

このディレクトリ以下の YouTube 関連ユーザースクリプト（Saver, Scroller, Filter, Remover）を開発・保守するエージェント向けの重要指示事項です。

## 1. 4スクリプト構成と協調動作 (Collaborative Model)

YouTube プレイリスト用の機能は、以下の4つの独立したスクリプトに分離されています：
1.  **Playlist Saver**: 動画IDの記録・状態管理（バックグラウンド）。
2.  **Playlist Scroller**: プレイリストの自動スクロール（バックグラウンド）。
3.  **Playlist Filter**: リアルタイムフィルタリングと状態表示（UI）。
4.  **Playlist Remover**: 条件に一致した（Above かつ Visible）動画の一括削除（UI）。

### 共存ルール
-   **Remover と Filter の連携**: `Remover` は `Filter` によって非表示（`display: none`）にされている動画を**絶対に削除してはいけません**。削除対象は「スクロールで通り過ぎた（Above）」かつ「フィルタでマッチしている（Visible）」動画のみです。
-   **ラベルのスタック**: `Saver` ([NEW]等) と `Filter` ([MATCHED]) はどちらもメタデータ領域に要素を `prepend` します。これらはスタックして共存することを前提としてください。

## 2. 実装上の技術仕様

### 視認性トラッキング (Visibility Tracking)
-   「Above（通り過ぎた）」かどうかの判定には `IntersectionObserver` を使用します。
-   **閾値**: `rect.bottom < 180` を一貫して使用してください（動画の行の約半分以上が上部に隠れた状態を Above と定義しています）。

### 動画削除ロジック (Removal Logic)
-   **メニュー操作**: `attemptRemoveVideo` は、各動画要素内のメニューボタン（`#menu button` または `button.dropdown-trigger`）をクリックし、表示されるポップアップから「削除」項目を探します。
-   **削除ボタンの特定**: テキスト「Remove from」または「から削除」を含む要素、あるいは `TRASH_ICON_PATHS` で定義された SVG パスを持つ要素を特定してクリックしてください。

## 3. 運用ルール (Operational Rules)

### バージョニング (Versioning)
-   **厳格なルール**: ユーザースクリプト（`.user.js`）のコードを1行でも変更した場合は、**必ずパッチバージョンをインクリメント（バンプアップ）**してください。

### インデックスの同期 (Index Synchronization)
-   スクリプトのバージョンを上げた際は、ルートおよび `youtube.com/` の `index.html` 内の `Install (vX.Y.Z)` ボタンのテキストも必ず最新に更新してください。

### インストール/バージョン検知API
- `index.html` は `userscript-ping` を送信し、各ユーザースクリプトが `userscript-check-installed` を `dispatchEvent` して応答することで検知します。
- 受信側は `data-script-name` と `@name` の一致で対象ボタンを特定します。
- `Install (vX.Y.Z)` の表記からバージョンを抽出し、セマンティックバージョン比較で `Update` / `Installed` を切り替えます。

## 4. UIパネルとアクティブ状態

パネルの開閉は手動ではなく、ユーザースクリプトのアクティブ状態に連動させます。
- **アクティブ時**: パネル内容を展開し、`Active` を表示する。
- **非アクティブ時**: パネル内容を閉じ、`Inactive` を表示する（ヘッダーのみ残す）。
