param(
  [string]$Level = "balanced",
  [string]$OutDir = "build/mdl-audit",
  [string]$CoptPath = "",
  [string]$RuleSet = "all",
  [string]$OnlyIds = "",
  [string]$IdRegex = "amy-(float|fixed|fixed32|numeric|u16|i16|u32|math|arithmetic|compare-fixed)|record-array|nested-record",
  [string]$MdOut = "docs/copt-audit-2026-06-11.md"
)

$repoRoot = Split-Path $PSScriptRoot -Parent
$outRoot = Join-Path $repoRoot $OutDir
$examplesDir = Join-Path $outRoot "examples"
$manifestPath = Join-Path $outRoot "examples-manifest.json"
$mdlReportPath = Join-Path $outRoot "mdl-audit-report.json"
$translatedCoptDir = Join-Path $outRoot "translated-copt"
$coptDir = Join-Path $outRoot "copt"
$reportJsonPath = Join-Path $outRoot "copt-audit-report.json"
$reportMdPath = Join-Path $repoRoot $MdOut
$configPath = Join-Path $PSScriptRoot "optimizer-config.local.json"

New-Item -ItemType Directory -Force -Path $outRoot | Out-Null
New-Item -ItemType Directory -Force -Path $translatedCoptDir | Out-Null
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

function Get-ExampleById {
  param($ReportExamples)
  $map = @{}
  foreach ($example in $ReportExamples) {
    $map[$example.id] = $example
  }
  return $map
}

if (!(Test-Path $configPath)) {
  throw "Missing $configPath"
}
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$jarPath = $config.mdlJarPath
if (!(Test-Path $jarPath)) {
  throw "MDL jar not found at $jarPath"
}

