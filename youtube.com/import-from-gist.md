このドキュメント import-from-gist.md は
youtube-playlist-saaver.user.js というYouTubeのプレイリストの情報をローカルに保存するユーザースクリプトに
おいて、既存の情報をネット上から取り込む機能についての説明である。

データフォーマットは v0（バージョン記載用のプロパティすらない初期バージョン）, v1, v2　があり得るが、
どれでも取り込めるようにする。

ネット上の場所を示すURLは
https://gist.githubusercontent.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca/raw/gistfile1.txt
のような Gist 無いに記録されたファイルの raw URL を想定している。


当該Gistのメインページ
https://gist.github.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca


特定リビジョンのRaw URL
https://gist.githubusercontent.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca/raw/fa54bef4cba572610b3863f5a5b3d3652c65013c/gistfile1.txt

最新リビジョンのRaw URL
https://gist.githubusercontent.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca/raw/gistfile1.txt

上記の例におけるGist IDは2181ed9eab0deace58a5a4090f5202caということになる。

ユーザーは特定リビジョンのRaw URLもしくは最新リビジョンのRaw URLを与える可能性があるが、
前者が与えられたとしても後者に読み替えてURLを保存する。
常に最新リビジョンのものにしか興味がないためである。

インポート、エクスポート関連のメニューとしては
１）GistのRAW URLを与えると、そこからデータをフェッチして取り込むためのメニュー項目
３）すでにGistのRAW　URLが与えられている場合、Gist のメインページを別タブで開くメニュー項目
４）クリップボードに、ローカルのデータストアの内容をコピーするメニュー項目

