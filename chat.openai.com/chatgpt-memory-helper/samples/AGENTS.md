# Agent開発のためのHTML前処理戦略

DOMの断片を記録した大規模なHTMLファイルを扱う際、ユーザースクリプト開発のためのCSSセレクタ決定に影響を与えずにファイルサイズと複雑さを削減するため、以下の前処理を適用します。

## 1. 属性の削除

セレクタとして利用される可能性のある属性を誤って削除しないよう、属性の削除は最小限に留めます。

- **空の属性値を持つ属性のみを削除:** `style=""` や `class=""` のように、値が空文字列である属性のみを削除の対象とします。これにより、不要な記述を削減しつつ、セレクタの特定に必要な情報は保持します。

## 2. 要素の削除・内部コンテンツのクリア

- **`<head>`要素内の不要な要素を削除:** ユーザースクリプトは通常、ページの`<body>`内の要素を操作します。そのため、`<head>`内に含まれる`<link>`, `<meta>`, `<title>`といった要素は、セレクタの決定に影響しないため削除します。
- **`<script>` および `<style>` 要素の削除:** これらは文書のどこに現れても、画面の表示構造には直接関係しないため削除します。
- **`<svg>` 要素の子要素を削除:** `<svg>` 要素自体は、セレクタとして重要な `class` や `id` を持つことがあるため、削除しません。エージェントがプレースホルダーを実在の要素と誤認し、セレクタの選択を誤る可能性があるため、`<svg>` タグはそのまま維持します。しかし、その子要素である `<path>` や `<g>`, `<use>` などは、詳細な描画データを含みファイルサイズを増大させるため、すべて削除します。これにより、`<svg>` タグの存在と属性は維持しつつ、不要な詳細情報を削減します。
- **HTMLコメントの削除:** `<!-- ... -->` は開発の妨げになる可能性があるため、取り除きます。

## 3. コンテンツの短縮

- **長いテキストノードの短縮:** 要素内の長いテキストや段落は、最初の50文字程度を残して `...` を追記する形で短縮します。これは、特にアプリケーションの構造を定義しないユーザー生成コンテンツに対して有効です。

## 実施例

**処理前:**
```html
<div class="container" style="">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon">
      <use href="/cdn/assets/sprites-core-k5zux585.svg#ac6d36" fill="currentColor"></use>
  </svg>
  <p>これは延々と続く非常に長いテキストです...</p>
</div>
```

**処理後:**
```html
<div class="container">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"></svg>
  <p>これは延々と続く非常に長いテキストです...</p>
</div>
```

この戦略により、生成されるHTMLはより小さく、クリーンになります。同時に、堅牢なユーザースクリプトを開発するために不可欠な構造情報は維持されます。

## 4. 実装

この前処理は、Pythonとライブラリ `BeautifulSoup4` (`bs4`) を用いて実装することを推奨します。必要に応じて、`pip` を使用して追加のモジュールをインストールしてください。

処理後のHTMLは、インデントを含まない単一ラインのファイルとして出力します。インデントはDOMの構造分析には不要であり、これを除去することでファイルの可読性（機械的な）をさらに高めることができます。

この前処理スクリプトは冪等性を持つように設計されており、同じファイルに何度実行しても、常に同じ結果が得られます。

### Python実装例

```python
from bs4 import BeautifulSoup

# ... (HTML content loaded into a 'html_content' variable)

soup = BeautifulSoup(html_content, 'html.parser')

# (Implement the removal/clearing logic here)
# e.g., removing empty attributes, clearing svg children, etc.

# Output without indentation
# Use soup.prettify(formatter=None) to get the output without extra newlines.
output_html = soup.prettify(formatter=None)

# 'output_html' now contains the processed, single-line HTML
```
