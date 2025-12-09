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

## ボタンのHTML断片

```HTML
<button _ngcontent-ng-c938116539="" matripple="" color="primary" tabindex="0" class="mat-ripple option" jslog="179179;track:generic_click,impression;BardVeMetadataKey:[[&quot;r_68025d585bff4046&quot;,&quot;c_2322526a242d7e29&quot;,null,&quot;rc_e24c92e72abe36aa&quot;,null,null,&quot;ja&quot;,null,1,null,null,1,1]];mutable:true"><div _ngcontent-ng-c938116539="" class="item-button-content"><div _ngcontent-ng-c938116539="" class="item-button"><mat-icon _ngcontent-ng-c938116539="" role="img" fonticon="docs" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="docs"></mat-icon></div><span _ngcontent-ng-c938116539="" class="item-label">Export to Docs</span></div></button>
```

## ボタンのセレクタ

```CSS
#cdk-dialog-3 > actions-bottom-sheet > div > div.options.ng-star-inserted > div > button:nth-child(1)
```
