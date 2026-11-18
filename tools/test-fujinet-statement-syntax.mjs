#!/usr/bin/env node
// FujiNet statements: every form on both backends, every rejection, inline
// `if ... then` routing, system records and target resolution.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolveAmyBuildContext, getBuildContextDefines } from "../studio/core/projectTargets.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-fujinet-syntax-"));

const contexts = {
  cartridge: resolveAmyBuildContext({ target: { platform: "colecovision-cartridge", hardware: ["fujinet"] } }),
  adam: resolveAmyBuildContext({ target: { platform: "adam-native-program", medium: "dsk", hardware: ["fujinet"] } }),
  hybrid: resolveAmyBuildContext({ target: { platform: "adam-disk", medium: "dsk", hardware: ["fujinet"] } }, { memoryProfile: "adam-os7-eos-drivers" }),
  plain: resolveAmyBuildContext({ target: { platform: "colecovision-cartridge" } })
};

const declarations = `appkey creator $B0C1 app 1
u8 Present = 0
u8 S = 0
u8 Got = 0
u16 Total = 0
u8 Unit = 1
u8 Page[64]
u8 Url[40]
FujiNetStatus Info
FujiNetTime Clock
`;

function transpile(context, body, withDeclarations = true) {
  return transpileAmyForTest(`${withDeclarations ? declarations : ""}${body}\nloop forever\n`, {
    buildContext: context,
    predefinedSymbols: [...getBuildContextDefines(context)]
  });
}

function accepts(context, body, pattern) {
  const result = transpile(context, body);
  assert.equal(result.ok, true, `${context.platform}: ${body}\n${result.log}`);
  if (pattern) assert.match(result.asmBody, pattern, `${context.platform}: ${body}`);
  return result.asmBody;
}

function rejects(context, body, pattern, withDeclarations = true) {
  const result = transpile(context, body, withDeclarations);
  assert.equal(result.ok, false, `${context.platform} should reject: ${body}`);
  assert.match(result.log, pattern, `${context.platform}: ${body}\n${result.log}`);
}

