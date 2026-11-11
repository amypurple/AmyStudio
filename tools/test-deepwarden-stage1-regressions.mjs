#!/usr/bin/env node
import assert from "node:assert/strict";

import { generateAsm } from "../studio/core/project.js";
import { routineClobbersRegister } from "../studio/core/compiler/routineAbi.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

function compile(source) {
  const result = transpileAmyForTest(source);
  assert.equal(result.ok, true, result.log);
  return result;
}

const framedSource = `enable spinner
sub StoryPage(u8 Sn)
  mode 2 screen
  load default ascii
  if Sn > 0 then StoryPage(Sn - 1)
end sub
StoryPage(0)
MainWait:
wait
goto MainWait`;
const framed = compile(framedSource);
const routine = framed.asmBody.match(/AMY_UPROC_StoryPage:[\s\S]*?(?=\nAMY_ULBL_MainWait:)/)?.[0] || "";
assert.match(routine, /push ix\s+push iy\s+call AMY_SET_GRAPHICS_MODE2_RAW\s+pop iy\s+pop ix/i);
assert.match(routine, /push ix\s+push iy\s+call AMY_LOAD_DEFAULT_ASCII\s+pop iy\s+pop ix/i);
assert.equal(routineClobbersRegister("AMY_SET_GRAPHICS_MODE2_RAW", "IX"), true);
assert.equal(routineClobbersRegister("AMY_SET_GRAPHICS_MODE2_RAW", "IY"), true);

const fullAsm = generateAsm({
  sourceText: framedSource,
  projectName: "Deepwarden stage 1 regression",
  memoryProfile: "colecovision_legacy_sdcc",
  selectedLibs: [],
  selectedBundles: [],
  selectedCompression: [],
  selectedAssets: [],
  projectFiles: []
}, framed.asmBody, framed.assets || [], framed.metadata || {});
assert.match(fullAsm, /ld \(\$701F\),a\s+ld a,\(SPINNER_ENABLED\)\s+or a\s+jr z,[^\n]+\s+ei\s+[^\n]+:\s+pop af\s+ret/i);
assert.match(fullAsm, /ld \(NMI_FLAG\),a\s+ld a,\(SPINNER_ENABLED\)\s+or a\s+jr z,[^\n]+\s+ei\s+[^\n]+:\s+pop af\s+ret/i);

const equ = compile(`sub Bar
end sub
asm {
Foo equ $1234
}
call asm Foo
Done:
goto Done`);
assert.match(equ.asmBody, /^Foo equ \$1234$/m);

console.log("Deepwarden stage 1 regressions: PASS (IX\/IY guards, spinner EI tails, detached EQU)");
