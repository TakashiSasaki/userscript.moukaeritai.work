import re
import sys
import os

def remove_comments(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove HTML comments
        # This regex handles multi-line comments
        content = re.sub(r'<!--[\s\S]*?-->', '', content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Successfully removed comments from {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_comments.py <filename>")
        sys.exit(1)

    remove_comments(sys.argv[1])
