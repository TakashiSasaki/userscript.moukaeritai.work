import re
import sys
import os

def remove_tags(file_paths):
    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Remove script tags and content
            content = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', content, flags=re.IGNORECASE)
            
            # Remove style tags and content
            content = re.sub(r'<style\b[^>]*>[\s\S]*?</style>', '', content, flags=re.IGNORECASE)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            print(f"Successfully processed {file_path}")

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_tags.py <file1> <file2> ...")
        sys.exit(1)

    remove_tags(sys.argv[1:])
