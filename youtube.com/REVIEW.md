# YouTube Playlist Userscripts レビューレポート

本ドキュメントは、`youtube.com` ディレクトリ以下の5つのユーザースクリプト（および共通ライブラリ）に関する、潜在的な問題点およびパフォーマンス上の問題点に焦点を当てたコードレビューのレポートです。他の開発者が今後のリファクタリングやパフォーマンス改善を検討するための資料として作成されました。

---

## 1. 全体的な問題点・共通の課題 (`youtube-common.js` 含む)

### 1.1 SPAルーティングでのDOMやイベントの破棄漏れリスク
- 各スクリプトは `yusInitApp` 経由で `yt-navigate-start` にフックして `stopMain()` を呼んでいます。しかし、一部のスクリプトでは `panel` 内のDOMイベントリスナー（ボタンの `click` や `input` の `change` など）が `stopMain()` で解除されていません。
- **影響**: パネルDOMはページ再読み込み時まで再利用されますが、スクリプトの再初期化のフローによっては予期せぬ状態不整合やメモリリーク（クロージャが残る）の要因となる可能性があります。
- **改善案**: 不要になるイベントリスナーは明示的に解除するか、あるいはパネルの表示非表示の切り替えに留め、状態を適切にリセットする設計を徹底してください。

### 1.2 `localStorage` の直接操作による同期ブロック
- `yusRestorePosition`, `yusSavePosition`, `yusMakeMinimizable` 等で `localStorage` を直接読み書きしています。
- **影響**: `localStorage` はメインスレッドで同期的に動作するため、頻繁なドラッグ操作の `mousemove` / `mouseup` ごとに保存処理が走ると、パフォーマンスの低下や微細なスタッター（カクつき）の原因になり得ます。
- **改善案**: ドラッグ終了時の `mouseup` に限定されていますが、もし頻度が高い場合は `requestIdleCallback` やデバウンスを挟むことを検討してください。

### 1.3 `yusParseHTML` の Trusted Types 対応とセキュリティ
- `DOMParser().parseFromString` を使用してHTMLを生成していますが、`youtube.com` は厳格な CSP を持つ場合があります。現在 Trusted Types を通すように実装されていますが、万が一 `template.html` に外部からの入力が混入する仕組みが追加された場合、XSSのリスクが生じます。
- **改善案**: 現在のテンプレートは静的ですが、動的に文字列をバインドする箇所がある場合はエスケープ処理を徹底するか、DOM APIを直接使って生成する方が安全です。

---

## 2. スクリプト個別のレビュー

### 2.1 YouTube Playlist Lite (`youtube-playlist-lite.user.js`)

#### パフォーマンス上の問題点
- **`MutationObserver` の対象が広すぎる**:
  - `ytd-playlist-video-list-renderer #contents` 全体を監視し、subtree の変化を検知していますが、追加されたノードがサムネイルなのかどうかの判定を `MutationObserver` 側で行わず、そのままデバウンス付きの `performDebouncedCleanup` に丸投げしています。
  - `performDebouncedCleanup` 内部では毎回 `document.querySelectorAll(pageConfig.thumbSelector)` を実行して全要素を検索しています。
- **影響**: スクロール等で少しでもDOMが変化するたびに広範囲な再検索と削除が走り、CPUスパイクや強制リフローを引き起こす可能性があります。
- **改善案**: `MutationObserver` のコールバック内で `mutations` の `addedNodes` をチェックし、追加されたノード自体（またはその直接の子孫）に対してのみ `querySelectorAll` や削除を行うように最適化すべきです。

### 2.2 YouTube Playlist Saver (`youtube-playlist-saver.user.js`)

#### 潜在的な問題点
- **非同期保存の競合制御**:
  - `requestSave()` 内で「JIT Merge」を行っていますが、`setTimeout` のクロージャ内で `GM_getValue` を取得し即座に `GM_setValue` を呼んでいます。
  - **影響**: マルチタブで動作している場合、`setTimeout` の2000msの間に他のタブがデータを更新すると、マージのタイミングによっては「Lost Update（更新の喪失）」が完全に防げているとは言い切れません（`GM_getValue` と `GM_setValue` の間には極わずかなタイムラグがあるため）。
- **メニュー操作による削除のエラー耐性**:
  - `attemptRemoveVideo()` 内でメニューボタンをクリックし、`ytd-menu-popup-renderer` をポーリングしていますが、YouTubeのUI変更によって構造が変わった場合、無限にループ（または最大5秒待機）してしまいます。
  - **改善案**: YouTubeのUI変更に強くなるよう、より堅牢なセレクタの利用や、タイムアウト時の確実なフォールバック処理を実装してください。

