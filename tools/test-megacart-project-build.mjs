#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildMegaCartProject } from "../studio/core/megaCartProjectBuild.js";
import { buildMegaCartImportTrampolines } from "../studio/core/megaCartTrampolines.js";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examples = path.join(root, "studio", "examples-src");
const fixedSource = fs.readFileSync(path.join(examples, "megacart-bank-demo-fixed.asm"), "utf8");
const mdkrleSource = fs.readFileSync(path.join(root, "src", "compression", "mdkrle_vram.asm"), "utf8");
const vdpRwSource = fs.readFileSync(path.join(root, "src", "alexis_lib", "coleco_vdp_rw.asm"), "utf8");
const fixed = await assemble(fixedSource, "fixed.asm");
const files = [
  textFile("banks/bank1.asm", fs.readFileSync(path.join(examples, "megacart-bank-demo-bank1.asm"), "utf8")),
  textFile("banks/bank2.amy", "sub MarkBankCall:\n  asm {\n    ld a,$42\n    ld ($7002),a\n  }\nend sub\ndata Bank2Text bytes = 68,65,84,65,32,70,82,79,77,32,66,65,78,75,32,50\ndata Bank2Compressed bytes = 16,66,65,78,75,69,68,32,68,69,67,79,77,80,82,69,83,83,255")
];
const manifest = {
  target: { platform: "colecovision-megacart", romSizeKb: 128 },
  outputs: [
    { name: "FIXED", type: "fixed-bank", sources: [{ path: "main.amy", kind: "amy" }] },
    { name: "BANK1", type: "switchable-bank", bank: 1, sources: [{ path: "banks/bank1.asm", kind: "asm" }] },
    { name: "BANK2", type: "switchable-bank", bank: 2, exports: ["Bank2Text", "MarkBankCall", "Bank2Compressed"], sources: [{ path: "banks/bank2.amy", kind: "amy" }] }
  ]
};
const built = await buildMegaCartProject({
  project: { projectFiles: files },
  manifest,
  fixedBank: fixed,
  compileAsm: assemble,
  compileAmyBank: async (source) => {
    const transpiled = transpileAmyForTest(source, {
      buildContext: {
        platform: "colecovision-megacart-bank",
        memoryProfile: "colecovision_legacy_sdcc",
        capabilities: ["os7", "megacart", "bank-local"],
        bank: 2
      }
    });
    assert.equal(transpiled.ok, true, transpiled.log);
    return `org $C000\n${transpiled.asmBody}`;
  },
  compileFixed: async ({ linkMap }) => {
    const bank2Text = linkMap.exports.find((entry) => entry.name === "Bank2Text");
    const trampoline = buildMegaCartImportTrampolines({
      imports: [
        { bank: 2, name: "MarkBankCall", kind: "procedure", trampolineLabel: "AMY_MEGACART_CALL_BANK_2_MarkBankCall" },
        { bank: 2, name: "Bank2Text", kind: "data", operation: "copy-vram", trampolineLabel: "AMY_MEGACART_COPY_BANK_2_Bank2Text_TO_VRAM" },
        { bank: 2, name: "Bank2Text", kind: "data", operation: "copy-ram", trampolineLabel: "AMY_MEGACART_COPY_BANK_2_Bank2Text_TO_RAM" },
        { bank: 2, name: "Bank2Compressed", kind: "data", operation: "decompress-vram", codec: "mdkrle", trampolineLabel: "AMY_MEGACART_DECOMPRESS_MDKRLE_BANK_2_Bank2Compressed" }
      ],
      currentBankLabel: "AMY_MEGACART_CURRENT_BANK",
      linkMap
    });
    const source = fixedSource
      .replace("org $8000", "AMY_MEGACART_CURRENT_BANK equ $7003\norg $8000")
      .replace("ld a,($FFC1)\n    ld hl,$C000", `ld a,($FFC1)\n    ld hl,$${bank2Text.address.toString(16).toUpperCase()}`)
      .replace("Forever:\n", "    ld a,1\n    ld (AMY_MEGACART_CURRENT_BANK),a\n    ld a,($FFC0)\n    call AMY_MEGACART_CALL_BANK_2_MarkBankCall\n    ld de,$1A00\n    call AMY_MEGACART_DECOMPRESS_MDKRLE_BANK_2_Bank2Compressed\n    ld de,$1A40\n    ld bc,16\n    call AMY_MEGACART_COPY_BANK_2_Bank2Text_TO_VRAM\n    ld de,$7004\n    ld bc,16\n    call AMY_MEGACART_COPY_BANK_2_Bank2Text_TO_RAM\nForever:\n");
    return assemble(`${source}\n${trampoline}\n${mdkrleSource}\nVDP_DATA_PORT equ $BE\nVDP_CTRL_PORT equ $BF\nAMY_BUFFER32 equ $7020\n${vdpRwSource}`, "fixed-linked.asm");
  }
});
assert.equal(built.image.length, 128 * 1024);
assert.equal(built.linkMap.sections.length, 3);
assert.deepEqual(built.linkMap.sections.map((section) => section.logicalBank), [0, 1, 2]);
assert.deepEqual(built.linkMap.sections.map((section) => section.fileOffset), [7 * 0x4000, 0, 0x4000]);
assert.deepEqual(built.linkMap.sections.slice(1).map((section) => section.logicalStart), [0xC000, 0xC000]);
assert.equal(built.linkMap.sections[1].symbols.some((symbol) => symbol.name === "Bank1Text"), true);
assert.equal(built.linkMap.sections[2].symbols.some((symbol) => symbol.name === "AMY_UDATA_Bank2Text"), true);
assert.deepEqual(built.linkMap.exports[0], {
  name: "Bank2Text",
  symbol: "AMY_UDATA_Bank2Text",
  address: built.linkMap.exports[0].address,
  bank: 2,
  qualifiedName: "bank:2:Bank2Text"
});
assert.equal(built.linkMap.exports[1].name, "MarkBankCall");
assert.equal(built.linkMap.exports[2].name, "Bank2Compressed");

