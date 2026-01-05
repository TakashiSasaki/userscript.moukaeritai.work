# Gemini Turn Counter 開発ドキュメント

このドキュメントは、Tampermonkey等で動作するユーザースクリプト `gemini-turn-counter.user.js` の仕様と開発について記述します。

## 1. 概要と目的

すでに作成済みの `chatgpt-turn-counter` と同様に、Google Gemini 上での会話において、メッセージ数（ターン数）や文字数をリアルタイムにカウントし、画面上に表示することを目的としています。

## 2. 機能一覧

### 2.1 カウンター機能 (Turn Counter)
以下の要素をカウントし、表示します。

*   **ユーザー送信数 (User)**: ユーザーがメッセージを送信した回数
    *   **文字数表示**: テキストノードの合計文字数を併記 (例: `5 (1,234 chars)`)。
*   **モデル応答数 (Model)**: Geminiがレスポンスを返した回数
    *   **文字数表示**: 応答メッセージの合計文字数を併記。
*   **画像送信数 (Images)**: ユーザーが送信した画像の数
    *   **サムネイル表示**: 送信画像を縮小表示し、ホバーで詳細を確認可能。
*   **(検討中) コードブロック数**: 応答に含まれるコードブロックの数

### 2.2 ユーザーインターフェイス (UI)
`chatgpt-turn-counter` のデザインを踏襲します。

*   **初期状態**: 画面右上に小さなアイコンとして表示（会話の邪魔にならない設計）。
*   **展開 ("Click to Expand")**: アイコンをクリックするとパネルが展開し、詳細なカウンター情報が表示される。
*   **自動折りたたみ**: マウスカーソルがUIパネルから離れると、自動的に元のアイコン状態に戻る。
*   **画像一括コピー (Copy All)**: "Images" 行のボタンをクリックすると、表示中の全画像をHTMLタグ（Data URI埋め込み）としてクリップボードにコピーする。

## 3. 技術仕様

### 3.1 動作環境
*   **実行環境**: TamperMonkey などのユーザースクリプトマネージャー
*   **対象URLパターン**: `https://gemini.google.com/app/*`
*   **名前空間**: `userscript.moukaeritai.work`

### 3.2 自動アップデート (Automatic Updates)
本スクリプトは GitHub 上の raw ファイルを参照して自動更新されます。
*   **Update URL**: `https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-turn-counter/gemini-turn-counter.user.js`

## 4. 開発プロセス

### 4.1 DOM解析と実装方針
GeminiのDOM構造はChatGPTとは異なるため、以下の手順で解析を行います。
1.  `samples/` ディレクトリにGeminiのHTMLスナップショット（会話全体、個別メッセージ等）を保存する。
2.  安定したセレクタ（例: ユーザー発言とモデル発言を区別する属性やクラス）を特定する。
3.  `MutationObserver` を使用して、動的に追加されるメッセージを検知し、カウントを更新する。

### 4.2 関連ファイル
*   **AGENTS.md**: AIエージェント向けの開発方針・コンテキスト記録。

## 5. プロジェクト管理情報

### 5.1 作者
*   **Name**: Takashi Sasaki
*   **URL**: [x.com/TakashiSasaki](https://x.com/TakashiSasaki)
