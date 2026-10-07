import { cachedBuildStep, fingerprintBuildInputs } from "./incrementalBuildCache.js";

const BLOCK_SIZE = 1024;
const DISK_BLOCK_COUNT = 160;
const DATA_PACK_BLOCK_COUNT = 256;
const PROGRAM_START = 3;
const PROGRAM_BLOCKS = 32;
const PACK_START = 35;
const INTERLEAVE = [0, 5, 2, 7, 4, 1, 6, 3];

export async function buildAdamExpansionDisk(options) {
  return buildAdamExpansionMedia({ ...options, mediaType: "disk" });
}

export async function buildAdamExpansionDataPack(options) {
  return buildAdamExpansionMedia({ ...options, mediaType: "data-pack" });
}

export function buildAdamBootDisk(options) {
  return buildAdamBootMedia({ ...options, mediaType: "disk" });
}

export function buildAdamBootDataPack(options) {
  return buildAdamBootMedia({ ...options, mediaType: "data-pack" });
}

export async function buildAdamNativeProgramDisk(options) {
  return buildAdamNativeProgramMedia({ ...options, mediaType: "disk" });
}

export async function buildAdamNativeProgramDataPack(options) {
  return buildAdamNativeProgramMedia({ ...options, mediaType: "data-pack" });
}

export async function buildAdamNativeProgramMedia({ program, assemble, volume = "AMY NATIVE", mediaType = "disk", incrementalCache = null, buildSignature = "" }) {
  if (typeof assemble !== "function") throw new Error("Native program media requires an assembler callback.");
  const bytes = asBytes(program);
  const blocks = Math.ceil(bytes.length / BLOCK_SIZE);
  if (!blocks) throw new Error("Native EOS program is empty.");
  if (blocks > 6) throw new Error(`Native EOS program exceeds the $C800-$DFFF load window: ${bytes.length} bytes.`);
  const device = mediaType === "data-pack" ? 8 : mediaType === "disk" ? 4 : 0;
  if (!device) throw new Error(`Unsupported ADAM media type '${mediaType}'.`);

  const rebuiltOutputs = [];
  const reusedOutputs = [];
  const loaderSource = renderNativeProgramLoader(device, blocks);
  const loaderStep = await cachedBuildStep(
    incrementalCache,
    `native:${mediaType}:loader`,
    fingerprintBuildInputs(buildSignature, loaderSource),
    async () => asBytes(await assemble(loaderSource, "native-loader.asm"))
  );
  const loader = asBytes(loaderStep.value);
  (loaderStep.reused ? reusedOutputs : rebuiltOutputs).push("LOADER");
  const loaderBytes = [...loader].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
  const bootSource = renderNativeProgramBoot(loaderBytes);
  const bootStep = await cachedBuildStep(
    incrementalCache,
    `native:${mediaType}:boot`,
    fingerprintBuildInputs(buildSignature, bootSource),
    async () => asBytes(await assemble(bootSource, "boot.asm"))
  );
  const boot = asBytes(bootStep.value);
  (bootStep.reused ? reusedOutputs : rebuiltOutputs).push("BOOT");
  const built = buildAdamBootMedia({
    boot,
    files: [{ name: "PROGRAM", bytes }],
    volume,
    mediaType
  });
  return {
    ...built,
    programBytes: bytes.length,
    programBlocks: blocks,
    loaderBytes: loader.length,
    incremental: { rebuiltOutputs, reusedOutputs }
  };
}

