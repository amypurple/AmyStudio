import assert from "node:assert/strict";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const moduleUrl = new URL(
  "../studio/vendor/gearcoleco-test-core/gearcoleco-test-core.js",
  import.meta.url
);
const core = await GearcolecoTestCore.create({ moduleUrl });

try {
  const profiles = [
    { name: "adamlink", data: 0x5f, status: 0x5e, txReady: 0x01, noCarrier: 0xc0 },
    { name: "eve", data: 0x44, status: 0x45, txReady: 0x01, noCarrier: 0xc0 },
    { name: "micro", data: 0x1b, status: 0x19, txReady: 0x08, carrierPort: 0x1d, carrier: 0x20 }
  ];

  for (const profile of profiles) {
    core.setAdamSerialProfile(profile.name);
    core.setAdamSerialLoopback(false);
    core.setAdamSerialCarrier(false);
    assert.equal(core.debugAdamPortIn(profile.status), profile.txReady | (profile.noCarrier || 0), `${profile.name} idle status`);

    core.injectAdamSerialReceive(Uint8Array.of(0x41));
    assert.equal(
      core.debugAdamPortIn(profile.status),
      profile.txReady | (profile.name === "micro" ? 0x01 : 0x02) | (profile.noCarrier || 0),
      `${profile.name} receive-ready status`
    );
    assert.equal(core.debugAdamPortIn(profile.data), 0x41, `${profile.name} received byte`);
    assert.equal(core.debugAdamPortIn(profile.status), profile.txReady | (profile.noCarrier || 0), `${profile.name} receive queue drained`);

    core.debugAdamPortOut(profile.data, 0x42);
    assert.deepEqual([...core.readAdamSerialTransmit()], [0x42], `${profile.name} transmitted byte`);

    core.setAdamSerialLoopback(true);
    core.debugAdamPortOut(profile.data, 0x43);
    assert.equal(core.debugAdamPortIn(profile.data), 0x43, `${profile.name} loopback byte`);
    assert.deepEqual([...core.readAdamSerialTransmit()], [0x43], `${profile.name} loopback preserves TX`);

    core.setAdamSerialCarrier(true);
    assert.equal(
      core.debugAdamPortIn(profile.carrierPort || profile.status),
      profile.carrierPort ? profile.carrier : profile.txReady | (profile.carrier || 0),
      `${profile.name} active-carrier status`
    );
  }

  core.setAdamSerialProfile("none");
  assert.equal(core.debugAdamPortIn(0x5e), 0xff, "absent serial hardware leaves AdamLink port open");
  console.log("GearColeco ADAM serial profiles: 3 passed");
} finally {
  core.destroy();
}
