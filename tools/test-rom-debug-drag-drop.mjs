import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../studio/core/romTestRecorderUi.js", import.meta.url), "utf8");

assert.match(source, /accept="\.rom,\.col,\.dsk,\.ddp"/, "external media picker must accept ROM, DSK, and DDP files");
assert.match(source, /dialog\.addEventListener\("dragover"/, "debug dialog must accept file dragging");
assert.match(source, /dialog\.addEventListener\("drop"/, "debug dialog must handle dropped files");
assert.match(source, /isKnownEmulatorMediaName\(file\.name\)/, "drop handler must recognize supported emulator media names");
assert.match(source, /uncompressed \.rom, \.col, \.dsk, or \.ddp/, "compressed-media rejection must be explicit");
assert.match(source, /await loadExternalRomFile\(romFile\)/, "dropped ROMs must use the shared loader");

console.log("ROM debugger drag-and-drop checks passed.");
