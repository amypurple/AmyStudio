# Decision Ledger

## 2026-11-08 - Claude toolbox lessons are contracts plus risk-selected QA

The Claude toolbox is not only a set of coding recipes. Its durable value includes
runtime/visual evidence, human-paced and cheap-strategy bots, independent rules
models, generated-content validation, stale-artifact protection, reproducible
delivery, and explicit agent ownership. Amy Studio will classify imported rules as
hardware, compiler, runtime evidence, publication, recommended UX, project
preference, or historical workaround. Workarounds require capability tests and a
retirement condition. Routine changes use capability-selected exemplars; the full
corpus remains a promotion gate rather than the default test. Evidence and adoption
order: `docs/agent-kit/claude-toolbox-lessons-2026-11-08.md`.

Implemented first stage in `tools/amy-author-check.mjs`: project capability
detection, risk-profile selection, static project checks, JSON reports, and opt-in
`--execute` adapters. Runtime/ABI uses the bounded quick gate; only an explicit
promotion profile selects corpus compilation. Missing BIOS/generated ASM and
sandbox-blocked child processes remain visible `SKIP` results.

Afterglow Garden is the first pilot for the repository-native authoring toolbox. Its
sidecar declares target, optimization, provenance, and runtime bot. The separated
pipeline produced a 5,150-byte Balanced ROM, validated editor metadata, then passed
the real GearColeco runtime route through title, OS7 music, VRAM/sprites, both echo
recordings, replay, and victory. The runtime test now accepts prebuilt `--rom/--asm`
inputs so compilation proof and execution proof remain independent.

The executable Claude-equivalence audit currently reports 6 READY, 4 PARTIAL, and
4 MISSING areas. Amy now has a repository-native doctor (Node, manifest, compiler
fingerprint, BIOS, GearColeco, author tools), project build/identity proof, sound
validation, bots, and target-aware size checks. Remaining priority gaps are
essential-content CRT annotations, generic checkpoints/frame strips, dynamic edge
and text-area oracles, and a source-complete delivery gate. Matrix:
`docs/agent-kit/tool-equivalence.json`.

The completed first author-toolbox pass now reports 13 READY, 1 PARTIAL, and 0
MISSING Claude-equivalent areas. Added materialized stale-safe builds, literal
essential CRT checks, generic GearColeco visual checkpoints/PNGs, dynamic edge and
transient-pixel measurements, opt-in text regions, compiler fingerprints, and a
delivery gate that includes complete declared `@project` source, ROM, evidence,
hashes, and explicit human visual approval. V10 remains deliberately PARTIAL until
page-wipe and sustained-flicker heuristics are validated on more game families.

This is a compact index of durable conclusions. Detailed evidence remains in the linked documents.
Add an entry only when it prevents repeated investigation or changes the recommended direction.

## 2026-11-03: Claude open-repro batch uses reachability-scoped ASM pessimism

- ROM-to-VRAM and VRAM-to-RAM transfers now stage runtime `u16` counts before computing
  source/destination addresses, preventing `HL` address clobbering.
- `inc`/`dec` use the general target parser, so nested indexes match assignment behavior.
- `lowbyte`/`highbyte` are typed byte operands inside widened expressions; `get char` is
  accepted as a direct byte return and as the sole argument of a byte routine.
- Unknown `put char` names report the unresolved identifier instead of a generic byte-size error.
- Opaque ASM pessimism is propagated through the Amy call graph from the routine containing
  `call asm`; it no longer disables static aliases and the private ABI in unrelated routines.
- Evidence: `tools/test-claude-open-regressions.mjs` plus the existing get-char, record-alias,
  static-ABI, and reported-expression runtime suites across all five optimization profiles.

## Optimizer

- **Do not chase stale constant-reuse stories.** The remaining-opportunities audit explicitly says
  to stop revisiting them. See `docs/audits/optimization/mdl-remaining-opportunities-by-level-2026-06-02.md`.
- **`AMY_U16_TO_ASCII5_COUNT_SUB` call-site reuse is a dead end.** The helper preserves BC, but its
  audited call sites do not yield a useful safe reuse. See
  `docs/archive/2026-06-investigations/findings-callee-clobber-count-sub-2026-06-02.md`.
- **FP5 shift/clear helper value reuse is a dead end for the audited sites.** Preserved C did not
  create a profitable reuse opportunity. See
  `docs/archive/2026-06-investigations/findings-callee-clobber-fp5-shift-2026-06-02.md`.
- **Do not compact VDP R1 writes across control flow without static proof.** Pure, known-no-op R1
  writes can be candidates; cross-flow compaction remains unsafe. See
  `docs/archive/2026-06-investigations/vdp-r1-compaction-findings-2026-06-03.md`.
- **MDL/copt findings are candidates, not correctness evidence.** A smaller externally rewritten
  listing must still pass Amy source maps, assembly, runtime, visual/audio, and profile gates.
- **Codegen before peepholes.** When one emitter repeatedly creates the residue, fix that emitter;
  reserve peepholes for safe opportunities spanning emitters.
- **State-update's published 782-byte gap is not all compiler overhead.** Pure ASM omits 473 bytes
  of Amy presentation. The current Alexis engine is 678 bytes after verified record traversal,
  structured timer, compare-flag reuse, and direct IX initialization, leaving a 170-byte engine gap. See
  `docs/audits/optimization/state-update-gap-2026-10-10.md`.
- **C source idioms are hypotheses, not automatic wins.** Unsigned zero tests and liveness-proven
  indexed INC/DEC generalized successfully. Grouped sums did nothing, induction variables grew the
  ROM, and the shorter C collision expression disagrees at byte-overflow boundaries. See
  `docs/audits/optimization/state-update-c-ideas-2026-10-10.md`.
- **IX record iteration is Experimental-only.** It is enabled only for proven-safe, frameless,
  call-free `for each` routines. Calls, ASM, local frames, nested aliases, and other unsafe cases
  retain the RAM-pointer lowering. The complete split full audit passed 238/238 examples and 237
  ROMs; the six published Amy samples fell from 7,749 to 7,605 bytes with no sample growth.
- **Optimizer memory operands are not automatically symbols.** Experimental once rewrote
  `ld a,(hl) / dec a / ld (hl),a` as the invalid `ld hl,hl / dec (hl)` because its compact
  self-update rule treated the indirect register name as a variable label. Direct `(HL)` now
  folds to `inc/dec (hl)` without an address load, symbolic memory retains `ld hl,symbol`, and a
  defensive identity-load rule rejects 16-bit self-loads before encoding. Covered by
  `tools/test-optimizer-experimental-hl-self-load.mjs` and the full Experimental corpus audit.

## Repository workflow

- **Alexis-Z80 is experimental; AmyStudio is clean/published.** Stabilize and verify here, then port
  selectively and retest in the clean repository.
- **Never use full dirty-tree output as context.** This repository contains extensive historical,
  generated, and unrelated work. Scope Git and searches to the active subsystem.
- **Historical docs are retained.** Consolidation means adding short indexes and verdicts, not
  deleting research that may contain hardware evidence.

## Language and platform

- **New syntax stays modern and concise.** Prefer expression/assignment forms over English-like
  `... into ...` forms; aliases are temporary migration tools, not permanent language growth.
- **Combined joypad state is clearest and now smaller as a direct OR assignment.** Joypad properties
  are normalized to `0` or `1`, so `Up = joypad(1).up | joypad(2).up` is complete and clears stale
  state automatically. Static same-property OR expressions now merge both raw controller bytes,
  mask once, and normalize once. Three assignments occupy 454 bytes in Balanced versus 477 for
  equivalent clearing plus six `if` statements. Never compare against the smaller but incorrect
  latching form that omits zeroing.
- **Static-ABI byte arguments must use the compile-time constant resolver.** Named `const` and
  `enum` arguments otherwise lower into `HL` while the static parameter store consumes `A`.
  `tools/test-static-frameless-abi-codegen.mjs` covers both named forms across the ABI emitter.
- **OS7 compatibility includes execution, not only size.** BIOS/library mapping changes must preserve
  existing cartridge behavior, memory layout, and linked routines.
- **The OS7 VRAM count wrapper is intentional.** Raw `WRITE_VRAM` and `READ_VRAM` lose 256 bytes
  when both B and C are nonzero. Amy bypasses the wrapper only for proven byte-sized counts and
  increments B when C is nonzero for general counts. `tools/test-os7-write-vram-count-runtime.mjs`
  reproduces the BIOS defect and proves the corrected 257-byte read/write paths.
- **Sprite Y=192 is not a list terminator.** Amy uploads it as an ordinary SAT entry and writes the
  hardware `$D0` terminator only after the configured sprite count. A later sprite remains visible
  with normal and flicker upload paths; this is covered by `tools/test-sprite-flicker-codegen.mjs`.
- **EOS, OS7, and hybrid targets are distinct contexts.** Do not assume an EOS routine, RAM symbol,
  interrupt model, or device mapping is valid in an OS7-only cartridge.

## Toolchain bridges

- **Dynamic 16-bit multiplication must have bounded runtime.** Direct expressions and compound
  `*=` now use a fixed 16-step shift/add sequence. Do not restore a multiplier-counted addition
  loop: negative two's-complement operands turn it into nearly 65,536 iterations. The low word is
  valid for both signed and unsigned operands. The same investigation raised variable-indexed ROM
  word tables from 128 to the full 256 byte-indexed entries without growing smaller-table access.
  See `docs/audits/optimization/bounded-dynamic-word-multiply-2026-10-27.md`.

- **SDCC-inspired optimization must survive Amy's ASM optimizer.** Direct immediate subtraction for
  constant descending byte `FOR` steps saves 72 corpus bytes under OFF/Safe and still saves 54 under
  Balanced/Aggressive/Experimental across 14 programs, with no size regression. The five-profile
  ROM test and full Aggressive oracle audit pass. This validates small deterministic cost-based
  emitter choices, not SDCC-style combinatorial allocation. See
  `docs/audits/optimization/constant-down-step-codegen-2026-10-24.md`.

- **Broad loop hoisting and repeated-block extraction remain rejected.** A scan of 302 audited
  post-optimizer listings found 52 syntactic loop-load candidates and 46,895 overlapping repeated
  blocks, but no new general rule with complete register, flag, alias, call, control-flow, and
  final-ROM-size proof. Continue with bounded emitter choices instead. See
  `docs/audits/optimization/sdcc-inspired-loop-and-block-scan-2026-10-26.md`.

- **Combine static joypad booleans before normalization.** An OR of the same property from joypads
  1 and 2 now merges raw controller bytes, masks once, and normalizes once. Three modern assignments
  occupy 454 bytes under Balanced versus 477 bytes for equivalent clearing plus six `if` statements.
  Five-profile runtime tests and the 299-example Balanced corpus pass. Applying SDCC's four copt
  peephole files to 12 representative current Amy listings changed no executable code, so future
  SDCC-inspired work should continue at the emitter rather than copying those text rules. See
  `docs/audits/optimization/sdcc-inspired-focused-off-2026-10-25.md`.

- **Prefer one-address emitter lowering for indexed byte masks.** For primitive byte arrays with a
  resolved immediate RHS, `&=`, `|=` and `^=` now keep the computed element address in `HL` through
  the read/modify/write sequence. Do not generalize this to dynamic RHS values or cross-statement
  address reuse without register, alias and call-effect proof. See
  `docs/audits/optimization/indexed-byte-bitwise-immediate-codegen-2026-10-25.md`.

- **Use bounded multiply chains for common integer constants.** Scalar `u8/i8/u16/i16` compound
  multiplication by 3, 5, 6, 10, 12 or 14 is smaller and faster as deterministic Z80 shifts and
  additions than as a counted addition loop. Preserve the generic path for runtime factors,
  fixed-point, arrays, records and unmeasured constants. See
  `docs/audits/optimization/compound-constant-multiply-chains-2026-10-25.md`.

- **Generalize multiply chains only under an encoded-size bound.** Scalar integer `*=` constants
  and 16-bit constant expressions may use a deterministic high-bit-first shift/add chain when it is
  strictly smaller than the generic loop. Equal-or-larger chains, dynamic factors, fixed-point,
  arrays and records keep their prior paths. This saves another 149 bytes in the compound corpus,
  126 bytes in Amy Chess and 12 in Bunny Hop without affecting the six comparison results. See
  `docs/audits/optimization/constant-multiply-binary-chains-2026-10-25.md`.

- **Exploit near-power factors only with a strictly smaller deterministic sequence.** Byte factors
  one below a power of two may use shift/subtract; 16-bit factors 256 and 257 have direct modulo-word
  identities. The five-profile arithmetic and Amy Chess kernel tests prove exact results, while the
  full audit shows no ROM growth. See
  `docs/audits/optimization/near-power-constant-multiply-codegen-2026-10-26.md`.

