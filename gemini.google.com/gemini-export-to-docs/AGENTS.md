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

### Horizontal 1-Turn Action Bar
- **Draggable Handle**: The bar's far left element (marked with `⠿`) acts as a drag handle. Uses `mousedown`, `mousemove`, and `mouseup` on `document` to handle dragging.
- **Persistence**: Saves the current `top` and `left` coordinates to `gemini-export-panel-pos` using `GM_setValue` upon `mouseup`.
- **Auto-Delete Toggle**: Saves the state of the auto-delete checkbox to `gemini-export-auto-delete-toggle` via `GM_setValue` to persist user preference.
- **Initial Positioning**: On load, it checks for `gemini-export-panel-pos` and applies it to the panel's style. Defaults to `bottom: 20px; right: 20px;`.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.
