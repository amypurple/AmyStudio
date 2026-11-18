#!/usr/bin/env node
// FujiNet on the Coleco ADAM, end to end: an Amy native EOS program boots in
// ADAMEm from a private fujinet-pc (ADAM build) over AdamNet-over-IP and runs
// the same network, JSON, app key, clock and adapter checks as the cartridge
// test. Opt-in, because it needs two external trees:
//   AMY_FUJINET_ADAMEM    the adamem binary from adamem_sdl with -fujinet support
//                         (run from its own directory so it finds its ROMs)
//   AMY_FUJINET_ADAM_DIST a fujinet-pc ADAM build's dist directory; the test
//                         runs a copy with the program as data/autorun.ddp
// Without both it prints SKIP and exits 0. It never touches a public server.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildAdamBootDisk, buildAdamNativeProgramDisk } from "../studio/core/adamDiskImage.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import {
  EXPECTATIONS, RUNTIME_SOURCE, checkResults, freePort, privateFujinet, readSymbols, runProcess, startFixtures
} from "./lib/fujinet-runtime-rig.mjs";

const root = resolve(import.meta.dirname, "..");
const adamem = process.env.AMY_FUJINET_ADAMEM;
const fujinetDist = process.env.AMY_FUJINET_ADAM_DIST;
if (!adamem || !fujinetDist || !existsSync(adamem) || !existsSync(join(fujinetDist, "fujinet"))) {
  console.log("SKIP FujiNet ADAM runtime: set AMY_FUJINET_ADAMEM and AMY_FUJINET_ADAM_DIST");
  process.exit(0);
}

const profiles = (process.env.AMY_FUJINET_PROFILES || "off,safe,balanced,aggressive,experimental").split(",");
const forms = (process.env.AMY_FUJINET_ADAM_FORMS || "native,hybrid").split(",");
const runSeconds = Number(process.env.AMY_FUJINET_ADAM_SECONDS || 30);
// ADAMEm snapshots hold 16K of VRAM at 2434, then the 64K RAM.
const SNAPSHOT_RAM_OFFSET = 2434 + 16384;
const temp = mkdtempSync(join(tmpdir(), "amy-fujinet-adam-"));

// Same sector order as adamDiskImage.js serializeAdamBlocks.
const INTERLEAVE = [0, 5, 2, 7, 4, 1, 6, 3];
function linearDisk(disk) {
  const media = new Uint8Array(262144).fill(0xFF);
  for (let sector = 0; sector < disk.length / 512; sector += 1) {
    const physical = (sector & ~7) | INTERLEAVE[sector & 7];
    media.set(disk.subarray(physical * 512, physical * 512 + 512), sector * 512);
  }
  return media;
}

async function assembleLoader(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"),
    outputMode: "binary",
    optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return result.binary || result.bytes;
}

async function main() {
  const fixtures = await startFixtures();
  try {
    const sourcePath = join(temp, "runtime.alexis");
    writeFileSync(sourcePath, RUNTIME_SOURCE(fixtures.httpPort, fixtures.tcpPort));
    for (const [form, profile] of forms.flatMap((form) => profiles.map((profile) => [form, profile]))) {
      const label = `${form}/${profile}`;
      const binPath = join(temp, `runtime-${form}-${profile}.bin`);
      const symPath = join(temp, `runtime-${form}-${profile}.sym`);
      // fujinet-pc serves autorun.ddp as disk 1 ($04), so both loaders read $04.
      const targetArgs = form === "native"
        ? ["--target", "adam-native-program", "--medium", "dsk"]
        : ["--target", "adam-disk", "--medium", "dsk", "--memory-profile", "adam-os7-eos-drivers"];
      const build = spawnSync(process.execPath, [
        join(root, "tools", "amyc.mjs"), sourcePath, ...targetArgs,
        "--hardware", "fujinet", "--opt", profile, "--rom", binPath, "--symbols", symPath
      ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      assert.equal(build.status, 0, `${label}: ${build.stdout}${build.stderr}`);
      // Studio's disk packaging. fujinet-pc mounts autorun.ddp as a linear
      // 256 KiB image, so undo the DSK sector interleave.
      const program = readFileSync(binPath);
      let disk;
      if (form === "hybrid") {
        const diskPath = join(temp, `runtime-${form}-${profile}.dsk`);
        const packed = spawnSync(process.execPath, [join(root, "tools", "build-adam-hybrid-native-disk.mjs"), binPath, diskPath], {
          cwd: root, encoding: "utf8"
        });
        assert.equal(packed.status, 0, `${label}: ${packed.stdout}${packed.stderr}`);
        disk = readFileSync(diskPath);
      } else {
        disk = program.length <= 1024
          ? buildAdamBootDisk({ boot: program, files: [], volume: "AMY FUJINET" }).media
          : (await buildAdamNativeProgramDisk({ program, volume: "AMY FUJINET", assemble: assembleLoader })).media;
      }
      const media = linearDisk(disk);

      const port = await freePort();
      const fujinetDir = join(temp, `fujinet-${form}-${profile}`);
      privateFujinet(fujinetDist, fujinetDir, port);
      writeFileSync(join(fujinetDir, "data", "autorun.ddp"), media);
      const snapPath = join(temp, `runtime-${form}-${profile}.snap`);

      // ADAMEm listens and fujinet-pc dials in, so ADAMEm starts first.
      const emulator = runProcess(adamem, ["-fujinet", String(port), "-autosnap", "1", "-snap", snapPath], {
        cwd: dirname(adamem),
        timeoutMs: (runSeconds + 30) * 1000,
        env: { ...process.env, SDL_VIDEODRIVER: "dummy", SDL_AUDIODRIVER: "dummy" }
      });
      await new Promise((wait) => setTimeout(wait, 1000));
      const fujinet = spawn("./fujinet", [], { cwd: fujinetDir, stdio: "ignore" });
      await new Promise((wait) => setTimeout(wait, runSeconds * 1000));
      // SIGTERM makes ADAMEm write its snapshot on the way out.
      emulator.child.kill("SIGTERM");
      const result = await emulator;
      fujinet.kill("SIGTERM");
      assert.ok(existsSync(snapPath), `${label}: ADAMEm wrote no snapshot\n${result.stdout}${result.stderr}`);

      const snapshot = readFileSync(snapPath);
      const symbols = readSymbols(symPath);
      const values = {};
      for (const [name, [length]] of Object.entries(EXPECTATIONS)) {
        const address = symbols.get(`AMY_UVAR_${name}`);
        assert.ok(Number.isInteger(address), `${label}: no symbol for ${name}`);
        values[name] = [...snapshot.subarray(SNAPSHOT_RAM_OFFSET + address, SNAPSHOT_RAM_OFFSET + address + length)];
      }
      checkResults(values, `ADAM/${label}`);
      console.log(`  ${label}: ok`);
    }
    console.log(`FujiNet ADAM runtime: PASS (${forms.join(" + ")} x ${profiles.length} profiles: HTTP GET, JSON queries with drain, HTTP POST, TCP echo with a short read, app keys, clock, adapter, bad unit)`);
  } finally {
    fixtures.close();
  }
}

try {
  await main();
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
