import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../studio/core/romTestRecorderUi.js", import.meta.url), "utf8");

assert.match(source, /screenWrap\.requestFullscreen\(\)/,
  "fullscreen must target the game screen rather than the complete debugger dialog");
assert.doesNotMatch(source, /dialog\.requestFullscreen\(\)/,
  "debugger controls must not occupy game fullscreen mode");
assert.match(source, /\.rom-recorder__screen-wrap:fullscreen/,
  "game fullscreen mode needs dedicated sizing styles");
assert.match(source, /event\.altKey && event\.key === "Enter"/,
  "Alt+Enter fullscreen shortcut is missing");
assert.match(source, /screenWrap\.addEventListener\("dblclick", toggleGameFullscreen\)/,
  "double-click fullscreen shortcut is missing");

console.log("Emulator fullscreen UI PASS");
