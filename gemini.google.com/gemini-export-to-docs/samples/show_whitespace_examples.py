import sys
from html.parser import HTMLParser

# Void elements that do not have a closing tag
VOID_TAGS = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
    'link', 'meta', 'param', 'source', 'track', 'wbr'
}

class WhitespaceNodeExampleCollector(HTMLParser):
    def __init__(self, max_examples=10):
        super().__init__()
        self.tag_stack = []
        self.examples = []
        self.max_examples = max_examples

    def handle_starttag(self, tag, attrs):
        if tag not in VOID_TAGS:
            self.tag_stack.append(tag)

    def handle_endtag(self, tag):
        if tag not in VOID_TAGS:
            if self.tag_stack and self.tag_stack[-1] == tag:
                self.tag_stack.pop()
            else:
                if tag in self.tag_stack:
                    while self.tag_stack and self.tag_stack[-1] != tag:
                        self.tag_stack.pop()
                    self.tag_stack.pop()

    def handle_data(self, data):
        # Only collect whitespace-only nodes
        if not data.strip() and len(self.examples) < self.max_examples:
            parent = self.tag_stack[-1] if self.tag_stack else 'root'
            self.examples.append({
                'parent': parent,
                'content': data,
                'length': len(data)
            })

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python show_whitespace_examples.py <filename>")
        sys.exit(1)

    file_path = sys.argv[1]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        parser = WhitespaceNodeExampleCollector(max_examples=20)
        parser.feed(content)

        print("Examples of Whitespace-Only Text Nodes:")
        print("=" * 80)
        
        for i, example in enumerate(parser.examples, 1):
            print(f"\nExample {i}:")
            print(f"  Parent Tag: {example['parent']}")
            print(f"  Length: {example['length']} characters")
            print(f"  Content (repr): {repr(example['content'])}")

    except Exception as e:
        print(f"Error: {e}")
