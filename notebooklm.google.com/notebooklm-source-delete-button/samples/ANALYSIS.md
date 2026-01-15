# NotebookLM ソースパネル構造分析レポート

`whole-dom.html` の解析に基づき、ソース削除ボタンを挿入するための構造とセレクタを特定しました。

## 1. 階層構造
ソースリストは以下の階層で構成されています。

- `section.source-panel`: ソースパネル全体のコンテナ
    - `div.source-panel-content`: コンテンツエリア
        - `source-picker`: ソース管理コンポーネント
            - `div.contents`: リストの親
                - `div.scroll-area-desktop`: スクロール可能なリスト領域
                    - **`div.single-source-container`**: 各ソース項目のルート要素（**重要**）

## 2. 個別ソース項目 (`.single-source-container`) の内部
各項目は主に3つのカラムで構成されています。

1.  **`.icon-and-menu-container`**:
    - 左側。ソースアイコンや「その他」メニュー（`mat-menu`）を含む。
2.  **`.source-title-column`**:
    - 中央。ソースのタイトルテキスト（`.source-title`）を表示。
3.  **`.select-checkbox-container`**:
    - 右側。選択用のチェックボックス（`mat-checkbox`）を含む。

## 3. 削除ボタンの挿入候補

### 候補A: チェックボックスの隣（推奨）
ユーザーがソースを選択する操作（チェックを入れる）の延長線上に配置できるため、最も直感的です。
- **ターゲット**: `.single-source-container .select-checkbox-container`
- **挿入方法**: `prepend` または `appendChild`

### 候補B: タイトルカラムの末尾
タイトルテキストの直後に配置します。
- **ターゲット**: `.single-source-container .source-title-column`

## 4. 実装上の技術的留意点

- **削除アクションのトリガー**:
    NotebookLM のネイティブな削除機能は、通常「More」メニュー内の「Remove」ボタンに紐付けられています。ユーザースクリプトで直接削除ボタンを実装する場合、このメニュー項目をプログラムからクリックするか、内部的な削除イベントを模倣する必要があります。
    ※ `grant: none` の制限下では、DOM上の「More」ボタンをクリックしてメニューを出現させ、その中の「Remove」を特定してクリックするシーケンスが最も確実です。

- **動的要素の監視**:
    NotebookLM は Angular で構築されており、ソースリストは動的に生成・更新されます。`MutationObserver` を使用して、`.single-source-container` が DOM に追加されたタイミングでボタンを挿入する必要があります。

- **セレクタの安定性**:
    `ng-tns-cXXXXX` のようなクラス名はビルドごとに変わる可能性があるため、`.single-source-container` や `.source-title` といった機能的なクラス名、または `source-picker` などのカスタムタグ名を優先して使用します。

- **イベントの伝播停止**:
    削除ボタンをクリックした際に、親要素（`.single-source-container`）のクリックイベント（ソースの選択や詳細表示）が発火しないよう、必ず `event.stopPropagation()` を呼び出す必要があります。

- **UIの一貫性**:
    NotebookLM は Material Design を採用しているため、ボタンには `mdc-icon-button` クラスや Google Symbols (`mat-icon`) を使用すると馴染みが良くなります。