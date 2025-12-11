import sys
import os

def remove_empty_lines(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Filter out lines that are empty or contain only whitespace
        non_empty_lines = [line for line in lines if line.strip()]

        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(non_empty_lines)
            
        print(f"Successfully processed {file_path}: Removed {len(lines) - len(non_empty_lines)} empty/whitespace lines.")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_empty_lines.py <filename>")
        sys.exit(1)

    remove_empty_lines(sys.argv[1])
