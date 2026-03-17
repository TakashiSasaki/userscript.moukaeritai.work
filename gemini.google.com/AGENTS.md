# Gemini Domain Agent Guidelines

This document outlines the domain-specific learnings and guidelines for developing user scripts targeting Gemini (gemini.google.com). These rules supplement the global guidelines in the root `AGENTS.md`.

## Gemini (DOM Structure & Selectors)

Learnings from implementing features like Auto-Scroll and Conversation Management (as of Feb 2026):

1.  **Conversation List Hierarchy**:
    -   The list is roughly at `conversations-list > .conversations-container`.
    -   **BEWARE**: Broader containers like `side-navigation-content` or `bard-sidenav` also contain "Gems" (Bot) items. Targeting these broad containers allows selectors to pick up Bot items, causing bugs (e.g., incorrect ID logic, sequential numbering artifacts).

2.  **Item Selectors**:
    -   **Correct Selector**: `[data-test-id="conversation"]`. Note: This attribute is on an `<a>` tag, NOT a `div`. Do NOT restrict your selector to `div` (e.g., `div[data-test-id="conversation"]` will fail).
    -   **Recommended Strategy**: Prioritize `[data-test-id="conversation"]`. If falling back to `jslog` or other attributes, strictly exclude `[data-test-id="item"]` (which usually denotes Bots/Gems).

3.  **Virtual Scrolling**:
    -   Gemini uses virtual scrolling. Only currently visible conversation items exist in the DOM. `document.querySelectorAll` will only return a subset (e.g., ~15 items) of the full history.
    -   Logic that depends on "finding the current item and then finding the next one" must handle cases where the current item has been scrolled out of view and unloaded from the DOM.
