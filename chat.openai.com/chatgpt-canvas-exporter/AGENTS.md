# Development Notes for AI Agents and Developers

This document serves as a technical reference for the ChatGPT Canvas Exporter userscript. It outlines the methodologies used for DOM analysis, selector identification, and implementation details.

## Technical Context: ChatGPT Canvas

ChatGPT "Canvas" (internally often referred to as `writing-block` or `textdoc`) is a feature that opens a separate side panel for document editing. It uses **ProseMirror** as its underlying rich-text editor.

### DOM Analysis via CDP

To bypass Cloudflare protection and accurately capture the Canvas DOM, we used the **Chrome DevTools Protocol (CDP)**.

1.  **Capture Strategy**: Used a PowerShell script to fetch the outer HTML while the Canvas was active.
    - Port: `9222/tcp`
    - Target: Current active tab at `chatgpt.com`
2.  **Preprocessing**: The raw HTML was minified. We used a "fixed" version (`samples/multi_canvas_dom_fixed.html`) where long lines were broken at tag boundaries (`>` to `>\n`) to facilitate line-based searching.

### CDP Capture Script (PowerShell)

To capture the live DOM of the ChatGPT tab via CDP:

```powershell
$json = Invoke-RestMethod -Uri 'http://localhost:9222/json'
$target = $json | Where-Object { $_.url -like '*chatgpt.com*' } | Select-Object -First 1
$wsUrl = $target.webSocketDebuggerUrl

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ct = New-Object System.Threading.CancellationTokenSource
$ws.ConnectAsync($wsUrl, $ct.Token).Wait()

$message = @{ id = 1; method = "Runtime.evaluate"; params = @{ expression = "document.documentElement.outerHTML" } } | ConvertTo-Json -Compress
$buffer = [System.Text.Encoding]::UTF8.GetBytes($message)
$ws.SendAsync((New-Object System.ArraySegment[Byte] -ArgumentList @(,$buffer)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct.Token).Wait()

$receiveBuffer = New-Object Byte[] 2097152 # 2MB
$result = ""
do {
    $task = $ws.ReceiveAsync((New-Object System.ArraySegment[Byte] -ArgumentList @(,$receiveBuffer)), $ct.Token)
    $task.Wait()
    $result += [System.Text.Encoding]::UTF8.GetString($receiveBuffer, 0, $task.Result.Count)
} while (-not $task.Result.EndOfMessage)

$html = ($result | ConvertFrom-Json).result.result.value
$html | Out-File -FilePath "samples/multi_canvas_dom.html" -Encoding utf8
$ws.Dispose()
```

### Formatting Script (PowerShell)

```powershell
$text = [System.IO.File]::ReadAllText('samples/multi_canvas_dom.html')
$formatted = $text -replace '>', ">`r`n"
[System.IO.File]::WriteAllText('samples/multi_canvas_dom_fixed.html', $formatted)
```

### Identified Selectors

The following selectors are critical for interacting with the Canvas:

-   **Canvas Container (Turn-based)**: `article.has-data-writing-block`
    - Indicates a chat turn that has an associated Canvas.
-   **Canvas Message/Editor Group**: `div[id^="textdoc-message-"]`
    - This is the main container for the Canvas UI elements (header, title, actions, and editor).
-   **Content Editor (ProseMirror)**: `.ProseMirror`
    - The actual editor element where the content resides. Extraction is currently done via `.innerText`.
-   **Header Actions**: `div[id^="textdoc-message-"] .flex.items-center.justify-end`
    - The area containing native buttons (Copy, Edit, etc.). This is where we inject the "Export MD" button.
-   **Title**: `div[id^="textdoc-message-"] .text-token-text-primary.font-semibold`
    - Used for generating the export filename.

## Implementation Details

### UI Injection
- **Dual UI Approach**:
    - **In-Header**: Injected directly into the native actions bar for a seamless look.
    - **Floating**: A fixed (but movable) button that appears only when `.ProseMirror` is detected.
    - **Movable Logic**: Implemented with mouse event listeners (`mousedown`, `mousemove`, `mouseup`). It calculates position relative to the `right` and `bottom` edges of the viewport to handle resizing gracefully.
- **MutationObserver**: Used to detect when the Canvas enters the DOM or the path changes, ensuring buttons are re-injected if lost.

### Performance and Reliability
- **Avoid Over-Injection**: The injector checks for the existence of `.canvas-exporter-btn` before prepending.
- **Filename Sanitization**: Titles are sanitized using `replace(/[\\/:*?"<>|]/g, '_')` to prevent invalid file downloads on Windows.

## Reference Material
- Refer to `samples/canvas_dom_fixed.html` for a snapshot of the DOM used during initial development.

## バージョンのバンプアップについて
- 少しでもコードに変更があったらパッチレベルをバンプアップする。
