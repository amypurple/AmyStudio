import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import model from "../project-model.js";

const root = await mkdtemp(join(tmpdir(), "amy-vscode-model-"));

try {
  const projectRoot = join(root, "project");
  const sourceDir = join(projectRoot, "src");
  await mkdir(sourceDir, { recursive: true });
  await writeFile(join(sourceDir, "main.alexis"), "target colecovision cartridge\n", "utf8");
  await writeFile(join(sourceDir, "room.alexis"), "sub Room\nend sub\n", "utf8");
  await writeFile(
    join(projectRoot, "amy.project.json"),
    JSON.stringify({
      entry: "src/main.alexis",
      target: "colecovision-cartridge",
      optimization: "aggressive",
      memoryProfile: "sgm1",
    defines: ["DEBUG=1"],
    }),
    "utf8",
  );

  assert.equal(
    model.findManifest(join(sourceDir, "room.alexis")),
    join(projectRoot, "amy.project.json"),
  );

  const project = model.readProject(join(projectRoot, "amy.project.json"));
  assert.equal(project.entry, join(sourceDir, "main.alexis"));
  assert.equal(project.root, projectRoot);

  const resolvedManifest = model.findManifest(join(sourceDir, "room.alexis"));
  const resolved = model.readProject(resolvedManifest);
  assert.equal(resolved.entry, project.entry);

  const paths = {
    asm: join(projectRoot, ".amy", "build", "main.asm"),
    optimizedAsm: join(projectRoot, ".amy", "build", "main.optimized.asm"),
    rom: join(projectRoot, ".amy", "build", "main.rom"),
    symbols: join(projectRoot, ".amy", "build", "main.symbols.json"),
    report: join(projectRoot, ".amy", "build", "main.report.json"),
  };
  const args = model.buildArguments(project, "C:/amy/tools/amyc.mjs", join(projectRoot, ".amy", "build"));
  assert.ok(args.includes("--project-dir"));
  assert.ok(args.includes("aggressive"));
  assert.ok(args.includes("sgm1"));
  assert.ok(args.includes("DEBUG=1"));

  const standalone = model.standaloneProject(join(sourceDir, "standalone.alexis"));
  assert.equal(standalone.manifestPath, null);
  assert.equal(standalone.entry, join(sourceDir, "standalone.alexis"));

  console.log("VS Code Amy project model: PASS");
} finally {
  await rm(root, { recursive: true, force: true });
}
