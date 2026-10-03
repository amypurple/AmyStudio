import assert from "node:assert/strict";
import fs from "node:fs";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

if (process.argv.length < 5) {
  console.error("Usage: node tools/test-gearcoleco-adam-serial-state.mjs OS7.ROM EOS.ROM WP.ROM");
  process.exit(2);
}

const moduleUrl = new URL(
  "../studio/vendor/gearcoleco-test-core/gearcoleco-test-core.js",
  import.meta.url
);
const core = await GearcolecoTestCore.create({ moduleUrl });

try {
  core.loadAdamFirmware({
    os7: fs.readFileSync(process.argv[2]),
    eos: fs.readFileSync(process.argv[3]),
    smartwriter: fs.readFileSync(process.argv[4])
  });
  core.setAdamSerialProfile("eve");
  core.setAdamSerialLoopback(false);
  core.setAdamSerialCarrier(true);
  core.startAdam();
  core.injectAdamSerialReceive(Uint8Array.of(0x52, 0x58));
  core.debugAdamPortOut(0x44, 0x54);
  core.debugAdamPortOut(0x44, 0x58);

  const state = core.saveState();
  assert.equal(core.debugAdamPortIn(0x44), 0x52);
  assert.deepEqual([...core.readAdamSerialTransmit()], [0x54, 0x58]);
  core.setAdamSerialProfile("none");

  core.loadState(state);
  assert.equal(core.debugAdamPortIn(0x45), 0x03, "restored SCN2651 RX-ready, TX-ready, and active carrier");
  assert.equal(core.debugAdamPortIn(0x44), 0x52, "restored first RX byte");
  assert.equal(core.debugAdamPortIn(0x44), 0x58, "restored second RX byte");
  assert.deepEqual([...core.readAdamSerialTransmit()], [0x54, 0x58], "restored TX queue");
  console.log(`GearColeco ADAM serial save state: PASS (${state.byteLength} bytes)`);
} finally {
  core.destroy();
}
