param(
  [string]$Level = "balanced",
  [string]$OutDir = "build/optimizer-full-audit",
  [switch]$SkipRuntime
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$auditJson = Join-Path $OutDir "compile-audit.json"
$postDir = Join-Path $OutDir "post-builtin"
$runtimeDir = Join-Path $repoRoot "build/rom-tests"

Push-Location $repoRoot
try {
  node tools/check-examples.mjs --optimization $Level --audit-json $auditJson
  if ($LASTEXITCODE -ne 0) { throw "Amy corpus compilation audit failed." }

  & tools/audit-post-builtin-oracles.ps1 `
    -Level $Level `
    -OutDir $postDir `
    -AllAmyExamples `
    -MdOut (Join-Path $OutDir "post-builtin.md")
  if ($LASTEXITCODE -ne 0) { throw "Post-Amy MDL corpus audit failed." }

  if (!$SkipRuntime) {
    node tools/run-rom-tests.mjs
    if ($LASTEXITCODE -ne 0) { throw "Amy ROM runtime tests failed." }

    # Execute every RAM-result self-test on MDL output. ROM-address checkpoints
    # remain excluded because optimization can legitimately relocate them.
    node tools/run-mdl-rom-selftests.mjs --post-dir $postDir
    if ($LASTEXITCODE -ne 0) { throw "MDL ROM runtime self-tests failed." }
  }

  Write-Host "Full Amy optimizer audit PASS ($Level)."
} finally {
  Pop-Location
}