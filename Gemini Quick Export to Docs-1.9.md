# Gemini Quick Export to Docs Userscript

## Overview

This userscript, "Gemini Quick Export to Docs," enhances the Gemini (gemini.google.com/app/) interface by adding a convenient "Quick Export" button directly to all conversation responses. Its primary goal is to streamline and automate the process of exporting Gemini responses directly to Google Docs with a single click.

## Functionality

The script provides the following key features:

-   **Seamless Button Injection**: A custom "Quick Export" button is dynamically inserted next to the existing "Share & export" and "Copy" buttons within the interface for each Gemini response.
-   **Advanced DOM Traversal**: It employs sophisticated DOM (Document Object Model) traversal techniques, including `queryDeepAll` and `findParent`, to recursively scan both the Light DOM and Shadow DOM. This ensures that the button is reliably injected even within complex, dynamically rendered web pages, which is characteristic of modern applications like Gemini.
-   **Automated Export Workflow**: Upon clicking the "Quick Export" button, the script automates the export process by:
    1.  Programmatically triggering a click on the original "Share & export" button.
    2.  Waiting for the "Export to Docs" menu item to appear within the subsequent menu.
    3.  Clicking the "Export to Docs" menu item to initiate the export of the response to Google Docs, thereby eliminating the need for further manual interaction.
-   **Intuitive Visual Feedback**: During the export operation, the button provides clear visual cues. Its text changes to "..." (indicating progress), then to "Done" (on successful completion), or "Error" (if an issue occurs), keeping the user informed of the process status.
-   **Dynamic Content Compatibility**: To ensure broad applicability, the script continuously monitors the DOM for changes using `setInterval` and `MutationObserver`. This guarantees that the "Quick Export" button is present on all conversation responses, including those that are loaded dynamically after the initial page load.

## Operating Environment

-   **Target Website**: The userscript is designed to operate specifically on Google Gemini application pages.
    -   **URL Pattern**: `https://gemini.google.com/app/*`
-   **Browser Extension**: This script is intended to be used with userscript managers such as Tampermonkey or Greasemonkey, which allow for custom JavaScript to be run on specific web pages.

## Technical Details (Version 1.9 Improvements)

-   **Consistent Styling**: Ensures that the "Quick Export" button maintains a consistent and integrated visual style within the Gemini interface.
-   **Robust Parent Container Detection**: Includes enhanced logic for accurately identifying the correct parent container for button injection. This incorporates fallback mechanisms to effectively handle various permutations and complexities in Gemini's underlying DOM structure, ensuring high reliability.