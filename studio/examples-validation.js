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
  }];

export const validationExampleManifest = validationExamples.map(({ sourceText, projectFiles, ...rest }) => ({
  category: "Selftests",
  ...rest
}));