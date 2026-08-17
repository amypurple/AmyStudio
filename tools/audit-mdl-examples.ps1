param(
  [string]$Level = "balanced",
  [string]$OutDir = "build/mdl-audit",
  [string]$OnlyIds = "",
  [string]$FailuresFrom = ""
)

$repoRoot = Split-Path $PSScriptRoot -Parent
$outRel = ($OutDir -replace "\\","/").TrimEnd("/")
$outRoot = Join-Path $repoRoot $OutDir
$examplesDir = Join-Path $outRoot "examples"
$manifestPath = Join-Path $outRoot "examples-manifest.json"
$reportJsonPath = Join-Path $outRoot "mdl-audit-report.json"
$reportMdPath = Join-Path $outRoot "mdl-audit-report.md"
$translatedDir = Join-Path $outRoot "translated"
$mdlDir = Join-Path $outRoot "mdl"
$configPath = Join-Path $PSScriptRoot "optimizer-config.local.json"

New-Item -ItemType Directory -Force -Path $outRoot | Out-Null
New-Item -ItemType Directory -Force -Path $examplesDir | Out-Null
New-Item -ItemType Directory -Force -Path $translatedDir | Out-Null
New-Item -ItemType Directory -Force -Path $mdlDir | Out-Null

if (!(Test-Path $configPath)) {
  throw "Missing $configPath"
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$jarPath = $config.mdlJarPath
if (!(Test-Path $jarPath)) {
  throw "MDL jar not found at $jarPath"
}

$onlyList = @()
if ($FailuresFrom) {
  $failureDoc = Get-Content $FailuresFrom -Raw | ConvertFrom-Json
  $onlyList = @($failureDoc.examples | Where-Object { $_.status -ne "ok" } | ForEach-Object { $_.id })
} elseif ($OnlyIds) {
  $onlyList = @($OnlyIds -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$exportArgs = @("--out-dir", ($examplesDir.Substring($repoRoot.Length + 1) -replace "\\","/"), "--manifest-out", ($manifestPath.Substring($repoRoot.Length + 1) -replace "\\","/"))
if ($onlyList.Count -gt 0) {
  $exportArgs += @("--only", ($onlyList -join ","))
}

node --experimental-default-type=module (Join-Path $PSScriptRoot "export-studio-examples-asm.js") @exportArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$results = @()

foreach ($example in $manifest.examples) {
  $result = [ordered]@{
    id = $example.id
    label = $example.label
    projectName = $example.projectName
    sourceLang = $example.sourceLang
    exportStatus = $example.status
    asmPath = $example.asmPath
    status = "pending"
    compare = $null
    translatorPath = $null
    mdlAsmPath = $null
    mdlBinPath = $null
    mdlBinSize = $null
    mdlStdout = $null
    mdlStderr = $null
    errorStage = $null
    error = $null
  }

  if ($example.status -ne "ok") {
    $result.status = "export_failed"
    $result.errorStage = "export"
    $result.error = $example.error
    $results += [pscustomobject]$result
    continue
  }

  $asmRel = $example.asmPath
  $asmAbs = Join-Path $repoRoot $asmRel
  $expandedRel = ("$outRel/expanded/{0}.expanded.asm" -f $example.id)
  $expandedAbs = Join-Path $repoRoot $expandedRel
  $translatedRel = ("$outRel/translated/{0}.mdl-input.asm" -f $example.id)
  $translatedAbs = Join-Path $repoRoot $translatedRel
  $mdlAsmRel = ("$outRel/mdl/{0}.mdl.asm" -f $example.id)
  $mdlAsmAbs = Join-Path $repoRoot $mdlAsmRel
  $mdlBinRel = ("$outRel/mdl/{0}.mdl.bin" -f $example.id)
  $mdlBinAbs = Join-Path $repoRoot $mdlBinRel

  try {
    $compareJson = node --experimental-default-type=module (Join-Path $PSScriptRoot "compare-z80-optimizer.js") --asm $asmRel --level $Level --expanded-out $expandedRel --json
    if ($LASTEXITCODE -ne 0) {
      throw "compare-z80-optimizer.js failed"
    }
    $result.compare = $compareJson | ConvertFrom-Json
  } catch {
    $result.status = "compare_failed"
    $result.errorStage = "compare"
    $result.error = $_.Exception.Message
    $results += [pscustomobject]$result
    continue
  }

  try {
    node --experimental-default-type=module (Join-Path $PSScriptRoot "translate-amy-asm-to-mdl.js") --in $expandedRel --out $translatedRel
    if ($LASTEXITCODE -ne 0) {
      throw "translate-amy-asm-to-mdl.js failed"
    }
    $result.translatorPath = $translatedRel
  } catch {
    $result.status = "translate_failed"
    $result.errorStage = "translate"
    $result.error = $_.Exception.Message
    $results += [pscustomobject]$result
    continue
  }

  try {
    $mdlOutput = & java -jar $jarPath $translatedAbs -dialect mdl -po -asm $mdlAsmAbs -bin $mdlBinAbs 2>&1
    $mdlExit = $LASTEXITCODE
    $result.mdlStdout = ($mdlOutput | Out-String).Trim()
    $result.mdlAsmPath = $mdlAsmRel
    $result.mdlBinPath = $mdlBinRel
    if ($mdlExit -ne 0) {
      throw "MDL exited with code $mdlExit"
    }
    if (!(Test-Path $mdlBinAbs)) {
      throw "MDL did not emit $mdlBinRel"
    }
    $result.mdlBinSize = (Get-Item $mdlBinAbs).Length
    $result.status = "ok"
  } catch {
    $result.status = "mdl_failed"
    $result.errorStage = "mdl"
    $result.error = $_.Exception.Message
  }

  $results += [pscustomobject]$result
}

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  level = $Level
  count = $results.Count
  ok = @($results | Where-Object { $_.status -eq "ok" }).Count
  failed = @($results | Where-Object { $_.status -ne "ok" }).Count
  examples = $results
}

$summary | ConvertTo-Json -Depth 8 | Set-Content $reportJsonPath

$lines = @()
$lines += "# MDL Audit Report"
$lines += ""
$lines += "Generated: $($summary.generatedAt)"
$lines += ""
$lines += "Examples: $($summary.count)"
$lines += "Succeeded: $($summary.ok)"
$lines += "Failed: $($summary.failed)"
$lines += ""
$lines += "## Failures"
$lines += ""
$failureRows = @($results | Where-Object { $_.status -ne "ok" })
if ($failureRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Stage | Status | Error |"
  $lines += "| --- | --- | --- | --- |"
  foreach ($row in $failureRows) {
    $errText = ""
    if ($null -ne $row.error) {
      $errText = [string]$row.error
    }
    $err = ($errText -replace "\r?\n", " ").Trim()
    $lines += "| $($row.id) | $($row.errorStage) | $($row.status) | $err |"
  }
}
$lines += ""
$lines += "## Success Sizes"
$lines += ""
$successRows = @($results | Where-Object { $_.status -eq "ok" })
if ($successRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Raw ROM | Built-in ROM | MDL BIN | Built-in delta vs raw | MDL delta vs raw | MDL delta vs built-in |"
  $lines += "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
  foreach ($row in $successRows) {
    $rawSize = $row.compare.raw.romSize
    $builtinSize = $row.compare.builtin.romSize
    $mdlSize = $row.mdlBinSize
    $lines += "| $($row.id) | $rawSize | $builtinSize | $mdlSize | $($rawSize - $builtinSize) | $($rawSize - $mdlSize) | $($builtinSize - $mdlSize) |"
  }
}

$lines | Set-Content $reportMdPath

Write-Host ""
Write-Host "JSON report: $reportJsonPath"
Write-Host "Markdown report: $reportMdPath"
Write-Host "Succeeded: $($summary.ok)"
Write-Host "Failed: $($summary.failed)"