- **Lower power-of-two division only when shifts are both exact and smaller.** Unsigned byte
  compound/expression division accepts powers through 128; unsigned 16-bit accepts `/2`, whose
  four shift bytes beat the eight-byte runtime-call setup. Signed arithmetic shifts alone are
  incorrect because they round negative values downward. A correct bias-plus-shift prototype grew
  Time Warp by 104 bytes and is therefore rejected from Balanced code generation. See
  `docs/audits/optimization/power-of-two-division-codegen-2026-10-25.md`.
- **Signed byte division must truncate toward zero.** Dynamic `i8` division now widens through the
  proven signed 16-bit helper instead of using unsigned repeated subtraction. Constant `/2`, `/4`
  and `/8` use a negative bias followed by arithmetic shifts; wider divisors retain the helper.
  Optimizer rewrites that introduce `HL` must stop at calls and control-flow exits unless liveness
  is explicitly proven. See
  `docs/audits/optimization/signed-byte-division-and-hl-liveness-2026-10-26.md`.

- **Reuse a byte condition load only inside one proven OR.** Equality tests of the form
  `Value = C1 or Value = C2` may load `Value` once when both constants fit a byte and the operand is
  exactly identical. This saves 46 corpus bytes. A broader range rule was removed after Amy Chess
  showed no final ROM change; cross-statement and across-call caching remain rejected. See
  `docs/audits/optimization/shared-byte-or-condition-load-2026-10-25.md`.

- **Omit unsigned descending-loop checks against a resolved zero bound.** A `u8` or `u16` counter
  cannot be below zero, and the existing update exits on borrow. Both `downto 0` and `to 0 step -1`
  now omit the impossible per-iteration comparison, while signed, dynamic, and nonzero bounds keep
  the conservative path. Five Dacman variants save 48 bytes beyond constant-step lowering, with
  five-profile runtime and full optimizer-oracle proof. See
  `docs/audits/optimization/unsigned-zero-bound-loop-2026-10-25.md`.

- **Update byte record fields in place for `+= 1` / `-= 1`.** Static, dynamic/nested, and proven
  IX-alias fields now compute their address once and emit direct memory `INC/DEC`. Fourteen programs
  save 481 bytes under Balanced with no growth; Gameplay State Update saves 14 bytes. General
  cross-statement HL reuse remains rejected because no current corpus site survives alias, call,
  control-flow, stack, and clobber barriers. See
  `docs/audits/optimization/record-byte-incdec-codegen-2026-10-25.md`.

- **Keep larger guarded inlining Experimental-only.** Raising the encoded routine-body budget from
  8 to 16 bytes saves 332 bytes; raising it from 16 to 24 saves another 107 bytes across 20 ROMs and
  admits 27 additional routines, with no growth and 297/297 post-optimizer oracles passing. Calls,
  branches, labels, stack, I/O, data
  references, and unsafe instructions remain barriers. Safe, Balanced, and Aggressive retain the
  8-byte default. See `docs/audits/optimization/experimental-inline-budget-2026-10-25.md`.

- **Do not generalize shared equality loads or primitive iterator scope without new corpus evidence.**
  Flattening homogeneous three-way `X = A OR X = B OR X = C` chains passes five-profile runtime
  tests but leaves the 299-example Balanced total unchanged at 1,762,788 bytes. Restricting primitive
  iterator barriers to the loop body also passes all five profiles and improves its synthetic fixture
  from 215 to 200 bytes, but changes no current corpus ROM and no production Amy Chess path. Both
  prototypes were removed. Reconsider only when an active program produces a measured reduction.

- **Reuse indexed byte destinations only within one dynamic compound assignment.** Record fields
  and primitive byte arrays updated with a runtime byte through `+=` or `-=` may preserve that byte,
  calculate the destination once in `HL`, and complete the read/modify/write in place. This saves
  332 Balanced corpus bytes across 14 ROMs. Calls, wider values, unsupported expressions, other
  operators, and cross-statement reuse keep their conservative paths. See
  `docs/audits/optimization/indexed-byte-dynamic-compound-codegen-2026-10-26.md`.

- **Apply the same bounded proof to dynamic byte masks.** Primitive byte-array `&=`, `|=` and `^=`
  with a proven runtime byte operand may preserve that operand and calculate the indexed destination
  once. Five sites save 45 bytes in `Worm of Bemer`; records, wider values, unproven expressions,
  and cross-statement reuse remain excluded. See
  `docs/audits/optimization/indexed-byte-dynamic-bitwise-codegen-2026-10-26.md`.

- **SDCC `--max-allocs-per-node` is non-monotonic and requires runtime proof.** On the shared state
  fixture, `3000` nodes miscompiles both SDCC 4.5 and 4.6 through an invalid `IY` reuse, while
  `500000` is smallest and correct. Simpler devkitSMS fixtures are four bytes smaller at `100000`
  than at `500000`. Search a bounded per-program budget set and validate each selected ROM; never
  assume a larger value is better. See
  `docs/audits/optimization/sdcc-node-budget-audit-2026-10-24.md`.
- **The SDCC 3000-node failure has a source-level candidate fix.** A local build of exact snapshot
  `4.6.4 #17075` reproduces the defect. Restricting `IYinst_ok()` so `+` and simple assignment may
  not borrow IY for a global operand while another live allocation occupies IY restores the exact
  runtime oracle at 3000 nodes. It remains experimental pending an upstream-quality regression
  test and broader SDCC validation; do not silently ship the patched compiler.
- **CVBasic refinement starts with byte-exact specialization, not dead-code deletion.** The separate
  `tools/cvbasic-asm-refiner` project resolves CVBasic/GASM80 platform conditionals and inventories
  symbols/control flow. Its first real smoke test removes 4,154 conditional/directive lines from
  CVBasic Hello World while producing the exact same 8,192-byte ROM. Indirect data references,
  interrupts, banks, and self-modifying code make call-graph-only deletion unsafe; Amy optimization
  remains disabled until the ColecoVision corpus and runtime barriers are classified.
## 2026-10-25: Retain validated ugBASIC revision after upstream refresh

- CVBasic `fd70d3d` reproduces all six CVBasic 0.9.2 ROMs byte for byte; devkitSMS head remains
  `533ae572`.
- ugBASIC `79612f9` and `5bbd963` reduce apparent occupied size but fail the 16x16 metasprite
  runtime oracle after sprite-stride change `1068bfe`.
- Keep ugBASIC `e35e6df` in the ranked comparison and expose the newer measurements only as rejected
  audit evidence. See `docs/audits/optimization/external-toolchain-refresh-2026-10-25.md`.
- Superseded on 2026-10-29 by validated `afd97a3`; see the later decision below.

## 2026-10-26: Port the real Mega Tiles compositor, do not approximate it

- The recovered `day3/gridtest.s` is the published 16x16 map/window demonstration, not the complete
  GhostBlaster background-overlay implementation. A replacement renderer that merely treats zero
  map cells as transparent is rejected, even if its framebuffer appears plausible.
- Runtime tracing of GhostBlaster Rev. A identifies `$8BF0` as the 10-by-16 VRAM map fetch and
  `$862F` as the actual compositor. The compositor selects background streams at `$D285` or
  `$D7A5` from camera parity, copies four position-dependent background characters only when the
  map byte is zero, and otherwise expands the map byte into four consecutive foreground
  characters. `$86FD` then streams the resulting window to the name table. The two 1,312-byte
  background streams and the map are coupled; repeating one extracted 16x16 texture is not an
  equivalent implementation.
- Evidence scripts are `experiments/legacy-giant-dynamic-map-2013/capture-ghostblaster-route.mjs`
  and `trace-ghostblaster-renderer.mjs`; generated traces stay under `build/ghostblaster-analysis`.

## 2026-10-26: Dukes can use a one-controller Dantructor-style adapter

- The commercial ROM polls through OS7 and centralizes wheel accumulation at `$9CB4-$9D03`.
  Its second accumulated result at `$71D2` has no reader, leaving ample room for an in-place
  standard-controller translation without relocating commercial code.
- The 99-byte laboratory replacement occupies the original `$9CB4-$9D03` accumulator plus the
  unreferenced `$9D04-$9D16` helper. It corrects steering and converts fresh P1 UP/DOWN presses to
  native P2 H-shifter movements submitted to `$A8B7`; the original game therefore owns gear
  changes, neutral-gate traversal, lever graphics and sound. FIRE 1 remains the native accelerator;
  releasing it supplies native deceleration, and FIRE 2 is unused. `$71D2` provides held-direction
  debounce. Removing FIRE 2 reduces the adapter from 98 to 87 bytes and saves 39 T-states on its
  common no-button path.
- The controller table is narrowed from P1/P2=`$9F` to P1=`$9B`, P2=`$00`. This retains the P1
  menu keypad and every adapted gameplay input while skipping all P2 and spinner work.
  `tools/benchmark-dukes-poller-mask.mjs` measures 2,660.34 versus 1,515.34 cycles per `$9C91`
  call across 32 real calls, a 1,145-cycle saving. The spinner IRQ wrapper itself remains intact.
- The modified OS7 title header says `AMY STUDIO PRESENTS / DUKES OF HAZZARD (TM) SCE / 2026`, making
  the adaptation visible before gameplay with no runtime rendering cost.
- `tools/test-dukes-standard-controller-patch.mjs` reaches the real driving-loop call site and
  proves steering, gas, brake, both complete real-direction gear cycles, all native lever positions,
  wraparound and debounce. See `docs/research/dukes-standard-controller-adapter.asm`.
- A profile-led renderer pass replaces 21 instruction bytes with address-preserving padding without
  relocating the commercial ROM and accelerates its exercised rendering paths.
  `tools/test-dukes-renderer-routines.mjs` replays 152 real invocations from identical entry states
  and proves equivalent caller-visible CPU state, branch decisions, RAM, and VRAM while measuring
  2,398 fewer cycles. That measured delta includes the four-T-state
  cost of every executed address-preserving `NOP`; padding bytes are not counted as zero-cycle work.
  The 1,800-frame smoke test remains animated and
  stack-safe; frame-perfect comparison is intentionally not required after cycle timing changes
  cause the game trajectory to phase-shift.
- A fixed `$D560` multiply-by-six chain and direct `$1FF1` sound calls were both rejected by runtime
  evidence: the first regressed the common zero-index path, while the second changed sound-area RAM.

## 2026-10-27: responsive hamburger menus need explicit inward anchoring

- The generic sub-1100-pixel dropdown rule moved the right-edge hamburger panel outside a
  390-pixel viewport; its position also varied when persistent project tabs changed wrapping.
- The hamburger now stays at the right edge, opens inward and owns bounded `pan-y` scrolling.
  `test-new-project-mobile.mjs` opens every section and proves both-axis containment before testing
  project creation. See `docs/audits/studio-interface-audit-2026-10-27.md`.

## 2026-10-27: infer temporal 120-color state before allocating RAM

- Either `120 colors on` or `120 colors off` requires the complete 120C NMI runtime and its two
  state bytes. Infer that requirement from Amy source before allocating controller and user RAM;
  post-transpile symbol discovery is too late and can overlap `$7023-$7028`.
- ZX0-to-VRAM literal runs may cross a partial first page followed by 256-byte pages. Keep the page
  count in `A`, because `C` becomes the VDP data port and `B` is consumed by `OUTI`. The resulting
  loop is both correct and three bytes smaller than the former push/pop loop. Runtime tests prove a
  257-byte literal, both Picture Show transitions, exact VRAM restoration, and all five 120C profiles.

## 2026-10-27: bound loops and random generation; quarantine unsafe dead-code removal

- Unsigned `FOR` loops now exit on byte/word overflow, including maximum bounds and steps that cross
  the type maximum. Signed `clamp` uses signed comparisons for both `i8` and `i16`.
- `random(N)` no longer uses an unbounded rejection loop. Byte ranges use fixed-cost multiply-high
  scaling; constant word ranges use two random bytes plus the proven 16-bit remainder helper.
- DAN3 optimal cleanup must force forward progress when an unreachable cell has length zero; corpus
  roundtrips cover incompressible 257-511-byte inputs.
- Experimental dead-code elimination is disabled. Differential testing proved it alone emptied The
  Hermit's first noun menu; with that pass disabled, the joystick bot wins in 156 moves and scores 200.
- Evidence: `tools/test-reported-language-regressions.mjs`, full 348-example Balanced/Aggressive
  assembly, and the Starlight, Firefly Jar and The Hermit completion bots.

## 2026-10-28: z88dk ZX0 2.2 matches Amy's existing v2 stream

- z88dk commit `991555f9` replaces its bundled ZX0 v1.5 host tool and classic decoders with ZX0
  v2.2. The v2 format changes offset coding; `-c` deliberately retains the v1 stream format.
- On the Warrior Graphics II tables, v1.5, v2.2 classic, v2.2 and Amy all produce the same payload
  sizes (2,458 Pattern bytes and 391 Color bytes). The v2.2 classic streams are byte-identical to
  v1.5, while Amy's current streams are byte-identical to normal v2.2.
