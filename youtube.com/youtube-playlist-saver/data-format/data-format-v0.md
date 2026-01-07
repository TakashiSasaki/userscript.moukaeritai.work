# YouTube Playlist Saver Data Format v0 (Initial)

## Overview

The initial data format had no versioning field. The root object directly mapped Playlist IDs to arrays of Video IDs.

## Schema Definition

A JSON Schema definition for this data format is available.

- [data-format-v0.schema.json](./data-format-v0.schema.json)

```typescript
interface StorageDataV0 {
  /**
   * Keys are Playlist IDs (e.g., "PL...", "LL").
   * Values are arrays of Video ID strings.
   */
  [playlistId: string]: string[];
}
```

## JSON Example

```json
{
  "PL12345ABCDE": [
    "dQw4w9WgXcQ",
    "jNQXAC9IVRw"
  ],
  "LL": [
    "9bZkp7q19f0"
  ]
}
```

## Limitations

- No easy way to distinguish data formats if they change.
- No metadata (title, channel) stored; only IDs.
- Large playlists are stored as arrays, making checks for existence O(N).
