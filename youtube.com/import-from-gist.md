# Import from Gist Feature

This document describes the functionality for importing playlist data from the web (specifically GitHub Gist) into the `youtube-playlist-saver.user.js` userscript.

## 1. Objective
Enable users to merge existing YouTube playlist data stored remotely into their local storage.

## 2. Supported Data Formats
The importer must support all historical and current data formats:
*   **v0 (Legacy)**: No version property; root object maps Playlist ID to Video ID Array.
*   **v1 (Versioned Array)**: Root `version: 1`; `playlists` maps Playlist ID to Video ID Array.
*   **v2 (Metadata)**: Root `version: 2`; `playlists` maps Playlist ID to Video ID Object (with metadata).

## 3. Gist URL Handling

The feature assumes the source data is hosted on a GitHub Gist raw URL.

### URL Structure Examples
Using Gist ID `2181ed9eab0deace58a5a4090f5202ca` as an example:

*   **Main Gist Page**:
    ```
    https://gist.github.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca
    ```
*   **Raw URL (Latest Revision)**:
    ```
    https://gist.githubusercontent.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca/raw/gistfile1.txt
    ```
*   **Raw URL (Specific Revision)**:
    ```
    https://gist.githubusercontent.com/TakashiSasaki/2181ed9eab0deace58a5a4090f5202ca/raw/fa54bef4cba572610b3863f5a5b3d3652c65013c/gistfile1.txt
    ```

### Normalization Logic
Since the user is only interested in the latest data:
1.  **Input**: The user might provide a specific revision URL (containing a commit hash).
2.  **Process**: The script must strip the hash segment to convert it into the "Latest Revision" URL.
3.  **Storage**: Only the normalized (latest) URL is saved for future use.

## 4. UI/Menu Commands

The userscript should provide the following menu commands (via `GM_registerMenuCommand`):

1.  **Import Data from URL**
    *   Prompts the user for a Gist Raw URL.
    *   Fetches data, normalizes the format, and merges it into local storage.
    *   Saves the normalized URL for convenience.

2.  **Open Gist Main Page**
    *   *Condition*: Only visible if a valid Gist Raw URL has been saved previously.
    *   Constructs and opens the main Gist page (non-raw) in a new tab.

3.  **Copy Data to Clipboard**
    *   Exports the current local data store (v2 format) to the clipboard as a JSON string.