export function buildAdamBootMedia({ boot, files = [], volume = "AMY EOS", mediaType = "disk" }) {
  const dataPack = mediaType === "data-pack";
  if (!dataPack && mediaType !== "disk") throw new Error(`Unsupported ADAM media type '${mediaType}'.`);
  const blockCount = dataPack ? DATA_PACK_BLOCK_COUNT : DISK_BLOCK_COUNT;
  const bootBytes = asBytes(boot);
  if (bootBytes.length > BLOCK_SIZE) throw new Error(`BOOT exceeds one block: ${bootBytes.length} bytes.`);

  let nextBlock = 3;
  const mediaFiles = files.map((file) => {
    const bytes = asBytes(file.bytes);
    const blocks = Math.ceil(bytes.length / BLOCK_SIZE);
    const entry = { name: String(file.name || "FILE"), bytes, blocks, start: nextBlock };
    nextBlock += blocks;
    return entry;
  });
  if (nextBlock > blockCount) throw new Error(`Files exceed the ADAM ${dataPack ? "data-pack" : "disk"} capacity.`);

  const fill = dataPack ? 0xe5 : 0xff;
  const logical = Array.from({ length: blockCount }, () => new Uint8Array(BLOCK_SIZE).fill(fill));
  logical[0].set(bootBytes);
  logical[2].set(bootBytes);
  writeGenericDirectory(logical[1], volume, mediaFiles, nextBlock, blockCount);
  for (const file of mediaFiles) copyToBlocks(file.bytes, logical, file.start, file.blocks);

  return {
    media: serializeAdamBlocks(logical, { dataPack, fill }),
    mediaType,
    extension: dataPack ? ".ddp" : ".dsk",
    bootBytes: bootBytes.length,
    files: mediaFiles.map(({ name, bytes, blocks, start }) => ({ name, bytes: bytes.length, blocks, start }))
  };
}

async function buildAdamExpansionMedia({ rom, famous, capitals, history, milestones, packs, bootSource, loaderSource, assemble, mediaType, incrementalCache = null, buildSignature = "" }) {
  const dataPack = mediaType === "data-pack";
  const blockCount = dataPack ? DATA_PACK_BLOCK_COUNT : DISK_BLOCK_COUNT;
  const mediaDevice = dataPack ? 8 : 4;
  const game = asBytes(rom);
  const inputs = packs || [
    ["FAMOUS", famous], ["CAPITALS", capitals], ["LANDMARKS", history], ["MILESTONES", milestones]
  ].filter(([, value]) => value != null);
  let nextPackBlock = PACK_START;
  const diskPacks = inputs.map(([name, value]) => {
    const bytes = asBytes(value);
    const blocks = Math.ceil(bytes.length / BLOCK_SIZE);
    const item = { name, bytes, blocks, start: nextPackBlock };
    nextPackBlock += blocks;
    return item;
  });
  if (game.length > PROGRAM_BLOCKS * BLOCK_SIZE) throw new Error(`GAME exceeds 32 KB: ${game.length} bytes.`);
  if (diskPacks.length > 4) throw new Error("An ADAM game disk supports at most four WEPK files.");
  if (nextPackBlock > blockCount) throw new Error(`WEPK files exceed the ADAM ${dataPack ? "data-pack" : "disk"} capacity.`);
  const programUsedBlocks = PROGRAM_BLOCKS;
  const rebuiltOutputs = [];
  const reusedOutputs = [];
  const renderedLoaderSource = loaderSource
      .replaceAll("{{ADAM_DEVICE}}", String(mediaDevice))
      .replace("{{PROGRAM_BLOCKS}}", String(programUsedBlocks))
      .replace("{{PAD_PROGRAM_WINDOW}}", programPaddingAssembly(programUsedBlocks));
  const loaderStep = await cachedBuildStep(
    incrementalCache,
    `hybrid:${mediaType}:loader`,
    fingerprintBuildInputs(buildSignature, renderedLoaderSource),
    async () => asBytes(await assemble(renderedLoaderSource, "expansion-loader.asm"))
  );
  const loader = asBytes(loaderStep.value);
  (loaderStep.reused ? reusedOutputs : rebuiltOutputs).push("LOADER");
  const loaderBytes = [...loader].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",");
  const token = "{{LOADER_BYTES}}";
  if (!bootSource.includes(token)) throw new Error(`boot.asm is missing ${token}.`);
  const renderedBootSource = bootSource.replace(token, loaderBytes);
  const bootStep = await cachedBuildStep(
    incrementalCache,
    `hybrid:${mediaType}:boot`,
    fingerprintBuildInputs(buildSignature, renderedBootSource),
    async () => asBytes(await assemble(renderedBootSource, "boot.asm"))
  );
  const boot = asBytes(bootStep.value);
  (bootStep.reused ? reusedOutputs : rebuiltOutputs).push("BOOT");
  if (boot.length > BLOCK_SIZE) throw new Error(`BOOT exceeds one block: ${boot.length} bytes.`);

  const fill = dataPack ? 0xe5 : 0xff;
  const logical = Array.from({ length: blockCount }, () => new Uint8Array(BLOCK_SIZE).fill(fill));
  logical[0].set(boot); logical[2].set(boot);
  writeDirectory(logical[1], diskPacks, nextPackBlock, blockCount);
  copyToBlocks(game, logical, PROGRAM_START, PROGRAM_BLOCKS);
  for (const pack of diskPacks) copyToBlocks(pack.bytes, logical, pack.start, pack.blocks);
  const media = serializeAdamBlocks(logical, { dataPack, fill });
  return {
    disk: media,
    media,
    mediaType,
    extension: dataPack ? ".ddp" : ".dsk",
    bootBytes: boot.length,
    loaderBytes: loader.length,
    packs: diskPacks.map(({ name, bytes }) => ({ name, bytes: bytes.length })),
    incremental: { rebuiltOutputs, reusedOutputs }
  };
}

