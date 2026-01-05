# AGENTS.md

## Development Policy for `gemini-turn-counter`

This project is a port of the `chatgpt-turn-counter` userscript to the Google Gemini platform.

### Design Philosophy
1.  **Parity**: Aim for feature parity with `chatgpt-turn-counter` where applicable.
    -   Turn counting (User/Model)
    -   Character counting
    -   UI interaction (Collapsed Icon -> Expanded Panel)
2.  **Adaptability**: Gemini's DOM structure differs from ChatGPT. We must verify selectors carefully.
    -   Use `samples/` directory to store HTML snapshots of Gemini's interface for testing selectors.
3.  **Simplicity**: Start with core turn counting. Add complex features (like image extraction or code block counting) in subsequent iterations if DOM complexity permits.

### Reference
-   **Source Project**: `chatgpt-turn-counter` (located in `../../chat.openai.com/chatgpt-turn-counter/`)
-   **Key Logic**:
    -   `MutationObserver` to watch for new messages.
    -   `getTextContentLength` for accurate character counts (ignoring HTML tags).
    -   Floating UI with toggle state.

### File Structure
-   `gemini-turn-counter.user.js`: The main script.
-   `gemini-turn-counter.md`: The design and specification document.
-   `samples/`: Directory for DOM snapshots (to be created).
