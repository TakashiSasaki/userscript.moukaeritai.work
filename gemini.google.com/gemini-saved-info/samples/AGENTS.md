# AGENTS.md (gemini-saved-info)

## Preprocessing Standards (HTML Samples)
A `preprocess_samples.py` script has been implemented to clean and standardize DOM snapshots in `samples/`.
Run this script whenever adding new HTML samples.

**Logic Applied:**
1.  **Removal**: `<script>`, `<style>` tags, and HTML comment nodes are completely removed.
2.  **Head Cleanup**: `<meta>` and `<link>` tags within the `<head>` element are removed.
3.  **SVG Cleanup**: `<svg>` tags are kept, but all their child nodes are removed to reduce file size.
4.  **Attribute Cleanup**: Attributes with empty string values (e.g., `style=""`) are removed.
5.  **Text Truncation**: All text nodes are truncated to 999 characters or less to keep file sizes manageable.
6.  **Reformatting**: HTML is reformatted to a flat structure.
    -   **One tag/text node per line**.
    -   **No indentation** (to facilitate easier diffing and searching).
