# Agent Operational Guidelines

このドキュメントは、このプロジェクトと対話するエージェント向けの推奨運用ガイドラインを概説しています。これらのガイドラインを遵守することで、一貫した動作、適切なバージョン管理の実施、および効率的なコラボレーションが保証されます。
このAGENTS.mdファイルは、エージェントがプロジェクトの構造、ユーザーの好み、および特定の開発ルールを理解するための主要なリファレンスとして機能します。エージェントは、試行錯誤を通じて得られた新しい知見、成功、失敗もここに記録し、将来の参照と学習に役立てる必要があります。

## Git Commit Practices

-   **Detailed Commit Messages**: Always prefer detailed commit messages, focusing on the *why* of a change rather than just the *what*.
-   **`git commit -F` Usage**: Utilize `git commit -F` for committing changes, leveraging a temporary file for the commit message content.
-   **Temporary Commit Message File**: When committing, create a temporary file named `commit_message.txt` with the commit message content.
    -   **Location**: The `commit_message.txt` file must be created within the project's working directory (e.g., `C:\Users\takas\Desktop\userscript\commit_message.txt`).
    -   **Absolute Path**: Always use an absolute path when referencing `commit_message.txt` with `git commit -F`.
-   **Single File Per Commit**: When instructed to commit a file, include only that specific file in the commit, even if other changes are staged or untracked.
-   **English Commit Messages**: All Git commit messages should be written in English.
-   **Manual Pushing**: The user prefers to push changes manually; agents should *never* push changes to a remote repository automatically.

## Windows Command Equivalents

In the `win32` environment, use the following command equivalents:
-   `del` instead of `rm`
-   `move` instead of `mv`
-   `copy` instead of `cp`
-   `md` instead of `mkdir`

## Language Handling

-   **Japanese Input**: When the user provides input in Japanese, rephrase the request in English, show the rephrased result, and ask for confirmation before proceeding.

## ユーザー固有の好み (User-Specific Preferences)

-   **コミットユーザー名**: Takashi Sasaki
-   **コミットユーザーメール**: takashi316@gmail.com
-   **一時ディレクトリ**: C:\Users\takas\.gemini\tmp\8585a6cbb571264cfbedb883a7013c61109d56c966490b3e093178ca8569ed3b
-   **現在の作業ディレクトリ**: C:\Users\takas\Desktop\userscript

## プロジェクト固有の開発ガイドライン (Project-Specific Development Guidelines)

- このリポジリでは、TamperMonkeyや GreaseMonekyで実行できるユーザースクリプトを開発するので、commonJSのみが使用可能であり、TypeScriptは使用できないと想定してください。
- ユーザースクリプトは日本語で記述してください。
- ユーザースクリプトの拡張子は二重拡張子 `.user.js` です。
- ユーザースクリプトのヘッダーには、以下の項目を必ず含めてください。
    - `@name`: スクリプトの名称
    - `@version`: バージョン
    - `@description`: スクリプトの目的、主な機能、動作するサイトなど、詳細な説明
    - `@author`: 作者名
    - `@match`: スクリプトが動作するサイトのURLパターン
    - `@icon`: アイコンのURL (任意)
    - `@grant`: 使用するAPI (例: `none` for no special grants)
    - `@run-at`: スクリプトの実行タイミング (例: `document-idle`)

## Workflow for Multiple Files and Documentation

When handling requests involving multiple files or requiring documentation:
-   Process each file individually.
-   Generate documentation (e.g., Markdown descriptions) for each relevant script.
-   When committing a userscript and its corresponding documentation, the user prefers that each file (the `.user.js` file and its `.md` documentation) be committed in separate, atomic commits. The Markdown documentation should be created and committed immediately after the userscript is committed.

## Todo List Management

-   Utilize the `write_todos` tool for complex queries that require multiple steps.
-   Update the todo list frequently to reflect the current status of tasks (pending, in_progress, completed, cancelled).
-   Ensure only one subtask is marked as `in_progress` at a time.

## 知見と教訓の共有 (Sharing Insights and Lessons)

-   エージェントは、タスクの実行中に得られた試行錯誤（成功と失敗の両方）からの知見と教訓を積極的にこのAGENTS.mdファイルに記録する必要があります。これは、将来のエージェントの参照と学習に役立ちます。
-   ユーザースクリプトをコミットする際には、そのスクリプトの動作について詳細なコミットメッセージを含める必要があります。

