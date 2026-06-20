import { ASM } from "../vendor/amyscvsoundstudio/asmCodec.js";

export function parseSoundAsm(asmText) {
  return ASM.assembleMultiWithMap(asmText);
}

export function soundTablesToAsm(tables, options = {}) {
  return ASM.dumpMulti(tables, options);
}

export function parseSoundBytes(byteText) {
  return ASM.parseBytes(byteText);
}

export function hzFromPeriod(period, system = "NTSC") {
  return ASM.hzFromPeriod(period, system);
}

