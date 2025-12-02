# Add Delete Button for Chat Conversations on Claude.ai

This UserScript enhances the Claude.ai interface by adding a convenient delete button for chat conversations.

## Purpose

The primary purpose of this script is to provide users with an easy and direct way to remove their chat conversations on Claude.ai. It streamlines the process of deleting conversations that might otherwise require more steps or are not readily available through the native UI.

## Functionality

1.  **Button Injection**: The script automatically injects a "delete" button (represented by a 🗑️ emoji) next to each chat conversation listed on the Claude.ai chat page.
2.  **Delete Action**: When a user clicks this custom delete button, the script intercepts the action.
3.  **API Call**: It then constructs a DELETE request to the Claude.ai API, using the conversation's unique identifier (UUID) and the active organization ID (retrieved from `localStorage`).
4.  **Confirmation/Feedback**: Upon successful deletion, an alert "Chat conversation deleted successfully!" is displayed. If an error occurs, an appropriate error message is shown.

## Target Website

This UserScript is specifically designed to function on the following URL:

*   `https://claude.ai/chats`

It listens for the page load event and adds the buttons after a short delay to ensure the page content is fully rendered.