assert.throws(() => buildMegaCartImportTrampolines({
  imports: [{ bank: 2, name: "MarkBankCall", kind: "data", operation: "decompress-vram", codec: "mdkrle", trampolineLabel: "BAD_DATA" }],
  currentBankLabel: "AMY_MEGACART_CURRENT_BANK", linkMap: built.linkMap
}), /must resolve to Amy data/i);
assert.throws(() => buildMegaCartImportTrampolines({
  imports: [{ bank: 2, name: "Bank2Compressed", kind: "procedure", trampolineLabel: "BAD_CALL" }],
  currentBankLabel: "AMY_MEGACART_CURRENT_BANK", linkMap: built.linkMap
}), /must resolve to an Amy sub procedure/i);

const firmware = process.env.AMY_COLECO_BIOS || path.join(root, "studio", "bios", "colecovision.rom");
const core = await GearcolecoTestCore.create({ seed: 0x4d43 });
try {
  core.loadBios(fs.readFileSync(firmware));
  core.loadRom(built.image);
  core.reset();
  for (let frame = 0; frame < 180; frame++) core.runFrame();
  assert.equal(String.fromCharCode(...core.readVram(0x1928, 16)), "DATA FROM BANK 1");
  assert.equal(String.fromCharCode(...core.readVram(0x1968, 16)), "DATA FROM BANK 2");
  assert.equal(core.readRam(0x7002, 1)[0], 0x42);
  assert.equal(String.fromCharCode(...core.readVram(0x1A00, 17)), "BANKED DECOMPRESS");
  assert.equal(String.fromCharCode(...core.readVram(0x1A40, 16)), "DATA FROM BANK 2");
  assert.equal(String.fromCharCode(...core.readRam(0x7004, 16)), "DATA FROM BANK 2");
  assert.equal(core.getRomBank(), 0);
} finally {
  core.destroy();
}
console.log("MegaCart project build: PASS (bank-qualified map, manifest outputs, packaging, and GearColeco switching)");

async function assemble(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"), outputMode: "binary", optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return { bytes: result.binary || result.bytes, symbols: result.symbols, sourceDebugMap: result.sourceDebugMap };
}

function textFile(filePath, text) {
  return { path: filePath, kind: "asm-source", base64: Buffer.from(text, "utf8").toString("base64") };
}
