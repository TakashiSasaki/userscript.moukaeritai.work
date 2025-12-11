import sys
import os

def remove_empty_lines(file_path):
    """
    Removes lines that are empty or contain only whitespace from a file.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        original_count = len(lines)
        cleaned_lines = [line for line in lines if line.strip()]
        new_count = len(cleaned_lines)
        removed_count = original_count - new_count
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)
            
        print(f"Removed {removed_count} empty/whitespace-only lines.")
        print(f"Successfully saved modified file to {file_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_empty_lines.py <path_to_file>")
    else:
        remove_empty_lines(sys.argv[1])
