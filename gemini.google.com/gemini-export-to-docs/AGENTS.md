# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

## Technical Implementation Notes (for Agents)

### 1-Turn Auto Export & Delete
- **Detection**: Uses a polling mechanism in `initMainFunctionality` (500ms interval, up to 5s) to wait for Gemini's asynchronous rendering of the chat history.
- **Selectors**:
  - Use **tag names** (e.g., `model-response`, `message-content`) instead of class names for turn detection and button injection, as classes like `.model-response` can be missing in some Gemini UI versions.
  - User messages are identified by the `user-query` tag.
- **Performance**: The main DOM scanning function (`processNodes`) is debounced by 500ms to prevent high CPU usage during AI response streaming.
- **Inter-script Communication**: Dispatches a `gemini-one-click-delete:request-delete` CustomEvent to trigger conversation deletion.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.
