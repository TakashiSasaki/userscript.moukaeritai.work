# artifact.html の構造説明

このファイルは、NotebookLM の右側に表示される「Studio（アーティファクトライブラリ）」の DOM 断片です。AI によって生成されたノート、オーディオ概要、ガイドなどの一覧が含まれています。

## 主要な構成要素

**包含関係**: `whole-dom.html` によると、この構造は `section.studio-panel > studio-panel > div.panel-content-scrollable` の内部に位置しています。

1.  **コンテナ (`.artifact-library-container`)**:
    - ライブラリ全体を包む親要素。
2.  **ライブラリ本体 (`artifact-library`)**:
    - アーティファクトのリストを管理するコンポーネント。
3.  **アイテムラッパー要素**:
    - **ノート (`artifact-library-note`)**: ユーザーが作成したメモや保存した回答。
    - **生成物 (`artifact-library-item`)**: Audio Overview やガイドなどの AI 生成コンテンツ。
4.  **アイテムボタンコンテナ (`div.artifact-item-button`)**:
    - アイテムのクリック領域とメニューを保持するラッパー。
5.  **メインボタン (`button.artifact-button-content`)**:
    - アイテムを開くためのメインのインタラクション要素。
    - **タイトル (`.artifact-title`)**: アーティファクトの名前。
    - **詳細 (`.artifact-details`)**: 更新時間やソース数。
    - **アクションコンテナ (`.artifact-action-container`)**: タイトルの右側に位置する領域。

## 個別要素の特定方法 (セレクタ)

- **アイテムのルート**: `artifact-library-note` または `artifact-library-item`
- **タイトルテキスト**: `.artifact-title`
- **削除ボタンのインジェクト先**: `.artifact-action-container`
    - ネイティブの「More」ボタンもホバー時にこのコンテナ内に出現するため、ここにカスタムボタンを配置するのが UI 的に自然です。

## 実装における意義

アーティファクト削除機能を実装する際、以下の点が重要になります。

- **動的生成への対応**: 「More」ボタンはホバーするまで DOM に存在しない可能性があるため、ソース削除機能と同様に `mouseenter` イベントのエミュレーションが必要です。
- **コンテナの区別**: アーティファクトは `section.studio-panel` 内にあり、ソースパネル (`section.source-panel`) とはセレクタを分けて管理する必要があります。
- **一括削除の検討**: `artifact-library` を親として、すべての子要素に対してシーケンシャルに削除処理を実行するロジックが組めます。