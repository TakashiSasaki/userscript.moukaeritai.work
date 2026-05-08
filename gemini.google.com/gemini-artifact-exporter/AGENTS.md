`gemini.google.com/gemini-artifact-exporter` では、Google Gemini のサイドバーに表示される「Article」タイプのアーティファクトを、まとめて Google Docs にエクスポートするユーザースクリプトを開発しています。

詳細は [index.html](index.html) を参照してください。

## 動作分析 (v0.2.39) - 2026-03-03

### 概要
Gemini のサイドバーにある「記事 (Article)」タイプのアーティファクトを自動検出し、選択したものだけをGoogle ドキュメントへ一括エクスポートするスクリプト。

### 主な機能
1.  **UI追加**: 画面上にドラッグ可能な「Artifact Exporter」パネルを表示。
    *   **Scan Artifacts**: 会話・コンテキスト内のアーティファクトをスキャンし一覧としてパネル内に展開。チェックボックスを用いて選択可能。
    *   **Export Selected**: 選択したアーティファクトを一括でGoogle Docsへエクスポートする。
    *   **設定項目**: タイムアウト、パネル再開ウェイト、キャンバス初期化ウェイト、オートコンプリートウェイト、自動削除の有無を保存可能。
2.  **自動処理フロー**:
    *   指定されたアーティファクトタイトルから該当のチップ要素(`mat-icon[fonticon="article"]`)を探す。（見つからなければ「ファイル一覧」メニューを自ら再オープンして再取得）。
    *   チップをクリックしてキャンバス・オーバーレイを開く。
    *   「共有」アイコンをクリック。
    *   「Google ドキュメントにエクスポート」をクリック。
    *   処理完了（「Document created」というToastまたは新しいタブへのフォーカス移行）を待機。
    *   Gemini側のUIバグ（終了後もToastやバックドロップが残り操作不能になる現象）に対処するため、タイムアウト後は `.cdk-overlay-backdrop` などのスタックしたオーバーレイ要素を強行的に削除。
3.  **状態保存**: パネル位置や各種ウェイト設定を `GM_setValue` で保存し、次回起動時に復元。
4.  **UI表示制御**: サイドバーに `mat-icon[fonticon="article"]` (Article型アーティファクト) が存在しない場合、パネルは自動的に非表示となる（SPAでのページ遷移時などに有効）。
5.  **連携機能**: エクスポート完了後、`gemini-one-click-delete:request-delete` カスタムイベントを送信することで会話の自動削除をトリガー可能（設定でONの場合）。

### 実装上の詳細
*   **セレクタ依存**: `button[data-test-id="export-to-docs-button"]`, `mat-icon[fonticon="article"]` などのセレクタを使用。
*   **イベント監視と同期**: `visibilitychange` イベントを用いてGoogle Docsが新しいタブで開かれたことを検知。
*   **アグレッシブなクリーンアップ**: Geminiの処理が終わってもAngularのオーバーレイがDOMに残るバグが高頻度で発生するため、`stuckElements.forEach(el => el.parentNode.removeChild(el))` という強行手段で脱出し連続実行を維持。
*   **不要な機能の削除**: 前バージョンからのアップデートで「オンスクリーンログ」「Dry Runモード」「Cooldown機能（Timeoutへ置換）」はユーザーの要望により完全に抹消されているため、ログ確認の際はブラウザの開発者ツールのコンソールを使用する。

## 追記メモ (v0.2.43) - 2026-03-09

*   Gemini 側だけでは「Google Docs 側で本当にエクスポート完了したか」を高信頼に観測できない。`visibilitychange` やトーストは補助信号にはなるが、完了判定の主信号には向かない。
*   このため、完了検知ベースよりも「Export to Docs を押した後に、メニュー閉鎖・ボタン消失・トースト・タブ移動などの開始シグナルを確認し、その後は固定時間待機する」方式の方が、重複エクスポートを避けやすい。
*   UI設定は増やしすぎないこと。実運用で意味があるのは `Export Wait`, `Panel Reopen`, `Canvas Init`, `Auto-Delete Chat` 程度で、完了判定専用の待機項目はユーザーにとって調整根拠が薄い。

