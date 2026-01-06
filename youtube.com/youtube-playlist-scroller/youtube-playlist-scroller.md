# YouTube Playlist Scroller

プレイリストページで、リストの一番下まで自動的にスクロールし続けるユーザースクリプトです。  
大量の動画が含まれるプレイリスト（例えば「後で見る」など）の全件読み込みを支援します。

## 機能

*   **自動スクロール**: 一定間隔でページ最下部へスクロール、または指定ピクセル数だけスクロールします。
*   **バックグラウンド動作**: ブラウザで他のタブを見ていても、裏でスクロールを継続します（ブラウザの仕様により頻度が下がる場合があります）。
*   **設定保存**: スクロール間隔やステップ数、モード（最下部へジャンプするかどうか）の設定を記憶します。

## インストール

以下のボタンをクリックしてインストールしてください。

<a href="https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js" target="_blank" class="install-button">
Install YouTube Playlist Scroller
</a>

## 使い方

1.  YouTubeのプレイリストページ（`https://www.youtube.com/playlist?list=...`）を開きます。
2.  画面右下に「Auto Scroller」パネルが表示されます。
3.  **ON/OFF** ボタンをクリックすると、自動スクロールの開始/停止を切り替えられます。

## 設定

*   **Scroll to Bottom**: チェックを入れると、毎回ページの最下端へジャンプします（大量読み込みに推奨）。チェックを外すと、現在の位置から「Step」で指定した量だけスクロールします。
*   **Step (px)**: 「Scroll to Bottom」がオフの場合の、1回あたりのスクロール量です。
*   **Interval (sec)**: スクロールを実行する間隔（秒）です。

## 開発者向け情報

このスクリプトは [YouTube Playlist Saver](../youtube-playlist-saver/index.html) から機能を分離したものです。
独立して動作するため、他のツールと併用可能です。
