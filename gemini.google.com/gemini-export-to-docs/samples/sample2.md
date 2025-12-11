# 概要

sample2.html は Gemini のWeb SPAで
表示幅を狭めてスマートフォン向けの表示にしたものである。

# キャンバスからエクスポートするためのボタン

## ボタンのHTML断片

```HTML
<button _ngcontent-ng-c90018870="" matripple="" mat-list-item="" mattooltip="Export to Google Docs as a new document" data-test-id="export-to-docs-button" class="mat-mdc-list-item mdc-list-item mat-mdc-tooltip-trigger list-item-button mat-mdc-list-item-interactive mdc-list-item--with-leading-icon _mat-animation-noopable mat-mdc-list-item-single-line mdc-list-item--with-one-line ng-star-inserted" type="button" jslog="246886;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_5a9fa08b0906365d&quot;,&quot;c_2322526a242d7e29&quot;,null,&quot;rc_9bee6c1bd96b3532&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" aria-disabled="false" aria-describedby="cdk-describedby-message-ng-1-173" cdk-describedby-host="ng-1"><mat-icon _ngcontent-ng-c90018870="" role="img" matlistitemicon="" data-test-id="docs-icon" fonticon="docs" class="mat-icon notranslate mat-mdc-list-item-icon google-symbols mat-ligature-font mat-icon-no-color mdc-list-item__start" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon><span class="mdc-list-item__content"><span _ngcontent-ng-c90018870="" matlistitemtitle="" class="mat-mdc-list-item-title mdc-list-item__primary-text">Export to Docs</span><span class="mat-mdc-list-item-unscoped-content"></span></span><div class="mat-focus-indicator"></div></button>
```

## ボタンのセレクタ

```CSS
#cdk-dialog-1 > mat-action-list > export-to-docs-button > button
```


# 単一のターンでの応答をエクスポートするボタン
このボタンはExport toボタンを押した後に表示される。
ボタンの表面には Export to Docs と表示されている。

## 単一のターンでの応答をエクスポートするボタンのHTML断片

```HTML
<button _ngcontent-ng-c938116539="" matripple="" color="primary" tabindex="0" class="mat-ripple option" jslog="179179;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_68025d585bff4046&quot;,&quot;c_2322526a242d7e29&quot;,null,&quot;rc_e24c92e72abe36aa&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true"><div _ngcontent-ng-c938116539="" class="item-button-content"><div _ngcontent-ng-c938116539="" class="item-button"><mat-icon _ngcontent-ng-c938116539="" role="img" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon></div><span _ngcontent-ng-c938116539="" class="item-label">Export to Docs</span></div></button>
```

## 単一のターンでの応答をエクスポートするボタンのセレクタ
```CSS
#cdk-dialog-3 > actions-bottom-sheet > div > div.options.ng-star-inserted > div > button:nth-child(1)
```

# 単一のターンでの応答をエクスポートするボタンを開くための三点リーダー

## 単一のターンでの応答をエクスポートするボタンを開くための三点リーダーのHTML断片

