# YouTube Playlist Saver Data Format v2

## Overview

Version 2 of the data storage format transitions from a simple list of video IDs to a key-value structure. This allows storing metadata (Title, Channel Name) for each saved video, enabling richer features like searching, filtering, and displaying details without needing to re-fetch from YouTube.

## Schema Definition

A JSON Schema definition for this data format is available.

- [data-format-v2.schema.json](./data-format-v2.schema.json)

```typescript
interface StorageDataV2 {
  /**
   * Data format version number.
   * Fixed to 2 for this schema.
   */
  version: 2;

  /**
   * Map of playlists, keyed by Playlist ID.
   */
  playlists: {
    [playlistId: string]: PlaylistDataV2;
  };
}

/**
 * Map of saved videos within a playlist, keyed by Video ID.
 * This structure allows O(1) lookup to check if a video is already saved.
 */
interface PlaylistDataV2 {
  [videoId: string]: VideoMetadata;
}

interface VideoMetadata {
  /**
   * The title of the video.
   * Collected from the DOM at the time of saving.
   */
  title: string;

  /**
   * The channel (uploader) name.
   * Collected from the DOM at the time of saving.
   */
  channel: string;
  
  /**
   * (Optional) Unix timestamp (ms) when the video was first saved.
   * Useful for sorting or history.
   */
  addedAt?: number;
}
```

## JSON Example

```json
{
  "version": 2,
  "playlists": {
    "PL12345ABCDE": {
      "dQw4w9WgXcQ": {
        "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        "channel": "Rick Astley",
        "addedAt": 1700000000000
      },
      "jNQXAC9IVRw": {
        "title": "Me at the zoo",
        "channel": "jawed",
        "addedAt": 1700000005000
      }
    },
    "LL": {
      "9bZkp7q19f0": {
        "title": "PSY - GANGNAM STYLE(강남스타일) M/V",
        "channel": "officialpsy",
        "addedAt": 1700000010000
      }
    }
  }
}
```

## Migration Strategy (Draft)

When the script detects data in v1 format (array of strings) or older:

1.  Create a new `playlists` object.
2.  Iterate through existing playlists.
3.  For each video ID in the v1 array:
    *   Create an entry in the v2 object.
    *   Set `title` and `channel` to empty strings (`""`) or a placeholder (e.g., `"(Unknown)"`) initially, since this metadata was not stored previously.
    *   (Optional) The script could try to fill this metadata when the user visits the playlist again and the video is rendered in the DOM.
4.  Update the root `version` to `2`.
5.  Save the new structure.
