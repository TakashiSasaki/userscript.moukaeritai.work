# sample3.html は何か？

これは、GeminiのWeb SPAで、ウィンドウ幅を狭くしてモバイルデバイス用表示にしたものです。

# ターンごとの応答につけられた三点リーダー

## ターンごとの応答につけられた三点リーダーのHTML断片の例
```HTML
<button _ngcontent-ng-c2563771715="" mat-button="" mattooltip="More" tabindex="0" aria-label="Show more options" data-test-id="more-menu-button" class="mdc-button mat-mdc-button-base mat-mdc-tooltip-trigger icon-button more-button ng-tns-c2563771715-204 mat-mdc-button mat-unthemed _mat-animation-noopable" mat-ripple-loader-class-name="mat-mdc-button-ripple" aria-describedby="cdk-describedby-message-ng-1-247" cdk-describedby-host="ng-1"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><mat-icon _ngcontent-ng-c2563771715="" role="img" fonticon="more_vert" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="more_vert"></mat-icon><span class="mdc-button__label"></span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## ターンごとの応答につけられた三点リーダーのセレクタの例

```CSS
#\31 0f0f780885b4efa > model-response > div > response-container > div > div.presented-response-container.ng-tns-c2563771715-204 > div.response-container-content.ng-tns-c2563771715-204.has-thoughts.is-mobile > div.menu-button-wrapper.ng-tns-c2563771715-204.ng-star-inserted > button.mdc-button.mat-mdc-button-base.mat-mdc-tooltip-trigger.icon-button.more-button.ng-tns-c2563771715-204.mat-mdc-button.mat-unthemed._mat-animation-noopable
```

# Export to メニューボタンの表示

三点リーダーをクリックすると、メニューが表示され、
その中に Export to ボタンがあります。

## Export to メニューボタンのHTML断片の例
```HTML
<button _ngcontent-ng-c301345108="" matripple="" color="primary" data-test-id="export-button" tabindex="0" class="mat-ripple option ng-star-inserted" jslog="179179;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_22875031e2338ff8&quot;,&quot;c_62e380bf01a600ee&quot;,null,&quot;rc_930ab8f63edfb94c&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true"><div _ngcontent-ng-c301345108="" class="item-button-content"><div _ngcontent-ng-c301345108="" class="item-button"><mat-icon _ngcontent-ng-c301345108="" role="img" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon></div><span _ngcontent-ng-c301345108="" class="item-label">Export to...</span><div _ngcontent-ng-c301345108="" class="item-button end-aligned-icon"><mat-icon _ngcontent-ng-c301345108="" role="img" fonticon="arrow_right" class="mat-icon notranslate mat-icon-rtl-mirror google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="arrow_right"></mat-icon></div></div></button>
```

## Export to メニューボタンのセレクタの例
```CSS
#cdk-dialog-2 > actions-bottom-sheet > div > div.options.ng-star-inserted > div.initial-menu.ng-star-inserted > button:nth-child(4)
```

# Export to Docs ボタン

Export to メニューボタンをクリックすると、
Gmailの下書きを作るボタンとGoogle Docsにエクスポートするボタンを含むメニューが表示されます。
後者のボタンには Export to Docs と表示されています。

## Export to Docs ボタンのHTML断片の例
```HTML
<button _ngcontent-ng-c301345108="" matripple="" color="primary" tabindex="0" class="mat-ripple option" jslog="179179;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_22875031e2338ff8&quot;,&quot;c_62e380bf01a600ee&quot;,null,&quot;rc_930ab8f63edfb94c&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true"><div _ngcontent-ng-c301345108="" class="item-button-content"><div _ngcontent-ng-c301345108="" class="item-button"><mat-icon _ngcontent-ng-c301345108="" role="img" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon></div><span _ngcontent-ng-c301345108="" class="item-label">Export to Docs</span></div></button>
```

## Export to Docs ボタンのセレクタの例
```CSS
#cdk-dialog-3 > actions-bottom-sheet > div > div.options.ng-star-inserted > div > button:nth-child(1)
```
