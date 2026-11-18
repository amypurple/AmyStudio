#!/usr/bin/env node
// FujiNet ColecoVision cartridge, end to end: Amy ROM in MAME's FujiNet
// cartridge device, talking to a private fujinet-pc over BoIP, fetching from
// local fixtures. Opt-in, because it needs two external trees:
//   AMY_FUJINET_MAME_DIR  a MAME tree built with fujinet-firmware's
//                         pico/coleco/emu/apply.sh (-cartslot fujinet) and the
//                         ColecoVision BIOS in its roms/
//   AMY_FUJINET_PC_DIST   a fujinet-pc RS232 build's dist directory; the test
//                         runs a copy with its own BoIP port and SD card
// Without both it prints SKIP and exits 0. It never touches a public server.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  EXPECTATIONS, RUNTIME_SOURCE, checkResults, freePort, privateFujinet, readSymbols, runProcess, startFixtures, waitForListener
} from "./lib/fujinet-runtime-rig.mjs";

const root = resolve(import.meta.dirname, "..");
const mameDir = process.env.AMY_FUJINET_MAME_DIR;
const fujinetDist = process.env.AMY_FUJINET_PC_DIST;
if (!mameDir || !fujinetDist || !existsSync(join(mameDir, "mame")) || !existsSync(join(fujinetDist, "fujinet"))) {
  console.log("SKIP FujiNet ColecoVision runtime: set AMY_FUJINET_MAME_DIR and AMY_FUJINET_PC_DIST");
  process.exit(0);
}

const profiles = (process.env.AMY_FUJINET_PROFILES || "off,safe,balanced,aggressive,experimental").split(",");
const temp = mkdtempSync(join(tmpdir(), "amy-fujinet-coleco-"));
const children = [];

const PROBE_LUA = `local done_addr = tonumber(os.getenv("PROBE_DONE"))
local timeout = tonumber(os.getenv("PROBE_TIMEOUT") or "120")
local vars = {}
for name, addr, len in string.gmatch(os.getenv("PROBE_VARS") or "", "([%w_]+):(%d+):(%d+)") do
  vars[#vars + 1] = { name = name, addr = tonumber(addr), len = tonumber(len) }
end
if _G.probe_sub then return end
_G.probe_sub = emu.add_machine_frame_notifier(function ()
  local mem = manager.machine.devices[":maincpu"].spaces["program"]
  local now = manager.machine.time:as_double()
  if mem:readv_u8(done_addr) ~= 1 and now < timeout then return end
  print(string.format("PROBE time=%.2f", now))
  for _, v in ipairs(vars) do
    local bytes = {}
    for i = 0, v.len - 1 do bytes[#bytes + 1] = string.format("%02X", mem:readv_u8(v.addr + i)) end
    print(string.format("PROBE %s=%s", v.name, table.concat(bytes)))
  end
  manager.machine:exit()
end)
`;

async function main() {
  const fixtures = await startFixtures();
  const boipPort = await freePort();
  const fujinetDir = join(temp, "fujinet");
  privateFujinet(fujinetDist, fujinetDir, boipPort);
  const fujinet = spawn("./fujinet", [], { cwd: fujinetDir, stdio: ["ignore", "pipe", "pipe"] });
  children.push(fujinet);
  let fujinetLog = "";
  fujinet.stdout.on("data", (chunk) => { fujinetLog += chunk; });
  fujinet.stderr.on("data", (chunk) => { fujinetLog += chunk; });
  try {
    await waitForListener(boipPort);
    const probePath = join(temp, "probe.lua");
    writeFileSync(probePath, PROBE_LUA);
    const sourcePath = join(temp, "runtime.alexis");
    writeFileSync(sourcePath, RUNTIME_SOURCE(fixtures.httpPort, fixtures.tcpPort));
    for (const profile of profiles) {
      const romPath = join(temp, `runtime-${profile}.rom`);
      const symPath = join(temp, `runtime-${profile}.sym`);
      const build = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), sourcePath, "--hardware", "fujinet", "--opt", profile, "--rom", romPath, "--symbols", symPath], {
        cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
      });
      assert.equal(build.status, 0, `${profile}: ${build.stdout}${build.stderr}`);
      rmSync(join(fujinetDir, "SD", "FujiNet"), { recursive: true, force: true });
      mkdirSync(join(fujinetDir, "SD", "FujiNet"), { recursive: true });
      const symbols = readSymbols(symPath);
      const address = (name) => {
        const value = symbols.get(`AMY_UVAR_${name}`);
        assert.ok(Number.isInteger(value), `${profile}: no symbol for ${name}`);
        return value;
      };
      const vars = Object.entries(EXPECTATIONS).map(([name, [length]]) => `${name}:${address(name)}:${length}`).join(",");
      // MAME must run from its own tree, or -autoboot_script is ignored. It runs
      // asynchronously so this process's fixture servers keep answering.
      const mame = await runProcess("./mame", [
        "coleco", "-cartslot", "fujinet", "-cart", romPath,
        "-video", "none", "-sound", "none", "-nothrottle", "-seconds_to_run", "150",
        "-autoboot_script", probePath
      ], {
        cwd: mameDir,
        timeoutMs: 240000,
        env: { ...process.env, FUJINET_TCP: `127.0.0.1:${boipPort}`, PROBE_DONE: String(address("Done")), PROBE_VARS: vars }
      });
      const values = {};
      for (const line of `${mame.stdout}`.split(/\r?\n/)) {
        const match = line.match(/^PROBE (\w+)=([0-9A-F]*)$/);
        if (match) values[match[1]] = [...Buffer.from(match[2], "hex")];
      }
      assert.ok(values.Done, `${profile}: MAME printed no probe values\n${mame.stdout}${mame.stderr}`);
      checkResults(values, `ColecoVision/${profile}`);
      console.log(`  ${profile}: ok (${(mame.stdout.match(/PROBE time=([\d.]+)/) || [])[1]} emulated s)`);
    }
    console.log(`FujiNet ColecoVision runtime: PASS (${profiles.length} profiles: HTTP GET, JSON queries with drain, HTTP POST, TCP echo with a short read, app keys, clock, adapter, bad unit)`);
  } catch (error) {
    if (process.env.AMY_KEEP_TEST_TEMP) console.log(`fujinet-pc log:\n${fujinetLog.slice(-4000)}`);
    throw error;
  } finally {
    fixtures.close();
  }
}

try {
  await main();
} finally {
  for (const child of children) child.kill("SIGTERM");
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
