param(
  [string]$Level = "balanced",
  [string]$OutDir = "build/post-builtin-audit",
  [string]$CoptPath = "",
  [string]$RuleSet = "all",
  [string]$OnlyIds = "",
  [switch]$AllAmyExamples,
  [string]$IdRegex = "amy-(float|fixed|fixed32|numeric|u16|i16|u32|math|arithmetic|compare-fixed)|record-array|nested-record",
  [string]$MdOut = "docs/post-builtin-oracle-audit-2026-06-11.md"
)

$repoRoot = Split-Path $PSScriptRoot -Parent
$outRoot = Join-Path $repoRoot $OutDir
$outDirRel = ($OutDir -replace "\\", "/").TrimEnd("/")
$examplesDir = Join-Path $outRoot "examples"
$manifestPath = Join-Path $outRoot "examples-manifest.json"
$builtinDir = Join-Path $outRoot "builtin"
$translatedDir = Join-Path $outRoot "translated"
$mdlDir = Join-Path $outRoot "mdl"
$coptDir = Join-Path $outRoot "copt"
$reportJsonPath = Join-Path $outRoot "post-builtin-oracle-audit.json"
$reportMdPath = Join-Path $repoRoot $MdOut
$configPath = Join-Path $PSScriptRoot "optimizer-config.local.json"

New-Item -ItemType Directory -Force -Path $examplesDir | Out-Null
New-Item -ItemType Directory -Force -Path $builtinDir | Out-Null
New-Item -ItemType Directory -Force -Path $translatedDir | Out-Null
New-Item -ItemType Directory -Force -Path $mdlDir | Out-Null
New-Item -ItemType Directory -Force -Path $coptDir | Out-Null

function To-RepoRel {
  param([string]$Path)
  return (($Path.Substring($repoRoot.Length + 1)) -replace "\\", "/")
}

function Resolve-CoptPath {
  param([string]$ExplicitPath)
  if ($ExplicitPath -and (Test-Path $ExplicitPath)) { return (Resolve-Path $ExplicitPath).Path }
  if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($config.z88dkCoptPath -and (Test-Path $config.z88dkCoptPath)) {
      return (Resolve-Path $config.z88dkCoptPath).Path
    }
  }
  $localCandidates = @(
    "tools/z88dk/bin/z88dk-copt.exe",
    "tools/z88dk/bin/copt.exe",
    "tools/z88dk/bin/z88dk-copt",
    "tools/z88dk/bin/copt",
    "tools/z88dk/src/copt/copt.exe",
    "tools/z88dk/src/copt/copt"
  )
  foreach ($candidate in $localCandidates) {
    $absCandidate = Join-Path $repoRoot $candidate
    if (Test-Path $absCandidate) {
      return (Resolve-Path $absCandidate).Path
    }
  }
  $cmd = Get-Command z88dk-copt -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $cmd = Get-Command copt -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return ""
}

function Resolve-RequiredFile {
  param([string]$RelPath)
  $abs = Join-Path $repoRoot $RelPath
  if (!(Test-Path $abs)) {
    throw "Missing required file: $RelPath"
  }
  return (Resolve-Path $abs).Path
}

function Resolve-RuleSets {
  $sets = [ordered]@{
    sdcc = @(
      "tools/z88dk/lib/sdcc/sdcc_peeph.0",
      "tools/z88dk/lib/sdcc/sdcc_peeph.1",
      "tools/z88dk/lib/sdcc/sdcc_peeph.2",
      "tools/z88dk/lib/sdcc/sdcc_peeph.3"
    )
    "z88dk-so3" = @(
      "tools/z88dk/lib/z80rules.0",
      "tools/z88dk/lib/z80rules.1",
      "tools/z88dk/lib/z80rules.2"
    )
  }

  $resolved = [ordered]@{}
  foreach ($name in $sets.Keys) {
    $resolved[$name] = @($sets[$name] | ForEach-Object { Resolve-RequiredFile $_ })
  }
  return $resolved
}

