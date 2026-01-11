# DOM Analysis: User Message with Context (Canvas/Reply)

## Overview
This document analyzes a user message that includes additional context, such as a reference to a previous reply or a specific document (Canvas).

## 1. Context & Location
*   **Location:** Direct child of the main chat stream container.
*   **Type:** `article` element representing a single turn from the `user`.
*   **Variation:** Unlike `user-message-1.html`, this message includes "reply context" or "attachment context" above the bubble.

## 2. Structure Hierarchy

### Root Element
*   **Tag:** `article`
*   **Selector:** `article[data-turn="user"]`
*   **Key Attributes:** `data-turn="user"`, `data-testid="conversation-turn-7"`.

### Layout & Width
*   **Container:** `div.mx-auto.max-w-(--thread-content-max-width)`
    *   Standard centering and width constraint mechanism.

### Contextual Elements (The Difference)
Above the main message bubble, there are additional `div` elements indicating context:

1.  **Reply Context (e.g., "ChatGPT への質問"):**
    *   **Selector:** `div.text-token-text-tertiary.justify-end`
    *   **Content:** Contains an icon (`svg`) and text (`p.line-clamp-3`).
    *   **Purpose:** Indicates what this message is replying to.

2.  **Attachment/Document Context (e.g., "浜岡原発...レポート"):**
    *   **Selector:** `div.text-token-text-tertiary.flex.items-center.justify-end`
    *   **Content:** Contains icons (often document type indicators) and the document title.
    *   **Style:** `me-5 mt-2 mb-2` (margins to align with the bubble).

### Message Bubble
*   **Selector:** `div.user-message-bubble-color`
*   **Attributes:** `max-w-[var(--user-chat-width,70%)]`
*   **Content:** "全てのコメントを反映してください。"

## 3. Detection & Observation

### Observer Strategy
*   **Target:** Main chat stream.
*   **Config:** `{ childList: true, subtree: true }`
*   **Logic:**
    *   Same as standard user messages. The presence of context elements does not change the root selector (`article[data-turn="user"]`).
    *   *Note:* If your script manipulates the bubble's width or position, be aware that these context elements are *siblings* to the bubble container, not children. They align themselves using flexbox (`items-end`).

## 4. Key CSS Variables for "No Margin"
*   **`--thread-content-max-width`**: Controls the `article` width.
*   **`--user-chat-width`**: Controls the bubble width.

*Observation:* The context elements (reply/document info) seem to naturally align to the right (`items-end`, `justify-end`). Expanding the container width should move them further right, keeping them aligned with the message bubble (assuming the bubble also moves or stretches).

## 5. Interaction Emulation
*   No specific interaction required for this element itself.
*   The context elements are generally non-interactive indicators (pointer-events-none on the icon span), though the document link might be clickable in some contexts (here it looks like just a label: `div.text-token-text-tertiary`).

## 6. Selection Strategy
*   **User Turn:** `article[data-turn="user"]`
*   **Context Info:**
    *   Reply: `article[data-turn="user"] .text-token-text-tertiary p`
    *   Attachment: `article[data-turn="user"] .text-token-text-tertiary:not(:has(p))` (heuristically distinguished by lack of `p` tag or specific icon).
