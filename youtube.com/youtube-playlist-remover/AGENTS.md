# Agent Guidelines for YouTube Playlist Remover

This document outlines specific rules and implementation details for `youtube-playlist-remover.user.js`.

## 1. Core Philosophy: Safe & Fast

*   **Safety First**: Never delete what the user cannot see.
    *   **Filter Coexistence**: You **MUST** check if an item is hidden (`display: none`) by the Filter script. If it is hidden, it is **NOT** a candidate for removal, regardless of its position.
    *   **Viewport**: Only remove items that are "Above" the viewport (scrolled past). Do not remove items currently visible to the user.
*   **Speed Second**: Use "Optimistic UI" patterns. Provide immediate feedback even for slow backend operations.

## 2. Implementation Details

### Optimistic UI Removal
When the "Remove Above" action is triggered:
1.  **Immediate Visual Feedback**: Remove the element from the DOM immediately (`item.remove()`).
2.  **Background Processing**: Await the actual API interaction (`attemptRemoveVideo`).
3.  **Rationale**: This allows the user to perceive the action as "instant" and prevents UI blocking during bulk operations.

### UI Design Language
*   **Distinct Style**: Use a **Reddish** color scheme (Background: `#fff0f0`, Border: `#d00`) for the Remover panel.
*   **Purpose**: This visual distinction is critical to prevent users from confusing it with the Filter panel (which uses a neutral Grey scheme).

## 3. Maintenance
*   **Versioning**: Follow the strict versioning policy defined in the root `AGENTS.md`. Any change requires a patch bump.

## 4. Sample Files for Debugging

The following files contain DOM snapshots for debugging and verification. They are located in the `samples/` directory:

*   **`samples/div-menu.html`**: The structure of the three-dot menu button (`#menu.ytd-playlist-video-renderer`) on a video item.
*   **`samples/dropdown.html`**: The DOM fragment of the popup menu (`ytd-menu-popup-renderer`) that appears when the three-dot button is clicked.
*   **`samples/whole-dom-with-dropdown.html`**: A full page snapshot containing both the playlist items and the active dropdown menu.

### Preprocessing Procedure

To keep the repository clean and manageable, sample HTML files should be preprocessed using the following rules:

1.  **Remove Script and Style Tags**: Delete all `<script>` and `<style>` elements and their contents.
2.  **Clear SVG Content**: Keep `<svg>` tags but remove all child elements (like `<path>`) to drastically reduce file size.
3.  **Minified Formatting**:
    - Place each HTML tag on its own line.
    - Remove all leading whitespace (indentation) from the start of each line.
    - Remove extra empty lines.
4.  **Remove HTML Comments**: Delete all `<!-- ... -->` blocks.

### Environment Compatibility

*   **Tool Preference**: In Windows environments where standard Unix tools like `grep` may be unavailable, **use Python scripts** for text processing, analysis, and transformation tasks.



