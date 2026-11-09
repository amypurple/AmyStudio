#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateEditors } from "./amy-author-editors-check.mjs";

const root = resolve(import.meta.dirname, "..");
const afterglow = JSON.parse(readFileSync(resolve(root, "studio/examples-src/afterglow-garden.editors.json"), "utf8"));
assert.equal(validateEditors(afterglow).verdict, "PASS");

const duplicate = structuredClone(afterglow);
duplicate.editors[1].name = duplicate.editors[0].name.toUpperCase();
assert.equal(validateEditors(duplicate).verdict, "FAIL");

const brokenSource = structuredClone(afterglow);
delete brokenSource.editors[0].pattern.name;
assert.ok(validateEditors(brokenSource).errors.some((message) => message.includes("pattern.name")));

console.log("Amy editors check: PASS (schema, ownership, unique names)");
