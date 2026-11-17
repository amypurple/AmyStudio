#!/usr/bin/env python3
# Imported from Amy-Coleco-Toolbox-2026-11-17 with permission for Amy Studio.
"""os7check.py: check a real-OS7 PSG trace against an os7music score.

  node test/psgtrace.mjs game.rom out 4800 [script]      -> out.psg.json
  python3 kit/os7check.py score.txt out.psg.json

Finds the frame where the music starts, compares every frame of two loops
with the os7music OS7 model (period of each audible tone, tone 3 period
while it clocks the noise, all attenuations, noise control while the noise
sounds), checks that the trace repeats exactly after one loop (seamless
loop, all voices started in the same frame), and lists what each channel
did (attenuation range, audible frames, noise controls)."""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import os7music as o


def norm(x):
    p = [x[c] if (x[3 + c] < 15 or (c == 2 and x[6] < 15 and x[7] & 3 == 3)) else -1 for c in range(3)]
    return p + x[3:7] + [x[7] if x[6] < 15 else -1]


def main():
    sc = o.parse(open(sys.argv[1]).read(), os.path.basename(sys.argv[1]))
    ent, total, areas, _ = o.build(sc)
    tr = json.load(open(sys.argv[2]))
    start = next(i for i, x in enumerate(tr) if x[3:7] != [15, 15, 15, 15])
    n = min(len(tr) - start, total * 2)
    mod = o.simulate(ent, n, sc.loop)
    best = None
    for off in range(max(0, start - 3), start + 4):
        bad = [f for f in range(n - 5) if off + f < len(tr) and norm(tr[off + f]) != norm(mod[f])]
        if best is None or len(bad) < len(best[1]):
            best = (off, bad)
    off, bad = best
    print(f"music starts at trace frame {off}; {n - 5} frames compared with the model; {len(bad)} differ")
    for f in bad[:10]:
        print(f"  frame {f}: trace {tr[off + f]} model {mod[f]}")
    L = total
    m = min(len(tr) - L, off + L) - off
    rep = sum(1 for f in range(off, off + m) if tr[f] != tr[f + L])
    print(f"loop {L} frames ({L / o.FPS:.3f} s): trace[f] vs trace[f+{L}] over {m} frames: {rep} differ")
    seg = tr[off:off + L]
    for c, nm in [(3, 'tone 1'), (4, 'tone 2'), (5, 'tone 3'), (6, 'noise')]:
        v = [x[c] for x in seg]
        print(f"  {nm:7s} atn {min(v)}..{max(v)}, audible {sum(a < 15 for a in v)} of {len(v)} frames")
    ctl = collections.Counter(x[7] for x in seg if x[6] < 15)
    print("  noise ctrl while audible:", dict(sorted(ctl.items())))
    if sc.layout == 'noisebass':
        print("  tone 3 periods (bass):", sorted(set(x[2] for x in seg)))
    return 1 if bad or rep else 0


if __name__ == '__main__':
    sys.exit(main())
