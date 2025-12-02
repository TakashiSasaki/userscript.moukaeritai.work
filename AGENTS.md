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
-   Commit each script and its corresponding documentation in separate, atomic commits.

## Todo List Management

-   Utilize the `write_todos` tool for complex queries that require multiple steps.
-   Update the todo list frequently to reflect the current status of tasks (pending, in_progress, completed, cancelled).
-   Ensure only one subtask is marked as `in_progress` at a time.

## 知見と教訓の共有 (Sharing Insights and Lessons)

-   エージェントは、タスクの実行中に得られた試行錯誤（成功と失敗の両方）からの知見と教訓を積極的にこのAGENTS.mdファイルに記録する必要があります。これは、将来のエージェントの参照と学習に役立ちます。
-   ユーザースクリプトをコミットする際には、そのスクリプトの動作について詳細なコミットメッセージを含める必要があります。