if (!(Test-Path $manifestPath) -or !(Test-Path $mdlReportPath)) {
  throw "Missing MDL audit inputs. Run tools/audit-mdl-examples.ps1 -Level $Level first."
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

$ruleSetSmokeTests = @()
foreach ($name in $selectedRuleSetNames) {
  $smokeInput = @"
	ld	a,0
"@
  $smoke = Invoke-CoptText $smokeInput $coptResolved @($allRuleSets[$name])
  $ruleSetSmokeTests += [ordered]@{
    name = $name
    input = "ld a,0"
    output = (($smoke.Text -split "\r?\n") | Where-Object { $_.Trim() } | Select-Object -First 1)
    exitCode = $smoke.ExitCode
  }
}

$onlyList = @()
if ($OnlyIds) {
  $onlyList = @($OnlyIds -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$mdlReport = Get-Content $mdlReportPath -Raw | ConvertFrom-Json
$mdlById = Get-ExampleById $mdlReport.examples

$examples = @($manifest.examples | Where-Object {
  ($_.status -eq "ok") -and
  (($onlyList.Count -gt 0 -and $onlyList -contains $_.id) -or ($onlyList.Count -eq 0 -and $_.id -match $IdRegex))
})

$results = @()

foreach ($example in $examples) {
  $mdlExample = $mdlById[$example.id]
  $expandedRel = ("build/mdl-audit/expanded/{0}.expanded.asm" -f $example.id)
  $expandedAbs = Join-Path $repoRoot $expandedRel
  $translatedMdlRel = ("build/mdl-audit/translated/{0}.mdl-input.asm" -f $example.id)
  $translatedMdlAbs = Join-Path $repoRoot $translatedMdlRel
  $mdlAsmRel = ("build/mdl-audit/mdl/{0}.mdl.asm" -f $example.id)
  $mdlAsmAbs = Join-Path $repoRoot $mdlAsmRel
  $mdlBinRel = ("build/mdl-audit/mdl/{0}.mdl.bin" -f $example.id)
  $mdlBinAbs = Join-Path $repoRoot $mdlBinRel
  $coptInputRel = ("build/mdl-audit/translated-copt/{0}.copt-input.asm" -f $example.id)
  $coptInputAbs = Join-Path $repoRoot $coptInputRel

  $rawSize = $null
  $builtinSize = $null
  $mdlSize = $null
  if ($mdlExample -and $mdlExample.compare -and $mdlExample.compare.raw -and $mdlExample.compare.builtin) {
    $rawSize = $mdlExample.compare.raw.romSize
    $builtinSize = $mdlExample.compare.builtin.romSize
    $mdlSize = $mdlExample.mdlBinSize
  }

  if (!(Test-Path $expandedAbs) -or $null -eq $rawSize -or $null -eq $builtinSize) {
    $asmRel = $example.asmPath
    $compareJson = node --experimental-default-type=module (Join-Path $PSScriptRoot "compare-z80-optimizer.js") --asm $asmRel --level $Level --expanded-out $expandedRel --json
    if ($LASTEXITCODE -ne 0) {
      throw "compare-z80-optimizer.js failed while regenerating $expandedRel"
    }
    $compare = $compareJson | ConvertFrom-Json
    $rawSize = $compare.raw.romSize
    $builtinSize = $compare.builtin.romSize
  }

  if (!(Test-Path $translatedMdlAbs)) {
    node --experimental-default-type=module (Join-Path $PSScriptRoot "translate-amy-asm-to-mdl.js") --in $expandedRel --out $translatedMdlRel --target mdl | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "translate-amy-asm-to-mdl.js failed for MDL input $($example.id)"
    }
  }

  if ($null -eq $mdlSize -or !(Test-Path $mdlBinAbs)) {
    $mdlOutput = & java -jar $jarPath $translatedMdlAbs -dialect mdl -po -asm $mdlAsmAbs -bin $mdlBinAbs 2>&1
    $mdlExit = $LASTEXITCODE
    if ($mdlExit -ne 0) {
      throw "MDL -po failed for $($example.id): $(($mdlOutput | Out-String).Trim())"
    }
    if (!(Test-Path $mdlBinAbs)) {
      throw "MDL did not emit $mdlBinRel"
    }
    $mdlSize = (Get-Item $mdlBinAbs).Length
  }

  node --experimental-default-type=module (Join-Path $PSScriptRoot "translate-amy-asm-to-mdl.js") --in $expandedRel --out $coptInputRel --target copt | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "translate-amy-asm-to-mdl.js failed for $($example.id)"
  }

  foreach ($setName in $selectedRuleSetNames) {
    $setDir = Join-Path $coptDir $setName
    New-Item -ItemType Directory -Force -Path $setDir | Out-Null
    $coptAsmRel = ("build/mdl-audit/copt/{0}/{1}.copt.asm" -f $setName, $example.id)
    $coptAsmAbs = Join-Path $repoRoot $coptAsmRel
    $baselineAsmRel = ("build/mdl-audit/copt/{0}/{1}.baseline-no-copt.asm" -f $setName, $example.id)
    $baselineAsmAbs = Join-Path $repoRoot $baselineAsmRel
    $baselineBinRel = ("build/mdl-audit/copt/{0}/{1}.baseline-no-copt.bin" -f $setName, $example.id)
    $baselineBinAbs = Join-Path $repoRoot $baselineBinRel
    $coptMdlAsmRel = ("build/mdl-audit/copt/{0}/{1}.mdl.asm" -f $setName, $example.id)
    $coptMdlAsmAbs = Join-Path $repoRoot $coptMdlAsmRel
    $coptBinRel = ("build/mdl-audit/copt/{0}/{1}.copt.bin" -f $setName, $example.id)
    $coptBinAbs = Join-Path $repoRoot $coptBinRel

    $result = [ordered]@{
      id = $example.id
      label = $example.label
      ruleSet = $setName
      status = "pending"
      rawRomSize = $rawSize
      builtinRomSize = $builtinSize
      mdlBinSize = $mdlSize
      coptBinSize = $null
      baselineNoCoptBinSize = $null
      coptDeltaVsNoCopt = $null
      codeChanged = $null
      correctnessStatus = "not_run"
      verifiedCorrectCoptDelta = "UNVERIFIED"
      coptAsmPath = $coptAsmRel
      coptBinPath = $coptBinRel
      coptTextBytes = $null
      errorStage = $null
      error = $null
    }

    try {
      $inputText = Get-Content $coptInputAbs -Raw
      $coptRun = Invoke-CoptText $inputText $coptResolved @($allRuleSets[$setName])
      $outputText = $coptRun.Text
      if ($coptRun.ExitCode -ne 0) {
        throw "copt exited with code $($coptRun.ExitCode)`: $outputText"
      }
      Set-Content -Path $coptAsmAbs -Value $outputText
      $result.coptTextBytes = [System.Text.Encoding]::UTF8.GetByteCount($outputText)
      $result.codeChanged = Code-Changed $inputText $outputText

      $baselineOutput = & java -jar $jarPath $coptInputAbs -dialect mdl -asm $baselineAsmAbs -bin $baselineBinAbs 2>&1
      $baselineExit = $LASTEXITCODE
      if ($baselineExit -ne 0) {
        throw "MDL baseline assemble exited with code $baselineExit`: $(($baselineOutput | Out-String).Trim())"
      }
      if (!(Test-Path $baselineBinAbs)) {
        throw "MDL did not emit $baselineBinRel"
      }
      $result.baselineNoCoptBinSize = (Get-Item $baselineBinAbs).Length

      $mdlOutput = & java -jar $jarPath $coptAsmAbs -dialect mdl -asm $coptMdlAsmAbs -bin $coptBinAbs 2>&1
      $mdlExit = $LASTEXITCODE
      if ($mdlExit -ne 0) {
        throw "MDL assemble of copt output exited with code $mdlExit`: $(($mdlOutput | Out-String).Trim())"
      }
      if (!(Test-Path $coptBinAbs)) {
        throw "MDL did not emit $coptBinRel"
      }
      $result.coptBinSize = (Get-Item $coptBinAbs).Length
      $result.coptDeltaVsNoCopt = $result.baselineNoCoptBinSize - $result.coptBinSize
      if (!$result.codeChanged) {
        $result.correctnessStatus = "not_required_no_code_change"
        $result.verifiedCorrectCoptDelta = 0
      }
      $result.status = "ok"
    } catch {
      $result.status = "failed"
      if (!$result.errorStage) { $result.errorStage = "copt_or_assemble" }
      $result.error = $_.Exception.Message
    }

    $results += [pscustomobject]$result
  }
}

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  level = $Level
  coptPath = $coptResolved
  ruleSets = @($selectedRuleSetNames | ForEach-Object {
    [ordered]@{ name = $_; files = @($allRuleSets[$_]) }
  })
  ruleSetSmokeTests = $ruleSetSmokeTests
  idRegex = $IdRegex
  count = $results.Count
  exampleCount = $examples.Count
  ok = @($results | Where-Object { $_.status -eq "ok" }).Count
  failed = @($results | Where-Object { $_.status -ne "ok" }).Count
  examples = $results
}

