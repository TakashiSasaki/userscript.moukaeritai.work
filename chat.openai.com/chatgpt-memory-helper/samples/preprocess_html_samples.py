#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Preprocesses HTML sample files according to the strategy defined in AGENTS.md.

This script takes one or more glob patterns as command-line arguments
and processes all matching files.
"""

import glob
import sys
from bs4 import BeautifulSoup, Comment

# The maximum length of a text node before it's truncated.
MAX_TEXT_LENGTH = 100

def process_file(filepath):
    """
    Applies HTML preprocessing rules to a single file.
    The script is idempotent.

    Args:
        filepath (str): The path to the HTML file.
    """
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Use lxml for performance.
        soup = BeautifulSoup(original_content, 'lxml')

        # --- Apply preprocessing rules ---

        # 1. Remove unnecessary elements
        for tag_name in ['head', 'script', 'style']:
            for tag in soup.find_all(tag_name):
                tag.decompose()

        # 2. Clear SVG content
        for svg in soup.find_all('svg'):
            svg.clear()

        # 3. Remove comments
        for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
            comment.extract()

        # 4. Remove empty attributes and truncate long text nodes
        for tag in soup.find_all(True):
            # Remove empty attributes
            if tag.attrs:
                empty_attrs = [attr for attr, value in tag.attrs.items() if isinstance(value, str) and value == '']
                for attr in empty_attrs:
                    del tag[attr]

            # Truncate long text nodes
            for child in list(tag.children):
                 if child.name is None and hasattr(child, 'string'): # It's a NavigableString
                    text = child.string.strip()
                    if len(text) > MAX_TEXT_LENGTH:
                        truncated_text = text[:MAX_TEXT_LENGTH] + '...'
                        child.string.replace_with(truncated_text)


        # Get pretty-printed HTML, then remove leading whitespace from each line.
        # This gives element-based newlines without indentation.
        pretty_html = soup.prettify()
        # Also remove blank lines that might result from stripping.
        output_html = "\n".join([line.lstrip() for line in pretty_html.splitlines() if line.strip()])


        # Overwrite the file if content has changed
        if output_html != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(output_html)
            print(f"  -> Modified {filepath}")
        else:
            print(f"  -> No changes needed for {filepath}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        patterns = sys.argv[1:]
    else:
        # Default to all .html files in the current directory if no args are provided
        patterns = ['*.html']
        print("No glob patterns provided. Defaulting to '*.html' in the current directory.")

    file_count = 0
    for pattern in patterns:
        for filepath in glob.glob(pattern, recursive=True):
            process_file(filepath)
            file_count += 1
    
    if file_count == 0:
        print("No files found matching the provided patterns.")

    print("\nPreprocessing complete.")