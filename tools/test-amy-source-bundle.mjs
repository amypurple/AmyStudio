#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { affectedAmySourcePaths, bundleAmySource } from "../studio/core/amySourceBundle.js";

const file = (path, text) => ({
  path,
  base64: Buffer.from(text, "utf8").toString("base64")
});

const files = [
  file("src/player.amy", "include amy \"@project/src/shared.amy\"\nsub MovePlayer:\nend sub"),
  file("src/shared.amy", "const Speed = 2"),
  file("src/ui.amy", "include amy \"@project/src/shared.amy\"\nsub DrawHud:\nend sub")
];

const bundled = bundleAmySource([
  "project \"MULTI SOURCE\"",
  "include amy \"@project/src/player.amy\"",
  "include amy \"@project/src/ui.amy\"",
  "MovePlayer()"
].join("\n"), files);

assert.match(bundled.sourceText, /const Speed = 2/);
assert.match(bundled.sourceText, /sub MovePlayer:/);
assert.match(bundled.sourceText, /sub DrawHud:/);
assert.equal(bundled.sourceText.match(/const Speed = 2/g)?.length, 1);
assert.deepEqual(bundled.includedFiles, [
  "@project/src/player.amy",
  "@project/src/shared.amy",
  "@project/src/ui.amy"
]);
assert.ok(bundled.sourceMap.some((entry) => entry.path === "@project/src/shared.amy" && entry.line === 1));
assert.deepEqual(bundled.dependencyGraph.nodes.map((node) => node.path), [
  "@main",
  "@project/src/player.amy",
  "@project/src/shared.amy",
  "@project/src/ui.amy"
]);
assert.deepEqual(bundled.dependencyGraph.nodes[0].dependencies, [
  "@project/src/player.amy",
  "@project/src/ui.amy"
]);
assert.deepEqual(
  bundled.dependencyGraph.nodes.find((node) => node.path === "@project/src/ui.amy").dependencies,
  ["@project/src/shared.amy"]
);
assert.deepEqual(affectedAmySourcePaths(bundled.dependencyGraph, ["@project/src/shared.amy"]), [
  "@main",
  "@project/src/player.amy",
  "@project/src/shared.amy",
  "@project/src/ui.amy"
]);
assert.deepEqual(affectedAmySourcePaths(bundled.dependencyGraph, ["@project/src/player.amy"]), [
  "@main",
  "@project/src/player.amy"
]);

const editedFiles = files.map((entry) => entry.path === "src/player.amy"
  ? file(entry.path, "include amy \"@project/src/shared.amy\"\nsub MovePlayer:\n  ' edited\nend sub")
  : entry);
const editedBundle = bundleAmySource([
  "project \"MULTI SOURCE\"",
  "include amy \"@project/src/player.amy\"",
  "include amy \"@project/src/ui.amy\"",
  "MovePlayer()"
].join("\n"), editedFiles);
const fingerprints = Object.fromEntries(bundled.dependencyGraph.nodes.map((node) => [node.path, node.transitiveFingerprint]));
const editedFingerprints = Object.fromEntries(editedBundle.dependencyGraph.nodes.map((node) => [node.path, node.transitiveFingerprint]));
assert.notEqual(editedFingerprints["@main"], fingerprints["@main"]);
assert.notEqual(editedFingerprints["@project/src/player.amy"], fingerprints["@project/src/player.amy"]);
assert.equal(editedFingerprints["@project/src/ui.amy"], fingerprints["@project/src/ui.amy"]);
assert.equal(editedFingerprints["@project/src/shared.amy"], fingerprints["@project/src/shared.amy"]);

assert.throws(() => bundleAmySource("include amy \"missing.amy\"", files), /not found/);
const cyclic = [
  file("a.amy", "include amy \"b.amy\""),
  file("b.amy", "include amy \"a.amy\"")
];
assert.throws(() => bundleAmySource("include amy \"a.amy\"", cyclic), /Circular Amy source include/);

const [appSource, uiEventsSource, projectFileUiSource] = await Promise.all([
  readFile(new URL("../studio/app.js", import.meta.url), "utf8"),
  readFile(new URL("../studio/core/uiEvents.js", import.meta.url), "utf8"),
  readFile(new URL("../studio/core/projectFileUi.js", import.meta.url), "utf8")
]);
assert.match(appSource, /result\.sourceDependencyGraph = bundled\.dependencyGraph/);
assert.match(uiEventsSource, /sourceDependencyGraph: built\.res\.sourceDependencyGraph/);
assert.match(projectFileUiSource, /affectedAmySourcePaths\(buildState\.sourceDependencyGraph, changedPaths\)/);

console.log("Amy multi-source bundle: PASS");