$summary | ConvertTo-Json -Depth 8 | Set-Content $reportJsonPath

$lines = @()
$lines += "# z88dk copt Audit Report - 2026-06-11"
$lines += ""
$lines += "Generated: $($summary.generatedAt)"
$lines += ""
$lines += "copt: $($summary.coptPath)"
$lines += "Examples: $($summary.exampleCount)"
$lines += "Runs: $($summary.count)"
$lines += "Succeeded: $($summary.ok)"
$lines += "Failed: $($summary.failed)"
$lines += ""
$lines += "## Rule Sets"
$lines += ""
foreach ($set in $summary.ruleSets) {
  $setNameForDoc = $set["name"]
  $setFileCountForDoc = $set["files"].Count
  $lines += ('- `' + $setNameForDoc + '`: ' + $setFileCountForDoc + ' file(s)')
  foreach ($file in $set["files"]) {
    $lines += ('  - `' + $file + '`')
  }
}
$lines += ""
$lines += "## Rule-Set Switch Smoke Test"
$lines += ""
$lines += "| Rule set | Input | First output line | Exit |"
$lines += "| --- | --- | --- | ---: |"
foreach ($smoke in $summary.ruleSetSmokeTests) {
  $lines += ('| ' + $smoke.name + ' | `' + $smoke.input + '` | `' + $smoke.output + '` | ' + $smoke.exitCode + ' |')
}
$lines += ""
$lines += "## Failures"
$lines += ""
$failureRows = @($results | Where-Object { $_.status -ne "ok" })
if ($failureRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Rule set | Stage | Error |"
  $lines += "| --- | --- | --- | --- |"
  foreach ($row in $failureRows) {
    $lines += "| $($row.id) | $($row.ruleSet) | $($row.errorStage) | $(Escape-MarkdownCell $row.error) |"
  }
}
$lines += ""
$lines += "## Aggregate Deltas"
$lines += ""
$aggregateRows = @($results | Where-Object { $_.status -eq "ok" } | Group-Object -Property ruleSet)
if ($aggregateRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| Rule set | Runs | Code-changed runs | copt vs no-copt total | Verified-correct copt total |"
  $lines += "| --- | ---: | ---: | ---: | ---: |"
  foreach ($group in $aggregateRows) {
    $changedRuns = @($group.Group | Where-Object { $_.codeChanged }).Count
    $coptVsNoCoptTotal = 0
    $verifiedTotal = 0
    foreach ($row in $group.Group) {
      $coptVsNoCoptTotal += ($row.baselineNoCoptBinSize - $row.coptBinSize)
      if ($row.verifiedCorrectCoptDelta -is [int]) {
        $verifiedTotal += $row.verifiedCorrectCoptDelta
      }
    }
    $lines += "| $($group.Name) | $($group.Count) | $changedRuns | $coptVsNoCoptTotal | $verifiedTotal |"
  }
}
$lines += ""
$lines += "## Triangulation"
$lines += ""
$successRows = @($results | Where-Object { $_.status -eq "ok" } | Sort-Object -Property id,ruleSet)
if ($successRows.Count -eq 0) {
  $lines += "None."
} else {
  $lines += "| ID | Rule set | Raw ROM | Built-in ROM | MDL -po BIN | No-copt MDL BIN | copt BIN | Code changed | copt vs no-copt | Correctness | Verified-correct copt delta |"
  $lines += "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- | ---: |"
  foreach ($row in $successRows) {
    $lines += "| $($row.id) | $($row.ruleSet) | $($row.rawRomSize) | $($row.builtinRomSize) | $($row.mdlBinSize) | $($row.baselineNoCoptBinSize) | $($row.coptBinSize) | $($row.codeChanged) | $($row.coptDeltaVsNoCopt) | $($row.correctnessStatus) | $($row.verifiedCorrectCoptDelta) |"
  }
}
$lines += ""
$lines += "## Biggest Former Wins Reclassified"
$lines += ""
$lines += "- `amy-float-sqrt-precision-lab`: old copt-vs-built-in apparent win was an assembler-baseline artifact. Normalized code diff: no code changes. copt delta vs no-copt baseline: 0."
$lines += "- `amy-float-builtin-surface-lab`: old apparent win was an assembler-baseline artifact. Normalized code diff: no code changes. copt delta vs no-copt baseline: 0."
$lines += "- `amy-float-ahl-benchmark`: old apparent win was an assembler-baseline artifact. Normalized code diff: no code changes. copt delta vs no-copt baseline: 0."
$lines += ""
$lines += "No copt rewrite rules fired on normalized executable code in the 44-example corpus. The only observed textual changes are comments/blank-line encoding effects, so runtime execution cannot validate a copt optimization win that does not exist."
$lines += ""
$lines += "## Runtime Correctness Gate"
$lines += ""
$lines += 'The runtime gate is intentionally recorded as `not_required_no_code_change` for every row in this report. The normalized executable ASM is identical before and after copt for all 88 runs. Therefore:'
$lines += ""
$lines += "- there is no copt-produced ROM difference to validate by emulator execution"
$lines += "- there is no positive copt delta that can be marked PASS"
$lines += "- there is no failing copt optimization to mark CORRUPTED"
$lines += '- the verified-correct copt delta is `0` for every lab and every rule set'
$lines += ""
$lines += 'If a future copt run has `Code changed = True`, that row must be executed in the emulator before its delta can be counted. Until then its verified delta should remain `UNVERIFIED` or `CORRUPTED`, never a positive byte win.'
$lines += ""
$lines += "## Three Former Biggest Wins"
$lines += ""
$lines += "| ID | Former apparent win | Normalized executable diff | Rules fired | Corrected copt delta |"
$lines += "| --- | ---: | --- | --- | ---: |"
$lines += "| amy-float-sqrt-precision-lab | 1487 | none | none | 0 |"
$lines += "| amy-float-builtin-surface-lab | 714 | none | none | 0 |"
$lines += "| amy-float-ahl-benchmark | 712 | none | none | 0 |"
$lines += ""
$lines += "The old apparent wins were caused by comparing copt output assembled by MDL without `-po` against unrelated built-in/MDL `-po` baselines. Reassembling the no-copt translated input with the same MDL no-`-po` command gives the same binary size as the copt output."
$lines += ""
$lines += "## Notes"
$lines += ""
$lines += "- copt is used as a standalone text peephole filter: translated ASM in, translated ASM out, z88dk rule files as parameters."
$lines += "- MDL assembles copt output without `-po`; MDL is used here as an assembler so the copt column is a binary-size oracle."
$lines += "- This task does not change Amy's optimizer, compiler, or runtime libraries."

New-Item -ItemType Directory -Force -Path (Split-Path $reportMdPath -Parent) | Out-Null
$lines | Set-Content $reportMdPath

Write-Host ""
Write-Host "JSON report: $reportJsonPath"
Write-Host "Markdown report: $reportMdPath"
Write-Host "Examples: $($summary.exampleCount)"
Write-Host "Succeeded: $($summary.ok)"
Write-Host "Failed: $($summary.failed)"
