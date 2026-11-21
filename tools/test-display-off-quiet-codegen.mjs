#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const source = [
  'cartridge "QUIET/DISPLAY/2026"',
  "display off quiet",
  "loop forever",
].join("\n");
const result = transpileAmyForTest(source);
assert.equal(result.ok, true, result.log);
assert.match(result.asmBody, /call AMY_MUTE_ALL[\s\S]*and \$BF[\s\S]*call WRITE_REGISTER/);
console.log("display off quiet codegen: PASS");
