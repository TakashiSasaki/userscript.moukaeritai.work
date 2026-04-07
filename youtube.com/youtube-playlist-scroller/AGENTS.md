# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の動的取得**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub から最新の `@version` を動的に取得して表示します。このため、HTML 内にバージョン番号をハードコードしないでください。
   - **HTML 内のバージョン番号を手動で書き換える必要はありません。** 
   - **バージョン番号を記載するのは、ユーザースクリプト本体のメタデータセクションにおいてだけです。**
   - **バンプアップの対象も、ユーザースクリプト本体のメタデータセクションのバージョン表記だけです。** ユーザースクリプトの `@version` をインクリメントするだけで、ドキュメントページに自動反映されます。
   - インストールボタンの構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造、および `data-script-name` 属性）を維持することで、自動更新・比較機能が動作します。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
