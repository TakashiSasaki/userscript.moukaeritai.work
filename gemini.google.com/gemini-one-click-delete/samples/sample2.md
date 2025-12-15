# sample2.html

sample2.html はモバイル表示のDOMのサンプルです。

# 会話メニューの表示ボタン

## 会話メニューの表示ボタンのHTML断片

```HTML
<button _ngcontent-ng-c3950134108="" aria-label="Open menu for conversation actions." data-test-id="actions-menu-button" class="mat-mdc-menu-trigger mat-mdc-tooltip-trigger conversation-actions-menu-button ng-star-inserted" jslog="298421;track:generic_click,impression" aria-expanded="false" aria-describedby="cdk-describedby-message-ng-1-93" cdk-describedby-host="ng-1"><span _ngcontent-ng-c3950134108="" class="conversation-title gds-title-m"> アユ密漁、７１歳男を摘発 </span><mat-icon _ngcontent-ng-c3950134108="" role="img" data-test-id="actions-menu-icon gds-icon-l" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="keyboard_arrow_down" fonticon="keyboard_arrow_down"></mat-icon></button>
```

## 会話メニューの表示ボタンのセレクタ

```CSS
#app-root > main > top-bar-actions > div > div.center-section > div > conversation-actions > button
``` 

# 会話メニューのダイアログ
会話メニューはダイアログ上の要素として表示されるようです。
その中に削除ボタンがあります。
削除ボタン以外にも会話のタイトルを変更するためのボタンなども配置されています。

# 会話メニューのダイアログのHTML断片

```HTML
<mat-bottom-sheet-container tabindex="-1" class="mat-bottom-sheet-container cdk-dialog-container mat-bottom-sheet-container-enter" id="cdk-dialog-0" role="dialog" aria-modal="false"><mat-action-list _ngcontent-ng-c3974650293="" role="group" class="mat-mdc-action-list mat-mdc-list-base mdc-list ng-star-inserted" aria-disabled="false"><button _ngcontent-ng-c3974650293="" mat-list-item="" data-test-id="pin-button" class="mat-mdc-list-item mdc-list-item mat-mdc-list-item-interactive mdc-list-item--with-leading-icon _mat-animation-noopable mat-mdc-list-item-single-line mdc-list-item--with-one-line ng-star-inserted" type="button" jslog="186001;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_88c945fe50aa348c&quot;,null,0]]" aria-disabled="false"><mat-icon _ngcontent-ng-c3974650293="" role="img" matlistitemicon="" fonticon="push_pin" class="mat-icon notranslate mat-mdc-list-item-icon conversation-action-icon google-symbols mat-ligature-font mat-icon-no-color mdc-list-item__start" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="push_pin"></mat-icon><span class="mdc-list-item__content"><span _ngcontent-ng-c3974650293="" matlistitemtitle="" class="mat-mdc-list-item-title mdc-list-item__primary-text"> Pin </span><span class="mat-mdc-list-item-unscoped-content"></span></span><div class="mat-focus-indicator"></div></button><!----><!----><button _ngcontent-ng-c3974650293="" mat-list-item="" data-test-id="rename-button" class="mat-mdc-list-item mdc-list-item mat-mdc-list-item-interactive mdc-list-item--with-leading-icon _mat-animation-noopable mat-mdc-list-item-single-line mdc-list-item--with-one-line" type="button" jslog="186002;track:generic_click,impression" aria-disabled="false"><mat-icon _ngcontent-ng-c3974650293="" role="img" matlistitemicon="" fonticon="edit" class="mat-icon notranslate mat-mdc-list-item-icon conversation-action-icon google-symbols mat-ligature-font mat-icon-no-color mdc-list-item__start" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="edit"></mat-icon><span class="mdc-list-item__content"><span _ngcontent-ng-c3974650293="" matlistitemtitle="" class="mat-mdc-list-item-title mdc-list-item__primary-text"> Rename </span><span class="mat-mdc-list-item-unscoped-content"></span></span><div class="mat-focus-indicator"></div></button><button _ngcontent-ng-c3974650293="" mat-list-item="" data-test-id="share-button" class="mat-mdc-list-item mdc-list-item mat-mdc-list-item-interactive mdc-list-item--with-leading-icon _mat-animation-noopable mat-mdc-list-item-single-line mdc-list-item--with-one-line ng-star-inserted" type="button" jslog="211965;track:generic_click,impression" aria-disabled="false"><mat-icon _ngcontent-ng-c3974650293="" role="img" matlistitemicon="" fonticon="forward" class="mat-icon notranslate mat-mdc-list-item-icon google-symbols mat-ligature-font mat-icon-no-color mdc-list-item__start" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="forward"></mat-icon><span class="mdc-list-item__content"><span _ngcontent-ng-c3974650293="" matlistitemtitle="" class="mat-mdc-list-item-title mdc-list-item__primary-text"> Share </span><span class="mat-mdc-list-item-unscoped-content"></span></span><div class="mat-focus-indicator"></div></button><!----><!----><button _ngcontent-ng-c3974650293="" mat-list-item="" data-test-id="delete-button" class="mat-mdc-list-item mdc-list-item mat-mdc-list-item-interactive mdc-list-item--with-leading-icon _mat-animation-noopable mat-mdc-list-item-single-line mdc-list-item--with-one-line ng-star-inserted" type="button" jslog="186000;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_88c945fe50aa348c&quot;,null,0]];mutable:true" aria-disabled="false"><mat-icon _ngcontent-ng-c3974650293="" role="img" matlistitemicon="" fonticon="delete" class="mat-icon notranslate mat-mdc-list-item-icon conversation-action-icon google-symbols mat-ligature-font mat-icon-no-color mdc-list-item__start" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="delete"></mat-icon><span class="mdc-list-item__content"><span _ngcontent-ng-c3974650293="" matlistitemtitle="" class="mat-mdc-list-item-title mdc-list-item__primary-text"> Delete </span><span class="mat-mdc-list-item-unscoped-content"></span></span><div class="mat-focus-indicator"></div></button><!----></mat-action-list><!----></mat-bottom-sheet-container>
```

