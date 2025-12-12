from bs4 import BeautifulSoup
import sys
import os

def remove_script_tags(file_path):
    """
    Parses an HTML file and removes all <script> tags.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')
        
        script_tags = soup.find_all('script')
        count = len(script_tags)
        
        for script in script_tags:
            script.decompose()
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
            
        print(f"Removed {count} <script> tags.")
        print(f"Successfully saved modified HTML to {file_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_script_tags.py <path_to_html_file>")
    else:
        remove_script_tags(sys.argv[1])
