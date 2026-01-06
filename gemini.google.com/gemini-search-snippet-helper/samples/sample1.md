# sample1.html

Geminiの Web SPAにある会話検索機能を使って検索した結果が表示されているDOM。
ここに表示されている会話タイトルをクリックするとその会話が開くが、
できれば新しいタブで開くようにしたい。

# 会話一つ分の検索結果

search-snippet という要素に会話一つ分の検索結果が入っていて、
それが縦にたくさん並んでいる。

## 会話一つ分の検索結果のHTML断片

```HTML
<search-snippet _ngcontent-ng-c3397873440="" tabindex="0" _nghost-ng-c2506642083="" class="ng-star-inserted">
    <div _ngcontent-ng-c2506642083="" class="snippet-container ng-star-inserted"
        jslog="251350;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[0,null,0]]">
        <div _ngcontent-ng-c2506642083="" class="snippet-content">
            <div _ngcontent-ng-c2506642083="" class="result">
                <div _ngcontent-ng-c2506642083="" class="gds-title-m title">G20高市・メローニ会談レポート</div>
                <div _ngcontent-ng-c2506642083="" class="gds-body-m text">
                    以下のレポートは、提供されたYouTube動画『【速報】メローニ首相、高市首相との初対面を果たし緊急声明を発表する！！！』の内容に基づき作成されました。
                    動画レポート: メローニ首相と高市首相のG20での初対面
                    動画概要:
                    本動画は、ブラジルで開催されたG20サミットにおいて、日本の高市早苗首相とイタリアのジョルジャ・メローニ首相が初めて対面した様子を報じています。動画では、二人の親密な様子やメロ<span
                        class="highlighted-text"></span><span class="highlighted-text"></span><span
                        class="highlighted-text"></span><span class="highlighted-text"></span><span
                        class="highlighted-text"></span><span class="highlighted-text"></span><span
                        class="highlighted-text"></span></div>
            </div>
            <div _ngcontent-ng-c2506642083="" class="gds-body-m date">Nov 23</div>
        </div><!----><!----><!---->
    </div><!---->
</search-snippet>
```

## 会話一つ分の検索結果のセレクタ 

```CSS
#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav-content > div.content-wrapper > div > div.content-container > search-window > div > div.results-scroll-container.ng-star-inserted > infinite-scroller > search-snippet:nth-child(1)
