# Gemini Exported Docs Auto-Closer

Gemini の `gemini-artifact-exporter` からエキスポートされて自動的に開かれた Google ドキュメントのタブを、一定時間後に自動で閉じるユーザースクリプトです。

## 概要

`gemini-artifact-exporter` によるアーティファクトの連続エクスポート中、Google ドキュメントが新しいタブで開かれると、元の Gemini のタブがバックグラウンドに回ります。
ブラウザ（特に Microsoft Edge）のリソース制限により、バックグラウンドのタブがサスペンドされ、エクスポート処理が停止してしまう問題を解決するために作成されました。

このスクリプトは、エクスポート先の Google Docs 側で動作し、用が済んだら自分からタブを閉じます。これによりフォーカスが Gemini に戻り、処理が継続されます。

## 主な機能

- **自動判定**: `gemini.google.com` から遷移してきた場合のみ動作します。
- **コンパクト UI**: 画面上にフローティングボタンを表示し、カウントダウン状況を可視化します。
- **待ち時間の調整**: 自動で閉じるまでの秒数をユーザーが自由に変更可能です（最小3秒）。
- **キャンセル**: 「Stay」ボタンを押すことで、そのタブを閉じずに残すことができます。
- **ドラッグ可能**: バージョン番号部分を掴んで、UI を好きな位置へ移動できます。

## インストール

[こちらからインストール](https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/docs.google.com/gemini-exported-docs-auto-closer/gemini-exported-docs-auto-closer.user.js)
