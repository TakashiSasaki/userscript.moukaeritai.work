# YouTube Playlist Filter

YouTube プレイリストの管理を効率化するユーザースクリプトです。**YouTube Playlist Saver** と連携（共存）して動作し、ビデオのフィルタリング機能を提供します。

## 機能

### 1. フィルタリング (Filtering)
画面右下のフローティングパネルを使用して、プレイリスト内の動画をリアルタイムに絞り込みます。
*   **Title Filter**: 動画タイトルに含まれるキーワードでフィルタします。
*   **Channel Filter**: チャンネル名に含まれるキーワードでフィルタします。
*   フィルタ条件の両方（AND条件）に一致する動画のみが表示され、その他は非表示になります。
*   一致した動画には、メタデータ欄の先頭にオレンジ色の `[MATCHED]` バッジが表示されます。

### 2. ステータス表示 (Status Dashboard)
パネルには現在の処理状況が表示されます。
*   **Results**: 現在表示されている動画数 / 全動画数 (例: `Results: 5 / 100`)。
*   **Filtering**: フィルタリング処理が実行中かどうか (`Active` / `Idle`)。

### 3. "Above" インフォメーション
スクロールによって画面上部に隠れた（通り過ぎた）動画の状態を追跡・表示します。
*   **表示形式**: `Above: #1-#49 (10 matches)`
    *   **範囲**: 画面の上端から、現在の表示領域の下端までの範囲内にある動画のインデックス範囲（例：1番目から49番目）。
    *   **matches**: その範囲内にあり、かつ**現在のフィルタ条件に一致している**動画の数。
    *   これにより、「今見えていない（または通り過ぎた）範囲に、マッチした動画がいくつあるか」を一目で把握できます。

## 一括削除について

以前このスクリプトに含まれていた「一括削除 (Remove Above)」機能は、独立した **YouTube Playlist Remover** に移動しました。削除機能を使用したい場合は、以下のスクリプトを別途インストールしてください。

👉 **[Install YouTube Playlist Remover](../youtube-playlist-remover/index.html)**

## インストール

このスクリプトは [YouTube Playlist Saver](../youtube-playlist-saver/index.html) との併用を強く推奨します。

1.  Tampermonkey などの拡張機能がインストールされていることを確認します。
2.  以下のリンクをクリックしてインストールします。

👉 **[Install YouTube Playlist Filter](youtube-playlist-filter.user.js)**

## 技術的詳細

*   **自動更新**: スクロールによる追加読み込み (Infinite Scroll) に対応するため、定期的に (2秒毎) フィルタを再適用します。
*   **同期**: ページ遷移 (`yt-navigate-finish`) を検知し、状態をリセットして自動的に再起動します。
