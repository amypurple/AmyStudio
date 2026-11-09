#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runAuthorBuild } from "./amy-author-build.mjs";

const temp = mkdtempSync(resolve(tmpdir(), "amy-author-build-test-"));
mkdirSync(resolve(temp, "project"));
writeFileSync(resolve(temp, "project", "main.alexis"), "tile screen\n");
writeFileSync(resolve(temp, "project", "amy-author.json"), `${JSON.stringify({ source: "main.alexis", output: "main.rom" })}\n`);
writeFileSync(resolve(temp, "project", "main.rom"), "stale");
const built = runAuthorBuild(resolve(temp, "project"), {
  runner(command, args, context) {
    assert.equal(existsSync(context.output), false, "stale output was not removed before compilation");
    writeFileSync(context.output, Buffer.from([0x55, 0xaa]));
    writeFileSync(context.asm, "; proof\n");
    writeFileSync(context.report, "{}\n");
    return { status: 0, stdout: "compiled", stderr: "" };
  }
});
assert.equal(built.ok, true);
assert.equal(existsSync(built.output), true);
assert.equal(existsSync(built.asm), true);
assert.equal(existsSync(built.report), true);
console.log("Amy author build: PASS (stale-output removal, materialized ROM/ASM/report)");
