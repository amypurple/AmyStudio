import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "../studio/core/romTestRecorderUi.js"), "utf8");
assert.match(source, /data-action="saveAdamMedia"/, "ADAM inspector has no media-save action");
assert.match(source, /writeProtected:\s*false/, "ROM TEST & DEBUG still mounts ADAM media read-only");
assert.match(source, /core\.readAdamMedia\(slot\)/, "media-save action does not export the mounted image");
assert.match(source, /-saved\$\{extension\}/, "saved media filename does not preserve DSK/DDP type");
console.log("ROM TEST & DEBUG writable ADAM media UI: PASS");
