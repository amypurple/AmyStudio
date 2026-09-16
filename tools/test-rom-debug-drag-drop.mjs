import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../studio/core/romTestRecorderUi.js", import.meta.url), "utf8");

assert.match(source, /accept="\.rom,\.col"/, "external ROM picker must accept only .rom and .col");
assert.match(source, /dialog\.addEventListener\("dragover"/, "debug dialog must accept file dragging");
assert.match(source, /dialog\.addEventListener\("drop"/, "debug dialog must handle dropped files");
assert.match(source, /\/\\\.\(\?:rom\|col\)\$\/i/, "drop handler must select .rom or .col files");
assert.match(source, /ZIP and GZ archives are not supported yet/, "compressed ROM rejection must be explicit");
assert.match(source, /await loadExternalRomFile\(romFile\)/, "dropped ROMs must use the shared loader");

console.log("ROM debugger drag-and-drop checks passed.");
