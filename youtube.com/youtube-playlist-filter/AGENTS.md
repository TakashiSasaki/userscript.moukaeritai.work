# Agent Guidelines: youtube-playlist-filter

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

---

## スクリプトの設計概要

`youtube-playlist-filter.user.js` は YouTube プレイリストページの動画リストをリアルタイムにフィルタリングするユーザースクリプトです。  
**スクリプト本体が設計の正本です。** このファイルに記載の情報が古くなった場合は、スクリプト本体を参照して更新してください。

---

## フィルタリングロジック

### 検索方式: AND-in-OR (積和標準形)

- **入力欄は 5 つ** (`#yt-filter-query-input-1` 〜 `#yt-filter-query-input-5`)
- **行内**: スペース区切りのキーワードは **AND** 条件
- **行間**: 複数の非空行は **OR** 条件
- **全行が空**: フィルタなし（全件表示）

```
例) Row1: "猫 動画", Row2: "犬"
→ (タイトルに "猫" かつ "動画" を含む) OR (タイトルに "犬" を含む)
```

実装: `matchesFilter(targetText, queries)` 関数（`normalizeText()` による NFKC 正規化済み）

### 検索対象 (`filterState.mode`)

- `'title'` (デフォルト): 動画タイトル
- `'channel'`: チャンネル名

ラジオボタン (`input[name="yt-filter-mode"]`) で切り替え。

### モード切り替えの動作

- **Title/Channel ラジオボタンを変更する** → `beginFilterEditing(null)` が呼ばれ、フィルタリングを即座に停止して編集モードに移行する
- Enter キーを押すまで再適用されない

---

## 状態管理

| 変数 | 型 | 意味 |
|---|---|---|
| `filterState.queries` | `string[5]` | 5 つの入力欄の値 |
| `filterState.mode` | `'title' \| 'channel'` | 検索対象 |
| `isFiltering` | `boolean` | 現在フィルタが有効かどうか（1 つ以上の行に値がある） |
| `isInputActive` | `boolean` | 編集モードかどうか（編集中はフィルタ処理をスキップ） |
| `isActive` | `boolean` | スクリプト全体の活性状態 |

### 操作フロー

```
編集モード (isInputActive=true)
  └─ Enter キー → commitFilterInputs() → ロック → startBackgroundWork()
  
ロック済みの入力欄をクリック → beginFilterEditing(input)
ラジオボタンを変更           → beginFilterEditing(null)
Reset Filter ボタン          → 5 つの入力欄をクリア → beginFilterEditing(...)
```

---

## DOM セレクタ (現バージョン)

| 対象 | セレクタ |
|---|---|
| プレイリスト動画アイテム | `ytd-playlist-video-renderer` |
| 動画タイトル | `#video-title`, `a#video-title`, `.ytd-playlist-video-renderer #video-title`, `#video-title-link` (優先順) |
| チャンネル名 | `.ytd-channel-name a`, `#channel-name #text`, `yt-formatted-string.ytd-channel-name` (優先順) |
| フィルタ入力欄 | `#yt-filter-query-input-1` 〜 `#yt-filter-query-input-5` |
| フィルタモード | `input[name="yt-filter-mode"]` |
| 一致バッジ | `.yt-filter-matched` （オレンジ色の `[MATCHED]` スパン） |
| 結果カウント | `#yt-filter-count` |
| キューカウント | `#yt-filter-queue-info` |
| ステータス | `#yt-filter-status-monitor`, `#yt-filter-status-scanner`, `#yt-filter-status-processor` |
| プレイリストコンテナ | `ytd-playlist-video-list-renderer #contents`, `ytd-playlist-video-list-renderer` |

---

## パフォーマンス設計

- **チャンク処理**: `processChunk()` は 1 回 30 件ずつ処理し、`setTimeout(processChunk, 0)` で再スケジュール（UIスレッドをブロックしない）
- **メタデータキャッシュ**: タイトル・チャンネル名の取得コストを `itemMetadataCache` (`WeakMap`) にキャッシュ
- **結果更新のデバウンス**: `scheduleResultsUpdate()` は `RESULTS_UPDATE_DELAY_MS = 1200ms` のデバウンスで `updateCounts()` を呼ぶ
- **MutationObserver スコープ**: `ytd-playlist-video-list-renderer #contents` のみを監視（`subtree: true, childList: true`）
- **ポーリング禁止**: `startBackgroundWork` が設定する定期タイマーは `recheckCachedItems` (5 秒ごと) のみで、DOM の再スキャンではなくキャッシュクリーンアップのみを行う

---

## `index.html` のメンテナンス要件

1. **バージョン情報の動的取得**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub から最新の `@version` を動的に取得して表示します。HTML 内にバージョン番号をハードコードしないでください。
   - `.user.js` の `@version` をインクリメントするだけで自動反映されます。

2. **依存関係とイベントの明記**:
   - Filter スクリプトが付与する `.yt-filter-matched` バッジは **YouTube Playlist Remover** が参照します（`hasMatchedBadge()` で検出）。この連携を `index.html` に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプトを追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
