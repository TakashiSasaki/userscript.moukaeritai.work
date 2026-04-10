# Agent Guidelines: youtube-playlist-saver

This document provides technical details for AI agents developing or maintaining the **YouTube Playlist Saver** userscript. For general project rules, refer to the root [AGENTS.md](/AGENTS.md).

**スクリプト本体が設計の正本です。** このファイルに記載の情報が古くなった場合は、スクリプト本体を参照して更新してください。

---

## スクリプトの設計概要

YouTube プレイリストページの動画 ID をバックグラウンドで `GM_setValue` に記録し、各動画にセッション開始時の既知/新規を示すインジケーター（`[SAVED]` / `[NEW]`）を表示するバックエンドサービスです。他のスクリプト（Filter, Remover）と協調動作する基盤として `SaverAPI` を `window.YouTubePlaylistSaver` にエクスポートします。

---

## 1. データ構造

### ストレージキー

| キー | 用途 |
|---|---|
| `yt_playlist_data` (`DATA_KEY`) | プレイリストデータ本体 |
| `yt_saver_panel_position` | パネル位置の永続化 |
| `yt_saver_is_minimized` | パネル最小化状態 |

### データフォーマット (`DATA_VERSION: 2`)

```json
{
  "version": 2,
  "playlists": {
    "<playlistId>": {
      "<videoId>": {
        "title": "string | null",
        "channel": "string | null",
        "addedAt": 1234567890123
      }
    }
  }
}
```

### マイグレーション (`loadStorage()`)

- **Version 0 (legacy)**: `{ playlistId: [videoId, ...] }` → v2 に変換
- **Version 1**: `{ version: 1, playlists: { playlistId: [videoId, ...] } }` → v2 に変換
- **Version 2**: そのまま使用

---

## 2. 保存メカニズム (`requestSave()`)

- **バッチ保存**: `pendingQueue` に一時蓄積し、**2000ms デバウンス**で一括書き込み
- **JIT マージ**: 保存時に `GM_getValue` で最新データを再読み込みし、マージしてから `GM_setValue` → タブ間の Lost Update を防止
- **変更通知**: 保存完了時に `window.dispatchEvent(new CustomEvent('YouTubePlaylistSaverDataChanged'))` を発火

---

## 3. スキャンとインジケーター

### `scanAndRender()` (5 秒ポーリング)

1. `getPlaylistId()` で `?list=` パラメータからプレイリスト ID を取得
2. セッション初回: `currentSessionKnownIds` にストレージ上の既知 ID を読み込み
3. 全 `ytd-playlist-video-renderer` をスキャン:
   - `extractVideoId()` で `a#video-title` or `a#thumbnail` から `?v=` パラメータを抽出
   - **`[NEW]`**: セッション開始時にストレージに無かった動画（青色 `#3ea6ff`）
   - **`[SAVED]`**: セッション開始時にストレージにあった動画（緑色 `#2ba640`）
   - `processedSet` (`WeakSet`) でインジケーター付与済みアイテムをスキップ（重複処理防止）
4. パネルの統計を `updatePanelStats()` で更新

### パフォーマンス考慮

- `window.getComputedStyle` によるリフローを避け、`item.hidden || item.style.display === 'none'` で軽量に非表示判定
- `processedSet` (`WeakSet`) により DOM の再スキャン時も処理済みアイテムをスキップ

---

## 4. DOM セレクタ

| 対象 | セレクタ |
|---|---|
| プレイリスト動画アイテム | `ytd-playlist-video-renderer` |
| 動画 ID 取得用リンク | `a#video-title`, `a#thumbnail` |
| 動画タイトル | `#video-title` (textContent) |
| チャンネル名 | `.ytd-channel-name a` (textContent) |
| インジケーター挿入先 | `#engagement-bar`, `.ytd-video-meta-block`, `#meta` (優先順) |
| インジケーター本体 | `.yt-saver-indicator` (スパン要素) |

---

## 5. エクスポート機能

### フロー (優先度順)

1. **File System Access API** (`exportViaSavePicker`)
   - `unsafeWindow.showSaveFilePicker()` を使用（Tampermonkey のサンドボックスが `window.showSaveFilePicker` を隠蔽するため `unsafeWindow` が必須）
   - suggestedName にタイムスタンプ付きファイル名を設定

2. **GM_download フォールバック** (`exportViaGMDownload`)
   - `data:` URI エンコードされた JSON を `GM_download` に渡す
   - `blob:` URL は UUID ファイル名問題を引き起こすため使用禁止
   - `saveAs: true` で Chrome のダウンロードダイアログを表示

### ファイル名形式

```
youtube_playlist_saver_data_YYYYMMDD-HHmmss.json
```

### クリップボードコピー

`GM_setClipboard(JSON.stringify(cachedStorage, null, 2), 'text')` でインデント付き JSON をクリップボードにコピー。

---

## 6. Public API (`SaverAPI`)

`window.YouTubePlaylistSaver` として公開、`YouTubePlaylistSaverReady` イベントで通知：

| メソッド | 引数 | 戻り値 | 用途 |
|---|---|---|---|
| `save(playlistId, videoId, title, channel)` | string × 4 | boolean | 動画を保存（新規のみ true） |
| `isSaved(playlistId, videoId)` | string × 2 | boolean | 保存済みか判定 |
| `getAllKnownIds(playlistId)` | string | string[] | プレイリストの全保存済み ID |
| `getStorageSnapshot()` | - | object | ストレージ全体のスナップショット |

---

## 7. タブ間同期

`GM_addValueChangeListener` が利用可能な場合、`DATA_KEY` の変更を監視。他タブからの変更を検知すると：
- `cachedStorage` を更新
- `processedSet` をリセット
- `scanAndRender()` を再実行

---

## 8. 他のスクリプトとの連携

| 連携先 | 連携方法 | 注意事項 |
|---|---|---|
| YouTube Playlist Filter | Filter が付与する `.yt-filter-matched` バッジと Saver が付与する `.yt-saver-indicator` は同じメタデータバーに `prepend` される。実行順により表示順が変わる。 | 互いに独立して動作 |
| YouTube Playlist Remover | Remover は Saver のインジケーター付きアイテムを削除対象にできる | Saver のデータは削除されない |

---

## 9. `index.html` のメンテナンス要件

1. **バージョン情報の動的取得**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub から最新の `@version` を動的に取得して表示します。HTML 内にバージョン番号をハードコードしないでください。

2. **依存関係とイベントの明記**:
   - Saver は `SaverAPI` を公開する側です。`window.YouTubePlaylistSaver` と `YouTubePlaylistSaverReady` イベントについて `index.html` に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプトを追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