## 技術的知見 (v0.2.48 - v0.2.53) - 2026-03-10

### 1. Angular CDK オーバーレイの取り扱い注意点
*   `clearStuckOverlays` でスタックしたメニュー外装を消去する際、**絶対に `.cdk-overlay-container` や `.cdk-global-overlay-wrapper` をDOMから削除してはならない。**
*   Gemini (Angular) はこれらのコンテナ枠をシングルトンとして再利用するため、削除すると以降のすべてのアクションメニューやツールチップ、ダイアログが開かなくなり、ページリロードまでUIが完全に破壊される。
*   **対策**: `[id^="cdk-overlay-"]` や `.cdk-overlay-backdrop` など、コンテナの「中身」だけを削除する。コンテナ自体が透明な壁としてクリックを妨害している場合は `pointer-events: none` を設定して無力化するにとどめる。

### 2. Immersive (Canvas) View の状態管理
*   アーティファクトを開くと表示される Canvas ビューでは、ヘッダーのアクションメニューのセレクタが変化する (`button[data-test-id="conversation-actions-menu-icon-button"]`)。
*   **状態の復元**: エクスポート後に毎回「ファイル一覧(Files)」サイドバーをメニューから開き直すよりも、Canvas 自体の「閉じる」ボタン (`button[data-test-id="close-button"]`) を押して標準の会話ビューに戻る方がはるかに安全で確実。
*   Canvas を閉じると、Canvas を開く前に開いていたサイドバーの状態がネイティブUIとして自動的に復元されるため、次のアーティファクト処理へスムーズに移行できる。

### 3. バックグラウンドタブでのスロットリング対策
*   Google Docs が新しいタブで開かれると、Gemini のタブはバックグラウンドに回り、ブラウザによって大幅なイベントスロットリング（数秒〜十数秒単位の遅延）を受ける。
*   単純な `el.click()` ではイベントがキューに滞留して無視されることがあるため、フォーカスを当てた上で `mousedown` -> `mouseup` -> `click` を連続で dispatch する `window.geminiClickElement` (共通関数) が必須。また、UI遷移時のウェイト (`sleep`) はフォアグラウンド時の想定よりも長めに確保する必要がある。

### 4. `MouseEvent` の `view` プロパティ禁止 (v0.2.51)
*   バックグラウンドタブ内で `new MouseEvent('click', { view: window })` を呼ぶと、Chromium が `window` オブジェクトのコンテキストが切り離された状態になっている場合に `Failed to read the 'view' property from 'UIEventInit'` 例外が発生する。
*   **対策**: `window.geminiClickElement` 内の `MouseEvent` コンストラクタから `view: window` を完全に削除。`bubbles: true, cancelable: true` のみで十分にイベントは伝播する。

### 5. `sleep` 関数のタイマースロットリング対策 (v0.2.53)
*   Chromium 系ブラウザ (Edge を含む) は、バックグラウンドタブの `setTimeout` コールバックを最大1分間隔まで遅延させるか、完全にサスペンド（停止）する仕様がある。
*   `await sleep(1000)` のような単純な `setTimeout` ベースの待機は、タブがバックグラウンドに回った瞬間に永遠に解決されなくなる可能性がある。
*   **対策**: `sleep` 関数を `setInterval` + `Date.now()` ポーリング方式に変更した。`setInterval` もバックグラウンドでは最小 1 秒間隔に制限されるが、タイムスタンプの比較は正確に機能するため、次の利用可能なティックで確実に Promise が解決される。

