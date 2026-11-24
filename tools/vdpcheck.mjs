// vdpcheck.mjs: TMS9928A VRAM access-timing checker for the GearColeco test core.
//
// The core does not model VRAM access timing (every write lands). This module
// sees every VDP port access the game makes, with its CPU cycle, and replays
// them through openMSX's TMS99x8 model ("too_fast_vram_access real"):
//
//  - a VRAM access (data port read or write, or the read-ahead of a read
//    address set-up) is granted at the first access slot at least 28 VDP
//    ticks (4.67 Z80 T) after the port access, in the slot table of the
//    current mode: MSX1 Graphic 1/2, Multicolour (G3), Text, or "screen off"
//    (display blanked, or outside the display area: vertical border/blank);
//  - the TMS has ONE request buffer: an access that comes while the previous
//    one is still waiting for its slot overwrites it. The older byte is lost
//    and the VRAM pointer advances only once, so everything after it in a
//    burst lands one address early;
//  - the pending access is done at its slot with the VRAM pointer as it is
//    THEN: an address/register write that comes before the slot moves it
//    (MSX1: the first control byte replaces the pointer's low byte at once,
//    a register write replaces its high bits).
// Tables: openMSX src/video/VDPAccessSlots.cc (1368 ticks per line, 6 ticks
// per Z80 T). Beam position: the frame flag F is set at tick 202 of display
// line 192 (openMSX); in the core F is set at cycle 220 of its line 192 and
// run_frame returns at the end of that line, so F = frame-end - 8 cycles.
//
// How the accesses are seen: execute breakpoints on every instruction in
// BIOS + ROM (all MegaCart banks) that can reach a VDP port (OUT/IN (n) with
// n in $A0-$BF, OUT/IN (C), OUTI/OTIR/OUTD/OTDR/INI/INIR/IND/INDR). The core
// stops BEFORE the instruction; we record it, then resume (OTIR stops once
// per byte). A shadow VRAM built from the recorded writes is compared with
// the core's VRAM every frame: shadowMismatch > 0 would mean accesses were
// missed (code run from RAM, say).
//
//   import { attachVdpCheck } from "./vdpcheck.mjs";
//   const chk = attachVdpCheck(g, { rom, bios, sym, megacart });
//   ... g.run(...) as usual ...
//   chk.report()  -> JSON-able summary
import { readFileSync } from "node:fs";

const TICKS = 1368, LINES = 262, FRAME = 228 * LINES;    // Z80 cycles per frame
const CPU_28 = 28;
// openMSX tables (V99x8 ticks), MSX1 parts
const slotsMsx1ScreenOff = [4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140, 148, 156, 164, 172, 180, 188, 196, 204, 220, 236, 252, 268, 284, 300, 316, 332, 348, 364, 380, 396, 412, 428, 444, 460, 476, 492, 508, 524, 540, 556, 572, 588, 604, 620, 636, 652, 668, 684, 700, 716, 732, 748, 764, 780, 796, 812, 828, 844, 860, 876, 892, 908, 924, 940, 956, 972, 988, 1004, 1020, 1036, 1052, 1068, 1084, 1100, 1116, 1132, 1148, 1164, 1180, 1196, 1212, 1228, 1236, 1244, 1252, 1260, 1268, 1276, 1284, 1292, 1300, 1308, 1316, 1324, 1332, 1340, 1348, 1356, 1364];
const slotsMsx1Gfx12 = [4, 12, 20, 28, 116, 124, 132, 140, 220, 348, 476, 604, 732, 860, 988, 1116, 1236, 1244, 1364];
const slotsMsx1Gfx3 = [4, 12, 20, 28, 116, 124, 132, 140, 220, 228, 260, 292, 324, 348, 356, 388, 420, 452, 476, 484, 516, 548, 580, 604, 612, 644, 676, 708, 732, 740, 772, 804, 836, 860, 868, 900, 932, 964, 988, 996, 1028, 1060, 1092, 1116, 1124, 1156, 1188, 1220, 1236, 1244, 1364];
const slotsMsx1Text = [4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140, 148, 156, 164, 172, 180, 188, 196, 204, 212, 220, 228, 244, 268, 292, 316, 340, 364, 388, 412, 436, 460, 484, 508, 532, 556, 580, 604, 628, 652, 676, 700, 724, 748, 772, 796, 820, 844, 868, 892, 916, 940, 964, 988, 1012, 1036, 1060, 1084, 1108, 1132, 1156, 1180, 1196, 1204, 1212, 1220, 1228, 1236, 1244, 1252, 1260, 1268, 1276, 1284, 1292, 1300, 1308, 1316, 1324, 1332, 1340, 1348, 1356, 1364];
// wait[t]: ticks from line tick t to the first slot >= t + 28
function waitTable(slots) {
  const ext = [...slots, ...slots.map(s => s + TICKS), ...slots.map(s => s + 2 * TICKS)];
  const w = new Int16Array(TICKS);
  for (let t = 0; t < TICKS; t++) { const s = ext.find(s => s - t >= CPU_28); w[t] = s - t; }
  return w;
}
const W = { off: waitTable(slotsMsx1ScreenOff), g12: waitTable(slotsMsx1Gfx12), g3: waitTable(slotsMsx1Gfx3), text: waitTable(slotsMsx1Text) };

