# ChatGPT No Margin Userscript Design Document

## 概要
このユーザースクリプト (`chatgpt-no-margin.user.js`) は、ChatGPTの会話画面におけるメッセージの左右の余白を削除し、画面幅を最大限に活用するためのツールです。これにより、コードブロックや長い文章の視認性を向上させることを目的としています。

## 主な機能
1.  **メッセージコンテナの最大化**: 会話メッセージが表示されるコンテナの `max-width` 制限を解除し、`100%` に設定します。
2.  **余白の削除**: `margin-left` および `margin-right` を `0` に設定し、中央揃えによる余白を排除します。
3.  **動的なDOM監視**: `MutationObserver` を使用して、チャットの進行に伴い新たに追加されるメッセージに対しても即座にスタイルを適用します。
4.  **ポータルサイト連携**: ユーザースクリプトのインストール状況を管理サイト (`userscript.moukaeritai.work` 等) に通知する機能を備えています。

## 技術的詳細

### ターゲットDOM構造
ChatGPTのDOM構造は頻繁に変更されるため、以下の主要なクラスパターンをターゲットとしています。

1.  **内部メッセージコンテナ (`div.flex.mx-auto`)**:
    *   従来のレイアウトおよび一部の新しいレイアウトで使用される、メッセージコンテンツを直接包むフレックスコンテナ。
    *   `mx-auto` クラスにより中央揃えされている要素をターゲットにします。

2.  **外部メッセージラッパー (`div.text-base.mx-auto`)**:
    *   最近のChatGPTのDOM構造で見られる、メッセージ全体を囲むラッパー。
    *   `text-base`, `my-auto`, `mx-auto` 等のクラスを持つ要素をターゲットにします。

3.  **CSS変数 (`--thread-content-max-width`)**:
    *   Tailwind CSSのArbitrary Values機能などで使用されるカスタムプロパティを検出した場合、これを `100%` に上書きします。

### スタイル変更ロジック
対象となる要素 (`widen` 関数で処理) に対して、以下のインラインスタイルを強制的に適用します。

```javascript
element.style.marginLeft = "0px";
element.style.marginRight = "0px";
element.style.maxWidth = "100%";
```

### 監視戦略 (MutationObserver)
*   **監視対象**: `main div[role='presentation']` (チャットエリアのメインコンテナ) またはフォールバックとして `document.body`。
*   **監視オプション**: `{ childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] }`
    *   `childList`: 新しいメッセージの追加を検知。
    *   `attributes`: クラスやスタイルの変更によるレイアウトのリセットを検知（特にレスポンシブな変更時）。
*   **遅延初期化**: ページロード完了後のDOM構築を待つため、`setTimeout` により1.5秒の遅延を入れてから監視を開始します。

### Portal API Guard
特定の管理ドメイン (`userscript.moukaeritai.work` など) で実行された場合、スクリプトのメインロジックを実行せず、インストール済みであることを通知するイベント (`userscript-check-installed`, `userscript-pong`) のみを処理します。

## バージョン履歴
*   **1.1.0**:
    *   複数のDOMパターン (`div.text-base.mx-auto`) への対応を追加。
    *   CSS変数 (`--thread-content-max-width`) のオーバーライド処理を追加。
    *   コードベースの統合とリファクタリング。
*   **1.0.0**:
    *   初期リリース。基本的な `div.flex.mx-auto` への対応。
