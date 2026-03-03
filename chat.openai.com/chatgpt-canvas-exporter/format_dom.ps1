# format_dom.ps1
# キャプチャしたDOM (samples/multi_canvas_dom.html) を読みやすく整形して samples/multi_canvas_dom_fixed.html に出力します。

try {
    $inputPath = 'samples/multi_canvas_dom.html'
    if (-not (Test-Path $inputPath)) {
        throw "ファイル $inputPath が見つかりませんでした。先に capture_dom.ps1 を実行してください。"
    }
    
    $text = [System.IO.File]::ReadAllText($inputPath)
    $formatted = $text -replace '>', ">`r`n"
    
    $outputPath = 'samples/multi_canvas_dom_fixed.html'
    [System.IO.File]::WriteAllText($outputPath, $formatted)
    Write-Host "Format complete: $outputPath"
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