function Escape-MarkdownCell {
  param([string]$Text)
  if (!$Text) { return "" }
  return ($Text -replace "\r?\n", " " -replace "\|", "\\|").Trim()
}

function Normalize-CodeLines {
  param([string]$Text)
  $lines = @()
  foreach ($line in ($Text -split "\r?\n")) {
    $code = ($line -split ";", 2)[0].Trim().ToLowerInvariant()
    if (!$code) { continue }
    $code = ($code -replace "\s+", " ")
    $lines += $code
  }
  return $lines
}

function Code-Changed {
  param([string]$BeforeText, [string]$AfterText)
  $before = @(Normalize-CodeLines $BeforeText)
  $after = @(Normalize-CodeLines $AfterText)
  if ($before.Count -ne $after.Count) { return $true }
  for ($i = 0; $i -lt $before.Count; $i++) {
    if ($before[$i] -ne $after[$i]) { return $true }
  }
  return $false
}

function Invoke-CoptText {
  param([string]$InputText, [string]$Copt, [array]$Rules)
  $output = $InputText | & $Copt @Rules 2>&1
  $exitCode = $LASTEXITCODE
  return [pscustomobject]@{
    ExitCode = $exitCode
    Text = ($output | Out-String)
  }
}

function Parse-MdlPatterns {
  param([string]$Text)
  $patterns = @()
  foreach ($line in ($Text -split "\r?\n")) {
    if ($line -match "INFO: Pattern-based optimization .*?: (?<message>.+?) \((?<bytes>-?\d+) bytes") {
      $patterns += [ordered]@{
        message = $matches.message
        bytes = [int]$matches.bytes
      }
    }
  }
  return $patterns
}

if (!(Test-Path $configPath)) {
  throw "Missing $configPath"
}
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$jarPath = $config.mdlJarPath
if (!(Test-Path $jarPath)) {
  throw "MDL jar not found at $jarPath"
}

$coptResolved = Resolve-CoptPath $CoptPath
if (!$coptResolved) {
  throw "Neither z88dk-copt nor copt was found. Expected tools/z88dk/bin/z88dk-copt.exe or pass -CoptPath."
}

