# YouTube Playlist Scroller

プレイリストページで、リストの一番下まで自動的にスクロールし続けるユーザースクリプトです。  
大量の動画が含まれるプレイリスト（例えば「後で見る」など）の全件読み込みを支援します。

## 機能

*   **自動スクロール**: 一定間隔でページ最下部へスクロール、または指定ピクセル数だけスクロールします。
*   **バックグラウンド動作**: ブラウザで他のタブを見ていても、裏でスクロールを継続します（ブラウザの仕様により頻度が下がる場合があります）。
*   **設定保存**: スクロール間隔やステップ数、モード（最下部へジャンプするかどうか）の設定を記憶します。

## インストール

1.  Tampermonkey などの拡張機能がインストールされていることを確認します。
2.  以下のリンクをクリックしてインストールします。

👉 **[Install YouTube Playlist Scroller](youtube-playlist-scroller.user.js)**

## 使い方

1.  YouTubeのプレイリストページ（`https://www.youtube.com/playlist?list=...`）を開きます。
2.  画面右下に「Auto Scroller」パネルが表示されます。
3.  **ON/OFF** ボタンをクリックすると、自動スクロールの開始/停止を切り替えられます。

## 設定

*   **Scroll to Bottom**: チェックを入れると、毎回ページの最下端へジャンプします（大量読み込みに推奨）。チェックを外すと、現在の位置から「Step」で指定した量だけスクロールします。
*   **Step (px)**: 「Scroll to Bottom」がオフの場合の、1回あたりのスクロール量です。
*   **Interval (sec)**: スクロールを実行する間隔（秒）です。

## 併用推奨スクリプト

このスクリプトは以下のツールと組み合わせて使用することで、プレイリストの管理がより便利になります。

*   **[YouTube Playlist Saver](../youtube-playlist-saver/index.html)**: 読み込んだ動画のIDを自動的に保存し、既知か新規かを判別します。
*   **[YouTube Playlist Filter](../youtube-playlist-filter/index.html)**: 大量の動画から特定のキーワードで絞り込みを行います。
*   **[YouTube Playlist Remover](../youtube-playlist-remover/index.html)**: 不要な動画を一括で削除します。

## 技術的詳細

*   このスクリプトは [YouTube Playlist Saver](../youtube-playlist-saver/index.html) から機能を分離し、単独での使いやすさを重視して設計されました。
*   ページ遷移 (`yt-navigate-finish`) を検知し、自動的にコントロールパネルを再初期化します。
