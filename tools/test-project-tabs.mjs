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
const first = { projectName: "My game", sourceText: "print 1" };
const tabs = createProjectTabs({
  container: null,
  initialProject: first,
  storage,
  confirmClose: () => false,
  captureTransientState: () => ({ compiledRom: new Uint8Array([0xAA, 0x55]) })
});

assert.equal(tabs.getActiveProject(), first, "initial project remains active");
tabs.openProject({ projectName: "Example", sourceText: "print 2" });
assert.equal(tabs.getActiveProject().projectName, "Example", "example opens in a new active tab");
assert.equal(tabs.getState().tabs.length, 2, "current project is preserved");
assert.deepEqual([...tabs.getState().tabs[0].transientState.compiledRom], [0xAA, 0x55], "compiled ROM remains attached to its tab");

const firstId = tabs.getState().tabs[0].id;
tabs.activateTab(firstId);
assert.equal(tabs.getActiveProject(), first, "original project can be restored instantly");
first.sourceText = "changed";
tabs.projectChanged();
assert.equal(tabs.closeTab(firstId), false, "dirty project cannot close without confirmation");

const restored = createProjectTabs({
  container: null,
  initialProject: { projectName: "Fallback" },
  storage,
  confirmClose: () => true
});
assert.equal(restored.getState().tabs.length, 2, "open tabs survive a page reload");
assert.equal(restored.getActiveProject().sourceText, "changed", "session changes survive a page reload");
assert.equal(restored.getState().tabs[0].transientState, undefined, "compiled artifacts are session-only and not serialized");

console.log("Project tabs tests passed.");
