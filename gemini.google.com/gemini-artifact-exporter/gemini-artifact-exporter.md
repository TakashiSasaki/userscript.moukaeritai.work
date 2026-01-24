# Gemini Artifact Exporter

## 概要

Google Gemini のサイドバーに表示される「Article」タイプのアーティファクトを、まとめて Google Docs にエクスポートするユーザースクリプトです。会話ページ上に「Export All Docs」「Force Export All」の2つのボタンが表示されます。

対象URL: `https://gemini.google.com/app/*`

## インストール

1.  ブラウザに Tampermonkey などのユーザースクリプトマネージャーをインストールします。
2.  このリポジトリの `gemini-artifact-exporter.user.js` を開き、指示に従ってインストールします。

## 使い方

1.  Gemini の会話ページを開きます。
2.  画面右下のボタンから実行します。各ボタンにマウスカーソルを合わせると、機能の説明が表示されます。
    -   **Export All Docs**: まだエクスポートしていないアーティファクトのみを対象にします。
    -   **Force Export All**: すべてのアーティファクトを再エクスポートします。

## 挙動と保存

-   既にエクスポート済みのアーティファクトは会話ごとに記録され、通常モードでは自動的にスキップされます。
-   再度すべてを出力したい場合は **Force Export All** を使用してください。

## 注意事項

-   エクスポートは Gemini の標準 UI（Share → Export to Docs）を自動操作します。Google Docs への権限やログイン状態に依存します。
-   アーティファクト数が多い場合、完了まで時間がかかります。

## 作者

-   **Name**: Takashi Sasaki
-   **URL**: https://x.com/TakashiSasaki
