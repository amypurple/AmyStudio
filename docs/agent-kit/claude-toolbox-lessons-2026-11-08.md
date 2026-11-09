# Lessons Extracted from the Claude Toolbox

Date: 2026-11-08

The toolbox built while producing hundreds of games contains more than Amy syntax
advice. It is simultaneously a knowledge base, a production harness, an evidence
collector, and a project scaffold. Amy Studio should absorb those four functions
without treating every historical workaround or editorial preference as a language
rule.

## What the first agent kit had not captured

1. **A build is not a game test.** Runtime checks must inspect the RAM variables,
   VRAM name table, sprite table, sound state, and visible frames relevant to the
   changed behavior.
2. **A bot must not merely replay the implementation.** Important games need a
   rules model written from the source material, plus at least one independent
   invariant that would fail if both game and model made the same mistake.
3. **Human play is a measurable requirement.** Bots should use reaction delays,
   tap rates, and visible information comparable to a player. Idle, fire-mashing,
   camping, and single-direction strategies should not accidentally dominate.
4. **Visual defects are temporal.** A final screenshot misses one-frame pixels,
   page wipes, sprite flicker, actor trails, edge wrapping, and missed-frame
   artifacts. Representative frame strips and contact sheets are evidence.
5. **Ports need original-system evidence.** Speeds, random sequences, controls,
   collision rules, and ambiguities should be measured from the listing, disk,
   trace, or emulator before being replaced by intuition.
6. **Generated content needs proof.** Levels and puzzles require offline validation
   for solvability, reachability, bounds, and termination before they enter a ROM.
7. **Delivery is part of correctness.** The delivered ROM must be rebuilt from the
   delivered source and compared byte for byte. Compiler version, optimization
   profile, skipped checks, screenshots, provenance, controls, and liberties belong
   in the evidence pack.
8. **Stale artifacts are dangerous.** A failed build must not leave an older ROM
   that can be mistaken for the new result. Build commands should remove or
   quarantine the old output first.
9. **Rules need retirement conditions.** Toolbox advice created for a compiler bug
   must stop applying when a capability test proves that the natural Amy form now
   works.
10. **Parallel agents need ownership.** One owner writes each game or generated
    manifest. Agents may investigate independently, but one integrator controls
    shared compiler, catalog, and release files.

## Rule classes

Every durable rule should declare one class. This prevents a useful house rule from
being mistaken for TMS9918A or OS7 law.

| Class | Meaning | Example |
| --- | --- | --- |
| Hardware contract | Required by ColecoVision, ADAM, TMS9918A, SN76489, OS7, or EOS | Four sprites per scanline; sprite Y=208 terminates the list |
| Compiler contract | Current Amy semantics or ABI | An OS7 call that clobbers IX must protect an active IX frame |
| Runtime evidence | A behavior that must be measured | Music attenuation and tone-3/noise state under real OS7 |
| Publication contract | Required metadata or deliverable | Original author, issue, adaptation category, controls |
| Recommended UX | Strong default with exceptions | Controller-first menu and short HOW TO PLAY pages |
| Project preference | A deliberate choice for one game or series | Mandatory original title tune or a particular menu order |
| Historical workaround | Temporary code tied to a missing capability | Compute a divided table index in a temporary variable |

Historical workarounds require a capability identifier, the compiler build on which
they reproduced, a focused regression, and a retirement condition. They must never
be copied into the canonical skill without those fields.

## Risk-selected QA

Recompiling every game for every change is expensive and often low-value. Select
tests from the affected capability and project risks, then use the full corpus only
as a promotion gate when justified.

| Project/change | Minimum evidence |
| --- | --- |
| Documentation or catalog metadata | Link/manifest validation and targeted browser check |
| Tiny syntax/codegen change | Focused compile and runtime oracle at all affected profiles |
| Runtime or ABI change | Focused RAM/VRAM/sprite/sound oracle, representative games, then `amy-qa quick` |
| Optimizer rule | Positive, clobber, control-flow, flags, implicit-register, and source-marker tests |
| Small example | Compile plus one behavior assertion; no mandatory game bot |
| Substantial game | Human-paced bot, cheap-strategy bot, visual strip, reachable ending |
| Generated puzzle/level game | Generator validation plus runtime reachability sample |
| Historical port | Original-system trace, documented liberties, controls and timing comparison |
| Release/promotion | Affected profiles, selected corpus, evidence pack, clean-repository gates |

The selected corpus should be tagged by capability: BCD, locals/stack, dynamic
indexes, VRAM transfers, sprites, sound, NMI timing, codecs, Graphics II, ADAM EOS,
and optimizer-sensitive assembly. A change runs one or two exemplars per affected
tag rather than an arbitrary list of famous games.

## Runtime and visual contracts worth adopting

