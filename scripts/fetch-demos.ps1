# 批量下载动作演示图（需联网）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/fetch-demos.ps1
#      可加 -BaseUrl 指定镜像，如 https://cdn.jsdelivr.net/gh/lihua2779/fit-plan@main

param(
    [string]$BaseUrl = "https://lihua2779.github.io/fit-plan/img/",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) "img"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$keys = @(
    "abduction", "bench", "calfRaise", "crunch", "curl", "deadlift", "dip", "facePull",
    "fly", "frontRaise", "hammerCurl", "hipThrust", "inclinePress", "latPulldown",
    "lateralRaise", "legCurl", "legPress", "legRaise", "lunge", "lyingExt",
    "machinePress", "ohp", "oneArmRow", "plank", "preacherCurl", "pullup",
    "pushdown", "pushup", "rdl", "reverseFly", "row", "seatedCalf", "seatedRow",
    "shrug", "sidePlank", "splitSquat", "squat", "standingOhp", "straightPulldown", "tBarRow"
)

$ok = 0
$skip = 0
$fail = @()

foreach ($key in $keys) {
    $target = Join-Path $outDir "$key.webp"
    if ((Test-Path $target) -and (-not $Force)) { $skip++; continue }
    $url = "$BaseUrl$key.webp"
    try {
        Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing -TimeoutSec 30
        $size = [math]::Round((Get-Item $target).Length / 1KB, 1)
        Write-Host ("  + {0}.webp  ({1} KB)" -f $key, $size) -ForegroundColor Green
        $ok++
    } catch {
        Write-Host ("  ! {0} 下载失败：{1}" -f $key, $_.Exception.Message) -ForegroundColor Yellow
        if (Test-Path $target) { Remove-Item $target -Force }
        $fail += $key
    }
}

Write-Host ""
Write-Host ("完成：新增 {0} 个，跳过 {1} 个，失败 {2} 个" -f $ok, $skip, $fail.Count)
if ($fail.Count -gt 0) {
    Write-Host ("失败列表：" + ($fail -join ", ")) -ForegroundColor Yellow
    Write-Host "提示：网络受限时可换 -BaseUrl 镜像，或手动从网站保存图片到 img/ 目录"
    exit 1
}