# ユーザースクリプト「ChatGPT Profile Badge」

## 概要 (Overview)

ChatGPTのウェブページにおいて、ユーザー情報が表示される箇所に任意の文字列（数文字程度のテキストや絵文字）を「バッジ」として追加表示するユーザースクリプトです。

## 導入 (Installation)

1.  [Tampermonkey](https://www.tampermonkey.net/) などのユーザースクリプトマネージャーをブラウザにインストールします。
2.  このリポジリのGitHub RAW URLにアクセスすると、スクリプトのインストールが開始されます。

## 設定 (Configuration)

v0.2.0から、ユーザースクリプトのメニューコマンドを通じてバッジのテキストを簡単設定できるようになりました。

1.  ブラウザのツールバーにあるTampermonkeyのアイコンをクリックします。
2.  表示されるメニューから「**Set Badge Text**」を選択します。
3.  プロンプトが表示されたら、バッジとして表示したいテキストを入力し、「OK」をクリックします。
    -   テキストを空にすると、バッジは非表示になります。
    -   設定は即座に反映されます。

この設定はTampermonkeyが提供するストレージに保存されます。

---

## 技術仕様 (Technical Specifications)

本スクリプトの実装に関する技術的な意思決定です。

### パフォーマンス設計 (Performance Design)

バッジはページの初期表示に必須ではないため、ページの読み込みパフォーマンスに影響を与えないよう、`MutationObserver` を用いて非同期で描画処理を行います。これにより、目的のUI要素がDOMに出現した後に、遅延してバッジの描画が開始されます。

### DOMセレクタ戦略 (DOM Selector Strategy)

ChatGPTのUIはクラス名が動的に変更される可能性があるため、セレクタは安定性を重視して選択されています。

1.  `document.querySelector('[data-testid="accounts-profile-button"]')` で、まずプロファイル全体のボタン要素を取得します。これは比較的安定したセレクタです。
2.  次に、その内部でユーザー名やプラン情報を含むテキストコンテナを、まず `div.min-w-0` というセレクタで特定します。
3.  さらにその内部で、ユーザー名が直接含まれる `div.flex` を注入箇所（`nameContainer`）として特定します。

この構造的アプローチは、`.truncate` のような頻繁に変更されうるユーティリティクラスへの依存を避け、より堅牢な特定を目指すものです。

### 描画ロジック (Rendering Logic)

-   **重複描画の防止**: `MutationObserver` が複数回発火した場合でもバッジが重複して描画されるのを防ぐため、注入先のコンテナ要素に `data-badge-injected="true"` というカスタムデータ属性を付与します。描画処理の前にこの属性の有無を確認します。
-   **動的な更新**: メニューからバッジテキストが更新された際、`removeBadge()` 関数が既存のバッジと `data-badge-injected` 属性をDOMから削除します。その後、`findTargetAndInject()` が再実行され、新しいテキストでバッジが再描画（またはテキストが空の場合は非表示）されます。
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
-   **@grant**: `GM_setValue`, `GM_getValue`, `GM_registerMenuCommand` など、スクリプトが必要とする権限。
-   **@updateURL** / **@downloadURL**: GitHubのRAW URL。

#### バージョン管理 (Versioning)
-   バージョンは `major.minor.patch` 形式（セマンティックバージョニング）で管理します。
-   スクリプトに少しでも変更を加えた場合は、`patch` 番号を必ずインクリメントしてください。

#### 配布 (Distribution)
-   スクリプトの最新版はGitHubで公開します。
-   メタデータには、Tampermonkeyが更新を検知できるよう、GitHub上の `user.js` ファイルへのRAW URLを記載します。