$allRuleSets = Resolve-RuleSets
$selectedRuleSetNames = @()
if ($RuleSet -eq "all") {
  $selectedRuleSetNames = @($allRuleSets.Keys)
} else {
  $selectedRuleSetNames = @($RuleSet -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
foreach ($name in $selectedRuleSetNames) {
  if (!$allRuleSets.Contains($name)) {
    throw "Unknown RuleSet '$name'. Valid: all, $($allRuleSets.Keys -join ', ')"
  }
}

$onlyList = @()
if ($OnlyIds) {
  $onlyList = @($OnlyIds -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$exportArgs = @("--out-dir", (To-RepoRel $examplesDir), "--manifest-out", (To-RepoRel $manifestPath))
if ($onlyList.Count -gt 0) {
  $exportArgs += @("--only", ($onlyList -join ","))
}

node --experimental-default-type=module (Join-Path $PSScriptRoot "export-studio-examples-asm.js") @exportArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$examples = @($manifest.examples | Where-Object {
  ($_.status -eq "ok") -and
  (($onlyList.Count -gt 0 -and $onlyList -contains $_.id) -or
   ($onlyList.Count -eq 0 -and $AllAmyExamples -and $_.sourceLang -eq "amy") -or
   ($onlyList.Count -eq 0 -and !$AllAmyExamples -and $_.id -match $IdRegex))
})

$results = @()
$mdlPatternTotals = @{}
$exampleIndex = 0

foreach ($example in $examples) {
  $exampleIndex += 1
  Write-Host ("[{0}/{1}] {2}" -f $exampleIndex, $examples.Count, $example.id)
  $result = [ordered]@{
    id = $example.id
    label = $example.label
    asmPath = $example.asmPath
    status = "pending"
    builtinRomSize = $null
    builtinAsmPath = $null
    translatedPath = $null
    mdlBaselineSize = $null
    mdlOptimizedSize = $null
    mdlResidualDelta = $null
    mdlPatterns = @()
    copt = @()
    errorStage = $null
    error = $null
  }

  $builtinRel = ("{0}/builtin/{1}.builtin.asm" -f $outDirRel, $example.id)
  $builtinAbs = Join-Path $repoRoot $builtinRel
  $translatedRel = ("{0}/translated/{1}.builtin.mdl-input.asm" -f $outDirRel, $example.id)
  $translatedAbs = Join-Path $repoRoot $translatedRel
  $mdlBaselineAsmRel = ("{0}/mdl/{1}.baseline.asm" -f $outDirRel, $example.id)
  $mdlBaselineAsmAbs = Join-Path $repoRoot $mdlBaselineAsmRel
  $mdlBaselineBinRel = ("{0}/mdl/{1}.baseline.bin" -f $outDirRel, $example.id)
  $mdlBaselineBinAbs = Join-Path $repoRoot $mdlBaselineBinRel
  $mdlPoAsmRel = ("{0}/mdl/{1}.po.asm" -f $outDirRel, $example.id)
  $mdlPoAsmAbs = Join-Path $repoRoot $mdlPoAsmRel
  $mdlPoBinRel = ("{0}/mdl/{1}.po.bin" -f $outDirRel, $example.id)
  $mdlPoBinAbs = Join-Path $repoRoot $mdlPoBinRel

  try {
    $compareJson = node --experimental-default-type=module (Join-Path $PSScriptRoot "compare-z80-optimizer.js") --asm $example.asmPath --level $Level --builtin-out $builtinRel --json
    if ($LASTEXITCODE -ne 0) {
      throw "compare-z80-optimizer.js failed"
    }
    $compare = $compareJson | ConvertFrom-Json
    $result.builtinRomSize = $compare.builtin.romSize
    $result.builtinAsmPath = $builtinRel
  } catch {
    $result.status = "compare_failed"
    $result.errorStage = "compare"
    $result.error = $_.Exception.Message
    $results += [pscustomobject]$result
    continue
  }

  try {
    node --experimental-default-type=module (Join-Path $PSScriptRoot "translate-amy-asm-to-mdl.js") --in $builtinRel --out $translatedRel --target mdl | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "translate-amy-asm-to-mdl.js failed"
    }
    $result.translatedPath = $translatedRel
  } catch {
    $result.status = "translate_failed"
    $result.errorStage = "translate"
    $result.error = $_.Exception.Message
    $results += [pscustomobject]$result
    continue
  }

  try {
    $baselineOutput = & java -jar $jarPath $translatedAbs -dialect mdl -asm $mdlBaselineAsmAbs -bin $mdlBaselineBinAbs 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "MDL baseline exited with code $LASTEXITCODE`: $(($baselineOutput | Out-String).Trim())"
    }
    $poOutput = & java -jar $jarPath $translatedAbs -dialect mdl -po -asm $mdlPoAsmAbs -bin $mdlPoBinAbs 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "MDL -po exited with code $LASTEXITCODE`: $(($poOutput | Out-String).Trim())"
    }
    $result.mdlBaselineSize = (Get-Item $mdlBaselineBinAbs).Length
    $result.mdlOptimizedSize = (Get-Item $mdlPoBinAbs).Length
    $result.mdlResidualDelta = $result.mdlBaselineSize - $result.mdlOptimizedSize
    $result.mdlPatterns = @(Parse-MdlPatterns (($poOutput | Out-String).Trim()))
    foreach ($pattern in $result.mdlPatterns) {
      if (!$mdlPatternTotals.ContainsKey($pattern.message)) {
        $mdlPatternTotals[$pattern.message] = [ordered]@{ count = 0; bytes = 0 }
      }
      $mdlPatternTotals[$pattern.message].count += 1
      $mdlPatternTotals[$pattern.message].bytes += $pattern.bytes
    }
  } catch {
    $result.status = "mdl_failed"
    $result.errorStage = "mdl"
    $result.error = $_.Exception.Message
    $results += [pscustomobject]$result
    continue
  }

  $inputText = Get-Content $translatedAbs -Raw
  foreach ($setName in $selectedRuleSetNames) {
    $setDir = Join-Path $coptDir $setName
    New-Item -ItemType Directory -Force -Path $setDir | Out-Null
    $coptAsmRel = ("{0}/copt/{1}/{2}.copt.asm" -f $outDirRel, $setName, $example.id)
    $coptAsmAbs = Join-Path $repoRoot $coptAsmRel
    $coptBinRel = ("{0}/copt/{1}/{2}.copt.bin" -f $outDirRel, $setName, $example.id)
    $coptBinAbs = Join-Path $repoRoot $coptBinRel
    $coptOut = Invoke-CoptText $inputText $coptResolved @($allRuleSets[$setName])
    $changed = Code-Changed $inputText $coptOut.Text
    Set-Content -Path $coptAsmAbs -Value $coptOut.Text
    $coptSize = $null
    $coptDelta = 0
    $coptStatus = "unchanged"
    if ($coptOut.ExitCode -ne 0) {
      $coptStatus = "copt_failed"
    } elseif ($changed) {
      $assembleOutput = & java -jar $jarPath $coptAsmAbs -dialect mdl -bin $coptBinAbs 2>&1
      if ($LASTEXITCODE -ne 0) {
        $coptStatus = "assemble_failed"
      } else {
        $coptSize = (Get-Item $coptBinAbs).Length
        $coptDelta = $result.mdlBaselineSize - $coptSize
        $coptStatus = "changed_unverified"
      }
    }
    $result.copt += [ordered]@{
      ruleSet = $setName
      status = $coptStatus
      changed = $changed
      size = $coptSize
      delta = $coptDelta
      outputPath = $coptAsmRel
      rules = @($allRuleSets[$setName] | ForEach-Object { To-RepoRel $_ })
    }
  }

  $result.status = "ok"
  $results += [pscustomobject]$result
}

$successRows = @($results | Where-Object { $_.status -eq "ok" })
$failureRows = @($results | Where-Object { $_.status -ne "ok" })
$topMdl = @($successRows | Sort-Object -Property mdlResidualDelta -Descending | Select-Object -First 20)
$topPatterns = @($mdlPatternTotals.Keys | ForEach-Object {
  [pscustomobject]@{
    message = $_
    count = $mdlPatternTotals[$_].count
    bytes = $mdlPatternTotals[$_].bytes
  }
} | Sort-Object -Property bytes -Descending)

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  level = $Level
  count = $results.Count
  ok = $successRows.Count
  failed = $failureRows.Count
  coptPath = $coptResolved
  ruleSets = @($selectedRuleSetNames | ForEach-Object {
    [ordered]@{ name = $_; files = @($allRuleSets[$_] | ForEach-Object { To-RepoRel $_ }) }
  })
  totals = [ordered]@{
    mdlResidualBytes = (($successRows | Measure-Object -Property mdlResidualDelta -Sum).Sum)
    coptChangedRuns = @(foreach ($row in $successRows) { $row.copt | Where-Object { $_.changed } }).Count
  }
  topMdl = $topMdl
  topPatterns = $topPatterns
  examples = $results
}