function asBytes(value) { return value instanceof Uint8Array ? value : new Uint8Array(value || []); }
function renderNativeProgramLoader(device, blocks) {
  return `org $2000
    di
    ld sp,$2FF0
    ld de,3
    ld bc,0
    ld hl,$C800
    ld ix,${blocks}
ReadNextBlock:
    ld a,${device}
ReadBlockRetry:
    call $FCF3
    jr nz,ReadBlockRetry
    inc de
    push de
    ld de,$0400
    add hl,de
    pop de
    dec ix
    ld a,ixh
    or ixl
    jr nz,ReadNextBlock
    jp $C800
`;
}
function renderNativeProgramBoot(loaderBytes) {
  return `org $C800
    di
    ld sp,$2FF0
    ld hl,LoaderImage
    ld de,$2000
    ld bc,LoaderEnd-LoaderImage
    ldir
    jp $2000
LoaderImage:
    db ${loaderBytes}
LoaderEnd:
`;
}
function programPaddingAssembly(usedBlocks) {
  const bytes = (PROGRAM_BLOCKS - usedBlocks) * BLOCK_SIZE;
  if (!bytes) return "";
  const start = 0x8000 + usedBlocks * BLOCK_SIZE;
  return `    ld hl,$${start.toString(16)}\n    ld de,$${(start + 1).toString(16)}\n    ld bc,$${(bytes - 1).toString(16)}\n    ld (hl),$FF\n    ldir`;
}
function copyToBlocks(source, blocks, start, count) {
  for (let block = 0; block < count; block++) {
    const from = block * BLOCK_SIZE;
    if (from >= source.length) break;
    blocks[start + block].set(source.subarray(from, from + BLOCK_SIZE));
  }
}
function serializeAdamBlocks(logical, { dataPack, fill }) {
  const media = new Uint8Array(logical.length * BLOCK_SIZE).fill(fill);
  if (dataPack) {
    for (let block = 0; block < logical.length; block++) media.set(logical[block], block * BLOCK_SIZE);
    return media;
  }
  for (let block = 0; block < logical.length; block++) {
    for (let half = 0; half < 2; half++) {
      const sector = block * 2 + half;
      const physical = (sector & ~7) | INTERLEAVE[sector & 7];
      media.set(logical[block].subarray(half * 512, half * 512 + 512), physical * 512);
    }
  }
  return media;
}
function writeGenericDirectory(directory, volume, files, firstFreeBlock, blockCount) {
  writeNativeEosEntry(directory, 0, volume, 0x81, 0xaa55, blockCount, 0, 0, { reserved: [0x00, 0xff] });
  writeNativeEosEntry(directory, 1, "BOOT", 0x90, 0, 1, 1, BLOCK_SIZE);
  writeNativeEosEntry(directory, 2, "DIRECTORY", 0xd8, 1, 1, 1, BLOCK_SIZE);
  writeNativeEosEntry(directory, 3, "BOOT-EOS", 0x10, 2, 1, 1, BLOCK_SIZE, { regularFile: true });
  let entry = 4;
  for (const file of files) {
    writeNativeEosEntry(directory, entry++, file.name, 0x10, file.start, file.blocks, file.blocks,
      file.bytes.length % BLOCK_SIZE || BLOCK_SIZE, { regularFile: true });
  }
  writeNativeEosEntry(directory, entry++, "BLOCKS LEFT", 0x01, firstFreeBlock,
    blockCount - firstFreeBlock, 0, BLOCK_SIZE);
  directory[entry * 26] = 0xff;
}

