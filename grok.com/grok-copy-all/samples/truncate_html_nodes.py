from bs4 import BeautifulSoup
import sys
import os

def truncate_text_nodes(file_path, max_length=999):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')
        
        text_nodes = soup.find_all(string=True)
        count = 0
        
        for text_node in text_nodes:
            if len(text_node) > max_length:
                # Truncate and keep the original object reference if possible, 
                # or replace the string content. 
                # In BS4, modifying the string in place:
                text_node.replace_with(text_node[:max_length])
                count += 1
                
        print(f"Truncated {count} text nodes to max {max_length} characters.")
        
        # Save back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
            
        print(f"Successfully saved modified HTML to {file_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python truncate_html_nodes.py <path_to_html_file> [max_length]")
    else:
        file_path = sys.argv[1]
        length = int(sys.argv[2]) if len(sys.argv) > 2 else 999
        truncate_text_nodes(file_path, length)
