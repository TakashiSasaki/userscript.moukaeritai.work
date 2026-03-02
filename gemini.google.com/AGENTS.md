# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

## Environment-Specific Rules

### gemini.google.com
- User scripts for `gemini.google.com` must include `// @noframes` in their metadata.
- This prevents scripts from loading twice (once in the main window and once in the internal `/_/bscframe` iframe), ensuring consistent initialization of UI elements and observers.
