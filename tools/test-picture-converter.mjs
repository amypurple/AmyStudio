import assert from "node:assert/strict";

import {
  adjustRgbaForPictureImport,
  buildPictureProjectFileEntries,
  colecoBitmapTablesToImageData,
  colorBytesToColecoBitmapTables,
  defaultPictureNameTable,
  grpBytesToColecoBitmapTables,
  icvgmDatTextToColecoBitmapTables,
  icvgmDatTextToColecoTileTables,
  isIcvGmDatText,
  normalizePictureImportCodec,
  patternBytesToColecoBitmapTables,
  pcBytesToColecoBitmapTables,
  powerPaintBytesToColecoBitmapTables,
  sc2BytesToColecoBitmapTables,
  rgbaToColecoBitmapTables
} from "../studio/core/pictureConvert.js";
import {
  buildPictureProjectFileEntriesFromCandidate,
  evaluatePictureCompressionCandidates,
  PICTURE_QUICK_COMPRESSION_CODECS,
  selectPictureCompressionCandidate
} from "../studio/core/pictureCompressionReport.js";
import {
  assetNameFromProjectPath
} from "../studio/core/utils/projectFiles.js";

function setPixel(rgba, x, y, r, g, b, a = 255) {
  const offset = (y * 256 + x) * 4;
  rgba[offset] = r;
  rgba[offset + 1] = g;
  rgba[offset + 2] = b;
  rgba[offset + 3] = a;
}

function fill(rgba, r, g, b) {
  for (let y = 0; y < 192; y += 1) {
    for (let x = 0; x < 256; x += 1) setPixel(rgba, x, y, r, g, b);
  }
}

function drawDominantRun(rgba, y, x0, r, g, b) {
  for (let bit = 0; bit < 6; bit += 1) setPixel(rgba, x0 + bit, y, r, g, b);
}

