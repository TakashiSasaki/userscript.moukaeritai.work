# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

## Technical Learnings
### Conversation List DOM Structure (Feb 2026)
When implementing features that interact with the Gemini conversation list, be aware of the following structural details (observed in `bard-sidenav.html`):

1.  **Container Hierarchy**:
    - The conversation list is roughly located at `conversations-list > .conversations-container`.
    - BEWARE: Broader containers like `side-navigation-content` or `bard-sidenav` also contain the "Gems" (Bot) list. Targeting these broad containers will cause your selectors to pick up Bot items, which can lead to bugs (e.g., incorrect ID logic, sequential numbering artifacts).

2.  **Item Selectors**:
    - **Correct Selector**: `[data-test-id="conversation"]`. Note that this attribute is on an `<a>` tag, not a `<div>`. Do NOT restrict your selector to `div` (e.g., `div[data-test-id="conversation"]` will fail).
    - **Fallback Selector**: `div[jslog*="c_"]`. However, this is risky because Bot items (Gems) also have `jslog` attributes.
    - **Filtering Bots**: If you must use `jslog`, you MUST exclude Bot items. Bot items are distinguished by `data-test-id="item"`.
    - **Recommended Strategy**: Prioritize `[data-test-id="conversation"]`. If falling back to `jslog`, use `:not([data-test-id="item"])`.

3.  **Virtual Scrolling**:
    - Gemini uses virtual scrolling. Only currently visible conversation items exist in the DOM. `document.querySelectorAll` will only return a subset (e.g., ~15 items) of the full history, not the thousands that might exist.
    - Logic that depends on "finding the current item and then finding the next one" must handle cases where the current item is scrolled out of view (unloaded from DOM).

### Best Practices for Selectors
- **Scope Narrowly**: Always try to scope your `querySelectorAll` to `conversations-list` or `.conversations-container` first.
- **Two-Stage Search**: If the specific container isn't found (e.g., due to loading timing), fallback to a document-wide search but apply strict filtering (like excluding `data-test-id="item"`) to avoid noise.
