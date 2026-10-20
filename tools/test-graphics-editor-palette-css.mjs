import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(root, "studio", "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "studio", "index.html"), "utf8");

const ruleBody = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
};

const palette = ruleBody(".graphics-editor-palette__tile");
assert.match(palette, /font:\s*700 10px\/1\.2 var\(--mono\)/);
assert.match(palette, /text-shadow:\s*none/);

const stableStatesMatch = css.match(
  /\.graphics-editor-palette__tile:hover:not\(:disabled\),\s*\.graphics-editor-palette__tile:focus-visible,\s*\.graphics-editor-palette__tile\.selected\s*\{([^}]*)\}/m,
);
assert.ok(stableStatesMatch, "missing stable palette interaction-state rule");
const stableStates = stableStatesMatch[1];
assert.match(stableStates, /font:\s*700 10px\/1\.2 var\(--mono\)/);
assert.match(stableStates, /text-shadow:\s*none/);
assert.match(html, /styles\.css\?v=20261020-graphics-palette1/);

console.log("graphics editor palette CSS tests: OK");
