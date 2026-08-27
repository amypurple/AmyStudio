// Generated lightweight examples directory. Do not add sourceText or projectFiles here.
// Run: node tools/generate-examples-index.mjs
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

export const exampleManifest = [
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
    "id": "cvbasic-vector-cube-port",
    "label": "CVBasic Vector Cube Port",
    "detail": "Amy adaptation of Matthew Eggleston's CVBasic vector cube demo using native bitmap line drawing.",
    "projectName": "cvbasic-vector-cube-port",
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
    "id": "explosion",
    "label": "Explosion",
    "detail": "Amy port inspired by Amy Bienvenu / NewColeco's 2004 SDCC Explosion board game: overload cells, chain reactions, and legacy CPU move evaluation.",
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
    "id": "smooth-criminal-music",
    "label": "Smooth Criminal Music",
    "detail": "",
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
    "id": "easter-bunny",
    "label": "Easter Bunny",
    "detail": "Playable Amy Studio port of Amy Bienvenu / NewColeco's Minigame Compo 2007 Easter Bunny, now using the native Amy v3 rewrite path with only the required project assets.",
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
    "id": "reversi",
    "label": "Reversi",
    "detail": "Complete Amy Studio port of Amy Bienvenu / NewColeco's legacy Reversi, with human, simple, and bounded-negamax tuned players, original graphics, animated flips, and the historical NewColeco logo cue.",
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
    "id": "amy-state-machine-selftest",
    "label": "Amy State Machine Self-Test",
    "detail": "Typed four-state machine self-test using qualified one-based state constants and bounded dispatch.",
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
    "id": "amy-overlay-layout-selftest",
    "label": "Amy RAM Overlay Layout Self-Test",
    "detail": "Runtime test for shared overlay aliases, packed record-array fields, physical RAM reuse, and indexed actor access.",
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
    "id": "amy-scenes-overlays-design",
    "label": "Amy Scenes and Overlays Lab",
    "detail": "Executable lifecycle lab with three scene-local RAM layouts, compiler-generated frame dispatch, and NMI-safe mainline transitions.",
    "projectName": "amy-scenes-overlays-design",
    "sourceLang": "amy",
    "editorialTrack": "manual-canon",
    "category": "Selftests",
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
  }
];
