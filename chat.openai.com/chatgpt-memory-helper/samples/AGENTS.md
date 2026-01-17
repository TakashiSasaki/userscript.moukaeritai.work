このユーザースクリプトは https://chatgpt.com/#settings/Personalization を対象としている。
ChatGPTはSPAなのでユーザースクリプトはドメイン全体でインストールするが、
実際にこのスクリプトの機能が使われるのは https://chatgpt.com/#settings/Personalization だけである。
したがってアドレスバーの変化やブラウザのHistory APIにより、
https://chatgpt.com/#settings/Personalization にいることを検知し、
その他のURLではパフォーマンスに影響を与えないようにする必要がある。
