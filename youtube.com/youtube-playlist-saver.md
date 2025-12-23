# YouTube Playlist Saver 設計書

このドキュメントは、YouTube のプレイリストに含まれる動画 ID を記録・管理するユーザースクリプトの設計を定義します。

## 1. プロジェクトの目的

`youtube-playlist-saver.user.js` を作成し、YouTube プレイリスト内の動画情報を効率的に収集・可視化することを目的とします。

### 開発リソース
*   **サンプル DOM**: `samples/` ディレクトリに、プレイリスト全体の DOM や動画アイテムの断片を保存し、分析に使用します。
*   **実行環境**: ブラウザの Tampermonkey 拡張機能での動作を想定しています。

## 2. 動作対象ページ

URL の `list` パラメータにプレイリスト ID が含まれるページを対象とします。

*   **後で見る (Watch Later)**: `https://www.youtube.com/playlist?list=WL`
*   **高く評価した動画 (Liked Videos)**: `https://www.youtube.com/playlist?list=LL`
*   **一般のプレイリスト**: `https://www.youtube.com/playlist?list=[PLAYLIST_ID]`

## 3. ユーザースクリプトの機能

### 3.1 動画 ID の収集
*   **自動記録**: ユーザーがプレイリストをスクロールして表示された動画アイテムの ID を抽出します。
*   **プレイリスト管理**: 動画 ID は、対応するプレイリスト ID（`WL` や `LL` を含む）と紐付けて記録します。
*   **重複除外**: すでに保存済みの動画については、新規に記録しません。

### 3.2 永続データストレージ
*   収集したデータは、ユーザースクリプトからアクセス可能な永続的データストア（`GM_setValue` 等）に保存します。
*   メタデータ項目の `@grant` に必要な権限を設定します。

### 3.3 既知動画のインジケーター表示
*   **表示場所**: 各動画アイテム内の `id="engagement-bar"` 要素。
*   **表示内容**: その動画が「収集済み」か「新規収集」かが一目でわかるインジケーターを表示します。

## 4. プロジェクト管理

### 4.1 バージョン管理
*   形式: `major.minor.patch` (Semantic Versioning)
*   更新ルール: スクリプトファイルが少しでも変更された場合は、`patch` レベルを更新します。

### 4.2 メタデータ定義
*   **作者**: Takashi Sasaki (x.com/TakashiSasaki)
*   **Namespace**: `userscript.moukaeritai.work`
*   **公開・更新**: GitHub (`TakashiSasaki/userscript.moukaeritai.work`) 上で公開し、Tampermonkey の自動更新機能に対応させます。

