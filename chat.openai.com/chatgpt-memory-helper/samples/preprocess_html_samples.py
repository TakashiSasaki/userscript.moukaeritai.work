#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Preprocesses HTML sample files in its directory according to the strategy
defined in AGENTS.md.
"""

import glob
import os
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
            content = f.read()

        # Use lxml for performance and handling of potentially broken HTML.
        soup = BeautifulSoup(content, 'lxml')

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
            empty_attrs = [attr for attr, value in tag.attrs.items() if value == '']
            for attr in empty_attrs:
                del tag[attr]

            # Truncate long text nodes that are direct children
            # We only check for strings that are direct children of the tag
            for child in list(tag.children):
                 if child.name is None and hasattr(child, 'string'): # It's a NavigableString
                    text = child.string.strip()
                    if len(text) > MAX_TEXT_LENGTH:
                        truncated_text = text[:MAX_TEXT_LENGTH] + '...'
                        child.string.replace_with(truncated_text)


        # Get the processed HTML as a single line without indentation
        output_html = soup.prettify(formatter=None)
        output_html = "".join(line.strip() for line in output_html.splitlines())


        # Overwrite the file if content has changed
        if output_html != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(output_html)
            print(f"  -> Modified {filepath}")
        else:
            print(f"  -> No changes needed for {filepath}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")


if __name__ == "__main__":
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Find all .html files in that directory
    html_files = glob.glob(os.path.join(script_dir, '*.html'))

    for f in html_files:
        process_file(f)

    print("\nPreprocessing complete.")
