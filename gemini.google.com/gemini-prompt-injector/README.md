# gemini-prompt-injector

Gemini (gemini.google.com) のプロンプト入力エリアに、外部から任意のテキストを注入し、自動で送信を行えるようにするユーザースクリプトです。

## 機能

- カスタムイベント `gemini-inject-prompt` をリッスンし、指定されたテキストをプロンプトエリアに入力します。
- 入力状態をブラウザに認識させるためのイベントエミュレーションを実行します。
- 入力後、送信ボタンを自動的にクリックしてプロンプトを送信します。

## インストール
[インストールページ](https://userscript.moukaeritai.work/gemini.google.com/gemini-prompt-injector/index.html)からインストールしてください。

## 使い方

他の拡張機能やコンソール、別のユーザースクリプトから、以下のようにカスタムイベントを発火させることで利用します。

```javascript
document.dispatchEvent(new CustomEvent('gemini-inject-prompt', {
    detail: { prompt: "こんにちは、Gemini! あなたの機能について教えてください。" }
}));
```
