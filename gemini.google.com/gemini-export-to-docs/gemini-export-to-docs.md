# 目的

Geminiのウェブアプリケーション（SPA）において、会話の特定のターンまたはキャンバスをGoogle Docsにエクスポートする操作を簡略化する。
標準機能では複数回のクリック（メニュー展開など）が必要だが、これを「1クリック」で実行できるショートカットボタンを追加する。
本ユーザースクリプトはTampermonkeyでの利用を想定し、ファイル名は `gemini-export-to-docs.user.js` とする。

# 経緯
以前作成したスクリプト（`ワンクリック高速エクスポート...`）の課題（DOM要素検出の不安定さ、イベントトリガーの信頼性）を解消するため、ゼロベースで再設計・実装を行う。

# SPAのDOMとセレクタ戦略
Geminiは動的なSPAであり、DOM構造やクラス名は頻繁に変更される可能性がある。
そのため、以下の優先順位で要素を特定する。

1.  **data-test-id属性**: Googleがテスト用に付与している不変性の高い属性（例: `data-test-id="more-menu-button"`）。これを最優先で使用する。
2.  **アイコンフォント名**: ボタンの機能を特定するために `mat-icon` の名前（`docs`, `more_vert` など）を補助的に使用する。
3.  **DOM階層構造**: 親要素（`response-container`）からの相対位置。

また、レスポンシブデザインにより、ウィンドウ幅に応じて以下の違いがあることに留意する：
*   **デスクトップ**: 「エクスポート」ボタンはメニュー内の第1階層に直接表示されることが多い。
*   **モバイル/狭い画面**: 「Export to Docs」は「Export to...」という親メニューの中に隠れている場合がある（サブメニュー構造）。

# 技術的制約と要件

## 1. Trusted Types (セキュリティ)
Geminiのサイトではセキュリティポリシーにより `innerHTML` への文字列代入が禁止されている（TrustedHTML違反エラーが発生する）。
*   **対応**:
    *   `innerHTML` は使用しない。
    *   SVGアイコンなどの要素生成には `document.createElementNS` を、その他の要素には `document.createElement` を使用し、DOM操作として構築する。
    *   **重要**: `DOMParser().parseFromString` も `TrustedHTML` ポリシー違反となるため使用しない。

## 2. Content Security Policy (CSP)
Geminiは厳格なCSPを適用している。
*   **対応**: 外部フォント（`Google Sans` など）を明示的に指定するとブロックされる場合があるため、`font-family` は指定せず、親要素のスタイルを継承（`inherit`）させる。

## 3. 動的コンテンツの読み込み (Wait処理)
メニューやダイアログはユーザー操作（クリック）後に非同期でDOMに追加される。
*   **対応**: 単純な `querySelector` ではなく、要素が出現するまで待機する `waitForElement` のような非同期関数を実装し、タイムアウト処理を含める必要がある。

## 4. 重なり順序 (z-index)
モバイル表示などでは、透明なオーバーレイ要素がボタンの上に重なり、クリックを妨害する場合がある。
*   **対応**: 注入するボタンには `z-index` を高く設定し、`pointer-events: auto` を指定してクリックイベントを確実に受け取れるようにする。

## 5. UI操作の信頼性（Reliability）
メニューの展開アニメーションやDOM構造の微細な変化により、要素が見つからない場合がある。
*   **対応**:
    *   **テキストマッチング**: `data-test-id` が欠落している場合（一部のモバイル表示など）に備え、ボタンのテキスト（"Export to Docs"）による検索をフォールバックとして実装する。
    *   **グローバル探索**: メニューパネルがDOMツリーの予期せぬ場所に挿入される場合があるため、特定のコンテナ内だけでなくドキュメント全体からボタンを探索する。
    *   **リトライ処理**: ボタンが見つかるまで、一定時間（例：2秒間）繰り返し探索を行う待機ロジックを導入する。

## 6. ユーザーフィードバック
エクスポート処理はバックグラウンドでのDOM操作（メニュー開閉など）を伴うため、数秒の時間を要する。
*   **ローディング表示**: 処理中は画面中央にスピナーを含むオーバーレイを表示し、操作中であることを明示する。
*   **完了通知**: 処理が成功すると、ボタンの色を緑色（`#1e8e3e`）に変更し、アイコンをチェックマークに切り替えて完了を通知する。

# UI仕様

## ボタンの配置
*   **ターン応答**: 各ターンの応答文ヘッダー付近（「︙」メニューボタンの横など）に配置する。さらにデスクトップ表示においては、各ターンのモデルからの応答文コンテナの右上の両方に配置する。
    *   **同期**: 同一ターンに対して複数のボタン（上部・下部など）が存在する場合、片方がクリックされると、他方のボタンも「エクスポート済み」状態（緑色・チェックマーク）に同期して変化する。
*   **キャンバス**: キャンバスを開くためのチップ（「Open」ボタンなど）が表示されている場合、その横に配置する。
*   **デザイン**: GeminiのUIに馴染むよう、角丸やホバーエフェクトを持たせたシンプルなアイコンボタンとする。

## 処理フロー (自動化ロジック)

### ターンエクスポート
1.  **トリガー**: スクリプトが「︙」ボタン（`more-menu-button`）をクリック。
2.  **メニュー待機**: メニューパネル（`.mat-mdc-menu-panel` または `actions-bottom-sheet`）が表示されるのを待つ。
3.  **ボタン探索 & クリック**:
    *   **パターンA (PC)**: メニュー内に「Export to Docs」ボタンがあれば即クリック。
    *   **パターンB (Mobile)**: 「Export to...」ボタンがある場合、それをクリック → 第2メニュー待機 → その中の「Export to Docs」をクリック。

### キャンバスエクスポート
1.  **キャンバスオープン**: キャンバスが閉じていれば「Open」ボタンをクリックして開く。
2.  **共有メニュー**: キャンバス内の「共有（Share）」ボタンをクリック。
3.  **メニュー待機**: 共有メニューが表示されるのを待つ。
4.  **ボタン探索 & クリック**: 「Export to Docs」をクリック。

# リポジトリ

*   **GitHub**: [https://github.com/TakashiSasaki/userscript.moukaeritai.work/tree/userscript/gemini.google.com/gemini-export-to-docs](https://github.com/TakashiSasaki/userscript.moukaeritai.work/tree/userscript/gemini.google.com/gemini-export-to-docs)
*   **Raw Script**: [https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js](https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js)
