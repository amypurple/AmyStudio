import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../studio/core/projectFileUi.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../studio/styles.css", import.meta.url), "utf8");

assert.match(source, /\["Tone", "Tone period", "Bass", "Noise", "Rest"\]/, "Sound FX composer must support exact tones and rests");
assert.match(source, /action\("Replace selected"/, "Selected commands must be directly replaceable");
assert.match(source, /loadSelectedCommand\(\)/, "Selecting a command must load it into the editor");
assert.match(source, /action\("▶ Play"/, "Sound FX editor must expose one sequence play action");
assert.match(source, /action\("Ⅱ Pause"/, "Sound FX editor must expose sequence pause/resume");
assert.match(source, /action\("■ Stop"/, "Sound FX editor must expose sequence stop");
assert.match(source, /inputs\["pitch sweep"\]/, "Frequency sweeps must be editable");
assert.match(source, /inputs\["volume count"\]/, "Volume sweeps must be editable");
assert.match(source, /button\.draggable = true/, "Commands must support drag reordering");
assert.match(styles, /\.sound-sequence-editor__action-group\.is-transport/, "Transport must be visually grouped");

console.log("Sound FX editor UI tests passed.");
