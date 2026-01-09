import os
import glob
import re
from bs4 import BeautifulSoup

# Target directory
TARGET_DIR = os.path.dirname(os.path.abspath(__file__))

def process_html_file(file_path):
    print(f"Processing: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse HTML
    # using 'lxml' for speed and leniency, or 'html.parser' if lxml fails
    try:
        soup = BeautifulSoup(content, 'lxml')
    except Exception:
        soup = BeautifulSoup(content, 'html.parser')
    
    # Remove script and style elements
    for element in soup(["script", "style"]):
        element.decompose()
        
    # Get the string representation of the cleaned HTML
    cleaned_html = str(soup)
    
    # Reformat: No indentation, one tag per line
    # Normalize newlines first
    cleaned_html = cleaned_html.replace("\r\n", "\n").replace("\r", "\n")
    
    # Split by tags
    tokens = re.split(r'(<[^>]+>)', cleaned_html)
    
    final_output = []
    for token in tokens:
        if not token:
            continue
        # Strip whitespace from each token (tag or text)
        stripped = token.strip()
        if stripped:
            final_output.append(stripped)
            
    final_content = "\n".join(final_output)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(final_content)

def main():
    html_files = glob.glob(os.path.join(TARGET_DIR, "*.html"))
    for html_file in html_files:
        process_html_file(html_file)

if __name__ == "__main__":
    main()
