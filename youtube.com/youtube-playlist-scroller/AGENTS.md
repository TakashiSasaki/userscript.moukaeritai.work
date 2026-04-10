# Agent Guidelines: youtube-playlist-scroller

This document provides technical details for AI agents developing or maintaining the **YouTube Playlist Scroller** userscript. For general project rules, refer to the root [AGENTS.md](/AGENTS.md).

**スクリプト本体が設計の正本です。** このファイルに記載の情報が古くなった場合は、スクリプト本体を参照して更新してください。

---

## スクリプトの設計概要

YouTube プレイリストページで、指定された時間（1min / 3min / 10min / 30min）だけページ末尾への自動スクロールを行い、無限スクロールによる動画読み込みを支援するツールです。YouTube の読み込みスピナーの状態を監視し、読み込み中はスクロールを一時停止します。

---

## 1. 自動スクロールのメカニズム

### タイマーベースのスクロール

| 定数 | 値 | 意味 |
|---|---|---|
| `AUTO_SCROLL_INTERVAL_MS` | 10,000ms (10秒) | スクロール間隔 |
| `AUTO_SCROLL_BOTTOM_THRESHOLD_PX` | 80px | 「ページ末尾にいる」と判定する閾値 |

### `runAutoScrollCycle()` のフロー

1. `lastLoadingState === true` → スキップ（読み込み中はスクロールしない）
2. ページ末尾に到達していない **または** 新コンテンツが検出された → `window.scrollTo(0, scrollHeight)`
3. `scheduleNextAutoScroll()` で次のサイクルをスケジュール

### 時間制限付きスクロール (`startTimedAutoScroll`)

- ボタンの `data-duration-seconds` 属性で時間を指定（60, 180, 600, 1800）
- `autoScrollEndAt` に終了時刻を記録
- `autoScrollStopTimerId` で自動停止
- `remainingTimeTimerId` で 1 秒ごとにカウントダウン表示を更新

---

## 2. 読み込みスピナー監視

### スピナーセレクタ

```
tp-yt-paper-spinner, tp-yt-paper-spinner-lite
```

### MutationObserver (`ensureLoadingObserver()`)

- Root: `ytd-playlist-video-list-renderer`
- 監視: `childList: true, subtree: true, attributes: true`
- `attributeFilter`: `['active', 'aria-hidden', 'hidden', 'style']`
- Root 要素が見つからない場合、**指数バックオフ**でリトライ（250ms → 500ms → ... → 最大 2000ms）

### バッチ処理

MutationObserver コールバックはスピナー要素を `pendingSpinnerAdds` / `pendingSpinnerRemovals` に蓄積し、**50ms デバウンス** (`scheduleLoadingMutationProcessing`) で一括処理：

```
Mutation → pendingSets に蓄積 → 50ms 後に processPendingLoadingMutations()
  → cachedSpinners を更新 → scheduleLoadingStateCheck()
    → 50ms 後に checkLoadingState()
```

### `checkLoadingState()` の判定ロジック

キャッシュされたスピナー要素をループし、以下の **すべて** を満たすものが 1 つでもあれば `isLoading = true`：
- `spinner.isConnected` かつ `!spinner.hidden`
- `active` 属性あり **または** `aria-hidden !== 'true'`
- インライン style に `display: none` が含まれない
- `getComputedStyle(spinner).display !== 'none'`

読み込み完了（`isLoading: true → false`）時に `scheduleNextAutoScroll()` を呼んでスクロールを再開。

---

## 3. DOM セレクタ

| 対象 | セレクタ |
|---|---|
| スピナー要素 | `tp-yt-paper-spinner, tp-yt-paper-spinner-lite` |
| Observer Root | `ytd-playlist-video-list-renderer` |
| ローディングステータス | `#yt-scroller-loading-status` |
| 残り時間表示 | `#yt-scroller-remaining-time` |
| 時間ボタン | `[data-duration-seconds]` |

---

## 4. 状態管理

| 変数 | 型 | 意味 |
|---|---|---|
| `isAutoScrollEnabled` | boolean | 自動スクロールが有効か |
| `autoScrollEndAt` | number \| null | 自動停止時刻 (Date.now() ベース) |
| `activeDurationSeconds` | number \| null | 選択中のボタンの秒数 |
| `lastLoadingState` | boolean \| null | 前回のスピナー状態（変化時のみ UI 更新） |
| `lastKnownScrollHeight` | number | 新コンテンツ検出用の前回スクロール高さ |
| `cachedSpinners` | Set | 現在追跡中のスピナー DOM 要素 |

---

## 5. 他のスクリプトとの連携

- **直接的な連携なし**: Scroller は他のユーザースクリプトの API やイベントに依存しません
- **間接的な協調**: Saver がスクロールで読み込まれた動画を自動的に記録し、Filter がフィルタリングし、Remover が削除対象にできるという流れの起点を担います

---

## 6. `index.html` のメンテナンス要件

1. **バージョン情報の動的取得**:
   - `.user.js` の `@version` をインクリメントするだけで自動反映されます。HTML にバージョン番号をハードコードしないでください。

2. **ドキュメントの網羅性**:
   - 新しいスクリプトを追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
