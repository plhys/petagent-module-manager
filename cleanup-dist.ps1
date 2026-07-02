$distDir = "E:\AIcode\petagent\petagent-module-manager\dist"
$oldExe = Join-Path $distDir "PetAgent模块管理器 2.0.4.exe"
$newExe = Join-Path $distDir "PetAgent模块管理器 2.0.15.exe"

Write-Host "=== 查找占用进程 ===" -ForegroundColor Yellow
$procs = Get-Process | Where-Object { $_.ProcessName -match "PetAgent|Hermes|electron|python" }
$procs | ForEach-Object {
    Write-Host ("  进程: " + $_.ProcessName + " (PID: " + $_.Id + ")")
}

Write-Host ""
Write-Host "=== 尝试删除旧版本 ===" -ForegroundColor Yellow
if (Test-Path $oldExe) {
    try {
        Remove-Item $oldExe -Force -ErrorAction Stop
        Write-Host "  已删除: PetAgent模块管理器 2.0.4.exe" -ForegroundColor Green
    } catch {
        Write-Host ("  删除失败: " + $_) -ForegroundColor Red
        Write-Host "  请手动关闭模块管理器后重试" -ForegroundColor Yellow
    }
} else {
    Write-Host "  文件不存在，无需删除" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== 清理 build 临时文件 ===" -ForegroundColor Yellow
$buildDir = Join-Path $distDir "build"
if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
    Write-Host "  已删除: dist/build/" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 当前 dist 目录 ===" -ForegroundColor Cyan
$exes = Get-ChildItem $distDir -Filter "*.exe"
foreach ($exe in $exes) {
    $sizeMB = [math]::Round($exe.Length / 1048576, 1)
    Write-Host ("  " + $exe.Name + " (" + $sizeMB + " MB)") -ForegroundColor Green
}
