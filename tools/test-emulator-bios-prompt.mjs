import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEmulatorShellHelpers } from "../studio/core/emulatorShell.js";

function button() {
  return { disabled: true, title: "", setAttribute(name, value) { this[name] = value; } };
}
const els = {
  btnDownloadRom: button(),
  btnRunEmulator: button(),
  btnRomTestRecorder: button(),
  btnResetEmulator: button(),
  emulatorMeta: { textContent: "" }
};
let bios = null;
const helpers = createEmulatorShellHelpers({
  els,
  getCompiledRom: () => null,
  setCompiledRom() {},
  getCompiledMemoryMap: () => "",
  setCompiledMemoryMap() {},
  getCompiledSymbols: () => "",
  setCompiledSymbols() {},
  getCompiledListing: () => "",
  setCompiledListing() {},
  getCompiledColecoHeaderInfo: () => null,
  setCompiledColecoHeaderInfo() {},
  getEmulatorBios: () => bios,
  setEmulatorBios(value) { bios = value; },
  getEmulatorBiosName: () => "os7.rom",
  setEmulatorBiosName() {},
  getEmulatorBiosSourceUrl: () => "",
  setEmulatorBiosSourceUrl() {},
  getEmulatorWindow: () => null,
  setEmulatorWindow() {},
  getEmulatorRomObjectUrl: () => "",
  setEmulatorRomObjectUrl() {},
  getProject: () => ({ projectName: "test" }),
  updatePreviewActions() {},
  refreshProjectGraph() {},
  setStatus() {},
  getActiveEmulatorBackend: () => ({}),
  resolveEmulatorBackendUrls: (value) => value,
  bytesToDataUrl: () => "",
  defaultBiosCandidates: []
});
helpers.updateEmulatorUi();
assert.equal(els.btnRunEmulator.disabled, false);
assert.equal(els.btnRomTestRecorder.disabled, false);
assert.match(els.emulatorMeta.textContent, /choose your own 8 KiB/i);
bios = new Uint8Array(8192);
helpers.updateEmulatorUi();
assert.match(els.emulatorMeta.textContent, /BIOS loaded: os7\.rom/);
const recorderUi = readFileSync(new URL("../studio/core/romTestRecorderUi.js", import.meta.url), "utf8");
const appUi = readFileSync(new URL("../studio/app.js", import.meta.url), "utf8");
assert.match(recorderUi, /ColecoVision BIOS missing/);
assert.match(recorderUi, /data-action="loadBios"/);
assert.match(recorderUi, /requestEmulatorBios/);
assert.match(recorderUi, /async function biosChanged/);
assert.doesNotMatch(recorderUi, /screen-wrap[^\n]*width:min\(100%,512px\)/);
assert.match(recorderUi, /screenWrap\.style\.width = scale === "fit" \? "100%"/);
assert.doesNotMatch(appUi, /if \(!emulatorBios\) \{[\s\S]{0,300}biosImport\?\.click/);
console.log("Emulator BIOS prompt UI PASS");