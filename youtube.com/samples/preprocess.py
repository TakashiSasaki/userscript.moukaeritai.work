import sys
import os
import re
# Check if bs4 is installed, if not hint to install it.
try:
    from bs4 import BeautifulSoup, Comment
except ImportError:
    print("BeautifulSoup4 not found. Please install it with: pip install beautifulsoup4")
    sys.exit(1)

def preprocess_html(file_path):
    print(f"Processing {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # 5. Remove script tags
    print("Removing script tags...")
    for script in soup.find_all('script'):
        script.decompose()

    # 6. Remove style tags
    print("Removing style tags...")
    for style in soup.find_all('style'):
        style.decompose()

    # 4. SVG: remove children
    print("Cleaning SVGs...")
    for svg in soup.find_all('svg'):
        svg.clear() 

    # 2. Remove style="" attributes
    print("Removing empty style attributes...")
    for tag in soup.find_all(True):
        if 'style' in tag.attrs:
            if isinstance(tag.attrs['style'], str):
                if tag.attrs['style'].strip() == "":
                    del tag.attrs['style']
            # BS4 sometimes parses style as list if configured? Usually string. 
            # Safe check handled implicitly.

    # 3. Remove empty or whitespace-only comments
    print("Removing empty comments...")
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        if not comment.strip():
            comment.decompose()

    # 1. Truncate text nodes > 99 chars and normalize whitespace
    print("Truncating long text nodes and normalizing whitespace...")
    for text in soup.find_all(string=True):
        if isinstance(text, Comment):
            continue 
        
        # Normalize whitespace in the node
        normalized_text = re.sub(r'\s+', ' ', text)
        
        if len(normalized_text) > 99:
            text.replace_with(normalized_text[:99] + '...[TRUNCATED]')
        else:
            text.replace_with(normalized_text)

    # Secondary pass: Collapse whitespace in the entire document string
    content = str(soup)
    print("Performing final whitespace collapse...")
    content = re.sub(r'\s+', ' ', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.strip())
    print("Done.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python preprocess.py <file_path>")
        sys.exit(1)
    
    target_file = sys.argv[1]
    if os.path.exists(target_file):
        preprocess_html(target_file)
    else:
        print(f"File not found: {target_file}")
