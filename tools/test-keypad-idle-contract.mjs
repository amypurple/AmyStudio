import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bad = [];

function visit(entry) {
  for (const item of fs.readdirSync(entry, { withFileTypes: true })) {
    const full = path.join(entry, item.name);
    if (item.isDirectory()) visit(full);
    else if (/\.(?:alexis|mjs|js)$/i.test(item.name)) {
      const text = fs.readFileSync(full, "utf8");
      if (/keypad\s*\([^)]*\)\s*(?:<>|!=)\s*0\b/i.test(text)) bad.push(path.relative(root, full));
    }
  }
}

visit(path.join(root, "studio/examples-src"));
visit(path.join(root, "tools"));
assert.deepEqual(bad, [], `keypad idle must be compared with 255, not 0: ${bad.join(", ")}`);

const sample = fs.readFileSync(path.join(root, "studio/examples-src/cvbasic-controller-port.alexis"), "utf8");
assert.match(sample, /keypad\(1\)\s*=\s*255/i);
assert.match(sample, /keypad\(2\)\s*=\s*255/i);
console.log("Keypad idle contract: 0 is a key and 255 is idle PASS");
