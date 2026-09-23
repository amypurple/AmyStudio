import assert from "node:assert/strict";
import {
  TARGET_PROFILES,
  getTargetProfile,
  listTargetProfiles
} from "../studio/core/targetProfiles.js";

const coleco = getTargetProfile("colecovision_legacy_sdcc");
assert.equal(coleco.outputKind, "cartridge-rom");
assert.equal(coleco.loadAddress, 0x8000);

assert.equal(getTargetProfile("coleco_adam_eos"), null,
  "unfinished ADAM target must not be publicly selectable");

const adam = getTargetProfile("coleco_adam_eos", { includeInternal: true });
assert.equal(adam.outputKind, "eos-executable");
assert.equal(adam.loadAddress, 0x0100);
assert.equal(adam.addressLimitExclusive, 0xd390);
assert.equal(adam.mediaBlockSize, 1024);
assert.equal(adam.executableAttribute, 0xc8);
assert.equal(adam.preferredMedia, "disk-160k");

assert.deepEqual(listTargetProfiles().map(({ id }) => id), ["colecovision_legacy_sdcc"]);
assert.deepEqual(
  listTargetProfiles({ includeInternal: true }).map(({ id }) => id),
  ["colecovision_legacy_sdcc", "coleco_adam_eos"]
);
assert.ok(Object.isFrozen(TARGET_PROFILES));
assert.ok(Object.isFrozen(adam));

console.log("Target profile contract PASS");
