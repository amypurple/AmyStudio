import assert from "node:assert/strict";
import fs from "node:fs";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

if (process.argv.length < 5) {
  console.error("Usage: node tools/test-gearcoleco-adam-hayes.mjs OS7.ROM EOS.ROM WP.ROM");
  process.exit(2);
}

const moduleUrl = new URL("../studio/vendor/gearcoleco-test-core/gearcoleco-test-core.js", import.meta.url);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const core = await GearcolecoTestCore.create({ moduleUrl });

function writeCommand(command) {
  for (const byte of encoder.encode(`${command}\r`)) core.debugAdamPortOut(0x5E, byte);
}

function readResponse() {
  const bytes = [];
  while (core.debugAdamPortIn(0x5F) & 0x02) bytes.push(core.debugAdamPortIn(0x5E));
  return decoder.decode(Uint8Array.from(bytes));
}

try {
  core.loadAdamFirmware({
    os7: fs.readFileSync(process.argv[2]),
    eos: fs.readFileSync(process.argv[3]),
    smartwriter: fs.readFileSync(process.argv[4])
  });
  core.setAdamSerialProfile("adamlink");
  core.setAdamSerialLoopback(false);
  core.setAdamSerialHayes(true);
  core.setAdamSerialCarrier(false);
  core.setAdamSerialTiming(300, 10);
  core.startAdam();

  writeCommand("at");
  assert.equal(core.debugAdamPortIn(0x5F) & 0x05, 0, "300-baud transmit must remain busy for one character frame");
  core.runFrame();
  assert.equal(core.debugAdamPortIn(0x5F) & 0x05, 0, "300-baud 8N1 needs about two NTSC frames");
  let timingFrames = 1;
  while ((core.debugAdamPortIn(0x5F) & 0x05) === 0 && timingFrames < 12) {
    core.runFrame();
    timingFrames += 1;
  }
  assert.equal(core.debugAdamPortIn(0x5F) & 0x05, 0x05, "transmitter should become ready after the measured frame time");
  assert.ok(timingFrames >= 2 && timingFrames <= 8, `unexpected 300-baud frame time: ${timingFrames} video frames`);
  let summary = core.getAdamNetSummary();
  assert.equal(summary.serial.profile, 1);
  assert.equal(summary.serial.hayes, true);
  assert.equal(summary.serial.rxSize, 6);
  assert.equal(readResponse(), "\r\nOK\r\n", "AT should produce OK without requiring uppercase input");

  for (const byte of encoder.encode("ATD")) core.debugAdamPortOut(0x5E, byte);
  summary = core.getAdamNetSummary();
  assert.equal(summary.serial.commandLength, 3, "debug state should expose a partial Hayes command");
  assert.equal(summary.serial.txSize, 6, "debug state should expose captured transmit bytes");
  const state = core.saveState();
  writeCommand("BROKEN");
  readResponse();
  core.loadState(state);
  for (const byte of encoder.encode("T5551234\r")) core.debugAdamPortOut(0x5E, byte);
  assert.equal(readResponse(), "\r\nCONNECT 1200\r\n", "dial command should survive a save-state boundary");
  assert.equal(core.debugAdamPortIn(0x5F) & 0x40, 0, "CONNECT should assert active-low carrier detect");

  writeCommand("ATH0");
  assert.equal(readResponse(), "\r\nNO CARRIER\r\n");
  assert.equal(core.debugAdamPortIn(0x5F) & 0x40, 0x40, "hang-up should remove carrier");

  writeCommand("ATZ99");
  assert.equal(readResponse(), "\r\nERROR\r\n");
  assert.match(decoder.decode(core.readAdamSerialTransmit()), /at\rATDT5551234\rATH0\rATZ99\r/);

  core.setAdamSerialHayes(false);
  writeCommand("AT");
  assert.equal(readResponse(), "", "raw serial mode must not synthesize Hayes responses");
  console.log(`GearColeco deterministic Hayes modem: PASS (${state.byteLength} byte state, 300-baud character=${timingFrames} video frames)`);
} finally {
  core.destroy();
}
