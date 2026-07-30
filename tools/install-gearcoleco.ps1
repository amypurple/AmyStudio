param(
  [string]$Version = "1.6.8",
  [string]$BiosPath = "",
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "AmyStudio\emulators")
)

$ErrorActionPreference = "Stop"
$asset = "Gearcoleco-$Version-desktop-windows-x64.zip"
$url = "https://github.com/drhelius/Gearcoleco/releases/download/$Version/$asset"
$archive = Join-Path $env:TEMP $asset
$extract = Join-Path $env:TEMP ("amy-gearcoleco-" + $Version)
$destination = Join-Path $InstallRoot ("gearcoleco-" + $Version)

Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $archive
if (Test-Path $extract) { Remove-Item -LiteralPath $extract -Recurse -Force }
Expand-Archive -LiteralPath $archive -DestinationPath $extract
$exe = Get-ChildItem -LiteralPath $extract -Filter Gearcoleco.exe -Recurse | Select-Object -First 1
if (-not $exe) { throw "Gearcoleco.exe was not found in $asset" }
New-Item -ItemType Directory -Force -Path $destination | Out-Null
Copy-Item -Path (Join-Path $exe.Directory.FullName "*") -Destination $destination -Recurse -Force
New-Item -ItemType File -Force -Path (Join-Path $destination "portable.ini") | Out-Null

if ($BiosPath) {
  $resolvedBios = (Resolve-Path -LiteralPath $BiosPath).Path
  if ((Get-Item -LiteralPath $resolvedBios).Length -ne 8192) { throw "ColecoVision BIOS must be exactly 8192 bytes." }
  Copy-Item -LiteralPath $resolvedBios -Destination (Join-Path $destination "colecovision.rom") -Force
}

$bios = Join-Path $destination "colecovision.rom"
$config = @("[General]", "Version=2", "", "[Emulator]", "BiosPath=$($bios.Replace('\','/'))", "StartPaused=true", "PauseWhenInactive=false", "Region=1", "", "[Video]", "SpriteLimit=true") -join "`r`n"
Set-Content -LiteralPath (Join-Path $destination "config.ini") -Value $config -Encoding UTF8

& (Join-Path $destination "Gearcoleco.exe") --version
Write-Host "Installed GearColeco at $destination"
if (-not (Test-Path $bios)) { Write-Warning "No BIOS installed. Re-run with -BiosPath <your legally obtained 8192-byte ColecoVision BIOS>." }
