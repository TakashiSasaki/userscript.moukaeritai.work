# gemini-one-click-delete.user.js

## このユーザースクリプトの目的

GeminiのWeb SPAページにおいて、現在の会話を削除するために複数回のクリック（メニューを開く → 削除を選択 → 確認ダイアログ）が必要です。
本スクリプトは、これらの手順を自動化し、**1クリック** または **キーボードショートカット** で即座に会話を削除できる機能を追加します。
Tampermonkey 上で動作することを想定しています。

## ユーザースクリプト情報

*   **Namespace**: `https://userscript.moukaeritai.work/`
*   **Match URL**: `https://gemini.google.com/app/*`
*   **GitHub**: [userscript.moukaeritai.work](https://github.com/TakashiSasaki/userscript.moukaeritai.work/tree/userscript/gemini.google.com/gemini-one-click-delete)

## 機能仕様

### 1. 1クリック削除ボタンの注入

以下の場所に「ゴミ箱」アイコンの削除ボタンを自動的に追加します。

*   **標準ビュー（デスクトップ/モバイル共通）**:
    *   画面上部（ヘッダー部分）にある「・・・（オプション）」メニューボタンの隣に配置されます。
*   **検索結果ビュー（またはヘッダーがない場合）**:
    *   画面右上に「フローティングボタン」として配置されます。
    *   このボタンは、現在表示中の会話IDを検知し、サイドバー内の対応する削除メニューを自動的に操作します。

### 2. キーボードショートカット

*   **ショートカット**: `Ctrl + D` （Macの場合は `Meta + D` も可の想定）
*   **動作**:
    *   ショートカットキーが押されると、画面上の削除ボタン（標準またはフローティング）をプログラム的にクリックします。
    *   **安全性**: テキスト入力エリア（`input`, `textarea`, `contenteditable`）での入力中はショートカットを無効化します。

### 3. エラーハンドリング

*   **Trusted Types 対応**: `simulateClick` 関数において `MouseEvent` の `view` プロパティを `null` に設定することで、ブラウザのセキュリティポリシー（Trusted Types）によるエラーを回避しています。
*   **待機ロジック**: メニューパネルや確認ダイアログが表示されるのを動的かつ堅牢に待機します。

## 技術的詳細

### DOM操作の流れ（削除フロー）
ボタン（またはショートカット）が押されると、以下の手順が高速に実行されます：
1.  トリガーとなる「・・・」メニューボタンをクリック。
2.  表示されたメニューパネル（`.mat-mdc-menu-panel` / `.mat-bottom-sheet-container`）から「削除（Delete）」ボタンを探索してクリック。
3.  表示された確認ダイアログ（`mat-dialog-container`）内の「確認（Confirm）」ボタンを待機してクリック。

### DOMのサンプル
開発にあたっては、デスクトップ表示（`sample1.html`）およびモバイル表示（`sample2.html`）のDOM構造を参照しています。

## 更新履歴
*   **v0.1.11**: ボタンのクリック処理を簡略化（`mousedown`, `mouseup` を削除）。ダークモード表示時のボタンスタイルを改善。
*   **v0.1.10**: `Ctrl + D` ショートカットの実装。フローティングボタンと標準ボタンのどちらもトリガー可能。
*   **v0.1.9**: `simulateClick` の `TypeError` 修正（Trusted Types対応）。
