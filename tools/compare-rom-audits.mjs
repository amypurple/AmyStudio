#!/usr/bin/env node
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const beforeIndex = args.indexOf("--before");
const afterIndex = args.indexOf("--after");
if (beforeIndex < 0 || afterIndex < 0) throw new Error("Use --before <audit.json> --after <audit.json>.");
const before = JSON.parse(readFileSync(args[beforeIndex + 1], "utf8"));
const after = JSON.parse(readFileSync(args[afterIndex + 1], "utf8"));
const oldById = new Map((before.examples || []).map((entry) => [entry.id, entry]));
const newById = new Map((after.examples || []).map((entry) => [entry.id, entry]));
const rows = [];
for (const id of [...new Set([...oldById.keys(), ...newById.keys()])].sort()) {
  const oldEntry = oldById.get(id);
  const newEntry = newById.get(id);
  if (!oldEntry || !newEntry) {
    rows.push({ id, status: oldEntry ? "removed" : "new" });
    continue;
  }
  const sizeDelta = newEntry.romBytes - oldEntry.romBytes;
  const asmChanged = oldEntry.optimizedAsmSha256 !== newEntry.optimizedAsmSha256;
  if (sizeDelta || asmChanged) rows.push({ id, status: "changed", beforeBytes: oldEntry.romBytes, afterBytes: newEntry.romBytes, sizeDelta, optimizedAsmChanged: asmChanged });
}
console.log(JSON.stringify({ beforeOptimization: before.optimization, afterOptimization: after.optimization, affected: rows.length, examples: rows }, null, 2));

