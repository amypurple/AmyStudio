# Amy Scenes and RAM Overlays

Status: experimental lifecycle implemented and ROM-tested; ownership enforcement remains conservative

Implemented Phase A subset:

- one record-backed overlay group per program;
- all parts share one base and reserve `max(part sizes)` physical RAM;
- qualified `Overlay.Part.Field` access, including nested scalar records and fixed
  scalar array fields;
- one-level record-array fields addressed as `Overlay.Part.Items[Index].Field`;
- distinct `AMY_OVERLAY_*` and `AMY_SCENE_*` aliases;
- physical, logical, permanent, and saved-byte RAM reporting;
- parser/layout/codegen regression across all five optimization profiles.

Implemented safety includes scalar overlay `ref` escape rejection, reserved overlay alias
rejection in inline/resolvable included ASM, per-field active-part debugger metadata,
inactive-watch gating, mainline-only `enter`, NMI-safe transitions, and one compiler-owned
active-scene frame dispatcher. Scene routine call graphs are ownership-checked: a routine
touching one overlay part must be reachable from exactly that scene. Shared helpers may use
permanent RAM but not scene storage. The feature remains experimental while broader
whole-program ownership and debug-poison/sentinel coverage are evaluated.

Fixed scalar arrays and one-level arrays of fixed-size records are implemented and
regression-tested. Overlay parts can therefore contain packed scalar tables such as
`u8 EnemyX[8]`, `u16 Scores[3]`, and actor tables such as `Actor Enemies[4]`.
Double-index paths such as `Enemies[I].Flags[J]` are implemented. Recursive and
multidimensional arrays remain outside Phase A.

This specification separates two features:

1. `overlay` is the RAM-allocation primitive.
2. `scene` is optional lifecycle syntax built on typed state dispatch.

The compiler must implement and validate overlays before accepting scene lifecycle syntax.

## Goals

- Reserve permanent globals once.
- Reserve mutually exclusive scene RAM as `max(scene sizes)`, not their sum.
- Preserve distinct qualified symbols even when addresses are aliases.
- Make inactive watches and breakpoints visibly inactive rather than misleading.
- Keep the existing single `on vblank` hook.
- Fail closed when lifetime, ASM, `ref`, or NMI safety cannot be proven.

For permanent RAM `P` and scene sizes `S1...Sn`:

```text
physical RAM = P + max(S1...Sn)
logical RAM  = P + sum(S1...Sn)
saved RAM    = sum(S1...Sn) - max(S1...Sn)
```

## Phase A: Overlay Primitive

Records remain the single layout engine. Fixed scalar arrays and one-level arrays of
records are layout features reused by overlay codegen:

```amy
record MenuMemory:
  u8 Selection
  u8 Blink
end record

record GameMemory:
  u8 PlayerX
  u8 PlayerY
  u8 EnemiesX[8]
  u8 EnemiesY[8]
  Actor Enemies[4]
end record

overlay SceneRam
  Menu as MenuMemory
  Game as GameMemory
end overlay
```

`SceneRam.Menu` and `SceneRam.Game` share one base. The group reserves the size of
`GameMemory` when it is the larger part. Every access remains qualified.

Generated aliases are unique names with shared values:

```asm
AMY_OVERLAY_SceneRam EQU $7100
AMY_SCENE_Menu_Selection EQU AMY_OVERLAY_SceneRam+0
AMY_SCENE_Game_PlayerX EQU AMY_OVERLAY_SceneRam+0
```

The assembler already permits these aliases. The symbol/debug exporter must retain all
of them and attach scene metadata; address alone is no longer a unique identity.

## Phase B: Scene Lifecycle

Scenes bind an overlay part to existing routines. They do not introduce another VBlank
body:

```amy
scene Menu uses SceneRam.Menu
  on enter MenuEnter
  on frame MenuFrame
end scene

scene Game uses SceneRam.Game
  on enter GameEnter
  on frame GameFrame
end scene
```

The compiler derives the implicit `Scenes` state machine with one-based scene IDs and
one dispatcher. `0` means transitioning or inactive. The existing single `on vblank`
hook calls only the active frame handler.

Scene IDs are build-internal positional values. Amy source and ROM tests must use
`Scenes.Menu`, `Scenes.Game`, and other symbolic constants, never raw numeric scene IDs.

`enter Game` is legal only from mainline. NMI-reachable code writes a permanent
`RequestedScene` variable; the main loop observes it and performs the named transition.
Direct transitions from NMI are rejected in v1.

## Transition Contract

1. Disable VDP NMI and acknowledge a pending VDP interrupt.
2. Set the active scene to `0`, making the overlay interpretation invalid.
3. Optionally poison the overlay in debug builds.
4. Call the target scene's enter routine, which initializes every value before reading it.
5. Set the active scene to the target ID only after initialization succeeds.
6. Restore the intended display/NMI state.

