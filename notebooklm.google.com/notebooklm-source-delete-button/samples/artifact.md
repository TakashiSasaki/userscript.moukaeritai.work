# artifact.html の構造説明

このファイルは、NotebookLM の右側に表示される「Studio（アーティファクトライブラリ）」の DOM 断片です。AI によって生成されたノート、オーディオ概要、ガイドなどの一覧が含まれています。

## 主要な構成要素

**包含関係**: `whole-dom.html` によると、この構造は `section.studio-panel > studio-panel > div.panel-content-scrollable` の内部に位置しています。

1.  **コンテナ (`.artifact-library-container`)**:
    - ライブラリ全体を包む親要素。
2.  **ライブラリ本体 (`artifact-library`)**:
    - 個別のアーティファクト項目をリスト形式で保持します。
3.  **ノート項目 (`artifact-library-note`)**:
    - ユーザーが保存したノートや AI が生成したメモ。
    - 内部に `.artifact-item-button` を持ち、タイトルや最終更新時間が表示されます。
4.  **生成アイテム (`artifact-library-item`)**:
    - オーディオ概要 (`audio_magic_eraser`)、スライド、インフォグラフィックなどの生成物。
    - `aria-description` 属性（例: "Audio Overview", "Slides"）で種類が判別可能です。
5.  **操作ボタン**:
    - 各項目には「More」ボタン (`.artifact-more-button`) があり、削除や共有などのメニューを開くための `mat-menu` トリガーとなっています。

## 実装における意義

この断片は、ソースパネル以外の UI 構造を把握するために使用します。

- **セレクタの特定**: アーティファクトのタイトル (`.artifact-title`) や「More」ボタンへのアクセス方法を確認できます。
- **拡張性**: 将来的にアーティファクトの自動整理や一括操作機能を検討する際、`.artifact-item-button` や `artifact-library-note` といったセレクタが設計の基礎となります。
- **前処理の検証**: 複雑な Angular コンポーネントを含むため、`preprocess_samples.py` のノイズ除去能力をテストするのに適しています。