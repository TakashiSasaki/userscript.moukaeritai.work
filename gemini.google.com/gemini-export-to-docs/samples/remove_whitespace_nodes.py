import sys
from bs4 import BeautifulSoup, NavigableString

def remove_whitespace_only_text_nodes(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')
        
        # Find all text nodes
        removed_count = 0
        for element in soup.descendants:
            if isinstance(element, NavigableString):
                # Check if it's whitespace-only
                if element.string and not element.string.strip():
                    # Remove the whitespace-only text node
                    element.extract()
                    removed_count += 1

        # Write back the cleaned HTML
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        
        print(f"Successfully processed {file_path}: Removed {removed_count} whitespace-only text nodes.")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_whitespace_nodes.py <filename>")
        sys.exit(1)

    file_path = sys.argv[1]
    remove_whitespace_only_text_nodes(file_path)
