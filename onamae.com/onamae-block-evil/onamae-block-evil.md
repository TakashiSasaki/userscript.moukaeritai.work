# お名前.com 邪悪広告ブロッカー (onamae-block-evil)

お名前.com Navi (`navi.onamae.com`) において、ユーザーの操作を妨げる「邪悪な」広告や確認ポップアップを自動的に非表示にする Tampermonkey ユーザースクリプト。

## 1. 概要

- **名前**: お名前.com 邪悪広告ブロッカー
- **Namespace**: `userscript.moukaeritai.work`
- **現在のバージョン**: `0.1.3` (major.minor.patch 形式)
- **作者**: Takashi Sasaki ([x.com/TakashiSasaki](https://x.com/TakashiSasaki))

## 2. 目的

お名前.com Navi の操作中に表示される、以下のようなユーザー体験を著しく阻害する要素を排除し、快適な管理操作を実現する。

- **ダークパターン広告**: 設定変更時に割り込んで有料サービスへ誘導するポップアップ。
- **執拗な確認画面**: ログイン時や操作の節目で繰り返し表示される「会員情報確認」などのモーダル。
- **画面を占有するウィジェット**: 自動的に展開されたり、ボタンを覆い隠したりするチャットサポート等。

## 3. ターゲット（ブロック対象）

### 3.1. DNS設定変更トラップ (Evil 1)
- **安定したセレクタ**: `.box-DomainBanner.is-Type2`
- **判定キー**: `.box-DomainBanner-Hdn` のテキストが「意図しないDNS設定変更を防ぐために」を含む。

### 3.2. 会員情報確認ポップアップ (Evil 2)
- **安定したセレクタ**: `div.modal:has(.modal-Dialog-Header-Title)`
- **判定キー**: `.modal-Dialog-Header-Title` のテキストが「会員情報に変更や誤りはございませんか？」を含む。

### 3.3. チャットサポート・ウィジェット (ChatPlus)
- **安定したセレクタ**: `chat`, `#chatplusview`, `#jp.chatplus.app_chat_frame`
- **静的ブロック**: `display: none !important` で初期段階から排除可能。

## 4. 基本設計

### 4.1. 動作環境
- **対象ドメイン**: `https://navi.onamae.com/*`
- **実行タイミング**: `document-start` でのスタイル注入 + `document-idle` 以降の DOM 監視。

### 4.2. 実装戦略
1. **静的CSSによる非表示 (CSS Injection)**
   - 識別が明確なIDやクラス名に対しては、`display: none !important;` を注入する。
   - `body.is-ModalOpen` によるスクロール制限を強制解除するスタイルを適用する。

2. **DOM監視 (MutationObserver)**
   - Angular 等の SPA 構造により動的に生成・表示されるモーダルを検知する。
   - 要素内のテキストコンテンツを判定し、条件に合致する場合は非表示化（`display: none`）または `click()` による自動クローズを試行する。

3. **ボディロックの解除**
   - モーダルが非表示になっても `body` の `overflow: hidden` が残る場合があるため、定期的にチェックし解除する。

## 5. 期待される効果
- 誤操作による意図しない有料サービスへの契約防止。
- 画面遷移ごとのポップアップによるストレスの軽減。
- ページ本来のコンテンツ（ドメイン一覧や設定項目）へのアクセス速度向上。

## 6. 運用・管理ルール

### 6.1. バージョニング
- `major.minor.patch` 形式を使用する。
- スクリプトに何らかの改変（微修正含む）を行った場合は、必ず **patch** バージョンをインクリメントする。
