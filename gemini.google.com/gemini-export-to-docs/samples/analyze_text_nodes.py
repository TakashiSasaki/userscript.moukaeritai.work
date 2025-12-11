import os
from bs4 import BeautifulSoup
import collections

# File path
file_path = 'sample1.html'

def analyze_text_parents(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    parent_counts = collections.Counter()
    max_lengths = collections.defaultdict(int)

    # Iterate over all text nodes
    for string in soup.find_all(string=True):
        # We perform analysis on text nodes. 
        # Usually purely whitespace nodes are ignored in such analysis unless specified otherwise.
        content = string.strip()
        if content: 
            parent = string.parent
            if parent:
                # Use the tag name
                parent_name = parent.name
                parent_counts[parent_name] += 1
                length = len(content)
                if length > max_lengths[parent_name]:
                    max_lengths[parent_name] = length

    print(f"Analysis of text nodes in {file_path}")
    print("-" * 65)
    print(f"{'Parent Tag':<20} | {'Count':<10} | {'Max Length':<15}")
    print("-" * 65)
    
    sorted_counts = parent_counts.most_common()
    
    for tag, count in sorted_counts:
        max_len = max_lengths[tag]
        print(f"{tag:<20} | {count:<10} | {max_len:<15}")

    if not sorted_counts:
        print("No text nodes found (excluding whitespace).")

if __name__ == "__main__":
    analyze_text_parents(file_path)
