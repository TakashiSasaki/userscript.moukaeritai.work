# source-markdown.html の構造説明

このファイルは、NotebookLM のソースパネルにおける「マークダウン形式のソース項目」の DOM 断片です。

## 主要な構成要素

**包含関係**: この要素は `div.scroll-area-desktop` の直接の子要素として配置されます。

1.  **ルートコンテナ (`.single-source-container`)**:
    - 各ソース項目の親要素。`tabindex="0"` を持ち、フォーカス可能です。
    - Angular の動的属性 (`_ngcontent-ng-c...`) や `jslog` 属性が含まれています。
2.  **アイコンとメニュー (`.icon-and-menu-container`)**:
    - `mat-icon` として `markdown` が指定されており、これがマークダウン文書であることを示しています。
    - `more_vert` アイコンを持つ「More」ボタン (`.source-item-more-button`) が含まれます。
3.  **タイトルカラム (`.source-title-column`)**:
    - `.source-title` クラスを持つ要素内に、ソースのタイトル（例: "All notes 2026/1/15"）が含まれます。
4.  **チェックボックスコンテナ (`.select-checkbox-container`)**:
    - `mat-checkbox` を含み、ソースの選択状態を管理します。

## 削除ボタンの実装における意義

この断片は、特定のソースタイプ（マークダウン）に対して、削除ボタンをどの位置に挿入するのが最適かを検証するために使用します。
`ANALYSIS.md` で定義された「候補A（チェックボックスの隣）」を適用する場合、`.select-checkbox-container` がターゲットとなります。