# 会話メニューのダイアログのセレクタ

```CSS
#cdk-dialog-0
```     

# 削除ボタン

## 削除ボタンのHTML断片

```HTML
<button _ngcontent-ng-c3974650293="" mat-list-item="" data-test-id="delete-button" class="mat-mdc-list-item mdc-list-item mat-mdc-list-item-interactive mdc-list-item--with-leading-icon _mat-animation-noopable mat-mdc-list-item-single-line mdc-list-item--with-one-line ng-star-inserted" type="button" jslog="186000;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_88c945fe50aa348c&quot;,null,0]];mutable:true" aria-disabled="false"><mat-icon _ngcontent-ng-c3974650293="" role="img" matlistitemicon="" fonticon="delete" class="mat-icon notranslate mat-mdc-list-item-icon conversation-action-icon google-symbols mat-ligature-font mat-icon-no-color mdc-list-item__start" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="delete"></mat-icon><span class="mdc-list-item__content"><span _ngcontent-ng-c3974650293="" matlistitemtitle="" class="mat-mdc-list-item-title mdc-list-item__primary-text"> Delete </span><span class="mat-mdc-list-item-unscoped-content"></span></span><div class="mat-focus-indicator"></div></button>
```

## 削除ボタンのセレクタ

```CSS
#cdk-dialog-0 > mat-action-list > button:nth-child(4)
``` 

# 削除確認ダイアログ

## 削除確認ダイアログのHTML断片

```HTML
<div class="mat-mdc-dialog-surface mdc-dialog__surface"><message-dialog _nghost-ng-c4148115007="" class="mat-mdc-dialog-component-host ng-star-inserted"><h1 _ngcontent-ng-c4148115007="" mat-dialog-title="" data-test-id="message-dialog-title" class="mat-mdc-dialog-title mdc-dialog__title" id="mat-mdc-dialog-title-3">Delete chat?</h1><mat-dialog-content _ngcontent-ng-c4148115007="" class="mat-mdc-dialog-content mdc-dialog__content"><span _ngcontent-ng-c4148115007="" data-test-id="message-dialog-content" class="message-dialog-content"><p data-sourcepos="1:1-1:111">This will delete prompts, responses, and feedback from your Gemini Apps Activity, plus any content you created.</p>
</span><a _ngcontent-ng-c4148115007="" target="_blank" rel="noopener" data-test-id="message-url" externallink="" _nghost-ng-c4160053797="" href="https://support.google.com/gemini?p=deleted_chats" class="ng-star-inserted"><!----><span _ngcontent-ng-c4160053797="" data-test-id="content" class="link-content ng-star-inserted"> Learn more </span><span _ngcontent-ng-c4160053797="" class="cdk-visually-hidden ng-star-inserted"> Opens in a new window </span><!----><!----><!----></a><!----></mat-dialog-content><mat-dialog-actions _ngcontent-ng-c4148115007="" align="end" class="mat-mdc-dialog-actions mdc-dialog__actions mat-mdc-dialog-actions-align-end"><!----><button _ngcontent-ng-c4148115007="" mat-button="" data-test-id="cancel-button" color="primary" class="mdc-button mat-mdc-button-base mat-mdc-button mat-primary _mat-animation-noopable ng-star-inserted" mat-ripple-loader-uninitialized="" mat-ripple-loader-class-name="mat-mdc-button-ripple"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Cancel </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></button><!----><button _ngcontent-ng-c4148115007="" mat-button="" data-test-id="confirm-button" color="primary" class="mdc-button mat-mdc-button-base mat-mdc-button mat-primary _mat-animation-noopable ng-star-inserted" mat-ripple-loader-uninitialized="" mat-ripple-loader-class-name="mat-mdc-button-ripple" jslog="186009;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_c43b95186f2fac73&quot;,null,0]];mutable:true"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Delete </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></button><!----></mat-dialog-actions></message-dialog><!----></div>
```

## 削除確認ダイアログのセレクタ

```CSS
#mat-mdc-dialog-3 > div > div
``` 

# 削除確認ボタン

## 削除確認ボタンのHTML断片

```HTML
<button _ngcontent-ng-c4148115007="" mat-button="" data-test-id="confirm-button" color="primary" class="mdc-button mat-mdc-button-base mat-mdc-button mat-primary _mat-animation-noopable ng-star-inserted" mat-ripple-loader-class-name="mat-mdc-button-ripple" jslog="186009;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,[&quot;c_c43b95186f2fac73&quot;,null,0]];mutable:true"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Delete </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## 削除確認ボタンのセレクタ

```CSS
#mat-mdc-dialog-3 > div > div > message-dialog > mat-dialog-actions > button:nth-child(2)
```
