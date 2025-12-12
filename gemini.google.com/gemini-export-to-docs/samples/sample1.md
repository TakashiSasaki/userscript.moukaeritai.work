# 概要

sample1.html はPC表示をした際のGeminiのウェブSPAのHTMLである。
本ドキュメントでは、ユーザースクリプトの操作対象となる主要なエクスポート関連ボタン（キャンバス上のボタンおよび各ターンごとのダイアログ内のボタン両方を含む）について記述する。

# キャンバスからドキュメントをエクスポートするためのボタン

## ボタンのHTML断片

```HTML
<button _ngcontent-ng-c90018870="" mat-menu-item="" data-test-id="export-to-docs-button" class="mat-mdc-menu-item mat-focus-indicator menu-item-button ng-star-inserted" role="menuitem" tabindex="0" aria-disabled="false"><mat-icon _ngcontent-ng-c90018870="" role="img" data-test-id="docs-icon" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon><span class="mat-mdc-menu-item-text"> Export to Docs </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button>
```

## ボタンのセレクタ

```
#mat-menu-panel-32 > div > export-to-docs-button > button
```


# 特定のターンの応答をエクスポートするためのボタン (バリエーション1)

## ボタンのHTML断片

```HTML
<button _ngcontent-ng-c868837921="" mat-menu-item="" tabindex="0" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c868837921-27 ng-star-inserted" data-test-id="double-check-menu-button" jslog="173901;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_9d6dc3573ce1352a&quot;,&quot;c_fb761ae7e0d758f1&quot;,null,&quot;rc_55258fb9c729f9be&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" role="menuitem" aria-disabled="false"><mat-icon _ngcontent-ng-c868837921="" role="img" fonticon="rule" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="rule"></mat-icon><span class="mat-mdc-menu-item-text"> Double-check response </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button>```

## ボタンのセレクタ

```
#mat-menu-panel-36 > div > div > button:nth-child(1)
```

# 特定のターンの応答をエクスポートするためのボタン (バリエーション2)

## ボタンのHTML断片
```
<button _ngcontent-ng-c868837921="" mat-menu-item="" tabindex="0" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c868837921-28 ng-star-inserted" data-test-id="double-check-menu-button" jslog="173901;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_ebe0669ba2399ebe&quot;,&quot;c_fb761ae7e0d758f1&quot;,null,&quot;rc_1ac1915a71b3c6f4&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" role="menuitem" aria-disabled="false"><mat-icon _ngcontent-ng-c868837921="" role="img" fonticon="rule" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="rule"></mat-icon><span class="mat-mdc-menu-item-text"> Double-check response </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button>
```
## ボタンのセレクタ

```
#mat-menu-panel-38 > div > div > button:nth-child(1)
```


# 特定のターンの応答をエクスポートするためのボタンを表示するための三点リーダー

## 特定のターンの応答をエクスポートするためのボタンを表示するための三点リーダーのHTML断片

```HTML
<button _ngcontent-ng-c868837921="" mat-button="" mattooltip="More" aria-label="Show more options" tabindex="0" data-test-id="more-menu-button" class="mdc-button mat-mdc-button-base mat-mdc-menu-trigger mat-mdc-tooltip-trigger icon-button more-menu-button ng-tns-c868837921-267 mat-mdc-button mat-unthemed _mat-animation-noopable" mat-ripple-loader-class-name="mat-mdc-button-ripple" aria-haspopup="menu" aria-expanded="false" aria-describedby="cdk-describedby-message-ng-1-189" cdk-describedby-host="ng-1"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><mat-icon _ngcontent-ng-c868837921="" role="img" fonticon="more_vert" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="more_vert"></mat-icon><span class="mdc-button__label"></span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button>
```

## 特定のターンの応答をエクスポートするためのボタンを表示するための三点リーダーのセレクタ

```
#\38 05eec89927b8e41 > model-response > div > response-container > div > div.response-container-footer.ng-tns-c2587252621-244 > message-actions > div > div > div:nth-child(4) > div > div > button
```

# 三点リーダーを押すと表示されるダイアログ

