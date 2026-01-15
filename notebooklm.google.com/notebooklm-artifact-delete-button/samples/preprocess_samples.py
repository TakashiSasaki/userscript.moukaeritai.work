import os
import re
import glob
from bs4 import BeautifulSoup, Comment, NavigableString, Doctype

def preprocess_html(file_path):
    """
    NotebookLM の DOM スナップショットを AGENTS.md の基準に従って前処理する。
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # 1. タグの削除: <script>, <style>, <iframe>, <noscript>, およびコメント
    for tag in soup(['script', 'style', 'iframe', 'noscript']):
        tag.decompose()

    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # 2. Headのクリーンアップ: <meta> および <link> を削除
    if soup.head:
        for tag in soup.head(['meta', 'link']):
            tag.decompose()

    # 3. SVGのクリーンアップ: <svg> タグは保持し、子ノードをすべて削除
    for svg in soup.find_all('svg'):
        svg.clear()

    # 4. 属性のクリーンアップ & 不要な UI 要素の除去
    angular_attr_pattern = re.compile(r'^(ng-|(_ngcontent|_nghost)-ng-c|cdk-|mat-)')
    ui_labels = [
        "Save to note", 
        "Copy model response to clipboard", 
        "Play", 
        "More", 
        "Copy summary", 
        "Good summary", 
        "Bad summary",
        "Copy",
        "Good response",
        "Bad response",
        "Add source",
        "Submit",
        "Collapse",
        "Customize",
        "Create notebook",
        "Share",
        "Settings",
        "Analytics",
        "toggle-source-panel-button",
        "toggle-studio-panel-button"
    ]

    for element in soup.find_all(True):
        # すでに親要素が削除されている（decomposed）場合はスキップ
        if element.attrs is None:
            continue

        # button 要素とその中身は、分析対象の重要な構造であるため保護する
        if element.name == 'button' or element.find_parent('button'):
            continue

        # aria-label やツールチップ属性から UI ボタンを特定して削除
        attrs_to_check = ['aria-label', 'mattooltip', 'title', 'aria-description', 'class']
        should_remove = False
        for attr in attrs_to_check:
            val = element.get(attr, '')
            if isinstance(val, list):
                val = " ".join(val)
            if any(label.lower() in val.lower() for label in ui_labels):
                should_remove = True
                break
        
        if should_remove:
            element.decompose()
            continue

        # 属性のクリーンアップ
        attrs = dict(element.attrs)
        for attr in attrs:
            val = attrs[attr]
            # 空の属性を削除
            if val == "" or (isinstance(val, list) and len(val) == 0):
                del element.attrs[attr]
            # Angular 固有属性を削除
            elif angular_attr_pattern.match(attr):
                del element.attrs[attr]
            # イベントハンドラを削除
            elif attr.startswith('on'):
                del element.attrs[attr]
            # 不要な jslog 属性を削除
            elif attr == 'jslog':
                del element.attrs[attr]
            # class 属性内の Angular 固有のノイズを削除 (セレクタ選定に不要なもの)
            elif attr == 'class' and isinstance(val, list):
                cleaned_classes = [c for c in val if not (
                    c.startswith('ng-tns-') or 
                    c.startswith('ng-trigger') or
                    c.startswith('ng-animate') or
                    c == 'ng-star-inserted' or 
                    c == '_mat-animation-noopable' or 
                    c.startswith('mat-mdc-button-ripple')
                )]
                if cleaned_classes:
                    element.attrs['class'] = cleaned_classes
                else:
                    del element.attrs['class']

    # 5. テキストの切り詰めとホワイトスペースの正規化
    for text_node in soup.find_all(string=True):
        # 親要素が削除されている場合はスキップ
        if not isinstance(text_node, NavigableString) or text_node.parent is None:
            continue
        
        # button 要素の中のテキストは正規化（スペースの集約）を避ける
        if text_node.parent.name == 'button' or text_node.parent.find_parent('button'):
            if not text_node.strip(): # 改行のみのノードなどは削除して整形を助ける
                text_node.extract()
            continue

        normalized_text = " ".join(text_node.split())
        if not normalized_text:
            text_node.extract()
            continue
        
        if len(normalized_text) > 1000:
            normalized_text = normalized_text[:1000] + "..."
        
        text_node.replace_with(normalized_text)

    # 6. 再フォーマット: 1行1ノード、インデントなし
    output_lines = []
    def walk(node, in_button=False):
        if isinstance(node, Doctype):
            output_lines.append(f"<!DOCTYPE {node}>")
            return

        # 現在のノードが button か、あるいは button の中にあるか
        is_button = getattr(node, 'name', None) == 'button'
        current_in_button = in_button or is_button

        if isinstance(node, NavigableString):
            # button 内なら strip せず、そのままの文字列（前後のスペース含む）を使用する
            content = str(node) if in_button else str(node).strip()
            if content: output_lines.append(content)
            return
        
        if node.name == '[document]': # BeautifulSoup object (root) or leftover tag from bad run
            for child in node.children: walk(child, in_button)
            return

        attrs_str = "".join([f' {k}="{ " ".join(v) if isinstance(v, list) else v}"' for k, v in node.attrs.items()])
        if node.is_empty_element:
            output_lines.append(f"<{node.name}{attrs_str}/>")
        else:
            output_lines.append(f"<{node.name}{attrs_str}>")
            for child in node.children: walk(child, current_in_button)
            output_lines.append(f"</{node.name}>")

    walk(soup)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(output_lines) + "\n")

if __name__ == "__main__":
    for file in glob.glob("*.html"):
        print(f"Processing {file}...")
        preprocess_html(file)