try {
  // Target resolution.
  assert.ok(contexts.cartridge.capabilities.includes("fujinet-cartridge"));
  assert.ok(contexts.adam.capabilities.includes("fujinet-adamnet"));
  assert.ok(contexts.hybrid.capabilities.includes("fujinet-adamnet"));
  assert.ok(getBuildContextDefines(contexts.cartridge).includes("AMY_HAS_FUJINET"));
  assert.ok(!getBuildContextDefines(contexts.plain).includes("AMY_HAS_FUJINET"));
  assert.throws(() => resolveAmyBuildContext({ target: { platform: "colecovision-megacart", hardware: ["fujinet"] } }), /megacart.*mailbox/i);
  assert.throws(() => resolveAmyBuildContext({ target: { platform: "adam-native-program", hardware: ["fujinet"] } }, { memoryProfile: "colecovision_legacy_sdcc" }), /AdamNet/i);
  assert.throws(() => resolveAmyBuildContext({ target: { platform: "adam-disk", hardware: ["fujinet"] } }), /AdamNet/i);

  // Every form, on each backend.
  const forms = [
    ["Present = fujinet present", "PRESENT"],
    ['network open 1 "N:HTTP://127.0.0.1/x" read status S', "OPEN"],
    ["network open Unit Url read write translate crlf", "OPEN"],
    ['network open 1 "N:HTTP://127.0.0.1/x" post', "OPEN"],
    ["network close 1 status S", "CLOSE"],
    ["network status 1 as Info status S", "STATUS"],
    ["Got = network read 1 into Page status S", "READ"],
    ["Total = network read Unit into Page count Got", "READ"],
    ["network write 1 from Page count Got status S", "WRITE"],
    ['network write 1 "GET / HTTP/1.0"', "WRITE"],
    ["network json 1 status S", "JSON"],
    ["network http mode 1 post data status S", "HTTP_MODE"],
    ["network http mode Unit body", "HTTP_MODE"],
    ['Got = network query 1 "/main/temp" into Page status S', "DRAIN"],
    ["Got = appkey read 3 into Page status S", "APPKEY_READ"],
    ["appkey write Got from Page count 10 status S", "APPKEY_WRITE"],
    ["fujinet time into Clock status S", "TIME"],
    ["Got = fujinet hostname into Page status S", "ADAPTER"],
    ["Total = fujinet ip into Page", "ADAPTER"]
  ];
  for (const [name, context] of Object.entries({ cartridge: contexts.cartridge, adam: contexts.adam, hybrid: contexts.hybrid })) {
    const prefix = name === "cartridge" ? "AMY_FNC_" : "AMY_FNA_";
    for (const [form, routine] of forms) accepts(context, form, new RegExp(`call ${prefix}${routine}\\b`));
  }

  // Mode, translation and the 6-byte app key open.
  accepts(contexts.cartridge, "network open Unit Url read write translate crlf", /ld de,\$0C03/i);
  accepts(contexts.cartridge, 'network open 1 "N:X" post', /ld de,\$0D00/i);
  accepts(contexts.cartridge, "Got = appkey read 3 into Page", /ld e,3\s+ld d,1\s+ld hl,\$B0C1\s+ld a,0\s+call AMY_FNC_APPKEY_OPEN/i);
  accepts(contexts.cartridge, "Got = fujinet hostname into Page", /ld hl,\$4021/i);
  // A variable count is clamped to the buffer at run time.
  accepts(contexts.cartridge, "Total = network read 1 into Page count Total", /ld hl,64\s+call AMY_FN_MIN_BC_HL/i);

  // Inline `if ... then` forms reach the FujiNet handler.
  accepts(contexts.cartridge, "if Present then network close 1", /call AMY_FNC_CLOSE/);
  accepts(contexts.cartridge, "if Present then Got = network read 1 into Page", /call AMY_FNC_READ/);
  accepts(contexts.adam, "if Present then network write 1 \"X\" status S", /call AMY_FNA_WRITE/);

  // System records.
  accepts(contexts.cartridge, "Info.Error = 5\nClock.Second = 1\nTotal = Info.Waiting", /AMY_UVAR_Info\+3|\$70[0-9A-F]{2}/i);
  rejects(contexts.plain, "FujiNetStatus Info\nloop forever", /FujiNetStatus|unknown|type/i, false);

  // ADAM packet RAM is reserved only when a statement uses it.
  assert.match(accepts(contexts.adam, "network close 1"), /AMY_FUJINET_PACKET EQU/);
  assert.doesNotMatch(accepts(contexts.adam, "Got = 1"), /AMY_FUJINET_PACKET/);
  assert.doesNotMatch(accepts(contexts.cartridge, "network close 1"), /AMY_FUJINET_PACKET/);

  // Rejections.
  rejects(contexts.plain, "network close 1", /target\.hardware "fujinet"/);
  rejects(contexts.cartridge, "network close 9", /unit must be 1-8/);
  rejects(contexts.cartridge, "network close 0", /unit must be 1-8/);
  rejects(contexts.adam, "network close 3", /unit must be 1-2/);
  rejects(contexts.cartridge, "Got = network read 1 into Page count 65", /exceeds the 64-byte buffer/);
  rejects(contexts.cartridge, "network write 1 from Page count 100", /exceeds the 64-byte buffer/);
  rejects(contexts.cartridge, "network read 1 into Page", /returns a value/);
  rejects(contexts.cartridge, "network status 1 as Clock", /FujiNetStatus record/);
  rejects(contexts.cartridge, "fujinet time into Info", /FujiNetTime record/);
  rejects(contexts.cartridge, "Got = network read 1 into Present", /u8 array/);
  rejects(contexts.cartridge, "network open 1 \"N:X\" append", /Use 'network open/);
  rejects(contexts.cartridge, "network http mode 1 headers", /Use 'network http mode/);
  rejects(contexts.cartridge, "appkey write 1 from Page count 65", /appkey write count must be 0-64/);
  rejects(contexts.cartridge, "u8 Buf[8]\nu8 G = 0\nG = appkey read 1 into Buf\nloop forever", /appkey creator/, false);
  rejects(contexts.cartridge, "appkey creator 0 app 1\nloop forever", /creator must be 1-\$FFFF/, false);
  rejects(contexts.cartridge, "appkey creator 1 app 1\nappkey creator 2 app 1\nloop forever", /Only one appkey/, false);

  // Cartridge hazards: the mailbox occupies $F800-$FFFF.
  rejects(contexts.cartridge, "bank rom 128", /MegaCart bank statements/);
  rejects(contexts.cartridge, "poke($8000, 1)", /would fire a FujiNet cartridge hotspot/);
  rejects(contexts.cartridge, "Got = peek($FD00)", /reads the FujiNet mailbox/);
  accepts(contexts.cartridge, "poke($7100, 1)\nGot = peek($8000)");

  // No FujiNet statement may run from the NMI.
  rejects(contexts.cartridge, `on vblank Tick
sub Tick
  network close 1
end sub`, /cannot run from the NMI \(on vblank path\)/);
  rejects(contexts.cartridge, `on vblank Tick
sub Tick
  Helper()
end sub
sub Helper
  if Present then network close 1
end sub`, /cannot run from the NMI/);

  // Full compile and assembly through amyc on every target.
  const sourcePath = join(temp, "all-forms.alexis");
  writeFileSync(sourcePath, `${declarations}${forms.map(([form]) => form).join("\n")}\nloop forever\n`);
  const builds = [
    ["cartridge", ["--hardware", "fujinet"]],
    ["adam", ["--target", "adam-native-program", "--medium", "dsk", "--hardware", "fujinet"]],
    ["hybrid", ["--target", "adam-disk", "--medium", "dsk", "--memory-profile", "adam-os7-eos-drivers", "--hardware", "fujinet"]]
  ];
  for (const [name, args] of builds) {
    const romPath = join(temp, `${name}.bin`);
    const build = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), sourcePath, "--opt", "balanced", "--rom", romPath, ...args], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${name}: ${build.stdout}${build.stderr}`);
    if (name === "cartridge") assert.equal(readFileSync(romPath).length, 32768);
  }
  const megacart = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), sourcePath, "--target", "colecovision-megacart", "--hardware", "fujinet"], {
    cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(megacart.status, 2, "MegaCart + FujiNet must stop at target resolution");
  assert.match(megacart.stderr, /megacart.*mailbox/i);

  console.log(`FujiNet statements: PASS (${forms.length} forms x 3 targets, inline if, records, packet RAM, rejections, hazards, NMI paths, amyc builds)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
