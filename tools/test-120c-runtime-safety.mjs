#!/usr/bin/env node
import assert from "node:assert/strict";
import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { renderAlexisRuntime } from "../studio/core/alexisRuntime.js";
import { buildColecoLegacyRuntimeMap } from "../studio/ramLayouts.js";

const overlapSource = `
u8 Count = 0
u8 Was = 0
u8 B = 0
120 colors on
forever:
  wait
  B = joypad(1).button1
  goto forever
`;

const caps = inferAmyMemoryCapabilities(overlapSource, () => false);
assert.equal(caps.needs120c, true, "120C source must reserve its runtime state before transpilation");
assert.equal(caps.needsControllers, true);
assert.equal(caps.needsNmi, true);
assert.notEqual(caps.controllerBackend, "bios_cont_scan_compact",
  "120C must not use the incompatible compact controller NMI");

const layout = buildColecoLegacyRuntimeMap(caps);
assert.equal(layout.addresses.effect_120c_enabled, 0x7023);
assert.equal(layout.addresses.effect_120c_phase, 0x7024);
assert.equal(layout.addresses.joypad_1, 0x7025);
assert.equal(layout.userRamStart, 0x7026, "user RAM must start after 120C and selective controller state");

const genericLayout = buildColecoLegacyRuntimeMap({ needsNmi: true, needs120c: true, needsControllers: true });
assert.equal(genericLayout.addresses.joypad_1, 0x7025);
assert.equal(genericLayout.addresses.keypad_2, 0x7028);
assert.equal(genericLayout.userRamStart, 0x7029, "generic controller RAM must also follow 120C state");

const offOnlyCaps = inferAmyMemoryCapabilities("120 colors off\nforever:\n  wait\n  goto forever", () => false);
assert.equal(offOnlyCaps.needs120c, true, "off-only source still needs the 120C state and NMI routine");
assert.equal(offOnlyCaps.needsNmi, true);

const offOnlyRuntime = renderAlexisRuntime("    call AMY_120C_OFF");
assert.match(offOnlyRuntime, /^AMY_120C_OFF:|\nAMY_120C_OFF:/m);
assert.match(offOnlyRuntime, /^AMY_120C_UPDATE:|\nAMY_120C_UPDATE:/m,
  "off-only runtime must include the update routine called by the generated NMI");

console.log("120-color runtime RAM and dependency safety: PASS");
