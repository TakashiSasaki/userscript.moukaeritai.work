# AGENTS.md (gemini-artifacts)

## Overview
This directory is dedicated to the development of userscripts related to **Gemini Artifacts**. 
Artifacts in Gemini are likely to be specialized UI components (similar to Claude's Artifacts) that display code, documents, or other structured data in a side panel or dedicated view.

## Preprocessing Standards (HTML Samples)
A `preprocess_samples.py` script has been implemented to clean and standardize DOM snapshots in `samples/`.
Run this script whenever adding new HTML samples.

**Logic Applied:**
1.  **Removal**: `<script>`, `<style>` tags, and HTML comment nodes are completely removed to reduce noise.
2.  **Reformatting**: HTML is reformatted to a flat structure.
    -   **One tag/text node per line**.
    -   **No indentation** (to facilitate easier diffing and searching).

## Analysis of `samples/whole-dom-with-html.html`

### Context
- **Date**: 2026-01-09
- **Platform**: gemini.google.com
- **Content**: A conversation involving data analysis and academic research funding (University of Ehime / Yamagata University context).
- **Features Detected**: 
    - Google Keep extension integration (`action-card`).
    - Multi-turn conversation with complex layouts.

### Key Selectors & DOM Observations
- **Message Content**: `message-content` components contain the actual text.
- **Extensions / Action Cards**: 
    - `action-card`: Used for displaying content from integrated services like Google Keep.
    - `action`: Individual items within an `action-card`.
    - `.secondary-text.gds-body-m`: Often contains the bulk of the content in action cards.
- **Layout**: 
    - `chat-app`: Root container for the application.
    - `structured-content-container`: Container for responses that might include specialized formatting.

## Development Strategy
1. **Preprocessing**: The `samples/whole-dom-with-html.html` is very large (~2.4MB). A `preprocess_samples.py` script is now available to strip script/style tags and reformat the HTML for better analysis.
2. **Selector Stability**: Gemini uses Angular/Material. Many classes are generated (`_ngcontent-ng-...`). Rely on `data-test-id` or stable semantic tags (`action-card`, `message-content`) where possible.
3. **SPA Handling**: Like other Gemini userscripts, expect dynamic URL changes and content loading. Use `MutationObserver` or polling for element detection.

## Planned/Future Scripts
- **Artifact Extractor**: Extract content directly from artifact panels.
- **Enhanced Export**: Support for exporting "Artifacts" or "Action Cards" content to Markdown or Google Docs.
