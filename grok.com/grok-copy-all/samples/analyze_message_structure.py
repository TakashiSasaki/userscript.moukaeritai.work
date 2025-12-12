from bs4 import BeautifulSoup
import sys
import os
import re

def analyze_message_structure(file_path):
    """
    Analyzes the DOM structure of a Grok conversation page to find patterns
    that distinguish user messages from model responses.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find all copy buttons
        copy_buttons = soup.find_all('button', attrs={'aria-label': re.compile(r'(コピー|Copy)', re.IGNORECASE)})
        
        print(f"Found {len(copy_buttons)} copy buttons")
        
        for i, btn in enumerate(copy_buttons):
            print(f"\n--- Copy Button {i+1} ---")
            
            # Walk up the DOM to find the message container
            parent = btn
            message_container = None
            for _ in range(20):  # Search up to 20 levels
                parent = parent.parent
                if parent is None:
                    break
                
                # Look for distinctive classes or attributes
                if parent.get('class'):
                    classes = ' '.join(parent.get('class'))
                    
                    # Check for message bubble or response container patterns
                    if 'message-bubble' in classes or 'response-content' in classes:
                        message_container = parent
                        print(f"  Found message container: {parent.name}")
                        print(f"  Classes: {classes[:200]}...")
                        
                    # Look for alignment classes that might indicate user vs model
                    if 'items-end' in classes:
                        print(f"  -> Likely USER message (aligned right/end)")
                    elif 'items-start' in classes:
                        print(f"  -> Likely MODEL message (aligned left/start)")
                    
                    # Check for background color classes
                    if 'bg-surface-l1' in classes:
                        print(f"  -> Has bg-surface-l1 (user bubble style)")
                    
                    # Check for rounded corners that might differ
                    if 'rounded-br-lg' in classes:
                        print(f"  -> Has rounded-br-lg (user message style)")
                    
                    # Check container width patterns
                    if 'max-w-[100%]' in classes or 'max-w-[90%]' in classes:
                        print(f"  -> Limited width bubble (likely user)")
                    elif 'max-w-none' in classes:
                        print(f"  -> Full width (likely model)")
                        
            # Try to get some text content near the button
            if message_container:
                text_content = message_container.get_text(strip=True)[:100]
                print(f"  Text preview: {text_content}...")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_message_structure.py <path_to_html_file>")
    else:
        analyze_message_structure(sys.argv[1])
