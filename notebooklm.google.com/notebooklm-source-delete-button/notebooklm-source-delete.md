notebooklm-source-delete.user.js は NotebookLM のソースから
ソースを簡単に削除できるようなUIを付けるものですが、
その前にまずはソースに連番を表示するような機能を実装してください。

初期バージョンは 0.1.0から始めてください。
ユーザースクリプトを少しでも変更したときは必ずパッチレベルをバンプアップしてください。

/workspaces/userscript.moukaeritai.work/youtube.com/youtube-playlist-scroller/youtube-playlist-scroller.user.js などを参考に、バージョンチェックのためのAPIも実装してください。

NotebookLMはSPAですから、https://notebooklm.google.com/ 全体でこのユーザースクリプトをインストールしますが、このユーザースクリプトの主要機能は https://notebooklm.google.com/notebook/8ec783fb-c7cc-46a9-bcdb-3b8fad89b41c のようなURLで有効になるようにしてください。それ以外のURLではユーザースクリプトによるパフォーマンスの低下が生じないように留意してください。