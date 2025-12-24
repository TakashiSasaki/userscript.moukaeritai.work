# onamae-rr-backup.user.js

## 概要
お名前ドットコム（おなまえ.com）のDNSレコード設定ページに表示されているリソースレコード（RR）を自動的に記録・バックアップするためのユーザースクリプトです。

## 背景・目的
- お名前ドットコムではDNS操作用のAPIが提供されていません。
- ゾーン転送（AXFR/IXFR）も制限されているため、外部からレコード一覧を取得することが困難です。
- ウェブ管理画面からのみレコードが確認できる状況において、レコードの変更履歴やバックアップを自動化することを目的とします。

## 対象URL
- [https://navi.onamae.com/domain/setting/dns/control/input](https://navi.onamae.com/domain/setting/dns/control/input)

## 機能仕様
- **自動記録**: 対象ページを開いた際、画面に表示されているRRをスキャンし記録します。
- **データ形式の考慮**: RRのタイプ（A, AAAA, MX, CNAME, TXT等）に応じた適切な形式で値を記録します。
- **ライフサイクル管理**: 各レコードが「最初に観測された日時（first seen）」と「最後に観測された日時（last seen）」を記録します。

## 技術仕様
- **データ永続化**: ユーザースクリプト固有のデータストア（GM_setValueなど）を利用します。
- **セキュリティと権限**: `@grant` メタデータを使用して、必要な特権（データアクセス等）を明示的に要求します。
- **DOM解析とセレクタ戦略**:
    - 将来的なDOM構造の変化に強い、可能な限り安定したセレクタを採用してください。
    - 実装にあたっては `samples/` ディレクトリ内の各HTMLファイルを精査し、解析ロジックを設計してください。
    - 各サンプルの詳細は [samples/samples.md](samples/samples.md) を参照してください。

## バージョン管理ポリシー
バージョンは `major.minor.patch` 形式で管理します。

1. **patch**: スクリプトの軽微な修正、リファクタリング、挙動の改善時に増加させます。
2. **minor**: データストアの記録形式（スキーマ）に変更があり、既存データの移行や再構築が必要になる場合に増加させます。
3. **major**: 開発者が手動で更新します（AIエージェントによる自動変更は行いません）。

## メタデータ仕様
スクリプトのヘッダーには以下の情報を記載してください：

- **Author**: `Takashi Sasaki`
- **Homepage**: [https://x.com/TakashiSasaki](https://x.com/TakashiSasaki)
- **Namespace**: `userscript.moukaeritai.work`
- **Updated**: スクリプトの最終更新日時。
- **Auto Update**: GitHub上の `user.js` (raw URL) から Tampermonkey 等が自動更新を検知できる構成とします。