- The upstream generic RAM decoder falls from 69 to 68 bytes and is slightly faster. Do not assign
  that one-byte gain to Amy or the comparison's Coleco direct-to-VRAM decoder without a separate
  VRAM adaptation and cycle/runtime proof.
- The measured z88dk ranking remains on nightly `33d4c333ea` until a complete newer Windows nightly
  rebuild is available. Source changes since that revision do not touch zsdcc or Coleco startup;
  relevant changes are the host ZX0 tool, decoder library and zcc front end.
- A clean six-sample rebuild with current zsdcc 4.6 and the published flags reproduces the ranked
  binaries exactly: 1,980 / 4,976 / 2,272 / 2,492 / 2,712 / 2,729 occupied bytes. Five outputs are
  byte-identical to their published artifacts; Controller Visual is byte-identical to the retained
  October 20 nightly artifact. State Update still returns checksum 1,478, and GearColeco plus the
  metasprite oracle pass.
- Current z88dk HEAD `a11376a6f` is not a replacement baseline: its source checkout has a stale
  sccz80 expected-output test and its first Coleco link can trigger a z80asm string-table assertion
  unless the CRLF-built assembler and libraries are reconstructed from normalized sources.

## 2026-10-28: Gazette-port friction audit starts with variable backdrop

- Amy already provides tile-coordinate `put char T at X,Y`, `V = get char at X,Y`, and lexical
  routine locals. The repeated `OrPoke`/`OrPeek` helpers in the Gazette ports additionally translate
  a VIC-style linear playfield offset with a custom width and origin; do not add a second ambiguous
  tile API until that coordinate transform has a concise, general source model.
- `backdrop` had a genuine isolated gap: it accepted only names and compile-time colors. It now
  accepts byte expressions, masks runtime values to `0..15`, and preserves the constant path byte
  for byte. Runtime coverage passes under all five optimizer profiles.
- ROM byte-table elements now zero-extend when assigned to `u16` or `i16`, matching the already
  supported RAM `u8[]` behavior. The existing byte-table loader remains the single address/index
  implementation, including its proven 16-bit-index path.
- Evidence: `tools/test-text-color-codegen.mjs`, `tools/test-inline-simple-statements.mjs`, and
  `tools/test-crt-safe-pause-backdrop.mjs`; `tools/test-int16-byte-widening-codegen.mjs` executes
  the widening result under all five optimizer profiles.
## 2026-10-28 - Inline ASM mnemonics and resumed top-level regions

- Inline ASM symbol rewriting must preserve the opcode/directive token and comments while still
  resolving Amy variables and labels used as operands. This prevents a source label such as `out`
  from rewriting the Z80 `out` mnemonic.
- BASIC-style and multi-file sources may resume top-level code after a `sub` or `function`. The
  compiler now resumes the existing `Start` region without repeating startup initialization or
  emitting a duplicate `Start` label.
- Evidence: `tools/test-inline-asm-symbol-codegen.mjs` passes all five optimization profiles,
  `tools/test-sub-declaration-forms-codegen.mjs` covers the resumed region, and the Balanced corpus
  remains 357/357 with 2,604,121 occupied bytes.

## 2026-10-28 - Tiny Sound one-shot playback is opt-in

- `play song Name once` uses byte 6 of each 16-byte Tiny Sound slot as a one-shot flag. At `$FF`,
  the callback writes the BIOS sound-area stop marker instead of rewinding that channel. A later
  ordinary `play song` clears both flags and restores looping.
- Sources without `once` retain the original Tiny Sound runtime exactly; the mode setters and
  terminator branch are rendered only when the new syntax is present. The measured Balanced opt-in
  cost is 30 bytes. `tools/test-tiny-sound-once.mjs` executes a proven two-channel song under all
  five optimization profiles and checks both stop and legacy-loop behavior.

## 2026-10-28 - Recent regressions and the CVBasic Refiner are first-class QA gates

- Recent compiler/runtime regressions must not remain as isolated scripts. The feature matrix now
  runs the reported-language ROM suite, 120-color RAM/dependency safety, ZX0 long literal VRAM
  restoration, 16-bit ROM byte-table indexing, inline-ASM symbol boundaries, Tiny Sound one-shot
  playback, and the complete CVBasic ASM Refiner suite.
- Claude's independent language harness passes 138 cases with zero unexpected failures against the
  current compiler. Its eight `KNOWN` cases are three explicit language/diagnostic gaps represented
  by multiple tests: word-form `and`/`or`, signed `width`, and random generation while NMI is off.
- `chars in box` and `get frame` already have real-OS7 GearColeco runtime coverage in Amy's own
  suite; the toolbox limitation came from its stand-in BIOS, not from missing Amy validation.
- The Refiner passes 75 focused tests plus a byte-identical real-CVBasic smoke build. Proven gains
  are 402 occupied bytes on the interactive Face fixture and 1,873 bytes across the six comparison
  programs from closed-group CVBasic runtime pruning. General OS7 substitution remains fail-closed:
  only complete recognized program families or fully proven transfer/object idioms may replace the
  CVBasic wrapper, with dialect reassembly and runtime-state proof required afterward.

## 2026-10-28 - VS Code uses ordinary Amy files and a versioned compiler snapshot

- The VS Code integration keeps source in ordinary `.alexis` files. `amy.project.json` stores only
  target/build settings and the entry filename; external assets, ASM and data remain separate files
  referenced through the existing `@project/...` mechanism.
- A released VSIX stages the exact compiler module graph and Amy runtime sources into the package.
  This makes each extension release reproducible while `amyStudio.compilerPath` remains available
  for deliberate testing against an experimental checkout.
- CLI/IDE coupling uses the additive `amy-compiler-report-v1` JSON contract. It reports success,
  source diagnostics, optimization, RAM usage, ROM bytes and artifact paths without changing normal
  `amyc.mjs` output or compilation semantics.
- Evidence: `tools/test-amyc-json-report.mjs`, the VS Code project-model test, an isolated bundled
  compiler build of `hello-world-minimal.alexis` at 227 occupied bytes, and the packaged 0.1.0 VSIX.

## 2026-10-28 - The upstream CVBasic example corpus is a viable Refiner input set

- CVBasic 0.9.2 (2026-03-12) accepts all 56 BASIC listings in the bundled repository when each is
  compiled for its declared platform: 29 ColecoVision, 15 SMS, 10 NES and 2 MSX2.
- gasm80 produces binaries for 53 listings. The remaining three are not compiler failures:
  `vgm.bas`, `vgm_ay3.bas` and `test_sqrt.bas` reference absent external files (`alexkidd.vgm`,
  `02 map screen.vgm` and `sqrt.asm`). ColecoVision therefore measures 29/29 compiler successes
  and 26 self-contained binaries.

## 2026-10-29 - ugBASIC afd97a3 restores runtime-equivalent sprites

- Official ugBASIC `afd97a3` reduces the six-sample total from 25,079 to 20,905 occupied bytes and
  restores both the exact 16x16 metasprite pattern table and complete inactive-frame hiding.
- The dedicated GearColeco metasprite oracle accepts ugBASIC's corrected `192,255` offscreen
  coordinate and the earlier `255,255` representation; both complete animation frames pass.
- Promote `afd97a3` to the ranked comparison. The Warrior bitmap remains pixel-exact. Evidence:
  `docs/audits/optimization/ugbasic-refresh-2026-10-29.md`.
- A follow-up source audit replaced the redundant byte comparison `IF k <> 0` with the equivalent
  truth test `IF k` in Controller Visual. The complete controller oracle passes, Controller falls
  from 2,024 to 1,996 bytes, and the six-sample total becomes 20,877 bytes.
- `tools/audit-cvbasic-example-corpus.mjs` preserves per-file ASM/binaries and emits JSON/Markdown
  evidence under `artifacts/cvbasic-example-audit`. This corpus can now be the first broad input for
  Refiner recognition and byte/runtime equivalence work before requesting third-party projects.
- All 26 self-contained ColecoVision listings in the bundled snapshot pass two consecutive Refiner passes, exact textual
  idempotence after GASM80 rendering, real gasm80 reassembly, and complete ROM byte comparison.
  The corpus gate is `npm run test:upstream-corpus`; optimization candidates remain subject to
  separate runtime proof.
- The refreshed upstream archive restores `others/sqrt.asm`. Its 30 ColecoVision listings all
  compile; only the two VGM examples await `alexkidd.vgm` and `02 map screen.vgm`. The 28
  self-contained ColecoVision listings all pass the
  two-pass Refiner and byte-identity gate. Both audit stages assemble from the source directory so
  legitimate source-relative `INCLUDE` modules such as `sqrt.asm` remain available.
- Amy/OS7 profile discovery is composable rather than program-named. The Refiner derives a stable
  runtime signature from reachable features and classifies each component as preserve,
  adapt-at-proven-callsite, or offline-convert. The 28-program upstream corpus yields 21 signatures
  but repeatedly shares text, VRAM and music components, validating component-level synthesis.
  This planner does not authorize rewrites: ABI, liveness, size and runtime proof remain mandatory.
- Closed-group CVBasic runtime pruning is now measured over the complete upstream ColecoVision
  corpus independently from Amy peepholes. Of 28 self-contained programs, one 128K MegaCart is
  correctly delegated and all 27 linear compact candidates pass complete GearColeco
  framebuffer/VRAM/VDP/RAM state at frames 1, 2, 10, 60 and 120, together saving 8,261 occupied
  bytes. Relocated RAM pointers are accepted only when both values identify the same offset inside
  the same named ROM symbol before and after assembly; this proves the music-stream words at
  `$7096-$7099` in `brinquitos.bas` and `music.bas` without masking unrelated RAM. Balanced
  optimization is not promoted by this result.
- Brinquitos is the reference for curated CVBasic-to-Amy audio conversion. Its checked-in Tiny
  Sound profile was tuned through measured 50-to-60 Hz timing, a `+3` pitch calibration, distinct
  channel envelopes, manually preserved low-bass contour, and sound-area priority separation for
  jump SFX. The generic converter remains an approximate fallback and must not overwrite a supplied
  curated profile merely because it can parse the same `MUSIC` rows.

## 2026-10-29 - Single-segment controller decoding is valid with the real OS7 BIOS

- Amy's one-segment controller backend deliberately calls OS7 `DECODER` at `$1F79`; the broader
  controller backend calls `CONT_SCAN` at `$1F76`.
- Claude's stand-in `mkbios.py` writes the complete `CONT_SCAN` implementation directly at `$1F76`,
  so its body overwrites the distinct `$1F79` entry. A single-segment program consequently enters
  the middle of the substitute routine and can report zero input.
- Do not enlarge Amy's controller code to accommodate that substitute BIOS. The real BIOS passes
  all 13 controller configurations across all five optimizer profiles, including `joypad(1)` alone.
  A substitute BIOS must implement separate three-byte vectors or otherwise preserve both entries.
  Evidence: `tools/test-controller-backend-selection-rom.mjs`.

## 2026-10-30 - LDI copy folding requires accumulator liveness proof

- Replacing `ld a,(hl) / ld (de),a / inc hl / inc de` with `ldi / inc bc` preserves the copy,
  pointers and BC, but not the copied byte in A. The fold is now legal only when both A and flags
  are dead before their next use.
- The original `ldi-or.alexis` reproducer now terminates correctly in all five optimization
  profiles. Structural tests retain the fold when A and flags are provably dead and reject it when
  either remains live.
- The 380-example Balanced corpus compiles 380/380. The full Aggressive post-builtin MDL audit
  accepts 370 cases; its four failures are the pre-existing MDL translator limitation on `align
  256` in The Stacks, Sundown Road, Deep Halls and Midnight Manor, not optimizer mismatches.
- The six-sample Balanced sizes remain 227, 3,213, 604, 939, 1,134 and 1,255 bytes: 7,372 total.

## 2026-10-30 - GearColeco remains the primary emulator, with independent TMS9928A oracles

- GearColeco 1.7.0 correctly models the ordinary documented display modes, table masks, transparent
  backdrop behavior, sprite sizes/magnification/early clock, four-sprite limit, fifth-sprite status,
  collision flags, VRAM read-ahead and control-port latch behavior inspected in its source.
- Its VDP is scanline-granular and applies CPU VRAM accesses immediately. Beam-racing and too-fast
  VRAM I/O therefore require independent timing evidence from MAME, ares, openMSX or hardware.
- Palette, border and CRT disagreements are not logical-pixel evidence. Compare 49,152 color indexes
  from identical register/VRAM snapshots before RGB or television effects.
- Audit and common-corpus specification: `docs/audits/tms9918-emulator-comparison-2026-10-30.md`.

## 2026-10-30 - BLAM's missing sprites were an unterminated SAT, not a VDP-core verdict