$summary | ConvertTo-Json -Depth 12 | Set-Content $reportJsonPath

$lines = @()
$lines += "# Post-Built-In Oracle Audit"
$lines += ""
$lines += "Generated: $($summary.generatedAt)"
$lines += ""
$scopeText = if ($onlyList.Count -gt 0) {
  "selected IDs: $($onlyList -join ', ')"
} elseif ($AllAmyExamples) {
  "all exported Amy-language Studio examples"
} else {
  "exported Studio examples matching: $IdRegex"
}
$lines += "Scope: $scopeText"
$lines += ""
$lines += "This audit feeds the built-in optimized ASM into external oracles. MDL and copt deltas are measured against MDL's no-optimization assembly of that same post-built-in ASM, not against raw pre-built-in code."
$lines += ""
$lines += "Examples: $($summary.count)"
$lines += "Succeeded: $($summary.ok)"
$lines += "Failed: $($summary.failed)"
$lines += "MDL residual bytes found: $($summary.totals.mdlResidualBytes)"
$lines += "copt changed runs: $($summary.totals.coptChangedRuns)"
$lines += ""
$lines += "## Rule Sets"
$lines += ""
$lines += "copt: $($summary.coptPath)"
$lines += ""
foreach ($set in $summary.ruleSets) {
  $lines += ("- {0}: {1}" -f $set.name, ($set.files -join ", "))
}
$lines += ""
$lines += "## Failures"
$lines += ""
if ($failureRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Stage | Error |"
  $lines += "| --- | --- | --- |"
  foreach ($row in $failureRows) {
    $lines += "| $($row.id) | $($row.errorStage) | $(Escape-MarkdownCell $row.error) |"
  }
}
$lines += ""
$lines += "## Top MDL Residual Gains"
$lines += ""
if ($topMdl.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Amy built-in ROM | MDL baseline | MDL after -po | Residual bytes |"
  $lines += "| --- | ---: | ---: | ---: | ---: |"
  foreach ($row in $topMdl) {
    $lines += "| $($row.id) | $($row.builtinRomSize) | $($row.mdlBaselineSize) | $($row.mdlOptimizedSize) | $($row.mdlResidualDelta) |"
  }
}
$lines += ""
$lines += "## MDL Pattern Hotspots"
$lines += ""
if ($topPatterns.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| Pattern | Count | Bytes |"
  $lines += "| --- | ---: | ---: |"
  foreach ($pattern in ($topPatterns | Select-Object -First 30)) {
    $lines += "| $(Escape-MarkdownCell $pattern.message) | $($pattern.count) | $($pattern.bytes) |"
  }
}
$lines += ""
$lines += "## copt Residual Result"
$lines += ""
$coptChanged = @(foreach ($row in $successRows) { $row.copt | Where-Object { $_.changed } | ForEach-Object { [pscustomobject]@{ id = $row.id; ruleSet = $_.ruleSet; status = $_.status; delta = $_.delta } } })
if ($coptChanged.Count -eq 0) {
  $lines += "No normalized executable code changes after built-in optimization for the selected rule sets."
} else {
  $lines += "| ID | Rule set | Status | Delta vs MDL baseline |"
  $lines += "| --- | --- | --- | ---: |"
  foreach ($row in $coptChanged) {
    $lines += "| $($row.id) | $($row.ruleSet) | $($row.status) | $($row.delta) |"
  }
}
$lines += ""
$lines += "## Full Table"
$lines += ""
if ($successRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Amy built-in ROM | MDL baseline | MDL -po | MDL residual | copt sdcc | copt z88dk-so3 |"
  $lines += "| --- | ---: | ---: | ---: | ---: | --- | --- |"
  foreach ($row in $successRows) {
    $sdcc = @($row.copt | Where-Object { $_.ruleSet -eq "sdcc" } | Select-Object -First 1)
    $so3 = @($row.copt | Where-Object { $_.ruleSet -eq "z88dk-so3" } | Select-Object -First 1)
    $sdccText = if ($sdcc.Count) { "$($sdcc[0].status) / $($sdcc[0].delta)" } else { "" }
    $so3Text = if ($so3.Count) { "$($so3[0].status) / $($so3[0].delta)" } else { "" }
    $lines += "| $($row.id) | $($row.builtinRomSize) | $($row.mdlBaselineSize) | $($row.mdlOptimizedSize) | $($row.mdlResidualDelta) | $sdccText | $so3Text |"
  }
}

$lines | Set-Content $reportMdPath

Write-Host ""
Write-Host "JSON report: $reportJsonPath"
Write-Host "Markdown report: $reportMdPath"
Write-Host "Succeeded: $($summary.ok)"
Write-Host "Failed: $($summary.failed)"
Write-Host "MDL residual bytes: $($summary.totals.mdlResidualBytes)"
Write-Host "copt changed runs: $($summary.totals.coptChangedRuns)"
if ($summary.failed -gt 0) { exit 1 }

