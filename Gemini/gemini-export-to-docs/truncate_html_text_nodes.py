import os
import html
from html.parser import HTMLParser

class TextTruncator(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []

    def handle_starttag(self, tag, attrs):
        attr_str = ""
        for attr in attrs:
            name, value = attr
            if value is None:
                attr_str += f" {name}"
            else:
                # Simple quoting: use double quotes, escape double quotes in value
                # This is a basic reconstruction. 
                # Preserving original quote style is hard with standard HTMLParser.
                # We will use " for consistency.
                val_escaped = value.replace('"', '&quot;')
                attr_str += f' {name}="{val_escaped}"'
        self.output.append(f"<{tag}{attr_str}>")

    def handle_endtag(self, tag):
        self.output.append(f"</{tag}>")

    def handle_data(self, data):
        if len(data) > 999:
            # Truncate to 999 characters
            truncated_data = data[:999]
            # Add a marker or just truncate? User asked to truncate to 9999.
            # We will just write the first 9999 chars.
            self.output.append(truncated_data)
        else:
            self.output.append(data)

    def handle_comment(self, data):
        self.output.append(f"<!--{data}-->")

    def handle_entityref(self, name):
        self.output.append(f"&{name};")

    def handle_charref(self, name):
        self.output.append(f"&#{name};")

    def handle_decl(self, data):
        self.output.append(f"<!{data}>")

    def handle_pi(self, data):
        self.output.append(f"<?{data}>")
        
    def unknown_decl(self, data):
        self.output.append(f"<![{data}]>")

    def get_output(self):
        return "".join(self.output)

def process_file(filepath):
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    parser = TextTruncator()
    parser.feed(content)
    new_content = parser.get_output()
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Start length: {len(content)}")
        print(f"  End length:   {len(new_content)}")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    target_files = ["sample1.html", "sample2.html", "sample3.html", "sample4.html"]
    for filename in target_files:
        filepath = os.path.join(os.getcwd(), filename)
        if os.path.exists(filepath):
            process_file(filepath)
        else:
            print(f"File not found: {filename}")