- BLAM updated two sprite shadow entries but omitted the required `set sprite count 2`, so
  `update sprites` streamed an uninitialized count and left no reliable `$D0` terminator.
- GearColeco happened to show the first two valid entries; blueMSX showed none. Emulator output
  from this invalid SAT must not be used to rank their TMS9918 accuracy.
- The corrected ROM has exactly two sprite entries followed by `$D0`; no runtime semantic change
  or NMI guard is required.

## 2026-10-30 - VDP validation uses structural checks plus an independent renderer

- `GearcolecoTestCore.validateVdpState()` now exposes register/VRAM diagnostics; the Amy source
  audit catches sprite shadow uploads where neither `set sprite count` nor `clear sprites` establishes
  the active prefix.
- The Balanced corpus compiled 380/380 examples. Independent `vrEmuTms9918` rendering of 379
  startup snapshots found 374 exact frames and five timing/raster snapshots, but no stable
  logical-pixel disagreement with GearColeco.
- A static snapshot cannot validate mid-frame effects. Capture one settled frame after VRAM changes,
  or replay timestamped VDP events for 120-color and beam-racing code.

## 2026-10-30 - VS Code 0.1.2 carries the current compiler and sprite-contract diagnostics

- The bundled toolchain was restaged from the current 68-module compiler graph and successfully
  compiled the extension demo with Balanced optimization.
- Live editor and post-build diagnostics now warn when sprite shadow entries reach a full
  `update sprites` without `set sprite count` or `clear sprites`; the original BLAM source is
  reported at line 508 while valid counted and partial uploads remain accepted.
- Packaged artifact: `tools/vscode-amy-studio/dist/amy-studio-0.1.2.vsix`.

## 2026-10-30 - Runtime FOR limits and steps are captured at loop entry

- Amy now follows BASIC semantics for dynamic `FOR` controls: the start, end limit and step are
  evaluated once at loop entry, in that order. Mutating a source variable in the body no longer
  changes the number of iterations.
- Dynamic limits and steps use typed, activation-local IX-frame slots. This preserves signed
  comparisons, nested-loop behavior, recursion and reentrancy without reserving global user RAM.
- Compile-time constants remain on the existing immediate path, so the six-sample Balanced total
  remains 7,372 occupied bytes.
- Evidence: `tools/test-for-runtime-bound-capture.mjs` passes all five profiles; the Balanced and
  Aggressive corpus builds pass 390/390 examples.

## 2026-10-31 - Width, ROM-address, forward word-table, call-clobber and sprite defaults are fixed

- Signed `width` formatting now preserves the sign/positive prefix and replaces magnitude-leading
  zeroes with spaces (`-42 width 5` becomes `  -42`; zero width 4 becomes `   0`). GearColeco VRAM
  checks pass in all five profiles.
- Unsigned pointer assignments accept runtime arithmetic with ROM labels such as
  `Pointer = Offset + @Names`; five-profile assembly tests verify full 16-bit address codegen.
- `and` and `or` remain short-circuit condition words, but numeric assignment context accepts them
  as traditional BASIC bitwise aliases for `&` and `|`. Exact u16 RAM results pass across four
  runtime profiles, and the words can no longer leak into an invalid assembler immediate.
- Word tables declared before use already supported 256 entries, but the forward-declaration scan
  still capped them at 128. Forward 129-entry tables now use the same 256-entry limit and doubled-index
  carry path; larger tables remain a clear compile error.
- The assembler optimizer's immediate temp-reload rule now treats calls and control flow as barriers.
  A user sub ending in `call asm` can no longer cause a required variable reload to disappear from
  the final ROM. Static and GearColeco tests pass under all five profiles.
- Programs that upload sprites without ever establishing a count now initialize
  `AMY_SPRITE_COUNT` to zero. Programs that explicitly set or clear the count retain their previous
  code size, so the six comparison ROMs remain 7,372 bytes total.

## 2026-10-31 - Empty PRINT literals are compile-time no-ops

- `print at X,Y, ""` previously emitted `BC=0` followed by BIOS `WRITE_VRAM`; the BIOS interprets
  zero as a full 65,536-byte transfer, corrupting the complete screen and subsequent VRAM.
- Empty literals now emit no coordinates, ROM data, or transfer call. The same rule covers dense,
  composed-text and inline print paths.
- A five-profile GearColeco test fills all 768 NAME-table cells with tile 42 and proves both direct
  and inline empty prints leave every cell unchanged. Balanced corpus and Aggressive audit pass.

## 2026-10-31 - Inline VoxPCM and variable integer shifts share their normal emitters

- One-line `if` branches now dispatch `play voxpcm` and `play tripcm` through the same statement
  compiler as their standalone forms; no duplicate playback lowering is maintained.
- Byte and word expression shifts accept unsigned byte counts. Runtime counts are bounded to the
  operand width, zero counts preserve the value, and signed right shifts retain sign extension.
- `tools/test-inline-voxpcm-variable-shift.mjs` compiles all five profiles and verifies the shift
  results in GearColeco RAM, including zero and over-width counts.

## 2026-10-31 - Compiler bug-hunt expressions, VRAM bounds and NMI-off pauses are hardened

- A function call in the left operand can no longer destroy a right operand preloaded in `B`;
  call-containing loads take the stack-preserved expression path.
- Byte destinations retain 16-bit arithmetic intermediates before division or right shift, so
  averages and scaled products are narrowed only after the complete calculation.
- Dynamic zero-length `fill` and `copy` operations to VRAM are no-ops; equal random bounds return
  that bound directly; unsigned values compare mathematically against negative literals.
- Constant-position text is clipped at the end of the 768-byte NAME table instead of overwriting
  the sprite attribute table. A plain `pause until press` reached with NMI disabled polls the BIOS
  controller bytes directly and no longer depends on `HALT` or stale Amy controller shadows.
- `tools/test-bug-hunt-20261031.mjs` proves all corrected RAM, VRAM, comparison, random and input
  behavior under all five optimization profiles. The Balanced corpus passes 444/444 examples; five
  measured comparison ROMs and the 7,372-byte published total remain unchanged.

## 2026-10-31 - Integer random draws no longer mix R into every sample

- The stock BIOS LFSR already returns a complete byte. XORing every result with the timing-sensitive
  Z80 refresh register could correlate tight loops and made a seeded sequence depend on NMI timing.
- `AMY_RANDOM_U8` now returns the BIOS byte directly. `R` is used only when diversifying a genuinely
  zero fallback seed, preserving human-timing variation without perturbing every draw.
- `tools/test-random-u8-quality.mjs` proves all five profiles reach the upper byte quarter, cover all
  ten results of `random(10)`, and produce the same known `$66,$CC,...` sequence for an equal seed
  with NMI on or off. The stock `GET_RANDOM` ABI test and bounded-random regressions also pass.

## 2026-10-31 - Small literals retain 16-bit comparison semantics without 32-bit promotion

- Comparisons between `u16`/`i16` values and fitting integer literals now load the literal directly
  into `DE` and use the existing signed or unsigned word branch logic. They no longer pass through
  the scratch-32 promotion path merely because the literal fits in one byte.
- The reported repro falls from 446 to 426 bytes with optimization off. Sixteen boundary and
  reversed-operand assertions pass in GearColeco under all five optimization profiles, and the
  7,372-byte comparison baseline remains unchanged.

## 2026-10-31 - Raw Graphics II and tile-screen color layouts remain distinct

- `tile screen` retains the compact text-oriented Graphics II setup with VDP R3=`$9F` and a shared
  2 KB color table. `mode 2 screen` now uses its own on-demand runtime module with R3=`$FF`, exposing
  the three independent color thirds promised by the language reference.
- GearColeco register tests prove both R3 values under all five optimization profiles. Keeping the
  raw helper in a separate module prevents any ROM-size cost in programs that only use tile screens.

## 2026-11-01 - Single-line IF routes COPY through the normal transfer compiler

- `if Condition then copy ...` previously failed as an unsupported inline statement even though
  the same `copy` was valid as a standalone statement.
- Inline guards now delegate every canonical `copy` form to the existing VRAM/RAM transfer emitter;
  no second copy implementation is maintained. Five-profile GearColeco tests prove both skipped and
  taken VRAM copies while the normal inline and qualified-VRAM regression suites remain unchanged.

## 2026-11-01 - COPY address arithmetic is evaluated at 16-bit width

- Binary and unary offsets in ROM, RAM and VRAM copy addresses are now evaluated as `u16` before
  being added to their base address. Expressions such as `Big + Row * 32` no longer wrap at 255
  merely because `Row` is a byte variable.
- Simple byte offsets keep their compact address path. `tools/test-bugs-39-41-runtime.mjs` proves
  ROM offset 320 and VRAM row 10 behavior, plus the resolved #39 and #40 cases, under all five
  optimization profiles.

## 2026-11-01 - Computed indexes and nested products retain their word context

- Primitive-array indexing now derives the complete index expression type from its AST. A computed
  `u16` index such as `Buffer[Base + Offset]` uses the existing word-address path for reads, writes
  and comparisons instead of being rejected as an unsupported byte index.
- Nested multiplication inherits the enclosing word computation context. Expressions such as
  `Total = Total + Value * Value` no longer infer the product independently as an invalid byte
  multiply, while genuinely byte-sized expressions keep their compact path.
- `tools/test-u16-index-product-expression.mjs` verifies values above 255 and products above 8-bit
  range in GearColeco under all five optimization profiles.

## 2026-11-01 - Routine frames and nested expressions are finalized from complete semantics

- Return epilogues are finalized only after the complete routine has established its IX-frame
  requirements. Early returns before dynamic `FOR` bounds no longer emit a bare `RET`.
- Experimental IX-frame removal now follows local branch labels before deciding that a routine is
  frameless; it must observe every reachable return and indexed parameter access.
- Named constants work inside nested products and shifts, word values narrow consistently for byte
  parameters and returns, mixed `i16`/`u8` expressions compare at the proven width, nested-call
  commas in `vpoke` are preserved, and comparisons may initialize `bool` values.
- `tools/test-reported-expression-frame-rom.mjs` passes in all five profiles. The full corpus builds
  454/454 examples; the post-optimizer audit validates 448/452, with four unchanged MDL `align 256`
  parser limitations rather than Amy failures.

## 2026-11-01 - Ahoy bug report separates compiler defects from incomplete game templates

- The Ahoy report exposed real code-generation defects in BCD carry/printing, indexed text
  coordinates, call-containing comparisons, dynamic top-level `FOR` storage, NMI-off input waits,
  nested byte extraction, named constants assigned to `u32`, and mixed-width BCD comparisons.
- The assembler optimizer must preserve `AF` when a later `DAA` consumes carry. In particular,
  folding away `push af` / `pop af` around `add hl,de` changed valid BCD arithmetic even when `A`
  itself appeared dead. The rule now requires both accumulator and flag liveness proof.
- `tools/test-ahoy-reported-regressions.mjs` passes every corrected behavior under all five profiles;
  `tools/test-optimizer-af-flag-preservation.mjs` covers the positive and negative optimizer cases.
  The 467-example Balanced build and full Aggressive audit pass, and the six-sample total remains
  7,372 occupied bytes.
- Downloads contain 88 distinct Ahoy-labelled titles. Sixty-five newest sources are complete and
  compile; 23 are generator templates containing unresolved `@@...@@` markers despite accompanying
  ROMs. Do not publish those templates as editable Amy examples until their generated sources are
  supplied. Full inventory: `docs/audits/compiler/ahoy-import-audit-2026-11-01.md`.

## 2026-11-01 - Test selection is contract-driven; full audits remain promotion gates

- Compilation-only corpus runs cannot prove arithmetic, RAM, VRAM, VDP, controller, interrupt,
  stack, port or sound behavior. Fast development gates therefore use executed micro-ROM contracts
  with the strongest available machine-state oracle.
- The existing feature matrix will gain changed-path, evidence-layer, profile, oracle and cost
  metadata. Routine edits select focused and subsystem contracts; unknown compiler/optimizer edits
  fail safely into the complete language suite.
- Every external bug generates a minimal reproduction plus bounded neighboring cases across operand
  forms, widths, boundaries, calls and interrupt state. Full corpus/oracle audits remain mandatory
  for clean-repository compiler promotion. Plan: `docs/amy-test-strategy-2026-11-01.md`.

## 2026-11-01 - Stack reserve decisions require instruction-granularity gameplay evidence

- Frame-end `SP` samples miss temporary depth from calls, pushes and interrupts. The GearColeco test
  core therefore has an opt-in processor watermark that records the minimum `SP` after every
  instruction, including NMI/IRQ entry.
- `tools/profile-rom-stack-usage.mjs` reports per-ROM usage plus median, p90 and maximum. An idle run
  is explicitly labelled and cannot justify the ABI reserve; publication requires complete bots or
  deterministic scenarios. `tools/test-stack-watermark.mjs` proves nested temporary depth is seen
  even when `SP` is restored by the end of the frame.

