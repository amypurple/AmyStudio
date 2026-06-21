param(
  [int]$Port = 8090
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$LogDir = Join-Path $Root ".server"
$OutLog = Join-Path $LogDir "studio-$Port.out.log"
$ErrLog = Join-Path $LogDir "studio-$Port.err.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($listenerPid in $listeners) {
  if ($listenerPid -and $listenerPid -ne $PID) {
    Write-Host "Stopping process $listenerPid listening on port $Port"
    Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
  }
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  throw "Python was not found in PATH. Install Python or run a local static server manually."
}

Write-Host "Starting Amy Studio clean repo at http://localhost:$Port/studio/"
Write-Host "Root: $Root"
Write-Host "Logs: $OutLog"

$command = "& '$($python.Source)' -m http.server $Port --directory '$Root' *> '$OutLog' 2> '$ErrLog'"
Start-Process -FilePath "powershell" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
  -WorkingDirectory $Root `
  -WindowStyle Hidden | Out-Null

Start-Sleep -Milliseconds 1500
$started = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($started) {
  Write-Host "Ready: http://localhost:$Port/studio/"
} else {
  Write-Warning "Server did not appear to start. Check $ErrLog"
}
