#!/usr/bin/env python3
# Imported from Amy-Coleco-Toolbox-2026-11-17 with permission for Amy Studio.
# Keep the score format and real-OS7 trace tests synchronized with Amy's web tools.
"""os7music.py: text score -> ColecoVision OS7 (BIOS) sound table for Amy.

Usage:
  python3 kit/os7music.py score.txt -o song.alexis      # consts + asm { } block
  python3 kit/os7music.py score.txt --inc song.inc       # asm only (include "...")
  python3 kit/os7music.py score.txt --consts c.txt       # const lines only
  python3 kit/os7music.py score.txt --wav song.wav [--loops 2]
  python3 kit/os7music.py score.txt --json song.json     # per-frame PSG states
  python3 kit/os7music.py --help-format                  # the score format

Output: one sound table, music areas first ($702B, $7035, ...), then one
area per channel used by effects (noise, tone 1, tone 2, tone 3), a
constant per entry, the `set sound table X areas N` line to use, the exact
loop length in frames and seconds, and the byte size.

OS7 byte forms (checked against the real BIOS through PSG traces):
  tone  type0 : CH<<6,   Nlo, ATN<<4|Nhi, frames
  tone  type1 : CH<<6|1, Nlo, ATN<<4|Nhi, nvals, per<<4|first, fstep
  tone  type2 : CH<<6|2, Nlo, ATN<<4|Nhi, frames, astep<<4|avals, per<<4|first
  tone  type3 : CH<<6|3, Nlo, ATN<<4|Nhi, nvals, per<<4|first, fstep,
                astep<<4|avals, per<<4|first
  noise type0 : $00, $00, ATN<<4|CTRL, frames
  noise type2 : $02, ATN<<4|CTRL, frames, astep<<4|avals, per<<4|first
  rest        : CH<<6|$20|frames (1..31)
  end         : CH<<6|$10, end+repeat CH<<6|$18
Sweeps last first + per*(nvals-1) frames.
Noise CTRL: bit 2 white, bits 0-1 rate (3 = clocked by tone 3).
Periodic-noise bass: tone 3 muted at N = 7457 / Hz, noise CTRL 3.
"""
import sys, os, re, math, json, argparse

FPS = 3579545.0 / (228 * 262)          # NTSC frame rate, 59.92 Hz
NAMES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
         'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
         'Bb': 10, 'B': 11}
CHAN = {'noise': 0, 'tone1': 1, 'tone2': 2, 'tone3': 3, 'pitch': 3}
MUSIC_AREAS = ['$702B', '$7035', '$703F', '$7049']
AREA_BASE = 0x702B

FORMAT_HELP = r"""
SCORE FORMAT (one directive per line; '#' after a space or at the line
start begins a comment, so C#5 is a note)

Header
  title  Free text                      (comment in the output)
  prefix Tit                            (label/const prefix, default Mus)
  table  SndTable                       (sound table label)
  layout noisebass | threetone
  step   6                              (frames per step)  or  bpm 150 4
                                        (bpm, steps per beat -> frames/step)
  bar    16                             (steps per bar, for '|' checks)
  floor  3                              (music attenuation must be >= this)
  loop   on | off                       (end with repeat, or end and stop)

Voices (music areas are given in declaration order)
  voice Lead  tone1 atn=3 inst=pluck
  voice Two   tone2 atn=5 inst=pluck
  voice Pitch pitch                     (noisebass: tone 3 muted, bass pitch)
  voice Noise noise                     (drum lane; noisebass: bass + drums)
  options: atn=N inst=NAME len=N label=Label const=ConstName
  noisebass needs tone1, tone2, pitch, noise; threetone tone1..3 + noise.

Instruments (kinds plain, pluck, slide, vibrato, fall, ping; every
parameter has a default, see INST_DEFAULTS in the source)
  inst p  pluck avals=4 astep=1 per=2 first=2 longper=3 longfrom=13
  inst s  slide depth=12 vals=5 per=1 first=1 avals=4 astep=1 bper=4 bfirst=6
  inst f  fall  havals=2 hastep=1 hper=8 hfirst=8 vals=9 div=40 per=2 first=1
                tatn=1 avals=6 astep=1 aper=3 afirst=2
  inst v  vibrato head=18 havals=2 hastep=1 hper=12 hfirst=6 depth=1 per=3
                first=2 fade=24 cap=7
  inst g  ping  vals=8 div=30 per=3 first=3 avals=5 astep=2 aper=4 afirst=4
  Built in: plain pluck slide vibrato fall ping (with these defaults).

Drums (one character per hit in the noise lane, '.' = nothing)
  drum K ctrl=3 atn=3 env=5,1,2,2       (env = avals,astep,per,first)
  drum h ctrl=4 atn=6 env=3,3,1,1 max=4 (max: at most 4 frames, then rest)
  A hit lasts until the next hit (or max steps); no env = flat note.

Sections and order
  section A1 bars=4                     (or steps=64)
  Lead: r:16 | E5:3 A5:3 B5:2 C6:4 B5:2 A5:2 |
        C6:3 B5:3 ...                   (indented lines continue the lane)
  Two:  inst=q atn=5 A3:2 E4 C4 E4 ...
  Pitch: A1:16 G1:16
  Noise: K.h.B.h.K.h.B.h. K.h.B.h.K.h.B.hB
  play A1 A2 B1 B2 V

Note tokens (tone and pitch lanes)
  NOTE[:steps][inst][!atn]   e.g. E5:3  C#5  Bb3:2q  A5:16v  E4!6
  r[:steps]                  rest
  Length, instrument and attenuation are sticky only for length; a bare
  NOTE uses the last length.  inst=X / atn=N tokens change the lane
  defaults until the end of the section line block.  '|' checks the bar.

Effects (after the music, one area per channel)
  effect Shot tone1 [const=SndShot label=SfxShot]
    sweep 36 atn=1 vals=8 step=10 per=1 first=1 env=4,3,2,2
    tone  A5 atn=1 f=8 [env=2,1,4,6]
    noise 4 atn=0 f=3 env=2,1,2,2
    rest  6
    note  E6:4p      (note tokens with 'step N' frames per step, default 1)
  (blank line or next directive ends the effect)
"""

