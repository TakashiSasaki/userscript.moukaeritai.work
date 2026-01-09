# AGENTS.md (gemini-artifacts)

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

### Important Attributes
- **`jslog`**: Contains metadata that often includes conversation IDs and artifact IDs.
    - Example: `BardVeMetadataKey:[...,["c_d2d2e9935f45dd9a_heart_sutra.md",...]]`
    - This can be used to uniquely identify which artifact is currently being viewed or interacted with.

## Proposed Userscript Workflow: Batch Export to Docs

**Goal**: Export all "Article" (text) type artifacts to Google Docs.

**Steps:**
1.  **Open Sidebar**: Click `button[data-test-id="studio-sidebar-button"]` (verify if sidebar `context-sidebar` is present first).
2.  **Iterate Items**: Find all `sidebar-immersive-chip` elements within `context-sidebar`.
3.  **Filter**: Select chips where the inner icon is `article` (`mat-icon[fonticon="article"]`).
4.  **Process Each Item (Sequential)**:
    *   **Click Chip**: Click the chip element to load the artifact into the `immersive-panel`.
    *   **Wait**: Wait for the `immersive-panel` title (`h2.title-text`) to match the chip's title, ensuring load completion.
    *   **Click Share**: Click `button[data-test-id="share-button"]` located in the `immersive-panel` toolbar.
    *   **Wait for Menu**: Wait for `.mat-mdc-menu-panel` containing `button[data-test-id="export-to-docs-button"]` to appear.
    *   **Click Export**: Click `button[data-test-id="export-to-docs-button"]`.
    *   **Wait**: Wait for the "Exported to Docs" toast/notification or a reasonable timeout before proceeding to the next item.

## Development Strategy
1. **Preprocessing**: The `samples/whole-dom-with-html.html` is very large (~2.4MB). A `preprocess_samples.py` script is now available to strip script/style tags and reformat the HTML for better analysis.
2. **Selector Stability**: Gemini uses Angular/Material. Many classes are generated (`_ngcontent-ng-...`). Rely on `data-test-id` or stable semantic tags (`action-card`, `message-content`) where possible.
3. **SPA Handling**: Like other Gemini userscripts, expect dynamic URL changes and content loading. Use `MutationObserver` or polling for element detection.

## Planned/Future Scripts
- **Artifact Extractor**: Extract content directly from artifact panels.
- **Enhanced Export**: Support for exporting "Artifacts" or "Action Cards" content to Markdown or Google Docs.
