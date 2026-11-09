#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { identifyProject, runProjectProof } from "./amy-author-project-proof.mjs";

const fixture = mkdtempSync(resolve(tmpdir(), "amy-project-proof-test-"));
const projectDir = resolve(fixture, "project");
mkdirSync(projectDir);
writeFileSync(resolve(projectDir, "main.alexis"), "tile screen\n", "utf8");
writeFileSync(resolve(projectDir, "amy-author.json"), `${JSON.stringify({ source: "main.alexis", target: "colecovision-cartridge" })}\n`, "utf8");
const expected = Buffer.from([0x55, 0xaa, 1, 2, 3]);
writeFileSync(resolve(projectDir, "main.rom"), expected);

const identified = identifyProject(projectDir);
assert.equal(identified.target, "colecovision-cartridge");
assert.equal(identified.source, resolve(projectDir, "main.alexis"));

const standalone = resolve(fixture, "standalone.alexis");
writeFileSync(standalone, "tile screen\n", "utf8");
writeFileSync(resolve(fixture, "standalone.amy-author.json"), `${JSON.stringify({ source: "standalone.alexis", target: "colecovision-megacart" })}\n`, "utf8");
assert.equal(identifyProject(standalone).target, "colecovision-megacart");

const proof = runProjectProof(projectDir, {
  runner(command, args, context) {
    writeFileSync(context.output, expected);
    writeFileSync(context.reportPath, `${JSON.stringify({ ramUsage: { usedBytes: 12, staticAbi: { totalBytes: 4 } } })}\n`);
    return { status: 0, stdout: "compiled", stderr: "" };
  }
});
assert.equal(proof.ok, true);
assert.ok(proof.results.some((item) => item.id === "byte-identity" && item.state === "PASS"));
assert.ok(proof.results.some((item) => item.id === "ram-report" && /16 RAM bytes/.test(item.message)));

writeFileSync(resolve(projectDir, "main.rom"), Buffer.from([9]));
const mismatch = runProjectProof(projectDir, {
  runner(command, args, context) {
    writeFileSync(context.output, expected);
    return { status: 0, stdout: "compiled", stderr: "" };
  }
});
assert.equal(mismatch.ok, false);
assert.ok(mismatch.results.some((item) => item.id === "byte-identity" && item.state === "FAIL"));

console.log("Amy author project proof: PASS (target, ROM size, RAM report, byte identity)");
