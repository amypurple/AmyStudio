#!/usr/bin/env node
// FujiNet mailbox reads look dead to an optimizer: the value lands in A and is
// overwritten. The runtime keeps every mailbox and DCB access between
// AMY_OPTIMIZER_TIMING markers. This test proves the markers hold under all
// five profiles, that the protected bytes match the protocol, and that nothing
// else in a FujiNet build addresses the mailbox or writes cartridge space.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-fujinet-optimizer-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

const source = `appkey creator $B0C1 app 1
u8 Present = 0
u8 S = 0
u8 Got = 0
u8 Page[64]
FujiNetStatus Info
FujiNetTime Clock
Present = fujinet present
network open 1 "N:HTTP://127.0.0.1/x" read status S
network status 1 as Info
Got = network read 1 into Page status S
network write 1 from Page count Got
network json 1
Got = network query 1 "/a" into Page
Got = appkey read 1 into Page
appkey write 1 from Page count Got
fujinet time into Clock
Got = fujinet version into Page
network close 1
loop forever
`;

// Protocol bytes the cartridge firmware depends on.
const golden = {
  // ld b,a / DATA_RST / DEVICE=b / CMD=c, each as REGSEL ($FD00+r) then REGDATA ($FE00+v).
  FNC_BEGIN: "471105FD1A16FE1E001A1100FD1A16FE581A1101FD1A16FE591A",
  // push de / ld d,$FF / ld e,a / ld a,(de) / pop de
  FNC_TXBYTE: "D516FF5F1AD1",
  FNC_COMMIT: "4F3A09FCFE4620313A0AFCFE4E202A1102FD1A16FE591A3A00FC3C20013C671110FD1A16FE5C1A066E1100003A00FCBC280E1B7AB320F510F02100003E0118113A02FCB720F33A03FCFE0620EC2A04FCAF"
};