INST_DEFAULTS = {
    'plain': {},
    'pluck': dict(avals=4, astep=1, per=2, first=2, longper=0, longfrom=0),
    'slide': dict(depth=12, vals=5, per=1, first=1, avals=4, astep=1, bper=4, bfirst=6),
    'fall': dict(havals=2, hastep=1, hper=8, hfirst=8, vals=9, div=40, per=2, first=1,
                 tatn=1, avals=6, astep=1, aper=3, afirst=2),
    'vibrato': dict(head=18, havals=2, hastep=1, hper=12, hfirst=6, depth=1, per=3,
                    first=2, fade=24, cap=7),
    'ping': dict(vals=8, div=30, per=3, first=3, avals=5, astep=2, aper=4, afirst=4),
}


class ScoreError(Exception):
    pass


def hz(name):
    m = re.fullmatch(r'([A-G][#b]?)(-?\d)', name)
    if not m or m.group(1) not in NAMES:
        raise ScoreError(f'bad note name {name!r}')
    return 440 * 2 ** ((NAMES[m.group(1)] - 9) / 12 + int(m.group(2)) - 4)


def tone_n(name):
    n = round(111861 / hz(name))
    if not 1 <= n <= 1023:
        raise ScoreError(f'{name}: tone period {n} outside 1..1023 (lowest tone note is A2, N = 1017)')
    return n


def bass_n(name):
    n = round(7457 / hz(name))
    if not 1 <= n <= 1023:
        raise ScoreError(f'{name}: periodic-noise period {n} outside 1..1023')
    return n


def nib(v, what):
    if not 0 <= v <= 15:
        raise ScoreError(f'{what} = {v} outside 0..15')
    return v


# --------------------------------------------------------------------------
# One OS7 stream
# --------------------------------------------------------------------------
class Stream:
    """One OS7 stream. ch 0 = noise, 1..3 = tone. Time in frames."""

    def __init__(self, ch, floor=0, where=''):
        self.ch, self.h, self.b, self.t = ch, ch << 6, [], 0
        self.floor, self.where = floor, where
        self.last_plain = None      # (index in b, n, atn) of the last plain note
        self.last_rest = None       # index in b of a rest byte that can grow
        self.atns = []

    def _atn(self, atn, muted_ok=False):
        nib(atn, 'attenuation')
        if atn < self.floor and not muted_ok:
            raise ScoreError(f'{self.where}: attenuation {atn} below the music floor {self.floor}')
        self.atns.append(atn)

    def _brk(self):
        self.last_plain = None

    def at(self, t):
        if t < self.t:
            raise ScoreError(f'{self.where}: event at frame {t} before current frame {self.t}')
        self.rest(t - self.t)

    def _restmax(self):
        # tone 3 rest of 31 frames is the byte $FF, which OS7 does not read
        # as a rest (it ends/garbles the stream): cap tone-3 rests at 30.
        return 30 if self.ch == 3 else 31

    def rest(self, n):
        if n <= 0:
            return
        if self.last_rest == len(self.b) - 1:       # top up the rest just written
            have = self.b[-1] & 31
            k = min(n, self._restmax() - have)
            self.b[-1] += k
            self.t += k
            n -= k
        while n > 0:
            k = min(n, self._restmax())
            self.b.append(self.h | 0x20 | k)
            n -= k
            self.t += k
        self._brk()
        self.last_rest = len(self.b) - 1

    def note(self, n, atn, frames, merge=True):
        """plain note; joins a plain neighbour with the same period/atn"""
        self._atn(atn, muted_ok=(atn == 15))
        if frames <= 0:
            return
        if merge and self.last_plain and self.last_plain[1:] == (n, atn):
            i = self.last_plain[0]
            room = 255 - self.b[i + 3]
            k = min(room, frames)
            self.b[i + 3] += k
            self.t += k
            frames -= k
        while frames > 0:
            k = min(frames, 255)
            i = len(self.b)
            self.b += [self.h, n & 255, atn << 4 | n >> 8, k]
            frames -= k
            self.t += k
            self.last_plain = (i, n, atn)

    def env(self, n, atn, frames, avals=4, astep=1, per=2, first=2):
        self._atn(atn)
        self._brk()
        k = min(frames, 255)
        if k <= 0:
            raise ScoreError(f'{self.where}: envelope note of {frames} frames')
        self.b += [self.h | 2, n & 255, atn << 4 | n >> 8, k,
                   (astep & 15) << 4 | nib(avals, 'avals'), nib(per, 'per') << 4 | nib(first, 'first')]
        self.t += k
        if frames > k:
            self.note(n, min(15, atn + astep * (avals - 1)), frames - k)

    def sweep(self, n, atn, nvals, fstep, per=1, first=1):
        self._atn(atn)
        self._brk()
        if not -128 <= fstep <= 127:
            raise ScoreError(f'{self.where}: frequency step {fstep} outside -128..127')
        self._check_sweep(n, nvals, fstep)
        self.b += [self.h | 1, n & 255, atn << 4 | n >> 8, nvals,
                   nib(per, 'per') << 4 | nib(first, 'first'), fstep & 255]
        d = first + per * (nvals - 1)
        self.t += d
        return d

    def sweepenv(self, n, atn, nvals, fstep, per, first, avals, astep, aper, afirst):
        self._atn(atn)
        self._brk()
        if not -128 <= fstep <= 127:
            raise ScoreError(f'{self.where}: frequency step {fstep} outside -128..127')
        self._check_sweep(n, nvals, fstep)
        self.b += [self.h | 3, n & 255, atn << 4 | n >> 8, nvals,
                   nib(per, 'per') << 4 | nib(first, 'first'), fstep & 255,
                   (astep & 15) << 4 | nib(avals, 'avals'), nib(aper, 'aper') << 4 | nib(afirst, 'afirst')]
        d = first + per * (nvals - 1)
        self.t += d
        return d

    def _check_sweep(self, n, nvals, fstep):
        if not 1 <= nvals <= 255:
            raise ScoreError(f'{self.where}: sweep count {nvals} outside 1..255')
        last = n + fstep * (nvals - 1)
        if not 1 <= n <= 1023 or not 1 <= last <= 1023:
            raise ScoreError(f'{self.where}: sweep {n} -> {last} leaves 1..1023')

    def nz(self, ctrl, atn, frames):
        self._atn(atn)
        self._brk()
        while frames > 0:
            k = min(frames, 255)
            self.b += [0x00, 0x00, atn << 4 | nib(ctrl, 'ctrl') & 7, k]
            frames -= k
            self.t += k

    def nenv(self, ctrl, atn, frames, avals=4, astep=1, per=1, first=1):
        self._atn(atn)
        self._brk()
        k = min(frames, 255)
        if k <= 0:
            raise ScoreError(f'{self.where}: noise hit of {frames} frames')
        self.b += [0x02, atn << 4 | (ctrl & 7), k, (astep & 15) << 4 | nib(avals, 'avals'),
                   nib(per, 'per') << 4 | nib(first, 'first')]
        self.t += k
        if frames > k:
            self.nz(ctrl, min(15, atn + astep * (avals - 1)), frames - k)

    def end(self, repeat=False):
        self.b.append(self.h | 0x10 | (8 if repeat else 0))


