# AGENTS.md file

## このリポジトリに関する予備知識
- このリポジトリではTamperMonekyやGreaseMonkeyで使用するユーザースクリプトを開発しています。
- リポジトリのURL git@github.com:TakashiSasaki/world
- ブランチ名は userscript
- HTTPのURLは https://github.com/TakashiSasaki/world/tree/userscript

## Github URLに関する予備知識
- リモートのリポジトリやサブモジュールのURLとして git@github.com: で始まるURLが指定されていることが多いが
  環境によってはHTTPSでしかアクセスできないことがある。
  そのような場合には 次のコマンドラインでURLの先頭部分を読み替える。
  git config --global url."https://github.com/".insteadOf "git@github.com:"

## Github の認証に関する予備知識
- HTTPSでGithubで認証するときにはgh auth loginであらかじめログインしておく必要がある。
- gh auth status で現在の認証の状態を確認することができる。
- GITHUB_TOKEN 環境変数に認可トークンが保存されている場合はそれが優先して使われる。
- GITHUB_TOKEN に入っている認可トークンはそのアクセス範囲が限定されている場合がある。
- だから GITHUB_TOKEN があってもどんなリポジトリに対してもアクセスできるとは限らない。
- GITHUB_TOKEN を unset して gh auth login しなおす必要がある。
