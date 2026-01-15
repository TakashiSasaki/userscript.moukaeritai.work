# source-item-remove-button.html の構造説明

このファイルは、NotebookLM のソースパネルで各ソースアイテムの「More」メニュー（三点リーダー）をクリックした際に表示されるポップオーバーメニュー内の「Remove source」ボタンの DOM 断片です。

## 主要な構成要素

1.  **メニューアイテムボタン (`button.more-menu-delete-source-button`)**:
    - ポップオーバーメニュー内の個別の項目。
    - `mat-mdc-menu-item` クラスを持ち、Angular Material のメニュー項目として実装されています。
    - `more-menu-delete-source-button` という特定のクラスを持っており、これが要素の特定に非常に有用です。
2.  **アイコン (`mat-icon`)**:
    - ゴミ箱アイコンを表示します。内部テキスト（マテリアルアイコン名）は `delete` です。
3.  **テキストラベル (`span.mat-mdc-menu-item-text`)**:
    - 「Remove source」というテキストが含まれます。

## 削除ボタンの実装における意義

ユーザースクリプトでソースを削除する際、まずこのボタンをクリックして削除確認ダイアログを呼び出す必要があります。

### 推奨される特定方法
- **セレクタ**: `button.more-menu-delete-source-button`
- **注意点**: `_ngcontent-ng-c...` のような属性はビルドごとに値が変わる可能性があるため、セレクタには使用しないでください。

### トリガーシーケンスにおける位置
1.  ソースアイテムの「More」ボタンをクリック。
2.  **（このステップ）** ポップオーバーメニュー内の `button.more-menu-delete-source-button` をクリック。
3.  確認ダイアログ（`source-item-delete-dialog.html`）が表示される。