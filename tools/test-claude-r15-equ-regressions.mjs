#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const sources = {
  pc: `cartridge "EQU PC/AMY/2026"
u16 W = 0
u16 Len = 0
asm {
  jp SkipT
Tbl:
  db 1,2,3,4
TblLen equ $ - Tbl
Here equ $
SkipT:
}
sub Go:
  asm {
    ld hl,Here
    ld (W),hl
    ld hl,TblLen
    ld (Len),hl
  }
end sub
Go
spin:
goto spin
asm {
  db 1,2,3,4,5,6,7,8
}
`,
  literals: `cartridge "EQU LITERALS/AMY/2026"
u16 W1 = 0
u16 W2 = 0
u16 W3 = 0
u8 B1 = 0
asm {
E1 equ Later + $FF
E2 equ Later + 10h
E3 equ Later + 0x1F
E4 equ 'A' + 1
Lit equ $1234 + $FF
}
sub Go:
  asm {
    ld hl,E1
    ld (W1),hl
    ld hl,E2
    ld (W2),hl
    ld hl,E3
    ld (W3),hl
    ld a,E4
    ld (B1),a
  }
end sub
Go
spin:
goto spin
asm {
Later:
  db 1,2,3,4
}
`,
  duplicate: `cartridge "EQU DUP/AMY/2026"
u16 W = 1
asm {
Dup equ $C8AD
}
sub Go:
  asm {
    ld hl,Dup
    ld (W),hl
  }
end sub
Go
spin:
goto spin
asm {
Dup equ $0000
}
`
};

function compile(source, outputs, profile, timeout = 15_000) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--opt", profile,
      "--asm", outputs.asm, "--symbols", outputs.symbols, "--rom", outputs.rom],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    const timer = setTimeout(() => child.kill(), timeout);
    child.on("error", rejectRun);
    child.on("exit", code => {
      clearTimeout(timer);
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${basename(source)} ${profile}: exit ${code}\n${output}`));
    });
  });
}

function symbols(text) {
  return Object.fromEntries(String(text).split(/\r?\n/)
    .map(line => line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s+equ\s+\$([0-9A-Fa-f]+)/))
    .filter(Boolean)
    .map(match => [match[1], Number.parseInt(match[2], 16)]));
}

const output = await mkdtemp(join(tmpdir(), "amy-r15-equ-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const [name, source] of Object.entries(sources)) {
    await writeFile(join(output, `${name}.alexis`), source);
  }
  for (const profile of profiles) {
    for (const name of Object.keys(sources)) {
      const stem = join(output, `${profile}-${name}`);
      const outputs = { asm: `${stem}.asm`, symbols: `${stem}.sym`, rom: `${stem}.rom` };
      await compile(join(output, `${name}.alexis`), outputs, profile);
      const [symbolText, rom] = await Promise.all([readFile(outputs.symbols, "utf8"), readFile(outputs.rom)]);
      const address = symbols(symbolText);
      const core = await GearcolecoTestCore.create({ seed: 0xE015 });
      try {
        core.loadBios(bios);
        const runtimeRom = Buffer.from(rom);
        runtimeRom[0] = 0x55;
        runtimeRom[1] = 0xaa;
        core.loadRom(runtimeRom, { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 90; frame += 1) core.runFrame();
        const byte = symbol => core.readRam(address[symbol], 1)[0];
        const word = symbol => {
          const value = core.readRam(address[symbol], 2);
          return value[0] | (value[1] << 8);
        };
        if (name === "pc") {
          assert.equal(address.TblLen, 4, `${profile}: $ uses the EQU-line PC`);
          assert.equal(address.Here, address.Tbl + 4, `${profile}: Here is the EQU-line PC`);
          assert.deepEqual([word("AMY_UVAR_W"), word("AMY_UVAR_Len")], [address.Here, 4]);
        } else if (name === "literals") {
          assert.deepEqual(
            [word("AMY_UVAR_W1"), word("AMY_UVAR_W2"), word("AMY_UVAR_W3"), byte("AMY_UVAR_B1")],
            [address.Later + 0xff, address.Later + 0x10, address.Later + 0x1f, 0x42],
            `${profile}: numeric literals are not EQU dependencies`
          );
          assert.equal(address.Lit, 0x1333, `${profile}: composite literal EQU`);
        } else {
          assert.equal(address.Dup, 0, `${profile}: last duplicate EQU wins`);
          assert.equal(word("AMY_UVAR_W"), 0, `${profile}: duplicate EQU runtime value`);
        }
      } finally {
        core.destroy();
      }
    }
  }

  const manyEqus = Array.from({ length: 659 }, (_, index) => `E${index} equ ${index}`).join("\n");
  const stress = `cartridge "EQU SCALE/AMY/2026"\nu16 W = 1\nasm {\nDup equ $C8AD\n${manyEqus}\n}\nasm {\nDup equ $0000\n}\nspin:\ngoto spin\n`;
  const stressSource = join(output, "stress.alexis");
  await writeFile(stressSource, stress);
  const started = Date.now();
  await compile(stressSource, {
    asm: join(output, "stress.asm"), symbols: join(output, "stress.sym"), rom: join(output, "stress.rom")
  }, "balanced");
  assert.ok(Date.now() - started < 15_000, "large duplicate-EQU input remains bounded");

  console.log("Claude r15 EQU regressions PASS (5 profiles, real OS7, bounded 660-EQU build)");
} finally {
  await rm(output, { recursive: true, force: true });
}
