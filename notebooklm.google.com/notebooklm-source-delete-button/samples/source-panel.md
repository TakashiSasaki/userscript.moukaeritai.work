# source-panel.html の構造説明

このファイルは、NotebookLM の左側に表示される「ソースパネル」全体の DOM スナップショットです。個別ソースの断片（`source-markdown.html` 等）がパネル内でどのように配置され、検索や一括選択機能とどのように共存しているかを示します。

## 主要な階層構造

1.  **ルートコンテナ (`section.source-panel`)**:
    - パネル全体の親要素。インラインスタイルで幅（`inline-size`）が制御されています。
2.  **パネルヘッダー (`.panel-header`)**:
    - "Sources" というタイトルを表示するエリア。
3.  **ソースピッカー (`source-picker`)**:
    - ソース管理のメインコンポーネント。以下の要素を内包します。
    - **検索・追加エリア (`.source-discovery-container`)**: `source-discovery-query-box` を含み、新しいソースの検索や追加を行います。
    - **一括選択行 (`.row`)**: 「Select all sources」テキストと、一括選択用の `mat-checkbox` を含みます。
    - **リスト領域 (`.scroll-area-desktop`)**: `div.contents > div > div.scroll-area-desktop` の階層に位置し、個別のソース項目 (`.single-source-container`) が動的に並ぶスクロール可能なエリアです。

## 削除ボタンの実装における意義

このファイルは、単一のソース項目だけでなく、パネル全体のコンテキストを理解するために使用します。

-   **一括削除の検討**:
    「すべて選択」チェックボックスの隣 (`.select-checkbox-all-sources-container`) に、選択されたソースを一括で削除するボタンを配置する可能性を検討するためのリファレンスとなります。
-   **MutationObserver のターゲット**:
    個別のソース項目が追加されるのを監視する際、`.scroll-area-desktop` を監視対象にするのが最も効率的です。この要素は `source-picker` コンポーネントの深い階層に位置しています。
-   **レイアウトの整合性**:
    パネル全体の余白やスクロール挙動を確認し、削除ボタンを挿入した際に UI が崩れたり、スクロールバーと干渉したりしないかを検証するのに役立ちます。

この構造に基づき、`ANALYSIS.md` で定義されたセレクタがパネル全体の中で一意であり、かつ安定していることを確認できます。