## 2026-11-01 - Final Ahoy package is complete, but gameplay proof remains separate

- `Ahoy-ColecoVision-Ports.zip` contains 127 standalone sources, ROMs, READMEs and screenshots;
  no unresolved generator markers remain. All shipped sources assemble under Balanced after import.
- The example catalog now contains all 127 projects with an `ahoy!` filter tag: 95 additions and
  32 refreshed sources. Existing richer descriptions were retained; new entries use the package's
  author and issue table as their provenance authority.
- Two newly confirmed runtime defects were fixed: local array-address calculation clobbered a fill
  byte, and a function call used as a target index clobbered the assigned byte. Both now have
  five-profile executed RAM contracts.
- The package has no gameplay bots. Screenshots and successful assembly permit experimental catalog
  integration, but do not justify clean-repository promotion or stack-ABI measurements by themselves.

## 2026-11-01 - Ahoy compiler fixes are promoted as one executed contract group

- The clean repository now includes the previously validated Ahoy fixes for BCD carry and printing,
  indexed print coordinates, call-containing comparisons, top-level dynamic `FOR` storage,
  NMI-off waits, nested `highbyte`/`lowbyte`, named constants assigned to `u32`, and mixed-width BCD.
- Two additional exact reports are fixed: a function call used as a division operand no longer
  destroys the saved divisor, and a byte shift accepts a typed count expression such as
  `1 << (K - 1)`. The complete runtime contract passes all five optimization profiles.
- The clean 467-example Balanced corpus assembles without failure and the six comparison ROMs remain
  7,372 bytes. The final package audit builds 127/127 shipped sources and 53/56 natural variants.
  Remaining natural compile failures are Salvage Diver (`u32 + named constant`), Steeple Run
  (word-table access through a `u16` index), and Vortex (`BCD += u16`).
- Runtime tests use `AMY_COLECO_BIOS` when supplied and skip with an explicit message when no BIOS is
  available; a clean checkout no longer fails merely because copyrighted OS7 data is absent.

## 2026-11-01 - Revised Ahoy package closes three more bounded code-generation gaps

- The revised 127-game archive rebuilds 127/127 shipped sources and 53/56 natural variants. Its
  three 17-byte ROM differences come from predating the final function-division preservation fix.
- BCD byte-adjust loops now use long-range-safe `DEC B` / `JP NZ`, so Optimization Off no longer
  fails when an indexed BCD body exceeds the `DJNZ` displacement range.
- Word tables accept unsigned 16-bit indexes, and `u32`/`i32` arithmetic accepts in-range named
  constants. Executed RAM contracts pass all five profiles; the six-sample total remains 7,372.
- `BCD += u16` remains deliberately open until a bounded binary-to-BCD conversion is implemented;
  a repeated-add loop of up to 65,535 iterations is not an acceptable language implementation.

## 2026-11-01 - Late global declarations receive an actionable diagnostic

- Amy continues to require global variables before main code and routine bodies; accepting forward
  globals would change declaration-order RAM allocation and needs a separate ABI design.
- A routine that reads a global declared later now names that variable and its declaration line,
  instead of reporting only `Invalid runtime assignment`.
- The focused positive/negative diagnostic test passes, and the 562-example Balanced corpus builds
  without failure. Valid generated programs and ROM sizes are unchanged.

## 2026-11-01 - Numeric text concatenation accepts byte expressions

- `"L " + digits$(Lv + 1, 2)` now uses the same typed byte-expression loader as a standalone
  `digits$(Lv + 1, 2)` print instead of failing with a misleading coordinate error.
- Five-profile GearColeco execution verifies `L 05` in VRAM. The Ahoy and nested numeric-format
  runtime suites pass all profiles, and the 562-example Balanced corpus builds without failure.

## 2026-11-01 - Ahoy provenance is explicit in the example browser

- All 127 imported Ahoy projects expose `ahoy!`, an Ahoy-identifying detail, and a publication year
  in their browser metadata; a permanent test enforces the complete set.
- The nine-entry legacy `ahoy` alias is normalized to `ahoy!`, eliminating two competing filters.
- Publication filters show a friendly magazine name and project count, while selected examples
  display `Publication: Ahoy!` separately from ordinary technical tags.

## 2026-11-01 - VS Code package validates its embedded compiler

- The clean-repository Amy Studio VS Code extension remains version 0.1.6 and now runs focused
  compiler regressions after staging and before VSIX packaging.
- The packaged VSIX was unpacked and its embedded 68-module compiler passed current contracts for
  numeric text concatenation, word-table indexing, named-constant arithmetic, and late-global
  diagnostics. This tests the shipped snapshot rather than only the repository compiler.

## 2026-11-02 - Plain str$ is compact; padding remains explicit

- Plain `str$(Value)` now emits only the sign and significant decimal characters for direct output,
  concatenation, and fixed-buffer assignment; unused fixed-buffer cells remain space-filled.
- `digits$` and `width$` retain zero-padded and right-aligned fixed-width behavior respectively.
- GearColeco execution passes all five profiles, related Ahoy formatting tests pass, and the
  562-example Balanced corpus builds without failure.

## 2026-11-02 - Claude Ahoy bug pack triage and fixes

- Runtime tests confirmed and fixed the u16 RAM-copy count clobber, signed word data, dynamic
  word-table comparisons, u16 table reads widened to u32, nested array targets, BCD array printing,
  narrower-to-wider BCD addition, raw packed record copies, inline `swap`, and u8 modulo.
- `width$` and `digits$` widths remain compile-time literals from 1 through 16; diagnostics now say
  so. `BCD += u16` remains deliberately unsupported until a bounded binary-to-BCD conversion exists.
- The real-OS7 regression suite passes all five profiles, and the Balanced corpus passes 562/562.

## 2026-11-02 - Text helpers must reserve the VDP guard before RAM allocation

- `fill ... at`, `put char`, and `get char` link `AMY_RELEASE_VDP_GUARD`; `screen on` and `nmi on`
  activate the same NMI state. These paths own `NO_NMI`, `VDP_STATUS`, and `NMI_FLAG`. Source
  capability inference must reserve `$7020-$7022` before the transpiler allocates user variables;
  detecting the symbols only during final assembly is too late.
- The corrected map starts user RAM at `$7023` for these helpers. Five-profile GearColeco/OS7 tests
  preserve guard variables and verify VRAM output; the Balanced corpus passes 562/562.
- Programs that already reserved NMI state remain byte-identical. Size increases occur only in the
  formerly overlapping cases where the missing runtime reservation was required for correctness.

## 2026-11-02 - amyc help is the authoritative CLI contract

- `node tools/amyc.mjs --help` now lists every supported output, optimization, target, memory,
  hardware, project, and advanced option with accepted values and defaults.
- Unknown options, invalid values, missing values, and extra positional arguments fail clearly
  instead of being ignored; requested output directories are created automatically.
- `--output` is the preferred binary-output spelling (`--rom` remains compatible), and an ADAM
  output without an explicit path now receives `.bin`. Repository, Web, and VS Code documentation
  link back to the version-matched command help.

## 2026-11-02 - Claude follow-up expression and ABI regressions

- Byte comparisons against out-of-domain named constants now fold using the declared byte domain
  instead of truncating values such as 300 to 44. Signed i16 expressions accept negative constant
  multiplication with bounded shift/add code, and numeric `xor` joins `and`/`or` as a typed BASIC
  alias without leaking text to the assembler.
- Inline `bounce` uses the standalone statement emitter. BCD adjustment accepts typed u8/i8 array
  elements and record fields, while `BCD += u16` remains deliberately unsupported pending a bounded
  conversion. `Float` is explicitly reserved and diagnosed at declaration time.
- Direct named ASM transfers to external BIOS/runtime symbols no longer make every Amy routine
  opaque to the non-reentrancy analysis. Indirect transfers, ASM entries into Amy routines,
  recursion, NMI reachability, and unsafe alias control flow remain conservative barriers.
- GearColeco runtime checks pass all five profiles. The full example corpus passes 645/645 under
  both Balanced and Aggressive optimization, with 644 ROMs assembled in each audit.

## 2026-11-02 - Claude silent-codegen follow-up preserves live operands

- A byte-returning function now evaluates expressions containing signed 16-bit variables at word
  width before returning the low byte. Named-constant additions and modulo no longer operate on a
  variable's address.
- Signed byte comparisons preserve a function-call result while loading the other operand when that
  load uses B. Sprite statements evaluate color before loading final Y into B, preventing dynamic
  color expressions from corrupting the sprite coordinate without universal stack staging.
- The universal sprite staging alternative was rejected after adding 25,626 aggregate corpus bytes.
  The compact ordering fix and all three runtime contracts pass all five profiles. Full audits pass
  645/645: 6,061,539 total Balanced bytes and 6,060,693 total Aggressive bytes.

## 2026-11-02 - Byte functions may return a visible tile directly

- `return get char at X,Y` is accepted in `u8`/`i8` functions and uses the same proven byte-input
  ABI and VDP guard as `Value = get char at X,Y`; wider function returns remain rejected.
- GearColeco verifies the returned tile and preserved controller state across all five optimization
  profiles. After importing 16 additional Gazette games and two revisions, full audits pass 661/661:
  6,248,717 total Balanced bytes and 6,247,817 total Aggressive bytes.

## 2026-11-02 - Byte shifts accept unsigned 16-bit count expressions

- Byte-valued `<<` and `>>` expressions accept unsigned `u16` counters and expressions such as
  `128 >> (Bit & 7)`. A nonzero high byte saturates the count to eight instead of incorrectly
  truncating it to the low byte; signed counters remain rejected.
- GearColeco verifies ordinary, zero, masked-u16, and oversized-u16 counts across all five profiles.
  After eight additional games, full audits pass 669/669: 6,352,092 Balanced bytes and 6,351,183
  Aggressive bytes.

## 2026-11-02 - Unsigned high-byte extraction replaces `/256` and `>>8`

- Unsigned 16-bit division by 256 and right shift by eight both lower to `ld l,h` / `ld h,0` after
  loading the source. Signed and fixed-point expressions retain their existing semantics.
- Five-profile GearColeco tests cover boundary and representative values. The 677-example Balanced
  and Aggressive corpora pass; Balanced saves 4,732 bytes in aggregate and Aggressive finishes at
  6,428,764 bytes. The six published comparison ROMs are unchanged.
- BCD printing now accepts `digits N` when N exactly matches the declared BCD digit count. Other
  widths and `width N` remain rejected rather than silently truncating packed decimal values.

## 2026-11-03 - Narrow unsigned operands and local u32 comparisons

- Ordinary u32 `+`, `-`, `*`, and `/` expressions now zero-extend u8/u16 operands, matching the
  already-correct compound-assignment behavior. Signed narrow operands remain rejected rather than
  being silently reinterpreted as unsigned.
- u32 comparisons prepare stack locals through scratch memory instead of assuming every operand has
  a global `asmName`; this removes `ld hl,undefined` while retaining the existing memory compare ABI.
- A user function named `Sgn` is rejected as a builtin collision before assembly. The check is
  function-specific so historical data identifiers that differ only by case are not newly broken.
- Five-profile GearColeco tests verify four mixed-width operations and local comparison. Existing
  u32, ABI, wide-return, numeric-comparison, and reported-language suites pass. The 698-example
  Balanced and Aggressive assembly gates pass when combining the full unaffected set with targeted
  rebuilds of the diagnostic-path examples.

## 2026-11-03 - Claude audit follow-up and Gazette expansion

- Routine byte-input staging now preserves every live register pair while loading the other byte
  of a pair. GearColeco verifies the Minesweeper record-field sprite case as Y=70, X=220,
  pattern=16, color=8 at all five profiles.
- Named constants in `data` tables resolve case-insensitively without rewriting Z80 register names.
  Scalar `select case` accepts relational `case is` arms, byte array/record values widen when passed
  to 16-bit parameters, absolute VRAM bases accept 16-bit offsets, and a variable named `At` remains
  usable in value-first `print` syntax.
- The parenthesized divided-index repro (`Table[(Value-1)/8]`) remains open; its existing explicit
  temporary-variable workaround is retained rather than accepting an unproven lowering.
- The Gazette importer discovered and integrated 55 new projects from the 134-project package,
  preserving the package README attribution and adding the Gazette browser tag. The complete
  757-example gates pass in Alexis-Z80 at 7,318,875 Balanced bytes and 7,317,952 Aggressive bytes;
  the promoted clean tree passes at 7,322,425 and 7,321,502 bytes respectively. The 3,550-byte
  aggregate difference is pre-existing tree divergence, not a failed example. One project is
  delegated to its target-specific validator. The focused runtime suite passes all five profiles.

## 2026-11-03 - Three additional Gazette ports

- Added Queens' Quarrel (July 1986), Q-Bird (December 1986), and Quolerus (November 1988).
  Each Balanced ROM is byte-identical to the supplied reference ROM; all three also compile at
  Off, Safe, Aggressive, and Experimental.
