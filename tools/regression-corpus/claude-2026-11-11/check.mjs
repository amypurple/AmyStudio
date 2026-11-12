// node check.mjs path/to/amyc.mjs [profile]
// Compiles every src/*.alexis and compares the ROM with ref/*.rom (built with r8/r10, balanced).
import { execFileSync } from "node:child_process";
import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.argv[2]) {
  console.error("Usage: node check.mjs path/to/amyc.mjs [profile]");
  process.exit(2);
}
const amyc = path.resolve(process.argv[2]); const opt = process.argv[3] || "balanced";
const out = path.join(here, "out"); fs.mkdirSync(out, { recursive: true });
let same = 0, diff = [], fail = [];
for (const f of fs.readdirSync(path.join(here, "src")).filter(f => f.endsWith(".alexis")).sort()) {
  const g = f.replace(/\.alexis$/, ""), rom = path.join(out, g + ".rom");
  try { execFileSync(process.execPath, [amyc, f, "--opt", opt, "--output", rom], { cwd: path.join(here, "src"), stdio: "pipe" }); }
  catch (e) { fail.push(g); continue; }
  const ref = path.join(here, "ref", g + ".rom");
  if (opt !== "balanced") continue;
  const a = fs.readFileSync(rom), b = fs.readFileSync(ref);
  if (a.equals(b)) same++; else diff.push(`${g} ${b.length}->${a.length}`);
}
console.log(`profile ${opt}: identical ${same}, differ ${diff.length}, build failed ${fail.length}`);
diff.forEach(d => console.log("  differ", d)); fail.forEach(g => console.log("  FAIL", g));
if (diff.length || fail.length) process.exitCode = 1;
