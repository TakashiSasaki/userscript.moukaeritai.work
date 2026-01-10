# YouTube Playlist Scroller - Developer Notes

このドキュメントは、`youtube-playlist-scroller.user.js` の開発・保守を行うAIエージェントおよび開発者のための技術的なメモです。

## コアロジック

### スクロール制御
ユーザーの利用シーンに応じて2つのモードを実装しています。
1.  **Scroll to Bottom**:
    -   `window.scrollTo(0, document.documentElement.scrollHeight)` を使用。
    -   「後で見る」のような数千件あるリストを一気に読み込ませたい場合に最適です。
2.  **Step Scroll**:
    -   `window.scrollBy(0, step)` を使用。
    -   少しずつ読み込みたい場合や、読み込み具合を目視確認したい場合に使用します。

### 読み込み状態の検知 (Loading Indicator)
-   スクロールしても、通信環境やYouTube側の負荷により次の動画がロードされないことがあります。
-   **実装**: `MutationObserver` を使用して `ytd-playlist-video-list-renderer` 内のスピナー要素 (`tp-yt-paper-spinner`, `tp-yt-paper-spinner-lite`) を監視しています。
-   **判定基準**: スピナー要素が存在し、かつ `active` 属性があるか、`aria-hidden="true"` でない、かつ `display: none` でない場合に「ロード中」と判定します。

## UI 実装

### フローティングパネル
-   **ドラッグ＆ドロップ**: ヘッダー部分 (`cursor: move`) を掴んで画面上の好きな位置に移動できます。
-   **位置の保存**: ドロップ時に `GM_setValue` で位置座標を保存し、次回起動時に復元します。
-   **アクティブ連動**: パネル内容はアクティブ時のみ表示し、非アクティブ時はヘッダーのみ表示して `Inactive` を示します。

## 注意事項

### ブラウザのバックグラウンド制限
-   最近のブラウザはバックグラウンドタブの `setInterval` や `setTimeout` の実行頻度を極端に落とす（スロットリング）傾向があります。
-   現状の実装でも、1秒以上の間隔であれば比較的動作しますが、もし動作が不安定になる場合は Web Worker の利用などを検討する必要があります（現状は未実装）。

### SPA遷移
-   `@match` は YouTube 全体に広げ、主要機能は `/playlist?*` の間だけ有効化します。
-   `yt-navigate-start/finish` で URL 変化を検知し、プレイリスト以外ではスクロールや監視を停止し、パネル内容を閉じます。

## インストール/バージョン検知API
- `index.html` は `userscript-ping` を送信し、各ユーザースクリプトが `userscript-check-installed` を `dispatchEvent` して応答することで検知します。
- 受信側は `data-script-name` と `@name` の一致で対象ボタンを特定します。
- `Install (vX.Y.Z)` の表記からバージョンを抽出し、セマンティックバージョン比較で `Update` / `Installed` を切り替えます。
