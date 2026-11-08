export const FIELD = Object.freeze({ left: 3, right: 28, top: 5, bottom: 21 });

export function bombCount(wave) {
  return wave > 11 ? 20 : 4 + Math.floor(wave * 3 / 2);
}

export function baseTimer(wave) {
  if (wave === 2) return 1500;
  if (wave === 3) return 1320;
  if (wave === 4) return 1140;
  if (wave >= 5) return 960;
  return 1680;
}

export function bombThresholds(wave, scale) {
  const warn = Math.floor(baseTimer(wave) * scale / 100);
  const flash = warn + Math.floor(warn / 2);
  return { warn, flash, explode: flash + Math.floor(warn / 4) };
}

export function blastCells(cx, cy) {
  const cells = [];
  for (let dy = -3; dy <= 3; dy += 1) {
    const radius = Math.abs(dy) === 3 ? 1 : Math.abs(dy) === 2 ? 2 : 3;
    for (let dx = -radius; dx <= radius; dx += 1) cells.push([cx + dx, cy + dy]);
  }
  return cells;
}

export function phaseAt(age, thresholds) {
  if (age >= thresholds.explode) return "explode";
  if (age >= thresholds.flash) return 2;
  if (age >= thresholds.warn) return 1;
  return 0;
}

export function wavePenalty(initialBombs, gatheredBombs) {
  return 10 * (initialBombs - gatheredBombs);
}
