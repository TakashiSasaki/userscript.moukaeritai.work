from bs4 import BeautifulSoup

import os
import sys

def analyze_text_node_lengths(file_path):
    """
    Parses an HTML file, extracts text nodes, and analyzes their length distribution.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract text nodes. We filter out empty or whitespace-only strings
        # to focus on meaningful content, but the user asked for "text node length".
        # Let's collect all, but maybe show stats for non-empty ones primarily.
        
        text_nodes = soup.find_all(string=True)
        
        lengths = [len(text) for text in text_nodes]
        non_empty_lengths = [len(text) for text in text_nodes if text.strip()]
        
        print(f"Total text nodes: {len(lengths)}")
        print(f"Non-empty text nodes: {len(non_empty_lengths)}")
        
        if not lengths:
            print("No text nodes found.")
            return

        print("\n--- All Text Nodes Distribution ---")
        print(f"Min length: {min(lengths)}")
        print(f"Max length: {max(lengths)}")
        print(f"Average length: {sum(lengths) / len(lengths):.2f}")
        
        if non_empty_lengths:
            print("\n--- Non-empty Text Nodes Distribution ---")
            print(f"Min length: {min(non_empty_lengths)}")
            print(f"Max length: {max(non_empty_lengths)}")
            print(f"Average length: {sum(non_empty_lengths) / len(non_empty_lengths):.2f}")

        # Basic histogram/distribution bucket output to console
        print("\n--- Distribution Buckets (All Nodes) ---")
        buckets = {
            "0": 0,
            "1-10": 0,
            "11-50": 0,
            "51-100": 0,
            "101-500": 0,
            "501-1000": 0,
            "1000+": 0
        }
        
        for l in lengths:
            if l == 0:
                buckets["0"] += 1
            elif l <= 10:
                buckets["1-10"] += 1
            elif l <= 50:
                buckets["11-50"] += 1
            elif l <= 100:
                buckets["51-100"] += 1
            elif l <= 500:
                buckets["101-500"] += 1
            elif l <= 1000:
                buckets["501-1000"] += 1
            else:
                buckets["1000+"] += 1
                
        for k, v in buckets.items():
            print(f"{k}: {v}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_html.py <path_to_html_file>")
    else:
        analyze_text_node_lengths(sys.argv[1])
