# whole-dom.html 構造分析レポート

このファイルは NotebookLM のページ全体の DOM スナップショットです。左側のソースパネルと右側のチャットパネルで構成されています。

## 1. 全体レイアウト
ページは主に2つのセクションで構成されています。

- **`section.source-panel`**: 画面左側。ソースの管理・選択を行うパネル。
- **`section.chat-panel`**: 画面右側。チャットの履歴や入力欄を含むパネル。

## 2. ソースパネル (`section.source-panel`) の詳細
ソースの追加、検索、一覧表示を行うエリアです。

### 階層構造
- `div.source-panel-content`
    - `source-picker`
        - `div.contents`
            - **検索エリア**: `div.source-discovery-container` (検索ボックス `source-discovery-query-box` を含む)
            - **一括操作行**: `div.row`
                - テキスト: "Select all sources"
                - **一括選択**: `div.select-checkbox-all-sources-container` (`mat-checkbox` を含む)
            - **リスト領域**: `div.scroll-area-desktop`
                - **各ソース項目**: `div.single-source-container` (複数存在)

### 個別ソース項目 (`.single-source-container`)
各ソース項目は以下の要素で構成されています（前処理済みサンプルに基づく）。

1.  **`.source-title-column`**:
    - ソースのタイトル (`.source-title`) を含む。
2.  **`.select-checkbox-container`**:
    - 選択用チェックボックス (`mat-checkbox`) を含む。
    - **削除ボタン挿入の推奨位置**: このコンテナ内、または直後。

## 3. 削除ボタン実装に向けた分析

### 個別削除ボタン
- **ターゲット**: `.single-source-container .select-checkbox-container`
- **理由**: チェックボックスの近くに配置することで、選択操作と削除操作の関連性が明確になるため。

### 一括削除ボタン
- **ターゲット**: `.select-checkbox-all-sources-container` (またはその親の `div.row`)
- **理由**: 「すべて選択」チェックボックスの隣に配置することで、選択した項目に対する一括操作（削除）を提供できるため。

## 4. 留意事項
- **前処理の影響**: サンプルファイルでは、`script` タグや一部の UI ノイズ（アイコンコンテナ等）が削除されている場合があります。実際の DOM との差異に注意してください。
- **動的生成**: ソースリストやチャットメッセージは Angular により動的に生成されます。`MutationObserver` による監視が必要です。