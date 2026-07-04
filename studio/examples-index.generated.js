// Generated lightweight examples directory. Do not add sourceText or projectFiles here.
export const exampleCategoryOrder = [
  "Minimal",
  "Language",
  "Numeric",
  "CVBasic Ports",
  "Demos",
  "Music",
  "Selftests",
  "Algorithms",
  "Games"
];

export const exampleEditorialTracks = {
  "MANUAL_CANON": "manual-canon",
  "LEGACY_COMPAT": "legacy-compat",
  "CVBASIC_PORT": "cvbasic-port"
};

const allExampleManifest = [
  {
    "id": "amy-timer-lab",
    "label": "Amy Timer Lab",
    "detail": "Regression lab for safe named timers: repeating every-N ticks and one-shot after-N ticks started explicitly by game state.",
    "projectName": "amy-timer-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-on-frame-lab",
    "label": "Amy On Frame Lab",
    "detail": "Regression lab for on frame SubName: generated NMI calls a parameterless Amy sub once per VBlank.",
    "projectName": "amy-on-frame-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-conditional-cstyle-lab",
    "label": "Amy C-Style Conditional Lab",
    "detail": "Regression lab for #define/#ifdef/#else/#endif plus inactive nested defines: disabled branches must not define symbols or emit duplicate subs.",
    "projectName": "amy-conditional-cstyle-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-conditional-compile-lab",
    "label": "Amy Conditional Compile Lab",
    "detail": "Regression lab for define/ifdef/ifndef: active debug branch compiles, inactive duplicate sub names do not collide or emit code.",
    "projectName": "amy-conditional-compile-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-surface-coverage",
    "label": "Amy Surface Coverage",
    "detail": "Exercises every canonical Amy statement form once, grouped by doc section. Compile failures indicate either a phantom doc claim or a real bug.",
    "projectName": "amy-surface-coverage",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "hello-world-minimal",
    "label": "Hello World Minimal",
    "detail": "Smallest useful Amy Mode 2 text hello world.",
    "projectName": "hello-world-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "manual-canon"
    ]
  },
  {
    "id": "amy-v22-surface-lab",
    "label": "Amy v2.2 Surface Lab",
    "detail": "Exercises the new print/get/put v2.2 text and frame surface directly in Studio.",
    "projectName": "amy-v22-surface-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Language",
    "tags": [
      "amy",
      "v2.2",
      "manual-canon"
    ]
  },
  {
    "id": "amy-frame-transpose-lab",
    "label": "Amy Frame Transpose Lab",
    "detail": "Visual regression for get frame / put frame dimensions: 21x1 text becomes 7x3, then 3x7, then 21x1 centered.",
    "projectName": "amy-frame-transpose-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-multicolor-pixel-lab",
    "label": "Amy Multicolor Pixel Lab",
    "detail": "Minimal Graphics Mode 3 example: clear pattern bytes, set multicolor pixels, read one pixel back.",
    "projectName": "amy-multicolor-pixel-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-mode3-dispatch-lab",
    "label": "Amy Mode 3 Dispatch Lab",
    "detail": "Self-checking pset/pget mode-dispatch: plain pset and pget route to Mode 3 after 'multicolor screen'. Verifies on-shape, off-shape, corners, and clipped-edge safety.",
    "projectName": "amy-mode3-dispatch-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-mode3-line-lab",
    "label": "Amy Mode 3 Line/Box Lab",
    "detail": "Self-checking lab: dy=0 line routes to hline, steep/45-deg lines, off-screen endpoint, degenerate x1=x2, and box fill. All verified via pget readback.",
    "projectName": "amy-mode3-line-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-vdp-pattern-tools-lab",
    "label": "Amy VDP Pattern Tools Lab",
    "detail": "Smoke-tests migrated lib4ksa-style pattern helpers: masked merge, reflect, and rotate.",
    "projectName": "amy-vdp-pattern-tools-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "pause-until-press-demo",
    "label": "Pause Until Press",
    "detail": "Minimal release-then-press fire-button pause helper demo.",
    "projectName": "pause-until-press-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "record-array-minimal",
    "label": "Record Array Minimal",
    "detail": "Smoke-tests global records plus array-of-record field stride with two text tiles.",
    "projectName": "record-array-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "manual-canon"
    ]
  },
  {
    "id": "nested-record-array-minimal",
    "label": "Nested Record Array Minimal",
    "detail": "Smoke-tests nested record fields plus array-of-record stride with two text tiles.",
    "projectName": "nested-record-array-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "manual-canon"
    ]
  },
  {
    "id": "sprite-minimal",
    "label": "Sprite Minimal",
    "detail": "One sprite on a Mode 2 text bootstrap with minimal setup.",
    "projectName": "sprite-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "sprites",
      "manual-canon"
    ]
  },
  {
    "id": "dsound-voice-minimal",
    "label": "DSound Voice Minimal",
    "detail": "Inline DSOUND smoke test plus comments for replacing the stub with a Studio-generated voice clip.",
    "projectName": "dsound-voice-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "manual-canon"
    ]
  },
  {
    "id": "input-loop-minimal",
    "label": "Input Loop Minimal",
    "detail": "Moves a text cursor with canonical inline joypad input.",
    "projectName": "input-loop-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "manual-canon"
    ]
  },
  {
    "id": "collision-minimal",
    "label": "Collision Minimal",
    "detail": "Moves a sprite through another and shows the VDP coincidence bit state.",
    "projectName": "collision-minimal",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Minimal",
    "tags": [
      "amy",
      "minimal",
      "collision",
      "manual-canon"
    ]
  },
  {
    "id": "collision-box-test",
    "label": "Collision Box Test",
    "detail": "Three sprites: one stationary at center, one bouncing on Y (same X), one bouncing on X (same Y). Displays HIT/--- per pair using named sprite hitboxes.",
    "projectName": "collision-box-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "collision",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "text-screen-demo",
    "label": "Text Screen Demo",
    "detail": "Compatibility demo for the convenience `text screen` bootstrap.",
    "projectName": "text-screen-demo",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Minimal",
    "tags": [
      "amy",
      "legacy-compat"
    ]
  },
  {
    "id": "amy-qbasic-flow-demo",
    "label": "Amy QBASIC Flow Demo",
    "detail": "First QBASIC-like syntax demo using label shorthand, IF/ELSE/END IF, and EXIT/CONTINUE across DO, FOR, and WHILE.",
    "projectName": "amy-qbasic-flow-demo",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Language",
    "tags": [
      "amy",
      "qbasic",
      "legacy-compat"
    ]
  },
  {
    "id": "amy-math-demo",
    "label": "Amy Math Demo",
    "detail": "Math formatting, sqrt, u32 chain validation, and BCD output.",
    "projectName": "amy-math-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-compare-fixed-demo",
    "label": "Amy Compare Fixed Demo",
    "detail": "Displays the current numeric families using type-aware print forms.",
    "projectName": "amy-compare-fixed-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-arithmetic-mix-demo",
    "label": "Amy Arithmetic Mix Demo",
    "detail": "Signed, unsigned, and fixed-point arithmetic smoke test with visible PASS/FAIL cells.",
    "projectName": "amy-arithmetic-mix-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-u16-divide-lab",
    "label": "Amy U16 Divide Lab",
    "detail": "Minimal unsigned 16-bit `/=` runtime divide smoke test.",
    "projectName": "amy-u16-divide-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-i16-divide-lab",
    "label": "Amy I16 Divide Lab",
    "detail": "Minimal signed 16-bit `/=` runtime divide smoke test.",
    "projectName": "amy-i16-divide-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-modulo-lab",
    "label": "Amy Modulo Lab",
    "detail": "Self-checking integer `%` and `mod` expression test for u8/u16/i8/i16.",
    "projectName": "amy-modulo-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-bounce-edge-lab",
    "label": "Amy Bounce Edge Lab",
    "detail": "Self-checking bounce edge test for skipped byte bounds and exact bound hits.",
    "projectName": "amy-bounce-edge-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-u32-multiply-lab",
    "label": "Amy U32 Multiply Lab",
    "detail": "Minimal unsigned 32-bit `*=` runtime multiply smoke test.",
    "projectName": "amy-u32-multiply-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-u32-divide-lab",
    "label": "Amy U32 Divide Lab",
    "detail": "Minimal unsigned 32-bit `/=` runtime divide smoke test.",
    "projectName": "amy-u32-divide-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed-multiply-lab",
    "label": "Amy Fixed Multiply Lab",
    "detail": "Minimal fixed 8.8 `*=` runtime multiply smoke test.",
    "projectName": "amy-fixed-multiply-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed-divide-lab",
    "label": "Amy Fixed Divide Lab",
    "detail": "Minimal fixed 8.8 `/=` runtime divide smoke test.",
    "projectName": "amy-fixed-divide-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-selftest",
    "label": "Amy Fixed32 Selftest",
    "detail": "Basic fixed32 add, multiply, negative-result math, whole-value sqrt, and decimal print smoke test.",
    "projectName": "amy-fixed32-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-multiply-lab",
    "label": "Amy Fixed32 Multiply Lab",
    "detail": "Strategic fixed32 multiply debug screen covering zero, one, halves, and signed combinations.",
    "projectName": "amy-fixed32-multiply-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-multiply-bytes",
    "label": "Amy Fixed32 Multiply Bytes",
    "detail": "Raw-byte fixed32 multiply debug screen showing decimal output plus result bytes [3..0].",
    "projectName": "amy-fixed32-multiply-bytes",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-divide-lab",
    "label": "Amy Fixed32 Divide Lab",
    "detail": "Focused fixed32 divide debug screen covering identity, halves, signed cases, and divide-by-zero behavior.",
    "projectName": "amy-fixed32-divide-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-abs-lab",
    "label": "Amy Fixed32 Abs Lab",
    "detail": "Statement-style fixed32 absolute value lab covering negative, positive, and zero inputs.",
    "projectName": "amy-fixed32-abs-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-random-lab",
    "label": "Amy Fixed32 Random Lab",
    "detail": "Statement-style fixed32 fractional random lab showing 0.0 .. <1.0 samples.",
    "projectName": "amy-fixed32-random-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-storage-lab",
    "label": "Amy FP5 Storage Lab",
    "detail": "Byte-level smoke test for 5-byte fp5 zero-init and fp5-to-fp5 copy.",
    "projectName": "amy-float-storage-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-convert-lab",
    "label": "Amy FP5 Convert Lab",
    "detail": "Byte-level smoke test for u16/i16 to 5-byte fp5 conversion.",
    "projectName": "amy-float-convert-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-abs-lab",
    "label": "Amy FP5 Abs Lab",
    "detail": "Byte-level fp5 absolute-value smoke test using integer and positive sources.",
    "projectName": "amy-float-abs-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-random-lab",
    "label": "Amy FP5 Random Lab",
    "detail": "Byte-level smoke test for fp5 random values in the 0.0 .. <1.0 range.",
    "projectName": "amy-float-random-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-random-range-lab",
    "label": "Amy FP5 Random Range Lab",
    "detail": "Smoke test for fp5 random(min,max), including fp5 variable bounds and negative ranges.",
    "projectName": "amy-float-random-range-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-print-lab",
    "label": "Amy FP5 Print Lab",
    "detail": "Exact-format smoke test for fp5 printing with strict digits 16.",
    "projectName": "amy-float-print-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-compare-lab",
    "label": "Amy FP5 Compare Lab",
    "detail": "Truth-table style fp5 compare test with both expected true and expected false results, including zero, negative, literal-boundary, and fractional cases.",
    "projectName": "amy-float-compare-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-addsub-lab",
    "label": "Amy FP5 Add/Sub Lab",
    "detail": "Human-readable smoke test for fp5 += and -= with positive and negative integer sources.",
    "projectName": "amy-float-addsub-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-cancellation-lab",
    "label": "Amy FP5 Cancellation Lab",
    "detail": "Stress test for near-equal subtraction and subtract-after-divide in fp5.",
    "projectName": "amy-float-cancellation-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-muldiv-lab",
    "label": "Amy FP5 Mul/Div Lab",
    "detail": "Human-readable smoke test for native fp5 *= plus the current bridged fp5 /= path.",
    "projectName": "amy-float-muldiv-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-divide-truth-lab",
    "label": "Amy FP5 Divide Truth Lab",
    "detail": "Division-focused fp5 validation across zero, one, small, large, and signed cases.",
    "projectName": "amy-float-divide-truth-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-log-lab",
    "label": "Amy FP5 Log Lab",
    "detail": "First fp5 log tranche: exact power-of-two anchors, domain clamps, and a first interior approximation.",
    "projectName": "amy-float-log-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-exp-lab",
    "label": "Amy FP5 Exp Lab",
    "detail": "Experimental fp5 exp smoke test: exp(0), exp(1), and log/exp round-trip checks while exp remains backlogged for improvement.",
    "projectName": "amy-float-exp-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-sign-int-lab",
    "label": "Amy FP5 Sign / Int Lab",
    "detail": "Exact fp5 sign classification and floor-style int helper verification on zero, positive, negative, and fractional values.",
    "projectName": "amy-float-sign-int-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-sqrt-lab",
    "label": "Amy FP5 Sqrt Lab",
    "detail": "Human-readable smoke test for fp5 sqrt via the current fixed32 bridge.",
    "projectName": "amy-float-sqrt-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-sqrt-precision-lab",
    "label": "Amy FP5 Sqrt Precision Lab",
    "detail": "Regression case for repeated nested fp5 sqrt followed by repeated self-square recovery near 65535.",
    "projectName": "amy-float-sqrt-precision-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-sqrt-byte-lab",
    "label": "Amy FP5 Sqrt Byte Lab",
    "detail": "Raw-byte diagnostic for sqrt(65535) and the first fp5 self-square recovery.",
    "projectName": "amy-float-sqrt-byte-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-builtin-surface-lab",
    "label": "Amy FP5 Builtin Surface Lab",
    "detail": "End-to-end smoke test for rnd, sqr, sgn, int, str$, and fp5 ^= 2, including exact print vs friendly str$ with fp5 source spelling.",
    "projectName": "amy-float-builtin-surface-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-str-buffer-lab",
    "label": "Amy FP5 Str$ Buffer Lab",
    "detail": "Friendly fp5 string smoke test for str$ into 16-byte buffers, displayed with put/count using fp5 declarations.",
    "projectName": "amy-float-str-buffer-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-numeric-str-lab",
    "label": "Amy Numeric Str$ Lab",
    "detail": "Coverage lab proving str$(Value) works for every current numeric family without a general heap/string runtime.",
    "projectName": "amy-numeric-str-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-format-bytes",
    "label": "Amy Fixed32 Format Bytes",
    "detail": "Formatter debug screen showing the raw ASCII byte codes produced by fixed32 digits-11 formatting.",
    "projectName": "amy-fixed32-format-bytes",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-sqrt-lab",
    "label": "Amy Fixed32 Sqrt Lab",
    "detail": "Direct fixed32 sqrt checks plus sqrt/sqrt/^2/^2 drift checks to expose rounding bias.",
    "projectName": "amy-fixed32-sqrt-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-ahl-benchmark-sketch",
    "label": "Ahl Benchmark",
    "detail": "Runnable Creative Computing / Ahl benchmark rewrite using current fixed32 statement surfaces.",
    "projectName": "amy-ahl-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-float-ahl-benchmark",
    "label": "Ahl Float Benchmark",
    "detail": "Creative Computing / Ahl benchmark using current AMY fp5 surfaces.",
    "projectName": "amy-float-ahl-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed32-square-lab",
    "label": "Amy Fixed32 Square Lab",
    "detail": "Focused fixed32 square debug screen for the new ^= 2 convenience surface.",
    "projectName": "amy-fixed32-square-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-fixed-ufixed-playground",
    "label": "Amy Fixed / UFixed Playground",
    "detail": "Interactive numeric playground for fixed, ufixed, floor, and formula-style operators.",
    "projectName": "amy-fixed-ufixed-playground",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-numeric-regression-demo",
    "label": "Amy Numeric Consolidation Demo",
    "detail": "Covers display, widening casts, mixed compares, and fixed-point addition.",
    "projectName": "amy-numeric-regression-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-numeric-edge-cases-demo",
    "label": "Amy Numeric Edge Cases Demo",
    "detail": "Boundary-value rendering and comparisons for the main numeric families.",
    "projectName": "amy-numeric-edge-cases-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-numeric-overflow-demo",
    "label": "Amy Numeric Overflow Demo",
    "detail": "Shows wrap, overflow, BCD carry/borrow, and fixed-point edge behavior.",
    "projectName": "amy-numeric-overflow-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Language",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "amy-numeric-local32-demo",
    "label": "Amy Numeric Local 32 Demo",
    "detail": "Regression screen for stack-backed local u32 and i32 values.",
    "projectName": "amy-numeric-local32-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Numeric",
    "tags": [
      "amy",
      "numeric",
      "manual-canon"
    ]
  },
  {
    "id": "cvbasic-happy-face-port",
    "label": "CVBasic Happy Face Port",
    "detail": "Amy port of CVBasic happy_face.bas with the same core bouncing-face behavior.",
    "projectName": "cvbasic-happy-face-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-face-joystick-port",
    "label": "CVBasic Face Joystick Port",
    "detail": "Amy port of CVBasic face_joystick.bas using joypad input, VDP status display, and sprite color changes.",
    "projectName": "cvbasic-face-joystick-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-test3-port",
    "label": "CVBasic Test3 Port",
    "detail": "Amy port of CVBasic test3.bas showcasing select case and sprite-state movement.",
    "projectName": "cvbasic-test3-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "selftest",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-test1-port",
    "label": "CVBasic Test1 Port",
    "detail": "Amy port of CVBasic test1.bas using frame display and moving stars in VRAM.",
    "projectName": "cvbasic-test1-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "selftest",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-controller-port",
    "label": "CVBasic Controller Port",
    "detail": "Amy port of CVBasic controller.bas with dual controller polling, live highlights, and keypad focus.",
    "projectName": "cvbasic-controller-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-vramcopy-port",
    "label": "CVBasic Vramcopy Port",
    "detail": "Amy port of CVBasic vramcopy.bas using define chars/colors, direct vpoke expressions, and bulk VRAM readback.",
    "projectName": "cvbasic-vramcopy-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-spinner-port",
    "label": "CVBasic Spinner Port",
    "detail": "Amy port of CVBasic spinner.bas using spinner deltas to steer a 16x16 happy-face sprite.",
    "projectName": "cvbasic-spinner-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-plot-port",
    "label": "CVBasic Plot Port",
    "detail": "Amy port of CVBasic plot.bas using native TMS9918A bitmap drawing primitives such as pset, line, and circle.",
    "projectName": "cvbasic-plot-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-vgm-player-port",
    "label": "CVBasic VGM Player Port",
    "detail": "Amy port of CVBasic vgm.bas using on frame plus a tiny embedded SN76489 VGM stream.",
    "projectName": "cvbasic-vgm-player-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-viboritas-port",
    "label": "CVBasic Viboritas Port",
    "detail": "Amy port of Oscar Toledo's Viboritas demo: a 1990 Z80 assembler game revised for CVBasic in Feb 2024.",
    "projectName": "cvbasic-viboritas-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "cvbasic-demo-port",
    "label": "CVBasic Demo Port",
    "detail": "Amy port of CVBasic demo.bas with bold text, portrait block animation, staged messages, and sprite scenes.",
    "projectName": "cvbasic-demo-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ]
  },
  {
    "id": "compressed-picture-demo",
    "label": "Warrior Slideshow",
    "detail": "Compressed Warrior Mode 2 bitmap slideshow sample for size and render comparison.",
    "projectName": "warrior-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "warrior-nibble",
    "label": "Warrior Nibble",
    "detail": "Warrior Mode 2 bitmap using the Nibble codec for preview and runtime decompression.",
    "projectName": "warrior-nibble",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "barbarian-slideshow",
    "label": "Barbarian Slideshow",
    "detail": "Compressed slideshow variant for visual and ROM-size comparison.",
    "projectName": "barbarian-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "warrior-barbarian-slideshow",
    "label": "Warrior + Barbarian Slideshow",
    "detail": "Two compressed Mode 2 bitmap pictures shown in sequence with a 250-frame delay.",
    "projectName": "warrior-barbarian-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "game-variables-demo",
    "label": "Game Variables Demo",
    "detail": "Small state-driven demo for u8/u16 mutation and text updates.",
    "projectName": "game-variables-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "tile-collision-maze",
    "label": "Tile Collision Maze",
    "detail": "Maze-like gameplay demo using tile types, pixel-to-tile collision, and collectible lookup.",
    "projectName": "tile-collision-maze",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "collision",
      "manual-canon"
    ]
  },
  {
    "id": "sprite-momentum-platformer",
    "label": "Sprite Momentum Platformer",
    "detail": "16x16 sprite platformer test with momentum, gravity, wall collision, landing, and coin pickup.",
    "projectName": "sprite-momentum-platformer",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "sprites",
      "manual-canon"
    ]
  },
  {
    "id": "snake-demo",
    "label": "Snake Demo",
    "detail": "Gameplay demo kept as a more machine-shaped flow-control comparison sample.",
    "projectName": "snake-demo",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Demos",
    "tags": [
      "amy",
      "legacy-compat"
    ]
  },
  {
    "id": "rebound-demo",
    "label": "Rebound Demo",
    "detail": "Simple arcade-style motion demo for control and rendering comparison.",
    "projectName": "rebound-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "lottery-ticket-demo",
    "label": "Lottery Ticket Demo",
    "detail": "Procedural text-generation demo with multiple label-driven routines.",
    "projectName": "lottery-ticket-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "cvbasic-vpoke-demo",
    "label": "CVBasic Vpoke Demo",
    "detail": "Direct VRAM write demo kept for CVBasic-side comparison.",
    "projectName": "cvbasic-vpoke-demo",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Demos",
    "tags": [
      "amy",
      "cvbasic",
      "legacy-compat"
    ]
  },
  {
    "id": "cvbasic-data-array-demo",
    "label": "CVBasic Data Array Demo",
    "detail": "Data-array oriented sample for comparing source ergonomics with CVBasic.",
    "projectName": "cvbasic-data-array-demo",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Demos",
    "tags": [
      "amy",
      "cvbasic",
      "legacy-compat"
    ]
  },
  {
    "id": "wipe-screen-demo",
    "label": "Wipe Screen Demo",
    "detail": "Classic screen-transition demo for visual and code-size comparison.",
    "projectName": "wipe-screen-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "united-states-flag-mode3",
    "label": "United States Flag Mode 3",
    "detail": "Atari BASIC flag idea adapted to ColecoVision multicolor mode with boxes and pset multicolor stars.",
    "projectName": "united-states-flag-mode3",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "canada-flag-mode3",
    "label": "Canada Flag Mode 3",
    "detail": "Stylized Canadian flag drawn in ColecoVision multicolor mode with boxes and a compact pixel maple leaf.",
    "projectName": "canada-flag-mode3",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "africa-music-box",
    "label": "Africa Music Box",
    "detail": "Music-box demo for song-control workflow and source clarity comparison.",
    "projectName": "africa-music-box",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "manual-canon"
    ]
  },
  {
    "id": "happy-birthday-sound-demo",
    "label": "Happy Birthday Sound Demo",
    "detail": "Two-slot sound-table demo for compact audio workflow comparison.",
    "projectName": "happy-birthday-sound-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "old-devkit-page-flip",
    "label": "Old Devkit Page Flip",
    "detail": "Legacy-style double-buffered name-table demo using set screen pages and swap screens.",
    "projectName": "old-devkit-page-flip",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "old-devkit-10years",
    "label": "30th Anniversary Cake",
    "detail": "1996-2026 ColecoVision anniversary version of the 2006 10-years cake demo with Happy Birthday sound playback.",
    "projectName": "amy-30th-anniversary",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "commando-music-box",
    "label": "Commando Music Box",
    "detail": "Title-screen plus keypad music-box demo kept in legacy-compat for its state-machine style.",
    "projectName": "commando-music-box",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "legacy-compat"
    ]
  },
  {
    "id": "commando-tiny-music-box",
    "label": "Commando Tiny Music",
    "detail": "Minimal SPECIAL-04 tiny-music playback sample to verify compact old-devkit music support.",
    "projectName": "commando-tiny-music-box",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "legacy-compat"
    ]
  },
  {
    "id": "brinquitos-tiny-music-demo",
    "label": "Brinquitos Tiny Music",
    "detail": "Converted CVBasic MUSIC blocks played through Amy SPECIAL-04 tiny sound.",
    "projectName": "brinquitos-tiny-music-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "manual-canon"
    ]
  },
  {
    "id": "brinquitos-game-demo",
    "label": "Brinquitos Game",
    "detail": "Amy port of Oscar Toledo's CVBasic Brinquitos jumping game, presented on AtariAge Oct 14 2024; Brinco means jump, Brinquitos means little jumps.",
    "projectName": "brinquitos-game-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "diamond-dash",
    "label": "Diamond Dash",
    "detail": "Amy port of Daniel Bienvenu's legacy devkit Diamond Dash game.",
    "projectName": "diamond-dash",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "portal-demo",
    "label": "Portal Demo",
    "detail": "Amy port of old-projects-sdcc-z80/sdcctest/portal: ZX0 graphics, sprite-pattern upload, VBlank equalizer sprites, and original BIOS sound table.",
    "projectName": "portal-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "smooth-criminal-music",
    "label": "Smooth Criminal Music",
    "detail": "Amy port of old-projects-sdcc-z80/sdcctest/smoothc: Smooth Criminal BIOS sound table with VBlank equalizer sprites and ZX0 graphics assets.",
    "projectName": "smooth-criminal-music",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "manual-canon"
    ]
  },
  {
    "id": "subscribers-thank-you-music",
    "label": "Subscribers Thank You Music",
    "detail": "Amy port inspired by old-projects-sdcc-z80/sdcctest/subscribers: 2009 newcoleco YouTube subscriber thank-you screen, real icon art, NMI equalizer sprites, and original BIOS music table.",
    "projectName": "subscribers-thank-you-music",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "manual-canon"
    ]
  },
  {
    "id": "santas-gift-run",
    "label": "Santa's Gift Run (Incomplete)",
    "detail": "Incomplete Amy port of Daniel Bienvenu's legacy Santa's Gift Run from old-projects-sdcc-z80/sdcctest/giftrun/main.c. Graphics and BIOS sounds are converted; gift-drop and house behavior still need closer matching.",
    "projectName": "santas-gift-run",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "421",
    "label": "421 Dice (Incomplete)",
    "detail": "Incomplete archival Amy port of Mathieu Proulx and Daniel Bienvenu's legacy devkit 421 dice project. The HUD, ICVGM graphics, dice display, and converted BIOS sounds are preserved, but the full game rules are not implemented yet.",
    "projectName": "421",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "meteor-dodge",
    "label": "Meteor Dodge",
    "detail": "Dodge 3 falling space rocks with your ship. 3 lives, 16x16 sprites, software collision, and random meteor paths.",
    "projectName": "meteor-dodge",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "chateau-du-dragon",
    "label": "Chateau du Dragon",
    "detail": "AMY text-adventure remake inspired by Daniel Bienvenu's legacy Chateau du Dragon, with the original title picture extracted as modern picture assets.",
    "projectName": "chateau-du-dragon",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "cosmo-trainer-port",
    "label": "Cosmo Trainer Inspired",
    "detail": "AMY training demo inspired by Marcel de Kogel's Cosmo Trainer, not a source-faithful port.",
    "projectName": "cosmo-trainer-port",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "port",
      "manual-canon"
    ]
  },
  {
    "id": "amy-selftest",
    "label": "Amy Selftest",
    "detail": "General regression screen that helped expose language gaps during the remake.",
    "projectName": "amy-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-compound-expression-test",
    "label": "Amy Compound Expression Test",
    "detail": "Regression test for compound assignments whose right side contains runtime variables.",
    "projectName": "amy-compound-expression-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-screen-test",
    "label": "Amy Screen Test",
    "detail": "Small display smoke test for bootstrap and print behavior.",
    "projectName": "amy-screen-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-loop-test",
    "label": "Amy Loop Test",
    "detail": "Loop and put-char selftest useful for checking structured flow output.",
    "projectName": "amy-loop-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-feature-test",
    "label": "Amy Feature Test",
    "detail": "Feature regression screen covering arrays, booleans, shifts, and indexed goto/gosub dispatch.",
    "projectName": "amy-feature-test",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "legacy-compat"
    ]
  },
  {
    "id": "amy-for-counter-test",
    "label": "Amy For Counter Test",
    "detail": "Focused for-loop counter selftest.",
    "projectName": "amy-for-counter-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-downto-counter-test",
    "label": "Amy Downto Counter Test",
    "detail": "Focused downto-loop selftest.",
    "projectName": "amy-downto-counter-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-for-putchar-test",
    "label": "Amy For PutChar Test",
    "detail": "Simple loop-and-render selftest.",
    "projectName": "amy-for-putchar-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-manual-loop-putchar-test",
    "label": "Amy Manual Loop PutChar Test",
    "detail": "Low-level loop comparison screen beside the structured loop variants.",
    "projectName": "amy-manual-loop-putchar-test",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "legacy-compat"
    ]
  },
  {
    "id": "amy-bcd-selftest",
    "label": "Amy BCD Selftest",
    "detail": "BCD regression screen used to validate the new generic numeric surface.",
    "projectName": "amy-bcd-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-min-max-expression-test",
    "label": "Amy Min/Max Expression Test",
    "detail": "Focused expression selftest for min(A,B) and max(A,B) on byte and word values.",
    "projectName": "amy-min-max-expression-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-runtime-input-expression-test",
    "label": "Amy Runtime Input Expression Test",
    "detail": "Focused expression selftest for spinner(N), frame, and vdp.status.",
    "projectName": "amy-runtime-input-expression-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-random-expression-test",
    "label": "Amy Random Expression Test",
    "detail": "Focused expression selftest for random(N) and inclusive random(A,B).",
    "projectName": "amy-random-expression-test",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-function-selftest",
    "label": "Amy Function Selftest",
    "detail": "Exercises nested function calls, function use in IF/PRINT, and local stack arrays.",
    "projectName": "amy-function-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "amy-recursive-selftest",
    "label": "Amy Recursive Selftest",
    "detail": "Exercises recursive function calls with stack-based parameters and locals.",
    "projectName": "amy-recursive-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
    "tags": [
      "amy",
      "selftest",
      "manual-canon"
    ]
  },
  {
    "id": "bubble-sort-bars",
    "label": "Bubble Sort Bars",
    "detail": "Visual sorting demo for comparing clarity and generated size against CVBasic.",
    "projectName": "bubble-sort-bars",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Algorithms",
    "tags": [
      "amy",
      "algorithms",
      "manual-canon"
    ]
  },
  {
    "id": "insertion-sort-bars",
    "label": "Insertion Sort Bars",
    "detail": "Visual insertion sort demo kept for more label-driven comparison flow.",
    "projectName": "insertion-sort-bars",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Algorithms",
    "tags": [
      "amy",
      "algorithms",
      "legacy-compat"
    ]
  },
  {
    "id": "heap-sort-bars",
    "label": "Heap Sort Bars",
    "detail": "Visual heap sort demo kept as a machine-like control-flow sample.",
    "projectName": "heap-sort-bars",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Algorithms",
    "tags": [
      "amy",
      "algorithms",
      "legacy-compat"
    ]
  },
  {
    "id": "quick-sort-bars",
    "label": "Quick Sort Bars",
    "detail": "Visual quicksort demo kept for stack/partition style comparison flow.",
    "projectName": "quick-sort-bars",
    "sourceLang": "amy",
    "editorialTrack": "legacy-compat",
    "category": "Algorithms",
    "tags": [
      "amy",
      "algorithms",
      "legacy-compat"
    ]
  },
  {
    "id": "three-sort-algorithms",
    "label": "Three Sort Algorithms",
    "detail": "One visual listing comparing bubble, insertion, and selection sort.",
    "projectName": "three-sort-algorithms",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Algorithms",
    "tags": [
      "amy",
      "algorithms",
      "manual-canon"
    ]
  }
];

const publicExampleIds = new Set([
  "hello-world-minimal",
  "sprite-minimal",
  "input-loop-minimal",
  "collision-minimal",
  "dsound-voice-minimal",
  "rebound-demo",
  "warrior-barbarian-slideshow",
  "africa-music-box",
  "commando-music-box",
  "commando-tiny-music-box",
  "cvbasic-happy-face-port",
  "cvbasic-face-joystick-port",
  "cvbasic-controller-port",
  "cvbasic-vramcopy-port",
  "cvbasic-spinner-port",
  "cvbasic-plot-port",
  "cvbasic-demo-port",
  "cvbasic-viboritas-port",
  "three-sort-algorithms",
  "united-states-flag-mode3",
  "canada-flag-mode3",
  "snake-demo",
  "tile-collision-maze",
  "sprite-momentum-platformer",
  "old-devkit-10years",
  "meteor-dodge",
  "brinquitos-game-demo",
  "smooth-criminal-music",
  "diamond-dash",
  "chateau-du-dragon",
]);

export const exampleManifest = allExampleManifest.filter((item) => publicExampleIds.has(item.id));