- Wait for a game state, not a fixed frame count. Account explicitly for the OS7
  title sequence when a cartridge retains it.
- Validate essential content inside the declared CRT safe area. Static source scans
  are warnings; runtime frames decide whether dynamic sprites, scores, and menus are
  actually clipped.
- Validate text against per-screen text regions rather than assuming one rectangle
  applies to title, instructions, gameplay, and high-score screens.
- Check sprite terminators, hidden Y values, scanline load, priority, count
  initialization, and visibility against the current backdrop.
- Detect ink or sprite colors that equal a changing backdrop color.
- Check every representative frame for blank pages, actor trails, transient garbage,
  edge wrapping, and updates visibly drawn while display pages are incomplete.
- Measure the main loop against one frame. If gameplay intentionally catches up
  after a missed VBlank, test that game speed remains stable without multiplying
  input or collision side effects.
- Spread large VRAM operations across safe phases or hide complete page construction;
  never accept a correct final page as proof that intermediate frames are clean.

## Gameplay evidence worth adopting

- Arcade games should normally expose a useful early difficulty sample within two
  to five minutes; levels should not require superhuman reaction or exact frame
  synchronization unless explicitly designed that way.
- Give players a measurable reaction window, safe spawn distance, and a difficulty
  ramp. Record deliberate deviations from the original as liberties.
- Test idle, hold-left/right, fire-mash, zigzag, and camping strategies. They should
  lose or score substantially below a human-paced policy.
- For competitive games, measure both sides and colors where applicable. A bot that
  only validates the favored side can hide asymmetric defects.
- Every game needs a reachable ending or an explicit endless-game contract. Story
  chapters and unlock systems require automated reachability checks.

These are authoring defaults, not compiler semantics. A game may deliberately break
them when its documentation and tests make the intent clear.

## Sound and graphics knowledge to preserve

- Background music owns the lowest sound areas; effects use later areas and explicit
  priority. Validate the installed table, not only the source declaration.
- The reusable four-stream music pattern is two Tiny Sound tonal streams plus muted
  tone 3 driving periodic-noise bass or drums. Flynn's Gold is the compact teaching
  example; Hassle Castle and Commando are larger integration evidence.
- Validate sound through real OS7 PSG activity when timing, channel control, or
  command layout matters. Amy's own decoder cannot prove compatibility with itself.
- Keep essential content within columns 2 through 29 and rows 1 through 22 by
  default. Decoration may extend into overscan deliberately.
- Smooth scrolling should be measured. Pre-shifted tiles, hidden page construction,
  and bounded pixel movement are techniques, not proof by themselves.
- Compression selection uses payload plus decoder and runtime cost. For equivalent
  Graphics II images, rendered pixels are the contract, not byte-identical Pattern
  and Color tables.

## Project metadata Amy should gain

A compact project manifest should be able to declare:

- target and cartridge form;
- compiler capabilities and minimum version;
- provenance, author, publication, adaptation class, and liberties;
- important CRT safe area and per-screen text regions;
- runtime state variables and RAM/VRAM/sprite assertions;
- sound-table and music expectations;
- generated assets and their validators;
- bot/model entry points and human pacing profile;
- representative visual checkpoints;
- required, optional, and intentionally skipped checks.

This metadata should feed the CLI, Web Studio, VS Code extension, and delivery tool.
It must not force every one-file example into a large JSON project; defaults and
source annotations should cover simple cases.

## Knowledge lifecycle

Every machine-readable recipe or rule should carry:

1. stable identifier and class;
2. short applicability condition;
3. canonical source excerpt or exact file reference;
4. required Amy capability identifiers;
5. focused test and expected evidence;
6. compiler/toolbox versions last validated;
7. retirement or review condition;
8. replacement rule, if superseded.

The release process should generate the toolbox compiler snapshot, capability file,
and active rules from one validated Amy Studio revision. `doctor` should reject a
toolbox whose active historical workaround contradicts its embedded compiler.

## Highest-value implementation order

1. Add a capability-versioned agent manifest and rule classes.
2. Build `amy-author-check` as a risk router over existing tests, with explicit
   `PASS`, `WARN`, `FAIL`, and `SKIP` results.
3. Add project metadata for provenance, safe areas, runtime assertions, and visual
   checkpoints without requiring it for tiny examples.
4. Standardize runtime assertions and frame-strip capture on the existing
   GearColeco harness.
5. Add human-paced and cheap-strategy bot helpers.
6. Add stale-ROM protection and reproducible delivery evidence.
7. Generate the portable toolbox snapshot and active rules from each validated Amy
   release.
8. Add original-system adapters only as optional porting skills.

This captures the toolbox's strongest lessons while keeping Amy Studio small enough
for humans and agents to understand.