function writeNativeEosEntry(directory, index, name, attribute, start, allocated, used, lastCount, options = {}) {
  const at = index * 26;
  directory.fill(0, at, at + 26);
  directory.fill(0x20, at, at + 12);
  const encodedName = [...String(name).toUpperCase()].map((char) => char === "." ? 2 : char.charCodeAt(0));
  if (options.regularFile && !String(name).includes(".")) encodedName.push(2);
  const nameLength = Math.min(encodedName.length, 11);
  for (let i = 0; i < nameLength; i++) directory[at + i] = encodedName[i];
  directory[at + nameLength] = 3;
  directory[at + 12] = attribute;
  write16(directory, at + 13, start);
  const reserved = options.reserved || [0, 0];
  directory[at + 15] = reserved[0];
  directory[at + 16] = reserved[1];
  write16(directory, at + 17, allocated);
  write16(directory, at + 19, used);
  write16(directory, at + 21, used ? lastCount : 0);
  if (options.regularFile) {
    directory[at + 23] = 0x57;
    directory[at + 24] = 0x10;
    directory[at + 25] = 0x13;
  }
}
function writeDirectory(directory, packs, firstFreeBlock, blockCount) {
  writeEntry(directory, 0, "WHERE EARTH", 0x81, 0xAA55, blockCount, 0, 0);
  writeEntry(directory, 1, "BOOT", 0x88, 0, 1, 1, BLOCK_SIZE);
  writeEntry(directory, 2, "DIRECTORY", 0xC8, 1, 1, 1, BLOCK_SIZE);
  writeEntry(directory, 3, "BOOT-WOE", 0x10, 2, 1, 1, BLOCK_SIZE);
  writeEntry(directory, 4, "GAME", 0x10, PROGRAM_START, PROGRAM_BLOCKS, PROGRAM_BLOCKS, BLOCK_SIZE);
  let entry = 5;
  for (const pack of packs) {
    writeEntry(directory, entry++, pack.name, 0x10, pack.start, pack.blocks, pack.blocks,
      pack.bytes.length % BLOCK_SIZE || BLOCK_SIZE);
  }
  writeEntry(directory, entry++, "BLOCKS LEFT", 0x01, firstFreeBlock,
    blockCount - firstFreeBlock, 0, BLOCK_SIZE);
  directory[entry * 26] = 0xff;
}
function writeEntry(directory, index, name, attribute, start, allocated, used, lastCount) {
  const at = index * 26;
  directory.fill(0x20, at, at + 12);
  for (let i = 0; i < Math.min(name.length, 11); i++) directory[at + i] = name.charCodeAt(i);
  directory[at + Math.min(name.length, 11)] = 3;
  directory[at + 12] = attribute;
  write16(directory, at + 13, start); write16(directory, at + 17, allocated);
  write16(directory, at + 19, used); write16(directory, at + 21, lastCount);
  directory[at + 23] = 1; directory[at + 24] = 1; directory[at + 25] = 0x26;
}
function write16(bytes, at, value) { bytes[at] = value & 255; bytes[at + 1] = (value >> 8) & 255; }
