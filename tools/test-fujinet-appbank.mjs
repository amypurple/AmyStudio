import assert from "node:assert/strict";
import {
  buildFujiNetAppBankImage,
  inspectFujiNetAppBankImage,
  FUJINET_APPBANK_PAGE_BYTES
} from "../studio/core/fujiNetImage.js";
import { validateAmyBuildProject } from "../studio/core/projectTargets.js";

const window = new Uint8Array(0x7800);
window[0] = 0x55; window[1] = 0xAA;
window[0x4000] = 0x10;
const page1 = Uint8Array.of(0x21, 0x22, 0x23);
const image = buildFujiNetAppBankImage(window, [page1]);
assert.equal(image.length, 0x8000 + FUJINET_APPBANK_PAGE_BYTES);
assert.equal(image[0x7CFC], 0x46);
assert.deepEqual([...image.slice(0x8000, 0x8003)], [0x21, 0x22, 0x23]);
assert.equal(inspectFujiNetAppBankImage(image).pageCount, 2);

const padded = buildFujiNetAppBankImage(window, [page1, page1, page1, page1]);
assert.equal(padded.length, 72 * 1024, "64K APPBANK images need a neutral anti-MegaCart page");

const project = {
  target: { platform: "colecovision-fujinet-appbank" },
  outputs: [
    { name: "WINDOW", type: "appbank-window", sources: [{ path: "main.amy", kind: "amy" }] },
    { name: "PAGE1", type: "appbank-page", page: 1, sources: [{ path: "page1.bin", kind: "asset" }] }
  ]
};
assert.equal(validateAmyBuildProject(project).ok, true);
assert.equal(validateAmyBuildProject({ ...project, outputs: [...project.outputs, { ...project.outputs[1] }] }).ok, false);

console.log("FujiNet APPBANK image and manifest tests passed.");
