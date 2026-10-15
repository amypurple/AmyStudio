import assert from "node:assert/strict";
import { getCrtTelevisionGeometry } from "../studio/core/crtTelevisionRenderer.js";

const ntsc = getCrtTelevisionGeometry("ntsc");
assert.equal(ntsc.activeWidth, 256);
assert.equal(ntsc.activeHeight, 192);
assert.equal(ntsc.rasterWidth, 284);
assert.equal(ntsc.rasterHeight, 243);
assert.equal(ntsc.horizontalBorder, 14);
assert.equal(ntsc.verticalBorder, 27);
assert.equal(ntsc.verticalBorderTop, 27);
assert.equal(ntsc.verticalBorderBottom, 24);
assert.equal(ntsc.cropX, 17);
assert.equal(ntsc.cropY, 16);
assert.equal(ntsc.cropBottom, 13);
assert.equal(ntsc.sourceHeight, 214);
assert.equal(ntsc.firstVisibleActiveColumn, 3);
assert.equal(ntsc.lastVisibleActiveColumn, 252);
assert.equal(ntsc.visibleActiveColumns, 250);
assert.equal(ntsc.visibleActiveRows, 192);

const pal = getCrtTelevisionGeometry("pal");
assert.equal(pal.activeWidth, 256);
assert.equal(pal.activeHeight, 192);
assert.equal(pal.rasterWidth, 284);
assert.equal(pal.rasterHeight, 294);
assert.equal(pal.horizontalBorder, 14);
assert.equal(pal.verticalBorder, 54);
assert.equal(pal.verticalBorderTop, 54);
assert.equal(pal.verticalBorderBottom, 48);
assert.equal(pal.cropX, 17);
assert.equal(pal.cropY, 43);
assert.equal(pal.cropBottom, 37);
assert.equal(pal.sourceHeight, 214);
assert.equal(pal.firstVisibleActiveColumn, 3);
assert.equal(pal.lastVisibleActiveColumn, 252);
assert.equal(pal.visibleActiveColumns, 250);
assert.equal(pal.visibleActiveRows, 192);

const adam = getCrtTelevisionGeometry("ntsc", "adam");
assert.equal(adam.cropLeft, 21);
assert.equal(adam.cropRight, 17);
assert.equal(adam.cropY, 16);
assert.equal(adam.cropBottom, 13);
assert.equal(adam.sourceHeight, 214);
assert.equal(adam.firstVisibleActiveColumn, 7);
assert.equal(adam.lastVisibleActiveColumn, 252);
assert.equal(adam.visibleActiveColumns, 246);

const adamPal = getCrtTelevisionGeometry("pal", "adam");
assert.equal(adamPal.cropY, 43);
assert.equal(adamPal.cropBottom, 37);
assert.equal(adamPal.sourceHeight, 214);

console.log("CRT television geometry: PASS");
