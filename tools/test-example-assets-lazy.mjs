import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../studio/examples.js", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+.*from\s+["']\.\/examples-project-files\.js/m,
  "example project assets must not be a static Amy Studio startup dependency"
);
assert.match(
  source,
  /import\(["']\.\/examples-project-files\.js[^"']*["']\)/,
  "example project assets remain available through an on-demand import"
);

console.log("Lazy example asset loading tests passed.");
