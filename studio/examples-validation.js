// Small validation examples kept in the clean repo so recent language/runtime features stay testable.
export const validationExamples = [
  {
    "id": "amy-timer-lab",
    "label": "Amy Timer Lab",
    "detail": "Regression lab for safe named timers: repeating every-N ticks and one-shot after-N ticks started explicitly by game state.",
    "projectName": "amy-timer-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "sourceText": "cartridge \"AMY TIMER LAB/AMY STUDIO/2026\"\n\ntimer BlinkTimer every 30 ticks\ntimer DoorTimer after 120 ticks stopped\n\nu8 BlinkCount = 0\nu8 DoorDone = 0\nu8 BlinkTile = 42\n\n  text screen\n  print centered at 3, \"AMY TIMER LAB\"\n  print centered at 5, \"EVERY 30 TICKS\"\n  print centered at 6, \"AFTER 120 TICKS\"\n  print at 4,10, \"BLINKS:\"\n  print at 4,12, \"DOOR  : WAITING\"\n  print at 4,15, \"BOX:\"\n  start timer DoorTimer\n  screen on\n\nmain_loop:\n  wait\n  if timer BlinkTimer then BlinkTick\n  if timer DoorTimer then DoorTick\n  print BlinkCount at 12,10 digits 3\n  if DoorDone = 0 then goto main_loop\n  if BlinkCount < 4 then goto main_loop\n  print centered at 18, \"PASS - BOTH TIMER TYPES\"\ndone:\n  goto done\n\nsub BlinkTick:\n  BlinkCount += 1\n  if BlinkTile = 42 then\n    BlinkTile = 43\n  else\n    BlinkTile = 42\n  end if\n  put char BlinkTile at 9,15\n  return\n\nsub DoorTick:\n  DoorDone = 1\n  print at 12,12, \"OPEN   \"\n  put char 47 at 9,15\n  stop timer BlinkTimer\n  return",
    "editorialTrack": "manual-canon"
  },
  {
    "id": "amy-on-frame-lab",
    "label": "Amy On Frame Lab",
    "detail": "Regression lab for on frame SubName: generated NMI calls a parameterless Amy sub once per VBlank.",
    "projectName": "amy-on-frame-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "sourceText": "cartridge \"AMY VBLANK LAB/AMY STUDIO/2026\"\n' Studio refresh marker: 2026-06-23 19:59:50 -04:00\n\nu16 Tick = 0\n\non vblank TickFrame\n\n  text screen\n  print centered at 4, \"ON VBLANK LAB\"\n  print centered at 6, \"NMI CALLS TICKFRAME\"\n  print at 8,10, \"TICKS:\"\n  screen on\n\nmain_loop:\n  wait\n  print Tick at 15,10 digits 5\n  if Tick < 120 then goto main_loop\n  print centered at 14, \"PASS - VBLANK HOOK RAN\"\nstop_loop:\n  goto stop_loop\n\nsub TickFrame:\n  Tick += 1\n  return",
    "editorialTrack": "manual-canon"
  },
  {
    "id": "amy-conditional-compile-lab",
    "label": "Amy Conditional Compile Lab",
    "detail": "Regression lab for define/ifdef/ifndef: active debug branch compiles, inactive duplicate sub names do not collide or emit code.",
    "projectName": "amy-conditional-compile-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "sourceText": "cartridge \"AMY CONDITIONAL LAB/AMY STUDIO/2026\"\n\ndefine DEBUG_BUILD\n\nu8 Result = 0\nu8 Expected = 42\n\n  text screen\n  screen on\n  SelectBuild\n  SameNameDebugHook\n  print centered at 6, \"CONDITIONAL COMPILE\"\n  print at 8,9, \"RESULT:\"\n  print Result at 16,9 digits 3\n  if Result = Expected then\n    print centered at 12, \"PASS DEBUG BRANCH\"\n  else\n    print centered at 12, \"FAIL WRONG BRANCH\"\n  end if\n  loop forever\n\nifdef DEBUG_BUILD\nsub SelectBuild:\n  Result = 42\n  return\nend ifdef\n\nifndef DEBUG_BUILD\nsub SelectBuild:\n  Result = 99\n  print centered at 18, \"INACTIVE RELEASE CODE\"\n  return\nend ifndef\n\n' Same-name duplicate sub in mutually exclusive conditional blocks.\nifdef DEBUG_BUILD\nsub SameNameDebugHook:\n  return\nend ifdef\n\nifndef DEBUG_BUILD\nsub SameNameDebugHook:\n  print centered at 20, \"INACTIVE HOOK\"\n  return\nend ifndef",
    "editorialTrack": "manual-canon"
  },
  {
    "id": "amy-multicolor-pixel-lab",
    "label": "Amy Multicolor Pixel Lab",
    "detail": "Minimal Graphics Mode 3 example: clear pattern bytes, set multicolor pixels, read one pixel back.",
    "projectName": "amy-multicolor-pixel-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "sourceText": "cartridge \"MULTICOLOR PIXELS/AMY/2026\"\n\nu8 PixelColor = 0\n\n  multicolor screen\n' In multicolor mode, visible color nibbles live in the pattern table.\n  cls\n  pset multicolor 2,2 color 5\n  pset multicolor 3,2 color 12\n  pset multicolor 2,3 color 10\n  pset multicolor 3,3 color 15\n  PixelColor = pget multicolor 2,2\n  pset multicolor 6,7 color PixelColor\n  screen on\nmain:\n  goto main",
    "editorialTrack": "manual-canon"
  },
  {
    "id": "warrior-nibble",
    "label": "Warrior Nibble",
    "detail": "Warrior Mode 2 bitmap using the Nibble codec for preview and runtime decompression.",
    "projectName": "warrior-nibble",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "projectFiles": [
      {
        "path": "warrior.pattern.nibble",
        "kind": "picture",
        "codec": "nibble",
        "source": "example",
        "base64": "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"
      },
      {
        "path": "warrior.color.nibble",
        "kind": "picture",
        "codec": "nibble",
        "source": "example",
        "base64": "GQLwI6j/yRiII7CI/ym5RpCQEZCYhIhl/5EkiJDliIgZmE6QkFGQiJSQ1IjoiIyQJ4iQKZCrkJCYSYjSiIhRkNiskGWQiEmI0pCIsQ+EYRhGEYRhGEaRFYiQpIjpiIgZkEaI0LGgiKSI6YiYWAjCMIwjBIiQbYiIWohKqNDVuKC0CKMoyjKMiCOIiGq42tiYtIiIrbClEBlGUZRRhGEYRYiIO4jaiJj44JC1iO2IiHy4QogHk6TpOk6JiPag4MWQr4iIa4jgiKCIiIqICPa9r2vaiHqIoM7g85CIrIjriIhziJiSiIiXiIiniDeIoK7ga6CIdIiIjYjxCHxfF8XpkAiL4vi+L4iOkG+IoFzgoNaI6YiIi4jiIPi+L4vi+L4vi5GEYRhrOs6zrPuYiLyg4PegO4iIZYiI9wit63renIiIiICYiKDglKAjiIi/iPuIqFKQiIygJeCgCIjviIgbiIn/H7/v+/7/v+/7/v+/7/v+/7/v+/6I1IijiKAJ4EKgiDKIoN8Q/f9/3/f9/3/f9Yj3iIgoiMKYiDLgoISIZJCIkOSI4ZCIyYjKiJgyiOCcoGWIiD+YzpCIH5CInIijmJAp0MqIkDKIiIyIp4iIuoh+iJh0iJCciKOIiCiIyqiYcqignIiniIi5mE6IiFSQiE6YiJOoqKSI6ZCQOYhDiIjQiIjkiD2IoA+gQoiQdNign/iliJA6qACBEUEU0XHxHxexgRihG3X1tWERQRThcQ=="
      }
    ],
    "sourceText": "picture WarriorNibblePicture:\n  pattern from \"@project/warrior.pattern.nibble\" codec nibble\n  color from \"@project/warrior.color.nibble\" codec nibble\nend picture\n\n' Show one Warrior bitmap picture compressed with the Nibble codec.\n  show picture WarriorNibblePicture",
    "editorialTrack": "manual-canon"
  }
];

