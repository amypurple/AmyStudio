import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const help = execFileSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), "--help"], {
  cwd: root,
  encoding: "utf8"
});
const markdown = readFileSync(path.join(root, "docs", "amy-compiler-cli.md"), "utf8");
const web = readFileSync(path.join(root, "cli.html"), "utf8");

const options = [...help.matchAll(/(?:^|\s)(--[a-z][a-z0-9-]*)/gm)].map((match) => match[1]);
const uniqueOptions = [...new Set(options)];
assert(uniqueOptions.length >= 15, `Unexpectedly short CLI option list: ${uniqueOptions.length}`);

for (const option of uniqueOptions) {
  assert(markdown.includes(option), `${option} is missing from docs/amy-compiler-cli.md`);
  assert(web.includes(option), `${option} is missing from cli.html`);
}

for (const value of [
  "auto", "off", "safe", "balanced", "aggressive", "experimental",
  "colecovision-cartridge", "colecovision-megacart", "adam-native-program", "adam-disk", "adam-data-pack",
  "dsk", "ddp"
]) {
  assert(markdown.includes(value), `${value} is missing from the Markdown CLI reference`);
  assert(web.includes(value), `${value} is missing from the Web CLI reference`);
}

console.log(`CLI documentation parity: PASS (${uniqueOptions.length} options)`);