#### パフォーマンス上の問題点
- **`setInterval` による全体走査**:
  - `scanAndRender` が 5000ms 間隔で `setInterval` により実行され、毎回 `document.querySelectorAll('ytd-playlist-video-renderer')` で全要素を検索しています。
  - **影響**: 動画の数が増える（例えば1000件）と、5秒おきにDOM全体を舐めることになり、パフォーマンスに悪影響を与えます。
  - **改善案**: 定期実行によるポーリングではなく、`MutationObserver` を用いて新しく追加されたアイテムのみを処理する方式への変更を強く推奨します。

### 2.3 YouTube Playlist Filter (`youtube-playlist-filter.user.js`)

#### パフォーマンス上の問題点
- **大量DOM要素への `style.display` の頻繁な操作**:
  - `processChunk` 関数にて、要素の表示/非表示（`item.style.display = ''` または `'none'`）を頻繁に切り替えています。
  - **影響**: `style.display` の変更はリフロー（レイアウト再計算）をトリガーします。チャンク処理（`setTimeout`）で分割されているとはいえ、一度に多数の要素の display を変更すると描画がカクつく原因になります。
  - **改善案**: チャンクサイズを調整するか、表示切り替え専用の CSS クラス（例: `.yt-filter-hidden { display: none !important; }`）を用意し、可能であれば親要素での制御や、対象のDOMをドキュメントフラグメントで処理するなどの最適化を検討してください。
- **IntersectionObserver の閾値**:
  - `ensureRangeObserver` で `IntersectionObserver` を利用していますが、対象の要素が非表示（`display: none`）になった瞬間に `isIntersecting` が false になり、意図しない「範囲外（Above）」と判定される可能性があります（`rect.bottom < 180` のロジックと競合）。

### 2.4 YouTube Playlist Scroller (`youtube-playlist-scroller.user.js`)

#### 潜在的な問題点
- **自動スクロールの制御**:
  - `window.scrollTo(0, document.documentElement.scrollHeight);` を用いて一番下までスクロールしていますが、読み込みが追いついていない状態で何度も下端にスクロールすると、YouTubeのローディングロジックが破綻したり、一時的なフリーズを引き起こすことがあります。
- **ローディングインジケーターの監視**:
  - `MutationObserver` でスピナー（`TP-YT-PAPER-SPINNER`）を監視し、キャッシュ (`cachedSpinners`) に保持しています。しかし、要素がDOMから完全に削除される前にキャッシュから正しく消えないケース（親要素ごと消された場合など）があると、メモリリークや常に「Loading...」状態になるバグを引き起こす可能性があります。
  - **改善案**: 定期的に `cachedSpinners` の中身が `isConnected` かどうかをチェックしてクリーンアップする仕組みが必要です。

### 2.5 YouTube Playlist Remover (`youtube-playlist-remover.user.js`)

#### 潜在的な問題点
- **UI操作の自動化の脆弱性**:
  - `attemptRemoveVideo()` は、Saver スクリプトと同様にYouTubeのメニュー構造に完全に依存しています。フォーカス移動（`.focus()`）やクリックをスクリプトから強制的に行っているため、YouTube側のフォーカス制御と衝突し、予期せぬ動作を招く可能性があります。
  - **改善案**: UI自動化は常に壊れるリスクを伴うため、失敗時のエラーハンドリングを強化し、ユーザーに手動での介入を促すような設計も考慮してください。
- **配列の `reverse()` と非同期削除**:
  - 下から上へ削除するために `reverse()` をしていますが、`await attemptRemoveVideo()` で一つずつ非同期に削除している間に、ユーザーがスクロールしたりYouTube側がDOMを追加・削除したりすると、インデックスや参照がずれて別の動画を誤って削除してしまうリスクがあります。
  - **影響**: 予期せぬデータ損失。
  - **改善案**: 削除操作を行う直前に、その要素が依然として目的の動画であることを（動画IDなどで）再検証する仕組みが必要です。

#### パフォーマンス上の問題点
- **`IntersectionObserver` と頻繁なスクロールの相性**:
  - スクロール速度が速い場合や、`Scroller` スクリプトと併用された場合、`IntersectionObserver` のコールバックが大量に発火し、`itemsAboveAndValidSet` の追加・削除処理が過負荷になる可能性があります。
