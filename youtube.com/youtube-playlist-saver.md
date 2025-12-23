# このディレクトリの目的

このディレクトリではyoutube-playlist-saver.user.js という
ユーザースクリプトを作成している。
ユーザースクリプトはブラウザのTampermonkey拡張機能で実行されることを
想定している。

samples サブディレクトリの下には、YouTubeのウェブサイトで
プレイリストにアクセスした際のページ全体のDOMや
動画単体のDOM断片が保存されている。

# スクリプトの動作対象ページURL

プレイレイスとのURLは list パラメータにIDが入っている。

- https://www.youtube.com/playlist?list=WL
- https://www.youtube.com/playlist?list=LL
- https://www.youtube.com/playlist?list=PLnCtz2wEFH0YJgVAEvnkbHKjtVes-kXir


# ユーザースクリプトの動作

ユーザースクリプトでは、開いているプレイリストの
中に含まれている動画アイテムの動画IDを記録する。
その際にはどのプレイリストの中の動画なのかが分かるように
プレイリストID（FLやLLも含む）とともに記録する。
この記録はユーザースクリプトからアクセスできる永続的なデータストアに保存する。
そのために必要なパーミッションがあるなら
ユーザースクリプトのメタデータ項目の @grant に設定する。

# ユーザースクリプトのバージョン管理

バージョンは major.minor.patch の形式で管理する。
少しでも youtube-playlist-saver.user.js が変更された場合は
パッチレベルを更新する。

# ユーザースクリプトのメタデータ

作者 Takashi Sasaki
作者のホームページは x.com/TakashiSasaki
namespace は userscript.moukaeritai.work

このユーザースクリプトは
https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript/youtube.com/youtube-playlist-saver.user.js で公開される予定なので、
Tampermonkeyでの自動更新のためのメタデータをそのように記述する。

# ユーザースクリプトの動作

## 動画IDの収集
ユーザーはプレイリストをスクロールしてたくさんの動画アイテムを一覧する。
その一覧表の中に出てきた動画アイテムを、プレイリストIDごとに
永続的データストアに保存する。
すでに保存されていた動画もあるだろうがそれは新規には記録しなくてよい。

## 既知の動画であることのインジケータの表示

各動画アイテムには id="engagement-bar" という要素があるので、
すでに収集済みであった動画であるか、
新しく収集した動画であるか、
が分かるようなインジケーターを表示する。

