# Agent Operational Guidelines

This document outlines the preferred operational guidelines for agents interacting with this project. Adherence to these guidelines ensures consistent behavior, proper version control practices, and efficient collaboration.

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

- このリポジトリでは、TamperMonkeyや GreaseMonekyで実行できるユーザースクリプトを開発するので、commonJSのみが使用可能であり、TypeScriptは使用できないと想定してください。
- ユーザースクリプトの拡張子は二重拡張子 `.user.js` です。

## Workflow for Multiple Files and Documentation

When handling requests involving multiple files or requiring documentation:
-   Process each file individually.
-   Generate documentation (e.g., Markdown descriptions) for each relevant script.
-   Commit each script and its corresponding documentation in separate, atomic commits.

## Todo List Management

-   Utilize the `write_todos` tool for complex queries that require multiple steps.
-   Update the todo list frequently to reflect the current status of tasks (pending, in_progress, completed, cancelled).
-   Ensure only one subtask is marked as `in_progress` at a time.