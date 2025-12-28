import sys
import os
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

    # 1. Truncate text nodes > 1000 chars
    print("Truncating long text nodes...")
    for text in soup.find_all(string=True):
        if isinstance(text, Comment):
            continue # 3. Keep comments
        if len(text) > 1000:
            text.replace_with(text[:1000] + '...[TRUNCATED]')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
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
