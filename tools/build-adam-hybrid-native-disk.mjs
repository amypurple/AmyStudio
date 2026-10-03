#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const [, , romPath, outputPath] = process.argv;
if (!romPath || !outputPath) {
  console.error("Usage: node tools/build-adam-hybrid-native-disk.mjs program.rom output.dsk");
  process.exit(2);
}

const rom = fs.readFileSync(romPath);
const blockSize = 1024;
const blockCount = 160;
const programStart = 3;
const programBlocks = 41;
const cartridgeOffset = 0x4400;
const cartridgeCapacity = 0x6000;
const interleave = [0, 5, 2, 7, 4, 1, 6, 3];

if (rom.length > cartridgeCapacity) {
  throw new Error(`Hybrid OS7 window is 24 KB; ROM is ${rom.length} bytes.`);
}
const validHeader = (rom[0] === 0x55 && rom[1] === 0xAA) ||
  (rom[0] === 0xAA && rom[1] === 0x55);
if (!validHeader) throw new Error("ROM lacks a ColecoVision AA 55 or 55 AA header.");

const bootSource = `
org $C800
    im 1
    di
    ld sp,$2FF0
    ld a,3
    call $FD14
    ld de,${programStart}
    ld bc,0
    ld hl,$2000
    call ReadBlock
    ld hl,$4000
    ld ix,40
LoadProgram:
    call ReadBlock
    push de
    ld de,$0400
    add hl,de
    pop de
    dec ix
    ld a,ixh
    or ixl
    jr nz,LoadProgram
    jp $0000
ReadBlock:
    ld a,4
ReadBlockRetry:
    call $FCF3
    jr nz,ReadBlockRetry
    inc de
    ret
`;
const assembled = await assembleAmysCVAssembly({ "main.asm": bootSource }, "main.asm", {
  outputFilename: "BOOT.bin",
  outputMode: "binary",
  optimize: false
});
if (!assembled.ok) throw new Error(`ADAM loader assembly failed:\n${assembled.log}`);
const boot = Buffer.from(assembled.binary || assembled.bytes || []);
if (boot.length > blockSize) throw new Error(`ADAM loader exceeds one block: ${boot.length} bytes.`);

const logicalBlocks = Array.from({ length: blockCount }, () => Buffer.alloc(blockSize, 0xFF));
boot.copy(logicalBlocks[0]);
writeDirectory(logicalBlocks[1]);
boot.copy(logicalBlocks[2]);

const payload = Buffer.alloc(programBlocks * blockSize, 0xFF);
payload.fill(0, 0, cartridgeOffset);
rom.copy(payload, cartridgeOffset);
for (let block = 0; block < programBlocks; block += 1) {
  payload.copy(logicalBlocks[programStart + block], 0, block * blockSize, (block + 1) * blockSize);
}

const disk = Buffer.alloc(blockCount * blockSize, 0xFF);
for (let block = 0; block < blockCount; block += 1) writePhysicalBlock(disk, block, logicalBlocks[block]);
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(outputPath, disk);
console.log(`Native Amy ADAM disk: ${outputPath}`);
console.log(`Loader: ${boot.length} bytes; ROM: ${rom.length}/${cartridgeCapacity} bytes`);

function writeDirectory(directory) {
  writeEntry(directory, 0, "AMY ADAM", 0x81, 0xAA55, blockCount, 0, 0);
  writeEntry(directory, 1, "BOOT", 0x88, 0, 1, 1, blockSize);
  writeEntry(directory, 2, "DIRECTORY", 0xC8, 1, 1, 1, blockSize);
  writeEntry(directory, 3, "BOOT-AMY", 0x10, 2, 1, 1, blockSize);
  writeEntry(directory, 4, "AMY PROGRAM", 0x10, programStart, programBlocks, programBlocks, blockSize);
  writeEntry(directory, 5, "BLOCKS LEFT", 0x01, programStart + programBlocks,
    blockCount - programStart - programBlocks, 0, blockSize);
  directory[6 * 26] = 0xFF;
}

function writeEntry(directory, index, name, attribute, start, allocated, used, lastCount) {
  const offset = index * 26;
  directory.fill(0x20, offset, offset + 12);
  Buffer.from(name, "ascii").copy(directory, offset, 0, 11);
  directory[offset + Math.min(name.length, 11)] = 0x03;
  directory[offset + 12] = attribute;
  directory.writeUInt16LE(start, offset + 13);
  directory.writeUInt16LE(allocated, offset + 17);
  directory.writeUInt16LE(used, offset + 19);
  directory.writeUInt16LE(lastCount, offset + 21);
  directory[offset + 23] = 1;
  directory[offset + 24] = 1;
  directory[offset + 25] = 0x26;
}

function writePhysicalBlock(disk, block, bytes) {
  for (let half = 0; half < 2; half += 1) {
    const logicalSector = block * 2 + half;
    const physicalSector = (logicalSector & ~7) | interleave[logicalSector & 7];
    bytes.copy(disk, physicalSector * 512, half * 512, half * 512 + 512);
  }
}
