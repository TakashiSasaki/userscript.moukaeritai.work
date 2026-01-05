# Agent Instructions (onamae-block-evil)

このファイルは、AIエージェントが `onamae-block-evil.user.js` を実装・保守する際の指針となるドキュメントです。
仕様の概要や目的については `onamae-block-evil.md` を参照してください。

## ターゲット (ブロック対象) 詳細

### DNS設定変更トラップ (Evil 1)
- **安定したセレクタ**: `.box-DomainBanner button.is-Primary`
- **判定キー**: 親要素 `.box-DomainBanner-Hdn` が「意図しないDNS設定変更を防ぐために」を含む。

### チャットサポート・ウィジェット (ChatPlus)
- **安定したセレクタ**: `chat`, `#chatplusview`, `#jp.chatplus.app_chat_frame`
- **ブロック方法**: `display: none !important` による静的ブロック。

## 基本設計

### 動作環境
- **対象ドメイン**: `https://navi.onamae.com/domain/setting/dns/control/input`
- **実行タイミング**: `document-start` でのスタイル注入 + `document-idle` 以降の DOM 監視。

### 実装戦略
1. **静的CSSによる非表示 (CSS Injection)**
   - 識別が明確なIDやクラス名に対しては、`display: none !important;` を注入する。
   - `body.is-ModalOpen` によるスクロール制限を強制解除するスタイルを適用する。

2. **DOM監視 (MutationObserver)**
   - Angular 等の SPA 構造により動的に生成・表示されるモーダルを検知する。
   - 要素内のテキストコンテンツを判定し、条件に合致する場合は非表示化（`display: none`）または `click()` による自動クローズを試行する。

3. **ボディロックの解除**
   - モーダルが非表示になっても `body` の `overflow: hidden` が残る場合があるため、定期的にチェックし解除する。

## 運用・管理ルール

### バージョニング
- `major.minor.patch` 形式を使用する。
- スクリプトに何らかの改変（微修正含む）を行った場合は、必ず **patch** バージョンをインクリメントする。
