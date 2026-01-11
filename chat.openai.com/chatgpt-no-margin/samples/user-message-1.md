# DOM Analysis: User Message

## Overview
This document analyzes the DOM structure of a user message in ChatGPT.

## 1. Context & Location
*   **Location:** Direct child of the main chat stream container.
*   **Type:** `article` element representing a single turn from the `user`.
*   **Presence:** Always present for each user input in the chat history.

## 2. Structure Hierarchy

### Root Element
*   **Tag:** `article`
*   **Selector:** `article[data-turn="user"]`
*   **Key Attributes:**
    *   `data-testid="conversation-turn-5"`: Unique turn ID.
    *   `data-turn="user"`: Explicitly identifies this as a user message.
    *   `class`: Contains global layout variables like `[--thread-content-max-width:40rem]`.

### Layout & Width Control
*   **Container:** `div.mx-auto.max-w-(--thread-content-max-width)`
    *   This inner container restricts the message width.
    *   The variable `[--thread-content-max-width]` is defined inline (e.g., `40rem` or `48rem` at larger breakpoints).

### Message Bubble
*   **Selector:** `div.user-message-bubble-color`
*   **Attributes:**
    *   `max-w-[var(--user-chat-width,70%)]`: This specifically limits the bubble width relative to the parent container.
*   **Content:** `div.whitespace-pre-wrap` contains the actual text.

### Action Buttons (Hover Menu)
*   **Location:** `div.z-0.flex.justify-end` (sibling to the message content).
*   **Behavior:** Uses opacity transition (`opacity-0` to `opacity-100` on hover/focus via `group-hover/turn-messages`).
*   **Buttons:**
    *   Copy: `button[aria-label="コピーする"]`
    *   Edit: `button[aria-label="メッセージを編集する"]`

## 3. Detection & Observation

### Observer Strategy
*   **Target:** Main chat stream container.
*   **Config:** `{ childList: true, subtree: true }`
*   **Logic:**
    *   Detect addition of `article[data-turn="user"]`.
    *   Since these are static once rendered (unless edited), simple detection is sufficient.

## 4. Key CSS Variables for "No Margin" / Resizing

To widen the user message, two layers need adjustment:
1.  **Turn Width:** The `article` or its direct child wrapper uses `--thread-content-max-width`.
    *   *Action:* Override this to `100%` or a larger value.
2.  **Bubble Width:** The bubble itself is capped by `--user-chat-width` (defaulting to 70%).
    *   *Action:* Override `--user-chat-width` if you want the bubble to stretch further across the wider container.

## 5. Selection Strategy
*   **User Turn:** `article[data-turn="user"]`
*   **Message Text:** `article[data-turn="user"] div[data-message-author-role="user"] div.whitespace-pre-wrap`
