#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const projectJs = fs.readFileSync(path.join(repoRoot, "studio/core/project.js"), "utf8");

assert.doesNotMatch(
  projectJs,
  /lines\.push\("        ld hl,NMI_FLAG"\)|lines\.push\("        ld hl,VDP_STATUS"\)/,
  "NMI prologue must not clobber HL before the generated push hl"
);
assert.match(projectJs, /lines\.push\("        ld \(NMI_FLAG\),a"\)/);
assert.match(projectJs, /lines\.push\("        ld \(VDP_STATUS\),a"\)/);

console.log("nmi prologue codegen: PASS");
