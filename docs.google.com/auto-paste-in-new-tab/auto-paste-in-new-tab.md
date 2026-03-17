# Auto Paste in New Tab

## 目的
Google Docs上で新しいタブを開き、クリップボードの内容を自動でペーストするスクリプトです。

## 機能概要
- Google Docs (ドキュメント) の画面上にフローティングボタンを配置します。
- ボタンのラベルは「Paste in new tab」です。
- ユーザーはボタンを自由にドラッグして移動でき、その位置は記憶されます。
- ボタンを押下すると、内部的にカスタムイベント（例: `EmulateDocsPaste`）を発火します。
- カスタムイベントに反応して、`Shift+F11` をエミュレートし、500msの待機後に `Ctrl+V` をエミュレートします。

## 対象サイト
- https://docs.google.com/document/*