// T-state of the port access inside the instruction, as openMSX counts it
// (Z80.hh CC_OUT_N_A_2, CC_IN_A_N_2, CC_OUT_C_R_1, CC_IN_R_C_1, CC_OUTI_2,
// CC_INI_1). The ColecoVision Z80 has one wait state per M1 cycle, like an
// MSX (both GearColeco and openMSX model it): OUT (n),A = 12 T, OUTI = 18 T,
// OTIR = 23 T per byte.
const OFS = { outn: 9, inn: 9, outc: 11, inc: 11, outi: 15, ini: 12 };

export function scanCandidates(buf, base, set) {
  for (let i = 0; i < buf.length - 1; i++) {
    const a = buf[i], b = buf[i + 1];
    if ((a === 0xD3 || a === 0xDB) && (b & 0xE0) === 0xA0) set.add((base + i) & 0xFFFF);
    else if (a === 0xED && ((b & 0xC6) === 0x40 || (b & 0xE4) === 0xA0 && (b & 3) >= 2)) set.add((base + i) & 0xFFFF);
  }
}

function loadSym(path) {
  if (!path) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][\w.]*):?\s+(?:equ|EQU)\s+\$([0-9A-Fa-f]{1,4})/);
    if (m && !/^AMY_U(VAR|CONST)_|^AMY_SOURCE_LINE_|_SIZE$|^VRAM_|^VDP_/.test(m[1])) out.push([parseInt(m[2], 16), m[1]]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

export function attachVdpCheck(g, { rom, bios, sym = null, symBanks = null, megacart = null, extraSym = [], fOfs = 0 } = {}) {
  const c = g.core, M = c.module;
  const romBuf = typeof rom === "string" ? readFileSync(rom) : rom;
  const biosBuf = typeof bios === "string" ? readFileSync(bios) : bios;
  const isMC = megacart ?? (romBuf.length > 32768);
  const cand = new Set();
  scanCandidates(biosBuf, 0, cand);
  if (isMC) {
    const nb = romBuf.length >> 14;
    scanCandidates(romBuf.subarray((nb - 1) << 14), 0x8000, cand);
    for (let b = 0; b < nb; b++) scanCandidates(romBuf.subarray(b << 14, (b + 1) << 14), 0xC000, cand);
  } else scanCandidates(romBuf, 0x8000, cand);
  for (const a of cand) c.setExecuteBreakpoint(a);

  const syms = [...loadSym(sym), ...extraSym].sort((a, b) => a[0] - b[0]);
  const label = (pc) => {
    let lo = 0, hi = syms.length - 1, best = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (syms[m][0] <= pc) { best = m; lo = m + 1; } else hi = m - 1; }
    if (pc < 0x2000) return "BIOS$" + pc.toString(16).toUpperCase().padStart(4, "0");
    const bk = isMC && pc >= 0xC000 ? `[b${c.getRomBank()}]` : "";
    return (best >= 0 ? `${syms[best][1]}+${pc - syms[best][0]}` : "$" + pc.toString(16)) + bk;
  };

  // ---- VDP model state ----
  const regs = new Uint8Array(8);
  regs.set(c.getVdpRegisters());
  const emuV = () => c.readVram(0, 0x4000);
  const shadow = new Uint8Array(emuV());      // ideal (every write lands): self-check
  const sim = new Uint8Array(shadow);          // openMSX "real"
  let latch = 0, latchStored = false, ptrIdeal = 0, ptrSim = 0;
  let pending = null;   // { at: abs tick, isRead, data, pc, addrAtReq }
  let readAheadSim = 0;
  // F anchor: frame-end phase (min over frames) - 8
  let endPhaseMin = Infinity;
  let Fphase = null;    // Z80 cycles mod FRAME
  let lastStatusRead = -1e18, fCount = 0;

  const S = {
    frames: 0, stops: 0, accesses: 0, dataWrites: 0, dataReads: 0, ctrlWrites: 0, statusReads: 0,
    drops: 0, dropsByRegion: {}, dropsByPc: {}, dropsByPhase: { display: 0, border: 0, blank: 0 },
    writesByPhase: { display: 0, border: 0, blank: 0 },
    misdirected: 0, misdirectedByPc: {},
    staleF: 0, staleFByPc: {}, freshF: 0,
    tight: {},  // per pc: data accesses mid-screen less than 29 T after the previous
    satBursts: 0, satBurstsHit: 0, satFramesBad: 0,
    shadowMismatchFrames: 0, shadowMismatchMax: 0,
    diffEnd: {}, diffMax: {},
    minGapDisplay: Infinity,
    byPc: {},   // pc label -> {n, display, drops}
  };
  const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

  const tables = () => {
    const m2 = regs[0] & 2, text = regs[1] & 0x10, multi = regs[1] & 8;
    const sat = (regs[5] & 0x7F) << 7, name = (regs[2] & 0x0F) << 10, sp = (regs[6] & 7) << 11;
    const col = m2 ? (regs[3] & 0x80 ? 0x2000 : 0) : regs[3] << 6, pat = m2 ? (regs[4] & 4 ? 0x2000 : 0) : (regs[4] & 7) << 11;
    return { m2, text, multi, sat, name, sp, col, pat, colLen: m2 ? 0x1800 : 32, patLen: m2 ? 0x1800 : 0x800 };
  };
  const region = (a) => {
    const t = tables();
    if (!t.text && a >= t.sat && a < t.sat + 128) return "SAT";
    if (a >= t.name && a < t.name + (t.text ? 960 : 768)) return "name";
    if (a >= t.pat && a < t.pat + t.patLen) return "pattern";
    if (!t.text && a >= t.col && a < t.col + t.colLen) return "colour";
    if (!t.text && a >= t.sp && a < t.sp + 2048) return "sprite-pattern";
    if (a >= 0x1B00 && a < 0x1D00) return "SAT(alt)";
    return "other";
  };
  // beam position of absolute Z80 cycle t
  const FOFS = +(process.env.VDPCHK_FOFS || fOfs || 0);   // calibration vs openMSX (Z80 cycles)
  const beam = (t) => {
    const fp = (Fphase ?? 43996) + FOFS;
    const dF = (((t - fp) % FRAME) + FRAME) % FRAME * 6;          // ticks since F
    const D = (dF + 192 * TICKS) % (LINES * TICKS);                 // ticks since display start (F = display line 192)
    const lineTick = (D + 202) % TICKS;
    const line = Math.floor((D + 202) / TICKS);                     // 0-191 display, 192.. border/blank
    const slotArea = D < 192 * TICKS - 40 || D >= LINES * TICKS - 1408;
    return { lineTick, line, slotArea, dF };
  };
  const tableFor = (b) => {
    const dispOn = regs[1] & 0x40;
    if (!dispOn || !b.slotArea) return W.off;
    if (regs[1] & 0x10) return W.text;
    if (regs[1] & 0x08) return W.g3;
    return W.g12;
  };
  const phaseOf = (b) => (!(regs[1] & 0x40) ? "blank" : b.line < 192 ? "display" : "border");

  const execPending = (upto) => {
    if (pending && pending.at <= upto) {
      if (pending.isRead) readAheadSim = sim[ptrSim];
      else {
        if (ptrSim !== pending.addrAtReq) { S.misdirected++; bump(S.misdirectedByPc, pending.lbl + " " + region(pending.addrAtReq) + "->" + region(ptrSim)); }
        sim[ptrSim] = pending.data;
      }
      ptrSim = (ptrSim + 1) & 0x3FFF;
      pending = null;
    }
  };
  let lastDataT = -1e18, satBurst = null;
  const vramAccess = (t, isRead, data, pc) => {
    const tt = t * 6;
    execPending(tt);
    const b = beam(t), ph = phaseOf(b), lbl = label(pc);
    const e = S.byPc[lbl] || (S.byPc[lbl] = { n: 0, display: 0, drops: 0, region: {} });
    e.n++; if (ph === "display") e.display++;
    bump(e.region, region(ptrIdeal));
    S.writesByPhase[ph]++;
    if (ph === "display" && seenF && seenF.stale && t - seenF.t < 40000) { S.afterStale++; bump(S.afterStaleByPc, lbl + " <- " + seenF.lbl); }
    const gap = t - lastDataT; lastDataT = t;
    if (ph === "display" && b.slotArea) { if (gap < S.minGapDisplay) S.minGapDisplay = gap; if (gap < 29) bump(S.tight, lbl); }
    // SAT bursts: data writes into the SAT region, separated by < 2000 cycles
    const reg = region(ptrIdeal);
    if (!isRead && reg.startsWith("SAT")) {
      if (!satBurst || t - satBurst.t > 2000) { if (satBurst) closeBurst(); satBurst = { t, hit: false, n: 0, line: b.line, ph, lbl }; }
      satBurst.t = t; satBurst.n++;
    }
    if (pending) {
      // overwritten: the older request is lost
      S.drops++; e.drops++;
      const lost = pending;
      bump(S.dropsByRegion, region(lost.addrAtReq));
      bump(S.dropsByPc, lost.lbl);
      S.dropsByPhase[ph]++;
      if (region(lost.addrAtReq).startsWith("SAT") && satBurst) satBurst.hit = true;
      if (S.dropLog.length < 400) S.dropLog.push({ frame: g.frame, line: b.line, tick: b.lineTick, pc: lost.lbl, by: lbl, addr: lost.addrAtReq.toString(16), region: region(lost.addrAtReq), gapT: gap });
      pending.isRead = isRead; pending.data = data; pending.lbl = lbl; pending.addrAtReq = ptrIdeal;
    } else {
      pending = { at: tt + tableFor(b)[b.lineTick], isRead, data, lbl, addrAtReq: ptrIdeal };
    }
  };
  S.dropLog = [];
  const closeBurst = () => {
    S.satBursts++; if (satBurst.hit) S.satBurstsHit++;
    const k = satBurst.ph === "display" ? "display" : satBurst.ph;
    const h = S.satBurstPhase[k] || (S.satBurstPhase[k] = { n: 0, hit: 0 }); h.n++; if (satBurst.hit) h.hit++;
    if (satBurst.ph === "display") bump(S.satBurstLines, String(Math.floor(satBurst.line / 16) * 16));
    bump(S.satBurstBy, satBurst.lbl + (satBurst.hit ? " (hit)" : ""));
    satBurst = null;
  };
  S.satBurstPhase = {}; S.satBurstLines = {}; S.satBurstBy = {}; S.afterStale = 0; S.afterStaleByPc = {};
  let seenF = null;

  const onAccess = (t, port, isOut, value, pc) => {
    S.accesses++;
    if ((port & 1) === 0) {          // data port
      if (isOut) { S.dataWrites++; shadow[ptrIdeal] = value; vramAccess(t, false, value, pc); }
      else { S.dataReads++; vramAccess(t, true, 0, pc); }
      ptrIdeal = (ptrIdeal + 1) & 0x3FFF;
      latchStored = false;
    } else if (isOut) {              // control port
      S.ctrlWrites++;
      execPending(t * 6);
      if (!latchStored) { latch = value; latchStored = true; ptrSim = (ptrSim & 0x3F00) | value; }
      else {
        latchStored = false;
        if (value & 0x80) { regs[value & 7] = latch; ptrSim = ((value << 8) | (ptrSim & 0xFF)) & 0x3FFF; }
        else {
          ptrIdeal = ((value << 8) | latch) & 0x3FFF; ptrSim = ptrIdeal;
          if (!(value & 0x40)) { vramAccess(t, true, 0, pc); ptrIdeal = (ptrIdeal + 1) & 0x3FFF; }
        }
      }
    } else {                         // status read
      S.statusReads++; latchStored = false;
      // F set at each F moment since the last status read?
      const fp = Fphase ?? 43996;
      const lastF = t - ((((t - fp) % FRAME) + FRAME) % FRAME);
      if (lastF > lastStatusRead) {
        const b = beam(t);
        const stale = b.line < 192 && !!(regs[1] & 0x40);
        if (stale) { S.staleF++; bump(S.staleFByPc, label(pc) + " @line" + (b.line < 64 ? "0-63" : b.line < 128 ? "64-127" : "128-191")); }
        else S.freshF++;
        seenF = { t, stale, lbl: label(pc) };
      }
      lastStatusRead = t;
    }
  };

  let preState = null;
  let preOp = null;
  const decode = (pc, clk) => {
    const op = preOp;
    const regsNow = () => preState;
    if (op[0] === 0xD3) return onAccess(clk + OFS.outn, op[1], true, regsNow().af >> 8, pc);
    if (op[0] === 0xDB) return onAccess(clk + OFS.inn, op[1], false, 0, pc);
    if (op[0] !== 0xED) return;
    const b = op[1], s = regsNow(), port = s.bc & 0xFF;
    if ((port & 0xE0) !== 0xA0) return;
    if ((b & 0xC7) === 0x41) {        // OUT (C),r
      const r = (b >> 3) & 7;
      const v = [s.bc >> 8, s.bc & 255, s.de >> 8, s.de & 255, s.hl >> 8, s.hl & 255, 0, s.af >> 8][r];
      return onAccess(clk + OFS.outc, port, true, v, pc);
    }
    if ((b & 0xC7) === 0x40) return onAccess(clk + OFS.inc, port, false, 0, pc);
    if (b === 0xA3 || b === 0xAB || b === 0xB3 || b === 0xBB) return onAccess(clk + OFS.outi, port, true, c.readRam(s.hl, 1)[0], pc);
    if (b === 0xA2 || b === 0xAA || b === 0xB2 || b === 0xBA) return onAccess(clk + OFS.ini, port, false, 0, pc);
  };

  const REG = ["name", "pattern", "colour", "SAT", "sprite-pattern"];
  const frameEnd = () => {
    S.frames++;
    const clk = c.getMasterClockCycles(), ph = clk % FRAME;
    if (ph < endPhaseMin) { endPhaseMin = ph; Fphase = (ph - 8 + FRAME) % FRAME; }
    execPending(clk * 6);
    if (satBurst && clk - satBurst.t > 2000) closeBurst();
    // self-check + consequences
    const ev = emuV();
    let mis = 0; for (let i = 0; i < 0x4000; i++) if (ev[i] !== shadow[i]) mis++;
    if (mis) { S.shadowMismatchFrames++; S.shadowMismatchMax = Math.max(S.shadowMismatchMax, mis); shadow.set(ev); }
    const t = tables();
    const ranges = { name: [t.name, t.text ? 960 : 768], pattern: [t.pat, t.patLen], colour: [t.col, t.colLen], SAT: [t.sat, 128], "sprite-pattern": [t.sp, 2048] };
    for (const k of REG) {
      if (t.text && (k === "SAT" || k === "colour" || k === "sprite-pattern")) continue;
      const [a, n] = ranges[k]; let d = 0;
      if (k === "SAT") { // only up to the terminator (Y=$D0) of the emulated table
        for (let i = 0; i < 128; i += 4) { let rowDiff = 0; for (let j = 0; j < 4; j++) if (ev[a + i + j] !== sim[a + i + j]) rowDiff++; d += rowDiff; if (ev[a + i] === 0xD0) break; }
        if (d) S.satFramesBad++;
      } else for (let i = 0; i < n; i++) if (ev[(a + i) & 0x3FFF] !== sim[(a + i) & 0x3FFF]) d++;
      S.diffEnd[k] = d; S.diffMax[k] = Math.max(S.diffMax[k] || 0, d);
    }
    if (opts.resyncEachFrame) sim.set(ev);
  };
  const opts = {};

  const origRun = c.runFrame.bind(c);
  c.runFrame = () => {
    for (;;) {
      const r = M._gcw_run_frame();
      if (r !== 1) break;
      S.stops++;
      let pc = M._gcw_get_pc() & 0xFFFF;
      // The core resumes past the current breakpoint without stopping again at
      // an immediately adjacent breakpoint. Step and decode consecutive I/O
      // instructions here so no OUT/IN access disappears from the trace.
      for (let guard = 0; guard < 64; guard++) {
        const clk = c.getMasterClockCycles();
        preState = c.getCpuState();
        preOp = c.readRam(pc, 2);
        if (preOp[0] === 0xED && (preOp[1] === 0xB3 || preOp[1] === 0xBB)) {
          preState = { ...preState };
        }
        const step = c.stepInstruction();
        if (step.interruptType) {
          S.nmiDeferred = (S.nmiDeferred || 0) + 1;
          break;
        }
        decode(pc, clk);
        pc = M._gcw_get_pc() & 0xFFFF;
        if (!cand.has(pc)) break;
        S.chained = (S.chained || 0) + 1;
      }
    }
    frameEnd();
    return { breakpointHit: false, pc: M._gcw_get_pc() & 0xFFFF };
  };
  return {
    stats: S, opts, label, sim, beamOf: beam,
    report() {
      const top = (o, n = 12) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
      return {
        timingModel: {
          policy: "openMSX MSX1 too_fast_vram_access=real compatible",
          chip: "TMS9918A/TMS9928A",
          requestBuffer: "one pending VRAM request; a newer request overwrites an older request waiting for a slot",
          minimumRequestDelayVdpTicks: CPU_28,
          slotTables: ["Graphics I/II", "Multicolor", "Text 40", "display off/border/blank"],
          z80PortTimingTStates: { outImmediate: 12, inImmediate: 12, outC: 14, inC: 14, outi: 18, otirPerByte: 23, ini: 15 }
        },
        frames: S.frames, Fphase, stops: S.stops, dataWrites: S.dataWrites, dataReads: S.dataReads, ctrlWrites: S.ctrlWrites, statusReads: S.statusReads,
        writesByPhase: S.writesByPhase, drops: S.drops, dropsByPhase: S.dropsByPhase, dropsByRegion: S.dropsByRegion,
        dropsByPc: top(S.dropsByPc), misdirected: S.misdirected, misdirectedByPc: top(S.misdirectedByPc),
        tightMidScreenByPc: top(S.tight), minGapDisplay: S.minGapDisplay === Infinity ? null : S.minGapDisplay,
        staleF: S.staleF, freshF: S.freshF, staleFByPc: top(S.staleFByPc),
        satBursts: S.satBursts, satBurstsHit: S.satBurstsHit, satFramesBad: S.satFramesBad,
        satBurstPhase: S.satBurstPhase, satBurstStartLines: S.satBurstLines, satBurstBy: top(S.satBurstBy, 10),
        afterStale: S.afterStale, afterStaleByPc: top(S.afterStaleByPc, 10),
        diffEnd: S.diffEnd, diffMax: S.diffMax,
        nmiDeferred: S.nmiDeferred || 0, chained: S.chained || 0,
        shadowMismatchFrames: S.shadowMismatchFrames, shadowMismatchMax: S.shadowMismatchMax,
        accessesByPc: Object.fromEntries(Object.entries(S.byPc).sort((a, b) => b[1].n - a[1].n).slice(0, 25)),
        dropSample: S.dropLog.slice(0, 40),
      };
    },
  };
}
