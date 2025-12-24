# ユーザースクリプト「ChatGPT Profile Badge」

## 概要 (Overview)

ChatGPTのウェブページにおいて、ユーザー情報が表示される箇所に任意の文字列（数文字程度のテキストや絵文字）を「バッジ」として追加表示するユーザースクリプトです。

## 導入 (Installation)

1.  [Tampermonkey](https://www.tampermonkey.net/) などのユーザースクリプトマネージャーをブラウザにインストールします。
2.  このリポジリのGitHub RAW URLにアクセスすると、スクリプトのインストールが開始されます。

## 設定 (Configuration)

表示するバッジの文字列は、Tampermonkeyが提供するストレージに保存されます。

-   **ストレージキー**: `badge_text`
-   **値**: 表示したい任意の文字列（例: `✨ On Vacation`）

開発中に手動で値を設定・確認するには、ブラウザの開発者コンソールで以下の `GM_setValue` / `GM_getValue` 関数を実行します。

```javascript
// バッジのテキストを設定
GM_setValue('badge_text', '✨ On Vacation');

// 現在のテキストを取得
GM_getValue('badge_text').then(value => console.log(value));
```

---

## 技術仕様 (Technical Specifications)

本スクリプトの実装に関する技術的な意思決定です。

### パフォーマンス設計 (Performance Design)

バッジはページの初期表示に必須ではないため、ページの読み込みパフォーマンスに影響を与えないよう、`MutationObserver` を用いて非同期で描画処理を行います。これにより、目的のUI要素がDOMに出現した後に、遅延してバッジの描画が開始されます。

### DOMセレクタ戦略 (DOM Selector Strategy)

ChatGPTのUIはクラス名が動的に変更される可能性があるため、比較的安定している `data-testid` 属性をセレクタの起点としています。

1.  `document.querySelector('[data-testid="accounts-profile-button"]')` で、まずプロファイル全体のボタン要素を取得します。
2.  その内部から、ユーザー名を含む要素（`.truncate`）の親要素を特定し、注入箇所（`nameContainer`）として定めます。

### 描画ロジック (Rendering Logic)

-   **重複描画の防止**: `MutationObserver` が複数回発火した場合でもバッジが重複して描画されるのを防ぐため、注入先のコンテナ要素に `data-badge-injected="true"` というカスタムデータ属性を付与します。描画処理の前にこの属性の有無を確認します。
-   **スタイリング**: バッジは `<span>` 要素として生成されます。既存のUIとの親和性を保つため、`profile.html` サンプルから特定した `text-token-text-secondary` などのクラスを適用しつつ、バッジとして見せるための追加スタイル（`padding`, `backgroundColor` など）をインラインで設定しています。

---

## 開発 (Development)

### プロジェクト構造 (Project Structure)

```
.
├── chatgpt-profile-badge.md      # この仕様書 (This document)
├── chatgpt-profile-badge.user.js # ユーザースクリプト本体 (The userscript source)
└── samples/                      # テスト用のサンプルファイル (Sample files for testing)
    ├── ...
    └── preprocess.py
```

### テスト (Testing)

UIの変更やデバッグは、`samples/` ディレクトリ内のHTMLファイルを用いて行います。これらのファイルは、開発効率向上のために前処理（不要な要素の削除など）が可能です。

前処理を行うには、`samples/` ディレクトリで以下のコマンドを実行します。
```shell
pip install beautifulsoup4
python preprocess.py <target_html_file>
```
詳細は `samples/samples.md` を参照してください。

### 貢献ガイドライン (Contribution Guidelines)

#### メタデータ規約 (Metadata Conventions)
-   **@namespace**: `userscript.moukaeritai.work`
-   **@author**: `Takashi Sasaki`
-   **@homepage**: `x.com/TakashiSasaki`
-   **@grant**: `GM_setValue`, `GM_getValue` など、スクリプトが必要とする権限。
-   **@updateURL** / **@downloadURL**: GitHubのRAW URL。

#### バージョン管理 (Versioning)
-   バージョンは `major.minor.patch` 形式（セマンティックバージョニング）で管理します。
-   スクリプトに少しでも変更を加えた場合は、`patch` 番号を必ずインクリメントしてください。

#### 配布 (Distribution)
-   スクリプトの最新版はGitHubで公開します。
-   メタデータには、Tampermonkeyが更新を検知できるよう、GitHub上の `user.js` ファイルへのRAW URLを記載します。