function compile(name, profile, args) {
  const sourcePath = join(temp, `${name}.alexis`);
  writeFileSync(sourcePath, source);
  const out = join(temp, `${name}-${profile}`);
  const result = spawnSync(process.execPath, [
    join(root, "tools", "amyc.mjs"), sourcePath, "--opt", profile,
    "--rom", `${out}.bin`, "--symbols", `${out}.sym`, "--asm", `${out}.asm`, "--optimized-asm", `${out}.opt.asm`,
    ...args
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${name}/${profile}: ${result.stdout}${result.stderr}`);
  const asm = readFileSync(`${out}.asm`, "utf8");
  const origin = Number.parseInt(asm.match(/^\s*org\s+\$([0-9A-F]+)/im)[1], 16);
  const symbols = new Map();
  for (const line of readFileSync(`${out}.sym`, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_0-9.]+):\s*equ\s*\$([0-9A-F]+)/i);
    if (match) symbols.set(match[1], Number.parseInt(match[2], 16));
  }
  const binary = readFileSync(`${out}.bin`);
  const regions = {};
  for (const [label, address] of symbols) {
    const begin = label.match(/^AMY_OPTIMIZER_TIMING_BEGIN_(FN[AC]_.+)$/);
    if (!begin) continue;
    const end = symbols.get(`AMY_OPTIMIZER_TIMING_END_${begin[1]}`);
    assert.ok(end > address, `${name}/${profile}: ${begin[1]} has an end marker`);
    regions[begin[1]] = binary.subarray(address - origin, end - origin).toString("hex").toUpperCase();
  }
  return { regions, optimizedAsm: readFileSync(`${out}.opt.asm`, "utf8") };
}

// The optimized listing may print numbers in decimal or hex.
const NUMBER = String.raw`(\$[0-9A-F]+|0x[0-9A-F]+|[0-9]+)`;
function parseNumber(text) {
  if (text.startsWith("$")) return Number.parseInt(text.slice(1), 16);
  if (/^0x/i.test(text)) return Number.parseInt(text.slice(2), 16);
  return Number.parseInt(text, 10);
}

// Every line that names a mailbox address sits inside a marker region, and no
// absolute store reaches cartridge space.
function assertMailboxConfined(optimizedAsm, label) {
  let region = null;
  let confined = 0;
  const memoryOperand = new RegExp(String.raw`\(\s*${NUMBER}\s*\)`, "gi");
  const pairLoad = new RegExp(String.raw`^ld\s+(?:bc|de|hl),\s*${NUMBER}$`, "i");
  const store = new RegExp(String.raw`^ld\s+\(\s*${NUMBER}\s*\)\s*,`, "i");
  for (const raw of optimizedAsm.split(/\r?\n/)) {
    const line = raw.replace(/;.*/, "").trim();
    const begin = line.match(/^AMY_OPTIMIZER_TIMING_BEGIN_(FN[AC]_\w+):/i);
    if (begin) { region = begin[1]; continue; }
    if (/^AMY_OPTIMIZER_TIMING_END_FN[AC]_\w+:/i.test(line)) { region = null; continue; }
    if (!line || /\bequ\b/i.test(line)) continue;
    const mailboxRead = [...line.matchAll(memoryOperand)].some((match) => parseNumber(match[1]) >= 0xF800);
    const pair = line.match(pairLoad);
    // $FC00-$FDFF base loads select the status page or a register.
    const mailboxBase = pair && parseNumber(pair[1]) >= 0xFC00 && parseNumber(pair[1]) <= 0xFDFF;
    if (mailboxRead || mailboxBase) {
      assert.ok(region, `${label}: mailbox access outside a marker region: ${raw}`);
      confined += 1;
    }
    const target = line.match(store);
    if (target) assert.ok(parseNumber(target[1]) < 0x8000, `${label}: store into cartridge space: ${raw}`);
  }
  assert.ok(confined >= 15, `${label}: expected the runtime's mailbox accesses, found ${confined}`);
}

try {
  const targets = [
    ["cartridge", ["--hardware", "fujinet"], "FNC_"]
  ];
  for (const [name, args, prefix] of targets) {
    const baseline = compile(name, "off", args);
    const names = Object.keys(baseline.regions).filter((region) => region.startsWith(prefix));
    assert.ok(names.length >= (prefix === "FNC_" ? 9 : 1), `${name}: marker regions found (${names.join(", ")})`);
    if (prefix === "FNC_") {
      for (const [region, bytes] of Object.entries(golden)) assert.equal(baseline.regions[region], bytes, `${region} protocol bytes`);
    }
    for (const profile of profiles) {
      const build = profile === "off" ? baseline : compile(name, profile, args);
      for (const region of names) {
        assert.equal(build.regions[region], baseline.regions[region], `${name}/${profile}: ${region} bytes changed`);
      }
      if (prefix === "FNC_") assertMailboxConfined(build.optimizedAsm, `cartridge/${profile}`);
    }
  }

  // Canary: the same reads without markers are deleted from Safe up. If this
  // ever stops failing, the markers are still required by the rules above.
  const canary = async (protectedReads) => {
    const body = protectedReads
      ? "Start:\nAMY_OPTIMIZER_TIMING_BEGIN_CANARY:\n    ld a,($FD05)\n    ld a,($FE41)\nAMY_OPTIMIZER_TIMING_END_CANARY:\n    xor a\n    ret\n"
      : "Start:\n    ld a,($FD05)\n    ld a,($FE41)\n    xor a\n    ret\n";
    const profile = getOptimizationProfile("safe");
    const result = await assembleAmysCVAssembly({ "main.asm": new TextEncoder().encode(`org $8000\n${body}`) }, "main.asm", {
      outputMode: "binary", targetPlatform: "raw", optimizerEnabled: profile.optimizerEnabled, optimizerConfig: profile.optimizerConfig
    });
    assert.equal(result.ok, true, result.log);
    return Buffer.from(result.binary).toString("hex").toUpperCase();
  };
  assert.doesNotMatch(await canary(false), /3A05FD/, "unprotected hotspot read survived Safe; revisit the canary");
  assert.match(await canary(true), /3A05FD3A41FE/, "protected hotspot reads were removed");

  console.log(`FujiNet optimizer profiles: PASS (${profiles.length} profiles, cartridge marker regions byte-identical, protocol bytes, mailbox confined, canary)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
