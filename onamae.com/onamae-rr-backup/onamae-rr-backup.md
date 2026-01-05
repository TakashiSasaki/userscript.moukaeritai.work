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

## 動作環境
- Tampermonkey で動作確認済みです。


## 開発者情報
- **Author**: `Takashi Sasaki`
- **Homepage**: [https://x.com/TakashiSasaki](https://x.com/TakashiSasaki)
- **Published at**: [https://userscript.moukaeritai.work](https://userscript.moukaeritai.work)