async function main() {
  const rgba = new Uint8ClampedArray(256 * 192 * 4);
  fill(rgba, 0x00, 0x00, 0x00);

  for (let bit = 0; bit < 8; bit += 1) {
    const green = bit < 6;
    setPixel(rgba, bit, 0, green ? 0x21 : 0x54, green ? 0xC8 : 0x55, green ? 0x42 : 0xED);
  }

  const tables = rgbaToColecoBitmapTables(rgba, 256, 192);
  assert.equal(tables.pattern.length, 6144);
  assert.equal(tables.color.length, 6144);
  assert.equal(tables.name.length, 768);
  assert.equal(tables.pattern[0], 0xFC, "Dominant green pixels should become foreground bits");
  assert.equal(tables.color[0], 0x24, "Color byte should be green foreground on blue background");

  const adjusted = adjustRgbaForPictureImport(Uint8ClampedArray.from([100, 120, 140, 255]), {
    brightness: 10,
    saturation: -100
  });
  assert.equal(adjusted[3], 255);
  assert.equal(adjusted[0], adjusted[1], "Full desaturation should equalize red and green");
  assert.equal(adjusted[1], adjusted[2], "Full desaturation should equalize green and blue");
  assert.ok(adjusted[0] > 100, "Positive brightness should raise the adjusted channel");
  const contrasted = adjustRgbaForPictureImport(Uint8ClampedArray.from([96, 128, 160, 255]), {
    contrast: 50
  });
  assert.ok(contrasted[0] < 96, "Positive contrast should darken values below midpoint");
  assert.ok(contrasted[2] > 160, "Positive contrast should brighten values above midpoint");
  const gammaAdjusted = adjustRgbaForPictureImport(Uint8ClampedArray.from([64, 128, 192, 255]), {
    gamma: 200
  });
  assert.ok(gammaAdjusted[0] > 64, "Gamma above 100 should brighten dark channels like CV Paint import");

  const layoutRgba = new Uint8ClampedArray(256 * 192 * 4);
  fill(layoutRgba, 0x00, 0x00, 0x00);
  drawDominantRun(layoutRgba, 0, 0, 0x21, 0xC8, 0x42);
  drawDominantRun(layoutRgba, 8, 0, 0x54, 0x55, 0xED);
  drawDominantRun(layoutRgba, 64, 0, 0xD4, 0x52, 0x4D);
  const layoutTables = rgbaToColecoBitmapTables(layoutRgba, 256, 192);
  assert.equal(layoutTables.pattern[0], 0xFC, "line 0 should land at table offset 0");
  assert.equal(layoutTables.color[0], 0x21, "line 0 color should land at table offset 0");
  assert.equal(layoutTables.pattern[256], 0xFC, "line 8 should land at table offset 256, not the next 2KB bank");
  assert.equal(layoutTables.color[256], 0x41, "line 8 color should land at table offset 256");
  assert.equal(layoutTables.pattern[2048], 0xFC, "line 64 should start the second 2KB bank");
  assert.equal(layoutTables.color[2048], 0x61, "line 64 color should land at table offset 2048");
  const rendered = colecoBitmapTablesToImageData(layoutTables);
  assert.equal(rendered.width, 256);
  assert.equal(rendered.height, 192);
  assert.equal(rendered.data[3], 255);
  assert.equal(rendered.data[0], 0x21, "Rendered first pixel should use the green foreground palette");

  const orderedTables = rgbaToColecoBitmapTables(layoutRgba, 256, 192, {
    ditherMode: "ordered-4x4",
    ditherAmount: 35
  });
  assert.equal(orderedTables.color[0], 0x21, "Ordered Bayer conversion should still use best row 8x1 color pairs");
  const noDitherTables = rgbaToColecoBitmapTables(layoutRgba, 256, 192, {
    ditherMode: "none"
  });
  assert.equal(noDitherTables.pattern[0], 0xFC, "No-dither diagnostic path should keep deterministic row conversion");

  const name = defaultPictureNameTable();
  assert.equal(name[0], 0);
  assert.equal(name[255], 255);
  assert.equal(name[256], 0);
  assert.equal(name[767], 255);

  const rawEntries = await buildPictureProjectFileEntries("My Title.png", tables, { codec: "raw" });
  assert.deepEqual(rawEntries.map((entry) => entry.path), ["my-title.pattern", "my-title.color"]);
  assert.equal(rawEntries[0].bytes.length, 6144);
  assert.equal(rawEntries[1].bytes.length, 6144);

  const compressedEntries = await buildPictureProjectFileEntries("My Title.png", tables, {
    codec: "zx0",
    compressBytes: async (codec, bytes) => Uint8Array.from([codec.length, bytes[0], bytes.length & 0xFF])
  });
  assert.deepEqual(compressedEntries.map((entry) => entry.path), ["my-title.pattern.zx0", "my-title.color.zx0"]);
  assert.equal(compressedEntries[0].codec, "zx0");
  assert.deepEqual(Array.from(compressedEntries[0].bytes), [3, 0xFC, 0]);

  const bitbusterEntries = await buildPictureProjectFileEntries("My Title.png", tables, {
    codec: "bitbuster",
    compressBytes: async (codec, bytes) => Uint8Array.from([codec === "bitbuster" ? 12 : 0, bytes[0]])
  });
  assert.deepEqual(bitbusterEntries.map((entry) => entry.path), ["my-title.pattern.bitbuster", "my-title.color.bitbuster"]);
  assert.equal(bitbusterEntries[0].codec, "bitbuster");

  const pcBytes = new Uint8Array(12288);
  pcBytes[0] = 0xAA;
  pcBytes[6143] = 0xBB;
  pcBytes[6144] = 0xCC;
  pcBytes[12287] = 0xDD;
  const pcTables = pcBytesToColecoBitmapTables(pcBytes);
  assert.equal(pcTables.pattern[0], 0xAA);
  assert.equal(pcTables.pattern[6143], 0xBB);
  assert.equal(pcTables.color[0], 0xCC);
  assert.equal(pcTables.color[6143], 0xDD);

  const patternOnly = new Uint8Array(6144);
  const colorOnly = new Uint8Array(6144);
  patternOnly[0] = 0x5A;
  colorOnly[0] = 0xE4;
  const pairedTables = patternBytesToColecoBitmapTables(patternOnly, { color: colorOnly });
  assert.equal(pairedTables.pattern[0], 0x5A);
  assert.equal(pairedTables.color[0], 0xE4);
  const colorTables = colorBytesToColecoBitmapTables(colorOnly);
  assert.equal(colorTables.pattern[0], 0x00, "Color-only import should use a blank pattern table");
  assert.equal(colorTables.color[0], 0xE4);

  const grpBytes = new Uint8Array(0x3807 + 2048);
  grpBytes[7] = 0x61;
  grpBytes[0x1807] = 0x09;
  grpBytes[0x1B07] = 0x24;
  grpBytes[0x1B08] = 0x34;
  grpBytes[0x1B09] = 0x04;
  grpBytes[0x1B0A] = 0x0E;
  grpBytes[0x2007] = 0x71;
  grpBytes[0x3807] = 0x81;
  const grpTables = grpBytesToColecoBitmapTables(grpBytes);
  assert.equal(grpTables.pattern[0], 0x61);
  assert.equal(grpTables.name[0], 0x09);
  assert.equal(grpTables.color[0], 0x71);
  assert.equal(grpTables.spriteAttributes.length, 128, "GRP sprite attributes at VRAM $1B00 should be preserved when visible");
  assert.equal(grpTables.spriteAttributes[0], 0x24);
  assert.equal(grpTables.spritePattern.length, 2048, "GRP sprite patterns at VRAM $3800 should be preserved when present");
  assert.equal(grpTables.spritePattern[0], 0x81);

  const sc2Bytes = new Uint8Array(0x4007);
  sc2Bytes[0] = 0xFE;
  sc2Bytes[7] = 0x62;
  sc2Bytes[0x1807] = 0x0A;
  sc2Bytes[0x1B07] = 0x25;
  sc2Bytes[0x1B08] = 0x35;
  sc2Bytes[0x1B09] = 0x08;
  sc2Bytes[0x1B0A] = 0x0F;
  sc2Bytes[0x2007] = 0x72;
  sc2Bytes[0x3807] = 0x82;
  const sc2Tables = sc2BytesToColecoBitmapTables(sc2Bytes);
  assert.equal(sc2Tables.pattern[0], 0x62);
  assert.equal(sc2Tables.name[0], 0x0A);
  assert.equal(sc2Tables.color[0], 0x72);
  assert.equal(sc2Tables.spriteAttributes.length, 128, "SC2 sprite attributes at VRAM $1B00 should be preserved when visible");
  assert.equal(sc2Tables.spriteAttributes[0], 0x25);
  assert.equal(sc2Tables.spritePattern.length, 2048, "SC2 sprite patterns at VRAM $3800 should be preserved when present");
  assert.equal(sc2Tables.spritePattern[0], 0x82);

  const rawSc2Bytes = new Uint8Array(0x3800);
  rawSc2Bytes[0] = 0x63;
  rawSc2Bytes[0x1800] = 0x0B;
  rawSc2Bytes[0x2000] = 0x73;
  const rawSc2Tables = sc2BytesToColecoBitmapTables(rawSc2Bytes);
  assert.equal(rawSc2Tables.pattern[0], 0x63);
  assert.equal(rawSc2Tables.name[0], 0x0B);
  assert.equal(rawSc2Tables.color[0], 0x73);

  const datSection = (label, bytes) => {
    const hex = Array.from(bytes, byte => `$${byte.toString(16).toUpperCase().padStart(2, "0")}`);
    const lines = [];
    for (let index = 0; index < hex.length; index += 16) {
      lines.push(`${index === 0 ? label : "        "} DB ${hex.slice(index, index + 16).join(",")}`);
    }
    return lines.join("\n");
  };
  const icvgmName = new Uint8Array(768);
  icvgmName[0] = 2;
  const icvgmPattern = new Uint8Array(2048);
  icvgmPattern[16] = 0xA5;
  const icvgmMcolor = new Uint8Array(2048);
  icvgmMcolor[16] = 0xB6;
  const icvgmSpatt = new Uint8Array(2048);
  icvgmSpatt[31] = 0xD4;
  const icvgmScolor = new Uint8Array(64);
  icvgmScolor[3] = 0x0E;
  const icvgmSattr = new Uint8Array(128);
  icvgmSattr[7] = 0x55;
  const icvgmV3 = icvgmDatTextToColecoBitmapTables([
    datSection("NAME", icvgmName),
    datSection("PATTERN", icvgmPattern),
    datSection("MCOLOR", icvgmMcolor)
  ].join("\n"));
  assert.equal(isIcvGmDatText([
    datSection("NAME", icvgmName),
    datSection("PATTERN", icvgmPattern),
    datSection("MCOLOR", icvgmMcolor)
  ].join("\n")), true, "Complete ICVGM v3 DAT text should be recognized");
  assert.equal(isIcvGmDatText("not an icvgm dat file\nDATA DB $01,$02,$03"), false, "Ordinary DAT files should not be treated as ICVGM pictures");
  assert.equal(icvgmV3.pattern[0], 0xA5, "ICVGM v3 NAME should remap tile 2 pattern into the picture");
  assert.equal(icvgmV3.color[0], 0xB6, "ICVGM v3 MCOLOR should remap with the selected tile");
  assert.equal(icvgmV3.name[0], 2, "ICVGM NAME table should be preserved for generated picture assets");
  assert.equal(icvgmV3.includeNameTable, true);
  assert.equal(icvgmV3.sourceFormat, "icvgm-v3");
  const icvgmTileV3 = icvgmDatTextToColecoTileTables([
    datSection("NAME", icvgmName),
    datSection("PATTERN", icvgmPattern),
    datSection("MCOLOR", icvgmMcolor),
    datSection("SPATT", icvgmSpatt),
    datSection("SCOLOR", icvgmScolor),
    datSection("SATTR", icvgmSattr)
  ].join("\n"));
  assert.equal(icvgmTileV3.pattern.length, 2048, "ICVGM tile import should preserve the 256-character pattern table");
  assert.equal(icvgmTileV3.color.length, 2048, "ICVGM tile import should preserve the 256-character MCOLOR table");
  assert.equal(icvgmTileV3.name.length, 768, "ICVGM tile import should preserve the 32x24 name table");
  assert.equal(icvgmTileV3.pattern[16], 0xA5);
  assert.equal(icvgmTileV3.color[16], 0xB6);
  assert.equal(icvgmTileV3.name[0], 2);
  assert.equal(icvgmTileV3.spritePattern.length, 2048, "ICVGM SPATT sprite patterns should be preserved");
  assert.equal(icvgmTileV3.spritePattern[31], 0xD4);
  assert.equal(icvgmTileV3.spriteColor.length, 64, "ICVGM SCOLOR sprite color metadata should be preserved");
  assert.equal(icvgmTileV3.spriteColor[3], 0x0E);
  assert.equal(icvgmTileV3.spriteAttributes.length, 128, "ICVGM SATTR sprite attributes should be preserved when present");
  assert.equal(icvgmTileV3.spriteAttributes[7], 0x55);
  assert.equal(icvgmTileV3.sourceFormat, "icvgm-v3-tiles");
  const icvgmColor = new Uint8Array(32);
  icvgmColor[0] = 0xC7;
  const icvgmV2 = icvgmDatTextToColecoBitmapTables([
    datSection("NAME", icvgmName),
    datSection("PATTERN", icvgmPattern),
    datSection("COLOR", icvgmColor)
  ].join("\n"));
  assert.equal(icvgmV2.color[0], 0xC7, "ICVGM v2 COLOR should expand one byte per 8-tile group to row colors");
  assert.equal(icvgmV2.sourceFormat, "icvgm-v2");
  const icvgmTileV2 = icvgmDatTextToColecoTileTables([
    datSection("NAME", icvgmName),
    datSection("PATTERN", icvgmPattern),
    datSection("COLOR", icvgmColor)
  ].join("\n"));
  assert.equal(icvgmTileV2.pattern.length, 2048);
  assert.equal(icvgmTileV2.color.length, 2048);
  assert.equal(icvgmTileV2.color[16], 0xC7, "ICVGM v2 COLOR should expand in preserved tile-table form too");
  assert.equal(icvgmTileV2.sourceFormat, "icvgm-v2-tiles");

  const pp10 = new Uint8Array(10240);
  pp10[16] = 0x11;
  pp10[5120 + 16] = 0x21;
  pp10[256 + 16] = 0x12;
  pp10[5120 + 256 + 16] = 0x22;
  const pp10Tables = powerPaintBytesToColecoBitmapTables(pp10);
  assert.equal(pp10Tables.pattern[0], 0x11, "PowerPaint 10K should skip the left sidebar bytes");
  assert.equal(pp10Tables.color[0], 0x21);
  assert.equal(pp10Tables.pattern[256], 0x12, "PowerPaint 10K second tile row should map to table offset 256");
  assert.equal(pp10Tables.color[256], 0x22);
  assert.equal(pp10Tables.pattern[20 * 256], 0x00, "PowerPaint 10K should leave unavailable bottom rows blank");

  const pp40 = new Uint8Array(40960);
  function setPowerPaintCell(cell, dataOffset, patternByte, colorByte) {
    const base = cell * 10240;
    pp40[base + dataOffset] = colorByte;
    pp40[base + 5120 + dataOffset] = patternByte;
  }
  setPowerPaintCell(0, 16, 0x31, 0x41);
  setPowerPaintCell(1, 16, 0x32, 0x42);
  setPowerPaintCell(2, 16, 0x33, 0x43);
  setPowerPaintCell(3, 16, 0x34, 0x44);
  const pp40Tables = powerPaintBytesToColecoBitmapTables(pp40);
  assert.equal(pp40Tables.pattern[0], 0x31, "PowerPaint 40K cell 0 should cover main 30x20 area");
  assert.equal(pp40Tables.color[0], 0x41);
  assert.equal(pp40Tables.pattern[240], 0x32, "PowerPaint 40K cell 1 should cover the right two columns");
  assert.equal(pp40Tables.color[240], 0x42);
  assert.equal(pp40Tables.pattern[20 * 256], 0x33, "PowerPaint 40K cell 2 should cover bottom rows");
  assert.equal(pp40Tables.color[20 * 256], 0x43);
  assert.equal(pp40Tables.pattern[20 * 256 + 240], 0x34, "PowerPaint 40K cell 3 should cover bottom-right corner");
  assert.equal(pp40Tables.color[20 * 256 + 240], 0x44);

  assert.equal(normalizePictureImportCodec("raw"), "raw");
  assert.equal(normalizePictureImportCodec("rle"), "mdkrle");
  assert.equal(normalizePictureImportCodec("uncompressed"), "raw");

  const rleEntries = await buildPictureProjectFileEntries("Title.pc", pcTables, {
    codec: "rle",
    compressBytes: async (codec, bytes) => Uint8Array.from([codec === "mdkrle" ? 1 : 0, bytes[0]])
  });
  assert.deepEqual(rleEntries.map((entry) => entry.path), ["title.pattern.rle", "title.color.rle"]);
  assert.equal(rleEntries[0].codec, "mdkrle");
  assert.deepEqual(Array.from(rleEntries[0].bytes), [1, 0xAA]);

  const reportTables = {
    pattern: new Uint8Array(6144),
    color: new Uint8Array(6144),
    name: defaultPictureNameTable()
  };
  const compressionSizes = {
    mdkrle: 100,
    zx0: 20,
    bitbuster: 90
  };
  const candidates = await evaluatePictureCompressionCandidates(reportTables, {
    codecs: ["raw", "mdkrle", "zx0", "bitbuster"],
    compressBytes: async (codec) => new Uint8Array(compressionSizes[codec]),
    decompressBytes: async () => new Uint8Array(6144)
  });
  const rleCandidate = candidates.find((candidate) => candidate.codec === "mdkrle");
  const zx0Candidate = candidates.find((candidate) => candidate.codec === "zx0");
  assert.equal(rleCandidate.dataBytes, 200);
  assert.equal(rleCandidate.totalFirstUseBytes, 246);
  assert.equal(zx0Candidate.dataBytes, 40);
  assert.equal(zx0Candidate.totalFirstUseBytes, 173);
  assert.equal(selectPictureCompressionCandidate(candidates, "smallest-data").codec, "zx0");
  assert.equal(selectPictureCompressionCandidate(candidates, "smallest-total").codec, "zx0");
  assert.equal(candidates.find((candidate) => candidate.codec === "bitbuster").extension, "bitbuster");

  const tinyTotalCandidates = await evaluatePictureCompressionCandidates(reportTables, {
    codecs: ["mdkrle", "zx0"],
    compressBytes: async (codec) => new Uint8Array(codec === "mdkrle" ? 50 : 10),
    decompressBytes: async () => new Uint8Array(6144)
  });
  assert.equal(selectPictureCompressionCandidate(tinyTotalCandidates, "smallest-data").codec, "zx0");
  assert.equal(selectPictureCompressionCandidate(tinyTotalCandidates, "smallest-total").codec, "mdkrle");
  assert.deepEqual(PICTURE_QUICK_COMPRESSION_CODECS, ["raw", "mdkrle", "nibble", "bitbuster", "zx7", "dan1"]);
  assert.equal(PICTURE_QUICK_COMPRESSION_CODECS.filter((codec) => codec !== "raw").length, 5);
  const builtEntries = buildPictureProjectFileEntriesFromCandidate("Gallery Test.png", zx0Candidate, {
    source: "test"
  });
  assert.deepEqual(builtEntries.map((entry) => entry.path), ["gallery-test.pattern.zx0", "gallery-test.color.zx0"]);
  assert.equal(builtEntries[0].codec, "zx0");
  const customName = defaultPictureNameTable();
  customName[0] = 7;
  const namedEntries = buildPictureProjectFileEntriesFromCandidate("Named Picture.sc2", zx0Candidate, {
    source: "test",
    includeNameTable: true,
    nameTable: customName
  });
  assert.deepEqual(namedEntries.map((entry) => entry.path), ["named-picture.pattern.zx0", "named-picture.color.zx0", "named-picture.name"]);
  assert.equal(namedEntries[2].codec, "raw");
  assert.equal(namedEntries[2].bytes[0], 7);
  assert.equal(assetNameFromProjectPath("@project/mosaic3.pattern"), "Mosaic3Pattern");
  assert.equal(assetNameFromProjectPath("@project/mosaic3.color"), "Mosaic3Color");
  assert.equal(assetNameFromProjectPath("@project/mosaic3.name"), "Mosaic3Name");
  assert.equal(assetNameFromProjectPath("@project/mosaic3.pattern.zx0"), "Mosaic3Pattern");
  assert.equal(assetNameFromProjectPath("@project/mosaic3.sprpat"), "Mosaic3Sprpat");
  assert.equal(assetNameFromProjectPath("@project/mosaic3.sprcolor"), "Mosaic3Sprcolor");
  assert.equal(assetNameFromProjectPath("@project/voice-stub.dsound"), "VoiceStub");

  console.log(JSON.stringify({
    patternByte0: tables.pattern[0],
    colorByte0: tables.color[0],
    rawFiles: rawEntries.map((entry) => entry.path),
    compressedFiles: compressedEntries.map((entry) => entry.path),
    ok: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
