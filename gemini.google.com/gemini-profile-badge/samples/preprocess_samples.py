import os
import glob
from bs4 import BeautifulSoup, NavigableString

def preprocess_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')

    # 1. Remove <script> and <style> elements
    for element in soup(['script', 'style']):
        element.decompose()

    # 2. Remove attributes with empty string values
    for tag in soup.find_all(True):
        attrs_to_remove = [k for k, v in tag.attrs.items() if v == "" or v == [""]]
        for k in attrs_to_remove:
            del tag[k]

    # 3. Truncate text nodes longer than 1000 characters
    for text_node in soup.find_all(string=True):
        if isinstance(text_node, NavigableString):
            if len(text_node) > 1000:
                truncated_text = text_node[:1000]
                text_node.replace_with(truncated_text)

    # Save the processed HTML
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Processed: {file_path}")

def main():
    # Target all .html files in the current directory
    html_files = glob.glob("*.html")
    for html_file in html_files:
        preprocess_html(html_file)

if __name__ == "__main__":
    main()
