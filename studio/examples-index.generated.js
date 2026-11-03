// Generated lightweight examples directory. Do not add sourceText or projectFiles here.
// Run: node tools/generate-examples-index.mjs
export const exampleCategoryOrder = [
  "Minimal",
  "Language",
  "Numeric",
  "CVBasic Ports",
  "Benchmarks",
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

export const exampleOriginLabels = {
  "faithful-adaptation": "Faithful adaptation",
  "expanded-adaptation": "Adaptation + expanded AI",
  "reimagined-adaptation": "Reimagined adaptation",
  "inspired": "Inspired work",
  "original": "Original",
  "adaptation-collection": "Original collection of adaptations"
};

export const exampleManifest = [
  {
    "id": "coleco-bios-options",
    "label": "Coleco BIOS Options",
    "detail": "Displays the authentic eight-choice OS7 skill/player screen, then uses Amy's menu command for cursor and input handling.",
    "projectName": "coleco-bios-options",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "colecovision",
      "os7",
      "bios",
      "menu"
    ]
  },
  {
    "id": "megacart-bank-demo",
    "label": "MegaCart Banked Data",
    "detail": "A complete 128 KB MegaCart project with editable Amy banks, explicit exports, a safe banked procedure call, raw VRAM/RAM copies, and direct banked decompression.",
    "projectName": "MegaCart Bank Demo",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "buildTarget": {
      "platform": "colecovision-megacart",
      "medium": "rom",
      "romSizeKb": 128
    },
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "colecovision",
      "megacart",
      "banks",
      "mdkrle",
      "manual-canon"
    ]
  },
  {
    "id": "adam-eos-filesystem-demo",
    "label": "ADAM Native EOS Filesystem",
    "detail": "Creates, writes, reads, and deletes a named EOS file on writable DSK or DDP media using modern Amy syntax.",
    "projectName": "adam-eos-filesystem-demo",
    "sourceLang": "amy",
    "memoryProfile": "adam-eos-application",
    "buildTarget": {
      "platform": "adam-native-program",
      "medium": "dsk",
      "memoryProfile": "adam-eos-application"
    },
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "adam",
      "eos",
      "filesystem",
      "dsk",
      "ddp"
    ]
  },
  {
    "id": "adam-os7-eos-hybrid-storage",
    "label": "ADAM OS7 + EOS Hybrid Storage",
    "detail": "Keeps an OS7-style game runtime while using EOS writable media for an optional save file.",
    "projectName": "adam-os7-eos-hybrid-storage",
    "sourceLang": "amy",
    "memoryProfile": "adam-os7-eos-drivers",
    "buildTarget": {
      "platform": "adam-disk",
      "medium": "dsk",
      "memoryProfile": "adam-os7-eos-drivers"
    },
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "adam",
      "os7",
      "eos",
      "hybrid",
      "filesystem"
    ]
  },
  {
    "id": "where-on-earth-adam",
    "label": "Where On Earth? ADAM Edition",
    "detail": "Bootable ADAM disk edition with selectable LANDMARKS and MILESTONES WEPK question packs loaded independently from disk.",
    "projectName": "where-on-earth-adam",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "adam",
      "multifile",
      "history",
      "data-pack",
      "wepk"
    ]
  },
  {
    "id": "adam-multifile-adventure-demo",
    "label": "ADAM Multifile Adventure Lab",
    "detail": "Original interactive architecture demo with separate Amy files for navigation, encounters, and device services. It currently builds as a ColecoVision compatibility cartridge while the native ADAM backend is developed.",
    "projectName": "adam-multifile-adventure-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "multifile",
      "adam",
      "architecture",
      "manual-canon"
    ]
  },
  {
    "id": "globe-quiz",
    "label": "Where On Earth?",
    "detail": "Find world cities on a rotatable 3D globe built from 48 views, three shared Graphics II tile dictionaries, a sprite crosshair, and distance-based scoring.",
    "projectName": "globe-quiz",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "game",
      "geography",
      "3d",
      "tms9918a",
      "zx0",
      "sprites"
    ]
  },
  {
    "id": "3d-maze-escape",
    "label": "3D Maze Escape",
    "detail": "Escape a magnified first-person TMS9918A maze using three permanent ZX0 tile dictionaries, NAME-only animation, a locator HUD, footsteps, timer, and result sequence.",
    "projectName": "3d-maze-escape",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "game",
      "maze",
      "3d",
      "tms9918a",
      "zx0",
      "sprites"
    ]
  },
  {
    "id": "sp0256-voice-module-demo",
    "label": "SP0256 Voice Module",
    "detail": "Detects the external $43/$44/$45 voice adapter and speaks an asynchronous SP0256-AL2 allophone phrase.",
    "projectName": "sp0256-voice-module-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "voice",
      "sp0256",
      "hardware"
    ]
  },
  {
    "id": "solar-system-encyclopedia",
    "label": "3D Solar System",
    "detail": "Eleven animated celestial bodies with shared sprite masks, ZX0 graphics, facts, and a CRT-safe menu.",
    "projectName": "solar-system-encyclopedia",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "graphics",
      "animation",
      "zx0",
      "sprites"
    ]
  },
  {
    "id": "space-taxi-voice-demo",
    "label": "Space Taxi VoxPCM Voice Demo",
    "detail": "Captioned Hey Taxi, pad 1-9, up, please and thanks phrases assembled from reusable adaptive VoxPCM words.",
    "projectName": "space-taxi-voice-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "voice",
      "voxpcm",
      "manual-canon"
    ]
  },
  {
    "id": "earth-globe-demo",
    "label": "Earth Globe",
    "detail": "A 12-frame rotating Earth built from compact 8x8 tile maps and a shared Graphics II charset.",
    "projectName": "earth-globe-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "graphics",
      "animation",
      "manual-canon"
    ]
  },
  {
    "id": "mickey-120-color-picture",
    "label": "Mickey 120-Color Picture",
    "detail": "A verified historical Mickey image demonstrating temporal 120-color display with two ZX0-compressed dual-purpose VRAM banks.",
    "projectName": "mickey-120-color-picture",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "graphics",
      "120c",
      "temporal",
      "historical",
      "zx0"
    ]
  },
  {
    "id": "picture-show-120c",
    "label": "Picture Show: 120 Colors",
    "detail": "An original two-picture gallery demonstrating Amy's temporal 120-color display and ZX0-compressed dual-purpose VRAM banks, with controller-driven switching.",
    "projectName": "Picture Show: 120 Colors",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "original",
      "graphics",
      "120c",
      "temporal",
      "zx0",
      "controller",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "tripcm-2009-demo",
    "label": "TriPCM 2009 Historical Sample",
    "detail": "The exact three-channel PCM stream extracted from Amy Bienvenu's 2009 result_19 ROM, played by Amy Studio's independent TriPCM runtime.",
    "projectName": "tripcm-2009-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "audio",
      "tripcm",
      "historical",
      "manual-canon"
    ]
  },
  {
    "id": "sglib-putpixel-port",
    "label": "SGlib PutPixel Port",
    "detail": "Amy equivalent of sverx's SGlib bitmap demo: six independently colored diagonal pixels and edge-triggered direction changes from either controller.",
    "projectName": "sglib-putpixel-port",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Ports",
    "tags": [
      "amy",
      "graphics",
      "bitmap",
      "controller",
      "devkitsms"
    ]
  },
  {
    "id": "toolchain-benchmark-hello",
    "label": "Toolchain Benchmark: Hello World",
    "detail": "Exact Amy Studio source used by the seven-tool Hello World comparison.",
    "projectName": "toolchain-benchmark-hello",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Benchmarks",
    "tags": [
      "amy",
      "benchmark",
      "manual-canon"
    ]
  },
  {
    "id": "toolchain-benchmark-warrior-bitmap",
    "label": "Toolchain Benchmark: Warrior Bitmap",
    "detail": "Exact Amy Studio source and ZX0 assets used by the seven-tool Graphics II bitmap comparison.",
    "projectName": "toolchain-benchmark-warrior-bitmap",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Benchmarks",
    "tags": [
      "amy",
      "benchmark",
      "manual-canon"
    ]
  },
  {
    "id": "toolchain-benchmark-controller",
    "label": "Toolchain Benchmark: Controller Visual",
    "detail": "Exact Amy Studio source used by the seven-tool controller-input comparison.",
    "projectName": "toolchain-benchmark-controller",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Benchmarks",
    "tags": [
      "amy",
      "benchmark",
      "manual-canon"
    ]
  },
  {
    "id": "toolchain-benchmark-sprite-metasprite",
    "label": "Toolchain Benchmark: Animated Metasprite",
    "detail": "A three-color actor assembled from three overlapping hardware sprites, with two animation frames and joystick movement.",
    "projectName": "toolchain-benchmark-sprite-metasprite",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Benchmarks",
    "tags": [
      "amy",
      "benchmark",
      "sprites",
      "manual-canon"
    ]
  },
  {
    "id": "toolchain-benchmark-state-update",
    "label": "Toolchain Benchmark: State Update",
    "detail": "Record-array actors, state-machine dispatch, collision, timers, and scoring used by the seven-tool runtime comparison.",
    "projectName": "toolchain-benchmark-state-update",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Benchmarks",
    "tags": [
      "amy",
      "benchmark",
      "manual-canon"
    ]
  },
  {
    "id": "toolchain-benchmark-tile-animation",
    "label": "Toolchain Benchmark: Tile Animation",
    "detail": "A star field animated through shared pattern updates and six 3x2 ships animated through Name Table tile replacement.",
    "projectName": "toolchain-benchmark-tile-animation",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Benchmarks",
    "tags": [
      "amy",
      "benchmark",
      "manual-canon"
    ]
  },
  {
    "id": "amy-inline-qualified-mutations-selftest",
    "label": "Amy Inline Qualified Mutations Self-Test",
    "detail": "Visible self-test for single-line conditional inc, dec, and toggle on overlay fields, packed BCD, and neighboring packed booleans.",
    "projectName": "amy-inline-qualified-mutations-selftest",
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
    "id": "amy-2d-array-selftest",
    "label": "Amy 2D Array Self-Test",
    "detail": "Row-major byte and word grids with constant and expression indexes, verified across optimizer profiles.",
    "projectName": "amy-2d-array-selftest",
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
    "id": "amy-animation-service",
    "label": "Amy Cooperative Animation",
    "detail": "A compact two-layer metasprite animation with explicit update cadence, two bytes of state, and no hidden scheduler.",
    "projectName": "amy-animation-service",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "train-track-puzzle",
    "label": "Rails Puzzles",
    "detail": "ColecoVision railway logic game with nine prevalidated 7x7 puzzles, immutable clues, row and column counts, animated water, and a smoke-trailing victory train.",
    "projectName": "train-track-puzzle",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "quatro-puzzles",
    "label": "Quatro Puzzles",
    "detail": "Four complete ColecoVision puzzle and strategy games sharing one RAM overlay: Explosion, Diamond Dash, Reversi, and Rails Puzzles.",
    "projectName": "quatro-puzzles",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-overlay-layout-selftest",
    "label": "Amy RAM Overlay Layout Self-Test",
    "detail": "Phase-A executable test for record-backed overlay aliases, packed fields, and physical RAM reuse.",
    "projectName": "amy-overlay-layout-selftest",
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
    "id": "amy-arcade-overlay-memory-lab",
    "label": "Arcade Overlay Memory Lab",
    "detail": "Models the measured RAM footprints of Explosion, Diamond Dash, and Fly Swatter: 350 logical bytes share 162 physical bytes.",
    "projectName": "amy-arcade-overlay-memory-lab",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-scenes-overlays-design",
    "label": "Amy Scenes and Overlays Lab",
    "detail": "Executable lifecycle lab with three scene-local RAM layouts, compiler-generated frame dispatch, and NMI-safe mainline transitions.",
    "projectName": "amy-scenes-overlays-design",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-scene-poison-selftest",
    "label": "Amy Scene Poison Self-Test",
    "detail": "Debug-only overlay initialization test: initialized bytes replace $CD poison while untouched bytes expose missing scene setup.",
    "projectName": "amy-scene-poison-selftest",
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
    "id": "amy-arcade-trio",
    "label": "Amy Arcade Trio (Integration Lab)",
    "detail": "Playable integration baseline containing the complete Explosion, Diamond Dash, and Fly Swatter games behind one menu. Used to validate scene transitions and RAM overlays.",
    "projectName": "amy-arcade-trio",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-timer-safety-selftest",
    "label": "Amy Timer Safety Self-Test",
    "detail": "Executable safety regression for repeating, one-shot, stop, restart, independent timers, one-tick intervals, and NMI-off pause semantics.",
    "projectName": "amy-timer-safety-selftest",
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
    "id": "amy-state-machine-selftest",
    "label": "Amy State Machine Self-Test",
    "detail": "Typed four-state machine self-test using qualified one-based state constants and one bounded shared dispatch table.",
    "projectName": "amy-state-machine-selftest",
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
    "id": "amy-record-array-safety-selftest",
    "label": "Amy Record Array Safety Self-Test",
    "detail": "Executable regression for typed record copies, dynamic indexing, ref-record mutation, for-each aliases, and expression indexes.",
    "projectName": "amy-record-array-safety-selftest",
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
    "id": "amy-record-array-cost-record",
    "label": "Amy Record Array Cost Lab",
    "detail": "Size fixture using a 13-byte actor record array; compare with the equivalent parallel-array fixture.",
    "projectName": "amy-record-array-cost-record",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "amy-record-array-cost-parallel",
    "label": "Amy Parallel Array Cost Lab",
    "detail": "Size fixture using thirteen parallel byte arrays; baseline for the equivalent record-array fixture.",
    "projectName": "amy-record-array-cost-parallel",
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
    "label": "OS7 Pattern Transform Lab",
    "detail": "Visual comparison of an eight-color tile with BIOS left/right and top/bottom flips, clockwise rotation, 2x pattern/color enlargement, and explicit Graphics II thirds.",
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
    "detail": "Demonstrates CRT-safe blanking with separate wake and confirmation actions.",
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
    "id": "wav-spectral-sfx-demo",
    "label": "WAV Spectral Game SFX",
    "detail": "Two-channel non-blocking BIOS sound generated from a short 440/660 Hz WAV, with FIRE replay.",
    "projectName": "wav-spectral-sfx-demo",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "hello-world-spectral",
    "label": "Hello World Spectral Voice",
    "detail": "Offline speech converted to two formant tones plus variable-clock white noise, with FIRE replay.",
    "projectName": "hello-world-spectral",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "space-taxi-music-box",
    "label": "Space Taxi Music Box",
    "detail": "Speech test A: balanced formants and consonants, with keypad phrases and two FIRE responses.",
    "projectName": "space-taxi-music-box",
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
    "id": "space-taxi-music-box-formants",
    "label": "Space Taxi Music Box - Formants",
    "detail": "Speech test B: steadier and louder vowel formants with quieter consonant noise.",
    "projectName": "space-taxi-music-box-formants",
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
    "id": "space-taxi-music-box-consonants",
    "label": "Space Taxi Music Box - Consonants",
    "detail": "Speech test C: more sensitive consonant detection and stronger noise articulation.",
    "projectName": "space-taxi-music-box-consonants",
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
    "id": "space-taxi-music-box-hybrid-smooth",
    "label": "Space Taxi Music Box - Hybrid Smooth",
    "detail": "Speech test D: keeps the preferred 1, 2, 6, 7 and 9 conversions while smoothing 3, 4, 5 and 8.",
    "projectName": "space-taxi-music-box-hybrid-smooth",
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
    "id": "space-taxi-music-box-hybrid-sharp",
    "label": "Space Taxi Music Box - Hybrid Sharp",
    "detail": "Speech test E: keeps the preferred digits while giving 3, 4, 5 and 8 faster, noisier articulation.",
    "projectName": "space-taxi-music-box-hybrid-sharp",
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
    "id": "space-taxi-music-box-hybrid-banded",
    "label": "Space Taxi Music Box - Banded",
    "detail": "Speech test F: selects low and middle formants from separate vocal frequency bands.",
    "projectName": "space-taxi-music-box-hybrid-banded",
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
    "id": "space-taxi-music-box-hybrid-banded-tones",
    "label": "Space Taxi Music Box - Banded 3 Tones",
    "detail": "Speech test G: replaces consonant noise with a third formant for digits 3, 4, 5 and 8.",
    "projectName": "space-taxi-music-box-hybrid-banded-tones",
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
    "id": "dsound-sample-280",
    "label": "DSound Sample 280",
    "detail": "DSOUND sample project using supplied WAV2CV-style C byte data, step 3 and amplification 280%.",
    "projectName": "dsound-sample-280",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
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
    "id": "amy-numeric-comparison-selftest",
    "label": "Amy Numeric Comparison Selftest",
    "detail": "Self-checking mixed-width, signed, fixed, wide, FP5, BCD, and reversed-operand comparison matrix.",
    "projectName": "amy-numeric-comparison-selftest",
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
    "category": "Demos",
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
    "id": "amy-wide-array-selftest",
    "label": "Amy Wide Array Self-Test",
    "detail": "Runtime check for u32 and i32 arrays with variable and expression indexes.",
    "projectName": "amy-wide-array-selftest",
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
    "id": "amy-wide-integer-selftest",
    "label": "Amy Wide Integer Self-Test",
    "detail": "Runtime bitwise and shift checks for u16, i16, u32, i32, arrays, records, and overlays.",
    "projectName": "amy-wide-integer-selftest",
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "cvbasic-spinner-port",
    "label": "CVBasic Spinner Port",
    "detail": "Amy port of CVBasic spinner.bas using signed, consumable spinner deltas directly to steer a 16x16 happy-face sprite.",
    "projectName": "cvbasic-spinner-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "cvbasic-plot-live-port",
    "label": "CVBasic Live Plot Port",
    "detail": "Visible progressive bitmap drawing with VBlank synchronization and short NMI-safe VDP critical sections.",
    "projectName": "cvbasic-plot-live-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "cvbasic-vector-cube-port",
    "label": "CVBasic Vector Cube Port",
    "detail": "Amy port of Matthew Eggleston's CVBasic vector cube idea using native bitmap line drawing.",
    "projectName": "cvbasic-vector-cube-port",
    "sourceLang": "amy",
    "editorialTrack": "cvbasic-port",
    "category": "CVBasic Ports",
    "tags": [
      "amy",
      "cvbasic",
      "port",
      "cvbasic-port"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    "id": "msx-forest-zx0-benchmark",
    "label": "MSX Forest ZX0 Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-zx0-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-dan3-benchmark",
    "label": "MSX Forest DAN3 Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-dan3-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-dan2-benchmark",
    "label": "MSX Forest DAN2 Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-dan2-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-dan1-benchmark",
    "label": "MSX Forest DAN1 Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-dan1-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-zx7-benchmark",
    "label": "MSX Forest ZX7 Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-zx7-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-pletter-benchmark",
    "label": "MSX Forest Pletter Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-pletter-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-bitbuster12-benchmark",
    "label": "MSX Forest BitBuster 1.2 Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-bitbuster12-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-nibble-benchmark",
    "label": "MSX Forest Nibble Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-nibble-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-lzf-benchmark",
    "label": "MSX Forest LZF Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-lzf-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-mdkrle-benchmark",
    "label": "MSX Forest MDK-RLE Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-mdkrle-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "msx-forest-raw-benchmark",
    "label": "MSX Forest RAW Benchmark",
    "detail": "MSX Forest bitmap benchmark measuring PATTERN+COLOR load time with an NMI-driven frame counter.",
    "projectName": "msx-forest-raw-benchmark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-zx0-slideshow",
    "label": "Title Screens ZX0 Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-zx0-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-dan3-slideshow",
    "label": "Title Screens DAN3 Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-dan3-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-dan2-slideshow",
    "label": "Title Screens DAN2 Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-dan2-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-dan1-slideshow",
    "label": "Title Screens DAN1 Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-dan1-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-zx7-slideshow",
    "label": "Title Screens ZX7 Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-zx7-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-pletter-slideshow",
    "label": "Title Screens Pletter Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-pletter-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-bitbuster12-slideshow",
    "label": "Title Screens BitBuster 1.2 Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-bitbuster12-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-nibble-slideshow",
    "label": "Title Screens Nibble Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-nibble-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-lzf-slideshow",
    "label": "Title Screens LZF Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-lzf-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "title-screens-mdkrle-slideshow",
    "label": "Title Screens MDK-RLE Slideshow",
    "detail": "Four ColecoVision homebrew title screens shown with one compression codec and a final frame-count report.",
    "projectName": "title-screens-mdkrle-slideshow",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
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
    "id": "delta-remix-music-box",
    "label": "Delta Remix Music Box",
    "detail": "Unfinished legacy SDCC Delta Remix music sample with two restored sound effects for musicbox testing.",
    "projectName": "delta-remix-music-box",
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
    "id": "easter-bunny",
    "label": "Easter Bunny (Legacy Port)",
    "detail": "Amy port of Amy Bienvenu / NewColeco's Minigame Compo 2007 Easter Bunny. This preserves the legacy devkit gameplay, graphics, levels, and Coleco BIOS sound data while the port is progressively moved away from inline ASM.",
    "projectName": "easter-bunny",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "easter-bunny-v2",
    "label": "Easter Bunny v2 (Amy cleanup)",
    "detail": "Amy-facing cleanup copy of the Easter Bunny legacy port. The visible source uses Amy setup syntax and keeps the remaining verified engine in a project ASM file while subsystems are ported gradually.",
    "projectName": "easter-bunny-v2",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "easter-bunny-v3",
    "label": "Easter Bunny v3 (Rewrite Lab)",
    "detail": "Protected copy of the playable v2 baseline for gradual native Amy rewrite work. V2 remains stable while v3 becomes the active porting experiment.",
    "projectName": "easter-bunny-v3",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
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
    "detail": "Amy port of Amy Bienvenu / NewColeco's legacy devkit Diamond Dash game.",
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
    "detail": "Incomplete Amy port of Amy Bienvenu / NewColeco's legacy Santa's Gift Run from old-projects-sdcc-z80/sdcctest/giftrun/main.c. Graphics and BIOS sounds are converted; gift-drop and house behavior still need closer matching.",
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
    "detail": "Incomplete archival Amy port of Mathieu Proulx and Amy Bienvenu / NewColeco's legacy devkit 421 dice project. The HUD, ICVGM graphics, dice display, and converted BIOS sounds are preserved, but the full game rules are not implemented yet.",
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
    "id": "space-trainer",
    "label": "Space Trainer",
    "detail": "Amy port of Amy Bienvenu / NewColeco's small SDCC Space Trainer sample: two-player inertia, bonus bubble, score race, and original BIOS sound tables.",
    "projectName": "space-trainer",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "reversi",
    "label": "Reversi v1",
    "detail": "Amy port of the old NewColeco SDCC Reversi board game: original board graphics, legal move hints, simple CPU opponent, and native Amy gameplay logic.",
    "projectName": "reversi",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "reversi-v2",
    "label": "Reversi v2 Minimax Lab",
    "detail": "Experimental Reversi variant using local arrays and recursive depth-2 minimax to validate Amy language porting features.",
    "projectName": "reversi-v2",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "reversi-v3",
    "label": "Reversi v3 Compare Lab",
    "detail": "Reversi comparison lab with selectable 2-player, 1-player, CPU-first, and CPU-vs-CPU modes using simple and minimax AI.",
    "projectName": "reversi-v3",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "reversi-v4",
    "label": "Reversi v4 Negamax Lab",
    "detail": "Reversi comparison lab with Board[] kept pure, Hints[] separated from gameplay state, and a true recursive negamax CPU.",
    "projectName": "reversi-v4",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "reversi-v5",
    "label": "Reversi v5",
    "detail": "Playable Reversi with independent Human, Simple CPU, or Tuned CPU choices for Black and White; tuned play uses iterative depth 2-3 alpha-beta under a 400-node budget.",
    "projectName": "reversi-v5",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman-title-test",
    "label": "Dacman Title Test",
    "detail": "Diagnostic slice: only Amy show picture for the Dacman title screen using the same project files as Dacman.",
    "projectName": "dacman-title-test",
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
    "id": "dacman-info-test",
    "label": "Dacman Info Test",
    "detail": "Diagnostic slice: only Amy show picture for the Dacman instructions/info screen.",
    "projectName": "dacman-info-test",
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
    "id": "dacman-graphics-test",
    "label": "Dacman Graphics Init Test",
    "detail": "Diagnostic slice: loads the Dacman game tiles, color table, sprite patterns, and prints a small confirmation.",
    "projectName": "dacman-graphics-test",
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
    "id": "dacman-board-test",
    "label": "Dacman Board Test",
    "detail": "Diagnostic slice: loads the Dacman game graphics and draws board 1 without gameplay logic.",
    "projectName": "dacman-board-test",
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
    "id": "dacman-startup-diag",
    "label": "Dacman Startup Diag",
    "detail": "Diagnostic slice: initializes Dacman game graphics, shows the title and info pictures, and plays the original startup/music/sound table without entering gameplay.",
    "projectName": "dacman-startup-diag",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman",
    "label": "Dacman",
    "detail": "Full Amy port in progress of NewColeco's Dacman legacy SDCC game, including Dacpong bonus game.",
    "projectName": "dacman",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman-2",
    "label": "DacMan 2",
    "detail": "Puzzle-focused DacMan sequel foundation with four skill levels, ZX0 level assets, and support for community-created levels.",
    "projectName": "dacman-2",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman-2-no-records",
    "label": "DacMan 2 - Parallel Arrays",
    "detail": "DacMan 2 comparison build retaining the original parallel ghost arrays.",
    "projectName": "dacman-2-no-records",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman-2-records",
    "label": "DacMan 2 - Records",
    "detail": "DacMan 2 comparison build using an optimized array of GhostActor records.",
    "projectName": "dacman-2-records",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman-2-records-revision-a",
    "label": "DacMan 2 - Records Revision A",
    "detail": "Measured DacMan 2 records revision with typed bulk initialization and complete five-ghost handling.",
    "projectName": "dacman-2-records-revision-a",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dacman-2-records-revision-b",
    "label": "DacMan 2 - Records Revision B",
    "detail": "Revision A evolved with buffered Pac movement and direction-ordered teleporter routing.",
    "projectName": "dacman-2-records-revision-b",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "explosion",
    "label": "Explosion",
    "detail": "Amy port inspired by Amy Bienvenu / NewColeco's 2004 SDCC Explosion board game: overload cells, chain reactions, and a simple CPU opponent.",
    "projectName": "explosion",
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
    "detail": "AMY text-adventure remake inspired by Amy Bienvenu / NewColeco's legacy Chateau du Dragon, with the original title picture extracted as modern picture assets.",
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
    "id": "dragon-castle",
    "label": "Dragon Castle",
    "detail": "English version of Chateau du Dragon translated by [zyzzle](https://forums.atariage.com/profile/64028-zyzzle/), who also alerted us to the clean repo include-file issue.",
    "projectName": "dragon-castle",
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
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
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
    "detail": "Runtime selftest for dynamic spinner selectors, atomic consumption, frame, and vdp.status.",
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
    "id": "amy-recursive-local-array-restore-selftest",
    "label": "Amy Recursive Local Array Restore Selftest",
    "detail": "Regression lab for recursive functions that snapshot a global board into local arrays, mutate it, recurse, and restore it.",
    "projectName": "amy-recursive-local-array-restore-selftest",
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
    "id": "amy-static-frameless-abi-selftest",
    "label": "Amy Static Frameless ABI Selftest",
    "detail": "Runtime ROM test for frameless scalar calls, signed and unsigned parameters, local reset, nested arguments, recursion boundaries, and NMI exclusion.",
    "projectName": "amy-static-frameless-abi-selftest",
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
    "id": "amy-word-table-selftest",
    "label": "Amy Word Table Selftest",
    "detail": "Indexable ROM word table (data Frames words + Frames[I]) cycling three 2x2 frames — the Amy answer to C's const pointer arrays.",
    "projectName": "amy-word-table-selftest",
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
  },
  {
    "id": "warrior-dan2-fire-visual-test",
    "label": "Warrior DAN2 Fire Visual Test",
    "detail": "Interactive GearColeco regression test: wait on an explanatory page, press FIRE, decompress Warrior with DAN2, and verify the rendered image.",
    "projectName": "warrior-dan2-fire-visual-test",
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
    "id": "fly-swatter-timer-quest",
    "label": "Fly Swatter: Timer Quest",
    "detail": "A playful Amy timer and state-machine tutorial with five increasingly fast fly waves and a multi-phase boss.",
    "projectName": "fly-swatter-timer-quest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "commando-music-box-graphics-lossy",
    "label": "Commando Music Box - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 21181 -> 21157 bytes (-24), 76 rendered pixels changed under the documented safety limits.",
    "projectName": "commando-music-box-graphics-lossy",
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
    "id": "easter-bunny-v2-graphics-lossy",
    "label": "Easter Bunny v2 (Amy cleanup) - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 5503 -> 5500 bytes (-3), 9 rendered pixels changed under the documented safety limits.",
    "projectName": "easter-bunny-v2-graphics-lossy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "easter-bunny-v3-graphics-lossy",
    "label": "Easter Bunny v3 (Rewrite Lab) - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 5952 -> 5949 bytes (-3), 9 rendered pixels changed under the documented safety limits.",
    "projectName": "easter-bunny-v3-graphics-lossy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "santas-gift-run-graphics-lossy",
    "label": "Santa's Gift Run (Incomplete) - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 5753 -> 5740 bytes (-13), 256 rendered pixels changed under the documented safety limits.",
    "projectName": "santas-gift-run-graphics-lossy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "421-graphics-lossy",
    "label": "421 Dice (Incomplete) - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 19288 -> 19286 bytes (-2), 21 rendered pixels changed under the documented safety limits.",
    "projectName": "421-graphics-lossy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "chateau-du-dragon-graphics-lossy",
    "label": "Chateau du Dragon - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 8629 -> 8621 bytes (-8), 39 rendered pixels changed under the documented safety limits.",
    "projectName": "chateau-du-dragon-graphics-lossy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "dragon-castle-graphics-lossy",
    "label": "Dragon Castle - Controlled Lossy Graphics",
    "detail": "Comparison variant: controlled lossy TMS9918 graphics; Balanced ROM 8611 -> 8603 bytes (-8), 39 rendered pixels changed under the documented safety limits.",
    "projectName": "dragon-castle-graphics-lossy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "manual-canon"
    ]
  },
  {
    "id": "jumping-jack",
    "label": "Jumping Jack (TI-99/4A Port)",
    "detail": "Paul Burger's COMPUTE! platform game, adapted from the May 1983 TI-99/4A listing with joystick movement, jumping and sound.",
    "projectName": "jumping-jack",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "gold-miner",
    "label": "Gold Miner (TI-99/4A Port)",
    "detail": "Joseph Weber and James Dunn's COMPUTE! mine exploration game, with animated digging, charges, gold and joystick controls.",
    "projectName": "gold-miner",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "first-math",
    "label": "First Math (TI-99/4A Port)",
    "detail": "Steve Hamilton's August 1983 COMPUTE! arithmetic tutor, adapted to the ColecoVision keypad with selectable operations and difficulty ranges.",
    "projectName": "first-math",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "educational",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "southern-states",
    "label": "Southern States (TI-99/4A Port)",
    "detail": "C. Regena's August 1983 COMPUTE! map quiz, with a ColecoVision keypad build and an OS7+EOS hybrid ADAM keyboard build.",
    "projectName": "southern-states",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "adam",
      "educational",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "diamond-drop",
    "label": "Diamond Drop (TI-99/4A Port)",
    "detail": "Matt Giwer and Patrick Parrish's September 1983 COMPUTE! falling-diamond action game, with fixed-point sprite motion and packed BCD scoring.",
    "projectName": "diamond-drop",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "mystery-spell",
    "label": "Mystery Spell (TI-99/4A Port)",
    "detail": "Doug Hapeman's September 1983 COMPUTE! spelling game, with 318 cartridge words and ADAM keyboard, custom-list and media support.",
    "projectName": "mystery-spell",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "adam",
      "educational",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "runway-180",
    "label": "Runway 180 (TI-99/4A Port)",
    "detail": "James Dunn's October 1983 COMPUTE! jet-landing game, adapted with deterministic fixed-point sprite motion, runway hazards and ColecoVision controls.",
    "projectName": "runway-180",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "crazy-climber",
    "label": "Crazy Climber (TI-99/4A Port)",
    "detail": "Ted Reynolds and Pat Parrish's November 1983 COMPUTE! climbing game, with falling objects, parachute animation and compact VoxPCM speech.",
    "projectName": "crazy-climber",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "voxpcm",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "get-the-gold",
    "label": "Get the Gold (TI-99/4A Port)",
    "detail": "Frank Elsesser's December 1983 COMPUTE! dungeon adventure, with 128 rooms, a visible exploration map and separate ColecoVision and ADAM controls.",
    "projectName": "get-the-gold",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "adam",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "balloon-crazy",
    "label": "Balloon Crazy (TI-99/4A Port)",
    "detail": "Joseph Russ and Patrick Parrish's December 1985 COMPUTE! balloon-catching game, with fixed-point sprite motion, animated balloon strings and BCD scoring.",
    "projectName": "balloon-crazy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "beethoven-medley",
    "label": "Beethoven Medley (TI-99/4A Port)",
    "detail": "C. Regena's October 1983 COMPUTE! Ludwig program: four Beethoven excerpts synchronized with a progressively drawn and gently animated scene.",
    "projectName": "beethoven-medley",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "music",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "blueberries",
    "label": "Blueberries",
    "detail": "Bill Root's July 1984 COMPUTE! farming game, adapted for one or two players with seed planting, ripening berries, a computer opponent and layered farmer sprites.",
    "projectName": "blueberries",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "atari",
      "compute!",
      "port",
      "game",
      "sprites",
      "two-player",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "pests",
    "label": "Pests",
    "detail": "Kevin Woram's June 1984 COMPUTE! garden game, adapted with eight-direction movement, spreading weeds, flower fumigation, layered sprites and Tiny Sound music.",
    "projectName": "pests",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "commodore-64",
      "compute!",
      "port",
      "game",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "spiders",
    "label": "Spiders",
    "detail": "Joe Rocke's November 1984 COMPUTE! alien-defense game, with swaying formations, diving spiders, missiles, officer bonus rounds and Tiny Sound music.",
    "projectName": "spiders",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "commodore-64",
      "compute!",
      "port",
      "game",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "bunny-hop",
    "label": "Bunny Hop",
    "detail": "Adam Cybanski's July 1984 COMPUTE! cloud-jumping game, with smooth scrolling clouds, carrots, jumper rounds and fixed-point sprite movement.",
    "projectName": "bunny-hop",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "atari",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "jackpot",
    "label": "Jackpot",
    "detail": "Rick Rothstein's August 1984 COMPUTE! slot-machine simulation, with three odds levels, animated reels, keypad controls and faithful TI-99/4A graphics.",
    "projectName": "jackpot",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "keypad",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "devastator",
    "label": "Devastator",
    "detail": "David R. Arnold and Patrick Parrish's August 1984 COMPUTE! crosshair game, with fixed-point motion, two skill levels and animated destruction sequences.",
    "projectName": "devastator",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "fixed-point",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "olympiad",
    "label": "Olympiad",
    "detail": "Kevin Woram and Mike Buhidar Jr.'s June 1984 COMPUTE! arena duel, with two-player controls, a computer opponent, arrows, teleport grids and Tiny Sound music.",
    "projectName": "olympiad",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "commodore-64",
      "atari",
      "compute!",
      "port",
      "game",
      "two-player",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "pentominos",
    "label": "Pentominos",
    "detail": "Jim Butterfield's May 1984 COMPUTE! twelve-piece rectangle solver, with four board sizes, visible backtracking and three search speeds.",
    "projectName": "pentominos",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "puzzle",
      "solver",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "xb-to-amy-demo",
    "label": "TI Extended BASIC to Amy Lab",
    "detail": "Executable Moonbeam conversion lab covering sprite motion, collisions, distance checks, joystick input, reference parameters, signed min/max, ROM text addresses, scrolling text and three-channel sound.",
    "projectName": "XB to Amy Conversion Lab",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "ti99",
      "extended-basic",
      "porting",
      "moonbeam",
      "manual-canon"
    ]
  },
  {
    "id": "amy-chess",
    "label": "Amy Chess v1.3",
    "detail": "Amy Chess v1.3 with Human/CPU controls, BLITZ and NORMAL play, bounded opening variation, stronger tactical guards, compact Z80 search routines, ZX0 graphics and VoxPCM personality in a 31,302-byte cartridge build.",
    "projectName": "Amy Chess v1.3",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "colecovision",
      "chess",
      "fide",
      "game",
      "voxpcm",
      "zx0",
      "manual-canon"
    ]
  },
  {
    "id": "amy-compound-array-arithmetic-selftest",
    "label": "Amy Compound Array Arithmetic Self-Test",
    "detail": "Runtime regression for u8 and u16 compound multiplication with constant and variable array indexes.",
    "projectName": "amy-compound-array-arithmetic-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Self-tests",
    "tags": [
      "amy",
      "selftest",
      "arrays",
      "arithmetic",
      "manual-canon"
    ]
  },
  {
    "id": "amy-horse-payoff-selftest",
    "label": "Amy Horse Payoff Self-Test",
    "detail": "Runtime regression for the indexed odds and payoff arithmetic used by Horse Racing.",
    "projectName": "amy-horse-payoff-selftest",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Self-tests",
    "tags": [
      "amy",
      "selftest",
      "arrays",
      "arithmetic",
      "horse-racing",
      "manual-canon"
    ]
  },
  {
    "id": "circus",
    "label": "Circus (TI-99/4A Port)",
    "detail": "Craig Setera's trampoline-and-acrobat action game from COMPUTE! Issue 45, February 1984, adapted from its TI-99/4A listing with balloons, birds and title music.",
    "projectName": "circus",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "colorbot",
    "label": "Colorbot",
    "detail": "John R. Dondzila's January 1984 COMPUTE! robot-survival game, with eight-way movement, Electron Frisbees, animated walls and Tiny Sound music.",
    "projectName": "colorbot",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "demons-of-osiris",
    "label": "Demons of Osiris",
    "detail": "A ColecoVision rewrite of Steve Haynal's January 1984 COMPUTE! base-defense game, with evasive attackers, waves and rapid fire.",
    "projectName": "demons-of-osiris",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "gotcha",
    "label": "Gotcha!",
    "detail": "Doug Smoak's February 1984 COMPUTE! wraparound money chase, with a pursuing Collector, evolving mazes and smooth sprite movement.",
    "projectName": "gotcha",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "horse-racing",
    "label": "Horse Racing (TI-99/4A Port)",
    "detail": "Robert Onufer's October 1984 COMPUTE! betting game, with calculated odds, animated horses, track conditions and correct indexed payoffs.",
    "projectName": "horse-racing",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "arithmetic",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "lightsaver",
    "label": "Lightsaver",
    "detail": "Jon Rhees' September 1984 COMPUTE! action game: catch falling light bulbs across sixteen skill levels, bonus baskets and an automatic demo.",
    "projectName": "lightsaver",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "commodore-64",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "missile-math",
    "label": "Missile Math",
    "detail": "Garry S. Wick's September 1984 COMPUTE! arithmetic game, with five possible answers, a moving UFO, selectable operations and scoring by speed.",
    "projectName": "missile-math",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "educational",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "number-game",
    "label": "The Number Game",
    "detail": "Lou Tylee's October 1984 COMPUTE! number-recognition game, with large digits, keypad play, counted blocks and compact VoxPCM speech.",
    "projectName": "number-game",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "educational",
      "voxpcm",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "quatrainment",
    "label": "Quatrainment",
    "detail": "Sean Puckett's February 1984 COMPUTE! 4x4 pattern puzzle, with selectable difficulty, move previews, par calculation and visible timing.",
    "projectName": "quatrainment",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "puzzle",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "ti-aquarium",
    "label": "TI Aquarium",
    "detail": "Michael A. Covington's March 1984 COMPUTE! sprite aquarium, with nine moving fish, bubbles, seaweed and rotating sprite priority.",
    "projectName": "ti-aquarium",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "sprites",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "trident",
    "label": "Trident",
    "detail": "C. O. Dickerson's March 1984 COMPUTE! submarine defense game, rebuilt with a Graphics II radar, waves and steerable antimissiles.",
    "projectName": "trident",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "atari",
      "compute!",
      "port",
      "game",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "barrier-battle",
    "label": "Barrier Battle",
    "detail": "Heath Lawrence's two-player barrier-building contest adapted from the 1984 COMPUTE! listings.",
    "projectName": "barrier-battle",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "port",
      "game",
      "two-player",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "roader",
    "label": "Roader (TI-99/4A Port)",
    "detail": "Brian Foley's March 1984 COMPUTE! winding-road game, with hazards, four skill levels and progressively narrower courses.",
    "projectName": "roader",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "rescue-of-blondell",
    "label": "Rescue of Blondell",
    "detail": "Grant Albrecht's scrolling rescue game, adapted from the January 1985 COMPUTE! listing with four two-pixel phases and shared Graphics II patterns.",
    "projectName": "rescue-of-blondell",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "port",
      "game",
      "scrolling",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "strategy-puzzles",
    "label": "Strategy Puzzles",
    "detail": "Four restored 1984 logic games: a two-player pattern challenge, solvable 3x3 and 4x4 sliding puzzles, and Dozo on its complete 126-triangle board.",
    "projectName": "strategy-puzzles",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "atari",
      "port",
      "logic",
      "puzzle",
      "strategy",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "ti-mozart",
    "label": "TI Mozart",
    "detail": "A generative TI-99/4A music-and-graphics program adapted from the January 1984 COMPUTE! listing.",
    "projectName": "ti-mozart",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "music",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "worm-of-bemer",
    "label": "Worm of Bemer (TI-99/4A Port)",
    "detail": "Stephen D. Fultz's April 1984 COMPUTE! game: guide Nerm through Bemer Castle, eating magic mushrooms while avoiding walls and other hazards.",
    "projectName": "worm-of-bemer",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "things-in-the-dark",
    "label": "Things in the Dark (TI-99/4A Port)",
    "detail": "Scott Baker's December 1984 COMPUTE! Dark World action game, with animated creatures, six levels, spare robots and joystick-controlled movement.",
    "projectName": "things-in-the-dark",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "paratrooper",
    "label": "Paratrooper (TI-99/4A Port)",
    "detail": "John Goetz's January 1985 COMPUTE! parachute game, with variable wind and weight, animated boats, two difficulty levels and three landing pads.",
    "projectName": "paratrooper",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "goblin",
    "label": "Goblin (VIC-20 Port)",
    "detail": "Dan Goff's July 1983 COMPUTE! climbing maze game, with randomized barriers, collectible creatures, rising speed and persistent high score.",
    "projectName": "goblin",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic20",
      "compute!",
      "port",
      "game",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "speedski",
    "label": "Speed Ski (VIC-20 Port)",
    "detail": "Dub Scroggin's July 1983 COMPUTE! downhill racing game, with gates, jumps, hazards, five slopes, multiple players and cumulative rounds.",
    "projectName": "speedski",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic20",
      "compute!",
      "port",
      "game",
      "sprites",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "time-warp",
    "label": "Time Warp!",
    "detail": "An original Timelost perspective action game: catch Erin and Jacque, dodge or blast debris, and survive increasingly fast warps through time.",
    "projectName": "Time Warp!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "original",
      "game",
      "perspective",
      "sprites",
      "music",
      "manual-canon"
    ]
  },
  {
    "id": "language-barrier",
    "label": "The Language Barrier",
    "detail": "An original Timelost audio-visual sequence puzzle: decode Jacque's musical glyph phrases using exact, misplaced and absent-symbol clues.",
    "projectName": "The Language Barrier",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "original",
      "game",
      "puzzle",
      "sequence",
      "music",
      "manual-canon"
    ]
  },
  {
    "id": "battle-at-stonehenge",
    "label": "Battle at Stonehenge",
    "detail": "A Timelost defense game at Stonehenge, with Warbird combat, waves of attackers and a finite chapter objective for the planned anthology.",
    "projectName": "Battle at Stonehenge",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "port",
      "game",
      "action",
      "sprites",
      "experimental",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "slime-creatures-3d",
    "label": "Attack of the Slime Creatures 3-D",
    "detail": "A first-person Timelost lake defense with a scrolling panorama, five creature depths, perspective projectiles, radar, waves and high scores.",
    "projectName": "Attack of the Slime Creatures 3-D",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "first-person",
      "perspective",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "pitdemons",
    "label": "Peril of the Pitdemons",
    "detail": "A restored 1983 Timelost action game with four demon types, a Warbird, synchronized Tiny Sound music and a full-screen ZX0 bitmap title.",
    "projectName": "Peril of the Pitdemons",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "port",
      "game",
      "graphics",
      "music",
      "zx0",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "caverns",
    "label": "In the Caverns of Carnage",
    "detail": "A smooth-scrolling Timelost cavern chase with three creature types, trapdoors, safe passages, music and a ZX0 bitmap title.",
    "projectName": "In the Caverns of Carnage",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "port",
      "game",
      "graphics",
      "music",
      "zx0",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "dungeon-shadows",
    "label": "Dungeon Shadows",
    "detail": "An original Timelost stealth game with six rooms, patrolling guards, dynamic lantern light, noise distractions, rescued companions and synthesized voices.",
    "projectName": "Dungeon Shadows",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "original",
      "game",
      "stealth",
      "sprites",
      "voice",
      "manual-canon"
    ]
  },
  {
    "id": "timelost-escape",
    "label": "Escape",
    "detail": "A playable Timelost river escape chapter in which prisoners must be ferried to safety. Visual and gameplay refinement is still planned.",
    "projectName": "Escape",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "port",
      "game",
      "action",
      "experimental",
      "to-be-improved",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "timelost-rockfall",
    "label": "Rockfall!",
    "detail": "The playable final Timelost action chapter, with a finite anthology objective. Visual and gameplay refinement is still planned.",
    "projectName": "Rockfall!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "port",
      "game",
      "action",
      "experimental",
      "to-be-improved",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "biker-dave",
    "label": "Biker Dave",
    "detail": "David Schwener's November 1986 COMPUTE! motorcycle stunt game, with rookie and pro courses, wheelies, flaming-hoop jumps, variable ramps, high scores and an original title tune.",
    "projectName": "Biker Dave",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "port",
      "game",
      "motorcycle",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "timelost-adam-anthology-lab",
    "label": "Timelost ADAM Anthology Lab",
    "detail": "A compilable preview of the planned ADAM anthology director: narrative order, chapter menu and persistent Hall of Fame design for all nine games.",
    "projectName": "Timelost ADAM Anthology Lab",
    "sourceLang": "amy",
    "memoryProfile": "adam-os7-eos-drivers",
    "buildTarget": {
      "platform": "adam-disk",
      "medium": "dsk",
      "volume": "TIMELOST"
    },
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "adam",
      "book",
      "anthology",
      "multifile",
      "experimental",
      "manual-canon"
    ]
  },
  {
    "id": "laser-strike-battleship",
    "label": "Laser Strike (1986)",
    "detail": "A two-player or computer space-fleet strategy game adapted from COMPUTE!, with animated laser fire and clear VoxPCM result announcements.",
    "projectName": "Laser Strike",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "strategy",
      "voice",
      "voxpcm"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "treasure-diver",
    "label": "Treasure Diver (Claude)",
    "detail": "A ColecoVision reinterpretation faithful to the documented rules of Brian Casey's 1988 COMPUTE! game: a floating bathysphere, hunting sharks, leaking air, drifting treasure and progressively deeper dives.",
    "projectName": "Treasure Diver (Claude)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reinterpretation",
      "game",
      "underwater",
      "sprites",
      "sharks",
      "air",
      "gazette"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "treasure-diver-ocean-expedition",
    "label": "Treasure Diver: Ocean Expedition",
    "detail": "ChatGPT's artistic reinterpretation inspired by the 1988 COMPUTE! game, featuring submarine-style movement, shark lanes, air, damage, boost energy and treasure recovery.",
    "projectName": "Treasure Diver: Ocean Expedition",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reinterpretation",
      "chatgpt",
      "game",
      "underwater",
      "sprites",
      "gazette"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chain-reaction",
    "label": "Chain Reaction",
    "detail": "A strategic grid game adapted from COMPUTE!, where growing bomb clusters capture neighboring cells through cascading explosions.",
    "projectName": "Chain Reaction",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "strategy",
      "chain-reaction"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "santas-sleigh-run",
    "label": "Santa's Sleigh Run",
    "detail": "A five-stage Christmas action game spanning rooftop delivery, Santa's toy factory, marching coal goblins, an ice wall and a final sky dash, with harder rounds, ranks, high scores and seasonal music.",
    "projectName": "Santa's Sleigh Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "christmas",
      "sprites",
      "music",
      "high-score",
      "multi-stage",
      "manual-canon"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "deep-chambers",
    "label": "Deep Chambers",
    "detail": "An original dungeon crawler with 26 four-room levels, rank-changing monsters, persistent pits, keys, food, treasure, potions and an escape from level Z.",
    "projectName": "Deep Chambers",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "dungeon",
      "action",
      "maze",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "laser-chess",
    "label": "Laser Chess (1987)",
    "detail": "A ColecoVision adaptation of Mike Duppong's COMPUTE! strategy game, with two-player play, optional computer opponents, reflective pieces, beam splitting and animated laser paths.",
    "projectName": "Laser Chess",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "strategy",
      "laser",
      "computer-player",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "climber-5",
    "label": "Climber 5 (1987)",
    "detail": "James Rogers' COMPUTE! climbing game adapted for ColecoVision with five buildings, ladders, electrodes, hooks, sweepers, a countdown, title music and VoxPCM voices.",
    "projectName": "Climber 5",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "platform",
      "sprites",
      "voice",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "party-in-willow-hollow",
    "label": "Party in Willow Hollow",
    "detail": "An original woodland birthday adventure with eight distinct party minigames, presents, candles, a party map and a musical cake finale.",
    "projectName": "Party in Willow Hollow",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "minigames",
      "party",
      "woodland",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "monte-carlo",
    "label": "Monte Carlo (1987)",
    "detail": "Thomas Carlson's solitaire card game from COMPUTE!, September 1987, adapted with joystick selection, three difficulty levels, music and persistent best counts.",
    "projectName": "Monte Carlo",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "cards",
      "solitaire",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "marbles",
    "label": "Marbles (1987)",
    "detail": "Stephen Stout's COMPUTE! pipe-routing arcade game from October 1987, with simultaneous arrow switching, paired buckets, procedural pipe layouts and rising speed.",
    "projectName": "Marbles",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "pipes",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "the-hermit",
    "label": "The Hermit (1987)",
    "detail": "Eric Bryant's COMPUTE! adventure from November 1987, rebuilt with joystick verb-and-noun menus, packed text, illustrated locations, ten treasures and a complete rule-bytecode engine.",
    "projectName": "The Hermit",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "adventure",
      "text",
      "graphics",
      "zx0",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "leaping-larry",
    "label": "Leaping Larry (1987)",
    "detail": "Michael Streeter's COMPUTE! factory action game from December 1987, featuring smooth conveyor belts, six floors, robots, falling plans, music and progressively hidden platforms.",
    "projectName": "Leaping Larry",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "platform",
      "conveyors",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "canfield",
    "label": "Canfield (1988)",
    "detail": "Ed Reynolds' COMPUTE! solitaire game from January 1988, adapted with joystick card movement, authentic casino scoring, persistent bankroll, music and sound effects.",
    "projectName": "Canfield",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "cards",
      "solitaire",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "tiles",
    "label": "Tiles (1988)",
    "detail": "Rick Harrison's COMPUTE! memory game from February 1988, with one- or two-player rounds, growing color patterns, score pressure, music and persistent high scores.",
    "projectName": "Tiles",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "memory",
      "puzzle",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "blackjack",
    "label": "Casino Blackjack (1988)",
    "detail": "John Hamilton's COMPUTE! blackjack game from March 1988, including insurance, doubling, surrender, splitting, joystick betting, persistent bankroll and music.",
    "projectName": "Casino Blackjack",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "cards",
      "blackjack",
      "casino",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "galacticon",
    "label": "Galacticon (1988)",
    "detail": "Bill Chin and George Miller's COMPUTE! arcade game from April 1988, with orbital planets, targeted fireballs, overheating blaster, flickered sprites, music and high scores.",
    "projectName": "Galacticon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "space",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "giant-book-reversi",
    "label": "Giant Book Reversi (1984)",
    "detail": "Graham Charlton's Reversi from Tim Hartnell's Giant Book of Computer Games, with Classic and depth-two Master opponents, legal-move hints, animated flips and music.",
    "projectName": "Giant Book Reversi",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "reversi",
      "computer-player",
      "music",
      "manual-canon"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "giant-book-checkers",
    "label": "Giant Book Checkers (1984)",
    "detail": "Tim Hartnell's Giant Book of Computer Games checkers program, adapted with legal moves, chained captures, kings, animated movement, a book-faithful computer player and music.",
    "projectName": "Giant Book Checkers",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "checkers",
      "computer-player",
      "sprites",
      "music",
      "manual-canon"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "boardgames",
    "label": "Giant Book Board Games (1984)",
    "detail": "A combined cartridge of Checkers, Reversi, Awari and Four in a Row from Tim Hartnell's Giant Book of Computer Games, with a shared joystick menu for switching among all four games.",
    "projectName": "Giant Book Board Games",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "checkers",
      "reversi",
      "awari",
      "mancala",
      "four-in-a-row",
      "collection"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "more-board-games",
    "label": "More Giant Book Board Games (1984)",
    "detail": "A combined cartridge of Shogun, Gomoku and Knightsbridge from Tim Hartnell's Giant Book of Computer Games, with a shared joystick menu and computer opponents.",
    "projectName": "More Giant Book Board Games",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "shogun",
      "gomoku",
      "knightsbridge",
      "collection"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "awari",
    "label": "Awari (1984)",
    "detail": "Tim Hartnell's seed-sowing strategy game, with Book and Master computer opponents, animated pits, captures, music and sound effects.",
    "projectName": "Awari",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "awari",
      "mancala",
      "computer-player",
      "music"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "shogun",
    "label": "Shogun (1984)",
    "detail": "A Hasami Shogi adaptation with Book and Master computer opponents, custodial captures, animated movement, music and sound effects.",
    "projectName": "Shogun",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "shogun",
      "computer-player",
      "music"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "gomoku",
    "label": "Gomoku (1984)",
    "detail": "A five-in-a-row strategy game from Tim Hartnell's Giant Book of Computer Games, with a computer opponent, animated board and music.",
    "projectName": "Gomoku",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "gomoku",
      "computer-player",
      "music"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "knightsbridge",
    "label": "Knightsbridge (1984)",
    "detail": "A tactical board game in which a chance-selected knight races to take five opposing pieces, adapted with joystick play, animation and music.",
    "projectName": "Knightsbridge",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "knights",
      "strategy",
      "music"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "four-in-a-row",
    "label": "Four in a Row (1984)",
    "detail": "A vertical four-in-a-row game with Book and Master computer opponents, joystick controls, animated pieces, music and sound effects.",
    "projectName": "Four in a Row",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "board",
      "four-in-a-row",
      "computer-player",
      "music"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "robot-minefield",
    "label": "Robot Minefield (1984)",
    "detail": "A grid survival game in which pursuing robots must be lured into mines or one another, with joystick action, music and sound effects.",
    "projectName": "Robot Minefield",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "arcade",
      "robots",
      "strategy",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "tutankhamens-tomb",
    "label": "Tutankhamen's Tomb (1984)",
    "detail": "A timed three-dimensional rescue through a 10 by 10 by 10 tomb, using uncertain sound clues, a torch-lit front view and persistent trail markings.",
    "projectName": "Tutankhamen's Tomb",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "exploration",
      "3d",
      "puzzle",
      "sound"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "duke-of-dragonfear",
    "label": "The Duke of Dragonfear (1984)",
    "detail": "A Hunt the Wumpus-inspired cave adventure with dragons, treasure, quicksand, magic caves, an unreliable amulet and occasional map glimpses.",
    "projectName": "The Duke of Dragonfear",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "adventure",
      "exploration",
      "dragons",
      "strategy"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "moonlander",
    "label": "Moonlander (1984)",
    "detail": "Two lunar-landing simulations from Tim Hartnell's Giant Book of Computer Games: a turn-based fuel challenge and a faster real-time descent.",
    "projectName": "Moonlander",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "simulation",
      "space",
      "lander",
      "realtime"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "stronghold",
    "label": "Stronghold of the Dwarven Lords (1984)",
    "detail": "A first-person 3-D maze adaptation from Tim Hartnell's Giant Book of Computer Games, with randomized caverns, a distance beam, optional maps, music and persistent best scores.",
    "projectName": "Stronghold of the Dwarven Lords",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "maze",
      "3d",
      "exploration",
      "music",
      "manual-canon"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "3d-super-plotter",
    "label": "3-D Super Plotter (1987)",
    "detail": "Fourteen interactive 3-D mathematical surfaces inspired by COMPUTE!'s 3-D Surfaces and Superplotter, with rotation, tilt, mesh density, perspective and hidden-line controls.",
    "projectName": "3-D Super Plotter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "demo",
      "3d",
      "mathematics",
      "graphics",
      "manual-canon"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "hyperwar",
    "label": "Hyperwar (1984)",
    "detail": "A three-dimensional space patrol from Tim Hartnell's Giant Book of Computer Games, with helm controls, scanners, tactical views and a drifting Dosznti mothership.",
    "projectName": "Hyperwar",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "space",
      "strategy",
      "simulation",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "avalanche",
    "label": "Avalanche (1984)",
    "detail": "A twenty-year alpine survival and resource-management game from Tim Hartnell's Giant Book of Computer Games.",
    "projectName": "Avalanche",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "strategy",
      "simulation",
      "alpine",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "avalanche-run",
    "label": "Avalanche Run (2026)",
    "detail": "An original first-person downhill race inspired by Avalanche, with pseudo-3D slopes, gates, obstacles and a pursuing avalanche across three stages.",
    "projectName": "Avalanche Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "inspired",
      "game",
      "arcade",
      "3d",
      "skiing",
      "music"
    ],
    "originKind": "inspired",
    "originLabel": "Inspired work"
  },
  {
    "id": "skiing",
    "label": "Skiing (2026)",
    "detail": "An original three-mode downhill game inspired by Coleco's unreleased Skiing concept, with rolling pseudo-3D hills, varied crests, jumps, aerial tricks, Ski Trails, Slalom and Avalanche Run.",
    "projectName": "Skiing",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "arcade",
      "sports",
      "3d",
      "skiing",
      "slalom",
      "music"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "microchip-golf",
    "label": "Microchip Golf (1984)",
    "detail": "A nine-hole behind-the-ball golf adaptation of Caddy from Tim Hartnell's Giant Book, with aiming, power, wind, bunkers, putting and a score card.",
    "projectName": "Microchip Golf",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "sports",
      "golf",
      "3d",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "las-vegas-high",
    "label": "Las Vegas High (1984)",
    "detail": "A slot-machine adaptation from Tim Hartnell's Giant Book with animated reels, authentic symbol odds, bets, payouts and casino chatter.",
    "projectName": "Las Vegas High",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "casino",
      "slots",
      "chance",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "roulette",
    "label": "Roulette (1984)",
    "detail": "The American roulette game from Tim Hartnell's Giant Book, with an animated wheel, moving chip and sixteen authentic bet types.",
    "projectName": "Roulette",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "casino",
      "roulette",
      "chance",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "dice-hall",
    "label": "The Dice Hall (1984)",
    "detail": "Three Giant Book dice games on one cartridge: Seven/Eleven, No Sweat and Under 'N' Over, with animated throws and betting.",
    "projectName": "The Dice Hall",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "dice",
      "casino",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "dice-duels",
    "label": "Dice Duels (1984)",
    "detail": "Four Giant Book dice games against the computer: Chemin de Computer, One-and-Twenty, Snakes' Eyes and Malibu.",
    "projectName": "Dice Duels",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "dice",
      "computer-player",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "card-parlour",
    "label": "The Card Parlour (1984)",
    "detail": "Two Giant Book card diversions: the betting game Inner Spring and Madame Zara's illustrated fortune reading.",
    "projectName": "The Card Parlour",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "cards",
      "fortune",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "brain-games-1",
    "label": "Brain Games I (1984)",
    "detail": "Five Giant Book puzzles: Fastermind, Idaho Stars, Idaho Squares, Executioner and Cubist.",
    "projectName": "Brain Games I",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "puzzle",
      "logic",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "brain-games-2",
    "label": "Brain Games II (1984)",
    "detail": "Five more Giant Book puzzles: Mumble Marble, Cyclotron, Switcheroo, Flipper and Searching for Daryl.",
    "projectName": "Brain Games II",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "puzzle",
      "logic",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "just-for-fun",
    "label": "Just for Fun (1984)",
    "detail": "A Giant Book collection containing Nimgrab, Follow the Leader, Noughts and Crosses, and four Cavalcade puzzles.",
    "projectName": "Just for Fun",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "puzzle",
      "strategy",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "thinking-machines",
    "label": "Thinking Machines (1984)",
    "detail": "Four artificial-intelligence programs from Tim Hartnell's Giant Book: Eliza, Electronic Brain, Proboscidean and Amanuensis.",
    "projectName": "Thinking Machines",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "ai",
      "cards",
      "text"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "stars-and-signs",
    "label": "Stars and Signs (1984)",
    "detail": "Two Giant Book printer programs reimagined on screen: Conway's Life as Celestia and giant scrolling Billboard messages.",
    "projectName": "Stars and Signs",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "life",
      "text",
      "graphics"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cavern-shadow-thieves",
    "label": "Cavern of the Shadow Thieves (1984)",
    "detail": "A generated twenty-cavern Giant Book adventure with one-way tunnels, treasure, tolls, transportation spells and a strict time limit.",
    "projectName": "Cavern of the Shadow Thieves",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "adventure",
      "caverns",
      "procedural",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "bannochburn-legacy",
    "label": "The Bannochburn Legacy (1984)",
    "detail": "A Giant Book castle adventure with changing rooms, wandering monsters, treasures, attribute-based combat and the Guardian of the Black Lagoon.",
    "projectName": "The Bannochburn Legacy",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "adventure",
      "castle",
      "combat",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "simulations",
    "label": "Simulations (1984)",
    "detail": "Three management games from Tim Hartnell's Giant Book: Mistress of Xenophobia, Rural Pursuits and Chairman of the Board.",
    "projectName": "Simulations",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "book",
      "adaptation",
      "game",
      "collection",
      "simulation",
      "management",
      "strategy"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "casino",
    "label": "The Casino (2026)",
    "detail": "Six casino games sharing one wallet: the March 1988 COMPUTE! Blackjack plus five games from Tim Hartnell's Giant Book of Computer Games.",
    "projectName": "The Casino",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "book",
      "adaptation",
      "game",
      "collection",
      "casino",
      "cards",
      "dice"
    ],
    "originKind": "adaptation-collection",
    "originLabel": "Original collection of adaptations"
  },
  {
    "id": "lamplighter",
    "label": "Lamplighter (2026)",
    "detail": "A peaceful original adventure by Claude: relight a dark town, awaken its districts, collect notes and secrets, and guide the streets toward dawn.",
    "projectName": "Lamplighter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "adventure",
      "exploration",
      "lighting",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "starlight",
    "label": "Starlight (2026)",
    "detail": "A ten-night Lights Out-style star puzzle; each solved sky reveals a constellation over a 120-color dusk introduction.",
    "projectName": "Starlight",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "puzzle",
      "constellations",
      "120-colors",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "firefly-jar",
    "label": "Firefly Jar (2026)",
    "detail": "A gentle summer-night toy: catch twenty glowing fireflies in a jar, then release them back into the sky.",
    "projectName": "Firefly Jar",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "toy",
      "fireflies",
      "sprites",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "oregon",
    "label": "Oregon (1980)",
    "detail": "A faithful ColecoVision port of MECC's Apple II Oregon: outfit a wagon, hunt, manage supplies and survive the 2,040-mile trail to Oregon City.",
    "projectName": "Oregon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "adaptation",
      "game",
      "educational",
      "simulation",
      "history",
      "apple-ii",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "skydiver",
    "label": "Skydiver (July 1983)",
    "detail": "Alan Crossley's COMPUTE!'s Gazette parachuting game: choose a landing pad, compensate for the wind, delay opening the chute and build a bonus streak.",
    "projectName": "Skydiver",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "skydiving",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "snake-escape",
    "label": "Snake Escape (July 1983)",
    "detail": "Daryl Biberdorf's COMPUTE!'s Gazette maze game: guide a growing snake through a poisonous garden and reach the escape hole before time expires.",
    "projectName": "Snake Escape",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "maze",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "viper",
    "label": "The Viper (August 1983)",
    "detail": "Dave and Casey Gardner's COMPUTE!'s Gazette maze game: collect asterisks while an increasingly dangerous viper hunts through open or walled playfields.",
    "projectName": "The Viper",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "maze",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "cylon-zap",
    "label": "Cylon Zap (August 1983)",
    "detail": "Mark Dudley's COMPUTE!'s Gazette defense game: choose five heroes, intercept descending Cylons and protect the station through increasingly fast attacks.",
    "projectName": "Cylon Zap",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "shooter",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "potholes",
    "label": "Potholes (September 1983)",
    "detail": "Joe W. Rocke's COMPUTE!'s Gazette road game: fill potholes across city blocks while avoiding traffic and the pursuing street commissioner.",
    "projectName": "Potholes",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "maze",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "demon-star",
    "label": "Demon Star (September 1983)",
    "detail": "Stan McDaniel's COMPUTE!'s Gazette space game: explore a scrolling universe, fire torpedoes and confront rare Demon Stars and Quasars.",
    "projectName": "Demon Star",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "space",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "defend",
    "label": "Defend (September 1983)",
    "detail": "C. Regena's COMPUTE!'s Gazette Beginner's Corner game: defend a moving base, shoot advancing invaders and survive the accelerating attack.",
    "projectName": "Defend",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "beginner",
      "arcade",
      "shooter",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "alfabug",
    "label": "Alfabug (July 1983)",
    "detail": "Michael Wasilenko's COMPUTE!'s Gazette alphabet game: choose letters in sequence or at random and send five animated bugs racing toward the finish post.",
    "projectName": "Alfabug",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "educational",
      "alphabet",
      "racing",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "timepiece",
    "label": "VIC Timepiece (July 1983)",
    "detail": "Joseph D. Wright's COMPUTE!'s Gazette rolling-ball clock: set the time, watch thirty balls count hours and minutes, or use fast mode to observe the racks tip and reset.",
    "projectName": "VIC Timepiece",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "simulation",
      "clock",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "type-in",
    "label": "Type-In (2026)",
    "detail": "An original game about programming in 1983: decipher a worn magazine listing, run the resulting VIC-20 game, diagnose its errors and personalize the finished program.",
    "projectName": "Type-In",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "programming",
      "educational",
      "vic-20",
      "magazine",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "the-stacks",
    "label": "The Stacks (2026)",
    "detail": "An original first-person ray-cast adventure: explore a dark magazine library, recover eight lost pages and manage a fading oil lamp across changing layouts.",
    "projectName": "The Stacks",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "adventure",
      "ray-casting",
      "first-person",
      "exploration",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "sounding",
    "label": "Sounding (2026)",
    "detail": "An original echolocation adventure: guide a young bat through twelve dark caves by sending visible sound waves around rock, moths, snakes and dripping water.",
    "projectName": "Sounding",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "adventure",
      "echolocation",
      "caves",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "lighthouse",
    "label": "Lighthouse (2026)",
    "detail": "Keep Gull Point's clockwork beacon turning through five stormy nights, sweeping ships with its light and guiding fogbound vessels by horn before they reach the reefs.",
    "projectName": "Lighthouse",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "simulation",
      "lighthouse",
      "ships",
      "weather",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "migration",
    "label": "Migration (2026)",
    "detail": "Lead a flowing V of Canada geese south across four seasonal legs, feeding on lakes while outrunning frost, storms and hawks and recovering scattered flock members.",
    "projectName": "Migration",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "arcade",
      "migration",
      "birds",
      "weather",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "tiny-crow-nest",
    "label": "Tiny Crow Nest (2026)",
    "detail": "The compact original Crow Nest design: aim a scarecrow's pumpkin throws at small destructible crate stacks and dislodge every crow with a tiny physics engine.",
    "projectName": "Tiny Crow Nest",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "arcade",
      "physics",
      "compact",
      "halloween",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "crow-nest",
    "label": "Crow Nest (2026)",
    "detail": "The expanded camera-led pumpkin physics game: pan across an eighty-column Halloween field, smash layered structures, strike a spinning star and send every crow flying.",
    "projectName": "Crow Nest",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "arcade",
      "physics",
      "scrolling",
      "halloween",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "shoo",
    "label": "Shoo! (2026)",
    "detail": "An original farm tower-defense game with three fields and eight waves each: place and improve scarecrows, clappers and owls before the crows reach the barn.",
    "projectName": "Shoo!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "strategy",
      "tower-defense",
      "farm",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "sundown-road",
    "label": "Sundown Road (2026)",
    "detail": "Drive Pip's little red car through four perspective country-road stages, collecting gifts and flowers and avoiding roadside hazards before sunset.",
    "projectName": "Sundown Road",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "driving",
      "pseudo-3d",
      "road",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "seedlings",
    "label": "Seedlings (2026)",
    "detail": "Rescue wandering seedlings across eight gardens by assigning dig, stop and stair-building jobs before they fall, drown or miss the sunny door.",
    "projectName": "Seedlings",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "puzzle",
      "strategy",
      "rescue",
      "garden",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "snowball-hill",
    "label": "Snowball Hill (2026)",
    "detail": "A one- or two-player artillery duel with wind, deformable bitmap snow, sliding snowmen and first-to-three-round matches.",
    "projectName": "Snowball Hill",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "artillery",
      "physics",
      "multiplayer",
      "snow",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "little-town",
    "label": "Little Town (2026)",
    "detail": "Build roads, zone homes, shops and works, provide parks and power, balance taxes and upkeep, and grow a living town of 600 people into a city.",
    "projectName": "Little Town",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "simulation",
      "city-builder",
      "strategy",
      "economy",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "railyard",
    "label": "Railyard (2026)",
    "detail": "Route color-coded trains through eight increasingly busy yards by setting track switches, avoiding collisions, wrong stations and returns to the tunnels.",
    "projectName": "Railyard",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "puzzle",
      "strategy",
      "railway",
      "trains",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "busy-bees",
    "label": "Busy Bees (2026)",
    "detail": "Tend a hive through spring, summer and autumn: plant flowers, protect autonomous nectar-gathering bees from wasps and meet each season's honey quota.",
    "projectName": "Busy Bees",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "simulation",
      "beekeeping",
      "garden",
      "seasons",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "lite-lighthouse",
    "label": "Lite Lighthouse (2026)",
    "detail": "Guide ships around hidden rocks with a rotating lighthouse beam through five increasingly busy night watches.",
    "projectName": "Lite Lighthouse",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "simulation",
      "lighthouse",
      "ships",
      "night",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "deep-halls",
    "label": "Deep Halls (2026)",
    "detail": "Escape four first-person 3D halls using a 32-ray maze renderer, hidden-page drawing, a compass and a hold-to-view map.",
    "projectName": "Deep Halls",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "maze",
      "3d",
      "raycasting",
      "exploration",
      "music",
      "ai-assisted"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "midnight-manor",
    "label": "Midnight Manor (2026)",
    "detail": "Explore a textured first-person haunted manor by lantern light, recover three music-box pieces, unlock doors and evade a wall-crossing ghost before the oil runs out.",
    "projectName": "Midnight Manor",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "inspired",
      "game",
      "horror",
      "3d",
      "raycasting",
      "exploration",
      "haunted-house",
      "music",
      "ai-assisted"
    ],
    "originKind": "inspired",
    "originLabel": "Inspired work"
  },
  {
    "id": "oil-tycoon",
    "label": "Oil Tycoon (October 1983)",
    "detail": "Gordon F. Wheat's COMPUTE!'s Gazette oil-field game: drill through dirt and shale, pump connected oil pockets, manage dynamite and survive gas and hidden devils.",
    "projectName": "Oil Tycoon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "simulation",
      "strategy",
      "vic-20",
      "commodore-64",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "chicken-little",
    "label": "Chicken Little (November 1983)",
    "detail": "Jeff Wolverton's COMPUTE!'s Gazette action game: dodge the falling sky, throw rocks at its pieces and clear each increasingly fast level.",
    "projectName": "Chicken Little",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "shooter",
      "vic-20",
      "commodore-64",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "martian-prisoner",
    "label": "Martian Prisoner (November 1983)",
    "detail": "A graphical menu-driven presentation of COMPUTE!'s Gazette's Martian text adventure: escape the cell, evade guards, gather equipment and destroy the ship.",
    "projectName": "Martian Prisoner",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined",
      "game",
      "adventure",
      "text-adventure",
      "vic-20",
      "commodore-64",
      "music",
      "gazette"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lemonade-stand",
    "label": "Lemonade Stand (1979)",
    "detail": "A faithful joystick adaptation of Apple Computer's classic business simulation, preserving its weather, pricing, sales and Applesoft floating-point calculations.",
    "projectName": "Lemonade Stand",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "adaptation",
      "game",
      "simulation",
      "business",
      "strategy",
      "apple-ii",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "blam",
    "label": "BLAM! (December 1983)",
    "detail": "Kevin Dewey's COMPUTE!'s Gazette arcade game: defend the lower screen by blasting descending targets before they reach your position.",
    "projectName": "BLAM!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "shooter",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "bowling-champ",
    "label": "Bowling Champ (December 1983)",
    "detail": "Joseph Ganci's COMPUTE!'s Gazette bowling game, preserving its aim, delivery and scoring in a joystick-driven ColecoVision presentation.",
    "projectName": "Bowling Champ",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "sports",
      "bowling",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "saucer-shooter",
    "label": "Saucer Shooter (December 1983)",
    "detail": "Ron Watts' COMPUTE!'s Gazette target game: track and shoot moving saucers while managing timing and ammunition.",
    "projectName": "Saucer Shooter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "shooter",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "spike",
    "label": "Spike (December 1983)",
    "detail": "A graphical ColecoVision reinterpretation of Eric Brandon's COMPUTE!'s Gazette game, reconstructed from the published article rather than its original machine-language implementation.",
    "projectName": "Spike",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined",
      "game",
      "arcade",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "space-duel",
    "label": "Space Duel (December 1983)",
    "detail": "A ColecoVision reinterpretation of Andy Hayes' COMPUTE!'s Gazette space-combat game, rebuilt from the article's rules and presentation.",
    "projectName": "Space Duel",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined",
      "game",
      "space",
      "arcade",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hardhat-climber",
    "label": "Hardhat Climber (January 1984)",
    "detail": "Chris Lesher's COMPUTE!'s Gazette construction-site action game, adapted for ColecoVision joystick play.",
    "projectName": "Hardhat Climber",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "climbing",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "cave-in",
    "label": "Cave-In (January 1984)",
    "detail": "Paul L. Bupp and Stephen P. Drop's COMPUTE!'s Gazette maze rules transformed into a shaded first-person 3D cave exploration game.",
    "projectName": "Cave-In",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined",
      "game",
      "maze",
      "3d",
      "exploration",
      "vic-20",
      "music",
      "gazette"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "canyon-cruiser",
    "label": "Canyon Cruiser (January 1984)",
    "detail": "Thomas Catsburg's COMPUTE!'s Gazette canyon-flying game, adapted for joystick control with a winding passage, title music and progressively tighter navigation.",
    "projectName": "Canyon Cruiser",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "flying",
      "vic-20",
      "commodore-64",
      "music",
      "gazette"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "juggler",
    "label": "Juggler (January 1983)",
    "detail": "Doug Ferguson's COMPUTE! juggling game, preserving its two- and three-ball arcs, movable hands, scoring and surprise oversized balls.",
    "projectName": "Juggler",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "juggling",
      "vic-20",
      "atari",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "thunderbird",
    "label": "Thunderbird (January 1983)",
    "detail": "Dave Sanders' COMPUTE! action game: steer the Thunderbird to rebound a satellite through saucers, trees and wells while protecting the top of the field.",
    "projectName": "Thunderbird",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "copycat",
    "label": "Copy Cat (February 1983)",
    "detail": "Mark and Dan Powell's COMPUTE! memory game, preserving its growing four-box colour-and-note sequence, timeout hints and three-miss limit.",
    "projectName": "Copy Cat",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "memory",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "races",
    "label": "A Day at the Races (February 1983)",
    "detail": "Robert B. Ferree's COMPUTE! horse-racing game, preserving its named horses, track conditions, hidden odds, betting and five-race competition.",
    "projectName": "A Day at the Races",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "racing",
      "simulation",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "slalom",
    "label": "Slalom (February 1983)",
    "detail": "George Leotti's COMPUTE! skiing game, preserving its fixed Pine Mountain course, pseudo-3D flags, selectable length and speed, penalties and best time.",
    "projectName": "Slalom",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "sports",
      "skiing",
      "pet",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "mastermaze",
    "label": "Mastermaze (February 1983)",
    "detail": "Kenneth S. Szajda's COMPUTE! multilevel maze, preserving its stacked floors, one-use tunnels, visible or invisible walls and timed escape.",
    "projectName": "Mastermaze",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "maze",
      "atari",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "boggler",
    "label": "Boggler (March 1983)",
    "detail": "Gary Braun's COMPUTE! two-player strategy game, preserving pair captures, five-in-a-row victories and the original 17-by-17 board.",
    "projectName": "Boggler",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "strategy",
      "board-game",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "closeout",
    "label": "Closeout (March 1983)",
    "detail": "L. L. Beh's COMPUTE! department-store chase, preserving its sale-item rounds, homing shoppers, stairs and limited defensive shoves.",
    "projectName": "Closeout",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "maze",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "fighteraces",
    "label": "Fighter Aces (March 1983)",
    "detail": "John Parr's COMPUTE! two-player biplane game, preserving eight-way flight, limited-range shots, hazards and first-to-fifteen scoring.",
    "projectName": "Fighter Aces",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "flying",
      "vic-20",
      "two-player",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "trapshoot",
    "label": "TI Trapshoot (March 1983)",
    "detail": "C. Regena's COMPUTE! TI-99/4A trapshooting game, preserving its seven-position shotgun, moving clay pigeon, dot collision and fifty-shot score.",
    "projectName": "TI Trapshoot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "shooting",
      "ti-99-4a",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "matchem",
    "label": "TI-99 Match-Em (April 1983)",
    "detail": "C. Regena's COMPUTE! TI-99/4A concentration game, preserving its sixteen lettered squares, eight hidden pairs, try counter and original matching quirks.",
    "projectName": "TI-99 Match-Em",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "memory",
      "ti-99-4a",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "chutes",
    "label": "Chutes (April 1983)",
    "detail": "Matt Giwer's COMPUTE! perspective-dodging game, preserving its three descending chutes, approaching RAM-ships, thirty rounds, levels and scoring.",
    "projectName": "Chutes",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "perspective",
      "atari",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "beetrap",
    "label": "Bee Trap (June 1983)",
    "detail": "Robert L. Lykins' COMPUTE! guide-bee game, preserving its lost bees, flower bed, Venus bee traps, credits and escalating danger.",
    "projectName": "Bee Trap",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "vic-20",
      "atari",
      "color-computer",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "hawkmen",
    "label": "The Hawkmen of Dindrin (June 1983)",
    "detail": "Esteban V. Aguilar Jr.'s COMPUTE! flying game, preserving its energy, tongue attacks, floaters, skimmer, lizards, stones and scrolling descent.",
    "projectName": "The Hawkmen of Dindrin",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "flying",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "castlequest",
    "label": "Castle Quest (July 1983)",
    "detail": "Timothy G. Baldwin's COMPUTE! castle action game, preserving its thirty rooms, servants, falling walls, keys, cloak power and three wizards.",
    "projectName": "Castle Quest",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "castle",
      "atari",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "adnil",
    "label": "The Fortress of Adnil (July 1983)",
    "detail": "George W. Miller's COMPUTE! fortress game, preserving its ZX81 display-file map, energy economy, multiplying NAWS, treasure and laser sword.",
    "projectName": "The Fortress of Adnil",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "strategy",
      "action",
      "zx81",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "astrostorm",
    "label": "Astrostorm (June 1983)",
    "detail": "Peter Lear's COMPUTE! asteroid-field mission, preserving its selectable depth, scrolling VIC-20 field, six crossings, scoring and two-minute delivery limit.",
    "projectName": "Astrostorm",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "adaptation",
      "game",
      "arcade",
      "space",
      "vic-20",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "rebound",
    "label": "Rebound (February 1985)",
    "detail": "A ColecoVision reimagining of Chris Metcalf and Marc Sugiyama's COMPUTE! machine-language Breakout game, retaining its five brick rows, eight balls and progressive speed.",
    "projectName": "Rebound",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "breakout",
      "ibm-pc",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "spacecaverns",
    "label": "Space Caverns (March 1985)",
    "detail": "A ColecoVision reimagining of Vince Valenti's COMPUTE! cavern game, retaining its homing aliens, shrinking rooms, destructible rocks, bonus rounds and high scores.",
    "projectName": "Space Caverns",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "space",
      "atari",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "acrobat",
    "label": "Acrobat (February 1985)",
    "detail": "A ColecoVision reimagining of Peter Rizzuto's COMPUTE! obstacle runner, featuring parallax scenery, jumping, sliding, flips, four settings and progressive speed.",
    "projectName": "Acrobat",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "runner",
      "atari",
      "commodore-64",
      "vic-20",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mindbusters",
    "label": "Mind Busters (April 1985)",
    "detail": "A ColecoVision reimagining of Ned W. Schultz's COMPUTE! picture puzzle, featuring three sliding-row challenges, smooth movement, timing and session records.",
    "projectName": "Mind Busters",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "puzzle",
      "commodore-64",
      "ti-99-4a",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "spacedodger",
    "label": "Space Dodger (May 1985)",
    "detail": "A ColecoVision reimagining of Matthew Marulio's COMPUTE! survival game, featuring layered starfields, ranked difficulty, eight alien lanes and smooth sprite motion.",
    "projectName": "Space Dodger",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "space",
      "ti-99-4a",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "animator",
    "label": "Animator (August 1985)",
    "detail": "A ColecoVision reimagining of Steve Johnson's COMPUTE! animation tool, with twenty editable sprite frames, drawing operations, demos, playback speed and per-frame sounds.",
    "projectName": "Animator",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Graphics",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "graphics",
      "animation",
      "tool",
      "ibm-pc",
      "atari",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "witchinghour",
    "label": "The Witching Hour (October 1985)",
    "detail": "A ColecoVision reimagining of Brian Flynn's COMPUTE! Alquerque game, with witches, ghosts, mandatory chained jumps, computer play and an animated moonlit board.",
    "projectName": "The Witching Hour",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "strategy",
      "board-game",
      "alquerque",
      "ibm-pc",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "laserbeam",
    "label": "Laser Beam (October 1985)",
    "detail": "A ColecoVision reimagining of Mike Greenfield's COMPUTE! arcade game, combining its Atari and Commodore 64 rule sets as Classic and Basket modes.",
    "projectName": "Laser Beam",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "atari",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "solitaire",
    "label": "Solitaire (January 1986)",
    "detail": "Ben Elizer's COMPUTE! Gaps solitaire game, preserving its four suited rows, movable gaps, dead spaces, redeals and completed-run rules.",
    "projectName": "Solitaire",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "cards",
      "solitaire",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "highrise",
    "label": "High Rise (February 1986)",
    "detail": "A ColecoVision reimagining of Charles McGuyer's COMPUTE! construction game, with moving elevators, patrol robots, birds and smooth vertical scrolling.",
    "projectName": "High Rise",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "construction",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "switchbox",
    "label": "Switchbox (March 1986)",
    "detail": "Todd Heimarck's COMPUTE! strategy game, preserving its five levels of two-way switches, loaded plates, triggers, chain reactions and four scoring rounds.",
    "projectName": "Switchbox",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "strategy",
      "commodore-128",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "tugawar",
    "label": "Tug-A-War (April 1986)",
    "detail": "Mark Tuttle's COMPUTE! strategy game, preserving its eleven colored boxes, cyclic changes, ball movement and original Commodore move order.",
    "projectName": "Tug-A-War",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "strategy",
      "two-player",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "hickory",
    "label": "Hickory, Dickory, Dock (May 1986)",
    "detail": "A ColecoVision reimagining of Barbara H. Schulak's COMPUTE! time-learning program, with an analog clock, practice, three tests and a nursery-rhyme reward.",
    "projectName": "Hickory, Dickory, Dock",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Education",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "education",
      "clock",
      "children",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "miamiice",
    "label": "Miami Ice (June 1986)",
    "detail": "Jeff Kulczycki's COMPUTE! icy driving game, preserving its sliding car, timed parking challenge, seven streets, three cars and session high-score table.",
    "projectName": "Miami Ice",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "driving",
      "commodore-128",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "ufoinvasion",
    "label": "UFO Invasion (June 1986)",
    "detail": "A ColecoVision reimagining of COMPUTE!'s Arctic-base defense game, with cockpit instruments, radar-guided targeting, clouds, shields and eight levels.",
    "projectName": "UFO Invasion",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "shooting",
      "ibm-pc",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "shaker",
    "label": "Shaker (June 1986)",
    "detail": "A ColecoVision reimagining of John Fedor's Ahoy! shell game, with seven pop cans, animated shuffling, eleven speed levels, three misses and session high scores.",
    "projectName": "Shaker",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "memory",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "starstrike",
    "label": "Star Strike (June 1986)",
    "detail": "A ColecoVision reimagining of Bob Eaton's Ahoy! space shooter, with perspective targeting, plasma spheres, shields, three attack phases and four difficulty levels.",
    "projectName": "Star Strike",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "shooting",
      "space",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hexwar",
    "label": "Hex War (July 1986)",
    "detail": "Todd Heimarck's COMPUTE! strategy game, preserving its 61-hex field, robot armies, cities, movement points, battles, reinforcements and five scenarios.",
    "projectName": "Hex War",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "strategy",
      "hex-grid",
      "commodore-128",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "crazyjoe",
    "label": "Crazy Joe (July 1986)",
    "detail": "Chris Greacen's Ahoy! motorcycle game, preserving its six-lane traffic, throttle-driven vertical movement, accelerating road and three difficulty levels.",
    "projectName": "Crazy Joe",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "faithful-adaptation",
      "game",
      "arcade",
      "driving",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "headon",
    "label": "Head-On (July 1986)",
    "detail": "A ColecoVision reimagining of John Fedor's Ahoy! helicopter duel, with independent split-screen parallax, radar, two-player play and computer opponents.",
    "projectName": "Head-On",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "helicopter",
      "two-player",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "nebergall",
    "label": "Nebergall Run (July 1986)",
    "detail": "Roger Browne and Steve Gebert's Ahoy! targeting game, expanded with charged laser fire, a heat gauge and a graphical cockpit while preserving its mission rules.",
    "projectName": "Nebergall Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "expanded-adaptation",
      "game",
      "arcade",
      "shooting",
      "commodore-128",
      "music"
    ],
    "originKind": "expanded-adaptation",
    "originLabel": "Adaptation + expanded AI"
  },
  {
    "id": "skull",
    "label": "Escape from Skull Castle (July 1986)",
    "detail": "James C. Hilty's Ahoy! rescue game, preserving its keys, patrolling skulls, skeletons, dancing skelettes, timed rounds and four-man challenge.",
    "projectName": "Escape from Skull Castle",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "faithful-adaptation",
      "game",
      "arcade",
      "maze",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "flap",
    "label": "Flap! (August 1986)",
    "detail": "A ColecoVision adaptation of Andrew Vajoczki's Ahoy! aerial combat game, with flap physics, gravity, drones, target-pad landings and escalating timed levels.",
    "projectName": "Flap!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "flying",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "meteorrun",
    "label": "Meteor Run (August 1986)",
    "detail": "A ColecoVision adaptation of Tony Brantner's Ahoy! space game, with momentum flight, scrolling mountains, tumbling meteors, lasers, crystals and limited power.",
    "projectName": "Meteor Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "space",
      "commodore-64",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "stepon",
    "label": "Step On It (August 1986)",
    "detail": "Penny DeGroff's Ahoy! platform game, preserving its diagonal boot hops, multiplying baby Ums, pursuing mother Um, level bonuses and four-boot challenge.",
    "projectName": "Step On It",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "faithful-adaptation",
      "game",
      "arcade",
      "platform",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "tightrope",
    "label": "Tightrope (August 1986)",
    "detail": "Daniel Aven's COMPUTE! balancing game, preserving its self-walking acrobat, increasing instability, alternating unicycle levels, bonuses and falls.",
    "projectName": "Tightrope",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "arcade",
      "circus",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "beehive",
    "label": "Beehive (September 1986)",
    "detail": "Steve Michel's COMPUTE! connection game, preserving its 11-by-11 Hex board, opposing borders, random first player and unbroken winning paths.",
    "projectName": "Beehive",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "strategy",
      "board-game",
      "amiga",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "tictactoe3d",
    "label": "3-D Tic-Tac-Toe (September 1986)",
    "detail": "David Bohlke's COMPUTE! four-level Tic-Tac-Toe game, preserving its 4-by-4-by-4 cube, 76 winning lines and weighted computer player.",
    "projectName": "3-D Tic-Tac-Toe",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "strategy",
      "board-game",
      "atari-st",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "pegsolitaire",
    "label": "Peg Solitaire (September-October 1986)",
    "detail": "C. Regena's COMPUTE! TI peg-solitaire program, preserving legal orthogonal jumps, move history, undo, restart and replay, with additional boards and hints.",
    "projectName": "Peg Solitaire",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "puzzle",
      "solitaire",
      "ti-99-4a",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "prisonball",
    "label": "Prisonball (October 1986)",
    "detail": "A ColecoVision reimagining of John Scarborough's COMPUTE! machine-language game, with paired paddles, three colored balls, five scoring walls and timed matches.",
    "projectName": "Prisonball",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "two-player",
      "atari",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pyramidpower",
    "label": "Pyramid Power (October 1986)",
    "detail": "A ColecoVision reimagining of Mike Lightstone's COMPUTE! pyramid game, with 21 color-changing cubes, lifts, bouncing rocks and a pursuing creature.",
    "projectName": "Pyramid Power",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "pyramid",
      "amiga",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lumpies",
    "label": "Lumpies of Lotus IV (October 1986)",
    "detail": "A ColecoVision reimagining of John and Jeff Klein's COMPUTE! cave adventure, retaining its two-level maze, prisoners, food, weapons, combat and escape mission.",
    "projectName": "Lumpies of Lotus IV",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "reimagined-adaptation",
      "game",
      "adventure",
      "maze",
      "ibm-pcjr",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wari",
    "label": "Wari (February 1987)",
    "detail": "Don Donati's COMPUTE! mancala game, preserving its twelve compartments, counterclockwise sowing, chained captures, starvation and original computer strategy.",
    "projectName": "Wari",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "strategy",
      "board-game",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "rememory",
    "label": "Rememory (May 1987)",
    "detail": "Charles Harbert's COMPUTE! memory game, preserving its 54 boxes, 27 paired shapes, one- or two-player turns, optional timer and configurable match target.",
    "projectName": "Rememory",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "compute!",
      "faithful-adaptation",
      "game",
      "memory",
      "two-player",
      "commodore-64",
      "music"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "skidders",
    "label": "Skidders (April 1987)",
    "detail": "I. J. Lyles Jr.'s COMPUTE!'s Gazette survival game, preserving its wraparound arena, four accelerating skidders, slowing central wall and forty-second challenge.",
    "projectName": "Skidders",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "faithful-adaptation",
      "game",
      "arcade",
      "survival",
      "commodore-128",
      "music",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "omicron",
    "label": "Omicron (April 1987)",
    "detail": "A ColecoVision reimagining of Sean Wagle's COMPUTE!'s Gazette space game, with sixteen waves, momentum flight, independent aiming and rotating sprite priority.",
    "projectName": "Omicron",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "arcade",
      "space",
      "commodore-64",
      "music",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "improvisor",
    "label": "Improvisor (April 1987)",
    "detail": "Donald Eddington's COMPUTE!'s Gazette music toy, preserving its random, composed, play-along and short-tune modes with sixteen generated improvisations.",
    "projectName": "Improvisor",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "gazette",
      "faithful-adaptation",
      "music",
      "toy",
      "sequencer",
      "commodore-64",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "squeeze",
    "label": "Squeeze (July 1987)",
    "detail": "A ColecoVision reimagining of Stephen Shull's COMPUTE!'s Gazette light-trail duel, with wraparound play, switchable trails, increasing speed and a computer opponent.",
    "projectName": "Squeeze",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "arcade",
      "light-cycles",
      "two-player",
      "commodore-64",
      "music",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "basketball-sam-ed",
    "label": "Basketball Sam & Ed (July 1987)",
    "detail": "A ColecoVision reimagining of Rhett Anderson and David Hensley Jr.'s COMPUTE!'s Gazette basketball game, with bouncing players, four periods and overtime.",
    "projectName": "Basketball Sam & Ed",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "sports",
      "basketball",
      "two-player",
      "commodore-64",
      "music",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "gators-n-snakes",
    "label": "Gators N Snakes (August 1985)",
    "detail": "A ColecoVision reimagining of Jim Sanders' Ahoy! swamp-crossing game, preserving its four beetles, moving snakes and gators, barriers, burrows and ten levels.",
    "projectName": "Gators N Snakes",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "swamp",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "gravinauts",
    "label": "Gravinauts (October 1985)",
    "detail": "A ColecoVision reimagining of Cleveland M. Blakemore's Ahoy! rocket-pack game, with smooth gravity flight, rival gravinauts, fuel tanks, glaciers and an acid sea.",
    "projectName": "Gravinauts",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "gravity",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chopper-flight",
    "label": "Chopper Flight (November 1985)",
    "detail": "A ColecoVision reimagining of Michael Buhidar Jr. and Kevin Woram's Ahoy! rescue game, with smooth tower scrolling, ledge rescues, missiles, fuel and timed landings.",
    "projectName": "Chopper Flight",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "helicopter",
      "commodore-64",
      "sprites",
      "scrolling",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "air-rescue",
    "label": "Air Rescue (April 1986)",
    "detail": "A ColecoVision reimagining of Ahoy!'s disk game, with a smoothly scrolling city, helicopter rescues, fires, planes, missiles, bombs and fuel drops.",
    "projectName": "Air Rescue",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "helicopter",
      "commodore-64",
      "sprites",
      "scrolling",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "turtle-rescue",
    "label": "Turtle Rescue (February 1987)",
    "detail": "A ColecoVision reimagining of Behzad Jamshidi's Ahoy! game, preserving its turtle families, five moving spiders, poison drops and increasing speed.",
    "projectName": "Turtle Rescue",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "space-hunt",
    "label": "Space Hunt (April 1985)",
    "detail": "A ColecoVision reimagining of Anthony Wood's Ahoy! space adventure, with planetary exploration, hazards, equipment and a mission across an alien world.",
    "projectName": "Space Hunt",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "adventure",
      "space",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hanger-14",
    "label": "Hanger 14 (January 1987)",
    "detail": "A ColecoVision reimagining of Justin Luton's Ahoy! platform game, with moving hangers, hazards and increasingly demanding climbs.",
    "projectName": "Hanger 14",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "platform",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "flash-flood",
    "label": "Flash Flood (November 1987)",
    "detail": "A ColecoVision reimagining of Tony Brantner's Ahoy! flood-survival game, with rising water, rescues and arcade action.",
    "projectName": "Flash Flood",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "rescue",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "snap-snake",
    "label": "Snap Snake (June 1988)",
    "detail": "A ColecoVision reimagining of Cleveland M. Blakemore's Ahoy! arcade game, with a snapping snake, roaming rats and protected sprite flicker.",
    "projectName": "Snap Snake",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "snake",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lunar-buggy",
    "label": "Lunar Buggy (July 1988)",
    "detail": "A ColecoVision reimagining of Cleveland M. Blakemore's Ahoy! lunar-driving game, with scrolling terrain, obstacles and a multi-sprite buggy.",
    "projectName": "Lunar Buggy",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "driving",
      "space",
      "commodore-64",
      "sprites",
      "scrolling",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lunar-lander-ahoy",
    "label": "Lunar Lander (April 1984)",
    "detail": "A ColecoVision reimagining of Anthony Wood's Ahoy! lander game, with three gravity levels, precision landing pads, a cave stage and smooth thrust physics.",
    "projectName": "Lunar Lander",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "lander",
      "space",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "alpiner",
    "label": "Alpiner (June 1984)",
    "detail": "A ColecoVision reimagining of Bob Lloret's Ahoy! slalom game, with three downhill legs, gates, rocks, logs and smooth page-swapped scrolling.",
    "projectName": "Alpiner",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "skiing",
      "commodore-64",
      "sprites",
      "scrolling",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "space-patrol-ahoy",
    "label": "Space Patrol (1984)",
    "detail": "A ColecoVision reimagining of Bob Lloret's Ahoy! patrol game, with Microz saucers, fuel management and two-layer pixel-scrolled stars.",
    "projectName": "Space Patrol",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "space",
      "commodore-64",
      "sprites",
      "scrolling",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "arena",
    "label": "Arena (February 1986)",
    "detail": "A ColecoVision reimagining of Ahoy!'s machine-language arena game, with a spinning baton, six drifting foes, directional shots and ten enemy forms.",
    "projectName": "Arena",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "arena",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "crab-fight",
    "label": "Crab Fight (February 1986)",
    "detail": "A ColecoVision reimagining of Buck Childress's Ahoy! game, with two scuttling crabs competing for a clam between coral, kelp and octopuses.",
    "projectName": "Crab Fight",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "two-player",
      "commodore-64",
      "sprites"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "brickbusters",
    "label": "Brickbusters (March 1986)",
    "detail": "A ColecoVision reimagining of Paul Seeburger's Ahoy! brick game, with thirteen brick colors, multiplayer turns, rising levels and smooth ball physics.",
    "projectName": "Brickbusters",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "breakout",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mountaineer-mack",
    "label": "Mountaineer Mack (October 1986)",
    "detail": "A ColecoVision reimagining of Stephen Devine's Ahoy! climbing game, with six hills, falling rocks and smooth hidden-page mountainside scrolling.",
    "projectName": "Mountaineer Mack",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "climbing",
      "commodore-64",
      "sprites",
      "scrolling",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mouse-in-the-house",
    "label": "Mouse in the House (December 1986)",
    "detail": "A ColecoVision reimagining of J.C. Hilty's Ahoy! chase game, with a mouse, cat, cheese, traps and continuously moving opponents.",
    "projectName": "Mouse in the House",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "two-player",
      "commodore-64",
      "sprites"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pieman",
    "label": "Pieman (April 1987)",
    "detail": "A ColecoVision reimagining of Bob Blackmer's Ahoy! pie-shop game, with a moving conveyor, glowing oven, waiting customers and smooth layered sprites.",
    "projectName": "Pieman",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "commodore-64",
      "sprites"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "archer",
    "label": "Archer (August 1987)",
    "detail": "A ColecoVision reimagining of Cleveland M. Blakemore's Ahoy! dungeon game, with ten levels, numbered doors, grilles, stairs and smooth combat sprites.",
    "projectName": "Archer",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "dungeon",
      "commodore-128",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pizza-boy",
    "label": "Pizza Boy (December 1987)",
    "detail": "A ColecoVision reimagining of Cleveland M. Blakemore's Ahoy! delivery game, with a tiled neighborhood, speeding cars, dogs and cooling pizzas.",
    "projectName": "Pizza Boy",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "delivery",
      "commodore-128",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jungle-jake",
    "label": "Jungle Jake (January 1988)",
    "detail": "A ColecoVision reimagining of Cleveland M. Blakemore's Ahoy! jungle game, with walking, jumping and climbing animation across roots, trunks and vines.",
    "projectName": "Jungle Jake",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "platform",
      "commodore-128",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "sack-race",
    "label": "Sack Race (November 1988)",
    "detail": "A ColecoVision reimagining of John Fedor and Tom Gauthier's Ahoy! checkout game, with four counters, sliding groceries and animated bagging.",
    "projectName": "Sack Race",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "arcade",
      "commodore-64",
      "sprites",
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lawn-job",
    "label": "Lawn Job (1984)",
    "detail": "A ColecoVision adaptation of LAWN JOB by Mike Buhidar Jr., originally published in Ahoy! 1984.",
    "projectName": "Lawn Job",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "salvage-diver",
    "label": "Salvage Diver (1984)",
    "detail": "A ColecoVision adaptation of SALVAGE DIVER by B.W. Behling, originally published in Ahoy! 1984.",
    "projectName": "Salvage Diver",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "space-lanes",
    "label": "Space Lanes (March 1984)",
    "detail": "A ColecoVision adaptation of SPACE LANES by Robert Alonso, originally published in Ahoy! March 1984.",
    "projectName": "Space Lanes",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "air-assault",
    "label": "Air Assault (May 1984)",
    "detail": "A ColecoVision adaptation of AIR ASSAULT by Bob Lloret, originally published in Ahoy! May 1984.",
    "projectName": "Air Assault",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "the-emerald-elephant",
    "label": "The Emerald Elephant (September/October 1984)",
    "detail": "A ColecoVision adaptation of THE EMERALD ELEPHANT by Orson Scott Card, originally published in Ahoy! September/October 1984.",
    "projectName": "The Emerald Elephant",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "futurewar",
    "label": "Futurewar! (February 1985)",
    "detail": "A ColecoVision adaptation of FUTUREWAR! by B. W. Behling, originally published in Ahoy! February 1985.",
    "projectName": "Futurewar!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "salmon-run",
    "label": "Salmon Run (March 1985)",
    "detail": "A ColecoVision adaptation of SALMON RUN by Mike Wacker, originally published in Ahoy! March 1985.",
    "projectName": "Salmon Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "the-mansion-murder",
    "label": "The Mansion Murder (March 1985)",
    "detail": "A ColecoVision adaptation of THE MANSION MURDER by an author not named in the issue, originally published in Ahoy! March 1985.",
    "projectName": "The Mansion Murder",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "raid",
    "label": "Raid (May 1985)",
    "detail": "A ColecoVision adaptation of RAID by Larry Coats, originally published in Ahoy! May 1985.",
    "projectName": "Raid",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "duck-shoot",
    "label": "Duck Shoot (June 1985)",
    "detail": "A ColecoVision adaptation of DUCK SHOOT by Bob Blackmer, originally published in Ahoy! June 1985.",
    "projectName": "Duck Shoot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "speedy",
    "label": "Speedy (June 1985)",
    "detail": "A ColecoVision adaptation of SPEEDY by Kevin Dewey, originally published in Ahoy! June 1985.",
    "projectName": "Speedy",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "towers-of-hanoi",
    "label": "Towers Of Hanoi (June 1985)",
    "detail": "A ColecoVision adaptation of Towers of Hanoi by Daniel Miller, originally published in Ahoy! June 1985.",
    "projectName": "Towers Of Hanoi",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fidgits",
    "label": "Fidgits (August 1985)",
    "detail": "A ColecoVision adaptation of FIDGITS by Walter E. Meyers, originally published in Ahoy! August 1985.",
    "projectName": "Fidgits",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "moxeys-porch",
    "label": "Moxeys Porch (September 1985)",
    "detail": "A ColecoVision adaptation of MOXEYS PORCH by Bob Blackmer, originally published in Ahoy! September 1985.",
    "projectName": "Moxeys Porch",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "starkite",
    "label": "Starkite (September 1985)",
    "detail": "A ColecoVision adaptation of STARKITE by J.C. Hilty, originally published in Ahoy! September 1985.",
    "projectName": "Starkite",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jewel-quest",
    "label": "Jewel Quest (December 1985)",
    "detail": "A ColecoVision adaptation of JEWEL QUEST by Bob Blackmer, originally published in Ahoy! December 1985.",
    "projectName": "Jewel Quest",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "santas-busy-day",
    "label": "Santa's Busy Day (December 1985)",
    "detail": "A ColecoVision adaptation of SANTA'S BUSY DAY by George Trepal, originally published in Ahoy! December 1985.",
    "projectName": "Santa's Busy Day",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "starfolk",
    "label": "Starfolk (December 1985)",
    "detail": "A ColecoVision adaptation of STARFOLK by an author not named in the issue, originally published in Ahoy! December 1985.",
    "projectName": "Starfolk",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "knockout",
    "label": "Knockout (January 1986)",
    "detail": "A ColecoVision adaptation of KNOCKOUT by an author not named in the issue, originally published in Ahoy! January 1986.",
    "projectName": "Knockout",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "microsim",
    "label": "Microsim (January 1986)",
    "detail": "A ColecoVision adaptation of MICROSIM by Tim Gerchmez, originally published in Ahoy! January 1986.",
    "projectName": "Microsim",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "the-haunted-castle",
    "label": "The Haunted Castle (January 1986)",
    "detail": "A ColecoVision adaptation of THE HAUNTED CASTLE by an author not named in the issue, originally published in Ahoy! January 1986.",
    "projectName": "The Haunted Castle",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "the-martian-monsters",
    "label": "The Martian Monsters (January 1986)",
    "detail": "A ColecoVision adaptation of THE MARTIAN MONSTERS by J. C. Hilty, originally published in Ahoy! January 1986.",
    "projectName": "The Martian Monsters",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "head-to-head",
    "label": "Head To Head (February 1986)",
    "detail": "A ColecoVision adaptation of HEAD TO HEAD by Doug Smoak, originally published in Ahoy! February 1986.",
    "projectName": "Head To Head",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "treasure-wheel",
    "label": "Treasure Wheel (February 1986)",
    "detail": "A ColecoVision adaptation of TREASURE WHEEL by Bob Blackmer, originally published in Ahoy! February 1986.",
    "projectName": "Treasure Wheel",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "actionauts",
    "label": "Actionauts (April 1986)",
    "detail": "A ColecoVision adaptation of ACTIONAUTS by Rob Fulop and Lon Richter (Advanced Program Technology 1985), originally published in Ahoy! April 1986.",
    "projectName": "Actionauts",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "comet-catcher",
    "label": "Comet Catcher (April 1986)",
    "detail": "A ColecoVision adaptation of COMET CATCHER by Dale Rupert, originally published in Ahoy! April 1986.",
    "projectName": "Comet Catcher",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hidden-cavern",
    "label": "Hidden Cavern (April 1986)",
    "detail": "A ColecoVision adaptation of HIDDEN CAVERN by James C. Hilty, originally published in Ahoy! April 1986.",
    "projectName": "Hidden Cavern",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "english-darts",
    "label": "English Darts (May 1986)",
    "detail": "A ColecoVision adaptation of ENGLISH DARTS by Michael E. Townsend, originally published in Ahoy! May 1986.",
    "projectName": "English Darts",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ski-folly",
    "label": "Ski Folly (May 1986)",
    "detail": "A ColecoVision adaptation of SKI FOLLY by an author not named in the issue, originally published in Ahoy! May 1986.",
    "projectName": "Ski Folly",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "star-search",
    "label": "Star Search (May 1986)",
    "detail": "A ColecoVision adaptation of STAR SEARCH by Jim Sanders, originally published in Ahoy! May 1986.",
    "projectName": "Star Search",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chessboard-tours",
    "label": "Chessboard Tours (June 1986)",
    "detail": "A ColecoVision adaptation of CHESSBOARD TOURS by Daniel L. Miller, originally published in Ahoy! June 1986.",
    "projectName": "Chessboard Tours",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "got-a-match",
    "label": "Got A Match? (June 1986)",
    "detail": "A ColecoVision adaptation of GOT A MATCH? by Walter E. Meyers, originally published in Ahoy! June 1986.",
    "projectName": "Got A Match?",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dogcatcher",
    "label": "Dogcatcher (September 1986)",
    "detail": "A ColecoVision adaptation of DOGCATCHER by Bob Blackmer, originally published in Ahoy! September 1986.",
    "projectName": "Dogcatcher",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "larc-i-mission",
    "label": "Larc-I Mission (September 1986)",
    "detail": "A ColecoVision adaptation of LARC-I Mission by Joseph Bedard, originally published in Ahoy! September 1986.",
    "projectName": "Larc-I Mission",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "matchblocks",
    "label": "Matchblocks (September 1986)",
    "detail": "A ColecoVision adaptation of MATCHBLOCKS by James A. Shephard, originally published in Ahoy! September 1986.",
    "projectName": "Matchblocks",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mine-canyon",
    "label": "Mine Canyon (September 1986)",
    "detail": "A ColecoVision adaptation of MINE CANYON by John Krutch, originally published in Ahoy! September 1986.",
    "projectName": "Mine Canyon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "trapped",
    "label": "Trapped (September 1986)",
    "detail": "A ColecoVision adaptation of TRAPPED by Mike Hoyt, originally published in Ahoy! September 1986.",
    "projectName": "Trapped",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "attack-force",
    "label": "Attack Force (October 1986)",
    "detail": "A ColecoVision adaptation of ATTACK FORCE by an author not named in the issue, originally published in Ahoy! October 1986.",
    "projectName": "Attack Force",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "penguins",
    "label": "Penguins (October 1986)",
    "detail": "A ColecoVision adaptation of PENGUINS by an author not named in the issue, originally published in Ahoy! October 1986.",
    "projectName": "Penguins",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "detonation",
    "label": "Detonation (November 1986)",
    "detail": "A ColecoVision adaptation of DETONATION by Bob Blackmer, originally published in Ahoy! November 1986.",
    "projectName": "Detonation",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "discs-of-daedalus",
    "label": "Discs Of Daedalus (November 1986)",
    "detail": "A ColecoVision adaptation of DISCS OF DAEDALUS by George Decker, originally published in Ahoy! November 1986.",
    "projectName": "Discs Of Daedalus",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "teleporter",
    "label": "Teleporter (November 1986)",
    "detail": "A ColecoVision adaptation of Teleporter by Cleveland M. Blakemore, originally published in Ahoy! November 1986.",
    "projectName": "Teleporter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "tenpins",
    "label": "Tenpins (November 1986)",
    "detail": "A ColecoVision adaptation of TENPINS by Tony (surname not given), originally published in Ahoy! November 1986.",
    "projectName": "Tenpins",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "micro-city",
    "label": "Micro City (December 1986)",
    "detail": "A ColecoVision adaptation of MICRO CITY by Darryl Dion Hawkins, originally published in Ahoy! December 1986.",
    "projectName": "Micro City",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "minotaur-maze",
    "label": "Minotaur Maze (December 1986)",
    "detail": "A ColecoVision adaptation of MINOTAUR MAZE by Cleveland M. Blakemore, originally published in Ahoy! December 1986.",
    "projectName": "Minotaur Maze",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "rebels-and-lords",
    "label": "Rebels & Lords (December 1986)",
    "detail": "A ColecoVision adaptation of REBELS & LORDS by an author not named in the issue, originally published in Ahoy! December 1986.",
    "projectName": "Rebels & Lords",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "speedway",
    "label": "Speedway (December 1986)",
    "detail": "A ColecoVision adaptation of SPEEDWAY by an author not named in the issue, originally published in Ahoy! December 1986.",
    "projectName": "Speedway",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "vault-of-terror",
    "label": "Vault Of Terror (December 1986)",
    "detail": "A ColecoVision adaptation of VAULT OF TERROR by C. M. Blakemore, originally published in Ahoy! December 1986.",
    "projectName": "Vault Of Terror",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bugout",
    "label": "Bugout (January 1987)",
    "detail": "A ColecoVision adaptation of BUGOUT by Tony Brantner, originally published in Ahoy! January 1987.",
    "projectName": "Bugout",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dark-fortress",
    "label": "Dark Fortress (January 1987)",
    "detail": "A ColecoVision adaptation of DARK FORTRESS by Cleve Blakemore, originally published in Ahoy! January 1987.",
    "projectName": "Dark Fortress",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "starfighter",
    "label": "Starfighter (January 1987)",
    "detail": "A ColecoVision adaptation of STARFIGHTER by Michael J. Carston, originally published in Ahoy! January 1987.",
    "projectName": "Starfighter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "vortex",
    "label": "Vortex (January 1987)",
    "detail": "A ColecoVision adaptation of VORTEX by Sean D. Wagle, originally published in Ahoy! January 1987.",
    "projectName": "Vortex",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "crunchman",
    "label": "Crunchman (February 1987)",
    "detail": "A ColecoVision adaptation of CRUNCHMAN by Roy D. Lewis, originally published in Ahoy! February 1987.",
    "projectName": "Crunchman",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jailbreak",
    "label": "Jailbreak (February 1987)",
    "detail": "A ColecoVision adaptation of JAILBREAK by Bob Blackmer, originally published in Ahoy! February 1987.",
    "projectName": "Jailbreak",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "the-adventurer",
    "label": "The Adventurer (February 1987)",
    "detail": "A ColecoVision adaptation of THE ADVENTURER by Jean-Francois Heon, originally published in Ahoy! February 1987.",
    "projectName": "The Adventurer",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "geehonk-caverns",
    "label": "Geehonk Caverns (March 1987)",
    "detail": "A ColecoVision adaptation of GEEHONK CAVERNS by John Fedor (Ranger Software), originally published in Ahoy! March 1987.",
    "projectName": "Geehonk Caverns",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lights-out",
    "label": "Lights Out (March 1987)",
    "detail": "A ColecoVision adaptation of LIGHTS OUT by Walter E. Meyers, originally published in Ahoy! March 1987.",
    "projectName": "Lights Out",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "laps",
    "label": "Laps (April 1987)",
    "detail": "A ColecoVision adaptation of LAPS by J.C. Hilty, originally published in Ahoy! April 1987.",
    "projectName": "Laps",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "moondog",
    "label": "Moondog (May 1987)",
    "detail": "A ColecoVision adaptation of MOONDOG by J.C. Hilty, originally published in Ahoy! May 1987.",
    "projectName": "Moondog",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "scavenger-hunt",
    "label": "Scavenger Hunt (May 1987)",
    "detail": "A ColecoVision adaptation of SCAVENGER HUNT by Bob Blackmer, originally published in Ahoy! May 1987.",
    "projectName": "Scavenger Hunt",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wall-crawler",
    "label": "Wall Crawler (May 1987)",
    "detail": "A ColecoVision adaptation of WALL CRAWLER by Tony Brantner, originally published in Ahoy! May 1987.",
    "projectName": "Wall Crawler",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cave-of-the-ice-ape",
    "label": "Cave Of The Ice Ape (June 1987)",
    "detail": "A ColecoVision adaptation of CAVE OF THE ICE APE by J. C. Hilty, originally published in Ahoy! June 1987.",
    "projectName": "Cave Of The Ice Ape",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "galactic-cab-co",
    "label": "Galactic Cab Co. (June 1987)",
    "detail": "A ColecoVision adaptation of Galactic Cab Co. by Cleveland M. Blakemore, originally published in Ahoy! June 1987.",
    "projectName": "Galactic Cab Co.",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "power-squares",
    "label": "Power Squares (June 1987)",
    "detail": "A ColecoVision adaptation of POWER SQUARES by John Fedor, originally published in Ahoy! June 1987.",
    "projectName": "Power Squares",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wraiths",
    "label": "Wraiths (June 1987)",
    "detail": "A ColecoVision adaptation of WRAITHS by Cleveland M. Blakemore, originally published in Ahoy! June 1987.",
    "projectName": "Wraiths",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "plink-and-plonk",
    "label": "Plink And Plonk (July 1987)",
    "detail": "A ColecoVision adaptation of PLINK AND PLONK by Walter E. Meyers, originally published in Ahoy! July 1987.",
    "projectName": "Plink And Plonk",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "batter-up",
    "label": "Batter Up! (August 1987)",
    "detail": "A ColecoVision adaptation of BATTER UP! by J.C. Hilty, originally published in Ahoy! August 1987.",
    "projectName": "Batter Up!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "steeple-run",
    "label": "Steeple Run (August 1987)",
    "detail": "A ColecoVision adaptation of STEEPLE RUN by Tony Brantner, originally published in Ahoy! August 1987.",
    "projectName": "Steeple Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hoops",
    "label": "Hoops (September 1987)",
    "detail": "A ColecoVision adaptation of Hoops by an author not named in the issue, originally published in Ahoy! September 1987.",
    "projectName": "Hoops",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "red-alert",
    "label": "Red Alert (September 1987)",
    "detail": "A ColecoVision adaptation of RED ALERT by Tony Brantner, originally published in Ahoy! September 1987.",
    "projectName": "Red Alert",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hotfoot",
    "label": "Hotfoot (October 1987)",
    "detail": "A ColecoVision adaptation of HOTFOOT by John Krutch, originally published in Ahoy! October 1987.",
    "projectName": "Hotfoot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "desert-front",
    "label": "Desert Front (November 1987)",
    "detail": "A ColecoVision adaptation of Desert Front by Alan Thomason, originally published in Ahoy! November 1987.",
    "projectName": "Desert Front",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "paper-route",
    "label": "Paper Route (November 1987)",
    "detail": "A ColecoVision adaptation of PAPER ROUTE by Bob Blackmer, originally published in Ahoy! November 1987.",
    "projectName": "Paper Route",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cliffhanger",
    "label": "Cliffhanger (December 1987)",
    "detail": "A ColecoVision adaptation of CLIFFHANGER by J. C. Hilty, originally published in Ahoy! December 1987.",
    "projectName": "Cliffhanger",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "warship",
    "label": "Warship (December 1987)",
    "detail": "A ColecoVision adaptation of WARSHIP by C.F. Kaylor, originally published in Ahoy! December 1987.",
    "projectName": "Warship",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ice-titans",
    "label": "Ice Titans (January 1988)",
    "detail": "A ColecoVision adaptation of ICE TITANS by Cleveland M. Blakemore, originally published in Ahoy! January 1988.",
    "projectName": "Ice Titans",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "coffee-break",
    "label": "Coffee Break (February 1988)",
    "detail": "A ColecoVision adaptation of Coffee Break by Dan Komaromi (C-128 version by Cleveland M. Blakemore), originally published in Ahoy! February 1988.",
    "projectName": "Coffee Break",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "crypt-of-fear",
    "label": "Crypt Of Fear (February 1988)",
    "detail": "A ColecoVision adaptation of CRYPT OF FEAR by Cleveland M. Blakemore, originally published in Ahoy! February 1988.",
    "projectName": "Crypt Of Fear",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "marauder",
    "label": "Marauder (February 1988)",
    "detail": "A ColecoVision adaptation of MARAUDER by Cleveland M. Blakemore, originally published in Ahoy! February 1988.",
    "projectName": "Marauder",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "grim-oak-manor",
    "label": "Grim Oak Manor (April 1988)",
    "detail": "A ColecoVision adaptation of GRIM OAK MANOR by Cleveland M. Blakemore, originally published in Ahoy! April 1988.",
    "projectName": "Grim Oak Manor",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "time-subway",
    "label": "Time Subway (April 1988)",
    "detail": "A ColecoVision adaptation of TIME SUBWAY by Cleveland M. Blakemore (concept Lynwood Brooks), originally published in Ahoy! April 1988.",
    "projectName": "Time Subway",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lost-dutchmans-mine",
    "label": "Lost Dutchman's Mine (June 1988)",
    "detail": "A ColecoVision adaptation of LOST DUTCHMAN'S MINE by Cleveland M. Blakemore, originally published in Ahoy! June 1988.",
    "projectName": "Lost Dutchman's Mine",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mines-of-merlin",
    "label": "Mines Of Merlin (June 1988)",
    "detail": "A ColecoVision adaptation of MINES OF MERLIN by Cleveland M. Blakemore, originally published in Ahoy! June 1988.",
    "projectName": "Mines Of Merlin",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "rashgar",
    "label": "Rashgar (June 1988)",
    "detail": "A ColecoVision adaptation of RASHGAR by Cleveland M. Blakemore, originally published in Ahoy! June 1988.",
    "projectName": "Rashgar",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "guerilla",
    "label": "Guerilla (July 1988)",
    "detail": "A ColecoVision adaptation of GUERILLA by Cleve Blakemore, originally published in Ahoy! July 1988.",
    "projectName": "Guerilla",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "tomb-of-horror",
    "label": "Tomb Of Horror (July 1988)",
    "detail": "A ColecoVision adaptation of TOMB OF HORROR by Cleveland M. Blakemore, originally published in Ahoy! July 1988.",
    "projectName": "Tomb Of Horror",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "the-mines-of-vlur",
    "label": "The Mines Of V'lur (September 1988)",
    "detail": "A ColecoVision adaptation of The Mines of V'lur by Mike Hoyt, originally published in Ahoy! September 1988.",
    "projectName": "The Mines Of V'lur",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "trap-shoot",
    "label": "Trap Shoot (September 1988)",
    "detail": "A ColecoVision adaptation of TRAP SHOOT by Matt Pierce, originally published in Ahoy! September 1988.",
    "projectName": "Trap Shoot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "turbo-ski",
    "label": "Turbo Ski (September 1988)",
    "detail": "A ColecoVision adaptation of TURBO SKI by Bob Blackmer, originally published in Ahoy! September 1988.",
    "projectName": "Turbo Ski",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bombs-away",
    "label": "Bombs Away! (October 1988)",
    "detail": "A ColecoVision adaptation of BOMBS AWAY! by John Fraleigh, originally published in Ahoy! October 1988.",
    "projectName": "Bombs Away!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "island-quest",
    "label": "Island Quest (November 1988)",
    "detail": "A ColecoVision adaptation of ISLAND QUEST by Bob Blackmer, originally published in Ahoy! November 1988.",
    "projectName": "Island Quest",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "tubular",
    "label": "Tubular! (December 1988)",
    "detail": "A ColecoVision adaptation of TUBULAR! by Bob Blackmer, originally published in Ahoy! December 1988.",
    "projectName": "Tubular!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "flag-hunt",
    "label": "Flag Hunt (January 1989)",
    "detail": "A ColecoVision adaptation of FLAG HUNT by John Fedor, originally published in Ahoy! January 1989.",
    "projectName": "Flag Hunt",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "night-raid",
    "label": "Night Raid (February 1989)",
    "detail": "A ColecoVision adaptation of NIGHT RAID by an author not named in the issue, originally published in Ahoy! February 1989.",
    "projectName": "Night Raid",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "stix",
    "label": "Stix! (February 1989)",
    "detail": "A ColecoVision adaptation of STIX! by an author not named in the issue, originally published in Ahoy! February 1989.",
    "projectName": "Stix!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chain",
    "label": "Chainmail (September 1987)",
    "detail": "A ColecoVision adaptation of CHAINMAIL by Cleveland M. Blakemore, originally published in Ahoy! September 1987.",
    "projectName": "Chainmail",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dfort2",
    "label": "Dark Fortress Ii (1987)",
    "detail": "A ColecoVision adaptation of DARK FORTRESS II by CLEVE BLAKEMORE, originally published in Ahoy! 1987.",
    "projectName": "Dark Fortress Ii",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pduel",
    "label": "Planet Duel (1987)",
    "detail": "A ColecoVision adaptation of PLANET DUEL by C.M.BLAKEMORE, originally published in Ahoy! 1987.",
    "projectName": "Planet Duel",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "phantasy",
    "label": "Phantasy (March 1988)",
    "detail": "A ColecoVision adaptation of PHANTASY by Cleveland M. Blakemore, originally published in Ahoy! March 1988.",
    "projectName": "Phantasy",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pinball",
    "label": "Flipper Alley (1987)",
    "detail": "A ColecoVision adaptation of FLIPPER ALLEY by T.BRANTNER, originally published in Ahoy! 1987.",
    "projectName": "Flipper Alley",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "triwords",
    "label": "Tri Words (December 1988)",
    "detail": "A ColecoVision adaptation of TRI WORDS by Bob Blackmer, originally published in Ahoy! December 1988.",
    "projectName": "Tri Words",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wtag",
    "label": "Wizard Tag (March 1987)",
    "detail": "A ColecoVision adaptation of WIZARD TAG by Bob Blackmer, originally published in Ahoy! March 1987.",
    "projectName": "Wizard Tag",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wtag2",
    "label": "Wizard Tag Ii (July 1987)",
    "detail": "A ColecoVision adaptation of WIZARD TAG II by Bob Blackmer, originally published in Ahoy! July 1987.",
    "projectName": "Wizard Tag Ii",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "empire",
    "label": "Empire (October 1987)",
    "detail": "A ColecoVision adaptation of EMPIRE by Cleveland M. Blakemore, originally published in Ahoy! October 1987.",
    "projectName": "Empire",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "orbit",
    "label": "Orbit (November 1987)",
    "detail": "A ColecoVision adaptation of ORBIT by Cleveland M. Blakemore, originally published in Ahoy! November 1987.",
    "projectName": "Orbit",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "phobia",
    "label": "Phobia (June 1988)",
    "detail": "A ColecoVision adaptation of PHOBIA by Cleve Blakemore, originally published in Ahoy! June 1988.",
    "projectName": "Phobia",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fishmath",
    "label": "Fish Math (1985)",
    "detail": "A ColecoVision adaptation of FISH MATH by KEVIN DEWEY, originally published in Ahoy! 1985.",
    "projectName": "Fish Math",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "catacomb",
    "label": "Catacombs (1987)",
    "detail": "A ColecoVision adaptation of CATACOMBS by CLEVE BLAKEMORE, originally published in Ahoy! 1987.",
    "projectName": "Catacombs",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "alice",
    "label": "Alice In Adventureland (1985)",
    "detail": "A ColecoVision adaptation of ALICE IN ADVENTURELAND by BOB SPIRKO, originally published in Ahoy! 1985.",
    "projectName": "Alice In Adventureland",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "tothetop",
    "label": "To The Top (January 1985)",
    "detail": "A ColecoVision adaptation of TO THE TOP by Kevin Dewey, originally published in Ahoy! January 1985.",
    "projectName": "To The Top",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "namestar",
    "label": "Name That Star (April 1984)",
    "detail": "A ColecoVision adaptation of NAME THAT STAR by Bob Lloret, originally published in Ahoy! April 1984.",
    "projectName": "Name That Star",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mathmast",
    "label": "Math Master (May 1984)",
    "detail": "A ColecoVision adaptation of MATH MASTER by Bob Lloret, originally published in Ahoy! May 1984.",
    "projectName": "Math Master",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "posttime",
    "label": "Post Time (June 1984)",
    "detail": "A ColecoVision adaptation of POST TIME by Bob Lloret, originally published in Ahoy! June 1984.",
    "projectName": "Post Time",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "elfred",
    "label": "Elfred (1985)",
    "detail": "A ColecoVision adaptation of ELFRED by D.&J. ARNOLD, originally published in Ahoy! 1985.",
    "projectName": "Elfred",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hoparnd",
    "label": "Hop Around (1985)",
    "detail": "A ColecoVision adaptation of HOP AROUND by KEVIN DEWEY, originally published in Ahoy! 1985.",
    "projectName": "Hop Around",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "tiletime",
    "label": "Tile Time (May 1985)",
    "detail": "A ColecoVision adaptation of TILE TIME by MURDOCK & BLACKBURN, originally published in Ahoy! May 1985.",
    "projectName": "Tile Time",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "brainfr",
    "label": "Brainframe (1985)",
    "detail": "A ColecoVision adaptation of BRAINFRAME by NORM VOGEL, originally published in Ahoy! 1985.",
    "projectName": "Brainframe",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "slither",
    "label": "Slither (1985)",
    "detail": "A ColecoVision adaptation of SLITHER by AHOY! NOV 1985 / 2026, originally published in Ahoy! 1985.",
    "projectName": "Slither",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "invective",
    "label": "Invective (1985)",
    "detail": "A ColecoVision adaptation of INVECTIVE by GEORGE TREPAL, originally published in Ahoy! 1985.",
    "projectName": "Invective",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pig",
    "label": "Pig In A Poke (1985)",
    "detail": "A ColecoVision adaptation of PIG IN A POKE by ORSON SCOTT CARD, originally published in Ahoy! 1985.",
    "projectName": "Pig In A Poke",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mycroft",
    "label": "Mycroft Mews (October 1985)",
    "detail": "A ColecoVision adaptation of MYCROFT MEWS by John R. Prager, originally published in Ahoy! October 1985.",
    "projectName": "Mycroft Mews",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "solit",
    "label": "Solitaire 64 (October 1985)",
    "detail": "A ColecoVision adaptation of SOLITAIRE 64 by ERIC W. SINK, AHOY!, originally published in Ahoy! October 1985.",
    "projectName": "Solitaire 64",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "knight",
    "label": "Knight's Tour (November 1985)",
    "detail": "A ColecoVision adaptation of KNIGHT'S TOUR by Ramella, originally published in Ahoy! November 1985.",
    "projectName": "Knight's Tour",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "elmac",
    "label": "Elmac Plays Nim (1986)",
    "detail": "A ColecoVision adaptation of ELMAC PLAYS NIM by DALE RUPERT, originally published in Ahoy! 1986.",
    "projectName": "Elmac Plays Nim",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mostleast",
    "label": "The Most And The Least (March 1986)",
    "detail": "A ColecoVision adaptation of THE MOST AND THE LEAST by Orson Scott Card, originally published in Ahoy! March 1986.",
    "projectName": "The Most And The Least",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "alchemist",
    "label": "Alchemist's Apprentice (1986)",
    "detail": "A ColecoVision adaptation of ALCHEMIST'S APPRENTICE by C.C.PETERSON, originally published in Ahoy! 1986.",
    "projectName": "Alchemist's Apprentice",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fmusic",
    "label": "Fidgits Music School (August 1985)",
    "detail": "A ColecoVision adaptation of FIDGITS MUSIC SCHOOL by WALTER E. MEYERS, originally published in Ahoy! August 1985.",
    "projectName": "Fidgits Music School",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "reversi2",
    "label": "Reversi (1986)",
    "detail": "A ColecoVision adaptation of REVERSI by ROD CARTY, originally published in Ahoy! 1986.",
    "projectName": "Reversi",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "silhou",
    "label": "Silhouette (1987)",
    "detail": "A ColecoVision adaptation of SILHOUETTE by CURTIS F. KAYLOR, originally published in Ahoy! 1987.",
    "projectName": "Silhouette",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "capture",
    "label": "Capture (1988)",
    "detail": "A ColecoVision adaptation of CAPTURE by MICHAEL HOYT, originally published in Ahoy! 1988.",
    "projectName": "Capture",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fshuffle",
    "label": "Fast Shuffle (July 1987)",
    "detail": "A ColecoVision adaptation of FAST SHUFFLE by Robert Bixby, originally published in Ahoy! July 1987.",
    "projectName": "Fast Shuffle",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "vanish",
    "label": "Vanish (1989)",
    "detail": "A ColecoVision adaptation of VANISH by AHOY! JANUARY 1989, originally published in Ahoy! 1989.",
    "projectName": "Vanish",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "disint",
    "label": "Disintegrator (1985)",
    "detail": "A ColecoVision adaptation of DISINTEGRATOR by B.SCHULAK, originally published in Ahoy! 1985.",
    "projectName": "Disintegrator",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "univaders",
    "label": "Univaders (1987)",
    "detail": "A ColecoVision adaptation of UNIVADERS by R.BIXBY, originally published in Ahoy! 1987.",
    "projectName": "Univaders",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ahninja",
    "label": "Last Ninja (ahoy! 1986) (AHOY! 1986)",
    "detail": "A ColecoVision adaptation of LAST NINJA (AHOY! 1986) by C.M.BLAKEMORE, originally published in AHOY! 1986.",
    "projectName": "Last Ninja (ahoy! 1986)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "guardian",
    "label": "Guardian (1986)",
    "detail": "A ColecoVision adaptation of GUARDIAN by AHOY!, originally published in Ahoy! 1986.",
    "projectName": "Guardian",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "scrambler",
    "label": "Scrambler (1987)",
    "detail": "A ColecoVision adaptation of SCRAMBLER by Tony Brantner, originally published in Ahoy! 1987.",
    "projectName": "Scrambler",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "crystal",
    "label": "Crystallus (1987)",
    "detail": "A ColecoVision adaptation of CRYSTALLUS by B.BLACKMER, originally published in Ahoy! 1987.",
    "projectName": "Crystallus",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "platforms",
    "label": "Platforms (October 1987)",
    "detail": "A ColecoVision adaptation of PLATFORMS by Tony Brantner, originally published in Ahoy! October 1987.",
    "projectName": "Platforms",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "spraycam",
    "label": "Spray-Cam (1987)",
    "detail": "A ColecoVision adaptation of SPRAY-CAM by BOB BLACKMER, originally published in Ahoy! 1987.",
    "projectName": "Spray-Cam",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "kloros",
    "label": "Vee Kloros (March 1988)",
    "detail": "A ColecoVision adaptation of VEE KLOROS by Cleve Blakemore, originally published in Ahoy! March 1988.",
    "projectName": "Vee Kloros",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dragtype",
    "label": "Dragon Type (1985)",
    "detail": "A ColecoVision adaptation of DRAGON TYPE by BOB SPIRKO, originally published in Ahoy! 1985.",
    "projectName": "Dragon Type",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "keno",
    "label": "Keno (June 1986)",
    "detail": "A ColecoVision adaptation of KENO by VALERIE JEAN KRAMER, originally published in Ahoy! June 1986.",
    "projectName": "Keno",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wumpus",
    "label": "Wumpus (February 1987)",
    "detail": "A ColecoVision adaptation of WUMPUS by Marc Clifford, originally published in Ahoy! February 1987.",
    "projectName": "Wumpus",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wheelf",
    "label": "Spin & Solve (March 1987)",
    "detail": "A ColecoVision adaptation of SPIN & SOLVE by Richard Bain, originally published in Ahoy! March 1987.",
    "projectName": "Spin & Solve",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "constco",
    "label": "Construction Co. (1984)",
    "detail": "A ColecoVision adaptation of CONSTRUCTION CO. by B.W. BEHLING, originally published in Ahoy! 1984.",
    "projectName": "Construction Co.",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fueling",
    "label": "Fueling Station (1987)",
    "detail": "A ColecoVision adaptation of FUELING STATION by J.KRUTCH, originally published in Ahoy! 1987.",
    "projectName": "Fueling Station",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "barricade",
    "label": "Barricade (1988)",
    "detail": "A ColecoVision adaptation of BARRICADE by T.BRANTNER, originally published in Ahoy! 1988.",
    "projectName": "Barricade",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ahoyminis",
    "label": "Ahoy! Column Games (1988)",
    "detail": "A ColecoVision adaptation of AHOY! COLUMN GAMES by COMMODARES, originally published in Ahoy! 1988.",
    "projectName": "Ahoy! Column Games",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "swoop",
    "label": "Swoop (June 1986)",
    "detail": "A ColecoVision adaptation of SWOOP by AHOY! 1986 / 2026, originally published in Ahoy! June 1986.",
    "projectName": "Swoop",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "wizim",
    "label": "Wizard Of Im (1985)",
    "detail": "A ColecoVision adaptation of WIZARD OF IM by B.SPIRKO, originally published in Ahoy! 1985.",
    "projectName": "Wizard Of Im",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mysto",
    "label": "Mr. Mysto (1985)",
    "detail": "A ColecoVision adaptation of MR. MYSTO by FRANK DINUNZIO, originally published in Ahoy! 1985.",
    "projectName": "Mr. Mysto",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ahoy!",
      "reimagined-adaptation",
      "game",
      "commodore-64"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lab3d",
    "label": "3-D Labyrinth (December 1984)",
    "detail": "John Stilwell's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "3-D Labyrinth",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "speed3d",
    "label": "3-D Speedway (April 1988)",
    "detail": "Chris Ulmer's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "3-D Speedway",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "t3d",
    "label": "3-D Tic Tac Toe (June 1984)",
    "detail": "A COMPUTE!'s Gazette game from June 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "3-D Tic Tac Toe",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "aard",
    "label": "Aardvark Attack (October 1983)",
    "detail": "Todd Heimarck's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Aardvark Attack",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "armada",
    "label": "Alien Armada (May 1985)",
    "detail": "John Matias's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Alien Armada",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "alphanx",
    "label": "Alpha Anxiety (March 1985)",
    "detail": "A COMPUTE!'s Gazette game from March 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Alpha Anxiety",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ashoot",
    "label": "Alpha-Shoot (January 1984)",
    "detail": "A COMPUTE!'s Gazette game from January 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Alpha-Shoot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "amatch",
    "label": "Animal Match (December 1987)",
    "detail": "A COMPUTE!'s Gazette game from December 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Animal Match",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ahunt",
    "label": "Apple Hunt (April 1985)",
    "detail": "A COMPUTE!'s Gazette game from April 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Apple Hunt",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "willie",
    "label": "Apple Willie (April 1990)",
    "detail": "A COMPUTE!'s Gazette game from April 1990, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Apple Willie",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "abase",
    "label": "Arcade Baseball (May 1986)",
    "detail": "A COMPUTE!'s Gazette game from May 1986, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Arcade Baseball",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "volley",
    "label": "Arcade Volleyball (June 1988)",
    "detail": "Rhett Anderson and David Hensley Jr.'s COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Arcade Volleyball",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "apanic",
    "label": "Astro-Panic! (February 1984)",
    "detail": "Charles Brannon's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Astro-Panic!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "atoms",
    "label": "Atom Shoot (October 1985)",
    "detail": "A COMPUTE!'s Gazette game from October 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Atom Shoot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "quarks",
    "label": "Atom Shoot 64 (October 1985)",
    "detail": "A COMPUTE!'s Gazette game from October 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Atom Shoot 64",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bact",
    "label": "Bacteria (March 1989)",
    "detail": "A COMPUTE!'s Gazette game from March 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Bacteria",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bagdad",
    "label": "Bagdad (November 1984)",
    "detail": "Kevin Martin and Bryan Files's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Bagdad",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bagger",
    "label": "Bagger (July 1988)",
    "detail": "A COMPUTE!'s Gazette game from July 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Bagger",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bblitz",
    "label": "Balloon Blitz (August 1984)",
    "detail": "Michael T. Bohn's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Balloon Blitz",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bbbar",
    "label": "BB Barrage (August 1988)",
    "detail": "William Chin's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "BB Barrage",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "beekpr",
    "label": "Beekeeper (July 1984)",
    "detail": "A COMPUTE!'s Gazette game from July 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Beekeeper",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "beezone",
    "label": "Beezone (September 1987)",
    "detail": "A COMPUTE!'s Gazette game from September 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Beezone",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "binc",
    "label": "Binary Castle (November 1983)",
    "detail": "A COMPUTE!'s Gazette game from November 1983, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Binary Castle",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bingo64",
    "label": "Bingo 64 (April 1984)",
    "detail": "Richard L. Witkover's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Bingo 64",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bbattle",
    "label": "Block Battle! (September 1989)",
    "detail": "A COMPUTE!'s Gazette game from September 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Block Battle!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "blockout",
    "label": "Block Out (November 1988)",
    "detail": "A COMPUTE!'s Gazette game from November 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Block Out",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bgammon",
    "label": "Backgammon (November 1985)",
    "detail": "A COMPUTE!'s Gazette game from November 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Backgammon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bombard",
    "label": "Bombardment (January 1989)",
    "detail": "A COMPUTE!'s Gazette game from January 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Bombardment",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bonk",
    "label": "Bonking Barrels (July 1984)",
    "detail": "A COMPUTE!'s Gazette game from July 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Bonking Barrels",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "boombust",
    "label": "Boom and Bust (September 1988)",
    "detail": "A COMPUTE!'s Gazette game from September 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Boom and Bust",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "boomer",
    "label": "Boomerang (August 1989)",
    "detail": "A COMPUTE!'s Gazette game from August 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Boomerang",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bounty",
    "label": "Bounty Hunter (August 1987)",
    "detail": "A COMPUTE!'s Gazette game from August 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Bounty Hunter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "brusher",
    "label": "Brusher (April 1989)",
    "detail": "Leonard Morris's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Brusher",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "bumprun",
    "label": "Bump 'n Run (November 1986)",
    "detail": "A COMPUTE!'s Gazette game from November 1986, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Bump 'n Run",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cabby",
    "label": "Cabby (October 1984)",
    "detail": "A COMPUTE!'s Gazette game from October 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Cabby",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "campaign",
    "label": "Campaign Manager (August 1984)",
    "detail": "Todd Heimarck's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Campaign Manager",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cdung",
    "label": "Castle Dungeon (June 1984)",
    "detail": "A COMPUTE!'s Gazette game from June 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Castle Dungeon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "catsdogs",
    "label": "Cats 'n Dogs (January 1988)",
    "detail": "A COMPUTE!'s Gazette game from January 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Cats 'n Dogs",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cellrun",
    "label": "Cell Runner (September 1986)",
    "detail": "John Krutch's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Cell Runner",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "charle",
    "label": "Charlemagne's Sword (May 1985)",
    "detail": "A COMPUTE!'s Gazette game from May 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Charlemagne's Sword",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "gzchk",
    "label": "Checkers (February 1984)",
    "detail": "A COMPUTE!'s Gazette game from February 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Checkers",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chomper",
    "label": "Chomper (January 1985)",
    "detail": "A COMPUTE!'s Gazette game from January 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Chomper",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "charass",
    "label": "Character Assassination (June 1985)",
    "detail": "A COMPUTE!'s Gazette game from June 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Character Assassination",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chcatch",
    "label": "Chicken Catcher (November 1985)",
    "detail": "A COMPUTE!'s Gazette game from November 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Chicken Catcher",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chop1",
    "label": "Chopper 1 (August 1986)",
    "detail": "Mike Sedore's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Chopper 1",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "chpilot",
    "label": "Chopper Pilot (October 1987)",
    "detail": "Chris Boss's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Chopper Pilot",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "circuit",
    "label": "Circuits (December 1989)",
    "detail": "Eric Haines's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Circuits",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "collis",
    "label": "Collision Course (February 1987)",
    "detail": "A COMPUTE!'s Gazette game from February 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Collision Course",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ccombat",
    "label": "Cosmic Combat (December 1984)",
    "detail": "Tommy Graham's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Cosmic Combat",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mutant-breakout",
    "label": "Mutant Breakout (2026)",
    "detail": "Funknflow5200's original side-scrolling beat 'em up, built for ColecoVision with Amy Studio and Amy Toolbox.",
    "projectName": "Mutant Breakout",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "original",
      "game",
      "beat-em-up",
      "side-scrolling"
    ],
    "originKind": "original",
    "originLabel": "Original"
  },
  {
    "id": "xroads",
    "label": "Crossroads (December 1987)",
    "detail": "Steve Harter's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Crossroads",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cutoff",
    "label": "Cut-Off! (March 1984)",
    "detail": "A COMPUTE!'s Gazette game from March 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Cut-Off!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cypher",
    "label": "Cypher (February 1985)",
    "detail": "A COMPUTE!'s Gazette game from February 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Cypher",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "decip",
    "label": "Decipede (January 1987)",
    "detail": "A COMPUTE!'s Gazette game from January 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Decipede",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "kaylon",
    "label": "Descent to Kaylon (November 1984)",
    "detail": "A COMPUTE!'s Gazette game from November 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Descent to Kaylon",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "disc",
    "label": "Disc Blitz (January 1989)",
    "detail": "A COMPUTE!'s Gazette game from January 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Disc Blitz",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dtake",
    "label": "Double Take (December 1988)",
    "detail": "A COMPUTE!'s Gazette game from December 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Double Take",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "digger",
    "label": "Digger (March 1985)",
    "detail": "A COMPUTE!'s Gazette game from March 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Digger",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "computag",
    "label": "Computag (October 1988)",
    "detail": "A COMPUTE!'s Gazette game from October 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Computag",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "connem",
    "label": "Connect'em (January 1987)",
    "detail": "A COMPUTE!'s Gazette game from January 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Connect'em",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "cribbage",
    "label": "Cribbage 128 (August 1988)",
    "detail": "A COMPUTE!'s Gazette game from August 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Cribbage 128",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "xroads2",
    "label": "Crossroads II: Pandemonium (December 1988)",
    "detail": "Steve Harter's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Crossroads II: Pandemonium",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "deltaw",
    "label": "Delta War (January 1988)",
    "detail": "A COMPUTE!'s Gazette game from January 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Delta War",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dden",
    "label": "Dragon's Den (December 1985)",
    "detail": "A COMPUTE!'s Gazette game from December 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Dragon's Den",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "dunk",
    "label": "Dunk (April 1986)",
    "detail": "A COMPUTE!'s Gazette game from April 1986, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Dunk",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "eagles",
    "label": "Eagles and Gators (September 1986)",
    "detail": "A COMPUTE!'s Gazette game from September 1986, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Eagles and Gators",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "faceoff",
    "label": "Face-Off (January 1986)",
    "detail": "Kevin Mykytyn and Mark Tuttle's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Face-Off",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "finald",
    "label": "Final Defense (December 1989)",
    "detail": "A COMPUTE!'s Gazette game from December 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Final Defense",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fire",
    "label": "Fire! (February 1988)",
    "detail": "A COMPUTE!'s Gazette game from February 1988, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Fire!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "flags",
    "label": "Flags (January 1990)",
    "detail": "A COMPUTE!'s Gazette game from January 1990, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Flags",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "falien",
    "label": "Friendly Alien (September 1985)",
    "detail": "A COMPUTE!'s Gazette game from September 1985, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Friendly Alien",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "fline",
    "label": "Front Line (August 1987)",
    "detail": "Georg Zimmer and Paul Zimmer's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Front Line",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "geopuz",
    "label": "Geopuzzle (October 1987)",
    "detail": "Rhett Anderson and David Hensley Jr.'s COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Geopuzzle",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "givetake",
    "label": "Give 'N' Take (August 1987)",
    "detail": "A COMPUTE!'s Gazette game from August 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Give 'N' Take",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "goingup",
    "label": "Going Up? (June 1987)",
    "detail": "A COMPUTE!'s Gazette game from June 1987, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Going Up?",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "gridloc",
    "label": "Gridloc (February 1989)",
    "detail": "A COMPUTE!'s Gazette game from February 1989, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Gridloc",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "guessam",
    "label": "Guess America! (March 1984)",
    "detail": "A COMPUTE!'s Gazette game from March 1984, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "Guess America!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hmans",
    "label": "Haunted Mansion (February 1984)",
    "detail": "Calvin Overhulser's COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.",
    "projectName": "Haunted Mansion",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ibh",
    "label": "International Bounty Hunter (March 1990)",
    "detail": "A COMPUTE!'s Gazette game from March 1990, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.",
    "projectName": "International Bounty Hunter",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "klondike",
    "label": "KLONDIKE (May 1986)",
    "detail": "Klondike solitaire with a bank and bets, for the ColecoVision, from \"Klondike\", COMPUTE!'s Gazette, May 1986 (Commodore 64 BASIC; disk 1986-05, listing in orig/). The listing names no author, so it is credited to the magazine. Rules, additions and liberties are in the header of main.alexis.",
    "projectName": "KLONDIKE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "faithful-adaptation",
      "game",
      "card-game",
      "solitaire",
      "commodore-64",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "letter-attack",
    "label": "Letter Attack! (December 1984)",
    "detail": "COMPUTE!'s Gazette's Letter Attack!, reimagined for ColecoVision with a joystick-controlled alphabet dial, smooth falling letters and scoring statistics; no author is named in the listing.",
    "projectName": "Letter Attack!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "vic-20",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lexitron",
    "label": "Lexitron (February 1986)",
    "detail": "Ron Wilson's COMPUTE!'s Gazette word-search game, reimagined for ColecoVision with a sliding cursor, illuminated letters, energy tubes and three directional rule sets.",
    "projectName": "Lexitron",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "word-game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lava-flow",
    "label": "Lava Flow (September 1988)",
    "detail": "COMPUTE!'s Gazette's Lava Flow, rebuilt for ColecoVision as a one- or two-player arena with spreading lava, heat-damaged walls and animated movement; no author is named on the disk.",
    "projectName": "Lava Flow",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "two-player",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "hseek",
    "label": "HEAT SEEKER (March 1985)",
    "detail": "ColecoVision port of \"Heat Seeker\" by Jeff Wolverton, COMPUTE!'s Gazette March 1985 (Commodore 64 machine language, SYS 2061; a VIC-20 BASIC version was in the same issue). The author's name comes from LaunchBox; the program itself says only \"HEAT SEEKER, Compute! 1985\".",
    "projectName": "HEAT SEEKER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ratrace",
    "label": "THE HUMAN RAT RACE (March 1988)",
    "detail": "A ColecoVision game based on \"Human Rat Race\", COMPUTE!'s Gazette March 1988 disk (Commodore 64: RAT RACE.BOOT, a two-line BASIC loader, loads HUMAN RAT RACE, 3,004 bytes of machine language at $C000, and starts it with SYS 49152). The program and the disk do not name an author (its title screen says only COMPUTE! 1988), and the March 1988 issue scan could not be reached from here. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "THE HUMAN RAT RACE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "invest",
    "label": "INVESTOR (August 1988)",
    "detail": "A ColecoVision port of \"Investor\", COMPUTE!'s Gazette, August 1988 (Commodore 64 and 128, BASIC; the listing names no author, only COMPUTE! Publications). It is a stock-market game for 1 or 2 players. Rules, liberties and controls are in the header of main.alexis.",
    "projectName": "INVESTOR",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "isol",
    "label": "ISOLATION (COMPUTE!'s Gazette, May 1990) (May 1990)",
    "detail": "ColecoVision port of \"Isolation\", COMPUTE!'s Gazette May 1990 (Commodore 64 BASIC, disk 1990-05; listing in orig/). The listing names no author (only \"COPYRIGHT 1990 COMPUTE! PUBLICATIONS, INC.\"), so the credit is the magazine's.",
    "projectName": "ISOLATION (COMPUTE!'s Gazette, May 1990)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jericho",
    "label": "JERICHO (June 1988)",
    "detail": "A ColecoVision game based on \"Jericho\", COMPUTE!'s Gazette June 1988 (issue 60; Commodore 64: one 1,653-byte program, a one-line BASIC stub SYS2099 followed by machine language). The program shows only \"C 1988 COMPUTE PUBL.\" and no author's name. Neither the Best of 1988 disk nor the sources reachable from here give a name, so the game is credited to the magazine. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "JERICHO",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jericho2",
    "label": "JERICHO II (June 1989)",
    "detail": "A ColecoVision game based on \"Jericho II\" by Robert Bixby, COMPUTE!'s Gazette June 1989 disk (Commodore 64 machine language, SYS 2288). The author's name is in the program's own text (\"JERICHO II by Robert Bixby ... Christmas, 1988\"); the BASIC line holds only the COMPUTE! Publications copyright. Made for Amy Studio by Claude (Anthropic) in Amy, 2026. The sequel to JERICHO (1988-06, games/jericho), ported separately: the rules here are the sequel's own.",
    "projectName": "JERICHO II",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jgrab",
    "label": "JEWEL GRAB (January 1989)",
    "detail": "ColecoVision port of \"Jewel Grab\", COMPUTE!'s Gazette disk, January 1989 (issue 67, page 50; Commodore 64 machine language, SYS 2063; no author named on the disk, the program or the sources found). Rules read from the disassembly (orig/jgrab.dis) and watched in jsc64 (orig/run.mjs, orig/speed.mjs, orig/probe.mjs; jsc64 has no sprite collisions, so the hit rules come from the code).",
    "projectName": "JEWEL GRAB",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "jujitsu",
    "label": "JUJITSU (September 1986)",
    "detail": "A ColecoVision port of JUJITSU, COMPUTE!'s Gazette September 1986 (Commodore 64 BASIC with a small machine-code chime; the listing names no author). Despite the name it is a bidding card game (the game known as Goofspiel), with no fighters in it. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "JUJITSU",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "gjump",
    "label": "JUMP (November 1984)",
    "detail": "A ColecoVision game based on \"Jump\" by Fernando Ciccarelli and Marcel Ferreira, COMPUTE!'s Gazette November 1984 (Commodore 64 and VIC-20, BASIC; disk 1984-11). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Authors from LaunchBox's entry for the Gazette program (the listing has no REM credit).",
    "projectName": "JUMP",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "kablam",
    "label": "KABLAM! (January 1985)",
    "detail": "ColecoVision port of KABLAM! by Stephen Ressler, COMPUTE!'s Gazette, January 1985 (Commodore 64 and VIC-20; BASIC with a machine-language core in DATA lines). Original art and music; the rules come from the C64 listing and its disassembled machine code (orig/).",
    "projectName": "KABLAM!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "kicker",
    "label": "KICKER (February 1986)",
    "detail": "A ColecoVision game based on \"Kicker\" by John Krause and Mark Tuttle, COMPUTE!'s Gazette February 1986 (issue 32; Commodore 64 machine language, 1,576 bytes at $0801 started with SYS 2061; authors from LaunchBox's Gazette catalogue, the program names none). A two-player table-soccer game. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "KICKER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "knock31",
    "label": "KNOCK 31 (May 1989)",
    "detail": "A ColecoVision port of KNOCK 31, COMPUTE!'s Gazette May 1989 (disk 1989-05; Commodore 64 BASIC with a small machine-code screen helper; the listing names no author). The card game known as 31, Scat or Blitz, you against three computer players. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "KNOCK 31",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lava",
    "label": "LAVA FLOW (September 1988)",
    "detail": "A ColecoVision game based on \"Lava Flow\", COMPUTE!'s Gazette September 1988 disk (Commodore 64: LAVA.BOOT loads LAVAFLOW, 2,106 bytes of machine language at $C000, and starts it with SYS 49152). No author is named on the disk or in the program. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "LAVA FLOW",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lattack",
    "label": "LETTER ATTACK! (December 1984)",
    "detail": "A ColecoVision game based on \"Letter Attack\", COMPUTE!'s Gazette December 1984 (Commodore 64 and VIC-20, BASIC; disk 1984-12). No author is named in the listings; the magazine's contents list names only the title (the issue scan on archive.org was not reachable). Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "LETTER ATTACK!",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lexi",
    "label": "LEXITRON (February 1986)",
    "detail": "A ColecoVision game based on \"Lexitron\" by Ron Wilson, COMPUTE!'s Gazette February 1986 (Commodore 64 and 128, BASIC; disk 1986-02). Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "LEXITRON",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "lincoln",
    "label": "LINCOLN GREEN (September 1988)",
    "detail": "ColecoVision port of \"Lincoln Green\" by Robert Bixby, COMPUTE!'s Gazette September 1988 (Commodore 64 machine language, SYS 2099, disk 1988-09). Rules read from the machine code (orig/lincoln.dis) and watched/timed in jsc64 (orig/run.mjs, orig/time.mjs). The source header (main.alexis) lists the rules kept and every liberty.",
    "projectName": "LINCOLN GREEN",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "litter",
    "label": "LITTERBUG (November 1987)",
    "detail": "A ColecoVision game based on \"Litterbug\" by Paul Choquette, COMPUTE!'s Gazette November 1987 (Commodore 64, machine language; files litterbug boot, lb1, lb2, litterbug on the 1987-11 disk). Author from the LaunchBox Games Database entry for the issue. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "LITTERBUG",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "marath",
    "label": "MARATHON (August 1989)",
    "detail": "ColecoVision port of \"Marathon\", COMPUTE!'s Gazette August 1989 (Commodore 128, BASIC 7.0 + machine language; no author named in the listing). In Amy.",
    "projectName": "MARATHON",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mblox",
    "label": "MATCH BLOX (November 1986)",
    "detail": "Based on \"Match Blox\", COMPUTE!'s Gazette, November 1986 (Commodore 64 BASIC; the program from the magazine's disk, detokenized, is in orig/). A ColecoVision game on the listing's rules, not a line port. Made by Claude (an AI made by Anthropic) for Amy Studio, 2026.",
    "projectName": "MATCH BLOX",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mmatch",
    "label": "MATCH MANIA (June 1989)",
    "detail": "Based on \"Match Mania\", COMPUTE!'s Gazette, June 1989 (Commodore 64 BASIC, disk 1989-06; no author named; the detokenized listing is in orig/). A ColecoVision game on the listing's rules, not a line port. Made by Claude (an AI made by Anthropic) for Amy Studio, 2026.",
    "projectName": "MATCH MANIA",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mattack",
    "label": "MATH ATTACK (October 1986)",
    "detail": "Port of \"Math Attack\", COMPUTE!'s Gazette October 1986 (Commodore 64 BASIC, orig/mattack.bas; no author named). Rules, liberties and controls: the header of main.alexis.",
    "projectName": "MATH ATTACK",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mdung",
    "label": "MATH DUNGEON (January 1985)",
    "detail": "A port of \"Math Dungeon\", COMPUTE!'s Gazette, January 1985 (one BASIC listing for the Commodore 64 and the VIC-20; no author named in the listing, the disk or the issue contents seen; the C64 path of the listing was used). Original listing in orig/ (untouched, from the 1985-01 disk).",
    "projectName": "MATH DUNGEON",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mmagic",
    "label": "MATH MAGIC (July 1989)",
    "detail": "ColecoVision port of \"Math Magic\", COMPUTE!'s Gazette, July 1989 (Commodore 128, BASIC 7.0, disk 1989-07; no author named on the disk or in the listing). Rules read from the listing (orig/math magic.bas); the C-128 version can't be run headless.",
    "projectName": "MATH MAGIC",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mmania",
    "label": "MAZE-MANIA (September 1985)",
    "detail": "ColecoVision port of Maze-Mania by Mark Tuttle, COMPUTE!'s Gazette September 1985 (C64, BASIC + machine code; disk 1985-09). The rules come from the listing and the disassembled machine code (orig/maze-mania.bas, orig/dis.txt; the ML bytes in orig/ml_c000.bin, orig/ml_c400.bin).",
    "projectName": "MAZE-MANIA",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mazem",
    "label": "MAZE MASTER (mazem) (October 1988)",
    "detail": "ColecoVision port of \"Maze Master\", COMPUTE!'s Gazette October 1988 (C64 machine language, files maze.boot + maze master, SYS 49152; no author named on the disk). Rules read from orig/mazemaster.dis, pace timed in jsc64 (orig/c64time-maze.mjs: the computer steps every ~7.5 jiffies at F1).",
    "projectName": "MAZE MASTER (mazem)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mstrike",
    "label": "METEOR STRIKE (July 1986)",
    "detail": "Based on \"Meteor Strike\", COMPUTE!'s Gazette July 1986 (Commodore 64 machine language, SYS2061; no author named on the disk). Rules, liberties and controls are in the header of main.alexis.",
    "projectName": "METEOR STRIKE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mboggle",
    "label": "MIND BOGGLE (May 1984)",
    "detail": "ColecoVision port of \"Mind Boggle\", COMPUTE!'s Gazette May 1984 (Commodore 64 and VIC-20 BASIC, disk 1984-05; no author named in the listings or on the disk; listings in orig/, the C64 one is the source).",
    "projectName": "MIND BOGGLE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mine89",
    "label": "MINESWEEPER (July 1989)",
    "detail": "A ColecoVision game based on \"Minesweeper\" by Ben Campbell, COMPUTE!'s Gazette July 1989 (Commodore 64 machine language, 7,271 bytes, started by 10 SYS (2068); the author's name is on its title screen: \" MINE SWEEPER BY BEN CAMPBELL\"). An arcade shooter, not the logic puzzle. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "MINESWEEPER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mbbq",
    "label": "MONSTER BAR-B-Q (July 1989)",
    "detail": "A ColecoVision game based on \"Monster Bar-B-Q\", COMPUTE!'s Gazette July 1989 (Commodore 128, BASIC 7.0; no author named in the listing or on the disk). Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "MONSTER BAR-B-Q",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "moonres",
    "label": "MOON RESCUE (December 1986)",
    "detail": "A ColecoVision game based on \"Moon Rescue\", COMPUTE!'s Gazette, December 1986 (Commodore 128, BASIC 7.0; no author named on the disk or in the listing). Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "MOON RESCUE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "mosaic",
    "label": "MOSAIC (February 1988)",
    "detail": "ColecoVision port of \"Mosaic\" by Jay A. Reeve, COMPUTE!'s Gazette, February 1988 (C64 BASIC + a 26-byte sprite mover; disk 1988-02, article on the Best of '88 disk: orig/article.txt).",
    "projectName": "MOSAIC",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "munch",
    "label": "MUNCHMATH (November 1983)",
    "detail": "Based on \"Munchmath\", COMPUTE!'s Gazette November 1983 (Commodore 64 and VIC-20, BASIC; no author named in the listing). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Rules, liberties and controls: the header of main.alexis.",
    "projectName": "MUNCHMATH",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "marple",
    "label": "MYSTERY AT MARPLE MANOR (September 1984)",
    "detail": "ColecoVision port of \"Mystery at Marple Manor\", COMPUTE!'s Gazette, September 1984 (C64 + VIC-20 BASIC, disk 1984-09; no author named). Rules from the C64 listing in orig/; the source header of main.alexis lists the rules kept and every liberty.",
    "projectName": "MYSTERY AT MARPLE MANOR",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ntnote",
    "label": "NAME THAT NOTE (February 1985)",
    "detail": "Based on \"Name That Note\", COMPUTE!'s Gazette February 1985 (Commodore 64 and VIC-20, BASIC; no author named in the listing). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Rules, liberties and controls: the header of main.alexis.",
    "projectName": "NAME THAT NOTE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "nevets",
    "label": "NEVETS (April 1984)",
    "detail": "A ColecoVision game based on \"Nevets\" by Steven R. McCloskey, COMPUTE!'s Gazette April 1984 (Commodore 64 and VIC-20, BASIC). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Author from LaunchBox's entry for the game (the disk's REM line names only the 1989 retyping date).",
    "projectName": "NEVETS",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "nckit",
    "label": "NUMBER CONSTRUCTION KIT (March 1986)",
    "detail": "Based on \"Number Construction Kit\", COMPUTE!'s Gazette March 1986 (Commodore 64, BASIC loaded at $3401; no author named in the listing). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Rules, liberties and controls: the header of main.alexis.",
    "projectName": "NUMBER CONSTRUCTION KIT",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "numplz",
    "label": "NUMBER PLEASE? (October 1987)",
    "detail": "Based on \"Number Please?\", COMPUTE!'s Gazette October 1987 (Commodore 64 and 128, BASIC; the listing names no author). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Rules, liberties and controls: the header of main.alexis.",
    "projectName": "NUMBER PLEASE?",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "nquest",
    "label": "NUMBER QUEST (nquest) (April 1985)",
    "detail": "ColecoVision port of \"Number Quest\", COMPUTE!'s Gazette, April 1985 (C64 + VIC-20 BASIC; no author named). Rules, liberties and controls: header of main.alexis.",
    "projectName": "NUMBER QUEST (nquest)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "obst",
    "label": "OBSTACLE 128 (November 1986)",
    "detail": "ColecoVision port of Obstacle 128, COMPUTE!'s Gazette November 1986 (Commodore 128 BASIC 7.0, disk 1986-11; no author named in the listing, orig/obstacle 128.bas). Two lines that never stop; the border is drawn in the players' colours with a random gap at the top of the left side and the bottom of the right side; both lines start on the middle row moving the same random way; a crash scores for the other player, both crashing scores for both; when purple crashes blue takes one more step; 5 points and ahead wins. The C-128 program cannot run headless: rules read from the listing.",
    "projectName": "OBSTACLE 128",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "oildef",
    "label": "OIL DEFENSE (March 1988)",
    "detail": "A ColecoVision game based on \"Oil Defense\", COMPUTE!'s Gazette March 1988 (disk 1988-03; Commodore 64 machine language, 3,867 bytes at $0801 started by SYS 2062). Neither the program nor the disk names the author. Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Not to be confused with games/oil (OIL TYCOON, Gazette 1983).",
    "projectName": "OIL DEFENSE",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "gpegs",
    "label": "PEGS (gpegs) (December 1986)",
    "detail": "ColecoVision port of \"Pegs\", COMPUTE!'s Gazette, December 1986 (issue 42; C64 + VIC-20 BASIC; the listing names no author). Rules, liberties and controls: header of main.alexis. orig/pegs_64.bas (primary) and orig/pegs_vic.bas are the listings (disk 1986-12).",
    "projectName": "PEGS (gpegs)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "persu",
    "label": "PERSUASION (persu) (October 1986)",
    "detail": "ColecoVision port of \"Persuasion\", COMPUTE!'s Gazette, October 1986 (C64 BASIC + a small raster-split ML routine; the listing names no author). Rules, liberties and controls: header of main.alexis. orig/persuasion.bas is the listing (disk 1986-10), orig/raster.dis the ML (border colour split only).",
    "projectName": "PERSUASION (persu)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pickl",
    "label": "PICK-A-LETTER (February 1987)",
    "detail": "Based on \"Pick-A-Letter\", COMPUTE!'s Gazette February 1987 (Commodore 64 and 128, BASIC; the listing names no author). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Rules, liberties and controls: the header of main.alexis.",
    "projectName": "PICK-A-LETTER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pigs",
    "label": "PIGS FOR BUCKS (October 1986)",
    "detail": "A ColecoVision game based on \"Pigs for Bucks\", COMPUTE!'s Gazette October 1986 (Commodore 128, BASIC 7.0 with the sprite files PIG.SPR1-3 and a small PIG.ML). The listing carries no author's name; credited to the magazine. Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "PIGS FOR BUCKS",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pinhead",
    "label": "PINHEAD (February 1990)",
    "detail": "ColecoVision port of \"Pinhead\", COMPUTE!'s Gazette February 1990 (Commodore 64 machine language, SYS 2064; no author named on the disk). Move a trampoline, bounce the pin-headed acrobat and pop the balloons drifting across a circus tent.",
    "projectName": "PINHEAD",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pcove",
    "label": "PIRATE COVE (pcove) (August 1986)",
    "detail": "A ColecoVision port of \"Pirate Cove\", a mini-adventure for kids by Barbara H. Schulak, COMPUTE!'s Gazette, August 1986 (Commodore 64 BASIC; listing in orig/). Rules and liberties: see the header of main.alexis.",
    "projectName": "PIRATE COVE (pcove)",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "praider",
    "label": "PLANET RAIDER (March 1990)",
    "detail": "A ColecoVision game based on \"Planet Raider\", COMPUTE!'s Gazette, March 1990 (Commodore 64 machine language, PLANET RAIDER, 4,816 bytes at $0801, started with SYS2064; disk 1990-03). The program and the disk's contents file name no author and the issue's article could not be reached here, so the credits say \"COMPUTE!'s Gazette, March 1990\". Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "PLANET RAIDER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "poker",
    "label": "POKER (March 1984)",
    "detail": "\"Poker\" (\" POKER 256 \" on its title), COMPUTE!'s Gazette, March 1984 (Commodore 64 and VIC-20 BASIC with two small machine-language routines), ported to the ColecoVision in Amy. The listing names no author, so the credit is \"COMPUTE!'s Gazette, March 1984\". (The disk copy's REM, \"C-64 VERSION/1-27-89\", is the date of the reader who retyped the early disks.)",
    "projectName": "POKER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pool",
    "label": "POOL (April 1985)",
    "detail": "A ColecoVision game based on \"Pool\", COMPUTE!'s Gazette April 1985 (Commodore 64 machine language: POOL/64 loads PL at $C000; the disk also has a VIC-20 BASIC version). No author is named on the disk. Made by Claude for Amy Studio, in Amy.",
    "projectName": "POOL",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "ppoker",
    "label": "POWER POKER (November 1985)",
    "detail": "Jud Bleser's poker-squares game from COMPUTE!'s Gazette, November 1985 (Commodore 64, BASIC plus a 382-byte machine-language card drawer), ported to the ColecoVision in Amy. Author's name from the LaunchBox games database (the listing has no REM credit).",
    "projectName": "POWER POKER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pball2",
    "label": "POWERBALL (May 1987)",
    "detail": "ColecoVision remake of Powerball, COMPUTE!'s Gazette May 1987 (Commodore 64 machine language at $C000, files POWERBALL.BOOT / POWERBALL; no author named on the disk). Not the same game as pball (PRISONBALL).",
    "projectName": "POWERBALL",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "predict",
    "label": "PREDICTOR (June 1986)",
    "detail": "From COMPUTE!'s Gazette, June 1986 (issue 36, page 58; no author named), for the Commodore 64 and VIC-20. Ported to the ColecoVision in Amy.",
    "projectName": "PREDICTOR",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "props",
    "label": "PROPS (May 1984)",
    "detail": "Port of \"Props\", COMPUTE!'s Gazette May 1984 (Commodore 64, BASIC + machine language; no author named on the disk). Rules, liberties and controls are in the header of main.alexis.",
    "projectName": "PROPS",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "pudding",
    "label": "PUDDING MOUNTAIN MINER (April 1985)",
    "detail": "A ColecoVision game based on \"Pudding Mountain Miner\", the 17-line BASIC program of the Horizons column in COMPUTE!'s Gazette, April 1985 (one listing for the Commodore 64 and VIC-20 that detects the machine; no author named in the listing). Made for Amy Studio by Claude (Anthropic) in Amy, 2026.",
    "projectName": "PUDDING MOUNTAIN MINER",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  },
  {
    "id": "nname",
    "label": "THE NOTE NAME GAME (December 1983)",
    "detail": "Based on \"The Note Name Game\", COMPUTE!'s Gazette December 1983 (Commodore 64 and VIC-20, BASIC; no author named in the listing or the issue's contents; the disk copy was retyped in 1989). Made for Amy Studio by Claude (Anthropic) in Amy, 2026. Rules, liberties and controls: the header of main.alexis.",
    "projectName": "THE NOTE NAME GAME",
    "sourceLang": "amy",
    "memoryProfile": "colecovision_legacy_sdcc",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "gazette",
      "reimagined-adaptation",
      "game",
      "commodore-64",
      "compute!"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  }
];
