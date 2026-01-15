# source-item-delete-dialog.html の構造説明

このファイルは、NotebookLM のソースパネルで「Remove source」を選択した際に表示される確認ダイアログの DOM 断片です。ユーザーに対して削除の最終確認を求める役割を持ちます。

## 主要な構成要素

**包含関係**: このダイアログは、`div.cdk-overlay-container` 内の `div.cdk-global-overlay-wrapper` に動的に生成されます。

1.  **ダイアログコンテナ (`mat-dialog-container`)**:
    - ダイアログ全体のルート要素。`role="dialog"` を持ちます。内部に `delete-source` コンポーネントをホストします。
2.  **コンテンツエリア (`mat-dialog-content`)**:
    - **タイトルラベル (`mat-label.title-label`)**: 「Delete [ソース名]?」という確認テキストが含まれます。
3.  **アクションエリア (`mat-dialog-actions`)**:
    - **削除ボタン (`button.submit`)**: 実際に削除を確定させるボタン。`type="submit"` を持ち、内部の `span.mdc-button__label` に "Delete" というテキストが含まれます。
    - **キャンセルボタン (`button.cancel`)**: 削除を中止してダイアログを閉じるボタン。`type="button"` を持ちます。

## 削除ボタンの実装における意義

現在のユーザースクリプトのロジックでは、メニューの「Remove source」をクリックした後にこのダイアログが立ち上がります。完全な自動削除を実現するには、このダイアログ内の「Delete」ボタンを特定してクリックする処理を追加する必要があります。

### 推奨される特定方法
- **セレクタ**: `mat-dialog-container button.submit` または、ボタン内のテキストが "Delete" であるものを特定します。

### 完結するトリガーシーケンス
1.  ソースアイテムの「More」ボタンをクリック。
2.  ポップオーバーメニューの「Remove source」ボタンをクリック。
3.  **（追加ステップ）** 確認ダイアログの出現を監視し、「Delete」ボタンをクリック。

このダイアログの操作を自動化することで、ユーザーは確認の手間なくソースを即座に削除できるようになります。