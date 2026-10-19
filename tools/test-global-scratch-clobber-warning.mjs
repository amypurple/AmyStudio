#!/usr/bin/env node
import assert from "node:assert/strict";
import { analyzeGlobalScratchClobbers } from "../studio/core/compiler/transpileAmyCore.js";

const strip = (line) => String(line).replace(/'.*$/, "").trimEnd();

const broken = analyzeGlobalScratchClobbers(`
u8 N = 0
u8 Lost = 0
N = Lost
inc N
ShowStatus
if N >= 3 then goto game_over
sub ShowStatus:
  N = 7
end sub
game_over:
`, strip);
assert.equal(broken.length, 1);
assert.match(broken[0], /N controls a decision after a call to showstatus/i);

const reassigned = analyzeGlobalScratchClobbers(`
u8 N = 0
N = 2
ShowStatus
N = 3
if N >= 3 then goto done
sub ShowStatus:
  N = 7
end sub
done:
`, strip);
assert.deepEqual(reassigned, []);

const transitive = analyzeGlobalScratchClobbers(`
u8 N = 0
N = 2
Outer
if N = 7 then goto done
sub Outer:
  Inner
end sub
sub Inner:
  N = 7
end sub
done:
`, strip);
assert.equal(transitive.length, 1);
assert.match(transitive[0], /call to outer/i);

const safeForms = analyzeGlobalScratchClobbers(`
u8 N[2]
u8 M = 0
M = 2
if M = 2 then
  Worker
end if
print M
sub Worker:
  local u8 M = 0
  M = 7
end sub
`, strip);
assert.deepEqual(safeForms, []);

const explicitOutput = analyzeGlobalScratchClobbers(`
u8 Result = 0
ProduceResult
if Result = 1 then goto done
sub ProduceResult:
  Result = 1
end sub
done:
`, strip);
assert.deepEqual(explicitOutput, []);

console.log("Global scratch clobber warning tests: PASS");
