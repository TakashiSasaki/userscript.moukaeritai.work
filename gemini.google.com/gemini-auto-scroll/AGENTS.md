# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, HTML sample preprocessing, and **shared technical knowledge base**.

## Mandatory Version Bumping

**Every single change** made to the userscript (`gemini-auto-scroll.user.js`), regardless of its size or scope, **MUST** be accompanied by a version bump in the script's metadata header. This ensures that users receive updates via their userscript manager's auto-update feature.

## Technical Specification for Gemini Auto-Scroll

### 1. Verification Logic
- **Install Check**: usage of `installCheckHosts` and `installCheckSuffixes` to dispatch `userscript-check-installed`.
  - This allows the landing page (`userscript.moukaeritai.work`) to detect if the script is active.

# Technical Considerations for gemini-auto-scroll.user.js

When modifying or enhancing this userscript, keep the following domain-specific constraints in mind:

### 1. Robust Selectors
Gemini's sidebar relies on `infinite-scroller` and `nav infinite-scroller`. The script uses these to target the scrollable container.

### 2. Auto-Scroll Logic
- Periodically resets `scrollTop` to a high value to trigger the "pull-to-load" behavior of the infinite scroll.
- Monitors for error snackbars. If detected, it **permanently disables** auto-scroll to prevent infinite error loops.
