#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; ++bit) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const body = Buffer.concat([name, data]);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), data.length + 8);
  return result;
}

export function encodeFramebufferPng(frame) {
  const rows = Buffer.alloc((frame.width * 3 + 1) * frame.height);
  for (let y = 0; y < frame.height; ++y) {
    const row = y * (frame.width * 3 + 1);
    for (let x = 0; x < frame.width; ++x) {
      const pixel = frame.pixels[y * frame.width + x];
      const at = row + 1 + x * 3;
      rows[at] = Math.round(((pixel >>> 11) & 31) * 255 / 31);
      rows[at + 1] = Math.round(((pixel >>> 5) & 63) * 255 / 63);
      rows[at + 2] = Math.round((pixel & 31) * 255 / 31);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(frame.width, 0);
  header.writeUInt32BE(frame.height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function inside(rect, x, y) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

function vdpLayout(registers) {
  if (!registers) return null;
  const mode2 = (registers[0] >> 1) & 1;
  const mode1 = (registers[1] >> 4) & 1;
  const mode3 = (registers[1] >> 3) & 1;
  const mode = mode2 ? 2 : mode1 ? 0 : mode3 ? 3 : 1;
  return {
    mode,
    displayOn: (registers[1] & 0x40) !== 0,
    name: (registers[2] & 15) * 0x400,
    color: mode2 ? ((registers[3] & 0x80) ? 0x2000 : 0) : registers[3] * 0x40,
    pattern: mode2 ? ((registers[4] & 4) ? 0x2000 : 0) : (registers[4] & 7) * 0x800,
    sprites: (registers[5] & 127) * 0x80
  };
}

function changedDisplayBytes(before, current) {
  const a = vdpLayout(before.registers), b = vdpLayout(current.registers);
  if (!a || !b || !a.displayOn || !b.displayOn || a.mode !== b.mode) return 0;
  const ranges = b.mode === 2
    ? [[b.name, 768], [b.pattern, 6144], [b.color, 6144]]
    : [[b.name, 768], [b.pattern, 2048], [b.color, 32]];
  let changed = 0;
  for (const [address, size] of ranges) for (let offset = 0; offset < size; ++offset) {
    if (before.vram[address + offset] !== current.vram[address + offset]) changed++;
  }
  return changed;
}

function visibleSpritePatterns(snapshot) {
  const layout = vdpLayout(snapshot.registers);
  const patterns = new Set();
  if (!layout?.displayOn) return patterns;
  for (let index = 0; index < 32; ++index) {
    const address = layout.sprites + index * 4;
    const y = snapshot.vram[address], color = snapshot.vram[address + 3] & 15;
    if (y === 208) break;
    if (y < 192 && color) patterns.add(snapshot.vram[address + 2]);
  }
  return patterns;
}

export function analyzeTemporalVdp(before, current, after, config = {}) {
  const results = [];
  const wipeBytes = changedDisplayBytes(before, current);
  const wipeLimit = config.wipeByteLimit ?? 400;
  const wipePolicy = config.wipePolicy || "measure";
  results.push(wipeBytes > wipeLimit
    ? { state: wipePolicy === "clear" ? "FAIL" : wipePolicy === "allow" ? "PASS" : "WARN", id: "visible-page-write", message: `${wipeBytes} displayed table bytes changed in one frame (limit ${wipeLimit}, ${wipePolicy}).` }
    : { state: "PASS", id: "visible-page-write", message: `${wipeBytes} displayed table bytes changed in one frame.` });

  const a = visibleSpritePatterns(before), b = visibleSpritePatterns(current), c = visibleSpritePatterns(after);
  const missing = [...a].filter((pattern) => !b.has(pattern) && c.has(pattern));
  const flickerPolicy = config.flickerPolicy || "measure";
  results.push(missing.length
    ? { state: flickerPolicy === "clear" ? "FAIL" : flickerPolicy === "allow" ? "PASS" : "WARN", id: "one-frame-sprite-flicker", message: `Sprite pattern(s) ${missing.join(", ")} disappeared for one frame (${flickerPolicy}).` }
    : { state: "PASS", id: "one-frame-sprite-flicker", message: "No sprite pattern disappeared for exactly one frame." });
  return results;
}

export function analyzeCheckpoint(before, current, after, nameTable, config = {}) {
  const results = [];
  const unique = new Set(current.pixels).size;
  results.push(unique > 1
    ? { state: "PASS", id: "nonblank", message: `${unique} framebuffer colors.` }
    : { state: "FAIL", id: "nonblank", message: "Framebuffer is blank or single-colored." });

  const safe = config.safeArea || { left: 16, right: 239, top: 8, bottom: 183 };
  let edgeActivity = 0;
  const counts = new Map();
  for (const value of current.pixels) counts.set(value, (counts.get(value) || 0) + 1);
  const dominantEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominant = dominantEntry[0];
  const dominantRatio = dominantEntry[1] / current.pixels.length;
  const dominantLimit = config.maxDominantRatio ?? 0.985;
  const uniformPolicy = config.uniformPolicy || "measure";
  results.push(dominantRatio <= dominantLimit
    ? { state: "PASS", id: "dominant-color", message: `Dominant color covers ${(dominantRatio * 100).toFixed(1)}% of the frame.` }
    : { state: uniformPolicy === "clear" ? "FAIL" : uniformPolicy === "allow" ? "PASS" : "WARN", id: "dominant-color", message: `Dominant color covers ${(dominantRatio * 100).toFixed(1)}% of the frame (limit ${(dominantLimit * 100).toFixed(1)}%, ${uniformPolicy}).` });
  for (let y = 0; y < current.height; ++y) for (let x = 0; x < current.width; ++x) {
    if ((x < safe.left || x > safe.right || y < safe.top || y > safe.bottom) && current.pixels[y * current.width + x] !== dominant) edgeActivity++;
  }
  const edgePolicy = config.edgePolicy || "measure";
  results.push(edgeActivity === 0
    ? { state: "PASS", id: "crt-edge", message: "No non-dominant edge pixels detected." }
    : { state: edgePolicy === "clear" ? "FAIL" : "WARN", id: "crt-edge", message: `${edgeActivity} active edge pixels (${edgePolicy}); decoration may be intentional.` });

  let transient = 0;
  for (let index = 0; index < current.pixels.length; ++index) {
    if (before.pixels[index] === after.pixels[index] && current.pixels[index] !== before.pixels[index]) transient++;
  }
  const transientLimit = config.transientPixelLimit ?? 32;
  results.push(transient <= transientLimit
    ? { state: "PASS", id: "transient-pixels", message: `${transient} one-frame pixel changes.` }
    : { state: "WARN", id: "transient-pixels", message: `${transient} one-frame pixel changes exceed review threshold ${transientLimit}.` });

  if (before.vram && current.vram && after.vram) results.push(...analyzeTemporalVdp(before, current, after, config));

  if (!config.textScan) {
    results.push({ state: "SKIP", id: "text-areas", message: "Text-area scan not enabled for this checkpoint." });
  } else {
    const areas = config.textAreas || [];
    const outside = [];
    for (let index = 0; index < nameTable.length; ++index) {
      const tile = nameTable[index];
      if (tile < 32 || tile > 126 || tile === 32) continue;
      const x = index % 32, y = Math.floor(index / 32);
      if (!areas.some((rect) => inside(rect, x, y))) outside.push({ x, y, tile });
    }
    results.push(outside.length
      ? { state: "FAIL", id: "text-areas", message: `${outside.length} printable tile(s) outside declared text areas.` }
      : { state: "PASS", id: "text-areas", message: "Printable tiles stay inside declared text areas." });
  }
  return results;
}

export async function runVisualProof({ rom, bios, config, output }) {
  mkdirSync(output, { recursive: true });
  const core = await GearcolecoTestCore.create({ seed: config.seed || 0x41555448 });
  const report = { kind: "amy-author-visual-proof", version: 1, checkpoints: [], humanReview: "REQUIRED" };
  try {
    core.loadBios(readFileSync(bios));
    core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
    let frame = 0;
    for (const checkpoint of [...config.checkpoints].sort((a, b) => a.frame - b.frame)) {
      while (frame < checkpoint.frame - 1) { core.runFrame(); frame++; }
      const snapshot = () => ({
        ...core.getFramebuffer(),
        pixels: new Uint16Array(core.getFramebuffer().pixels),
        vram: new Uint8Array(core.readVram(0, 0x4000)),
        registers: new Uint8Array(core.getVdpRegisters())
      });
      const before = snapshot();
      core.runFrame(); frame++;
      const current = snapshot();
      const nameTable = core.readVram(checkpoint.nameTable || 0x1800, 32 * 24);
      core.runFrame(); frame++;
      const after = snapshot();
      const file = `${String(checkpoint.frame).padStart(6, "0")}-${checkpoint.name}.png`;
      writeFileSync(resolve(output, file), encodeFramebufferPng(current));
      report.checkpoints.push({ name: checkpoint.name, frame: checkpoint.frame, file, results: analyzeCheckpoint(before, current, after, nameTable, checkpoint) });
    }
  } finally {
    core.destroy();
  }
  report.verdict = report.checkpoints.some((entry) => entry.results.some((item) => item.state === "FAIL")) ? "FAIL"
    : report.checkpoints.some((entry) => entry.results.some((item) => item.state === "WARN")) ? "WARN" : "PASS";
  writeFileSync(resolve(output, "visual-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).reduce((rows, item, index, all) => item.startsWith("--") ? [...rows, [item.slice(2), all[index + 1]]] : rows, []));
  if (!args.rom || !args.config || !args.output) {
    console.log("Usage: node tools/amy-author-visual-proof.mjs --rom game.rom --config visual.json --output evidence/visual [--bios os7.rom]");
    return 2;
  }
  const report = await runVisualProof({
    rom: resolve(args.rom),
    bios: resolve(args.bios || process.env.AMY_COLECO_BIOS || "studio/bios/colecovision.rom"),
    config: JSON.parse(readFileSync(resolve(args.config), "utf8")),
    output: resolve(args.output)
  });
  console.log(`Amy visual proof: ${report.verdict} (${report.checkpoints.length} checkpoint(s)); human review REQUIRED`);
  for (const checkpoint of report.checkpoints) for (const item of checkpoint.results) console.log(`${item.state.padEnd(4)} ${checkpoint.name}/${item.id}: ${item.message}`);
  return report.verdict === "FAIL" ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(await main());