### 6. 明示的なUI状態リセット (v0.2.51)
*   連続エクスポート時の信頼性を最大化するため、各アーティファクトのエクスポート完了後に以下の順序でUI状態を完全にリセットする：
    1.  Canvas の「閉じる」ボタンをクリック
    2.  アニメーション完了を待機
    3.  「Files in this chat」ボタンをクリックしてサイドバーも閉じる
    4.  残留オーバーレイをスイープ
*   これにより、次のアーティファクト処理は常に「何も開いていない初期状態」から開始され、状態不整合のリスクが排除される。

## 関連コンポーネント

### Gemini Exported Docs Auto-Closer (companion script)
*   **場所**: `docs.google.com/gemini-exported-docs-auto-closer/`
*   **役割**: Microsoft Edge の「スリーピングタブ」機能が非常に強力で、上記のポーリング方式 `sleep` すら完全に凍結してしまう問題への対策。
*   **動作**: `https://docs.google.com/document/d/*` で動作し、`document.referrer` に `gemini.google.com` が含まれている場合のみ、5秒間のカウントダウン後に `window.close()` を実行する。
*   **効果**: Docs タブが自動的に閉じることでブラウザのフォーカスが Gemini タブに強制的に戻り、Edge のスリープ状態が解除されてスクリプトが再開する。

## 技術的知見 (v0.2.54 - v0.2.56) - 2026-03-11

### 1. 仮想スクロール (Virtual Scrolling) への対応 (v0.2.54)
*   Gemini の「このチャット内のファイル (Files in this chat)」サイドバーは仮想スクロール（Lazy Loading）を採用しており、画面外にあるアーティファクトはDOMから削除される。
*   **Scan Artifacts の改善**: `scrollContainer.scrollBy` を用いてサイドバーを動的に最下部までスクロールさせながらタイトルを収集するループを実装。
*   **findChipByTitle の改善**: 個別のエクスポート開始時にも、対象のチップがDOMに見つかればクリック、見つからなければサイドバーをスクロールして出現を待機する非同期処理へと移行。

### 2. Dual-Source Artifact Scanning (v0.3.00+)
*   Scans both the "Files in this chat" sidebar (with virtual scrolling) and the `infinite-scroller` chat history.
*   This ensures 100% coverage even when the sidebar lazy-loading fails or omits files.
*   Results are merged by title.
*   `findChipByTitle` sequentially seeks the sidebar then the chat cards. Clicking either triggers the Canvas UI.

### 3. UIパネル内のリスト表示の改善 (v0.2.55)
*   **UI List Vertical Scrolling Fix**: Applied `flex-shrink: 0` to labels in the list container to prevent vertical compression when many artifacts are found.

### 4. インストール検知の簡素化 (v0.2.56)
*   `installCheckSuffixes` による動的なサフィックス判定（`.app.github.dev` など）を廃止。
*   現在は `installCheckHosts` (`userscript.moukaeritai.work`, `127.0.0.1`) への完全一致のみで判定を行う。

# その他
- コードに少しでも変更を加えた時には必ずバージョンのパッチレベルをバンプアップする。
- ESLint を常に実行し、構文エラーがないことを確認してからコミットする。

### 5. Deep Scanにおける仮想スクロール制御の落とし穴 (v0.3.01 - v0.3.06)
Geminiのメイン会話コンテナ (infinite-scroller) に対してプログラムからスクロール操作を行い、過去の履歴を強制ロードさせる「Deep Scan」機能の実装において、以下の重要な知見が得られた。

*   **真のスクロールコンテナ**: スクロールイベントを受け付け、かつ scrollHeight が会話全体を反映するのは document.querySelector('infinite-scroller') である。
*   **スムーズスクロール（ehavior: 'smooth'）とウェイティングの競合**:
    *   scroller.scrollBy({ top: -800, behavior: 'smooth' }) のような滑らかなスクロールをループ処理で連続発行する場合、アニメーションの完了前に次のスクロール命令が発行されると、ブラウザ（Chromium等）は**アニメーションを相殺・キャンセルし、スクロール位置が完全にフリーズする現象**が発生する。
    *   **対策**: ehavior: 'instant' または直接のプロパティ代入 (scroller.scrollTop -= 800) を用い、瞬間的な移動を行った上で sleep() で待機する「ステップスクロール」方式を採用する。これにより IntersectionObserver は確実にトリガーされつつ、アニメーションの競合を防げる。
