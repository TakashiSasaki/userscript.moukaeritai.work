# Agent Guidelines: youtube-playlist-remover

This document provides technical details for AI agents developing or maintaining the **YouTube Playlist Remover** userscript. For general project rules, refer to the root [AGENTS.md](/AGENTS.md).

**スクリプト本体が設計の正本です。** このファイルに記載の情報が古くなった場合は、スクリプト本体を参照して更新してください。

---

## スクリプトの設計概要

YouTube プレイリストページで、スクロールして通り過ぎた（viewport より上の）動画や、YouTube Playlist Filter によって `[MATCHED]` バッジが付けられた動画を一括でプレイリストから削除する機能を提供します。

---

## 1. 候補 (Candidate) の判定

### IntersectionObserver (`ensureObserver()`)

- `ytd-playlist-video-renderer` を observe
- 判定条件: `rect.bottom < 180` (viewport より上) **または** `entry.isIntersecting` (現在表示中)
- 条件を満たすアイテムを `candidateStore` に追加
- フィルタで非表示のアイテム (`isItemHiddenByFilter()`) は即座に除外

### MutationObserver (`setupMutationObserver()`)

- Root: `ytd-playlist-video-list-renderer #contents` (fallback: `ytd-playlist-video-list-renderer`)
- `childList: true, subtree: true`
- 追加された `ytd-playlist-video-renderer` を自動的に IntersectionObserver に登録

### candidateStore

`createCandidateStore()` で生成されるクロージャベースのデータ構造：

| メソッド | 役割 |
|---|---|
| `add(item)` | 候補に追加、matched バッジ状態も記録 |
| `remove(item)` | 候補から除外 |
| `sync(item)` | matched バッジ状態を最新の DOM から再読み込み |
| `isMatched(item, { refresh })` | `[MATCHED]` バッジの有無を返す |
| `getCount({ matchedOnly })` | 全件数 or matched 件数を返す |

### YouTube Playlist Filter との連携

- Filter スクリプトが付与する `.yt-filter-matched` バッジを `hasMatchedBadge()` で検出
- `onlyRemoveMatched` チェックボックスが有効な場合、`[MATCHED]` バッジ付きのアイテムだけを削除対象に限定

---

## 2. 削除フロー (`removeRangeItems()`)

```
[Remove Items クリック]
  └→ enqueueCurrentCandidates() → removalQueue に候補を追加
  └→ isRemoving = true, ボタンラベルを "Add Items" に変更
  └→ ループ:
       ├→ attemptRemoveVideoWithScrollFallback(item)
       │    ├→ メニューボタン (#menu button) をクリック
       │    ├→ ポップアップ (ytd-menu-popup-renderer) を最大 10 秒待機
       │    ├→ "から削除" / "Remove from" テキスト or ゴミ箱アイコンを検出
       │    └→ クリックして削除
       ├→ waitForItemDisappearance() (waitForDisappearance 有効時)
       └→ 300ms クールダウン
```

**削除中に "Add Items" ボタンを押す** → 現在の候補を追加でキューに投入可能

### メニューアイテム検出

| 方法 | 詳細 |
|---|---|
| テキスト照合 | `"から削除"` (日本語) / `"Remove from"` (英語) |
| アイコン照合 | `TRASH_ICON_PATHS` (3 パターンの SVG path d 属性) |

---

## 3. デバウンス戦略

| 対象 | 方法 | 間隔 |
|---|---|---|
| Removable 数の表示更新 | `scheduleCandidatesInfoRefresh()` (`setTimeout`) | 2000ms |
| キャッシュクリーンアップ | `lightweightCleanup()` (`setInterval`) | 5000ms |

### なぜ requestAnimationFrame ではなく setTimeout か

IntersectionObserver はスクロール中に毎フレームコールバックを発火する。`requestAnimationFrame` のガードは同一フレーム内の重複のみ防止し、次フレームで再度実行される。`setTimeout(2000ms)` は最低 2000ms の間隔を保証し、2秒に1回に制限する。

---

## 4. DOM セレクタ

| 対象 | セレクタ |
|---|---|
| プレイリスト動画アイテム | `ytd-playlist-video-renderer` |
| プレイリストコンテナ | `ytd-playlist-video-list-renderer #contents` |
| メニューボタン | `#menu button[aria-label="操作メニュー"]`, `#menu button` |
| メニューポップアップ | `ytd-menu-popup-renderer` |
| メニューアイテム | `[role="menuitem"]` |
| MATCHED バッジ (Filter連携) | `.yt-filter-matched` |

---

## 5. UI オプション

| チェックボックス | ストレージキー | デフォルト | 効果 |
|---|---|---|---|
| Wait for disappearance | `yt_remover_wait_for_disappearance` | `true` | 削除後にアイテムが DOM から消えるまで待機 (最大 8 秒) |
| Only remove [MATCHED] items | `yt_remover_only_matched` | `false` | Filter の `[MATCHED]` バッジ付きのみ削除 |

---

## 6. 統計表示

削除処理中、リアルタイムで削除時間の統計を計算・表示：
- Min / Max / Avg / Median (ms)
- `#yt-remover-stats` 要素に表示

---

## 7. フィルタ入力の監視

YouTube ネイティブの検索・フィルタ入力 (`isPlaylistFilterInput()`) を `input`/`change` イベントで捕捉し、値が変わったら `candidateStore.clear()` で候補をリセット。これはユーザースクリプトの Filter とは別の、YouTube 標準の検索ボックスに対する対応。

---

## 8. `index.html` のメンテナンス要件

1. **バージョン情報の動的取得**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub から最新の `@version` を動的に取得して表示します。HTML 内にバージョン番号をハードコードしないでください。

2. **依存関係とイベントの明記**:
   - Remover は Filter スクリプトの `.yt-filter-matched` バッジを消費する側です。この依存関係を `index.html` に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプトを追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
