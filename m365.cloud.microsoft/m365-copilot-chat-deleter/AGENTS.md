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
- **アクティブアイテム**: `button.fui-NavItem[aria-current="page"]`, `button.fui-NavItem[aria-selected="true"]`
- **コンテナ**: `.fui-SplitNavItem`
- **メニューボタン**: `button[aria-label="その他"]`, `.fui-SplitNavItem__menuButton`
- **メニュー内「削除」項目**: `[role="menuitem"], .fui-MenuItem` + テキスト走査（`削除`）
- **「削除する」確定ボタン**: `button.fui-Button` + テキスト走査（`削除する`）

### トラブルシューティング
スクリプトが動作しなくなった場合、Microsoft側のDOM更新で上記のテキスト内容や `aria` 属性の使い方が変わった可能性が高いため、ブラウザのDOMインスペクタで該当箇所を再調査してください。
