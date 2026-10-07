#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "studio", "core", "romTestRecorderUi.js"), "utf8");

for (const fragment of [
  'data-action="resetAdam"',
  'data-action="resetColecoVision"',
  'core.resetAdam();',
  'core.resetAdam({ cartridge: true });',
  'core.startAdam({ cartridge: !adamMediaBytes && Boolean(rom) });'
]) {
  assert.ok(source.includes(fragment), `ROM debugger is missing ${fragment}`);
}

assert.match(source, /Open an ADAM \.dsk\/\.ddp or insert a \.rom\/\.col cartridge first/);
console.log("ROM TEST & DEBUG ADAM dual-reset UI: PASS");
