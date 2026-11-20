import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(path.join(tmpdir(), "amy-asm-relax-"));
const sourcePath = path.join(work, "relax.alexis");

writeFileSync(sourcePath, `cartridge "ASM RELAX/AMY/2026"
  call asm StrictMain
  call asm RelaxMain
  loop forever
asm {
StrictMain:
    jp StrictTarget
StrictTarget:
    ret
}
asm relax {
RelaxMain:
    jp RelaxTarget
RelaxTarget:
    nop
.timed
TimedJump:
    jp TimedTarget
TimedTarget:
    nop
.endtimed
    ret
}
`, "utf8");

try {
  for (const profile of ["safe", "balanced", "aggressive", "experimental"]) {
    const asmPath = path.join(work, `relax-${profile}.asm`);
    const result = spawnSync(process.execPath, [
      path.join(repo, "tools", "amyc.mjs"), sourcePath,
      "--opt", profile,
      "--optimized-asm", asmPath,
      "--report-jr-candidates"
    ], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}\n${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /StrictMain:\s*\r?\n\s*jp StrictTarget/i, `${profile}: ordinary ASM must stay opaque`);
    assert.match(asm, /TimedJump:\s*\r?\n\s*jp TimedTarget/i, `${profile}: .timed must protect JP timing`);
    if (profile === "safe") {
      assert.match(asm, /RelaxMain:\s*\r?\n\s*jp RelaxTarget/i, "safe: branch shortening is disabled by profile");
    } else {
      assert.match(asm, /RelaxMain:\s*\r?\n\s*jr RelaxTarget/i, `${profile}: asm relax should shorten eligible JP`);
    }
    assert.match(result.stdout, /JR candidates: 3 \(3 bytes potential\)/);
    assert.match(result.stdout, /opaque; programmer decision/);
    assert.match(result.stdout, /timed\/protected/);
    if (profile !== "safe") assert.match(result.stdout, /applied by asm relax/);
  }

  for (const [name, source, expected] of [
    ["strict-timed", `asm {\n.timed\n  nop\n.endtimed\n}\n`, /\.timed is only valid inside 'asm relax \{'/i],
    ["unclosed-timed", `asm relax {\n.timed\n  nop\n}\n`, /ended before \.endtimed/i],
    ["nested-timed", `asm relax {\n.timed\n.timed\n  nop\n.endtimed\n}\n`, /nested \.timed regions are not supported/i],
  ]) {
    const invalidPath = path.join(work, `${name}.alexis`);
    writeFileSync(invalidPath, source, "utf8");
    const result = spawnSync(process.execPath, [path.join(repo, "tools", "amyc.mjs"), invalidPath], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    });
    assert.equal(result.status, 1, `${name}: invalid marker form should fail`);
    assert.match(`${result.stdout}\n${result.stderr}`, expected, `${name}: diagnostic`);
  }
  console.log("User ASM relax/timed/report regression passed.");
} finally {
  rmSync(work, { recursive: true, force: true });
}
