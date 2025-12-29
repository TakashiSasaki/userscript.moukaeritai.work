# YouTube Playlist Saver Data Format v1

## Overview

Version 1 introduced a explicit `version` field and moved the playlist data under a `playlists` key. This allows for safer migration and future-proofing.

## Schema Definition

A JSON Schema definition for this data format is available.

- [data-format-v1.schema.json](./data-format-v1.schema.json)

```typescript
interface StorageDataV1 {
  /**
   * Data format version number.
   * Fixed to 1 for this schema.
   */
  version: 1;

  /**
   * Map of playlists, keyed by Playlist ID.
   */
  playlists: {
    [playlistId: string]: string[];
  };
}
```

## JSON Example

```json
{
  "version": 1,
  "playlists": {
    "PL12345ABCDE": [
      "dQw4w9WgXcQ",
      "jNQXAC9IVRw"
    ],
    "LL": [
      "9bZkp7q19f0"
    ]
  }
}
```

## Changes from v0

- Added root `version` field.
- Moved data map under `playlists` property.

## Limitations

- Still stores only Video IDs; no metadata (title, channel) available.
- Still uses arrays for video lists, meaning O(N) lookup.
