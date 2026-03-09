# Microsoft 365 Copilot Conversation Deleter

A Tampermonkey userscript that adds a floating button to delete the currently active Copilot conversation in Outlook. Optimized for the PWA structure and multi-language support (Japanese/English).

## Features
- **Draggable & Persistent UI**: 
  - The floating container can be moved anywhere on the screen (grab from the background or labels).
  - Position is automatically saved to `localStorage` and persists across sessions.
- **"Next Up" Real-time Indicator**:
  - Displays the title of the conversation that will be auto-selected after specialized deletion.
  - Updates in real-time as you navigate your sidebar.
  - Correctly handles dividers and nested list structures for high reliability.
- **Auto-Navigation (Post-Deletion)**:
  - After a successful deletion, the script automatically focuses and clicks the identified "Next Up" chat.
  - Includes a retry strategy to ensure the new conversation actually loads in the main area.
- **"Deleting..." State**: Provides visual feedback on the button and disables interaction until the deletion process is fully confirmed and the item removed.
- **Version Tracking**: Mouseover the button or labels to see the current script version in a tooltip.

## How to Use
1. Install the script in Tampermonkey.
2. Navigate to a Copilot conversation in Outlook.
3. Observe the **"Next Up"** label to see which chat is queued for the next action.
4. Use the **🔍 Test Selectors (Dry)** button to verify the script can find the "More" button and correct menu items.
5. Uncheck **Dry Run** and click **🗑️ Delete Chat (REAL)**.
6. The script will:
   - Match the sidebar title with the confirmation dialog.
   - Execute the deletion.
   - Transition the UI to a waiting state.
   - Automatically navigate to the next conversation once the previous one is gone.

## Local Files
- [UserScript](file:///d:/github/userscript.moukaeritai.work/outlook.office.com/copilot-conversation-deleter/copilot-conversation-deleter.user.js)
- [Walkthrough & Demos](file:///C:/Users/takas/.gemini/antigravity/brain/8e9ae1f4-b5fb-4916-b7d1-1a16112cfde1a/walkthrough.md)
- [AGENTS.md (Technical Notes)](file:///d:/github/userscript.moukaeritai.work/outlook.office.com/copilot-conversation-deleter/AGENTS.md)
