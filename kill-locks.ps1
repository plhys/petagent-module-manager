$lockFile = "E:\AIcode\petagent\petagent-module-manager\dist\win-unpacked\resources\app.asar"
Write-Host "=== 查找锁定 $lockFile 的进程 ===" -ForegroundColor Yellow

$pids = @()
Get-Process -Name "PetAgent*" -ErrorAction SilentlyContinue | ForEach-Object {
    $pids += $_.Id
    Write-Host ("  PetAgent 进程: " + $_.ProcessName + " (PID: " + $_.Id + ")")
}

Get-Process -Name "Hermes*" -ErrorAction SilentlyContinue | ForEach-Object {
    $pids += $_.Id
    Write-Host ("  Hermes 进程: " + $_.ProcessName + " (PID: " + $_.Id + ")")
}

Get-Process -Name "electron*" -ErrorAction SilentlyContinue | ForEach-Object {
    $pids += $_.Id
    Write-Host ("  Electron 进程: " + $_.ProcessName + " (PID: " + $_.Id + ")")
}

if ($pids.Count -gt 0) {
    Write-Host ""
    Write-Host "=== 终止锁定进程 ===" -ForegroundColor Yellow
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host ("  已终止 PID: " + $pid) -ForegroundColor Green
        } catch {
            Write-Host ("  无法终止 PID " + $pid + ": " + $_) -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "  未找到相关进程" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== 再次尝试删除 ===" -ForegroundColor Yellow
if (Test-Path $lockFile) {
    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "  已删除: app.asar" -ForegroundColor Green
    } catch {
        Write-Host ("  仍被锁定: " + $_) -ForegroundColor Red
        Write-Host "  请手动关闭所有 PetAgent/Hermes 窗口后重试" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "  文件已不存在" -ForegroundColor Gray
}
