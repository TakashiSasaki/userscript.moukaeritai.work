# M365 Copilot One-Click Delete - Agent Implementation Notes

## 概要
M365 CopilotのチャットUIにおいて、現在アクティブな会話の「削除」フローをマクロ化して自動実行するスクリプトです。

### 対象ドメインとURL
- `m365.cloud.microsoft`
- 主な対象URL: `https://m365.cloud.microsoft/chat/*`

### 設計戦略
Fluent UIによって動的に生成されるクラス（`___<hash>`）への直接依存を避け、`aria-` 属性やセマンティックなマークアップに強く依存する設計としています。

#### 自動実行プロセス (`executeDeleteSequence`)
このプロセスは DOM を非同期で走査するため、意図的な待機(`sleep`)を挟んでUIレンダリングの遅延を吸収しています。

1. **アクティブな会話の特定**
   - サイドバー内の `button.fui-NavItem` が `aria-current="page"` または `aria-selected="true"` を持つものを検索。
   - その親コンテナ `.fui-SplitNavItem` を特定。
2. **メニューの展開**
   - コンテナ上の「その他」ボタン (`button[aria-label="その他"]` または `.fui-SplitNavItem__menuButton`) をクリック。
3. **メニューからの「削除」選択**
   - ロールが `menuitem` な要素から、テキスト内容が `削除` と一致するものを検索してクリック。
4. **確認ダイアログでの承認**
   - `button.fui-Button` のうち、テキストが `削除する` である要素を探してクリック。

### セレクタリスト
- **アクティブアイテム**: `[aria-current="page"]`, `[aria-selected="true"]` (クラス名への依存を排除)
- **コンテナ**: `.fui-SplitNavItem`
- **メニューボタン**: `[aria-label*="その他"]`, `[aria-label*="More"]`, `.fui-SplitNavItem__menuButton`
- **メニュー項目**: `[role="menuitem"]`, `.fui-MenuItem` + 正規表現（`削除\|Delete`）
- **確定ボタン**: `button.fui-Button` + 正規表現（`削除する\|Delete`）

### トラブルシューティング
スクリプトが動作しなくなった場合、Microsoft側のDOM更新で上記のテキスト内容や `aria` 属性の使い方が変わった可能性が高いため、ブラウザのDOMインスペクタで該当箇所を再調査してください。


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - スクリプトのバージョンが更新された場合は、関連するすべての `index.html` 内にハードコードされているバージョン表記も忘れずに更新してください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
