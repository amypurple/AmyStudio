export const DEFAULT_COLECO_TV_MIX = 50;

export function colecoTvMixProfile(position) {
  const value = Number(position);
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new RangeError("Audio mix must be an integer from 0 to 100");
  }
  return value === 0 ? "tv" : value === 100 ? "accurate" : `mix:${value}`;
}

function biquad(frequency, rate, highpass) {
  const w = 2 * Math.PI * frequency / rate;
  const c = Math.cos(w), alpha = Math.sin(w) / (2 * 0.707);
  const b = highpass ? (1 + c) / 2 : (1 - c) / 2;
  return [b, highpass ? -2 * b : 2 * b, b, -2 * c, 1 - alpha].map(v => v / (1 + alpha));
}

export function createColecoTvMix(position, rate) {
  const stages = [biquad(110, rate, true), biquad(6800, rate, false)];
  const state = Array.from({ length: 2 }, () => ({
    previous: 0, hp: 0, lp1: 0, lp2: 0, delays: [[0, 0], [0, 0]]
  }));
  const lower = position < DEFAULT_COLECO_TV_MIX;
  const lean = lower ? position / DEFAULT_COLECO_TV_MIX
    : (position - DEFAULT_COLECO_TV_MIX) / (100 - DEFAULT_COLECO_TV_MIX);
  const clip = value => Math.max(-32768, Math.min(32767, Math.round(value)));
  return samples => {
    for (let i = 0; i < samples.length; i++) {
      const s = state[i & 1], raw = samples[i];
      let d = raw;
      for (let j = 0; j < stages.length; j++) {
        const [b0, b1, b2, a1, a2] = stages[j], z = s.delays[j];
        const out = b0 * d + z[0];
        z[0] = b1 * d - a1 * out + z[1];
        z[1] = b2 * d - a2 * out;
        d = out;
      }
      if (lower) {
        // Reproduce the original TV fixed-point stages, including signed rounding.
        s.hp = raw - s.previous + Math.floor(32351 * s.hp / 32768);
        s.previous = raw;
        s.lp1 += Math.floor(18839 * (s.hp - s.lp1) / 32768);
        s.lp2 += Math.floor(18839 * (s.lp1 - s.lp2) / 32768);
        const old = clip(s.lp2);
        samples[i] = clip(old + (d - old) * lean);
      } else {
        samples[i] = clip(d + (raw - d) * lean);
      }
    }
  };
}
