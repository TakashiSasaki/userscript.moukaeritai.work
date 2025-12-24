# ユーザースクリプト「ChatGPT Profile Badge」

## 概要 (Overview)

ChatGPTのウェブページにおいて、ユーザー情報が表示される箇所に任意の文字列（数文字程度のテキストや絵文字）を「バッジ」として追加表示するユーザースクリプトです。

## 導入 (Installation)

1.  [Tampermonkey](https://www.tampermonkey.net/) などのユーザースクリプトマネージャーをブラウザにインストールします。
2.  このリポジトリのGitHub RAW URLにアクセスすると、スクリプトのインストールが開始されます。

## 設定 (Configuration)

表示するバッジの文字列は、Tampermonkeyが提供するストレージにキー `badge_text` として保存されます。

開発中に手動で値を設定・確認するには、ブラウザの開発者コンソールで以下の `GM_setValue` / `GM_getValue` 関数（要Tampermonkey）を実行します。

```javascript
// バッジのテキストを設定
GM_setValue('badge_text', '✨ On Vacation');

// 現在のテキストを取得
GM_getValue('badge_text').then(value => console.log(value));
```

## 開発 (Development)

### プロジェクト構造 (Project Structure)

```
.
├── chatgpt-profile-badge.md      # この仕様書 (This document)
├── chatgpt-profile-badge.user.js # ユーザースクリプト本体 (The userscript source)
└── samples/                      # テスト用のサンプルファイル (Sample files for testing)
    ├── profile.html
    ├── whole-dom.html
    ├── samples.md
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
-   **@author**: `TakashiSasaki`
-   **@homepage**: `x.com/TakashiSasaki`
-   **@grant**: `GM_setValue`, `GM_getValue` など、スクリプトが必要とする権限。
-   **@updateURL**: GitHubのRAW URL。
-   **@downloadURL**: GitHubのRAW URL。

#### バージョン管理 (Versioning)

-   バージョンは `major.minor.patch` 形式（セマンティックバージョニング）で管理します。
-   スクリプトに少しでも変更を加えた場合は、`patch` 番号を必ずインクリメントしてください。

#### 配布 (Distribution)

-   スクリプトの最新版はGitHubで公開します。
-   メタデータの `@updateURL`, `@downloadURL` には、Tampermonkeyが更新を検知できるよう、GitHub上の `user.js` ファイルへのRAW URLを記載します。
