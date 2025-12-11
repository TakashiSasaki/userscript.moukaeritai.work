import sys
from html.parser import HTMLParser
from collections import defaultdict

# Void elements that do not have a closing tag
VOID_TAGS = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
    'link', 'meta', 'param', 'source', 'track', 'wbr'
}

class TextNodeAnalyzer(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tag_stack = []
        # Key: parent tag name
        # Value: {'count': int, 'max_length': int}
        self.stats = defaultdict(lambda: {'count': 0, 'max_length': 0})

    def handle_starttag(self, tag, attrs):
        if tag not in VOID_TAGS:
            self.tag_stack.append(tag)

    def handle_endtag(self, tag):
        if tag not in VOID_TAGS:
            # Try to match the closing tag with the last opened tag
            if self.tag_stack and self.tag_stack[-1] == tag:
                self.tag_stack.pop()
            else:
                # Handle mismatched tags crudely: search down the stack
                # If found, pop everything up to it. If not, ignore (treat as stray closing)
                if tag in self.tag_stack:
                    while self.tag_stack and self.tag_stack[-1] != tag:
                        self.tag_stack.pop()
                    self.tag_stack.pop() # pop the matching tag

    def handle_data(self, data):
        # Ignore whitespace-only text nodes
        stripped_data = data.strip()
        if not stripped_data:
            return
            
        if not self.tag_stack:
            return # Text outside of any tag
        
        parent = self.tag_stack[-1]
        length = len(data) # Use original length including whitespace for consistency with previous requests
        
        self.stats[parent]['count'] += 1
        if length > self.stats[parent]['max_length']:
            self.stats[parent]['max_length'] = length

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_detailed.py <filename>")
        sys.exit(1)

    file_path = sys.argv[1]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        parser = TextNodeAnalyzer()
        parser.feed(content)

        print(f"{'Parent Tag':<25} | {'Count':<10} | {'Max Length':<15}")
        print("-" * 56)
        
        # Sort by max length descending
        sorted_stats = sorted(parser.stats.items(), key=lambda x: x[1]['max_length'], reverse=True)
        
        for tag, stat in sorted_stats:
            print(f"{tag:<25} | {stat['count']:<10} | {stat['max_length']:<15}")

    except Exception as e:
        print(f"Error: {e}")