*   **Angularコンテナのアクティブ化**:
    *   単にスクロール位置を変更しただけでは、Gemini側（Angular）の Lazy Loader が反応しない場合がある。
    *   **対策**: スクロール開始前に要素に一時的な 	abindex="-1" を付与し、scroller.focus({ preventScroll: true }) を呼び出してコンテナを「アクティブ（フォーカス中）」状態に欺くことで、スクロールイベントリスナーを強制的に起床させる必要がある。

### 6. Canvas表示による履歴ロードの阻害 (v0.3.08)
Geminiの仕様として、右側にCanvas（アーティファクト詳細）が開いている状態では、メイン会話ウィンドウのスクロールによる「過去の履歴のプログレッシブ・ロード」が正常に行われない場合がある。

*   **症状**: Canvasが開いたままだと、上部にスクロールしても新しいメッセージがネットワークからフェッチされない。
*   **対策**: deepScanArtifacts を開始する際、必ず utton[data-test-id="close-button"] を明示的にクリックしてCanvasを閉じ、チャット画面を全幅状態にしてからスクロールを開始する必要がある。

### 7. 二重スクローラー問題の再来 (v0.3.07)
Geminiのアップデートにより、DOM内に <infinite-scroller> 要素が2つ（サイドバー履歴用とメインチャット用）存在するようになった。

*   **誤検知**: 単純な document.querySelector('infinite-scroller') はサイドバー側を掴んでしまい、メイン画面がスクロールされない。
*   **対策**: infinite-scroller.chat-history クラスを持つものを優先し、かつ clientWidth > 300 以上のもの（サイドバーは通常 ~70px）をターゲットにするヒューリスティックを導入した。

### 8. スキャン機能の責任分離 (v0.3.09)
初期実装では「Scan Artifacts」がサイドバー展開と簡易チャットスクロールを兼務していたが、UIの役割を明確化するために分離した。

*   **Scan Sidebar Menu**: 右サイドバーの「このチャット内のファイル」を展開して表示可能なアーティファクトのみを取得する（最速・安全）。
*   **Scan Chat History**: メイン会話履歴のみを最上部までプログレッシブスクロールして隠れたアーティファクトをすべて回収する。

### 9. 依存スクリプトの状態監視インジケーター (v0.4.7)
本ユーザースクリプトは単体では動作せず、以下の3つのスクリプトに処理を強く依存している。
1. **gemini-common.js** (`window.geminiLoadFullChatHistory()` - integrated into common library, no separate install needed)
2. **Gemini Artifact Exporter Worker** (`gemini-artifact-exporter-worker:request` / `cancel`)
3. **Gemini One-Click Delete Conversation** (`gemini-one-click-delete:request-delete`)

*   **状態の可視化と運用ルールの変更**: 確実な動作とユーザーのトラブルシューティングを助けるため、フローティングUIパネル（`template.html` 内の `.gae-deps-row`）の下部に、これら3つのスクリプトのインストール状態とバージョンが常時視認できるインジケーターを設置した。
*   **通信方式**: ポーリング（`setInterval`）の利用を避けるという共通ガイドラインに従い、UIパネルの生成タイミングで一度だけ `checkTargetUserscript` を通じてPingを送信し、イベントリスナーにより非同期に表示を更新する。
### 10. `index.html` における動的バージョン検知とポーリング制御 (v0.4.8)
本ユーザースクリプトのドキュメントページ (`index.html`) において、正しいバージョン表示とシームレスなUXを提供するため、以下の仕組みを導入した。

