# エージェント運用ガイドライン

このドキュメントは、このプロジェクトと対話するエージェント向けの推奨運用ガイドラインを概説しています。これらのガイドラインを遵守することで、一貫した動作、適切なバージョン管理の実施、および効率的なコラボレーションが保証されます。

## Gitコミットプラクティス

-   **詳細なコミットメッセージ**: 何を変更したか（*what*）だけでなく、なぜ変更したか（*why*）に焦点を当てた、詳細なコミットメッセージを常に心がけてください。
-   **`git commit -F` の使用**: 変更をコミットする際は `git commit -F` を利用し、コミットメッセージの内容は一時ファイルに記述してください。
-   **一時コミットメッセージファイル**: コミット時、メッセージを記述するための一時ファイルを作成してください。
    -   **場所**: 一時ファイルは、必ずプロジェクトのワーキングディレクトリ内に作成してください。
    -   **絶対パス**: `git commit -F` で一時ファイルを参照する際は、必ず絶対パスを使用してください。
    -   **記録しない**: `commit_message.txt` のようなコミットメッセージのための中間ファイルはリポジトリに記録する必要がありません。コミット完了後、必ず削除してください。
-   **コミットごとの単一ファイル**: ファイルのコミットを指示された場合、ステージングされている、あるいは未追跡の他の変更があったとしても、その特定のファイルのみをコミットに含めてください。
-   **英語のコミットメッセージ**: すべてのGitコミットメッセージは英語で記述してください。
-   **手動でのプッシュ**: ユーザーは変更のプッシュを手動で行うことを好みます。エージェントはリモートリポジトリに変更を自動でプッシュしては**いけません**。

## 共通開発基準

以下の基準は、このリポジトリで開発されるすべてのユーザースクリプトに適用されます。

### メタデータとバージョニング
すべての `.user.js` ファイルは以下のメタデータを含む必要があります。

-   **@namespace**: `userscript.moukaeritai.work`
-   **@author**: `Takashi Sasaki`
-   **@homepageURL**: `https://x.com/TakashiSasaki`
-   **公開場所**: `https://userscript.moukaeritai.work` (README等のドキュメントに記載)
-   **@version**: `major.minor.patch` (セマンティックバージョニング形式)
    -   **厳格なルール**: JavaScript（`.user.js`）のコードを1行でも変更した場合は、必ずパッチバージョンをインクリメント（バンプアップ）してください。
    -   機能追加やバグ修正ごとにパッチバージョンをインクリメントしてください。
-   **@updateURL** / **@downloadURL**:
    -   GitHubのRawファイルURLを指定し、Tampermonkey等のマネージャーが更新を自動検出できるようにします。
    -   フォーマット: `https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/DOMAIN_NAME/SCRIPT_NAME/SCRIPT_NAME.user.js`
    -   **注意**: デフォルトブランチ名は `userscript.moukaeritai.work` です。

### リリース除外対象の命名規則
以下のキーワードをファイル名やディレクトリ名に含むスクリプトは、開発用または過去の遺産であり、正式なリリース対象ではありません。これらは `index.html` に掲載してはいけません。

-   `obsoleted`
-   `old`
-   `example`
-   `test`

### ドキュメントの3層構造
ドキュメントの肥大化を防ぎ、人間とAIの双方に最適な情報を提供するため、以下の3層構造を維持してください。

1.  **`index.html` (ビューア)**: プレミアムデザインテンプレートを使用したドキュメント閲覧用ページ。
2.  **`README.md` または `{project-name}.md` (人間用)**: ユーザー向けの概要、目的、機能説明。実装の詳細は含めない。
3.  **`AGENTS.md` (AI用)**: エージェント向けの実装ノート。セレクタリスト、設計戦略、運用ルール等を記述。

### DOMの解析と開発スタイル
以前はHTMLのDOMスナップショットをファイル（`samples/` ディレクトリ等）として保存していましたが、現在は非推奨です。
開発時は **Chrome Dev Tools MCP** などを経由して、対象サイトのDOM構造をリアルタイムに取得・解析するスタイルを採用してください。不要なスナップショットファイルはリポジトリにコミットしないでください。

### JSの品質とリンティング
JavaScript（`.user.js`）のコードを変更した後は、必ずESLintを実行して文法エラーや潜在的なバグがないか確認してください。

-   **コマンド**: `npx eslint path/to/script.user.js`
-   **要件**: コミット前にすべてのエラーを解消し、警告も可能な限り修正してください。
-   **注意事項**: 変更が小さくてもESLintの実行を省略しないこと。

