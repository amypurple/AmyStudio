import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examples = path.join(root, "studio", "examples-src");
const index = JSON.parse(fs.readFileSync(path.join(examples, "index.json"), "utf8"));
const byId = new Map(index.map((entry) => [entry.id, entry]));

assert.equal(byId.get("adam-eos-filesystem-demo")?.memoryProfile, "adam-eos-application");
assert.equal(byId.get("adam-os7-eos-hybrid-storage")?.memoryProfile, "adam-os7-eos-drivers");
assert.equal(byId.get("adam-os7-eos-hybrid-storage")?.buildTarget?.platform, "adam-disk");

const mega = JSON.parse(fs.readFileSync(path.join(examples, "megacart-bank-demo.amy.json"), "utf8"));
assert.equal(mega.target.platform, "colecovision-megacart");
assert.equal(mega.target.romSizeKb, 128);
assert.deepEqual(mega.outputs.map(({ type }) => type), ["fixed-bank", "switchable-bank", "switchable-bank"]);
for (const file of ["megacart-bank-demo-fixed.asm", "megacart-bank-demo-bank1.asm", "megacart-bank-demo-bank2.asm"]) {
  assert.ok(fs.statSync(path.join(examples, file)).size > 0, `${file} must be present`);
}

const language = fs.readFileSync(path.join(root, "docs", "amy-language.md"), "utf8");
const cookbook = fs.readFileSync(path.join(root, "docs", "amy-optimization-cookbook.md"), "utf8");
for (const phrase of ["ADAM Native EOS Filesystem", "ADAM OS7 + EOS Hybrid Storage", "megacart-bank-demo.amy.json"]) {
  assert.ok(cookbook.includes(phrase), `cookbook must reference ${phrase}`);
}
assert.ok(language.includes("amy-optimization-cookbook.md"));
console.log("EOS, hybrid, and MegaCart learning materials: PASS");