*   **DOM構造の保護**: インストールボタンのテキストを JavaScript から動的に更新する際、単純な `textContent` への代入は内部のアプリアイコンやバージョンバッジ（`.version-info`）のDOMを破壊してしまう。これを防ぐため、テキスト変更用の専用要素（`.button-text`）を設け、構造を維持した。
*   **インストール完了の動的検知 (ポーリング)**:
    *   ユーザーがインストールボタンをクリックすると、ユーザースクリプトの Raw URL が新しいタブで開かれる。
    *   ユーザーがインストールを完了して元の `index.html` のタブに戻ってきた際、手動でページをリロードすることなく状態を反映させるため、ボタンの `click` イベントをトリガーとして**2秒間隔で計5回（10秒間）の `userscript-ping` を自動送信するポーリング処理**を実装した。
    *   これにより、別タブでのインストール完了後、非同期に Ping 応答を受け取り、即座にボタン表示を「Installed」へ更新できる。

### 11. Canvas (Artifact) 内の「Google ドキュメントにエクスポート」ボタンの特定 (2026-04-16)

Canvas（アーティファクト詳細）画面上部のアクションメニュー内に存在するエクスポートボタンのセレクタ特定方法について。

*   **共有・エクスポートメニューの起点**:
    *   Canvas ヘッダー右側（「作成」ボタンの左隣）にある共有アイコン。
    *   **セレクター**: `button.share-button` または `button[aria-label="Canvas を共有・エクスポート"]`
*   **「Google ドキュメントにエクスポート」ボタン**:
    *   メニュー展開後に表示される `button[role="menuitem"]` 要素。
    *   **特定方法 (推奨)**:
        *   ボタン内のテキスト `Google ドキュメントにエクスポート` を含む `span` を探す。
        *   または、ボタン内の `mat-icon` が持つ属性 `data-mat-icon-name="google_docs_color"` をキーにするのが最も安定している。
*   **HTML構造例**:
    ```html
    <button role="menuitem" class="mat-mdc-menu-item ...">
      <div class="mat-mdc-menu-item-text">
        <mat-icon data-mat-icon-name="google_docs_color" ...></mat-icon>
        <span>Google ドキュメントにエクスポート</span>
      </div>
    </button>
    ```

## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期と状態検知**:
   - バージョン番号はハードコードしないでください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。テキストの更新は `.button-text` などの専用要素を用いて行い、DOMを破壊しないように注意してください。
   - 新規タブでインストールした後にUIを自動更新するため、ボタンクリック時に `userscript-ping` を一定間隔で送信（ポーリング）する仕組みが `domain-landing.js` に組み込まれています。これにより利用者はリロード不要で「Installed」への変化を確認できます。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。

4. **インストールボタンの `href` は必ず GitHub Raw URL を使用すること（重要）**:
   - `index.html` 内の `.install-button` の `href` 属性には、**必ず**以下の形式の GitHub Raw URL を設定してください:
     ```
     https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/SCRIPT_NAME/SCRIPT_NAME.user.js
     ```
   - **ローカル相対パスを使用してはいけません**（例: `gemini-artifact-exporter/gemini-artifact-exporter.user.js`）。`domain-landing.js` の `fetchVersion()` はこの `href` を使って GitHub から `@version` を取得するため、ローカルパスでは CORS エラーが発生しバージョン取得に失敗します。
   - **ハードコードされたバージョン文字列をボタンテキストに含めてはいけません**（例: `Install (v0.4.57)`）。バージョン表示は `domain-landing.js` が GitHub から動的に取得して注入するため、ハードコードすると古いバージョンが表示され続けます。
   - **正しい構造例**:
     ```html
     <a class="install-button"
        data-script-name="Gemini Example Script"
        href="https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-example/gemini-example.user.js"
        target="_blank">
       <span>Install</span>
     </a>
     ```
