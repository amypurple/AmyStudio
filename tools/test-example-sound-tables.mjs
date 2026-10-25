#!/usr/bin/env node
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateSoundTable } from "./validate-sound-table.mjs";

const root = resolve(import.meta.dirname, "..");
const examples = resolve(root, "studio/examples-src");
const files = (await readdir(examples)).filter((name) => name.endsWith(".alexis")).sort();
const failures = [];
let tables = 0;

for (const file of files) {
  const source = await readFile(resolve(examples, file), "utf8");
  const declarations = [...source.matchAll(/\bset\s+sound\s+table\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+areas\s+(\d+))?/gi)];
  const seen = new Set();
  for (const declaration of declarations) {
    const table = declaration[1];
    if (seen.has(table)) continue;
    seen.add(table);
    try {
      const result = validateSoundTable(source, { table });
      tables += 1;
      if (!result.ok) failures.push(`${file}:${table}: ${result.errors.join(" | ")}`);
    } catch (error) {
      if (!String(error.message).startsWith("Cannot find sound table label:")) {
        failures.push(`${file}:${table}: ${error.message}`);
      }
    }
  }
}

assert.deepEqual(failures, [], `Invalid example sound tables:\n${failures.join("\n")}`);
console.log(`Example sound tables: PASS (${tables} tables across ${files.length} Amy examples)`);
