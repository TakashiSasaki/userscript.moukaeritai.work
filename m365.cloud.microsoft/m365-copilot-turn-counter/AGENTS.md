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

-   **Message Container**: `div.fui-Virtualizer` 内の各メッセージ要素。
-   **User Message**: `div[aria-label^="You said:"]` または `div[aria-label^="送信済み:"]` (ロケールに依存)。
-   **Assistant Message**: `div[aria-label^="Copilot said:"]` または `div[aria-label^="Copilot:"]`。
-   **Artifact Containers**: 
    -   `div.fui-Card`: リサーチ結果などのカード。
    -   `.fai-Citation`, `a[aria-label*="引用"]`: 出典や引用のリンク。

## UIコンポーネント
-   `#m365-turn-counter-ui`: メインのフローティングコンテナ。
-   半透明背景 (`rgba(32, 33, 35, 0.8)`) と細いボーダーを使用し、モダンな外観を維持します。

## 注意事項 (Caveats)
-   **MutationObserver の負荷**: メッセージリスト全体を監視するため、高頻度な更新（タイピング中の反映など）を避けるためのデバウンス処理を必須とします。
-   **仮想化への対応 (Virtualization Handling)**:
    -   M365 Copilot は `.fui-Virtualizer` を使用しており、画面外のメッセージは DOM から削除されます。
    -   **ステートフル・カウンター**: `Set` オブジェクトを使用して、スクロール中に現れたユニークなメッセージ ID またはハッシュを保持し、累積でカウントします。
    -   **一意識別のヒント**: `aria-label` の内容、またはメッセージ内の特定の子要素（コピーボタン等）が持つ内部属性の利用を検討してください。
-   **SPA ナビゲーション**: スレッドの切り替え（URL変更）を検知した際に `Set` をリセットする必要があります。
