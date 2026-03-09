# Microsoft 365 Copilot Conversation Deleter

A Tampermonkey userscript that adds a floating button to delete the currently active Copilot conversation in Outlook. Optimized for the PWA structure and multi-language support (Japanese/English).

## Features
- **Floating UI**: Stays visible and interactive in the Outlook PWA.
- **Iframe Support**: Automatically searches for chat elements across nested iframes.
- **Sidebar Handling**: Detects and can expand the navigation sidebar to access deletion menus.
- **Dry Run Mode (Safety Toggle)**: 
  - Enabled by default.
  - Highlights the target elements (Expand button, More actions, Delete menu, Confirm button) with a magenta outline instead of clicking them.
  - Logs all findings to the browser console for debugging.
- **Dual Language Support**: Compatible with both Japanese ("削除", "その他") and English ("Delete", "More actions") UI labels.

## How to Use
1. Install the script in Tampermonkey.
2. Navigate to a Copilot conversation in Outlook.
3. Use the **🔍 Test Selectors (Dry)** button.
   - The script will find the active conversation in the sidebar.
   - It will highlight the "More actions" (...) button.
   - *Note*: If the sidebar is collapsed, it will highlight the Expand button first.
4. If highlights appear correctly, uncheck **Dry Run (Safety On)**.
5. Click **🗑️ Delete Chat (REAL)**.
   - The script will automate the clicks up to the final confirmation dialog.
   - For safety, it will highlight the final "Delete" button and ask for your final click.

## Local Files
- [UserScript](file:///d:/github/userscript.moukaeritai.work/outlook.office.com/copilot-conversation-deleter/copilot-conversation-deleter.user.js)
- [Implementation Plan](file:///C:/Users/takas/.gemini/antigravity/brain/8e9ae1f4-b5fb-4916-b7d1-a16112cfde1a/implementation_plan.md)
