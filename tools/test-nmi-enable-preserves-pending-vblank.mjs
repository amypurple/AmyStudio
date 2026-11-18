#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");

const cases = [
  ["src/alexis_lib/coleco_nmi.asm", "AMY_ENABLE_NMI"],
  ["src/alexis_lib/coleco_vdp_screen.asm", "AMY_SCREEN_ON_NMI"],
  ["src/alexis_lib/coleco_vram_upload.asm", "AMY_VRAM_END"]
];

for (const [path, label] of cases) {
  const text = read(path);
  const body = text.match(new RegExp(`^${label}:\\s*([\\s\\S]*?)(?=^AMY_[A-Z0-9_]+:|(?![\\s\\S]))`, "m"))?.[1] || "";
  assert.ok(body, `${path}: missing ${label}`);
  assert.match(body, /(?:call|jp)\s+WRITE_REGISTER/i, `${path}: ${label} no longer enables the VDP interrupt`);
  assert.doesNotMatch(body, /(?:call|jp)\s+READ_REGISTER/i,
    `${path}: ${label} clears a pending VBlank after enabling the interrupt`);
}

const project = read("studio/core/project.js");
for (const label of ["AMY_ENABLE_NMI", "AMY_SCREEN_ON_NMI"]) {
  const body = project.match(new RegExp(`replaceRoutine\\(adapted, "${label}", \\[([\\s\\S]*?)\\n  \\]\\);`))?.[1] || "";
  assert.ok(body, `project.js: missing native EOS replacement for ${label}`);
  assert.doesNotMatch(body, /READ_REGISTER/, `project.js: ${label} discards a pending VBlank`);
}

console.log("NMI enable preserves pending VBlank: PASS (ColecoVision and native EOS paths)");
