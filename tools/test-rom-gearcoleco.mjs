#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GearColecoMcpClient } from "./lib/gearcolecoMcpClient.mjs";

const defaultGearColeco = resolve(process.env.LOCALAPPDATA || "", "AmyStudio", "emulators", "gearcoleco-1.6.8", "Gearcoleco.exe");
const options = {
  executable: process.env.GEARCOLECO_EXE || defaultGearColeco,
  rom: null,
  frames: 120,
  screenshot: null,
  symbols: null,
  expectBytes: [],
  listTools: false
};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--rom") options.rom = resolve(args[++index] || "");
  else if (arg === "--frames") options.frames = Number.parseInt(args[++index] || "", 10);
  else if (arg === "--screenshot") options.screenshot = resolve(args[++index] || "");
  else if (arg === "--gearcoleco") options.executable = resolve(args[++index] || "");
  else if (arg === "--symbols") options.symbols = resolve(args[++index] || "");
  else if (arg === "--expect-byte") options.expectBytes.push(args[++index] || "");
  else if (arg === "--list-tools") options.listTools = true;
  else throw new Error(`Unknown argument: ${arg}`);
}
if (!existsSync(options.executable)) throw new Error(`GearColeco not found: ${options.executable}`);
if (!options.listTools && (!options.rom || !existsSync(options.rom))) throw new Error("Use --rom <file> with an existing ROM.");
if (!Number.isInteger(options.frames) || options.frames < 0) throw new Error("--frames must be a non-negative integer.");
if (options.symbols && !existsSync(options.symbols)) throw new Error(`Symbol file not found: ${options.symbols}`);
if (options.expectBytes.length && !options.symbols) throw new Error("--expect-byte requires --symbols.");

function parseExpectedByte(spec) {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(?:\$|0x)?([0-9A-Fa-f]+)$/.exec(spec);
  if (!match) throw new Error(`Invalid --expect-byte ${spec}; use SYMBOL=VALUE.`);
  const value = Number.parseInt(match[2], 16);
  if (value < 0 || value > 0xFF) throw new Error(`Expected byte is out of range: ${spec}`);
  return { symbol: match[1], expected: value };
}

async function assertBytes(client, specs) {
  if (!specs.length) return [];
  const areasResult = await client.callTool("list_memory_areas");
  const ram = (areasResult?.areas || []).find((area) => area.name === "RAM");
  if (!ram) throw new Error("GearColeco did not expose a RAM memory area.");
  const assertions = [];
  for (const spec of specs.map(parseExpectedByte)) {
    const lookup = await client.callTool("lookup_symbol_by_name", { name: spec.symbol });
    const match = lookup?.matches?.[0];
    if (!match) throw new Error(`Symbol not found: ${spec.symbol}`);
    const address = Number.parseInt(match.address, 16);
    const offset = ((address - ram.display_base) % ram.size + ram.size) % ram.size;
    const memory = await client.callTool("read_memory", { area: ram.id, offset: offset.toString(16).toUpperCase().padStart(4, "0"), size: 1 });
    const actual = Number.parseInt(String(memory?.data || "").trim().split(/\s+/)[0], 16);
    if (actual !== spec.expected) throw new Error(`${spec.symbol}: expected ${spec.expected.toString(16).padStart(2, "0")}, got ${actual.toString(16).padStart(2, "0")}`);
    assertions.push({ symbol: spec.symbol, address: match.address, expected: spec.expected, actual });
  }
  return assertions;
}

const client = new GearColecoMcpClient({
  executable: options.executable,
  rom: options.rom,
  cwd: dirname(options.executable),
  timeoutMs: 15000
});
try {
  await client.start();
  if (options.symbols) await client.callTool("load_symbols", { file_path: options.symbols });
  if (options.listTools) {
    const tools = await client.listTools();
    console.log(tools.map((tool) => tool.name).sort().join("\n"));
  } else {
    await client.callTool("debug_pause");
    const media = await client.callTool("get_media_info");
    for (let frame = 0; frame < options.frames; frame += 1) {
      await client.callTool("debug_step_frame");
    }
    const assertions = await assertBytes(client, options.expectBytes);
    const cpu = await client.callTool("get_z80_status");
    const vdp = await client.callTool("get_vdp_status");
    const debug = await client.callTool("debug_get_status");
    let screenshotPath = null;
    if (options.screenshot) {
      const shot = await client.callTool("get_screenshot");
      const image = Array.isArray(shot?.content) ? shot.content.find((item) => item?.type === "image") : null;
      const base64 = shot?.png_base64 || shot?.base64 || shot?.data || image?.data;
      if (typeof base64 !== "string" || !base64) throw new Error("GearColeco returned no PNG data");
      mkdirSync(dirname(options.screenshot), { recursive: true });
      writeFileSync(options.screenshot, Buffer.from(base64, "base64"));
      screenshotPath = options.screenshot;
    }
    const pcText = String(cpu?.pc ?? cpu?.PC ?? "");
    const pcValue = /^0x/i.test(pcText) ? Number.parseInt(pcText.slice(2), 16) : Number(pcText);
    if (options.frames > 30 && Number.isFinite(pcValue) && pcValue === 0) {
      throw new Error("ROM execution returned to PC $0000");
    }
    console.log(JSON.stringify({
      ok: true,
      rom: basename(options.rom),
      frames: options.frames,
      media,
      cpu,
      vdp,
      debug,
      screenshot: screenshotPath,
      assertions,
      emulatorLogs: client.logs.slice(-12)
    }, null, 2));
  }
} finally {
  await client.close();
}
