# Samples for onamae-rr-backup

このディレクトリには、ユーザースクリプトの開発およびテストに使用するHTMLサンプルファイルが含まれています。

## サンプルファイル一覧

- **[sample-whole-dom.html](sample-whole-dom.html)**
    - お名前ドットコムのDNSレコード設定ページ（[https://navi.onamae.com/domain/setting/dns/control/input](https://navi.onamae.com/domain/setting/dns/control/input)）で「登録済みレコード」タブを選択している状態のDOM全体。
- **[sample-rr-a.html](sample-rr-a.html)**
    - AレコードのDOM断片（`<tr>`要素）。
- **[sample-rr-aaaa.html](sample-rr-aaaa.html)**
    - AAAAレコードのDOM断片。
- **[sample-rr-cname.html](xample-rr-cname.html)**
    - CNAMEレコードのDOM断片。
- **[sample-rr-mx.html](sample-rr-mx.html)**
    - MXレコードのDOM断片。
- **[sample-rr-txt.html](sample-rr-txt.html)**
    - TXTレコードのDOM断片。

## HTMLファイルの前処理ガイドライン

ユーザースクリプトからのDOM操作に影響を及ぼさない要素を削除し、開発効率の向上とファイルの軽量化を図ります。

### 前処理ルール
1. **テキストノードの制限**: 1000文字を超えるテキストノードは、1000文字未満にトランケート（切り捨て）します。
2. **不要な要素の削除**: `<script>` 要素および `<style>` 要素をすべて削除します。
3. **不要な属性の削除**: 値が空文字列（例：`style=""`）である属性を削除します。

### 実装方法
- 必要に応じてPythonスクリプト等を作成して前処理を行ってください。
- 必要に応じて `pip` を使用して外部ライブラリを導入しても構いません。

