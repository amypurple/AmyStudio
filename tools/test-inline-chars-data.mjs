#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const inline = transpileAmyForTest(`
text screen
loop forever

data InlineText chars "SAND{0}"
`);
assert.equal(inline.ok, true, inline.log);
assert.match(inline.asmBody, /AMY_UDATA_InlineText:/);
assert.match(inline.asmBody, /db \$53,\$41,\$4E,\$44,\$00/i);

const multiline = transpileAmyForTest(`
text screen
loop forever

data MultilineText chars
  "SAND{0}"
end data
`);
assert.equal(multiline.ok, true, multiline.log);
assert.match(multiline.asmBody, /db \$53,\$41,\$4E,\$44,\$00/i);

console.log("Inline chars data: PASS");
