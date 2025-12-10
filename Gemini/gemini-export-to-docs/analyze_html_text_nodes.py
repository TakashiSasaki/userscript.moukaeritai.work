import os
from html.parser import HTMLParser
import collections

class TextNodeAnalyzer(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_nodes = []

    def handle_data(self, data):
        stripped_data = data.strip()
        if stripped_data:
            self.text_nodes.append(len(stripped_data))

def analyze_file(filepath):
    print(f"Analyzing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    parser = TextNodeAnalyzer()
    parser.feed(content)
    
    if not parser.text_nodes:
        print("  No text nodes found.")
        return

    max_length = max(parser.text_nodes)
    total_nodes = len(parser.text_nodes)
    avg_length = sum(parser.text_nodes) / total_nodes
    
    print(f"  Max Text Node Length: {max_length}")
    print(f"  Total Text Nodes: {total_nodes}")
    print(f"  Average Length: {avg_length:.2f}")
    
    # Simple distribution
    buckets = collections.defaultdict(int)
    for length in parser.text_nodes:
        if length < 10: buckets['0-9'] += 1
        elif length < 100: buckets['10-99'] += 1
        elif length < 1000: buckets['100-999'] += 1
        elif length < 10000: buckets['1000-9999'] += 1
        else: buckets['10000+'] += 1
        
    print("  Distribution:")
    for key in ['0-9', '10-99', '100-999', '1000-9999', '10000+']:
        print(f"    {key}: {buckets[key]}")
    print("-" * 30)

if __name__ == "__main__":
    target_files = ["sample1.html", "sample2.html", "sample3.html", "sample4.html"]
    for filename in target_files:
        filepath = os.path.join(os.getcwd(), filename)
        if os.path.exists(filepath):
            analyze_file(filepath)
        else:
            print(f"File not found: {filename}")
