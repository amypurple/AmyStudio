import assert from "node:assert/strict";
import fs from "node:fs";

const include = fs.readFileSync(new URL("../include/fujinet_mailbox.inc", import.meta.url), "utf8")
  .replace(/\r/g, "");

assert.match(include, /FN_PARAM8:\s*\n\s*ld b,a\s*\n\s*ld a,1\s*\n\s*call FN_TX_BYTE\s*\n\s*ld a,b\s*\n\s*jp FN_TX_BYTE/i);
assert.match(include, /FN_PARAM16:[\s\S]*?ld a,2\s*\n\s*call FN_TX_BYTE[\s\S]*?ld a,l\s*\n\s*call FN_TX_BYTE[\s\S]*?ld a,h\s*\n\s*jp FN_TX_BYTE/i);

console.log("FujiNet size-prefixed parameter encoding: PASS");
