# Agent Implementation Notes: ChatGPT Auto Prompt Sender

## 1. Project Overview
- **Goal**: Automate sending of pre-filled prompts after ChatGPT finishes generating a response.
- **Mechanism**: Monitors DOM changes to detect when the "Send" button becomes available or when generation stops.

## 2. Selectors (Legacy)
- The current implementation relies on selectors from late 2023 (`div:has(>form.stretch)`, `div.absolute.right-2`, `button.absolute`).
- **Action Required**: These selectors are likely outdated. Future updates should verify and update these selectors to match the current ChatGPT DOM (e.g., `[data-testid="send-button"]`).

## 3. UI Indicators
- **Yellow Background**: Indicates the toggle element is found.
- **Red Textarea Background**: Indicates auto-send is ENABLED.

## 4. Maintenance
- If the script fails to work, check if `div:has(>form.stretch)` still exists.
- Ensure `MutationObserver` is observing the correct container.