三点リーダーを押すとExport to DocsやDraft in Gmailというボタンを含むダイアログが表示される。この中のExport to Docsボタンも操作対象である。

## 三点リーダーを押すと表示されるダイアログのHTML断片

```HTML
<div id="cdk-overlay-17" class="cdk-overlay-pane" style="position: static;"><div tabindex="-1" role="menu" class="mat-mdc-menu-panel mat-menu-above mat-menu-after mat-menu-panel-animations-disabled ng-star-inserted" id="mat-menu-panel-133" style="transform-origin: left bottom;"><div class="mat-mdc-menu-content"><div><!----><!----><!----><!----><!----><!----><!----><!----><button _ngcontent-ng-c3554312936="" mat-menu-item="" aria-label="Text to speech" tabindex="0" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c3554312936-26 ng-star-inserted" jslog="184512;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_3df141dd8e633aa5&quot;,&quot;c_56d3d89ca30742a6&quot;,null,&quot;rc_45cb37632b4e656b&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" role="menuitem" aria-disabled="false"><mat-icon _ngcontent-ng-c3554312936="" role="img" fonticon="volume_up" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="volume_up"></mat-icon><span class="mat-mdc-menu-item-text"><span _ngcontent-ng-c3554312936="" class="ng-tns-c3554312936-26 ng-star-inserted">Listen</span><!----><!----></span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button><!----><button _ngcontent-ng-c3554312936="" mat-menu-item="" aria-label="Export to Docs" tabindex="0" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c3554312936-26 ng-star-inserted" jslog="179179;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_3df141dd8e633aa5&quot;,&quot;c_56d3d89ca30742a6&quot;,null,&quot;rc_45cb37632b4e656b&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" role="menuitem" aria-disabled="false"><mat-icon _ngcontent-ng-c3554312936="" role="img" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon><span class="mat-mdc-menu-item-text"> Export to Docs </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button><!----><button _ngcontent-ng-c3554312936="" mat-menu-item="" aria-label="Draft in Gmail" tabindex="0" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c3554312936-26 ng-star-inserted" jslog="179180;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_3df141dd8e633aa5&quot;,&quot;c_56d3d89ca30742a6&quot;,null,&quot;rc_45cb37632b4e656b&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" role="menuitem" aria-disabled="false"><mat-icon _ngcontent-ng-c3554312936="" role="img" fonticon="gmail" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="gmail"></mat-icon><span class="mat-mdc-menu-item-text">Draft in Gmail </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button><!----><!----><!----><!----><!----><a _ngcontent-ng-c3554312936="" mat-menu-item="" aria-label="Report legal issue" target="_blank" rel="noopener" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c3554312936-26 ng-star-inserted" href="https://support.google.com/legal/troubleshooter/1114905?uraw=r_3df141dd8e633aa5#ts=1115658%2C13380504" jslog="176292;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_3df141dd8e633aa5&quot;,&quot;c_56d3d89ca30742a6&quot;,null,&quot;rc_45cb37632b4e656b&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true" role="menuitem" tabindex="0" aria-disabled="false"><mat-icon _ngcontent-ng-c3554312936="" role="img" fonticon="flag" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="flag"></mat-icon><span class="mat-mdc-menu-item-text"> Report legal issue </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></a><!----><mat-divider _ngcontent-ng-c3554312936="" role="separator" class="mat-divider ng-tns-c3554312936-26 mat-divider-horizontal ng-star-inserted" aria-orientation="horizontal"></mat-divider><div _ngcontent-ng-c3554312936="" mat-menu-item="" aria-label="Model name" tabindex="-1" disabled="true" class="mat-mdc-menu-item mat-focus-indicator ng-tns-c3554312936-26 ng-star-inserted" role="menuitem" aria-disabled="true"><mat-icon _ngcontent-ng-c3554312936="" role="img" fonticon="spark" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="spark"></mat-icon><span class="mat-mdc-menu-item-text"> Model: 3 Pro </span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></div><!----><!----><!----></div><!----></div></div></div>
```

## 三点リーダーを押すと表示されるダイアログのセレクタ

```
#cdk-overlay-17
``` 
