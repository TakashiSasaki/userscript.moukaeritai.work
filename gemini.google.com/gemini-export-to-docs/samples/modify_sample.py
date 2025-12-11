import os
import argparse
from bs4 import BeautifulSoup

def modify_html(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    print(f"Reading {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # 1. Remove script and style nodes
    print("Removing script and style tags...")
    for tag_name in ['script', 'style']:
        tags = soup.find_all(tag_name)
        print(f"Found {len(tags)} {tag_name} tags.")
        for tag in tags:
            tag.decompose()

    # 2. Truncate code nodes text to 999 chars
    print("Truncating code tags...")
    code_tags = soup.find_all('code')
    print(f"Found {len(code_tags)} code tags.")
    for code in code_tags:
        text = code.get_text()
        if len(text) > 999:
            # Replace content with truncated text
            code.string = text[:999]

    print(f"Optimization finished. Writing back to {file_path}...")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

    print("Done.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Optimize HTML sample file.')
    parser.add_argument('file_path', help='Path to the HTML file to modify')
    args = parser.parse_args()
    
    modify_html(args.file_path)
