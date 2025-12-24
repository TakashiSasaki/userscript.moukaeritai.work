# sample-whole-dom.html

お名前ドットコムのDNSレコード設定ページ
https://navi.onamae.com/domain/setting/dns/control/input
で登録済みレコードタブを選択している場合のDOM。

# sample-rr-a.html
AレコードのDOM断片

# sample-rr-aaaa.html
AAAAレコードのDOM断片

# sample-rr-cname.html
CNAMEレコードのDOM断片

# sample-rr-mx.html
MXレコードのDOM断片

# sample-rr-txt.html
TXTレコードのDOM断片

# htmlファイルの前処理

ユーザースクリプトからのDOM操作に影響を及ぼさない要素を削除することで、
HTMLファイルの軽量化を図ります。
HTMLファイルをパース前処理を行います。
必要に応じてPythonスクリプトを作成してかまいません。
必要に応じてpipを使用しモジュールをインストールしてかまいません。
前処理ではテキストノードのうち1000文字を超えるものについては1000未満にトランケートします。
Script要素とStyle要素を削除します。
各要素の中に style="" のような空文字列を値として持つ属性がある場合にはそれらを削除します。