- Attribution validation passes for 263 COMPUTE!/Gazette examples, including 167 Gazette entries.
  Full Alexis-Z80 gates pass 760/760: 7,350,990 Balanced bytes and 7,350,067 Aggressive bytes;
  the promoted clean tree passes at 7,354,540 and 7,353,617 bytes respectively. The unchanged
  3,550-byte aggregate difference remains pre-existing tree divergence. In both trees 759 ROMs
  assemble and one project remains delegated to its target-specific validator.

## 2026-11-03 - Strict routine parameters, RAM copy offsets, and 18 Gazette ports

- Routine signatures no longer silently discard malformed parameters such as `Msg as string`.
  Amy now requires the documented `Type Name` or `ref Type Name` order and reports the offending
  parameter before assembly.
- `copy Source count N to RamArray + Offset` now computes constant and runtime RAM destination
  offsets with 16-bit address arithmetic. GearColeco verifies both forms at all five optimization
  profiles, alongside the existing ROM/VRAM copy regression cases.
- Added 18 Gazette adaptations from React through Royal Rescue. Seventeen Balanced ROMs reproduce
  their supplied references byte for byte; Shape Match rebuilds 57 bytes smaller because its
  supplied ROM predates its final source.
- Attribution validation passes for 281 COMPUTE!/Gazette examples, including 185 Gazette entries.
  Full gates pass 778/778: 7,591,164 Balanced bytes and 7,590,209 Aggressive bytes. In each profile
  777 ROMs assemble and one project remains delegated to its target-specific validator. The clean
  repository also passes 778/778 at 7,594,771 Balanced and 7,593,816 Aggressive bytes.

## 2026-11-03 - Claude audit refresh keeps Ahoy and Gazette provenance separate

- Imported 12 additional COMPUTE!'s Gazette ports from Claude's `Amy-Audit-for-Codex (1)` corpus:
  Spelling Bee, the Gazette Space Patrol, Robot Math, Sno-Cat, Space Gallery, Space Dock, Space
  Arena, Slots, Snake Pit, Space Worms, Slap Shot, and Qewb. The Gazette Space Patrol uses its own
  `gpatrol` identity and does not replace the unrelated Ahoy! game of the same name.
- Updated 11 existing Ahoy! sources to their audited natural-code versions, removing obsolete
  compiler workarounds for signed word data, named constants, Mode 2, nested indexes, records,
  string conversion, modulo, and expression-based numeric formatting. These remain Ahoy! entries
  and are not counted or tagged as Gazette games.
- Documented the OS7 RAM-shadow behavior of `vdp.status`, unsigned modulo-256 semantics of negative
  `data ... bytes` literals, and the absence of a backslash double-quote escape in Amy strings.
- The 23 affected sources compile in all five optimization profiles. Attribution validation passes
  for 293 COMPUTE!-related examples, including 197 Gazette entries. Full gates pass 790/790:
  7,724,237 Balanced bytes and 7,723,309 Aggressive bytes; 789 ROMs assemble and one project remains
  delegated to its target-specific validator. The clean repository also passes 790/790 at
  7,727,844 Balanced and 7,726,916 Aggressive bytes.

## 2026-11-03 - Computed IF operands and width-preserving modulo

- Byte comparisons now accept computed AST operands such as `abs(Value)` and direct
  `get char at X,Y` reads. The latter stages both coordinates through the same proven BIOS-call
  ABI used by assignment form and treats the call as a register-clobber barrier.
- Remainder expressions preserve a 16-bit intermediate for compound left operands. In particular,
  `(37 * 14) mod 50` and `(37 * 14) % 50` now produce 18 instead of the byte-truncated value 6.
  GearColeco verifies both spellings and both new condition forms at all five profiles.
- Added seven distinct COMPUTE!'s Gazette adaptations: States & Capitals Tutor, Spelling Critter,
  Supertank, Squares, Spy Defense, Square Logix, and Spheroids. Attribution validation now covers
  300 COMPUTE!-related examples, including 204 Gazette entries. Full Alexis-Z80 gates pass 797/797:
  7,799,952 Balanced bytes and 7,799,015 Aggressive bytes; 796 ROMs assemble and one project remains
  delegated to its target-specific validator. The promoted clean repository also passes 797/797 at
  7,803,559 Balanced bytes and 7,802,622 Aggressive bytes.

## 2026-11-03 - Perspective Supertank and Tank Ambush

- Updated Supertank to fire its shell in perspective from the bottom-centre gun barrel toward
  the sight. Added Tank Ambush by Anthony Bertram from COMPUTE!'s Gazette, February 1989.
- Both sources compile at Off, Safe, Balanced, Aggressive, and Experimental. Their Balanced ROMs
  are byte-identical in size to the supplied references: 11,466 bytes for Supertank and 11,574
  bytes for Tank Ambush. Attribution validation covers 301 COMPUTE!-related examples, including
  205 Gazette entries.

## 2026-11-03 - Bitwise compound assignment from ROM tables

- `R |= Bits[G]`, `R &= Bits[G]`, and `R ^= Bits[G]` now lower through the same typed
  expression path as their long assignment forms when `Bits` is a ROM `data bytes` table.
  The previous short path emitted the indexed table expression as an invalid assembler immediate.
- GearColeco verifies exact results for all three operators at Off, Safe, Balanced, Aggressive,
  and Experimental. Existing compound-array, expression, and fail-closed suites remain green.
  Full Alexis-Z80 gates pass 798/798 at 7,811,798 Balanced bytes and 7,810,860 Aggressive bytes;
  797 ROMs assemble and one project remains delegated to its target-specific validator. The clean
  repository also passes 798/798 at 7,815,405 Balanced bytes and 7,814,467 Aggressive bytes.

## 2026-11-03 - Final Claude expression gaps: signed magnitude, byte returns, and data expressions

- Direct comparisons of `abs(i16)` now preserve the unsigned 16-bit magnitude while widening a
  signed 16-bit peer by sign to a signed 32-bit comparison. This handles `abs(-32768)` without
  treating its `$8000` magnitude as negative.
- Byte functions accept expression-aware returns such as `return lowbyte(Value)` and
  `return highbyte(Value)` through the established typed byte loader.
- Comma-delimited `data ... bytes` entries accept compile-time integer expressions such as
  `TBase + 8`. Historical whitespace-separated lists and `Value count N` retain their existing
  grammar. GearColeco validates all three paths at all five optimization profiles.
- `Table[(Value-1)/8]` remains an explicit unsupported index-expression shape; it still requires
  assigning the quotient to a temporary variable. This avoids silently broadening address
  arithmetic without a complete index-width and bounds proof.
- Full Alexis-Z80 gates pass 798/798: 7,811,766 Balanced bytes and 7,810,830 Aggressive bytes;
  797 ROMs assemble and one project remains delegated to its target-specific validator. The clean
  repository also passes 798/798 at 7,815,373 Balanced bytes and 7,814,437 Aggressive bytes.

## 2026-11-04 - Fill arrays from ROM data and eleven Gazette adaptations

- `fill array Buffer with Table[Index]` now accepts the same typed byte expressions as ordinary
  assignments. The fill value is evaluated once, preserved while the destination address is
  calculated, and then reused by the byte loop. GearColeco verifies the indexed ROM-table case at
  all five optimization profiles.
- Added The Anglers, The Forbidden Crypt, The Farm Game, The Frantic Fisherman, The Enchanted
  Journey, The Freeze Factory, The Tomb, Thinking, The Gumball Rally, Tile Trader, and Trap. All
  eleven compile at all five profiles; the ten supplied reference ROMs are byte-identical to the
  new Balanced builds. Gazette attribution validation passes for all entries.
- Full Alexis-Z80 gates pass 809/809 at 7,952,216 Balanced bytes and 7,951,270 Aggressive bytes;
  808 ROMs assemble and one project remains delegated to its target-specific validator. The clean
  repository also passes 809/809 at 7,955,823 Balanced bytes and 7,954,877 Aggressive bytes.

## 2026-11-04 - Final 209-game Gazette corpus and silent-codegen fixes

- Imported Claude's final 209-game COMPUTE!'s Gazette package: 186 existing sources were refreshed
  and 23 new examples were added. Of the imported sources, 207 remain byte-for-byte identical;
  Boomer renames a parameter that collided case-insensitively with a constant, and Vampyre adds
  missing visible author/issue credits.
- Parameters are now rejected when their case-insensitive name collides with a named constant.
  This prevents a function parameter such as `Gx` from silently resolving to `const GX`.
- OS7 `INIT_TABLE` and `LOAD_ASCII` calls used by Amy display setup now preserve IX/IY only while
  compiling a routine that actually uses an IX frame or alias. This prevents `tile screen` from
  corrupting locals without charging top-level code or fixed-RAM routines for blanket wrappers.
- Compile-time numeric expressions, including named constants, are folded in byte-array and record
  indexes. The focused Vampyre-shaped repro falls from 80 to 69 bytes without changing semantics.
- GearColeco with the real OS7 BIOS verifies the parameter diagnostic, folded index, and IX-frame
  runtime result at all five optimization profiles. Full corpus gates pass 832/832: 8,559,606
  Balanced bytes and 8,558,614 Aggressive bytes; 831 ROMs assemble and one project remains delegated
  to its target-specific validator. Selective guarding removes 12,293 bytes from the Balanced corpus
  compared with the blanket wrapper. The six-sample total is 7,386 bytes; Tile Animation returns to
  its 1,255-byte baseline, while the remaining 14-byte difference predates this IX-safety change.

## 2026-11-04 - OS7 noise layouts and unknown-name diagnostics

- The Coleco BIOS sound encoder and decoder now apply the real OS7 noise layouts: command types
  0, 1, and 3 include the unused filler byte before attenuation/control, while type 2 remains the
  sole compact form. Exact byte tests cover all four layouts, historical commercial streams still
  decode correctly, and the real-OS7 note ROM audio test passes at all five optimization profiles.
- Failed assignments, comparisons, and `for` declarations now identify a genuinely undeclared bare
  symbol before reporting a generic type error. The check runs only after normal lowering fails, so
  valid programs and generated assembly are unchanged.
- Focused expression and Claude runtime suites pass, including all five profiles. Full corpus gates
  remain 832/832 and byte-identical to the prior audit: 8,559,606 Balanced bytes and 8,558,614
  Aggressive bytes; 831 ROMs assemble and one project remains delegated.

## 2026-11-04 - Representative QA gate and Gazette package credits

- `node tools/amy-qa.mjs quick` now assembles a fixed 35-example cross-section covering the six
  comparison samples, numeric and record self-tests, MegaCart, graphics, codecs, audio, complex
  ColecoVision games, and ADAM projects. It then runs 24 bounded runtime, optimizer, ABI, codec,
  and benchmark checks. This is the default subsystem gate; the complete 832-example corpus remains
  the promotion and release gate rather than the cost of every local change.
- The representative gate passes 35/35 examples: 34 ROMs assemble at 252,185 Balanced bytes and one
  ADAM project delegates to its target-specific validator. All 24 selected matrix tests pass.
- The 239-ROM COMPUTE!'s Gazette package contains every requested 1983-1988 title. Explicit source
  credits correct metadata extraction for Spike (Eric Brandon), Omicron (Sean Wagle), Basketball
  Sam & Ed (Rhett Anderson and David Hensley Jr.), and Squeeze (Stephen Shull).

## 2026-11-04 - Gazette cartridge-credit audit

- Claude's issue list contains 208 lines representing 209 games because Atom Shoot covers separate
  VIC-20 and C64 adaptations. Every represented game is present in the example catalog.
- Corrected 129 `cartridge` author fields: 113 generic magazine credits and 16 abbreviated credits
  were replaced with the supplied author names. GeoPuzzle, Arcade Volleyball, and Scrambler retain
  unambiguous initials because the OS7 title line is limited to 32 characters. Atom Shoot and Atom
  Shoot 64 remain `Author not named`; Crossroads II retains its more specific `S.HARTER` credit.
- All 129 changed examples compile and assemble with Aggressive optimization (1,667,671 bytes total).
  The package generator now prioritizes an explicit cartridge credit over stale catalog prose, and
  the 239-ROM archive was regenerated from the targeted builds.

## 2026-11-05 - GCM pointer tables and cartridge capacity

- `data ... words` accepts `@Label + constant` and `@Label - constant` entries. Both the early
  table-shape scan and final data emitter resolve the same symbol-plus-offset expression, avoiding
  the former misleading empty-table error and invalid folded `ld hl,@Label + N` output.
- The Amy CLI now enforces the same 32 KiB mapped cartridge window as the Studio compiler. A plain
  ColecoVision cartridge that exceeds 32,768 bytes fails before any ROM is written and recommends
  optimization or the MegaCart target; exact 32 KiB and explicitly banked targets remain valid.
