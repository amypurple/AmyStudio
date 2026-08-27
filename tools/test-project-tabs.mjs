import assert from "node:assert/strict";
import { createProjectTabs } from "../studio/core/projectTabs.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

const storage = memoryStorage();
let allowDiscard = false;
const first = { projectName: "My game", sourceText: "print 1" };
const tabs = createProjectTabs({
  container: null,
  initialProject: first,
  storage,
  confirmClose: () => allowDiscard,
  captureTransientState: () => ({ compiledRom: new Uint8Array([0xAA, 0x55]) }),
  snapshotProject: ({ generatedAsm, ...project }) => project
});

assert.equal(tabs.getActiveProject(), first, "initial project remains active");
tabs.openProject({ projectName: "Example", sourceText: "print 2" });
assert.equal(tabs.getActiveProject().projectName, "Example", "example opens in a new active tab");
assert.equal(tabs.getState().tabs.length, 2, "current project is preserved");
assert.deepEqual([...tabs.getState().tabs[0].transientState.compiledRom], [0xAA, 0x55], "compiled ROM remains attached to its tab");

const example = { projectName: "Rails Puzzles", exampleId: "train-track-puzzle", sourceText: "original" };
const openedExample = tabs.openExampleProject(example);
assert.equal(openedExample.reused, false, "first example open creates a tab");
example.sourceText = "locally changed";
tabs.projectChanged();
tabs.openProject({ projectName: "Reference", sourceText: "print 3" });
const duplicateExample = tabs.openExampleProject({ projectName: "Rails Puzzles", exampleId: "train-track-puzzle", sourceText: "catalog copy" });
assert.equal(duplicateExample.reused, true, "opening the same example reuses its tab");
assert.equal(tabs.getActiveProject(), example, "the existing project object is preserved");
assert.equal(tabs.getActiveProject().sourceText, "locally changed", "reopening does not overwrite session edits");
assert.equal(tabs.getState().tabs.filter((tab) => tab.project.exampleId === "train-track-puzzle").length, 1, "only one tab exists per example id");
example.generatedAsm = "compiled output";
tabs.projectChanged();
assert.equal(tabs.getState().tabs.find((tab) => tab.project === example).cleanFingerprint, JSON.stringify({ projectName: "Rails Puzzles", exampleId: "train-track-puzzle", sourceText: "original" }), "generated output is excluded from the clean snapshot");
allowDiscard = true;
const reloadedExample = tabs.openExampleProject({ projectName: "Rails Puzzles", exampleId: "train-track-puzzle", sourceText: "catalog copy" }, { reload: true });
assert.equal(reloadedExample.reloaded, true, "catalog example can explicitly replace the existing tab");
assert.equal(tabs.getActiveProject().sourceText, "catalog copy", "reload restores the catalog source");

const firstId = tabs.getState().tabs[0].id;
tabs.activateTab(firstId);
assert.equal(tabs.getActiveProject(), first, "original project can be restored instantly");
first.sourceText = "changed";
tabs.projectChanged();
allowDiscard = false;
assert.equal(tabs.closeTab(firstId), false, "dirty project cannot close without confirmation");

const restored = createProjectTabs({
  container: null,
  initialProject: { projectName: "Fallback" },
  storage,
  confirmClose: () => true
});
assert.equal(restored.getState().tabs.length, tabs.getState().tabs.length, "open tabs survive a page reload");
assert.equal(restored.getActiveProject().sourceText, "changed", "session changes survive a page reload");
assert.equal(restored.getState().tabs[0].transientState, undefined, "compiled artifacts are session-only and not serialized");

console.log("Project tabs tests passed.");
