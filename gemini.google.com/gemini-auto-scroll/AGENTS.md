# HTML Preprocessing Guidelines for Agents

To keep the DOM snapshots manageable and useful for development, follow these preprocessing steps when adding or updating HTML files in this project:

## Recommended Tool
Use the script located at `youtube.com/samples/preprocess.py`.

## Preprocessing steps implemented in the script:
1.  **Remove Script and Style Tags**: Delete all `<script>` and `<style>` elements to reduce noise and file size.
2.  **Clean SVGs**: Remove the children of `<svg>` elements while keeping the tag itself.
3.  **Remove Empty Attributes**: Delete empty `style=""` attributes.
4.  **Remove Empty Comments**: Remove comments that are empty or contain only whitespace (e.g., `<!-- -->`).
5.  **Normalize Whitespace**:
    -   Replace all consecutive whitespace characters (spaces, tabs, newlines) within text nodes with a single space.
    -   Perform a final global pass to collapse all redundant whitespace across the entire document.
6.  **Truncate Text Nodes**: Limit the length of any text node to a maximum of **99 characters**. Truncated text should be appended with `...[TRUNCATED]`.

## Usage
Run the following command from the project root:
```powershell
python youtube.com/samples/preprocess.py path/to/your/file.html
```
