# YouTube Playlist Saver 動作分析レポート (2025-12-30)

## 現状の課題
スクロールやフィルタリングによって動的にロードされた、あるいは再描画された動画要素に対して `[NEW]` や `[SAVED]` のラベルが表示されないことがある。

## 処理のトリガーとタイミングの分析

現行のスクリプト (`youtube.com/youtube-playlist-saver.user.js`) において、動画のメタデータ取得およびラベル描画 (`processAllVisible`) を実行するトリガーは以下の3点に限定されています。

1. **SPAナビゲーション完了時 (`yt-navigate-finish`)**
   - ページ遷移が完了した直後に一度だけ実行されます。

2. **MutationObserver によるDOM変更検知**
   - プレイリストのリストコンテナ (`ytd-playlist-video-list-renderer #contents`) を監視しています。
   - **制約**: パフォーマンス向上のため `subtree: false` が設定されており、コンテナの直下 (`childList`) の増減のみを検知します。
   - 検知時、`throttle` (1000ms) を介して `processAllVisible` を実行します。

3. **定期的な生存確認 (500ms間隔)**
   - `statusInterval` 内で、監視対象の `listContainer` がDOMから消滅していないか、あるいは別の要素に置き換わっていないかを確認します。
   - 変化があった場合、`initObserver` を再実行し、`processAllVisible` を呼び出します。

## 原因の考察

### 1. MutationObserver の検知漏れ
YouTubeのUI（特に継続的なスクロール読み込み）では、要素が `childList` に直接追加されるのではなく、既存の `ytd-continuation-item-renderer` が変化したり、別のラッパー要素を介して挿入されたりする場合があります。`subtree: false` ではこれらを検知できず、トリガーが引かれない可能性があります。

### 2. スクロール時の再スキャン欠如
現在、スクロールイベントは `updateAboveInfo` (削除対象のインデックス表示更新) のためにのみ使用されています。
動画が新しくビューポートに入ってきた際や、フィルタリングによって空いたスペースを埋めるように要素が移動・描画された際に、明示的な再スキャン (`processAllVisible`) が行われません。

### 3. スロットリングの影響
`throttle` によって1秒以内の連続した更新が無視されるため、高速なスクロールや大量の要素追加のタイミングで、最後の方の要素の描画処理がスキップされたまま定常状態（変更なし）に移行してしまった可能性があります。

## 改善案

1. **スクロールイベントへの再スキャン追加**
   - `scrollHandler` 内で `processAllVisible` を呼び出すように修正します。これにより、DOM変更検知から漏れた要素もスクロールすることで順次処理されます。

2. **Observer 設定の再考**
   - パフォーマンスとのトレードオフになりますが、`subtree: true` に戻すか、あるいはより上位のコンテナを監視対象に含めることを検討します。

3. **フィルタリング完了後の確実な再スキャン**
   - `applyFilters` (フィルタリング適用) の直後に、遅延を置いて `processAllVisible` を再度実行し、描画漏れを防ぎます。

## 実施した対策 (2025-12-30)

### 1. デバウンス処理の導入
スクロールイベントの発生頻度を抑えつつ、最終的な状態を確実にキャッチするために `debounce` ユーティリティを導入しました。

### 2. スクロールハンドラへの統合
`scrollHandler` (200ms間隔の `throttle` 版) 内で、1000msの遅延を持つ `debouncedScan` を呼び出すように変更しました。

```javascript
// スクロール停止から1秒後に再スキャンを実行
const debouncedScan = debounce(() => {
    processAllVisible(playlistId, currentSessionSet);
}, 1000);

// スクロールハンドラ (200ms間隔で情報更新)
scrollHandler = throttle(() => {
    updateAboveInfo();
    debouncedScan(); // スキャンを予約
}, 200);
```

### 3. 解決の仕組み
- **スクロール中**: `throttle` により200ms間隔で「Above情報」のみが更新され、`debouncedScan` のタイマーが常にリセットされます（再スキャンは走りません）。
- **スクロール停止後**: 最後のスクロールから1秒が経過すると、`debouncedScan` によって `processAllVisible` が実行され、新しく読み込まれた動画要素が処理されます。
- **効果**: `MutationObserver` が検知しきれなかった要素も、スクロールして停止するだけで自動的にラベルが付与されるようになりました。

