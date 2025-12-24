# chatgpt-overlay-profile.user.js の目的

ChatGPTのウェブページにおいてユーザー情報が表示される個所において、
任意の文字列を追加表示するためのユーザースクリプト。
Tampermonkeyで実行することを想定している。
任意の文字列といっても数文字程度を想定している。
絵文字を表示することも想定している。

# samples ディレクトリの中身
 ChatGPT のウェブページのDOMやユーザー情報が表示されているUIのDOM断片をHTMLファイルとして保存している。

# 追加文字の保存場所

ユーザースクリプトからアクセス可能で、かつ永続化されているデータストアに保存する。
そのために必要な機能を @grant で要求する。

# @namespace

userscript.moukaeritai.work

# その他

TakashiSasaki という作成者名をユーザースクリプトのメタデータに記載する。
そのホームページが x.com/TakashiSasaki であることも記載する。

# バージョン表記

major.minor.patch 形式。

user.js に少しでも変更を加えたときには patchを必ず増加させる。

作成日時もユーザースクリプトのメタデータ中に記載する。
