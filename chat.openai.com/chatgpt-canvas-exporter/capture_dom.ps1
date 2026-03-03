# capture_dom.ps1
# ChatGPTの現在のDOMをCDP (ポート 9222) 経由でキャプチャし、samples/multi_canvas_dom.html に保存します。
# 実行前に、ブラウザを --remote-debugging-port=9222 付きで起動しておく必要があります。

$json = Invoke-RestMethod -Uri 'http://localhost:9222/json'
$target = $json | Where-Object { $_.url -like '*chatgpt.com*' } | Select-Object -First 1

if (-not $target) {
    Write-Error "CDPポート 9222 上に ChatGPT のタブが見つかりませんでした。"
    exit 1
}

$wsUrl = $target.webSocketDebuggerUrl
Write-Host "Connecting to: $wsUrl"

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ct = New-Object System.Threading.CancellationTokenSource
$connectTask = $ws.ConnectAsync($wsUrl, $ct.Token)
$connectTask.Wait()

$message = @{
    id     = 1
    method = "Runtime.evaluate"
    params = @{
        expression = "document.documentElement.outerHTML"
    }
} | ConvertTo-Json -Compress

$buffer = [System.Text.Encoding]::UTF8.GetBytes($message)
$segment = New-Object System.ArraySegment[Byte] -ArgumentList @(, $buffer)
$sendTask = $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct.Token)
$sendTask.Wait()

$receiveBuffer = New-Object Byte[] 2097152 # 2MB buffer
$receiveSegment = New-Object System.ArraySegment[Byte] -ArgumentList @(, $receiveBuffer)
$result = ""

do {
    $receiveTask = $ws.ReceiveAsync($receiveSegment, $ct.Token)
    $receiveTask.Wait()
    $chunk = [System.Text.Encoding]::UTF8.GetString($receiveBuffer, 0, $receiveTask.Result.Count)
    $result += $chunk
} while (-not $receiveTask.Result.EndOfMessage)

$response = $result | ConvertFrom-Json
$html = $response.result.result.value

if (-not $html) {
    Write-Error "DOMの取得に失敗しました。"
    $ws.Dispose()
    exit 1
}

$outputPath = "samples/multi_canvas_dom.html"
# ディレクトリが存在しない場合は作成
if (-not (Test-Path "samples")) { New-Item -ItemType Directory -Path "samples" }

$html | Out-File -FilePath $outputPath -Encoding utf8
Write-Host "DOM captured and saved to $outputPath"

$ws.Dispose()
