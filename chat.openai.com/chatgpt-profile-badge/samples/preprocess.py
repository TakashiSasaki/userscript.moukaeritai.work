import sys
from bs4 import BeautifulSoup, NavigableString

def preprocess_html(file_path):
    """
    Preprocesses an HTML file according to the rules in samples.md:
    1. Removes <script> and <style> tags.
    2. Removes empty attributes.
    3. Truncates text nodes longer than 1000 characters.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Rule 2: Remove <script> and <style> elements
    for element in soup.find_all(['script', 'style']):
        element.decompose()

    # Rule 3: Remove empty attributes
    for tag in soup.find_all(True):
        empty_attrs = [attr for attr, value in tag.attrs.items() if isinstance(value, str) and value == '']
        for attr in empty_attrs:
            del tag[attr]

    # Rule 1: Truncate long text nodes
    for text_node in soup.find_all(string=True):
        if len(text_node) > 1000:
            truncated_text = text_node[:1000]
            text_node.replace_with(NavigableString(truncated_text))

    # Overwrite the file with the processed HTML
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <html_file_path>")
        sys.exit(1)
    
    file_to_process = sys.argv[1]
    preprocess_html(file_to_process)
    print(f"Successfully preprocessed {file_to_process}")
