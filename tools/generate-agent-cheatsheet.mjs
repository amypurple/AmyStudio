#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "docs/agent-kit/manifest.json"), "utf8"));
const output = resolve(root, "docs/agent-kit/CHEATSHEET.md");

export function renderCheatsheet(data) {
  const tools = data.infrastructure || {};
  const skills = (data.skills || []).map((skill) => `| work on ${skill.id.replaceAll("-", " ")} | Read \`${skill.document}\`, then use its named checks. |`).join("\n");
  return `# Amy Studio Agent Cheatsheet

Generated from \`docs/agent-kit/manifest.json\` by \`tools/generate-agent-cheatsheet.mjs\`.
Do not hand-edit this file or preserve compiler workarounds here.

## I want to...

| Goal | Command or source of truth |
|---|---|
| check the authoring environment | \`node ${tools.doctor}\` |
| start a safe Amy project at an exact path | \`node ${tools.newProject} my-game --title "My Game" --output <new-folder>\` |
| inspect a project and select QA | \`node ${tools.authorCheck} --project <source-or-folder>\` |
| execute the selected bounded checks | add \`--execute\` to the author-check command |
| rebuild without trusting a stale ROM | \`node ${tools.build} <source-or-folder>\` (\`--project\` is also accepted) |
| prove source, ROM size, RAM and output identity | \`node ${tools.projectProof} <source-or-folder>\` |
| validate gameplay metrics | \`node ${tools.metrics} --report metrics.json --expectations expectations.json\` |
| enforce production polish evidence | \`node ${tools.quality} <source-or-folder>\` |
| generate runtime visual evidence | \`node ${tools.visualProof} --rom <game.rom> --config <visual.json> --output <folder>\` |
| package a reviewed release | \`node ${tools.delivery} --project <source-or-folder> --evidence <author-check.json> --visual-approved\` |
| audit parity with the external toolbox | \`node ${tools.equivalenceAudit}\` |
${skills}

## Evidence rules

- A successful compile is not runtime proof.
- A generated screenshot is not human visual approval.
- A metric outside a declared threshold is \`WARN\` or \`FAIL\`, never \`PASS\`.
- A missing dependency is \`SKIP\`, never successful evidence.
- Use the real OS7 BIOS for final BIOS, sound, VDP, controller, and ABI proof.
- A publishable game defaults to START / HOW TO / CREDITS. If it uses audio, require a one-shot title cue and real-OS7 proof that every triggered sound area terminates.
- Use named GearColeco memory areas and a complete screen signature; never rely on numeric area IDs or an early OS7-logo frame.
- Use project-focused checks for an isolated game. Full-corpus compilation is reserved for compiler, runtime, optimizer, or toolbox promotion.
- Use the explicit \`promotion\` profile before clean-repository publication.
`;
}

function main() {
  writeFileSync(output, renderCheatsheet(manifest), "utf8");
  console.log(`Generated ${output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main();