# AGENTS.md file

## このリポジトリに関する予備知識
- このリポジトリではTamperMonekyやGreaseMonkeyで使用するユーザースクリプトを開発しています。
- リポジリのURL git@github.com:TakashiSasaki/world
- ブランチ名は userscript
- HTTPのURLは https://github.com/TakashiSasaki/world/tree/userscript

## Github URLに関する予備知識
- リモートのリポジトリやサブモジュールのURLとして git@github.com: で始まるURLが指定されていることが多いが
  環境によってはHTTPSでしかアクセスできないことがある。
  そのような場合には 次のコマンドラインでURLの先頭部分を読み替える。
  git config --global url."https://github.com/" insteadOf "git@github.com:"

## Github の認証に関する予備知識
- HTTPSでGithubで認証するときにはgh auth loginであらかじめログインしておく必要がある。
- gh auth status で現在の認証の状態を確認することができる。
- GITHUB_TOKEN 環境変数に認可トークンが保存されている場合はそれが優先して使われる。
- GITHUB_TOKEN に入っている認可トークンはそのアクセス範囲が限定されている場合がある。
- だから GITHUB_TOKEN があってもどんなリポジトリに対してもアクセスできるとは限らない。
- GITHUB_TOKEN を unset して gh auth login しなおす必要がある。

# GreasyForkでの公開状況

一部のユーザースクリプトはGreasyForkで公開している。

- https://greasyfork.org/ja/scripts/472814-chatgpt-conversation-lister
- https://greasyfork.org/ja/scripts/533285-gemini-conversation-delete-shortcut
- https://greasyfork.org/ja/scripts/533686-gemini-export-button
- https://greasyfork.org/ja/scripts/535471-save-a-gemini-message-to-google-docs
- https://greasyfork.org/ja/scripts/472713-chatgpt-auto-prompt-sender
- https://greasyfork.org/ja/scripts/533295-grok-chat-history-shortcut
  
## HTML Analysis Guidelines

When analyzing HTML structure, particularly for text node extraction and statistics:
1.  **Use Python's html.parser**: It provides a robust way to traverse HTML structures.
2.  **Handle Void Elements**: Be aware of void elements (e.g., br, img, input) that do not have closing tags to correctly maintain the tag stack.
3.  **Traverse and Track Parent Tags**: Maintain a stack of open tags to correctly identify the parent element of any text node.
5.  **Metrics to Collect**:
    *   **Count**: Number of text nodes belonging to a specific parent tag.
    *   **Max Length**: The maximum length of a text node for each parent tag type.
6.  **Example Analysis Script**: A reusable Python script structure should inherit from HTMLParser, overriding handle_starttag, handle_endtag, and handle_data.
7.  **Count HTML Comments**: When analyzing HTML files, count the number of HTML comment blocks (<!-- -->) and display this count in the analysis results table.
8.  **Count Whitespace-Only Nodes**: Count the total number of text nodes that contain only whitespace characters and display this count in the analysis results table.

## HTML Cleanup Process

In this repository, HTML cleanup refers to a specific set of operations to clean HTML sample files:
1.  **Remove <style> tags**: Remove all style tags and their contents.
2.  **Remove <script> tags**: Remove all script tags and their contents.
3.  **Remove HTML comments**: Remove all HTML comment blocks (<!-- -->).
4.  **Remove empty/whitespace-only text nodes**: Remove text nodes that contain only whitespace characters (spaces, tabs, newlines).

**Before and After Analysis**: Always perform HTML analysis both before and after cleanup operations. This allows tracking what was removed during the cleanup process and provides metrics on the cleanup effectiveness.

## Python Scripts for HTML Processing

When performing HTML analysis or manipulation tasks:
1.  **Python scripts are allowed**: Use Python scripts for HTML parsing, analysis, and modification tasks.
2.  **pip packages**: Install necessary packages via pip as needed (e.g., `beautifulsoup4`, `lxml`).
3.  **Keep created scripts**: Do not delete analysis or processing scripts after use. Keep them in the same directory as the HTML files being processed for future reference and reuse.
4.  **Script naming**: Use descriptive names like `analyze_sample1.py`, `truncate_longest_div.py`, etc.
