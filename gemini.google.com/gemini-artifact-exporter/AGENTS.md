# AGENTS.md (gemini-artifact-exporter)

## Overview
This directory is dedicated to the development of userscripts related to **Gemini Artifacts**. 
Artifacts in Gemini are likely to be specialized UI components (similar to Claude's Artifacts) that display code, documents, or other structured data in a side panel or dedicated view.

## Preprocessing Standards (HTML Samples)
A `preprocess_samples.py` script has been implemented to clean and standardize DOM snapshots in `samples/`.
Run this script whenever adding new HTML samples.

**Logic Applied:**
1.  **Removal**: `<script>`, `<style>` tags, and HTML comment nodes are completely removed.
2.  **Head Cleanup**: `<meta>` and `<link>` tags within the `<head>` element are removed.
3.  **SVG Cleanup**: `<svg>` tags are kept, but all their child nodes are removed to reduce file size.
4.  **Attribute Cleanup**: Attributes with empty string values (e.g., `style=""`) are removed.
5.  **Text Truncation**: All text nodes are truncated to 999 characters or less to keep file sizes manageable.
6.  **Reformatting**: HTML is reformatted to a flat structure.
    -   **One tag/text node per line**.
    -   **No indentation** (to facilitate easier diffing and searching).

## DOM Analysis Findings

### Key UI Components

#### 1. Files in this Chat (Studio Sidebar) Button
- **Selector**: `button[data-test-id="studio-sidebar-button"]`
- **Attributes**:
    - `aria-label="Toggle studio sidebar"`
    - `mattooltip="Files in this chat"`
- **Function**: Toggles the visibility of the `context-sidebar`.

#### 2. Immersive Panel (Artifact Canvas)
- **Selector**: `immersive-panel`
- **Internal Structure**:
    - `extended-response-panel`: Main container for the response.
    - `toolbar.extended-response-toolbar`: Contains the title and action buttons.
    - `h2.title-text`: The title of the artifact.
    - `versioning-buttons`: Contains undo/redo buttons.
    - `button[data-test-id="close-button"]`: Closes the panel.

#### 3. Context Sidebar (File List)
- **Selector**: `context-sidebar`
- **Dynamic Presence**: Based on analysis of "whole DOM" snapshots, this element is **NOT** present in the DOM when closed. It is dynamically inserted/removed when toggled via the Studio Sidebar button.
- **Close Button**: `button[data-test-id="close-button"]` within `context-sidebar`.
- **Item Structure**:
    - **Container**: `sidebar-immersive-chip` (for text/code artifacts)
    - **Title**: `.immersive-title` (e.g., "般若心経")
    - **Subtitle**: `.immersive-subtitle` (e.g., "Jan 9, 3:58 PM")
    - **Type Indicator**: `mat-icon` inside `.icon-container`
        - `fonticon="article"`: Document/Text
        - `fonticon="code_blocks"`: Code/App
    - **Images**: Located in `generated-images-container` > `generated-image` (structure differs from text/code chips).
- **Interaction**: The `click` event listener seems to be attached to the inner `.container` element, not the `<sidebar-immersive-chip>` host element itself. Scripts should target `.container` for clicks.

### Important Attributes
- **`jslog`**: Contains metadata that often includes conversation IDs and artifact IDs.
    - Example: `BardVeMetadataKey:[...,["c_d2d2e9935f45dd9a_heart_sutra.md",...]]`
    - This can be used to uniquely identify which artifact is currently being viewed or interacted with.

## Implemented Userscript: Batch Export to Docs

**Current Version**: `0.1.10`
**Goal**: Export all "Article" (text) type artifacts to Google Docs.

**Features:**
*   **Batch Processing**: Automatically iterates through all article chips in the sidebar.
*   **Duplicate Prevention**: Uses `GM_setValue` to store signatures (ConversationID + Title + Timestamp) of exported items.
*   **Force Export**: "Force Export All" button allows re-exporting already processed items.
*   **SPA Support**: Detects URL changes via polling (`setInterval`) to inject UI buttons only on conversation pages.
*   **Robustness**:
    *   Re-queries DOM elements before interaction to avoid Stale Element Reference errors.
    *   Implements retry logic for clicks and waits for panel state changes (open/close).
    *   Explicitly closes the panel after each export to ensure a clean state for the next item.

**Workflow:**
1.  **Open Sidebar**: Click `button[data-test-id="studio-sidebar-button"]` (verify if sidebar `context-sidebar` is present first).
2.  **Iterate Items**: Find all `sidebar-immersive-chip` elements within `context-sidebar`.
3.  **Filter**: Select chips where the inner icon is `article` (`mat-icon[fonticon="article"]`).
4.  **Process Each Item (Sequential)**:
    *   **Click Chip**: Click the `.container` element inside the chip to load the artifact.
    *   **Wait**: Wait for the `immersive-panel` to appear and for its title (`h2.title-text`) to match the chip's title.
    *   **Click Share**: Click `button[data-test-id="share-button"]` located in the `immersive-panel` toolbar.
    *   **Wait for Menu**: Wait for `.mat-mdc-menu-panel` containing `button[data-test-id="export-to-docs-button"]` to appear.
    *   **Click Export**: Click `button[data-test-id="export-to-docs-button"]`.
    *   **Wait**: Wait for 5 seconds (approximate time for export request).
    *   **Close Panel**: Click `button[data-test-id="close-button"]` within the `immersive-panel`.
    *   **Wait**: Wait for the panel to disappear before proceeding to the next item.

## Duplicate Prevention Strategy

To avoid exporting the same artifact multiple times (even across sessions), we will use a hybrid approach of **Persistent Storage** and **DOM Marking**.

### 1. Persistence (Tampermonkey Storage)
Since the `context-sidebar` is dynamic (removed from DOM when closed), purely relying on DOM attributes is insufficient.
*   **Method**: Use `GM_setValue` / `GM_getValue`.
*   **Data Structure**: A list or Set of "Exported Signatures".
*   **Signature Generation**: Since explicit IDs might not always be visible on the chip, use a combination of:
    *   **Conversation ID**: Extracted from the URL (e.g., `app/d2d2e99...`).
    *   **Artifact Title**: From `.immersive-title`.
    *   **Timestamp**: From `.immersive-subtitle`.
    *   *Format*: `${ConversationID}|${Title}|${Timestamp}`

### 2. UI Feedback (DOM Marking)
*   **Logic**: When the sidebar loads (and before processing), generate the signature for each chip.
*   **Check**: If the signature exists in storage:
    1.  Add a visual indicator to the chip (e.g., a green checkmark icon, or change background color).
    2.  Add a data attribute (e.g., `data-exported="true"`) to the `sidebar-immersive-chip`.
*   **Action**: The export script should skip any chip with `data-exported="true"`.
*   **On Success**: After a successful export, add the signature to storage and update the DOM element immediately.

## SPA Navigation Handling

Gemini is an SPA where URL changes (e.g., switching between conversations) often occur without a full page reload. Standard `popstate` events may not reliably capture all transitions.

**Implementation Strategy:**
1.  **History API Hook**: Monkey-patch `history.pushState` and `history.replaceState` to detect URL changes immediately.
2.  **Context Verification**: Use a guard function `isConversationPage()` to check if the current pathname matches `app/<id>`.
3.  **UI State Management**: Show the "Export All Docs" trigger button only when on a conversation page. Hide it on the home page or search pages.

## Development Strategy
1. **Preprocessing**: The `samples/whole-dom-with-html.html` is very large (~2.4MB). A `preprocess_samples.py` script is now available to strip script/style tags and reformat the HTML for better analysis.
2. **Selector Stability**: Gemini uses Angular/Material. Many classes are generated (`_ngcontent-ng-...`). Rely on `data-test-id` or stable semantic tags (`action-card`, `message-content`) where possible.
3. **SPA Handling**: Like other Gemini userscripts, expect dynamic URL changes and content loading. Use `MutationObserver` or polling for element detection.
4. **Debugging**: Due to the asynchronous nature of the artifact canvas, verbose logging with timestamps is essential for identifying timing issues or misaligned selectors during batch processing.

## Planned/Future Scripts
- **Artifact Extractor**: Extract content directly from artifact panels.
- **Enhanced Export**: Support for exporting "Artifacts" or "Action Cards" content to Markdown or Google Docs.
