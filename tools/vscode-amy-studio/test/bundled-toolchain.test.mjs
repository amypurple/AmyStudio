import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compiler = process.env.AMY_VSCODE_COMPILER
  ? resolve(process.env.AMY_VSCODE_COMPILER)
  : resolve(root, "toolchain", "tools", "amyc.mjs");

assert.ok(existsSync(compiler), `Missing staged compiler: ${compiler}`);

function compile(name, source, expected = {}) {
  const directory = mkdtempSync(resolve(tmpdir(), "amy-vscode-test-"));
  const input = resolve(directory, "main.alexis");
  writeFileSync(input, source, "utf8");
  const result = spawnSync(process.execPath, [
    compiler,
    input,
    "--opt", "balanced",
    "--asm", resolve(directory, "main.asm"),
    "--rom", resolve(directory, "main.rom"),
  ], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const message = `${result.stdout}\n${result.stderr}`;
  const report = { ok: result.status === 0, message };
  rmSync(directory, { recursive: true, force: true });
  if (expected.error) {
    assert.equal(report.ok, false, `${name}: expected a diagnostic`);
    assert.match(report.message, expected.error, `${name}: wrong diagnostic`);
  } else {
    assert.equal(report.ok, true, `${name}: ${report.message}`);
  }
}

compile("digits expression concatenation", `
u8 Lv = 1
  text screen
  print at 2,5, "L " + digits$(Lv + 1, 2)
`);

compile("plain str is unpadded", `
u16 W = 20
  text screen
  print at 2,5, "A" + str$(W) + "B"
`);

compile("word table with u16 index", `
u16 J = 129
u16 W = 0
  W = Tab[J]
data Tab words = 0,1,2,3,4,5,6,7,8,9
`);

compile("u32 plus named constant", `
const Funeral = 10
u32 Fe = 24980
  Fe = Fe + Funeral
`);

compile("late global diagnostic", `
sub CheckValue()
  Value = 1
end sub
u8 Value = 0
  call CheckValue()
`, { error: /Value.*declared.*after|global.*Value/i });

console.log("VS Code bundled Amy compiler: PASS (current regression contracts)");