### インストール検知APIのガードと共通ロジック
最上位の `index.html` からリンクされているユーザースクリプトは、以下の `@match` 設定と共通の検知ロジックを実装してください。該当ドメインでは**メイン機能を動かさず**「インストール検知APIのみ」を実行して早期リターンする必要があります。

#### 1. 必須 @match
```javascript
// @match        https://userscript.moukaeritai.work/*
```

#### 2. 標準実装コード
すべてのスクリプトで以下のコードスニペットを使用してください。

```javascript
    const installCheckHosts = [
        'userscript.moukaeritai.work'
    ];

    const isInstallCheckHost = installCheckHosts.includes(location.hostname);

    if (isInstallCheckHost) {
        const report = () => {
            document.dispatchEvent(new CustomEvent('userscript-check-installed', {
                detail: {
                    name: GM_info.script.name,
                    version: GM_info.script.version
                }
            }));
        };
        report();
        document.addEventListener('userscript-ping', report);
        return;
    }
```

### UIパネルの基本要件
全てのユーザースクリプトがUIパネルを持つわけではありませんが、もしUIパネルを表示する機能を持つ場合は、以下の基本要件を満たす必要があります。

-   **半透明**: UIパネルは、ページのコンテンツを完全に隠さないように、半透明（例: `opacity: 0.8`）にしてください。
-   **バージョン表示**: パネル内には、スクリプトの現在のバージョン番号を明記してください。`GM_info.script.version` を利用して動的に取得することを推奨します。
-   **控えめなデザイン**: パネルは小さく、ページの主要な操作を妨げない位置（例: 画面の隅）に配置してください。

### パフォーマンスと監視戦略 (Performance & Monitoring Strategy)
Webページのパフォーマンスへの影響を最小限に抑えるため、以下の戦略を採用してください。

-   **ポーリングの回避**: `setInterval` 等による継続的なポーリング監視は、CPUリソースを無駄に消費するため**原則禁止**します。
-   **イベント駆動**: 可能な限り、ブラウザのイベント（`click`, `input`, `navigation` 等）や `CustomEvent` を利用してロジックをトリガーしてください。
-   **MutationObserverの適切な利用**:
    -   DOMの変化を監視する必要がある場合は `MutationObserver` を利用してください。
    -   観測範囲（`subtree`, `childList`）は必要最小限に絞ってください。`document.body` 全体を `subtree: true` で監視することは極力避けてください。
    -   **Debounce (デバウンス)**: `MutationObserver` のコールバック内では、必ずデバウンス処理（`setTimeout` を利用した呼び出し頻度制限）を実装し、短期間の大量のDOM変更による負荷スパイクを防いでください。

## リポジトリ情報

-   **リモートURL**: `https://github.com/TakashiSasaki/userscript.moukaeritai.work`
-   **デフォルトブランチ**: `userscript.moukaeritai.work`
-   **名前空間**: `userscript.moukaeritai.work`

## プロジェクト構造と開発フロー

階層構造: `DOMAIN_NAME/SCRIPT_NAME/`

リポジトリ直下には、ユーザースクリプトの対象となる「ドメイン風のディレクトリ（例: `gemini.google.com/`, `youtube.com/` など）」が配置されます。
**注意**: `scripts/` ディレクトリや `.git/` などのシステム/ユーティリティディレクトリは、ユーザースクリプトのドメインディレクトリではないため、処理の対象外としてください。

```
repo_root/
  ├── index.html                  # メインプロジェクトリスト (ランディングページ)
  ├── AGENTS.md                   # グローバルエージェントガイドライン (このファイル)
  ├── scripts/                    # (除外対象) ユーティリティスクリプト等
  ├── DOMAIN_NAME/                # 例: gemini.google.com
  │   ├── AGENTS.md               # ディレクトリレベルのエージェント指示
  │   └── SCRIPT_NAME/            # 例: gemini-profile-badge
  │       ├── SCRIPT_NAME.user.js # ユーザースクリプトソース
  │       ├── README.md (または SCRIPT_NAME.md) # 仕様書 (人間向け)
  │       ├── AGENTS.md           # 実装詳細 (エージェント向け)
  │       └── index.html          # ドキュメントビューア
```