- The focused GCM regression runs all five optimization profiles in GearColeco with the real OS7:
  `@Blk + 2` reads byte 9 as expected. A separate 33,279-byte repro fails closed and leaves no stale
  ROM output.


## 2026-11-06 - ugBASIC 2db87ebd becomes the ranked revision

- Official ugBASIC `main` commit `2db87ebd` rebuilds and passes all six ColecoVision runtime
  oracles. Its total is 20,022 occupied bytes, saving 855 bytes versus `afd97a3`.
- The evidence package retains the six complete ROMs, source files, measurements and SHA-256
  hashes. See `docs/audits/optimization/ugbasic-refresh-2026-11-06.md`.

## 2026-11-09 - ugBASIC metasprite uses native CSPRITE grouping

- The original 3,295-byte `2db87ebd` fixture managed six sprites independently and can publish a
  frame after only two of the three active layers have moved. The rendered-frame oracle rejects it.
- Two native `CSPRITE` groups keep each three-color frame coherent, occupy 2,883 bytes with the
  exact same compiler revision, and pass animation, color, movement, and all four bounds.
- The oracle compares final TMS9918 pixels rather than requiring byte-identical hidden mask data;
  covered pixels removed by `CSPRITE` are equivalent and do not weaken the torn-frame check.
- The corrected ugBASIC six-sample total is 19,610 bytes. The 6,166-byte legacy fallback is retired.

## 2026-11-06 - CVBasic e84bf978 becomes the ranked revision

- CVBasic `main` commit `e84bf978` rebuilds and passes all six ColecoVision runtime oracles. Its
  total is 11,698 occupied bytes, saving 3,691 bytes versus `e99aede0` and moving ahead of devkitSMS.
- The evidence package retains the six complete ROMs, source files, measurements and SHA-256
  hashes. See `docs/audits/optimization/cvbasic-refresh-2026-11-06.md`.

## 2026-11-08 - BCD word adjustment is bounded and divided indexes retain width

- `BCD += u16` and `BCD -= u16` decompose an unsigned word through at most five divide-by-ten
  steps and 45 packed-decimal additions. This closes the language gap without the rejected
  value-proportional loop of up to 65,535 iterations. Addition retains declared-digit wrapping;
  subtraction retains saturation at zero.
- RAM-array and ROM-table indexes now pass explicit unsigned word context into the expression
  loader, so forms such as `Table[(Value - 1) / 8]` compile and execute like the equivalent
  temporary-variable workaround.
- `tools/test-bcd-u16-index-runtime.mjs` executes scalar and indexed word sources, 65,535,
  narrow-BCD wrapping, underflow saturation, and both index paths under all five profiles.

## 2026-11-08 - Agent guidance uses curated recipes, not the full game corpus

- The 500-plus game corpus is evidence for mining, regression, and selecting proven
  patterns; it is not loaded into an agent's working context.
- Agent guidance starts at `docs/agent-kit/README.md` and loads one subsystem skill,
  recipe, and canonical excerpt at a time.
- Tiny Sound guidance uses a progression: Flynn's Gold for the compact four-stream
  architecture, Lamplighter for multiple simple scene songs, Hassle Castle for that
  architecture inside a large effect-heavy game, and Commando for the most advanced
  complete composition.
- The reviewed Raging Thunder source currently has two Tiny Sound music streams and
  uses tone 3/noise areas for effects; it must not be described as four-stream music
  unless a newer source changes that layout.
- Claude's toolbox is treated as the stronger game-production harness, while the Amy
  repository remains the compiler and language source of truth. Its useful offline
  compiler snapshot must be regenerated from validated Amy releases, with capabilities
  that automatically retire stale lint rules and workarounds.
- Detailed comparison: `docs/agent-kit/claude-toolbox-comparison-2026-11-08.md`.

## 2026-11-08 - Small-model QA must enforce declared measurements

- Z.AI successfully used the external toolbox to produce Pond Hopper with coherent Amy source,
  CRT-safe presentation, reproducible output, and a model-based gameplay bot. This validates a
  compact intent-to-command front door for smaller coding models.
- Its report nevertheless marked a 94-second average as `PASS` against its own 120-480 second
  target because no machine-readable expectations were declared. Logged targets are not proof.
- Amy author projects may now pair bot metric JSON with explicit thresholds. Missing or
  out-of-range metrics become `WARN` or `FAIL`, and the compact cheatsheet is generated from the
  current manifest so old compiler workarounds cannot silently survive as a second rulebook.
- Claude's `vischeck` supplied the missing detector design for mass VDP-table writes while the
  display remains enabled and sprite patterns disappearing for one frame. Amy's checkpoint proof
  now implements both with explicit `allow`, `measure`, and `clear` policies.
- Evidence: `docs/agent-kit/zai-small-model-audit-2026-11-08.md` and
  `tools/test-amy-author-metrics.mjs`.

## 2026-11-08 - Agent toolbox reaches a tested authoring baseline

- Eight compact skills now cover sound, graphics/compression, NMI/input, sprites,
  menus/CRT sleep, editable assets, BCD/high scores, and multi-file publication.
- `amy-author-new` creates a neutral project without imposing one game's editorial
  structure. Its generated cartridge compiles to 1,289 bytes with 1 byte of RAM and
  rebuilds byte-identically.
- Project and editor metadata now have executable validators. Aggregate author
  checks preserve tool-emitted `WARN` states instead of converting every successful
  process exit to `PASS`.
- Readiness evidence: `docs/agent-kit/readiness-report-2026-11-08.md`.

## 2026-11-08 - Observe agents before expanding authoring automation

- A controlled Goodbye Charlie pilot produced a validated historical adaptation
  in about 12.5 minutes without loading the game corpus.
- Agent friction must be classified as source, game-design, language, tool,
  evidence, or necessary work before changing the toolbox.
- Scaffold bot, metric, and provenance files; reject unknown CLI options; publish
  exact metadata schemas; and detect nearly uniform frames. Compile success and
  simple nonblank screenshots are not sufficient visual or gameplay proof.
- Evidence: `docs/agent-kit/experiments/goodbye-charlie-observation-2026-11-08.md`
  and `experiments/toolbox-pilot-goodbye-charlie/validation-report.md`.

## 2026-11-08 - Measure ugBASIC BIOS mode separately

- ugBASIC `2db87eb` implements `DEFINE BIOS ALLOWED` through Coleco-specific
  TMS9918 and startup branches.
- Treat portable and BIOS-enabled builds as two evidenced configurations. Promote
  BIOS-enabled sizes only when all six existing behavior oracles pass.
- The rebuild script now supports `-BiosAllowed`; no published values changed
  because the current older executable rejects the directive and the newer source
  build is blocked by the local GNU make/WSL environment.
- Evidence: `docs/audits/ugbasic-bios-allowed-audit-2026-11-08.md`.

## 2026-11-08 - Blind authoring pilots must test toolbox transmission

- A fresh agent using only the compact Amy toolbox produced a working Lantern
  Ferry ROM with START, HOW TO, CREDITS, win/failure paths, editable assets,
  metrics, and visual evidence. This proves that the general structure transfers.
- The same agent omitted title music and did not prove OS7 sound-area termination.
  These are toolbox failures, not reasons for the observer to finish the game.
- Publication projects now declare title flow, title-music policy, and sound
  lifecycle verification in `amy-author.json`. The author checker reports missing
  declarations or bot expectations as visible warnings.
- Focused game QA remains bounded; full-corpus compilation is reserved for changes
  to the compiler, runtime, optimizer, or toolbox being promoted.
- Evidence: `docs/agent-kit/experiments/lantern-ferry-blind-observation-2026-11-08.md`.

## 2026-11-08 - Production quality is a separate promotion gate

- The Moonseed Keeper blind pilot passed technical navigation and reachability but
  avoided audio entirely and retained scaffold-like graphics and fixed gameplay.
- Claude's toolbox succeeds more often because it combines a complete reference
  game, independent rules model, delayed human bot, cheap-strategy bots, frame-rate
  proof, contact sheets, and a delivery gate.
- Alexis-Z80 now treats audiovisual identity, illustrated HOW TO, animated feedback,
  variation, human-paced play, strategy resistance, audio lifecycle, and frame budget
  as explicit evidence. A declared omission cannot prove a capability test.
- Evidence: `docs/agent-kit/claude-production-quality-gap-2026-11-08.md` and
  `docs/agent-kit/skills/production-polish.md`.

## 2026-11-08 - Human-paced bot policies must be screen-only by construction

- Moonseed Keeper v2 improved substantially under the production-polish contract,
  but its human strategy still read the player's lane from user RAM.
- A delayed bot is not human evidence when its decision policy can inspect hidden
  state. New projects separate a pure `human-policy.mjs` from the emulator harness
  and an independent `rules-model.mjs` from both the policy and Amy implementation.
- Exact boolean expectations now work in `amy-author-metrics`; the previous scaffold
  emitted `equals` rules that were silently ignored.
- Evidence: `docs/agent-kit/experiments/moonseed-keeper-v2-blind-observation-2026-11-08.md`.

## 2026-11-08 - Human playability includes realistic hold duration

- Moonseed Keeper v2 changed a discrete lane every frame while a direction was
  held. The middle lane therefore existed for only 1/60 second during a normal
  press, although a bot using exact taps could win.
- Discrete controls must be edge-triggered or use a documented delayed repeat.
  Continuous controls must leave a measurable correction window.
- Game bots now need hold-duration evidence at 2, 6, 14, and 30 frames and a
  minimum decision window; delayed perfect taps do not prove human playability.

## 2026-11-08 - Toolbox parity includes production lessons, not only V01-V11

- The earlier equivalence audit incorrectly reported complete parity because it
  covered Claude's mechanical V01-V11 checks but not the human-production lessons.
- The matrix now includes control holds, pure screen-only policies, independent
  models, cheap strategies, gameplay variation, frame budget, audio lifecycle, and
  illustrated audiovisual identity. Delivery requires these checks for games.
- Current evidence is 26 READY, 3 PARTIAL, 0 MISSING. Remaining partial integrations
  are art generation with preview, one-command music/effects generation, and unified
  original-system tracing for historical ports.

## 2026-11-08 - Gameplay variation must come from compiled-ROM executions

- Moonseed Keeper v3 reported three variants generated by its independent model,
  while three real ROM runs all produced the same lane sequence. A correct model
  cannot prove that the implementation varies.
- Publishable games now require at least three unique visible sequences recorded in
  `runtimeVariantSequences` from separate compiled-ROM executions. Model-only seeds
  remain useful rules evidence but do not count toward runtime variation.
- The same pilot exposed reusable harness gaps: OS7 startup timing, RGB565 capture,
  menu navigation, Tiny Sound schedule shape, ascending sound-area order, and
  one-VBlank presentation latency are now focused agent-kit guidance.

## 2026-11-08 - Metasprite rankings require dynamic behavioral equivalence

- The old sprite/metasprite fixtures were not equivalent: Pure ASM lacked movement,
  ugBASIC could tear layers during one VBlank, PVColLib blanked alternating frames,
  and Amy alone included presentation work.
- The repaired oracle now proves coherent layers, colors, animation, controller
  movement, and exact bounds. Equivalent local results are Pure ASM 482 bytes and
  Amy Experimental 797 bytes; cached modern ugBASIC remains unranked until it can
  rebuild and pass the corrected contract.
- Evidence: `docs/audits/optimization/metasprite-pure-asm-gap-2026-11-08.md`.

## 2026-11-08 - Leap Frog sprite flicker is active but intentionally subtle

- Leap Frog correctly enables a 19-entry sprite table, protects logical sprites
  0-5, and rotates entries 6-18 only after the TMS9918A fifth-sprite flag is set.
- A real-ROM test observed 282 overflow frames in 1,765 gameplay frames and every
  eligible rotation phase. The absence of obvious whole-object blinking is the
  intended result, not evidence that the command is inactive.
- Evidence: `tools/test-leap-frog-sprite-flicker.mjs`.
## 2026-11-09 - Rank the smallest runtime-valid node budget per sample

- SDCC allocator limits are non-monotonic; comparison entries may use different node budgets per
  sample only when the compiler/ABI remains compatible and the dedicated runtime oracle passes.
- PkK/libcv falls to 10,760 bytes, PVColLib to 10,771, devkitSMS to 12,921, and z88dk to 17,121.
  Their ordering is unchanged; PkK/libcv leads PVColLib by 11 bytes.
- Smaller incompatible PVColLib and incorrect z88dk bitmap builds were rejected.
- The `$F0` transparent glyph colors in PVColLib/NewColeco Controller Visual are a disclosed,
  size-neutral fixture normalization, not a library optimization.
- Evidence: `docs/audits/optimization/toolchain-node-budget-rerank-2026-11-09.md`.

## 2026-11-09 - Non-recursive dynamic FOR state belongs in static RAM

