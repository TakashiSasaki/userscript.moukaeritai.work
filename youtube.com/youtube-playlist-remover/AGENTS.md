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
