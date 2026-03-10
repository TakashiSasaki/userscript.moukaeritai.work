# Gemini Exported Docs Auto-Closer

`docs.google.com/gemini-exported-docs-auto-closer` では、Gemini の `gemini-artifact-exporter` からエキスポートされて自動的に開かれた Google ドキュメントのタブを、一定時間後に自動で閉じるユーザースクリプトを管理します。

## 開発の背景 (2026-03-10)

`gemini-artifact-exporter` によるアーティファクトの連続エクスポート中、Google ドキュメントが新しいタブで開かれると、元の Gemini のタブがバックグラウンドに回ります。
Microsoft Edge の「スリーピングタブ」機能などの強力なリソース制限により、バックグラウンドのタブは JavaScript のタイマー (`setTimeout`, `setInterval`) やイベント発火が完全に凍結（サスペンド）されてしまい、スクリプトの進行がストップするという問題が判明しました。

この問題を根本から解決するため、エクスポート先の Google Docs 側にもユーザースクリプトを仕込み、「用が済んだら自分からタブを閉じる」機能を持たせました。
Docs のタブが閉じることでブラウザのフォーカスが自動的に元の Gemini タブへ戻り、スリープ状態から強制的に復帰して連続エクスポート処理が再開可能になります。

## 主な機能

1.  **判定ロジック**: `document.referrer` をチェックし、`gemini.google.com` から遷移してきた場合のみ動作します。ユーザーが手動で Drive などからドキュメントを開いた場合は何もしません。
2.  **カウントダウン UI**: 画面右下に5秒間のカウントダウントーストを表示します。
3.  **キャンセル機能**: ユーザーがドキュメントを確認したい場合は「Cancel」ボタンを押すことで自動クローズをキャンセルできます。
4.  **自動クローズ**: カウントが0になると `window.close()` を実行し、ブラウザのフォーカスを Gemini のタブに返します。

## 対象 URL
*   `https://docs.google.com/document/d/*`
