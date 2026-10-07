#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProjectFromTemplate, listNewProjectTemplates } from "../studio/core/newProjectTemplates.js";
import { validateAmyBuildProject } from "../studio/core/projectTargets.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const styles = readFileSync(new URL("../studio/styles.css", import.meta.url), "utf8");
assert.match(styles, /\.new-project-dialog__medium\[hidden\]\s*\{\s*display:\s*none;/);
assert.match(styles, /\.project-file__name\s*\{[^}]*flex:\s*none;[^}]*white-space:\s*nowrap;[^}]*text-overflow:\s*ellipsis;/s);
assert.match(styles, /\.project-file__meta\s*\{[^}]*min-width:\s*0;[^}]*text-overflow:\s*ellipsis;/s);

const base = { version: 2, sourceLang: "amy", projectFiles: [], generatedAsm: "old" };
assert.equal(listNewProjectTemplates().length, 6);
const cartridge = createProjectFromTemplate(base, { templateId: "cartridge", projectName: "Test" });
assert.equal(cartridge.target.platform, "colecovision-cartridge");
assert.equal(cartridge.target.medium, "rom");
assert.equal(cartridge.projectFiles.length, 0);

const sgm = createProjectFromTemplate(base, { templateId: "sgm", projectName: "SGM Test" });
assert.equal(sgm.target.platform, "colecovision-cartridge");
assert.deepEqual(sgm.target.hardware, ["sgm1"]);
assert.match(sgm.sourceText, /ay mute/);

const megaCart = createProjectFromTemplate(base, { templateId: "megacart", projectName: "Bank Test" });
assert.equal(megaCart.target.platform, "colecovision-megacart");
assert.equal(megaCart.target.romSizeKb, 128);
assert.deepEqual(megaCart.projectFiles.map((file) => file.path), [
  "project.amy.json", "banks/bank1.asm", "banks/bank2.amy"
]);
const megaCartManifest = JSON.parse(Buffer.from(megaCart.projectFiles[0].base64, "base64").toString("utf8"));
assert.equal(megaCartManifest.outputs[1].type, "switchable-bank");
assert.equal(megaCartManifest.outputs[1].sources[0].kind, "asm");
assert.deepEqual(megaCartManifest.outputs[2].exports, ["Bank2Setup", "Bank2Data", "Bank2Compressed"]);
assert.match(megaCart.sourceText, /call bank 2, Bank2Setup/);
assert.match(megaCart.sourceText, /copy Bank2Data from bank 2 count 8 to vram\.name/);
assert.match(megaCart.sourceText, /decompress mdkrle Bank2Compressed from bank 2/);
assert.match(megaCart.sourceText, /copy Bank2Data from bank 2 count 8 to BankBuffer/);
const megaCartBank2 = Buffer.from(megaCart.projectFiles[2].base64, "base64").toString("utf8");
assert.match(megaCartBank2, /data Bank2Compressed bytes/);
assert.equal(validateAmyBuildProject(megaCartManifest).ok, true);
const megaCartMain = transpileAmyForTest(megaCart.sourceText);
assert.equal(megaCartMain.ok, true, megaCartMain.log);
assert.deepEqual(megaCartMain.metadata.megaCart.imports.map(({ operation, kind }) => ({ operation: operation || "call", kind })), [
  { operation: "call", kind: "procedure" }, { operation: "copy-vram", kind: "data" },
  { operation: "decompress-vram", kind: "data" }, { operation: "copy-ram", kind: "data" }
]);

const eos = createProjectFromTemplate(base, { templateId: "adam-eos", projectName: "EOS Test", medium: "ddp" });
assert.equal(eos.target.platform, "adam-native-program");
assert.equal(eos.target.medium, "ddp");
assert.equal(eos.memoryProfile, "adam-eos-application");
assert.equal(eos.projectFiles[0].path, "project.amy.json");
const manifest = JSON.parse(Buffer.from(eos.projectFiles[0].base64, "base64").toString("utf8"));
assert.equal(manifest.target.medium, "ddp");
assert.equal(manifest.outputs[0].memoryProfile, "adam-eos-boot-block");

const hybrid = createProjectFromTemplate(base, { templateId: "adam-hybrid", medium: "ddp" });
assert.equal(hybrid.target.platform, "adam-data-pack");
assert.equal(hybrid.memoryProfile, "adam-os7-eos-drivers");
console.log("New project templates: PASS");
