import assert from "node:assert/strict";
import {
  detectColecoRegionFromBios,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const bios = new Uint8Array(8192);
bios[0x69] = 0x3C;
assert.equal(detectColecoRegionFromBios(bios), GEARCOLECO_TEST_REGION.NTSC);

bios[0x69] = 0x32;
assert.equal(detectColecoRegionFromBios(bios), GEARCOLECO_TEST_REGION.PAL);

bios[0x69] = 0x00;
assert.equal(detectColecoRegionFromBios(bios), GEARCOLECO_TEST_REGION.NTSC);

console.log("GearColeco BIOS region detection: PASS");
