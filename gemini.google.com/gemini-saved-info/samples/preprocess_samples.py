#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Preprocesses HTML sample files in the current directory according to the standards
outlined in AGENTS.md.
"""
import os
from bs4 import BeautifulSoup, Comment

def preprocess_html_file(file_path):
    """
    Applies the following preprocessing steps to an HTML file:
    1. Removes <script>, <style> tags, and comment nodes.
    2. Removes <meta> and <link> tags from the <head>.
    3. Clears all children from <svg> tags.
    4. Removes attributes with empty string values.
    5. Truncates all text nodes to 999 characters.
    6. Reformats the HTML to a flat structure (one tag/text per line, no indent).
    """
    print(f"Processing {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    soup = BeautifulSoup(content, "html.parser")

    # 1. Removal: <script>, <style>, and comments
    for element in soup.find_all(["script", "style"]):
        element.decompose()
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # 2. Head Cleanup
    if soup.head:
        for element in soup.head.find_all(["meta", "link"]):
            element.decompose()

    # 3. SVG Cleanup
    for svg in soup.find_all("svg"):
        svg.clear()

    # 4. Attribute Cleanup & 5. Text Truncation
    for tag in soup.find_all(True):
        # Attribute cleanup
        tag.attrs = {key: val for key, val in tag.attrs.items() if val != ""}

        # Text truncation (for direct text nodes of the tag)
        for i, child in enumerate(tag.contents):
            if isinstance(child, str) and not isinstance(child, Comment):
                original_text = child.string.strip()
                if original_text:
                    truncated_text = (original_text[:996] + '...') if len(original_text) > 999 else original_text
                    child.replace_with(truncated_text)


    # 6. Reformatting
    # Use prettify and then process it for the one-line-per-tag format
    pretty_html = soup.prettify(formatter="html5")
    reformatted_lines = []
    for line in pretty_html.splitlines():
        stripped_line = line.strip()
        if stripped_line:
            reformatted_lines.append(stripped_line)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(reformatted_lines))
    print(f"Finished processing {file_path}.")


def main():
    """
    Finds and processes all .html files in the script's directory.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for filename in os.listdir(script_dir):
        if filename.endswith(".html"):
            file_path = os.path.join(script_dir, filename)
            preprocess_html_file(file_path)

if __name__ == "__main__":
    main()