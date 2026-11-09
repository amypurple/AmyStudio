#!/usr/bin/env node
import assert from "node:assert/strict";
import { inspectSafeArea } from "./amy-author-safe-area.mjs";

assert.equal(inspectSafeArea('print at 2,1,"SAFE"\nset sprite 0 at 16,8 pattern 1 color 15').length, 0);
const bad = inspectSafeArea('print at 1,0,"TOO WIDE"\nset sprite 0 at 5,190 pattern 1 color 15');
assert.equal(bad.length, 2);
assert.deepEqual(bad.map((item) => item.kind), ["text", "sprite"]);
console.log("Amy author safe area: PASS (literal text and sprite essentials)");
