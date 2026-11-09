#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export function inspectSafeArea(source) {
  const findings = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    let match = line.match(/\bprint\s+at\s+(\d+)\s*,\s*(\d+)\s*,\s*"([^"]*)"/i);
    if (match) {
      const x = Number(match[1]), y = Number(match[2]), width = match[3].length;
      if (x < 2 || x + width - 1 > 29 || y < 1 || y > 22) findings.push({ line: index + 1, kind: "text", message: `print spans (${x},${y})..(${x + width - 1},${y}) outside columns 2-29/rows 1-22` });
    }
    match = line.match(/\bset\s+sprite\b.*?\bat\s+(\d+)\s*,\s*(\d+)/i);
    if (match) {
      const x = Number(match[1]), y = Number(match[2]);
      if (x < 16 || x > 239 || y < 8 || y > 183) findings.push({ line: index + 1, kind: "sprite", message: `sprite origin (${x},${y}) is outside the conservative pixel safe area` });
    }
  });
  return findings;
}

function main() {
  const file = process.argv[2];
  if (!file) { console.log("Usage: node tools/amy-author-safe-area.mjs game.alexis"); return 2; }
  const findings = inspectSafeArea(readFileSync(resolve(file), "utf8"));
  if (!findings.length) console.log(`PASS ${basename(file)}: no literal essential text/sprite safe-area violations.`);
  else for (const finding of findings) console.log(`WARN line ${finding.line}: ${finding.message}`);
  console.log("Dynamic coordinates and intentional decoration require runtime review.");
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(main());
