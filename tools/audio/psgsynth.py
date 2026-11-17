# Imported from Amy-Coleco-Toolbox-2026-11-17. Originally produced during
# Amy Studio's POLYBIUS audio QA; requires numpy for WAV rendering.
# psgsynth.py psg.json f0 f1 out.wav (or: import psgsynth; psgsynth.write_wav(states, path)) : render SN76489 audio from the per-frame
# register states logged by psgtrace.mjs (real OS7 run). OS7 writes the PSG
# once per frame inside the NMI, so frame-granular rendering is exact.
import sys, json, wave, numpy as np
CLK = 3579545.0; FPS = CLK / (228 * 262); SR = 44100
def lfsr_white():
    r = 0x4000; out = np.zeros(32767, np.int8)
    for i in range(32767):
        out[i] = r & 1
        fb = (r & 1) ^ ((r >> 1) & 1)
        r = (r >> 1) | (fb << 14)
    return out
WH = lfsr_white(); PER = np.zeros(15, np.int8); PER[0] = 1
VOL = np.array([10 ** (-2 * a / 20) for a in range(15)] + [0.0])
def render(states):
    n_total = int(len(states) * SR / FPS)
    out = np.zeros(n_total)
    ph = [0.0, 0.0, 0.0]; nph = 0.0
    edges = (np.arange(len(states) + 1) * SR / FPS).astype(int)
    for k, st in enumerate(states):
        a, b = edges[k], min(edges[k + 1], n_total); m = b - a
        if m <= 0: continue
        idx = np.arange(1, m + 1)
        mix = np.zeros(m)
        t3phase = None
        for c in range(3):
            N = st[c] or 1024
            f = CLK / (32 * N)
            p = ph[c] + idx * f / SR
            if c == 2: t3phase = (ph[c], p, f)
            ph[c] = p[-1] % 1e6
            if f < 20000:
                mix += VOL[st[3 + c]] * np.where((p % 1) < 0.5, 1.0, -1.0)
        ctrl = st[7]; rate = ctrl & 3
        if rate == 3:
            sf = t3phase[2]           # one shift per tone-3 period
        else:
            sf = CLK / (512 << rate)
        q = nph + idx * sf / SR
        nph = q[-1]
        seq = WH if ctrl & 4 else PER
        bits = seq[(q.astype(np.int64)) % len(seq)]
        mix += VOL[st[6]] * (bits * 2.0 - 1.0) * (1.0 if ctrl & 4 else 1.0)
        out[a:b] = mix
    return out
def to_int16(y):
    from scipy.signal import lfilter
    y = y / 4.0 * 0.9 * 32767
    y = lfilter([1, -1], [1, -0.9986], y)  # DC blocker (~10 Hz)
    return np.clip(y, -32767, 32767).astype(np.int16)
def write_wav(states, path):
    """Render per-frame PSG states (psgtrace format) to a mono 16-bit WAV."""
    y = to_int16(render(states))
    o = wave.open(path, 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(y.tobytes()); o.close()
    return len(y) / SR
def main(argv):
    if len(argv) != 5:
        sys.exit('usage: psgsynth.py psg.json f0 f1 out.wav')
    st = json.load(open(argv[1])); f0, f1 = int(argv[2]), int(argv[3])
    print(argv[4], write_wav(st[f0:f1], argv[4]), 's')
if __name__ == '__main__':
    main(sys.argv)
