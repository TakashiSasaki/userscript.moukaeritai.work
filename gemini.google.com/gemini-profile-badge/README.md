# ユーザースクリプト「Gemini Profile Badge」

## 概要 (Overview)

Google Gemini のウェブページにおいて、ユーザープロフィール画像が表示される箇所に任意の文字列（数文字程度のテキストや絵文字）を「バッジ」として追加表示するユーザースクリプトです。

対象URL: `https://gemini.google.com/app`

## 導入 (Installation)

1.  [Tampermonkey](https://www.tampermonkey.net/) などのユーザースクリプトマネージャーをブラウザにインストールします。
2.  このリポジリのGitHub RAW URLにアクセスすると、スクリプトのインストールが開始されます。

## 設定 (Configuration)

ユーザースクリプトのメニューコマンドを通じてバッジのテキストを簡単設定できます。

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

バッジはページの初期表示に必須ではないため、ページの読み込みパフォーマンスに影響を与えないよう、`MutationObserver` を用いて非同期で描画処理を行います。

### DOMセレクタ戦略 (DOM Selector Strategy)

GeminiのDOM構造は難読化されている可能性がありますが、プロフィール画像等、比較的安定した要素を基準にセレクタを設計します。

1.  プロフィール画像の `img` 要素、またはそれを囲むコンテナ要素を特定します。
2.  その親要素に対してバッジ要素を `absolute` positioning 等で重ねて表示するか、隣接する要素として挿入します。

詳細なセレクタは `samples/` ディレクトリに保存するDOMスナップショットを解析して決定します。

### 描画ロジック (Rendering Logic)

-   **重複描画の防止**: `MutationObserver` が複数回発火した場合でもバッジが重複して描画されるのを防ぐため、注入先のコンテナ要素に `data-badge-injected="true"` などのマーカー属性を付与して管理します。
-   **動的な更新**: メニューからバッジテキストが更新された際、既存のバッジを削除または更新し、新しい設定を反映させます。
-   **スタイリング**: バッジは `<span>` または `<div>` 要素として生成し、GeminiのUIに馴染むスタイル（フォント、色、角丸など）を適用します。

---

## 開発 (Development)

### プロジェクト構造 (Project Structure)

```
.
├── gemini-profile-badge.md       # この仕様書 (This document)
├── gemini-profile-badge.user.js  # ユーザースクリプト本体 (The userscript source)
└── samples/                      # テスト用のサンプルファイル (Sample files for testing)
```

### テスト (Testing)

実際の Gemini ページでの動作確認のほか、`samples/` ディレクトリに保存したHTML断片を用いてセレクタの検証を行います。

### 貢献ガイドライン (Contribution Guidelines)

#### メタデータ規約 (Metadata Conventions)
-   **@namespace**: `userscript.moukaeritai.work`
-   **@author**: `Takashi Sasaki`
-   **@homepage**: `https://x.com/TakashiSasaki`
-   **@grant**: `GM_setValue`, `GM_getValue`, `GM_registerMenuCommand` など、スクリプトが必要とする権限。
-   **@updateURL** / **@downloadURL**: GitHubのRAW URL。

#### バージョン管理 (Versioning)
-   バージョンは `major.minor.patch` 形式（セマンティックバージョニング）で管理します。
-   スクリプトに少しでも変更を加えた場合は、`patch` 番号を必ずインクリメントしてください。

#### 配布 (Distribution)
-   スクリプトの最新版はGitHubで公開します。
-   メタデータには、Tampermonkeyが更新を検知できるよう、GitHub上の `user.js` ファイルへのRAW URLを記載します。
