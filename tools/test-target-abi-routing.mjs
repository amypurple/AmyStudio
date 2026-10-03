#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-target-abi-"));

function compileResult(name, source, args) {
  const input = join(temp, `${name}.amy`);
  const asm = join(temp, `${name}.asm`);
  const binary = join(temp, `${name}.bin`);
  writeFileSync(input, source);
  const result = spawnSync(process.execPath, [amyc, input, "--asm", asm, "--rom", binary, "--opt", "safe", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  return {
    ...result,
    output,
    asm: result.status === 0 ? readFileSync(asm, "utf8") : ""
  };
}

function compile(name, source, args) {
  const result = compileResult(name, source, args);
  assert.equal(result.status, 0, `${name}: ${result.error?.stack || ""}${result.output}`);
  return result.asm;
}

const sharedSource = `
text screen
print at 4,4, "ABI"
display off
display on
screen on no nmi
loop forever
`;

try {
  const os7 = compile("os7", sharedSource, [
    "--target", "colecovision-cartridge",
    "--memory-profile", "colecovision_legacy_sdcc"
  ]);
  assert.match(os7, /VDP_R1_SHADOW\s+EQU \$73C4/i);
  assert.match(os7, /VDP_NAME_SHADOW\s+EQU \$73F6/i);
  assert.match(os7, /WRITE_REGISTER\s+EQU \$1FD9/i);
  assert.doesNotMatch(os7, /call \$FC(?:F3|1A|26)/i);

  const native = compile("native", sharedSource, [
    "--target", "adam-native-program",
    "--medium", "dsk",
    "--memory-profile", "adam-eos-application"
  ]);
  assert.match(native, /VDP_R1_SHADOW\s+EQU \$FD62/i);
  assert.match(native, /VDP_NAME_SHADOW\s+EQU \$FD68/i);
  assert.match(native, /WRITE_REGISTER\s+EQU \$FD20/i);
  assert.doesNotMatch(native, /\$73C4|\$73F6/i);
  const nativeNmi = compileResult("native-nmi", "text screen\nscreen on\nloop forever\n", [
    "--target", "adam-native-program",
    "--medium", "dsk",
    "--memory-profile", "adam-eos-application"
  ]);
  assert.notEqual(nativeNmi.status, 0, "native EOS accepted screen on without a safe NMI backend");
  assert.match(nativeNmi.output, /screen on no nmi/i);
  const nativeWait = compile("native-wait", "wait 2 frames\nloop forever\n", [
    "--target", "adam-native-program",
    "--medium", "dsk",
    "--memory-profile", "adam-eos-application"
  ]);
  assert.match(nativeWait, /AMY_WAIT_FRAMES_SAFE_EOS_NEXT/i);
  assert.doesNotMatch(nativeWait, /AMY_WAIT_FRAMES_SAFE_NMI_|\bhalt\b/i);
  const nativeChoice = compile("native-choice", "u8 Choice = 1\nchoose keypad 1 to 3 into Choice\nloop forever\n", [
    "--target", "adam-native-program",
    "--medium", "dsk",
    "--memory-profile", "adam-eos-application"
  ]);
  assert.match(nativeChoice, /AMY_CHOOSE_KEYPAD_WAIT/i);
  assert.doesNotMatch(nativeChoice, /^\s*halt\s*$/mi);
  const nativeFrameService = compile("native-frame-service", `
timer Pulse every 4 ticks stopped
on vblank Tick
sub Tick:
  return
end sub
sub start:
  start timer Pulse
  wait 4 frames
  stop timer Pulse
  loop forever
end sub
`, [
    "--target", "adam-native-program",
    "--medium", "dsk",
    "--memory-profile", "adam-eos-application"
  ]);
  assert.match(nativeFrameService, /AMY_EOS_FRAME_TICK/i);
  assert.doesNotMatch(nativeFrameService, /^\s*halt\s*$/mi);
  const nativeMusic = compile("native-music", `
asm {
TinyStream:
  db $44
  dw sndtiny_1
  db 2,$02,$60,$19,$22,$13,$16,$FF
TinySong:
  dw 1
  db $41
  dw 0
TinyTable:
  dw TinyStream,$702B
}
set sound table TinyTable areas 1
play song TinySong
wait 4 frames
loop forever
`, [
    "--target", "adam-native-program",
    "--medium", "dsk",
    "--memory-profile", "adam-eos-application"
  ]);
  assert.match(nativeMusic, /AMY_EOS_TINY_ATN_SWEEP/i);
  assert.match(nativeMusic, /call AMY_UPDATE_MUSIC/i);
  assert.doesNotMatch(nativeMusic, /(?:call|jp)\s+\$(?:012F|00FC|0295)\b/i);
  for (const [name, statement] of [
    ["menu-sleep", "choose keypad 1 to 3 into Choice sleep after 10 seconds"],
    ["pause", "pause until press"]
  ]) {
    const declarations = name === "menu-sleep" ? "u8 Choice = 1\n" : "";
    const rejected = compileResult(`native-${name}`, `${declarations}${statement}\nloop forever\n`, [
      "--target", "adam-native-program",
      "--medium", "dsk",
      "--memory-profile", "adam-eos-application"
    ]);
    assert.notEqual(rejected.status, 0, `native EOS accepted ${statement}`);
    assert.match(rejected.output, /OS7 frame\/NMI service/i);
  }

  const hybrid = compile("hybrid", `
EosDirectory Directory
u8 Count = 0
u8 ReadStatus = 0
${sharedSource.replace("loop forever", "Count = catalog Directory status ReadStatus\nloop forever")}
`, [
    "--target", "adam-disk",
    "--medium", "dsk",
    "--memory-profile", "adam-os7-eos-drivers"
  ]);
  assert.match(hybrid, /VDP_R1_SHADOW\s+EQU \$73C4/i);
  assert.match(hybrid, /WRITE_REGISTER\s+EQU \$1FD9/i);
  assert.match(hybrid, /call \$FCF3/i);
  assert.match(hybrid, /ld a,\$04/i);

  const hybridExpressions = compile("hybrid-expressions", `
u8 Buffer[1024]
u16 Block = 2
u16 Offset = 4
u16 TransferSize = 8
u8 ReadStatus = 0
u8 PrintValue = 64
u8 Index = 1
u8 Found[2]
u8 Statuses[2]
u32 Sizes[2]
EosFile Files[2]
Buffer[Offset] = read block Block + 1 status ReadStatus
block write Block + 2 from Buffer[Offset] status ReadStatus
write "SAVE" from Buffer[Offset] count TransferSize * 2 status ReadStatus
print PrintValue + 1 to printer status ReadStatus
Found[Index] = find "SAVE" as Files[Index] status Statuses[Index]
Sizes[Index] = size Files[Index]
loop forever
`, [
    "--target", "adam-disk",
    "--medium", "dsk",
    "--memory-profile", "adam-os7-eos-drivers"
  ]);
  assert.match(hybridExpressions, /call \$FCF3/i);
  assert.match(hybridExpressions, /call \$FCF6/i);
  assert.match(hybridExpressions, /call \$FCD5/i);
  assert.match(hybridExpressions, /call \$FC66/i);

  console.log("Target ABI routing: PASS (OS7, native EOS, and OS7+EOS hybrid)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
