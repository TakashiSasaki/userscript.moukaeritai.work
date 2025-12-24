# ユーザースクリプト「ChatGPT Overlay Profile」

## 概要

ChatGPTのウェブページにおいて、ユーザー情報が表示される箇所に任意の文字列（数文字程度のテキストや絵文字）を追加表示するためのユーザースクリプトです。

## 導入方法

本スクリプトの実行には、[Tampermonkey](https://www.tampermonkey.net/) などのユーザースクリプトマネージャーが必要です。
最新版はGitHub上で公開されており、RAW URLにアクセスすることでTampermonkeyがインストールを検知します。

## 設定方法

追加する文字列は、ユーザースクリプトからアクセス可能な永続化データストアに保存されます。具体的な設定方法はスクリプトのソースコードを参照してください。

## 開発者情報

### メタデータ規約

ユーザースクリプトのメタデータは、以下の規則に従って記述します。

-   **@namespace**: `userscript.moukaeritai.work`
-   **@author**: `TakashiSasaki`
-   **ホームページ**: `x.com/TakashiSasaki`
-   **バージョン**: `major.minor.patch` 形式で管理し、スクリプトに変更を加えた場合は `patch` 番号を必ずインクリメントします。
-   **作成日時**: メタデータに作成日時を記載します。
-   **@grant**: データの永続化に必要な権限を要求します。
-   **@updateURL**: GitHubのRAW URLを記載します。
-   **@downloadURL**: GitHubのRAW URLを記載します。

### `samples` ディレクトリ

開発時の参考資料として、ChatGPTのウェブページのDOMや、ユーザー情報UIのDOM断片をHTMLファイルとして保存しています。

### 配布と更新

このユーザースクリプトはGitHubで最新版を公開します。ユーザースクリプトのメタデータに更新用URL (`@updateURL`, `@downloadURL`) としてGitHubのRAW URLを記載することで、Tampermonkeyが自動的に更新を検知できるようになります。
