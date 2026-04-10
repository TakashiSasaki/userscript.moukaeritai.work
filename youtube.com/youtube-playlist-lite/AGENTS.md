# Agent Guidelines: youtube-playlist-lite

This document provides technical details for AI agents developing or maintaining the **YouTube Playlist Lite** userscript. For general project rules, refer to the root [AGENTS.md](/AGENTS.md).

**スクリプト本体が設計の正本です。** このファイルに記載の情報が古くなった場合は、スクリプト本体を参照して更新してください。

---

## スクリプトの設計概要

YouTube プレイリストページにおいて、サムネイル・プレイリストヘッダー・ミニプレイヤーを継続的に削除して表示を軽量化するツールです。3 つの削除ターゲットはユーザーがチェックボックスで個別にオン/オフできます。

---

## 1. ページコンテキスト

- **有効条件**: `location.pathname.startsWith('/playlist')` のみ（`getPageConfig()` で判定）
- **非プレイリストページ**: `stopMain()` が呼ばれ、オブザーバー停止・パネル非アクティブ化
- **@match**: `https://www.youtube.com/*` と `https://userscript.moukaeritai.work/*` (インストール検知用)

---

## 2. 削除ターゲットと UI

3 つのチェックボックスで各ターゲットの有効/無効を切り替え、`GM_setValue` で永続化：

| ターゲット | チェックボックス ID | ストレージキー | 削除関数 |
|---|---|---|---|
| Thumbnails | `#yt-lite-target-thumbnails` | `yt_lite_target_thumbnails` | `clearExistingThumbnails()` |
| Playlist Header | `#yt-lite-target-header` | `yt_lite_target_header` | `clearExistingHeader()` |
| Miniplayer | `#yt-lite-target-miniplayer` | `yt_lite_target_miniplayer` | `removeMiniplayerIfPresent()` |

### レガシーマイグレーション

`getMigratedTargetSelection()` で旧ストレージキー（`yt_lite_hide_thumbnails`, `yt_lite_force_remove`, `yt_lite_hide_miniplayer`, `yt_lite_remove_miniplayer`）から現行キーに透過的に移行します。

---

## 3. DOM セレクタ (`PAGE_CONFIG.playlist`)

| ターゲット | セレクタ | 監視対象 (MutationObserver) |
|---|---|---|
| Thumbnails | `ytd-playlist-video-renderer ytd-thumbnail` | `ytd-playlist-video-list-renderer` |
| Header | `#page-manager > ytd-browse > ytd-playlist-header-renderer` | `#page-manager > ytd-browse` |
| Miniplayer | `ytd-miniplayer` | `ytd-app` |
| **Disable Links** | `ytd-playlist-video-renderer` | `document` (Capture Phase Listener) |

---

## 4. 実装のポイント

### キャプチャ相によるナビゲーション阻止
YouTube の SPA ナビゲーションは Polymer の内部処理で複雑に制御されています。これを確実に止めるため、`click` および `mousedown` イベントを **キャプチャ相 (`true`)** で捕捉し、`stopImmediatePropagation()` と `preventDefault()` を実行します。

### 除外設定
以下の要素へのインタラクションは、ナビゲーション防止設定中も許可します：
- `#menu`, `ytd-menu-renderer` (三点メニュー)
- `#reorder` (ドラッグハンドル)
- `.yus-panel` (本スクリプトおよび他スクリプトの UI パネル)

### ポーリングと再試行
 SPA ナビゲーション直後は Observer の Root 要素が存在しない場合があるため、`setTimeout` による再試行（1000ms間隔）を実装し、要素の出現を待機します。

---

## 5. MutationObserver 構成

オブザーバーは **2 つ** に分離されており、それぞれ異なるルートを監視します：

1. **`playlistObserver`**: Thumbnails / Header ターゲット用
   - Root: `thumbnailObserverRootSelector` (Thumbnails 有効時) or `contentObserverRootSelector` (Header のみ時)
   - `childList: true, subtree: true`
   - `hasPlaylistRelevantMutation()` でフィルタリングし、マッチした場合のみ `performDebouncedCleanup()` を呼ぶ

2. **`miniplayerObserver`**: Miniplayer ターゲット用
   - Root: `ytd-app`
   - `childList: true, subtree: true`
   - `hasMiniplayerRelevantMutation()` でフィルタリングし、マッチした場合のみ `performDebouncedCleanup()` を呼ぶ

### デバウンス

- `performDebouncedCleanup` は **300ms** のデバウンスで一括クリーンアップを実行
- 汎用 `debounce(fn, ms)` ユーティリティを使用

### リトライ

- 各オブザーバーは Root 要素が見つからない場合、1000ms 後にリトライ（`playlistObserverRetryTimerId`, `miniplayerObserverRetryTimerId`）
- `stopObserver()` でリトライタイマーも含めてすべてクリーンアップ

---

## 6. テンプレートとフォールバック

- `@resource ytLiteTemplate` から HTML テンプレートを読み込み
- テンプレートが壊れている場合（`hasExpectedPanelControls()` で 4 つのチェックボックスの存在を検証）、`FALLBACK_PANEL_TEMPLATE` にフォールバック

---

## 7. `index.html` のメンテナンス要件

1. **バージョン情報の動的取得**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub から最新の `@version` を動的に取得して表示します。HTML 内にバージョン番号をハードコードしないでください。
   - `.user.js` の `@version` をインクリメントするだけで自動反映されます。

2. **ドキュメントの網羅性**:
   - 新しいスクリプトを追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
