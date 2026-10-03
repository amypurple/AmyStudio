import assert from "node:assert/strict";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const moduleUrl = new URL("../studio/vendor/gearcoleco-test-core/gearcoleco-test-core.js", import.meta.url);
const core = await GearcolecoTestCore.create({ moduleUrl });

try {
  const profiles = [
    { name: "adamlink", data: 0x44, status: 0x45, txReady: 0x02, carrier: 0x80 },
    { name: "eve", data: 0x5e, status: 0x5f, txReady: 0x02, carrier: 0x80 },
    { name: "micro", data: 0x1b, status: 0x19, txReady: 0x08, carrier: 0x20 }
  ];

  for (const profile of profiles) {
    core.setAdamSerialProfile(profile.name);
    core.setAdamSerialLoopback(false);
    core.setAdamSerialCarrier(false);
    assert.equal(core.debugAdamPortIn(profile.status), profile.txReady, `${profile.name} idle status`);
    core.injectAdamSerialReceive(Uint8Array.of(0x41));
    assert.equal(core.debugAdamPortIn(profile.status), profile.txReady | 0x01, `${profile.name} receive-ready status`);
    assert.equal(core.debugAdamPortIn(profile.data), 0x41, `${profile.name} received byte`);
    core.debugAdamPortOut(profile.data, 0x42);
    assert.deepEqual([...core.readAdamSerialTransmit()], [0x42], `${profile.name} transmitted byte`);
    core.setAdamSerialLoopback(true);
    core.debugAdamPortOut(profile.data, 0x43);
    assert.equal(core.debugAdamPortIn(profile.data), 0x43, `${profile.name} loopback byte`);
    assert.deepEqual([...core.readAdamSerialTransmit()], [0x43], `${profile.name} loopback preserves TX`);
    core.setAdamSerialCarrier(true);
    assert.equal(core.debugAdamPortIn(profile.status), profile.txReady | profile.carrier, `${profile.name} carrier status`);
  }

  core.setAdamSerialProfile("none");
  assert.equal(core.debugAdamPortIn(0x44), 0xff, "absent serial hardware leaves AdamLink port open");
  console.log("GearColeco ADAM serial profiles: 3 passed");
} finally {
  core.destroy();
}