- A calculated `FOR` bound or step previously forced an IX stack frame even in a
  proven non-recursive routine. Calling an Amy helper that reached an IX-clobbering
  OS7 service could then corrupt the loop state and return address.
- Non-recursive routines now capture dynamic loop state in compiler-owned static
  RAM. Recursive routines retain per-activation IX-frame slots. This avoids blanket
  BIOS guards while preserving recursion semantics and reducing call overhead.
- Tiny Sound initialization also explicitly silences its OS7 sound area before the
  first stream command, so leading rests cannot expose a stale full-volume tone.
- Evidence: `tools/test-for-runtime-limit-static-slot.mjs`,
  `tools/test-for-runtime-bound-capture.mjs`, and
  `tools/tiny-sound-composer/test-gearcoleco-audition.mjs`.

## 2026-11-10 - Inline ASM symbol compatibility relies on exact casing

- An audit of 711 source files and 1,067 inline `asm {}` blocks found 1,883
  case-insensitive homonyms between Amy names and Z80 registers, but no exact-case
  collision that the current symbol rewriter would alter.
- Existing sources consistently distinguish Amy names such as `A`, `B`, or `H`
  from lowercase Z80 registers. Four lowercase register-named declarations exist,
  but none is referenced ambiguously inside inline ASM.
- `$FACE` remains unambiguously hexadecimal because the rewriter explicitly
  protects identifiers preceded by `$`; bare `FACE` may remain an Amy symbol.
- Do not reserve all Z80 register names or make inline symbol rewriting
  case-insensitive. Exact-case rewriting remains compatible; explicit `amy(Name)`
  now resolves ambiguous register/condition names and reports unknown explicit
  symbols at their `.alexis` line. Nearest-name suggestions for otherwise bare
  unresolved assembler symbols remain separate future diagnostic work.
- Evidence: `tools/audit-inline-asm-symbol-ambiguity.mjs` and
  `build/claude-message-9d19bf014-20261109/tundor-asm-unknown-name.alexis`.

## 2026-11-10 - Compound shifts and byte-arithmetic compares retain their real width

- A signed 16-bit compound expression shifted right must use arithmetic shift
  semantics just like a named `i16`; shift counts of 16 or more saturate to the
  sign or zero instead of being rejected only because the operand is compound.
- Unsigned byte arithmetic used in a comparison is evaluated as a 16-bit value,
  not wrapped to eight bits and not expanded through 32-bit scratch buffers.
  Signed, fixed-point, BCD, mixed-domain, and true 32-bit comparisons retain their
  conservative existing paths.
- Low stack headroom remains advisory. The warning now cites the measured 36-38
  byte OS7 depth and names variables intersecting a 40-byte risk window; it does
  not promise or impose a universal 64-byte stack requirement.
- VBlanks while NMI is disabled cannot be counted after the fact because the VDP
  exposes only a pending bit. Long `nmi off` regions pause frame-owned services;
  exact catch-up requires explicit polling/counting during the workload.
- Evidence: `tools/test-inline-voxpcm-variable-shift.mjs`,
  `tools/test-u8-arithmetic-compare.mjs`, and
  `tools/test-stack-headroom-warning.mjs`.

## 2026-11-10 - Half-register writes invalidate full-pair reload proofs

- A local optimizer proof may remove a repeated `LD HL,(source)` only when no
  intervening instruction writes `HL`, `H`, or `L`. This includes shifts,
  rotates, `SET`, and `RES`, not only loads and increments.
- Keep half-register constant tracking independent: changing only `L` can still
  leave a known `H` and permit a later `LD L,n` shortening. The conservative
  full-pair barrier therefore belongs specifically to duplicate-reload proof.
- Evidence: `tools/test-optimizer-half-register-proof.mjs` and
  `tools/test-optimizer-word-reload-runtime.mjs`; Claude's Bomb Squad repro now
  produces `Mi=114` and `Mb=1` under all five optimization profiles.

## 2026-11-10 - Byte arithmetic comparisons stay in their proven domain

- Comparing a `u8` against `u8 + constant` uses the byte addition carry to
  distinguish an in-range result from the exact 256..510 range. This retains
  mathematical comparison semantics without 16- or 32-bit scratch code.
- A difference between byte-domain values is promoted to signed 16-bit, whose
  -255..255 range is sufficient. True wide, fixed-point, BCD, and mixed-domain
  expressions keep their conservative paths.
- Five-profile runtime tests cover overflow, reversed operands, equality, and
  relational operators. The State Update runtime benchmark retains checksum
  1478 while Balanced falls from 1,185 bytes/3,661 average cycles to 1,154
  bytes/3,206 cycles.
- Evidence: `tools/test-u8-arithmetic-compare.mjs` and
  `tools/test-state-update-benchmark.mjs`.

## 2026-11-10 - Inline ASM diagnostics retain Amy source lines

- Generated inline ASM carries comment-only Amy source markers. When assembly
  fails, the CLI locates the failing instruction and reports its `.alexis`
  line, source text, and the `amy(Name)` escape for Amy symbols.
- The assembler library returns its structured error without printing a second
  JavaScript stack trace. Ambiguous register/condition names still require
  explicit `amy(Name)` and hexadecimal `$FACE` remains unambiguous.
- Evidence: `tools/test-inline-asm-symbols.mjs` and
  `tools/test-inline-asm-cli-diagnostic.mjs`.
# 2026-11-10 - Carry/borrow byte comparisons accepted after external validation

- Exact `u8` sum/difference comparisons were validated against 186 expression
  forms, 432 value combinations, and all five optimization profiles with zero
  mismatches and no 32-bit comparison scratch references.
- The r4 compiler produced byte-identical ROMs for the 38-game validation set.
- Tundor's layout-sensitive failure was game-side: `update sprites` ran outside
  VBlank after a near-full-frame update and exposed a partially copied SAT to
  the bot. Moving the upload immediately after the frame wait closes the issue;
  do not attribute it to comparison code generation.
- Evidence: `build/claude-r4-validation/r4-validation.md` and
  `build/claude-r4-validation/r3-tundor-layout-sensitive.md`.

# 2026-11-11 - Standalone MegaCart and exact word bulk/arithmetic paths

- `amyc --target colecovision-megacart` now emits a complete 128 KB MegaCart
  image with the standalone program in the final fixed bank. GearColeco detects
  and executes it at all five optimization profiles.
- `fill array` now supports 16-bit arrays. Counts are elements and values are
  stored little-endian; runtime RAM checks cover all five profiles.
- Unsigned 16-bit division and modulo by constant powers of two lower to exact
  shifts and masks. This deliberately supersedes the older size-only `/2`
  policy when a constant-only program can avoid the roughly 4,900-cycle general
  division path and its runtime dependency.
- Evidence: `tools/test-megacart-cli-runtime.mjs` and
  `tools/test-u16-divmod-fill-runtime.mjs`.

# 2026-11-11 - r5 external validation and bounded bulk fills

- External real-OS7 validation found zero mismatches across 10,120 unsigned
  16-bit division/modulo checks per profile and byte-identical output for the
  38-game regression set. Constant powers of two are roughly 40 times faster.
- `fill array ... count N` now rejects a compile-time count larger than the
  destination length for byte and word arrays. The prior behavior overwrote
  adjacent RAM and predates word-array support.
- Unsigned `/1` and `mod 1` now fold to the dividend and zero respectively.
- Standalone MegaCart bank imports now fail before assembly with a project-mode
  diagnostic. A source-only MegaCart intentionally has empty switchable banks;
  imported bank data requires the multifile linker.
- Evidence: `build/claude-r5-validation/r5-validation.md`,
  `tools/test-u16-divmod-fill-runtime.mjs`, and
  `tools/test-megacart-cli-diagnostic.mjs`.

# 2026-11-11 - r6 accepted and diagnostic consistency

- External r6 validation accepts all changes: 10,120 arithmetic checks per
  profile pass, all 38 game ROMs remain byte-identical, and exact-size byte and
  word fills preserve adjacent guards.
- Zero-count word fills now match byte fills and compile as no-ops.
- Standalone bank-import diagnostics apply even when the caller forgets the
  MegaCart target, preventing undefined trampoline errors under the default
  cartridge target.
- Evidence: `build/claude-r6-validation/r6-validation.md`.

# 2026-11-11 - r7 accepted as the stable experimental handoff

- External real-OS7 validation accepts r7 with 38/38 game ROMs byte-identical
  to r6 and no new warnings.
- Zero-count `u16` fills emit no code and preserve all tested guards across all
  five optimization profiles, including variable fill values.
- Default-target bank imports now fail with the intended source-level MegaCart
  project diagnostic rather than an undefined assembler trampoline.
- Evidence: `build/claude-r7-validation/r7-validation.md`.

# 2026-11-11 - Main code resumes safely after explicit sub definitions

- When an explicit `sub ... end sub` interrupts an already-open implicit main
  region, code generation now jumps around the routine body and resumes the
  same `Start` flow after `end sub`. A first `call asm` after the routine also
  opens/resumes `Start`; it can no longer be emitted after the routine's `ret`
  and silently removed as unreachable.
- Traditional terminal routines that end with `return` and omit `end sub`
  retain their established behavior. Explicit `sub start:` declarations also
  retain true local declarations.
- An unqualified global declaration after implicit main code now reports a
  direct ordering diagnostic; `ram`/`dim` remains the explicit global form.
- One-line `if ... then call asm Label` is accepted. Register-bearing ASM calls
  still require a block `if`, with a specific diagnostic.
- Evidence: `tools/test-main-sub-layout-runtime.mjs`,
  `tools/test-deepwarden-stage1-regressions.mjs`, and `node tools/amy-qa.mjs quick`.

# 2026-11-11 - Main/sub continuation remains size-neutral when unreachable

- External r9 validation accepted runtime behavior but rejected its unconditional
  continuation jump after every explicit sub: all 39 sampled games grew and the
  32 KB Deepwarden teaser exceeded its ROM window.
- The compiler now emits one continuation jump only when main can fall through
  a consecutive routine block and executable main code actually resumes after
  that block. Terminated main loops retain single-call inlining and generate no
  dead `jp` chain.
- Claude's dead-chain fixture is restored exactly to r8 sizes at all profiles:
  235/229/227/227/227 bytes. Deepwarden returns to 32,762 bytes, while the two
  r9 silent-miscompile fixes remain covered by GearColeco execution.
- Evidence: `tools/test-main-sub-layout-runtime.mjs`, `Codex-r9-validation.zip`,
  and `node tools/amy-qa.mjs quick`.

# 2026-11-11 - Forty-ROM handoff corpus adopted

- Claude supplied 40 complete generated Amy sources and their accepted balanced
  ROMs, covering the 38-game validation set plus Out of Order and the 32 KB
  Deepwarden teaser. Five focused main/sub regressions accompany the corpus.
- The checker was made Windows-safe and now exits nonzero on a failed build or
  byte difference. It remains a deliberate handoff/promotion gate rather than
  part of quick QA because the 40 compilations take roughly two minutes.
- Current experimental compiler result: 40 identical, 0 different, 0 failed.
- Evidence: `tools/regression-corpus/claude-2026-11-11/README.md` and
  `tools/regression-corpus/claude-2026-11-11/check.mjs`.

# 2026-11-11 - Language, documentation and editor surfaces synchronized

- Alexis-Z80 and the clean AmyStudio repository use byte-identical compiler,
  CLI, language-reference and optimization-cookbook sources.
- The Web Studio autocomplete includes the current `poke(P, Value)` form, and
  source breakpoints treat multiline `picture ... end picture` declarations as
  data rather than executable statements.
- VS Code 0.1.16 is staged from the current compiler instead of its obsolete
  snapshot. Its bundled-toolchain test now uses the supported CLI output flags.
- Evidence: `node tools/amy-qa.mjs quick`, editor syntax/breakpoint tests, and
  `npm run package --prefix tools/vscode-amy-studio`.

# 2026-11-11 - Function gotos cannot cross the implicit closing return

- Amy functions still close at their first top-level terminal `return Value`.
  A `goto` in that function whose target is not defined before the closing return
  is now rejected instead of jumping into mainline data/code and falling through
  without a machine `ret`.
- Backward jumps and forward jumps to labels placed before the terminal return
  remain valid. The diagnostic identifies the function, target and goto line.
- Evidence: `tools/test-function-goto-return-boundary.mjs`, Claude's
  `Gravitron-and-r10-bugs.zip`, the 42-ROM handoff corpus, and Gravitron's
  byte-identical 20,864-byte balanced build.

# 2026-11-12 - Staged toolchains retain a visible version identity

- `tools/vscode-amy-studio/scripts/stage-toolchain.mjs` now writes the extension
  version and a stable `amy-studio-vscode-X.Y.Z` label into `VERSION.json`.
- Handoff packages may add `baseCommit`, `handoff` and `status`, but regenerating
  the ordinary toolchain can no longer leave only an anonymous hash and timestamp.
- The bundled-toolchain test rejects a staged package without this identity.
