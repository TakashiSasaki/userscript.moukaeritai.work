# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, HTML sample preprocessing, and **shared technical knowledge base**.

## Mandatory Version Bumping

**Every single change** made to the userscript (`gemini-auto-scroll.user.js`), regardless of its size or scope, **MUST** be accompanied by a version bump in the script's metadata header. This ensures that users receive updates via their userscript manager's auto-update feature.

## Technical Specification for Gemini Auto-Scroll

### 1. Verification Logic
- **Install Check**: usage of `installCheckHosts` and `installCheckSuffixes` to dispatch `userscript-check-installed`.
  - This allows the landing page (`userscript.moukaeritai.work`) to detect if the script is active.

### 2. Auto-Scroll Logic & Robustness
- **Sidebar Visibility**: The script strictly checks `isSidebarVisible()` (checking `visibility` and `offsetWidth > 100`) before attempting to scroll. This prevents unnecessary background processing when the sidebar is collapsed.
- **Scroll Throttling**: Resets `scrollTop` to a high value every 500ms when enabled.
- **Critical Errors**: Monitors `mat-snack-bar-container` for loading errors. If found, it disables auto-scroll and alerts the user.

### 3. Glassmorphic UI (v0.2.27+)
- **Refactored Design**: Moved from a panel with a title bar to a unified floating "pill" widget.
- **Styling**: Uses `backdrop-filter: blur(12px)` for glassmorphism.
- **Draggable Unified Card**: The entire widget is draggable via the header or the minimized icon.
- **Minimize State**: Supports a compact circle mode (`.minimized`) which displays an icon. State is persisted in `localStorage` (`gemini_auto_scroll_minimized`).
- **Interactive Feedback**: Button text and background colors change based on whether the action is running, processing, or blocked by a closed sidebar.
