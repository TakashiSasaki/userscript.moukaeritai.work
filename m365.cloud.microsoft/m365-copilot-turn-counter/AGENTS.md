# Implementation Notes - M365 Copilot Turn Counter

## 設計戦略 (Design Strategy)
このスクリプトは、Microsoft 365 Copilot のチャットインターフェースにおける「ターンの進行」と「特定のアセットの生成」を監視することを目的としています。

### 監視対象 (Monitoring Targets)
-   **Conversation Turns**: ユーザーの入力（input）とそれに対するアシスタントの応答（response）のペア。
-   **Artifacts**: 
    -   `Copilot Pages` (以前の Loop コンポーネント等)
    -   `Research Results` (表やカード形式で出力されるもの)
-   **Images**: ユーザーがアップロードした画像の `img` タグ。

## セレクタ (Selectors)
※M365 Copilot の HTML 構造は動的に変化するため、属性ベースのセレクタを優先します。

-   **Message Container**: `div[role="log"]` や `div[aria-label*="conversation"]` 内の個別メッセージ。
-   **User Message**: `div[data-author-role="user"]` (推定)
-   **Assistant Message**: `div[data-author-role="assistant"]` (推定)
-   **Artifact Containers**: 
    -   `div[data-testid="artifact-card"]`
    -   `div.artifact-container`

## UIコンポーネント
-   `#m365-turn-counter-ui`: メインのフローティングコンテナ。
-   半透明背景 (`rgba(32, 33, 35, 0.8)`) と細いボーダーを使用し、モダンな外観を維持します。

## 注意事項 (Caveats)
-   **MutationObserver の負荷**: メッセージリスト全体を監視するため、高頻度な更新（タイピング中の反映など）を避けるためのデバウンス処理を必須とします。
-   **SPA ナビゲーション**: スレッドの切り替えを検知するために `window.navigation` または URL の変化を監視する必要があります。
