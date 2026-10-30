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
    "detail": "Paul Burger's platform game, adapted from the 1983 TI-99/4A listing with joystick movement, jumping and sound.",
    "projectName": "jumping-jack",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "gold-miner",
    "label": "Gold Miner (TI-99/4A Port)",
    "detail": "Joseph Weber and James Dunn's mine exploration game with animated digging, charges, gold and joystick controls.",
    "projectName": "gold-miner",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "first-math",
    "label": "First Math (TI-99/4A Port)",
    "detail": "Steve Hamilton's arithmetic tutor adapted to the ColecoVision keypad with selectable operations and difficulty ranges.",
    "projectName": "first-math",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "educational",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "southern-states",
    "label": "Southern States (TI-99/4A Port)",
    "detail": "C. Regena's map quiz with a ColecoVision keypad build and an OS7+EOS hybrid ADAM keyboard build.",
    "projectName": "southern-states",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "adam",
      "educational",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "diamond-drop",
    "label": "Diamond Drop (TI-99/4A Port)",
    "detail": "Matt Giwer and Patrick Parrish's falling-diamond action game with fixed-point sprite motion and packed BCD scoring.",
    "projectName": "diamond-drop",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "mystery-spell",
    "label": "Mystery Spell (TI-99/4A Port)",
    "detail": "Doug Hapeman's animated spelling game with 318 cartridge words and ADAM keyboard, custom-list and media support.",
    "projectName": "mystery-spell",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "adam",
      "educational",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "runway-180",
    "label": "Runway 180 (TI-99/4A Port)",
    "detail": "James Dunn's 1983 jet-landing game, adapted with deterministic fixed-point sprite motion, runway hazards and ColecoVision controls.",
    "projectName": "runway-180",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "crazy-climber",
    "label": "Crazy Climber (TI-99/4A Port)",
    "detail": "Ted Reynolds and Pat Parrish's climbing game with falling objects, parachute animation and compact VoxPCM speech.",
    "projectName": "crazy-climber",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "voxpcm",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "get-the-gold",
    "label": "Get the Gold (TI-99/4A Port)",
    "detail": "Frank Elsesser's 128-room dungeon adventure with a visible exploration map and separate ColecoVision and ADAM controls.",
    "projectName": "get-the-gold",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "adam",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "balloon-crazy",
    "label": "Balloon Crazy (TI-99/4A Port)",
    "detail": "Joseph Russ and Patrick Parrish's balloon-catching game with fixed-point sprite motion, animated balloon strings and BCD scoring.",
    "projectName": "balloon-crazy",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "beethoven-medley",
    "label": "Beethoven Medley (TI-99/4A Port)",
    "detail": "C. Regena's historical Ludwig program: four Beethoven excerpts synchronized with a progressively drawn and gently animated scene.",
    "projectName": "beethoven-medley",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Music",
    "tags": [
      "amy",
      "ti99",
      "port",
      "music",
      "graphics",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "blueberries",
    "label": "Blueberries",
    "detail": "Bill Root's 1984 farming game adapted for one or two players, with seed planting, ripening berries, a computer opponent and layered farmer sprites.",
    "projectName": "blueberries",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "atari",
      "port",
      "game",
      "sprites",
      "two-player",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "pests",
    "label": "Pests",
    "detail": "Kevin Woram's 1984 garden game adapted with eight-direction movement, spreading weeds, flower fumigation, layered sprites and Tiny Sound music.",
    "projectName": "pests",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "commodore-64",
      "port",
      "game",
      "sprites",
      "music",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "spiders",
    "label": "Spiders",
    "detail": "Joe Rocke's 1984 alien-defense game with swaying formations, diving spiders, missiles, officer bonus rounds and Tiny Sound music.",
    "projectName": "spiders",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "commodore-64",
      "port",
      "game",
      "sprites",
      "music",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "bunny-hop",
    "label": "Bunny Hop",
    "detail": "Adam Cybanski's 1984 cloud-jumping game with smooth scrolling clouds, carrots, jumper rounds and fixed-point sprite movement.",
    "projectName": "bunny-hop",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "atari",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "jackpot",
    "label": "Jackpot",
    "detail": "Rick Rothstein's 1984 slot-machine simulation with three odds levels, animated reels, keypad controls and faithful TI-99/4A graphics.",
    "projectName": "jackpot",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "keypad",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "devastator",
    "label": "Devastator",
    "detail": "David R. Arnold and Patrick Parrish's 1984 crosshair action game with fixed-point motion, two skill levels and animated destruction sequences.",
    "projectName": "devastator",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "fixed-point",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "olympiad",
    "label": "Olympiad",
    "detail": "Kevin Woram and Mike Buhidar Jr.'s enchanted arena duel with two-player controls, a computer opponent, arrows, teleport grids and Tiny Sound music.",
    "projectName": "olympiad",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "commodore-64",
      "atari",
      "port",
      "game",
      "two-player",
      "sprites",
      "music",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "pentominos",
    "label": "Pentominos",
    "detail": "Jim Butterfield's twelve-piece rectangle solver, adapted from the 1984 TI-99/4A listing with four board sizes, visible backtracking and three search speeds.",
    "projectName": "pentominos",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "puzzle",
      "solver",
      "music",
      "manual-canon",
      "compute!"
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
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "colorbot",
    "label": "Colorbot",
    "detail": "John R. Dondzila's robot-survival game with eight-way movement, Electron Frisbees, animated walls and Tiny Sound music.",
    "projectName": "colorbot",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "demons-of-osiris",
    "label": "Demons of Osiris",
    "detail": "A ColecoVision rewrite of Steve Haynal's 1984 base-defense game with evasive attackers, waves and rapid fire.",
    "projectName": "demons-of-osiris",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "gotcha",
    "label": "Gotcha!",
    "detail": "Doug Smoak's wraparound money chase with a pursuing Collector, evolving mazes and smooth sprite movement.",
    "projectName": "gotcha",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "vic-20",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "horse-racing",
    "label": "Horse Racing (TI-99/4A Port)",
    "detail": "Robert Onufer's multi-player betting game with calculated odds, animated horses, track conditions and correct indexed payoffs.",
    "projectName": "horse-racing",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "game",
      "sprites",
      "arithmetic",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "lightsaver",
    "label": "Lightsaver",
    "detail": "Catch falling light bulbs with moving baskets across sixteen skill levels, bonus baskets and an automatic demo.",
    "projectName": "lightsaver",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "commodore-64",
      "port",
      "game",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "missile-math",
    "label": "Missile Math",
    "detail": "Garry S. Wick's arithmetic game with five possible answers, a moving UFO, selectable operations and scoring by speed.",
    "projectName": "missile-math",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "educational",
      "sprites",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "number-game",
    "label": "The Number Game",
    "detail": "Lou Tylee's preschool number-recognition game with large digits, keypad play, counted blocks and compact VoxPCM speech.",
    "projectName": "number-game",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "educational",
      "voxpcm",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "quatrainment",
    "label": "Quatrainment",
    "detail": "A 4x4 pattern puzzle with selectable difficulty, move previews, par calculation and visible timing.",
    "projectName": "quatrainment",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "ti99",
      "port",
      "puzzle",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "ti-aquarium",
    "label": "TI Aquarium",
    "detail": "Michael A. Covington's relaxing sprite aquarium with nine moving fish, bubbles, seaweed and rotating sprite priority.",
    "projectName": "ti-aquarium",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Demos",
    "tags": [
      "amy",
      "ti99",
      "port",
      "sprites",
      "graphics",
      "manual-canon",
      "compute!"
    ],
    "originKind": "faithful-adaptation",
    "originLabel": "Faithful adaptation"
  },
  {
    "id": "trident",
    "label": "Trident",
    "detail": "C. O. Dickerson's submarine missile-defense game rebuilt with a Graphics II radar, waves and steerable antimissiles.",
    "projectName": "trident",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Games",
    "tags": [
      "amy",
      "atari",
      "port",
      "game",
      "graphics",
      "manual-canon",
      "compute!"
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
    "detail": "Brian Foley's winding-road driving game with hazards, four skill levels and progressively narrower courses.",
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
    "detail": "Guide Nerm through Bemer Castle, eating magic mushrooms while avoiding walls and other hazards.",
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
    "detail": "Scott Baker's Dark World action game with animated creatures, six levels, spare robots and joystick-controlled movement.",
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
    "detail": "John Goetz's 1985 one-button parachute game with variable wind and weight, animated boats, two difficulty levels and three landing pads.",
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
    "detail": "Dan Goff's climbing maze game with randomized barriers, collectible creatures, rising speed and persistent high score.",
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
    "detail": "Dub Scroggin's downhill racing game with gates, jumps, hazards, five slopes, multiple players and cumulative rounds.",
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
    "detail": "A ColecoVision motorcycle stunt game with rookie and pro courses, wheelies, flaming-hoop jumps, variable ramps, high scores and an original title tune.",
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
      "air"
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
      "sprites"
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
    "detail": "Six casino games sharing one wallet: Blackjack, Roulette, Las Vegas High, Seven/Eleven, Under 'N' Over and Inner Spring.",
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
      "ai-assisted",
      "compute!"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "ai-assisted",
      "compute!"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
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
      "music"
    ],
    "originKind": "reimagined-adaptation",
    "originLabel": "Reimagined adaptation"
  }
];
