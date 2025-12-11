# sample1.html

sample1.html はデスクトップ表示のDOMのサンプルです。

# 会話メニューの表示ボタン

会話の上の方に会話のタイトルが表示されており、
そこには会話メニューの表示ボタンがあります。
もしかすると会話のタイトルがボタンの表示になっているかもしれません。

## 会話メニューの表示ボタンのHTML断片

```HTML
<button _ngcontent-ng-c3950134108="" aria-label="Open menu for conversation actions." data-test-id="actions-menu-button" class="mat-mdc-menu-trigger mat-mdc-tooltip-trigger conversation-actions-menu-button ng-star-inserted" jslog="298421;track:generic_click,impression" aria-haspopup="menu" aria-expanded="false" aria-describedby="cdk-describedby-message-ng-1-7" cdk-describedby-host="ng-1"><span _ngcontent-ng-c3950134108="" class="conversation-title gds-title-m"> デジタル活用研修 Microsoft365アイディアソン </span><mat-icon _ngcontent-ng-c3950134108="" role="img" data-test-id="actions-menu-icon gds-icon-l" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="keyboard_arrow_down" fonticon="keyboard_arrow_down"></mat-icon></button>
```

## 会話メニューの表示ボタンのセレクタ

```CSS
#app-root > main > top-bar-actions > div > div.center-section > div > conversation-actions > button
``` 

# 削除ボタン

会話メニューを表示すると、削除ボタンが表示されます。
メニューの中には会話のタイトルを変更したりピン止めをしたりピン止めを外したりする他のボタンもあります。

## 削除ボタンのHTML断片

```HTML
<button _ngcontent-ng-c3950134108="" mat-menu-item="" data-test-id="share-button" class="mat-mdc-menu-item mat-focus-indicator ng-star-inserted" jslog="211965;track:generic_click,impression" role="menuitem" tabindex="0" aria-disabled="false"><mat-icon _ngcontent-ng-c3950134108="" role="img" fonticon="share" class="mat-icon notranslate menu-icon google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="share"></mat-icon><span class="mat-mdc-menu-item-text"><span _ngcontent-ng-c3950134108="" class="menu-text"> Share conversation </span></span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button>
```

## 削除ボタンのセレクタ

```CSS
#mat-menu-panel-90 > div > button:nth-child(1)
``` 

# 削除確認ダイアログ

## 削除確認ダイアログのHTML断片

```HTML
<mat-dialog-container tabindex="-1" class="mat-mdc-dialog-container mdc-dialog cdk-dialog-container mdc-dialog--open _mat-animation-noopable mat-mdc-dialog-container-with-actions" id="mat-mdc-dialog-1" role="dialog" aria-modal="false" aria-label="Delete chat"><div class="mat-mdc-dialog-inner-container mdc-dialog__container"><div class="mat-mdc-dialog-surface mdc-dialog__surface"><message-dialog _nghost-ng-c4148115007="" class="mat-mdc-dialog-component-host ng-star-inserted"><h1 _ngcontent-ng-c4148115007="" mat-dialog-title="" data-test-id="message-dialog-title" class="mat-mdc-dialog-title mdc-dialog__title" id="mat-mdc-dialog-title-1">Delete chat?</h1><mat-dialog-content _ngcontent-ng-c4148115007="" class="mat-mdc-dialog-content mdc-dialog__content"><span _ngcontent-ng-c4148115007="" data-test-id="message-dialog-content" class="message-dialog-content"><p data-sourcepos="1:1-1:111">This will delete prompts, responses, and feedback from your Gemini Apps Activity, plus any content you created.</p>
</span><a _ngcontent-ng-c4148115007="" target="_blank" rel="noopener" data-test-id="message-url" externallink="" _nghost-ng-c4160053797="" href="https://support.google.com/gemini?p=deleted_chats" class="ng-star-inserted"><!----><span _ngcontent-ng-c4160053797="" data-test-id="content" class="link-content ng-star-inserted"> Learn more </span><span _ngcontent-ng-c4160053797="" class="cdk-visually-hidden ng-star-inserted"> Opens in a new window </span><!----><!----><!----></a><!----></mat-dialog-content><mat-dialog-actions _ngcontent-ng-c4148115007="" align="end" class="mat-mdc-dialog-actions mdc-dialog__actions mat-mdc-dialog-actions-align-end"><!----><button _ngcontent-ng-c4148115007="" mat-button="" data-test-id="cancel-button" color="primary" class="mdc-button mat-mdc-button-base mat-mdc-button mat-primary _mat-animation-noopable ng-star-inserted" mat-ripple-loader-uninitialized="" mat-ripple-loader-class-name="mat-mdc-button-ripple"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Cancel </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></button><!----><button _ngcontent-ng-c4148115007="" mat-button="" data-test-id="confirm-button" color="primary" class="mdc-button mat-mdc-button-base mat-mdc-button mat-primary _mat-animation-noopable ng-star-inserted" mat-ripple-loader-class-name="mat-mdc-button-ripple" jslog="186009;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_25cb2b86e0dbd988&quot;,null,1]];mutable:true"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Delete </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button><!----></mat-dialog-actions></message-dialog><!----></div></div></mat-dialog-container>
```

## 削除確認ダイアログのセレクタ

```CSS
#mat-mdc-dialog-1
``` 

# 削除確認ボタン

## 削除確認ボタンのHTML断片

```HTML
<button _ngcontent-ng-c4148115007="" mat-button="" data-test-id="confirm-button" color="primary" class="mdc-button mat-mdc-button-base mat-mdc-button mat-primary _mat-animation-noopable ng-star-inserted" mat-ripple-loader-class-name="mat-mdc-button-ripple" jslog="186009;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_25cb2b86e0dbd988&quot;,null,1]];mutable:true"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Delete </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## 削除確認ボタンのセレクタ

```CSS
#mat-mdc-dialog-1 > div > div > message-dialog > mat-dialog-actions > button:nth-child(2)
``` 