The transition helper must preserve the existing R1 shadow and `NO_NMI` conventions. It
must not blindly issue `screen on` when the caller intentionally keeps the display off.
Because `on enter` runs while VDP NMI is disabled, neither it nor anything reachable
from it may execute a VBlank-dependent wait, timer wait, input pause, or CRT-safe pause.
The call-graph check rejects such a path at compile time; enabling NMI during enter is
not an acceptable workaround.

## Required Compile Errors

- duplicate overlay, part, scene, field, or binding names;
- unsupported or unsized part type;
- unqualified or cross-scene access outside the owning scene routines;
- address or `ref` escape from overlay storage (scalar `ref` arguments are rejected);
- overlay addresses stored in ROM word/address tables;
- overlay `ref` arguments reaching a routine not proven scene-local;
- scene transition from NMI in v1;
- VBlank-blocking operations reachable from a scene enter routine;
- NMI-reachable access to a part other than the active scene's frame handler;
- opaque ASM that may access overlay aliases or transfer into scene routines;
- user ASM references or symbols using reserved `AMY_SCENE_` or `AMY_OVERLAY_` prefixes;
- scene enter routine that is also bound to an incompatible scene;
- unsupported multiple-overlay interaction in v1.

All v1 accesses are qualified (`SceneRam.Game.PlayerX`). Short field names and
scene-local shadowing are postponed until scoped debugging has proven reliable.

## Static ABI Interaction

Routine parameters and static locals are not automatically scene RAM. In v1, any static
ABI cell used by more than one scene stays permanent. Moving proven scene-private cells
into the overlay is a later optimization requiring call-graph ownership, SCC,
NMI-reachability, and ASM-edge analysis. Correctness must not depend on that optimization.
Every static parameter/local cell, including cells belonging to scene enter/frame
routines, is included in the Permanent RAM line until that later optimization exists.

## Debugger Contract

The compiler now emits structured metadata for every overlay field: qualified Amy name,
assembler alias, address, offset, type, and width, with array and BCD details where
applicable. ROM TEST & DEBUG preserves every alias at a shared address and labels it as
overlay storage. Phase A has no active-scene binding, so fully qualified names may be
used for navigation but the UI reports `active part unknown`; it never chooses an alias
heuristically.

The assembler-side debug exporter must explicitly walk `constantTable`, not only label
symbols, and prove that every `EQU` alias survives. The debug sidecar identifies variables
by `(qualified name, address, activeWhen)`, for
example:

```json
{
  "name": "SceneRam.Game.PlayerX",
  "address": 28928,
  "activeWhen": { "symbol": "AMY_ACTIVE_SCENE", "equals": 2 }
}
```

The memory map may group aliases at one address. Watches and conditional breakpoints on
inactive scene variables show `inactive`, never the live value under another name. Source
breakpoints remain address-based and are unaffected.

## RAM Report

The Studio report must distinguish:

```text
Permanent RAM                 180 bytes
SceneRam.Menu                  24 bytes logical
SceneRam.Game                 320 bytes logical
SceneRam.Ending                64 bytes logical
SceneRam reserved             320 bytes physical
Overlay saving                 88 bytes
Total physical RAM            500 bytes
```

Overflow is checked against physical RAM. Logical totals are informational.

## Implementation Gates

1. Parser/layout tests without code generation.
2. Assembler alias and symbol-export tests: two names at one address must both survive
   `constantTable` export with distinct `activeWhen` metadata.
3. RAM estimator tests with unequal, equal, nested-record, and array layouts.
4. Access/lifetime rejection tests, including `ref`, ASM, recursion, and NMI paths.
5. Debug-sidecar and conditional-breakpoint active-scene tests.
6. Transition ROM self-test with boundary sentinels and explicit expected values after
   every enter routine. The lower permanent-RAM sentinel and upper active-scene selector
   are implemented; optional debug poison remains future work.
7. Off/Safe/Balanced/Aggressive/Experimental ROM parity and optimizer-label audit.
8. Full public example compilation before enabling syntax by default.

The feature is not complete until the debugger gate passes. Correct aliases with an
address-only debugger would be unsafe.

## Implementation Order

0. Add fixed array fields to records and validate packed layout/access independently.
1. Parse/layout overlays and report `max(sizeof)` physical RAM.
2. Reject lifetime/address/ref/ASM/table escapes; retain qualified-only access.
3. Export aliases plus active-scene metadata and gate watches/breakpoints.
4. Add scene lifecycle, enter-call-graph wait rejection, and deferred NMI transitions.
5. Run optimizer parity, ROM sentinels, and the full example audit.
