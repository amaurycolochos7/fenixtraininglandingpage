$videoDir = "c:\Users\Amaury\.gemini\antigravity\scratch\fenix-fight-system\media\videos"
$imgDir = "c:\Users\Amaury\.gemini\antigravity\scratch\fenix-fight-system\media\reconocimientos"
$ffmpeg = (Get-ChildItem -Path $env:LOCALAPPDATA\Microsoft\WinGet\Packages -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue).FullName | Select-Object -First 1

# ===== COMPRESS VIDEOS =====
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " COMPRIMIENDO VIDEOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$videos = Get-ChildItem "$videoDir\*.mp4"
$totalBefore = 0
$totalAfter = 0

foreach ($v in $videos) {
    $totalBefore += $v.Length
    $output = Join-Path $videoDir ("opt_" + $v.Name)
    
    Write-Host "`n-> $($v.Name) ($([math]::Round($v.Length / 1MB, 1)) MB)" -ForegroundColor Yellow
    
    # Compress: H.264, CRF 28 (good quality, much smaller), scale to 720p max, fast preset
    & $ffmpeg -y -i $v.FullName -c:v libx264 -preset fast -crf 28 -vf "scale='min(720,iw)':-2" -c:a aac -b:a 96k -movflags +faststart $output 2>&1 | Out-Null
    
    if (Test-Path $output) {
        $newSize = (Get-Item $output).Length
        $totalAfter += $newSize
        Write-Host "   Comprimido: $([math]::Round($newSize / 1MB, 1)) MB ($([math]::Round((1 - $newSize/$v.Length)*100))% reduccion)" -ForegroundColor Green
        
        # Replace original with compressed
        Remove-Item $v.FullName
        Rename-Item $output $v.Name
    } else {
        $totalAfter += $v.Length
        Write-Host "   ERROR: no se pudo comprimir" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " VIDEOS: $([math]::Round($totalBefore / 1MB)) MB -> $([math]::Round($totalAfter / 1MB)) MB ($([math]::Round((1 - $totalAfter/$totalBefore)*100))% reduccion)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# ===== COMPRESS IMAGES =====
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " COMPRIMIENDO IMAGENES" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan

$images = Get-ChildItem "$imgDir\*" -Include *.jpg,*.jpeg,*.png
$imgBefore = 0
$imgAfter = 0

foreach ($img in $images) {
    $imgBefore += $img.Length
    $output = Join-Path $imgDir ("opt_" + $img.BaseName + ".jpg")
    
    # Resize to max 1200px wide, quality 80
    & $ffmpeg -y -i $img.FullName -vf "scale='min(1200,iw)':-1" -q:v 5 $output 2>&1 | Out-Null
    
    if (Test-Path $output) {
        $newSize = (Get-Item $output).Length
        $imgAfter += $newSize
        Write-Host "   $($img.Name): $([math]::Round($img.Length / 1KB)) KB -> $([math]::Round($newSize / 1KB)) KB" -ForegroundColor Green
        
        Remove-Item $img.FullName
        Rename-Item $output $img.Name
    } else {
        $imgAfter += $img.Length
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " IMAGENES: $([math]::Round($imgBefore / 1KB)) KB -> $([math]::Round($imgAfter / 1KB)) KB ($([math]::Round((1 - $imgAfter/$imgBefore)*100))% reduccion)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nOPTIMIZACION COMPLETA!" -ForegroundColor Green