# --------------------------------------------------------------------------
# Instruments
# --------------------------------------------------------------------------
def play_note(v, kind, p, N, atn, fr):
    """Emit one note of fr frames at period N with instrument (kind, params)."""
    if kind == 'plain':
        v.note(N, atn, fr)
    elif kind == 'pluck':
        per = p['longper'] if p['longper'] and fr >= p['longfrom'] else p['per']
        v.env(N, atn, fr, avals=p['avals'], astep=p['astep'], per=per, first=p['first'])
    elif kind == 'slide':
        d = (N * p['depth'] // 100) // (p['vals'] - 1)
        start = N + (p['vals'] - 1) * d          # from below in pitch (larger N)
        took = v.sweep(start, atn, p['vals'], -d, p['per'], p['first'])
        if fr - took <= 0:
            raise ScoreError(f'{v.where}: slide note too short ({fr} frames)')
        v.env(N, atn, fr - took, avals=p['avals'], astep=p['astep'], per=p['bper'], first=p['bfirst'])
    elif kind == 'fall':
        tail = p['first'] + p['per'] * (p['vals'] - 1)
        if fr - tail <= 0:
            raise ScoreError(f'{v.where}: fall note too short ({fr} frames, tail {tail})')
        v.env(N, atn, fr - tail, avals=p['havals'], astep=p['hastep'], per=p['hper'], first=p['hfirst'])
        v.sweepenv(N, min(15, atn + p['tatn']), p['vals'], max(1, N // p['div']), p['per'], p['first'],
                   p['avals'], p['astep'], p['aper'], p['afirst'])
    elif kind == 'vibrato':
        head = min(p['head'], fr)
        v.env(N, atn, head, avals=p['havals'], astep=p['hastep'], per=p['hper'], first=p['hfirst'])
        left, up, a = fr - head, True, atn + 1
        seg = p['first'] + p['per'] * 2
        dd = p['depth']
        while left >= seg:
            v.sweep(N - dd if up else N + dd, a, 3, dd if up else -dd, p['per'], p['first'])
            left -= seg
            up = not up
            if left < p['fade'] and a < p['cap']:
                a += 1
        if left:
            v.note(N, min(15, a + 1), left)
    elif kind == 'ping':
        d = v.sweepenv(N, atn, p['vals'], max(1, N // p['div']), p['per'], p['first'],
                       p['avals'], p['astep'], p['aper'], p['afirst'])
        if d > fr:
            raise ScoreError(f'{v.where}: ping lasts {d} frames, note only {fr}')
        v.rest(fr - d)
    else:
        raise ScoreError(f'unknown instrument kind {kind}')


# --------------------------------------------------------------------------
# Parser
# --------------------------------------------------------------------------
NOTE_RE = re.compile(r'([A-G][#b]?-?\d|r)(?::(\d+))?([A-Za-z_]\w*)?(?:!(\d+))?$')


def kv(tokens, where):
    out = {}
    for t in tokens:
        if '=' not in t:
            raise ScoreError(f'{where}: expected key=value, got {t!r}')
        k, v = t.split('=', 1)
        out[k] = v
    return out


def to_int(s, where):
    try:
        return int(s, 0)
    except ValueError:
        raise ScoreError(f'{where}: {s!r} is not a number')


class Score:
    def __init__(self):
        self.title, self.prefix, self.table = '', 'Mus', None
        self.layout, self.step, self.bar, self.floor, self.loop = 'noisebass', 6, 16, 3, True
        self.voices = []            # dicts: name ch atn inst len label const
        self.inst = {k: (k, dict(v)) for k, v in INST_DEFAULTS.items()}
        self.drums = {}
        self.sections = {}          # name -> (steps, {voice: [tokens]}, line)
        self.order = []
        self.effects = []           # dicts: name ch const label cmds


def parse(text, fname='score'):
    sc = Score()
    cur_sec = None
    cur_fx = None
    cur_lane = None
    for ln, raw in enumerate(text.splitlines(), 1):
        where = f'{fname}:{ln}'
        line = re.sub(r'(^|\s)#.*', '', raw).rstrip()
        if not line.strip():
            cur_fx = None
            cur_lane = None
            continue
        indented = raw[:1] in ' \t'
        tok = line.split()
        if cur_fx is not None and indented:
            cur_fx['cmds'].append((tok, where))
            continue
        cur_fx = None
        if indented and cur_lane is not None and not tok[0].endswith(':'):
            cur_lane.extend((t, where) for t in tok)
            continue
        cur_lane = None
        d = tok[0]
        if d.endswith(':'):
            if cur_sec is None:
                raise ScoreError(f'{where}: lane line outside a section')
            name = d[:-1]
            if name not in [v['name'] for v in sc.voices]:
                raise ScoreError(f'{where}: unknown voice {name!r}')
            cur_lane = sc.sections[cur_sec][1].setdefault(name, [])
            cur_lane.extend((t, where) for t in tok[1:])
            continue
        if d == 'title':
            sc.title = line.split(None, 1)[1] if len(tok) > 1 else ''
        elif d in ('prefix', 'table', 'layout'):
            setattr(sc, d, tok[1])
        elif d == 'step':
            sc.step = to_int(tok[1], where)
        elif d == 'bpm':
            bpm, spb = float(tok[1]), to_int(tok[2], where) if len(tok) > 2 else 4
            f = 3600 / (bpm * spb)
            sc.step = round(f)
            if abs(f - sc.step) > 0.01:
                print(f'note: {where}: bpm {bpm} x {spb} = {f:.2f} frames per step, using {sc.step}',
                      file=sys.stderr)
        elif d == 'bar':
            sc.bar = to_int(tok[1], where)
        elif d == 'floor':
            sc.floor = to_int(tok[1], where)
        elif d == 'loop':
            sc.loop = tok[1].lower() in ('on', 'yes', '1', 'true')
        elif d == 'voice':
            if tok[2] not in CHAN:
                raise ScoreError(f'{where}: channel must be tone1/tone2/tone3/pitch/noise')
            o = kv(tok[3:], where)
            sc.voices.append(dict(name=tok[1], kind=tok[2], ch=CHAN[tok[2]],
                                  atn=to_int(o.get('atn', '15' if tok[2] == 'pitch' else '4'), where),
                                  inst=o.get('inst', 'plain'), len=to_int(o.get('len', '1'), where),
                                  label=o.get('label'), const=o.get('const')))
        elif d == 'inst':
            kind = tok[2]
            if kind not in INST_DEFAULTS:
                raise ScoreError(f'{where}: instrument kind must be one of {", ".join(INST_DEFAULTS)}')
            p = dict(INST_DEFAULTS[kind])
            for k, v in kv(tok[3:], where).items():
                if k not in p:
                    raise ScoreError(f'{where}: {kind} has no parameter {k!r} ({", ".join(p)})')
                p[k] = to_int(v, where)
            sc.inst[tok[1]] = (kind, p)
        elif d == 'drum':
            if len(tok[1]) != 1 or tok[1] in '.|r':
                raise ScoreError(f'{where}: a drum name is one character (not . | r)')
            o = kv(tok[2:], where)
            env = None
            if 'env' in o:
                env = [to_int(x, where) for x in o['env'].split(',')]
                if len(env) != 4:
                    raise ScoreError(f'{where}: env=avals,astep,per,first')
            sc.drums[tok[1]] = dict(ctrl=to_int(o.get('ctrl', '4'), where), atn=to_int(o.get('atn', '4'), where),
                                    env=env, max=to_int(o.get('max', '0'), where))
        elif d == 'section':
            o = kv(tok[2:], where)
            if 'bars' in o:
                steps = to_int(o['bars'], where) * sc.bar
            elif 'steps' in o:
                steps = to_int(o['steps'], where)
            else:
                raise ScoreError(f'{where}: section needs bars=N or steps=N')
            cur_sec = tok[1]
            if cur_sec in sc.sections:
                raise ScoreError(f'{where}: section {cur_sec} defined twice')
            sc.sections[cur_sec] = (steps, {}, where)
        elif d == 'play':
            sc.order += tok[1:]
        elif d == 'effect':
            o = kv(tok[3:], where)
            if tok[2] not in CHAN or tok[2] == 'pitch':
                raise ScoreError(f'{where}: effect channel must be noise/tone1/tone2/tone3')
            cur_fx = dict(name=tok[1], ch=CHAN[tok[2]], const=o.get('const'), label=o.get('label'),
                          cmds=[], where=where)
            sc.effects.append(cur_fx)
        else:
            raise ScoreError(f'{where}: unknown directive {d!r}')
    check_layout(sc)
    return sc


def check_layout(sc):
    kinds = sorted(v['kind'] for v in sc.voices)
    chans = [v['ch'] for v in sc.voices]
    if len(set(chans)) != len(chans):
        raise ScoreError('two voices use the same channel')
    if len(sc.voices) > 4:
        raise ScoreError('at most 4 music voices')
    if sc.layout == 'noisebass':
        if 'tone3' in kinds:
            raise ScoreError('noisebass: tone 3 is the muted bass pitch, declare it as "pitch"')
        if sc.voices and ('pitch' not in kinds or 'noise' not in kinds):
            raise ScoreError('noisebass needs a pitch voice (tone 3) and a noise voice')
    elif sc.layout == 'threetone':
        if 'pitch' in kinds:
            raise ScoreError('threetone: tone 3 is audible, declare it as "tone3", not "pitch"')
    else:
        raise ScoreError('layout must be noisebass or threetone')
    if not sc.order and sc.voices:
        raise ScoreError('no play order (play A B ...)')
    for s in sc.order:
        if s not in sc.sections:
            raise ScoreError(f'play order names unknown section {s!r}')
    if not 0 <= sc.floor <= 15 or not 1 <= sc.step <= 255:
        raise ScoreError('floor 0..15, step 1..255')


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
def lane_events(sc, v, toks, steps, sec):
    """tokens -> list of (start_step, len_steps, what, inst, atn)"""
    out, t, ln, inst, atn = [], 0, v['len'], v['inst'], v['atn']
    bar_t = 0
    if v['kind'] == 'noise':
        for tk, where in toks:
            if tk == '|':
                if sc.bar and t % sc.bar:
                    raise ScoreError(f'{where}: bar line at step {t} of section {sec}, not on a bar')
                continue
            for c in tk:
                if c == '.':
                    t += 1
                elif c in sc.drums:
                    out.append((t, None, c, None, None, where))
                    t += 1
                else:
                    raise ScoreError(f'{where}: unknown drum {c!r} in lane {v["name"]}')
    else:
        for tk, where in toks:
            if tk == '|':
                if sc.bar and t % sc.bar:
                    raise ScoreError(f'{where}: bar line at step {t} of section {sec}, not on a bar '
                                     f'(remove the | if a note crosses the bar)')
                continue
            if tk.startswith('inst='):
                inst = tk[5:]
                continue
            if tk.startswith('atn='):
                atn = to_int(tk[4:], where)
                continue
            if tk.startswith('len='):
                ln = to_int(tk[4:], where)
                continue
            m = NOTE_RE.match(tk)
            if not m:
                raise ScoreError(f'{where}: bad token {tk!r}')
            if m.group(2):
                ln = int(m.group(2))
            if ln <= 0:
                raise ScoreError(f'{where}: zero length')
            ins = m.group(3) or inst
            if ins not in sc.inst:
                raise ScoreError(f'{where}: unknown instrument {ins!r}')
            a = int(m.group(4)) if m.group(4) else atn
            if m.group(1) != 'r':
                out.append((t, ln, m.group(1), ins, a, where))
            t += ln
    if t != steps:
        raise ScoreError(f'section {sec}, voice {v["name"]}: {t} steps, section has {steps}')
    return out


def build_music(sc):
    U = sc.step
    streams = []
    for v in sc.voices:
        st = Stream(v['ch'], floor=sc.floor, where=f'voice {v["name"]}')
        base = 0
        for sec in sc.order:
            steps, lanes, swhere = sc.sections[sec]
            ev = lane_events(sc, v, lanes.get(v['name'], [('r:%d' % steps, swhere)] if v['kind'] != 'noise'
                                               else [('.' * steps, swhere)]), steps, sec)
            if v['kind'] == 'noise':
                for k, (s0, _, c, _, _, where) in enumerate(ev):
                    nxt = ev[k + 1][0] if k + 1 < len(ev) else steps
                    dr = sc.drums[c]
                    n = (nxt - s0) * U
                    if dr['max']:
                        n = min(n, dr['max'])
                    st.where = where
                    st.at(base + s0 * U)
                    if dr['env']:
                        a, s, p, f = dr['env']
                        st.nenv(dr['ctrl'], dr['atn'], n, avals=a, astep=s, per=p, first=f)
                    else:
                        st.nz(dr['ctrl'], dr['atn'], n)
            else:
                for s0, ln, name, ins, atn, where in ev:
                    st.where = where
                    st.at(base + s0 * U)
                    if v['kind'] == 'pitch':
                        st.note(bass_n(name), 15, ln * U)
                    else:
                        kind, p = sc.inst[ins]
                        play_note(st, kind, p, tone_n(name), atn, ln * U)
            base += steps * U
            st.at(base)
        st.end(sc.loop)
        streams.append((v, st))
    total = sum(sc.sections[s][0] for s in sc.order) * U
    for v, st in streams:
        assert st.t == total, (v['name'], st.t, total)
    return streams, total


def build_effect(sc, fx):
    st = Stream(fx['ch'], floor=0, where=f'effect {fx["name"]}')
    stepf = 1
    for tok, where in fx['cmds']:
        st.where = where
        c, a = tok[0], tok[1:]
        if c == 'step':
            stepf = to_int(a[0], where)
            continue
        if c == 'rest':
            st.rest(to_int(a[0], where))
            continue
        if c == 'note':
            for tk in a:
                m = NOTE_RE.match(tk)
                if not m or not m.group(2):
                    raise ScoreError(f'{where}: effect notes need a length: {tk!r}')
                fr = int(m.group(2)) * stepf
                if m.group(1) == 'r':
                    st.rest(fr)
                    continue
                kind, p = sc.inst[m.group(3) or 'plain']
                play_note(st, kind, p, tone_n(m.group(1)), int(m.group(4) or 0), fr)
            continue
        pos = [x for x in a if '=' not in x]
        o = kv([x for x in a if '=' in x], where)
        env = [to_int(x, where) for x in o['env'].split(',')] if 'env' in o else None
        atn = to_int(o.get('atn', '0'), where)

        def per_of(x):
            return tone_n(x) if re.match(r'[A-G]', x) else to_int(x, where)
        if c == 'tone':
            n, f = per_of(pos[0]), to_int(o['f'], where)
            if env:
                st.env(n, atn, f, *env)
            else:
                st.note(n, atn, f, merge=False)
        elif c == 'sweep':
            n = per_of(pos[0])
            args = [to_int(o.get(k, d), where) for k, d in
                    (('vals', '2'), ('step', '1'), ('per', '1'), ('first', '1'))]
            if env:
                st.sweepenv(n, atn, args[0], args[1], args[2], args[3], env[0], env[1], env[2], env[3])
            else:
                st.sweep(n, atn, *args)
        elif c == 'noise':
            ctrl, f = to_int(pos[0], where), to_int(o['f'], where)
            if env:
                st.nenv(ctrl, atn, f, *env)
            else:
                st.nz(ctrl, atn, f)
        else:
            raise ScoreError(f'{where}: unknown effect command {c!r}')
        if (c == 'noise') != (fx['ch'] == 0):
            raise ScoreError(f'{where}: {c} command on the wrong channel for effect {fx["name"]}')
    st.end(False)
    return st


def build(sc):
    streams, total = build_music(sc) if sc.voices else ([], 0)
    entries = []      # (const, label, area, stream, role)
    pre = sc.prefix
    for i, (v, st) in enumerate(streams):
        entries.append((v['const'] or f'Snd{pre}{v["name"]}', v['label'] or f'{pre}{v["name"]}',
                        MUSIC_AREAS[i], st, 'music'))
    nmus = len(streams)
    fx_chans = [c for c in (0, 1, 2, 3) if any(f['ch'] == c for f in sc.effects)]
    fx_area = {c: '$%04X' % (AREA_BASE + 10 * (nmus + i)) for i, c in enumerate(fx_chans)}
    for fx in sc.effects:
        st = build_effect(sc, fx)
        entries.append((fx['const'] or f'Snd{fx["name"]}', fx['label'] or f'Sfx{fx["name"]}',
                        fx_area[fx['ch']], st, 'effect'))
    areas = nmus + len(fx_chans)
    return entries, total, areas, fx_area


def build_multi(scs):
    """Several scores, one sound table. Songs play one at a time, so their
    music voices share the first music areas; the effects of every score get
    their own areas after the largest song. Labels and constants must differ
    (give each score its own `prefix`)."""
    entries, totals, nmus = [], [], 0
    built = []
    for sc in scs:
        streams, total = build_music(sc) if sc.voices else ([], 0)
        built.append((sc, streams)); totals.append(total); nmus = max(nmus, len(streams))
    if nmus > len(MUSIC_AREAS):
        raise ScoreError(f'{nmus} music voices, at most {len(MUSIC_AREAS)}')
    for sc, streams in built:
        for i, (v, st) in enumerate(streams):
            entries.append((v['const'] or f'Snd{sc.prefix}{v["name"]}', v['label'] or f'{sc.prefix}{v["name"]}',
                            MUSIC_AREAS[i], st, 'music'))
    effects = [fx for sc in scs for fx in sc.effects]
    fx_chans = [c for c in (0, 1, 2, 3) if any(f['ch'] == c for f in effects)]
    fx_area = {c: '$%04X' % (AREA_BASE + 10 * (nmus + i)) for i, c in enumerate(fx_chans)}
    for sc in scs:
        for fx in sc.effects:
            entries.append((fx['const'] or f'Snd{fx["name"]}', fx['label'] or f'Sfx{fx["name"]}',
                            fx_area[fx['ch']], build_effect(sc, fx), 'effect'))
    seen = {}
    for c, l, *_ in entries:
        for k in (c, l):
            if k in seen:
                raise ScoreError(f'name {k!r} used twice across the merged scores (set a different prefix)')
            seen[k] = 1
    return entries, totals, nmus + len(fx_chans), fx_area


def hexrow(bs):
    return ",".join("$%02X" % b for b in bs)


def render_asm(sc, entries, total, areas):
    table = sc.table or f'{sc.prefix}SoundTable'
    out = []
    out.append(f"{table}:")
    for c, label, area, st, role in entries:
        out.append(f"    dw {label},{area}")
    out.append("    dw 0")
    for c, label, area, st, role in entries:
        out.append(label + ":")
        for i in range(0, len(st.b), 16):
            out.append("    db " + hexrow(st.b[i:i + 16]))
    return out, table


def report(sc, entries, total, areas, fx_area):
    nbytes = sum(len(e[3].b) for e in entries) + 4 * len(entries) + 2
    lines = [f"{sc.title or 'untitled'}: layout {sc.layout}, {sc.step} frames/step",
             f"loop {total} frames = {total / 60:.3f} s at 60 Hz ({total / FPS:.3f} s at NTSC {FPS:.2f} Hz)"
             + ('' if sc.loop else ' (plays once)'),
             f"table {nbytes} bytes ({len(entries)} entries, {areas} areas)"]
    for c, label, area, st, role in entries:
        rng = f"atn {min(st.atns)}..{max(st.atns)}" if st.atns else "silent"
        lines.append(f"  {c:16s} {label:16s} {area} {role:6s} {len(st.b):5d} bytes {st.t:6d} frames {rng}")
    return lines, nbytes


def emit_files(sc, entries, total, areas, fx_area, args, src):
    asm, table = render_asm(sc, entries, total, areas)
    lines, nbytes = report(sc, entries, total, areas, fx_area)
    consts = [f"const {c} = {i + 1}" for i, (c, *_r) in enumerate(entries)]
    consts += [f"const {sc.prefix}Areas = {areas}",
               f"const {sc.prefix}LoopFrames = {total}"]
    head = [f"generated by kit/os7music.py from {os.path.basename(src)} - do not edit by hand",
            f"{sc.title}",
            f"use: set sound table {table} areas {areas}"] + lines
    music = [e for e in entries if e[4] == 'music']
    if music:
        head.append("start the music in one frame: nmi off / play sound " +
                    " / ".join(e[0] for e in music) + " / nmi on")
    if args.out:
        with open(args.out, 'w') as f:
            f.write("\n".join("' " + h for h in head) + "\n")
            f.write("\n".join(consts) + "\n\nasm {\n" + "\n".join(asm) + "\n}\n")
    if args.inc:
        with open(args.inc, 'w') as f:
            f.write("\n".join("; " + h for h in head) + "\n" + "\n".join(asm) + "\n")
    if args.consts:
        with open(args.consts, 'w') as f:
            f.write("\n".join(consts) + "\n")
    return lines


def emit_multi(scs, entries, totals, areas, fx_area, args):
    sc0 = scs[0]
    asm, table = render_asm(sc0, entries, max(totals), areas)
    nbytes = sum(len(e[3].b) for e in entries) + 4 * len(entries) + 2
    consts = [f"const {c} = {i + 1}" for i, (c, *_r) in enumerate(entries)]
    consts += [f"const {sc0.prefix}Areas = {areas}"]
    consts += [f"const {sc.prefix}LoopFrames = {t}" for sc, t in zip(scs, totals) if sc.voices]
    lines = [f"merged {len(scs)} scores: table {nbytes} bytes ({len(entries)} entries, {areas} areas)"]
    for sc, t in zip(scs, totals):
        lines.append(f"  {sc.title or sc.prefix}: loop {t} frames" + ('' if sc.loop else ' (plays once)'))
    for c, label, area, st, role in entries:
        lines.append(f"  {c:16s} {label:16s} {area} {role:6s} {len(st.b):5d} bytes {st.t:6d} frames")
    head = [f"generated by kit/os7music.py from {', '.join(os.path.basename(f) for f in args.score)} - do not edit by hand",
            f"use: set sound table {table} areas {areas}",
            "songs share the music areas: stop one song before starting another"] + lines
    if args.out:
        with open(args.out, 'w') as f:
            f.write("\n".join("' " + h for h in head) + "\n")
            f.write("\n".join(consts) + "\n\nasm {\n" + "\n".join(asm) + "\n}\n")
    if args.inc:
        with open(args.inc, 'w') as f:
            f.write("\n".join("; " + h for h in head) + "\n" + "\n".join(asm) + "\n")
    if args.consts:
        with open(args.consts, 'w') as f:
            f.write("\n".join(consts) + "\n")
    for l in lines:
        print(l)
    if args.wav or args.json:
        print('note: --wav/--json preview only the first score when merging', file=sys.stderr)
        mus = [e for e in entries if e[4] == 'music'][:len(build_music(sc0)[0])] if sc0.voices else []
        n = totals[0] * (args.loops if sc0.loop else 1) + (0 if sc0.loop else 60)
        states = simulate(mus, n, sc0.loop)
        if args.json:
            json.dump(states, open(args.json, 'w'))
        if args.wav:
            print(f"{args.wav}: {render_wav(states, args.wav):.2f} s")
    return 0


# --------------------------------------------------------------------------
# OS7 model: per-frame PSG state of the decoded streams (for previews)
# --------------------------------------------------------------------------
def simulate(entries, frames, loop=True):
    """Per-frame [p1,p2,p3,a1,a2,a3,an,ctrl] for the music streams.
    Each stream is decoded and played as OS7 does: an envelope steps after
    'first' frames, then every 'per' frames (avals-1 steps); a sweep the same
    way for its period.  Matches psgtrace of the real BIOS frame for frame
    (see RAPPORT-os7music.md)."""
    st = [0, 0, 0, 15, 15, 15, 15, 0]
    chans = {}
    for c, label, area, s, role in entries:
        if role == 'music':
            chans[s.ch] = timeline(s.b, s.ch, frames, loop)
    out = []
    for f in range(frames):
        for ch, tl in chans.items():
            per, atn, ctrl = tl[f]
            if ch == 0:
                st[6] = atn
                if ctrl is not None:
                    st[7] = ctrl
            else:
                if per is not None:
                    st[ch - 1] = per
                st[2 + ch] = atn
        out.append(list(st))
    return out


def timeline(b, ch, frames, loop):
    """decode one stream into per-frame (period, atn, ctrl)"""
    res = []
    i = 0
    per, ctrl = None, None
    while len(res) < frames:
        if i >= len(b):
            break
        c = b[i]
        if c & 0x30 == 0x10:           # end
            if c & 8 and loop:
                i = 0
                continue
            break
        if c & 0x20:                   # rest
            res += [(per, 15, ctrl)] * (c & 31)
            i += 1
            continue
        typ = c & 3
        if ch == 0:
            if typ == 0:
                ctrl, atn, n = b[i + 2] & 7, b[i + 2] >> 4, b[i + 3]
                res += [(None, atn, ctrl)] * n
                i += 4
            else:
                ctrl, atn, n = b[i + 1] & 7, b[i + 1] >> 4, b[i + 2]
                av, ap = b[i + 3], b[i + 4]
                for k, a in enumerate(env_values(atn, av, ap, n)):
                    res.append((None, a, ctrl))
                i += 5
            continue
        n0 = b[i + 1] | (b[i + 2] & 3) << 8
        atn = b[i + 2] >> 4
        if typ == 0:
            res += [(n0, atn, None)] * b[i + 3]
            per = n0
            i += 4
        elif typ == 2:
            for a in env_values(atn, b[i + 4], b[i + 5], b[i + 3]):
                res.append((n0, a, None))
            per = n0
            i += 6
        else:
            nv, pf, fs = b[i + 3], b[i + 4], b[i + 5]
            fs = fs - 256 if fs > 127 else fs
            d = (pf & 15) + (pf >> 4) * (nv - 1)
            ps = sweep_values(n0, nv, pf, fs)
            ats = env_values(atn, b[i + 6], b[i + 7], d) if typ == 3 else [atn] * d
            for k in range(d):
                res.append((ps[k], ats[k], None))
            per = ps[-1] if ps else n0
            i += 8 if typ == 3 else 6
    res += [(per, 15, ctrl)] * (frames - len(res))
    return res[:frames]


def env_values(atn, av, ap, n):
    step = av >> 4
    step = step - 16 if step > 7 else step
    vals, per, first = av & 15, ap >> 4, ap & 15
    out, a, left, k = [], atn, first, vals - 1
    for f in range(n):
        out.append(max(0, min(15, a)))
        left -= 1
        if left == 0 and k > 0:
            a += step
            k -= 1
            left = per
    return out


def sweep_values(n0, nv, pf, fs):
    per, first = pf >> 4, pf & 15
    out, n = [], n0
    d = first + per * (nv - 1)
    left, k = first, nv - 1
    for f in range(d):
        out.append(n & 1023)
        left -= 1
        if left == 0 and k > 0:
            n += fs
            k -= 1
            left = per
    return out


# --------------------------------------------------------------------------
# SN76489 render (same model as psgsynth.py)
# --------------------------------------------------------------------------
def render_wav(states, path, sr=44100):
    import numpy as np
    import wave
    CLK = 3579545.0
    r = 0x4000
    wh = np.zeros(32767, np.int8)
    for i in range(32767):
        wh[i] = r & 1
        r = (r >> 1) | (((r & 1) ^ ((r >> 1) & 1)) << 14)
    pe = np.zeros(15, np.int8)
    pe[0] = 1
    vol = np.array([10 ** (-2 * a / 20) for a in range(15)] + [0.0])
    n_total = int(len(states) * sr / FPS)
    out = np.zeros(n_total)
    ph = [0.0, 0.0, 0.0]
    nph = 0.0
    edges = (np.arange(len(states) + 1) * sr / FPS).astype(int)
    for k, s in enumerate(states):
        a, b = edges[k], min(edges[k + 1], n_total)
        m = b - a
        if m <= 0:
            continue
        idx = np.arange(1, m + 1)
        mix = np.zeros(m)
        f3 = None
        for c in range(3):
            N = s[c] or 1024
            f = CLK / (32 * N)
            p = ph[c] + idx * f / sr
            if c == 2:
                f3 = f
            ph[c] = p[-1] % 1e6
            if f < 20000:
                mix += vol[s[3 + c]] * np.where((p % 1) < 0.5, 1.0, -1.0)
        ctrl = s[7]
        sf = f3 if ctrl & 3 == 3 else CLK / (512 << (ctrl & 3))
        q = nph + idx * sf / sr
        nph = q[-1]
        seq = wh if ctrl & 4 else pe
        bits = seq[q.astype(np.int64) % len(seq)]
        mix += vol[s[6]] * (bits * 2.0 - 1.0)
        out[a:b] = mix
    y = out / 4.0 * 0.9 * 32767
    z = np.zeros_like(y)            # DC blocker (~10 Hz)
    prev_x = prev_y = 0.0
    for i in range(len(y)):
        prev_y = y[i] - prev_x + 0.9986 * prev_y
        prev_x = y[i]
        z[i] = prev_y
    z = np.clip(z, -32767, 32767).astype(np.int16)
    w = wave.open(path, 'wb')
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(z.tobytes())
    w.close()
    return len(z) / sr


def main():
    ap = argparse.ArgumentParser(description='Text score -> OS7 sound table for Amy (ColecoVision).')
    ap.add_argument('score', nargs='*', help='one score, or several to merge into one table (songs share the music areas)')
    ap.add_argument('-o', '--out', help='Amy fragment: consts + asm { } block')
    ap.add_argument('--inc', help='assembler include (table + data only)')
    ap.add_argument('--consts', help='const lines only')
    ap.add_argument('--wav', help='preview WAV of the music (OS7 model + SN76489 render)')
    ap.add_argument('--loops', type=int, default=2, help='loops in the preview (default 2)')
    ap.add_argument('--area-base', help='first sound area (default $702B), e.g. $72B0 when the game owns $702B+')
    ap.add_argument('--json', help='per-frame PSG states of the preview')
    ap.add_argument('--help-format', action='store_true', help='print the score format')
    args = ap.parse_args()
    if args.help_format:
        print(FORMAT_HELP)
        return 0
    if not args.score:
        ap.error('score file required')
    if args.area_base:
        global AREA_BASE, MUSIC_AREAS
        AREA_BASE = int(args.area_base.replace('$', '0x'), 0)
        MUSIC_AREAS = ['$%04X' % (AREA_BASE + 10 * i) for i in range(4)]
    try:
        scs = [parse(open(f).read(), os.path.basename(f)) for f in args.score]
        if len(scs) == 1:
            sc = scs[0]
            entries, total, areas, fx_area = build(sc)
        else:
            entries, totals, areas, fx_area = build_multi(scs)
            sc, total = scs[0], totals[0]
    except ScoreError as e:
        print('error:', e, file=sys.stderr)
        return 1
    if len(scs) > 1:
        return emit_multi(scs, entries, totals, areas, fx_area, args)
    for l in emit_files(sc, entries, total, areas, fx_area, args, args.score[0]):
        print(l)
    if args.wav or args.json:
        n = total * (args.loops if sc.loop else 1) + (0 if sc.loop else 60)
        states = simulate(entries, n, sc.loop)
        if args.json:
            json.dump(states, open(args.json, 'w'))
        if args.wav:
            print(f"{args.wav}: {render_wav(states, args.wav):.2f} s")
    return 0


if __name__ == '__main__':
    sys.exit(main())