```HTML
<button _ngcontent-ng-c2587252621="" mat-button="" mattooltip="More" tabindex="0" aria-label="Show more options" data-test-id="more-menu-button" class="mdc-button mat-mdc-button-base mat-mdc-tooltip-trigger icon-button more-button ng-tns-c2587252621-116 mat-mdc-button mat-unthemed _mat-animation-noopable" mat-ripple-loader-class-name="mat-mdc-button-ripple" aria-describedby="cdk-describedby-message-ng-1-161" cdk-describedby-host="ng-1"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><mat-icon _ngcontent-ng-c2587252621="" role="img" fonticon="more_vert" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="more_vert"></mat-icon><span class="mdc-button__label"></span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## 単一のターンでの応答をエクスポートするボタンを開くための三点リーダーのセレクタ

```CSS
#\36 8025d585bff4046 > model-response > div > response-container > div > div.response-container-header.ng-tns-c2587252621-116.ng-star-inserted > div.menu-button-wrapper.ng-tns-c2587252621-116.ng-star-inserted > button
```

# 単一のターンでの応答につけられた三点リーダーを開いた後に表示されるExport toボタン

## 単一のターンでの応答につけられた三点リーダーを開いた後に表示されるExport toボタンのHTML断片

```HTML
<button _ngcontent-ng-c938116539="" matripple="" color="primary" data-test-id="export-button" tabindex="0" class="mat-ripple option ng-star-inserted" jslog="179179;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_61b70e1651ce01f4&quot;,&quot;c_2322526a242d7e29&quot;,null,&quot;rc_5c0376b8d1632ad9&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true"><div _ngcontent-ng-c938116539="" class="item-button-content"><div _ngcontent-ng-c938116539="" class="item-button"><mat-icon _ngcontent-ng-c938116539="" role="img" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon></div><span _ngcontent-ng-c938116539="" class="item-label">Export to...</span><div _ngcontent-ng-c938116539="" class="item-button end-aligned-icon"><mat-icon _ngcontent-ng-c938116539="" role="img" fonticon="arrow_right" class="mat-icon notranslate mat-icon-rtl-mirror google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="arrow_right"></mat-icon></div></div></button>
```

## 単一のターンでの応答につけられた三点リーダーを開いた後に表示されるExport toボタンのセレクタ

```CSS
#cdk-dialog-8 > actions-bottom-sheet > div > div.options.ng-star-inserted > div.initial-menu.ng-star-inserted > button:nth-child(4)
```



# キャンバスを開くためのボタン

## キャンバスを開くためのボタンのHTML断片

```HTML
<button _ngcontent-ng-c2863438294="" mat-flat-button="" data-test-id="view-report-button" aria-labelledby="view-report-button-label" class="mdc-button mat-mdc-button-base mdc-button--unelevated mat-mdc-unelevated-button mat-unthemed _mat-animation-noopable" mat-ripple-loader-class-name="mat-mdc-button-ripple"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"><span _ngcontent-ng-c2863438294="" id="view-report-button-label">Open</span></span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## キャンバスを開くためのボタンのセレクタ

```CSS
#model-response-message-contentr_03d3ae32224a0ca9 > p:nth-child(2) > div > response-element > immersive-entry-chip > div > div.button-section.ng-star-inserted > button
```

# 開かれた後のキャンバスに表示される共有ボタン

この共有ボタンを押すと、Export to Docs というボタンが表示される。

## 開かれた後のキャンバスに表示される共有ボタンのHTML断片

```HTML
<button _ngcontent-ng-c3844507054="" mat-icon-button="" mattooltipposition="below" data-test-id="share-button" class="mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-mdc-tooltip-trigger icon-button share-button mat-unthemed _mat-animation-noopable ng-star-inserted" mat-ripple-loader-class-name="mat-mdc-button-ripple" mat-ripple-loader-centered="" aria-label="Share Canvas" jslog="250628;track:generic_click,impression;BardVeMetadataKey:[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[&quot;c_2322526a242d7e29_my_c_modules/simple_math/README.md&quot;,[1764154334,917638000],&quot;c_2322526a242d7e29&quot;,&quot;r_03d3ae32224a0ca9&quot;,&quot;rc_5075f6d95f9a32fb&quot;]]"><span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span><mat-icon _ngcontent-ng-c3844507054="" role="img" data-test-id="share-icon" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="share" fonticon="share"></mat-icon><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## 開かれた後のキャンバスに表示される共有ボタンのセレクタ

```CSS
#app-root > main > side-navigation-v2 > mat-sidenav-container > mat-sidenav-content > div > div.content-container > chat-window > immersive-panel > extended-response-panel > toolbar > div > div.action-buttons.mobile-layout > div > share-button > button
```