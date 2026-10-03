#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-eos-records-"));

function compile(name, source, extraArgs = []) {
  const sourcePath = join(temp, `${name}.alexis`);
  const asmPath = join(temp, `${name}.asm`);
  const binaryPath = join(temp, `${name}.bin`);
  writeFileSync(sourcePath, source);
  const result = spawnSync(process.execPath, [amyc, sourcePath, "--asm", asmPath, "--rom", binaryPath, ...extraArgs], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  return {
    ...result,
    output: `${result.stdout || ""}${result.stderr || ""}`,
    asm: result.status === 0 ? readFileSync(asmPath, "utf8") : ""
  };
}

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-F]+)$`, "mi"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const native = compile("native", `
EosFile FileInfo
EosDate Today
EosDirectoryEntry Entry
EosDirectory Directory
AdamNetPcb Pcb
AdamNetDcb Dcb
AdamNetDcb CopyDcb
u16 Start = 0
u16 Used = 0
u8 Marker = 0
u8 Slot = 2
u8 SubmitStatus = 0
u32 BlockCopy = 0

Today.Year = 86
Today.Month = 10
Today.Day = 2
set date Today
Today = date status SubmitStatus
Start = FileInfo.StartBlock
Used = Directory.Entries[38].UsedBlocks
Marker = Directory.Tail[9]
Pcb.DeviceCount = 6
Dcb.BufferLength = 1024
Dcb.Block = $12345678
BlockCopy = Dcb.Block
CopyDcb.Block = BlockCopy
Dcb.NodeStatus = $80
Dcb.CommandStatus = 1
submit Dcb to Slot status SubmitStatus
loop forever
`, ["--target", "adam-native-program", "--medium", "dsk", "--opt", "safe"]);
  assert.equal(native.status, 0, `${native.error?.stack || ""}${native.output}`);
  const fileInfo = addressOf(native.asm, "AMY_UVAR_FileInfo");
  const today = addressOf(native.asm, "AMY_UVAR_Today");
  const entry = addressOf(native.asm, "AMY_UVAR_Entry");
  const directory = addressOf(native.asm, "AMY_UVAR_Directory");
  const start = addressOf(native.asm, "AMY_UVAR_Start");
  const pcb = addressOf(native.asm, "AMY_UVAR_Pcb");
  const dcb = addressOf(native.asm, "AMY_UVAR_Dcb");
  const copyDcb = addressOf(native.asm, "AMY_UVAR_CopyDcb");
  assert.equal(today - fileInfo, 23, "EosFile size changed");
  assert.equal(entry - today, 3, "EosDate size changed");
  assert.equal(directory - entry, 26, "EosDirectoryEntry size changed");
  assert.equal(pcb - directory, 1024, "EosDirectory size changed");
  assert.equal(dcb - pcb, 4, "AdamNetPcb size changed");
  assert.equal(copyDcb - dcb, 21, "AdamNetDcb size changed");
  assert.equal(start - copyDcb, 21, "second AdamNetDcb size changed");
  assert.match(native.asm, new RegExp(`ld a,\\(\\$${(directory + 1007).toString(16)}\\+0\\)`, "i"), "Entries[38].UsedBlocks offset changed");
  assert.match(native.asm, new RegExp(`ld a,\\(\\$${(directory + 1023).toString(16)}\\)`, "i"), "Tail[9] offset changed");
  assert.match(native.asm, new RegExp(`ld \\(\\$${(dcb + 3).toString(16)}\\),hl`, "i"), "AdamNetDcb.BufferLength offset changed");
  assert.match(native.asm, /ld \(AMY_CMP_LEFT32\+0\),a[\s\S]*ld \(AMY_CMP_LEFT32\+3\),a/i, "u32 record field was not staged");
  assert.match(native.asm, new RegExp(`ld hl,\\$${(copyDcb + 5).toString(16)}`, "i"), "AdamNetDcb.Block copy offset changed");
  assert.match(native.asm, new RegExp(`ld \\(\\$${(dcb + 20).toString(16)}\\),a`, "i"), "AdamNetDcb.NodeStatus offset changed");
  assert.match(native.asm, /ld hl,\$FEC4[\s\S]*ld de,21[\s\S]*ld bc,21[\s\S]*ldir/i, "AdamNet DCB was not copied into the live PCB");
  assert.match(native.asm, /ld a,\(hl\)[\s\S]*bit 7,a[\s\S]*jr z,AMY_ADAM_NET_WAIT_DCB/i, "AdamNet completion was not awaited");
  assert.match(native.asm, /bit 7,a[\s\S]*ld bc,21[\s\S]*ldir/i, "completed AdamNet DCB was not copied back to its record");
  assert.match(native.asm, /ld d,\(hl\)[\s\S]*ld c,\(hl\)[\s\S]*ld b,\(hl\)[\s\S]*call \$FCD8/i, "EosDate set ABI changed");
  assert.match(native.asm, /call \$FCDB[\s\S]*ld \(hl\),d[\s\S]*ld \(hl\),c[\s\S]*ld \(hl\),b/i, "EosDate read ABI changed");

  const hybrid = compile("hybrid", `
EosFile FileInfo
EosDirectory Directory
u16 Start = 0
u8 Count = 0
u8 ReadStatus = 0
Start = FileInfo.StartBlock
Count = catalog Directory status ReadStatus
loop forever
`, ["--target", "adam-disk", "--medium", "dsk", "--memory-profile", "adam-os7-eos-drivers", "--opt", "safe"]);
  assert.equal(hybrid.status, 0, `${hybrid.error?.stack || ""}${hybrid.output}`);
  assert.match(hybrid.asm, /AMY_UVAR_FileInfo\s+EQU/i, "hybrid EosFile was not allocated");
  assert.match(hybrid.asm, /AMY_UVAR_Directory\s+EQU/i, "hybrid EosDirectory was not allocated");
  assert.match(hybrid.asm, /call \$FCF3/i, "hybrid EOS block read was not emitted");
  assert.match(hybrid.asm, /ld a,\$04/i, "hybrid DSK device was not selected");

  const cartridge = compile("cartridge", `
EosFile FileInfo
AdamNetDcb Request
u8 Result = 0
submit Request to 2 status Result
loop forever
`, ["--target", "colecovision-cartridge", "--opt", "safe"]);
  assert.notEqual(cartridge.status, 0, "EosFile leaked into the OS7 target");
  assert.match(cartridge.output, /EosFile|AdamNetDcb|unknown|type/i);

  const redefined = compile("redefined", `
record EosFile:
  u8 Wrong
end record
loop forever
`, ["--target", "adam-native-program", "--medium", "dsk", "--opt", "safe"]);
  assert.notEqual(redefined.status, 0, "native source redefined EosFile");
  assert.match(redefined.output, /EosFile.*(?:reserved|already|record type)|(?:reserved|already).*EosFile/i);

  const cartridgeDate = compile("cartridge-date", `
record EosDate:
  u8 Wrong
end record
loop forever
`, ["--target", "colecovision-cartridge", "--opt", "safe"]);
  assert.equal(cartridgeDate.status, 0, "EosDate should remain available as an ordinary user record name on OS7");

  console.log("EOS system records: PASS (date, file, directory, AdamNet PCB/DCB layouts, nested offsets, target isolation, reserved names)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
