# Agent Operational Guidelines

このドキュメントは、このプロジェクトと対話するエージェント向けの推奨運用ガイドラインを概説しています。これらのガイドラインを遵守することで、一貫した動作、適切なバージョン管理の実施、および効率的なコラボレーションが保証されます。

## Git Commit Practices

-   **Detailed Commit Messages**: Always prefer detailed commit messages, focusing on the *why* of a change rather than just the *what*.
-   **`git commit -F` Usage**: Utilize `git commit -F` for committing changes, leveraging a temporary file for the commit message content.
-   **Temporary Commit Message File**: When committing, create a temporary file named `commit_message.txt` with the commit message content.
    -   **Location**: The `commit_message.txt` file must be created within the project's working directory.
    -   **Absolute Path**: Always use an absolute path when referencing `commit_message.txt` with `git commit -F`.
-   **Single File Per Commit**: When instructed to commit a file, include only that specific file in the commit, even if other changes are staged or untracked.
-   **English Commit Messages**: All Git commit messages should be written in English.
-   **Manual Pushing**: The user prefers to push changes manually; agents should *never* push changes to a remote repository automatically.

## Repository Information (リポジトリ情報)

-   **Remote URL**: `https://github.com/TakashiSasaki/userscript.moukaeritai.work`
-   **Default Branch**: `userscript.moukaeritai.work`
-   **Namespace**: `userscript.moukaeritai.work`
-   **Author**: `Takashi Sasaki`
-   **Homepage**: `https://x.com/TakashiSasaki`

## Project Structure & Development Workflow (プロジェクト構造と開発フロー)

このリポジトリは、対象ドメインごとにディレクトリを分け、その中に各ユーザースクリプトのプロジェクトを配置する階層構造を採用しています。

### Directory Structure
```
repo_root/
  ├── index.html                  # Main project list (Landing page)
  ├── DOMAIN_NAME/                # e.g., gemini.google.com, chat.openai.com
  │   └── SCRIPT_NAME/            # e.g., gemini-profile-badge
  │       ├── SCRIPT_NAME.user.js # Userscript source
  │       ├── SCRIPT_NAME.md      # Specification / Documentation
  │       ├── index.html          # Documentation viewer (Markdown renderer)
  │       └── samples/            # DOM snapshots for development
  │           ├── preprocess_samples.py # HTML cleanup script
  │           ├── samples.md      # Samples description
  │           └── *.html          # Raw/Processed HTML samples
```

### Development Workflow
1.  **Capture Samples**: 対象サイトからDOMスナップショットを取得し、`samples/` ディレクトリに保存します。
2.  **Preprocess**: `samples/preprocess_samples.py` (または同等のスクリプト) を使用して、HTMLを軽量化・正規化します。
3.  **Specify**: `SCRIPT_NAME.md` に要件、仕様、技術的なアプローチを記述します。
4.  **Implement**: `.user.js` を実装します。
5.  **Document**: `index.html` を作成し、`.md` ファイルを表示できるようにします。
6.  **Register**: リポジトリルートの `index.html` にプロジェクトカードを追加します。

## Userscript Guidelines (ユーザースクリプト作成ガイドライン)

-   **Language**: 日本語で記述してください。
-   **File Extension**: `.user.js`
-   **Metadata Headers**:
    -   `@name`: Script name
    -   `@namespace`: `userscript.moukaeritai.work`
    -   `@version`: `major.minor.patch` (Semantic Versioning)
    -   `@description`: Detailed description in Japanese
    -   `@author`: `Takashi Sasaki`
    -   `@homepageURL`: `https://x.com/TakashiSasaki`
    -   `@match`: Target URL patterns
    -   `@grant`: Required APIs (e.g., `GM_setValue`)
    -   `@updateURL`: `https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/DOMAIN/SCRIPT/SCRIPT.user.js`
    -   `@downloadURL`: Same as updateURL

## Documentation Guidelines

-   各スクリプトディレクトリには必ず `SCRIPT_NAME.md` を作成し、仕様と技術詳細を記述してください。
-   同ディレクトリに `index.html` を配置し、Markdownをブラウザで閲覧できるようにしてください（既存のファイルをテンプレートとしてコピーして使用）。

## Root index.html Maintenance

新しいプロジェクトを追加する際は、ルートの `index.html` を更新してください。
-   **Sort Order**: 任意（重要なものを上にする等）。
-   **Card Content**:
    -   **Title**: サイトのFavicon (Google S2 API) + プロジェクト名（ドキュメントへのリンク）。
    -   **Description**: 簡潔な説明。
    -   **Install Button**: 右上に配置し、`.user.js` のRaw URLへリンク。

## HTML Samples & Analysis

DOM解析を行う際は、以下のガイドラインに従ってください。

### Cleanup Process (`preprocess_samples.py`)
開発効率とファイルサイズ削減のため、サンプルHTMLは必ず前処理を行ってください。
1.  **Truncate Text**: 長いテキストノードは1000文字程度に切り詰める。
2.  **Remove Elements**: `<script>`, `<style>` タグは削除する。
3.  **Remove Attributes**: 空の属性や不要なイベントハンドラ等は削除する。
4.  **Python Script**: 各 `samples/` ディレクトリに `preprocess_samples.py` を配置し、これを実行して処理を行うことを推奨します。

## ユーザー固有の好み (User-Specific Preferences)

-   **User Name**: Takashi Sasaki
-   **Email**: takashi316@gmail.com
