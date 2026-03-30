$vids = Get-ChildItem "c:\Users\Amaury\.gemini\antigravity\scratch\fenix-fight-system\media\videos\*.mp4"
$totalVids = ($vids | Measure-Object -Sum Length).Sum / 1MB
Write-Host "Videos: $($vids.Count) archivos, Total: $([math]::Round($totalVids, 1)) MB"
foreach ($v in $vids | Sort-Object Length -Descending | Select-Object -First 10) {
    Write-Host "  $($v.Name): $([math]::Round($v.Length / 1MB, 1)) MB"
}

$imgs = Get-ChildItem "c:\Users\Amaury\.gemini\antigravity\scratch\fenix-fight-system\media\reconocimientos\*"
$totalImgs = ($imgs | Measure-Object -Sum Length).Sum / 1MB
Write-Host "`nImagenes: $($imgs.Count) archivos, Total: $([math]::Round($totalImgs, 1)) MB"
foreach ($i in $imgs | Sort-Object Length -Descending | Select-Object -First 5) {
    Write-Host "  $($i.Name): $([math]::Round($i.Length / 1MB, 1)) MB"
}
