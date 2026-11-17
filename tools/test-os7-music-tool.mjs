import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const studioUi = await readFile(path.join(root, "studio", "core", "projectFileUi.js"), "utf8");
assert.match(studioUi, /OS7 four-voice score tool/);
assert.match(studioUi, /tools\/audio\/os7music\.py/);
assert.match(studioUi, /tools\/fixtures\/os7-music\/threetone-march\.txt/);
const pythonCandidates = process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
const python = pythonCandidates.find((candidate) => spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0);

if (!python) {
  console.log("OS7 music tool UI: PASS; generator runtime: SKIP (Python unavailable to Node)");
  process.exit(0);
}

const work = await mkdtemp(path.join(tmpdir(), "amy-os7music-"));
try {
  const tool = path.join(root, "tools", "audio", "os7music.py");
  const score = path.join(root, "tools", "fixtures", "os7-music", "threetone-march.txt");
  const output = path.join(work, "music.alexis");
  const json = path.join(work, "music.json");
  const result = spawnSync(python, [tool, score, "-o", output, "--json", json], { encoding: "utf8", cwd: root });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /table 3616 bytes/);
  assert.match(result.stdout, /1792 frames/);
  const source = await readFile(output, "utf8");
  assert.match(source, /set sound table LmSoundTable areas 6/i);
  assert.match(source, /dw\s+LmLead,\$702B/i);
  const states = JSON.parse(await readFile(json, "utf8"));
  assert.ok(Array.isArray(states) && states.length >= 1792, "Expected at least one complete modeled loop");
  assert.ok(states.some((frame) => frame[6] < 15), "Expected audible noise/drums in the modeled PSG states");
  console.log("OS7 music tool: PASS (four voices, effects, area order, duration and PSG model)");
} finally {
  await rm(work, { recursive: true, force: true });
}
