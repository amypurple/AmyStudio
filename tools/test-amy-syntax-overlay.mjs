import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  AMY_SYNTAX_COLORS_STORAGE_KEY,
  amySyntaxColorWord,
  loadAmySyntaxColorsPreference,
  renderAmySyntaxHtml,
  saveAmySyntaxColorsPreference
} from "../studio/core/editor/sourceSyntaxOverlay.js";

assert.equal(amySyntaxColorWord("en-US"), "color");
assert.equal(amySyntaxColorWord("en-CA"), "colour");
assert.equal(amySyntaxColorWord("fr-CA"), "colour");

const preferenceStorage = new Map();
const storage = {
  getItem: (key) => preferenceStorage.get(key) ?? null,
  setItem: (key, value) => preferenceStorage.set(key, value)
};
assert.equal(loadAmySyntaxColorsPreference(storage), false);
saveAmySyntaxColorsPreference(false, storage);
assert.equal(preferenceStorage.get(AMY_SYNTAX_COLORS_STORAGE_KEY), "off");
assert.equal(loadAmySyntaxColorsPreference(storage), false);
saveAmySyntaxColorsPreference(true, storage);
assert.equal(loadAmySyntaxColorsPreference(storage), true);

const html = renderAmySyntaxHtml("u8 X = $20\nprint \"<Amy>\" ' note");
assert.match(html, /amy-token--type/);
assert.match(html, /amy-token--number/);
assert.match(html, /amy-token--keyword/);
assert.match(html, /amy-token--string/);
assert.match(html, /amy-token--comment/);
assert.ok(!html.includes("<Amy>"), "source text must be HTML escaped");
assert.ok(html.includes("&lt;Amy&gt;"));

const largeSource = Array.from({ length: 2500 }, (_, index) =>
  "u16 Value" + index + " = $" + (index & 0xffff).toString(16) + " ' generated"
).join("\n");
const start = performance.now();
const largeHtml = renderAmySyntaxHtml(largeSource, { startLine: 1200, endLine: 1280 });
const elapsed = performance.now() - start;
assert.equal(largeHtml.split("\n").length, 80);
assert.ok(elapsed < 80, "2500-line tokenize plus visible render should remain interactive; got " + elapsed.toFixed(1) + "ms");

console.log("Amy syntax overlay: PASS (" + elapsed.toFixed(1) + "ms for 2500-line source, 80 rendered lines)");