### 開発フロー
1.  **DOM解析**: Chrome Dev Tools MCP経由でリアルタイムにDOM構造を取得・解析。
2.  **仕様記述**: `SCRIPT_NAME.md` にユーザー向け仕様を記述。
3.  **技術メモ**: `AGENTS.md` にエージェント向け技術詳細（セレクタ等）を記述。
4.  **実装**: `.user.js` を実装。
5.  **リンティング**: `npx eslint` でチェック。
6.  **ドキュメント作成**: プレミアムデザインの `index.html` を作成。
7.  **登録**: ルートの `index.html` にプロジェクトを追加。

## インデックスの維持

新しいプロジェクトを追加する際は、ルートおよび各ディレクトリの `index.html` を更新してください。
-   **一貫性**: `onamae.com/index.html` 等、サブディレクトリにもインデックスを配置し、回遊性を高める。
-   **カードデザイン**:
    -   **タイトル**: サイトのFavicon (Google S2 API) + プロジェクト名（ドキュメントへのリンク）。
    -   **配置**: **インストールボタンはカードの右下(bottom-right)に配置**してください。
-   **バージョン更新**: ユーザースクリプトのバージョンを上げた際は、必ず `index.html` 内のそのスクリプトの `Install` ボタンのテキスト（例: `Install (vX.Y.Z)`）も最新のバージョン番号に更新してください。


## Technical Knowledge Base

### YouTube (SPA & Performance)

YouTube user script development learnings:

1.  **SPA Navigation & Cleanup**:
    -   **Early Cleanup**: On SPA sites like YouTube, rely on early navigation events like `yt-navigate-start` to stop observers and timers *before* page teardown begins. Waiting for `finish` events often causes browser hangs as observers process thousands of deletion mutations.
    -   **Idempotency**: Ensure cleanup functions are idempotent so they can be safely called multiple times (e.g., on start, on finish, on unload).

2.  **Observer Performance**:
    -   **Avoid Broad Monitoring**: Do NOT monitor `document.body` with `subtree: true` if massive DOM changes are expected.
    -   **Polling Alternatives**: For waiting on elements during transitions, lightweight polling (`setInterval`) is often safer and more performant than `MutationObserver`.

3.  **Strict Context Checking**:
    -   **URL Verification**: Always verify `window.location.pathname` or parameters at the start of your main logic to ensure UI elements don't bleed into unintended pages (e.g., playlist tools appearing on video watch pages).

4.  **Trusted Types Compliance (Security)**:
    -   **Avoid `innerHTML`**: Modern sites like YouTube enforce Trusted Types security policies that block assignment to `innerHTML`.
    -   **Use DOM Methods**: Always use `document.createElement()`, `textContent`, `setAttribute()`, and `appendChild()` to securely construct UI elements.

### Gemini (DOM Structure & Selectors)

Learnings from implementing features like Auto-Scroll and Conversation Management (as of Feb 2026):

1.  **Conversation List Hierarchy**:
    -   The list is roughly at `conversations-list > .conversations-container`.
    -   **BEWARE**: Broader containers like `side-navigation-content` or `bard-sidenav` also contain "Gems" (Bot) items. Targeting these broad containers allows selectors to pick up Bot items, causing bugs (e.g., incorrect ID logic, sequential numbering artifacts).

2.  **Item Selectors**:
    -   **Correct Selector**: `[data-test-id="conversation"]`. Note: This attribute is on an `<a>` tag, NOT a `div`. Do NOT restrict your selector to `div` (e.g., `div[data-test-id="conversation"]` will fail).
    -   **Recommended Strategy**: Prioritize `[data-test-id="conversation"]`. If falling back to `jslog` or other attributes, strictly exclude `[data-test-id="item"]` (which usually denotes Bots/Gems).

3.  **Virtual Scrolling**:
    -   Gemini uses virtual scrolling. Only currently visible conversation items exist in the DOM. `document.querySelectorAll` will only return a subset (e.g., ~15 items) of the full history.
    -   Logic that depends on "finding the current item and then finding the next one" must handle cases where the current item has been scrolled out of view and unloaded from the DOM.

### Shared UI Patterns

1.  **Activity-Linked Panel State**:
    -   **Sync Active/Inactive**: If a script has a UI panel, its open/closed state should be linked to the script's active context, not just a manual toggle.
    -   **Active State**: Expand panel content and show "Active".
    -   **Inactive State**: Collapse panel content and show "Inactive" (keep header visible).

## User Preferences

-   **Name**: Takashi Sasaki
-   **Email**: takashi316@gmail.com

### Index Page File Structure

Folder index pages consist of three files:

-   `index.html`: Defines page structure.
-   `index.css`: Defines page styles.
-   `index.js`: Defines dynamic behavior.