export const validationExampleManifest = [
  {
    "id": "amy-timer-lab",
    "label": "Amy Timer Lab",
    "detail": "Regression lab for safe named timers: repeating every-N ticks and one-shot after-N ticks started explicitly by game state.",
    "projectName": "amy-timer-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "editorialTrack": "manual-canon"
  },
  {
    "id": "amy-on-frame-lab",
    "label": "Amy On Frame Lab",
    "detail": "Regression lab for on frame SubName: generated NMI calls a parameterless Amy sub once per VBlank.",
    "projectName": "amy-on-frame-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "editorialTrack": "manual-canon"
  },
  {
    "id": "amy-conditional-compile-lab",
    "label": "Amy Conditional Compile Lab",
    "detail": "Regression lab for define/ifdef/ifndef: active debug branch compiles, inactive duplicate sub names do not collide or emit code.",
    "projectName": "amy-conditional-compile-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "editorialTrack": "manual-canon"
  },
  {
    "id": "amy-multicolor-pixel-lab",
    "label": "Amy Multicolor Pixel Lab",
    "detail": "Minimal Graphics Mode 3 example: clear pattern bytes, set multicolor pixels, read one pixel back.",
    "projectName": "amy-multicolor-pixel-lab",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "editorialTrack": "manual-canon"
  },
  {
    "id": "warrior-nibble",
    "label": "Warrior Nibble",
    "detail": "Warrior Mode 2 bitmap using the Nibble codec for preview and runtime decompression.",
    "projectName": "warrior-nibble",
    "sourceLang": "amy",
    "selectedLibs": [],
    "selectedBundles": [],
    "selectedCompression": [],
    "selectedAssets": [],
    "editorialTrack": "manual-canon"
  }
];
