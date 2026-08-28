#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildColecoLegacyRuntimeMap } from "../studio/ramLayouts.js";

const BIOS_CONTROLLER_REGIONS = [
  { start: 0x73d7, endExclusive: 0x73eb, name: "POLLER debounce state" },
  { start: 0x73eb, endExclusive: 0x73ed, name: "spinner counters" },
  { start: 0x73ee, endExclusive: 0x73f2, name: "CONT_SCAN shadows" }
];

function overlaps(left, right) {
  return left.start < right.endExclusive && right.start < left.endExclusive;
}

const capabilityCases = [
  {},
  { needsControllers: true },
  { needsControllers: true, usesJoypadPressed1: true },
  { needsControllers: true, usesJoypadPressed1: true, usesJoypadPressed2: true },
  { needsControllers: true, needsSpinner: true, needsFrameCounter: true },
  {
    needsControllers: true,
    usesJoypadPressed1: true,
    usesJoypadPressed2: true,
    needsSpinner: true,
    needsFrameCounter: true,
    needsSound: true,
    needsMusic: true,
    needsSprites: true,
    needsTinySound: true,
    needsSleepState: true,
    needsBackdropShadow: true,
    needs120c: true,
    soundAreaCount: 8
  }
];

for (const capabilities of capabilityCases) {
  const map = buildColecoLegacyRuntimeMap(capabilities);
  assert.ok(map.userRamEndExclusive <= 0x73b8, "User RAM crossed the BIOS stack boundary");
  for (const region of map.reserved) {
    if (region.start >= 0x73c4) continue; // Explicit BIOS/getput11 reservation.
    for (const biosRegion of BIOS_CONTROLLER_REGIONS) {
      assert.equal(
        overlaps(region, biosRegion),
        false,
        `${region.label} overlaps ${biosRegion.name}`
      );
    }
  }
  if (capabilities.needsFrameCounter) {
    assert.equal(map.addresses.frame_counter, 0x73ba);
  }
}

console.log("Controller RAM safety: PASS");

