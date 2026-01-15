# source-item-popover.html の構造説明

このファイルは、NotebookLM のソースパネルで各ソースアイテムの右端にある「More」（三点リーダー）ボタンをクリックした際に表示されるポップオーバーメニューの DOM 断片です。

## 主要な構成要素

1.  **ポップオーバーコンテナ (`div.cdk-overlay-popover`)**:
    - メニュー全体をラップする要素。`popover="manual"` 属性を持ちます。
2.  **背景 (`div.cdk-overlay-backdrop`)**:
    - メニュー表示時に背後に表示される半透明のオーバーレイ。
3.  **メニューパネル (`div.mat-mdc-menu-panel`)**:
    - 実際のメニュー項目を含むパネル。`id="mat-menu-panel-X"` のような動的なIDを持ちます。
    - 内部に `div.mat-mdc-menu-content` を含みます。
4.  **「Remove source」ボタン (`button.more-menu-delete-source-button`)**:
    - ソースを削除するためのボタン。
    - `mat-menu-item` クラスを持ち、`role="menuitem"` が設定されています。
    - 内部に `mat-icon` (`delete`) と `span.mat-mdc-menu-item-text` ("Remove source") を含みます。
5.  **「Rename source」ボタン (`button.more-menu-edit-source-button`)**:
    - ソース名を変更するためのボタン。
    - `mat-menu-item` クラスを持ち、`role="menuitem"` が設定されています。

## 削除ボタンの実装における意義

この断片は、ユーザースクリプトが NotebookLM のネイティブな削除機能をトリガーするために不可欠な情報を提供します。

-   **トリガーシーケンス**:
    1.  対象の `.single-source-container` 内にある「More」ボタン（通常は `.source-item-more-button`）をクリックします。
    2.  `cdk-overlay-container` 内にこのポップオーバーメニューが出現するのを待ちます。
    3.  出現したメニューの中から `button.more-menu-delete-source-button` を特定し、プログラム的にクリックします。