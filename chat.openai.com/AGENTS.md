# ChatGPT Selector Findings (April 2026)

This document summarizes the current DOM structure and recommended selectors for ChatGPT (chatgpt.com), based on audits conducted in April 2026.

## Structural Changes
ChatGPT has transitioned from `article` tags for conversation turns to `section` tags. Most stable interactions now rely on `data-testid` and `data-turn` attributes.

## Core Selectors

| Entity | Recommended Selector | Notes |
| :--- | :--- | :--- |
| **Conversation Turn (Message Block)** | `section[data-turn]` | Replaces `article`. |
| **Message Author Role** | `[data-message-author-role]` | Values: `"user"`, `"assistant"`. |
| **Prompt Input Box** | `[data-testid="content-editor-container"]` | Outer container for the prompt editor. |
| **Send Button** | `[data-testid="send-button"]` | Extremely stable. |
| **Profile Button** | `[data-testid="accounts-profile-button"]` | Located at the bottom of the sidebar. |
| **History Navigation** | `nav[aria-label="チャット履歴"]` | Outer nav for conversation history. |
| **History List Container** | `#history` | Element containing the list of recent chats. |
| **Canvas Container** | `.ProseMirror` | Inside artifacts/writing blocks. |

## MutationObserver Strategies

- **Large Scale Changes**: Observe `main` or the parent of `#history` for navigation changes.
- **Turn Updates**: Observe the container of `section[data-turn]` (usually a `div` inside `main`).
- **Input State**: Observe `[data-testid="send-button"]` for changes in `disabled` state or visibility ($+$ vs arrow).

## Domain Note
Although the directory is named `chat.openai.com`, these selectors are verified for the `chatgpt.com` domain.
