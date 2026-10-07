# Amy Studio completion plan - 2026-10-06

This plan turns the current Alexis-Z80 research into a reproducible clean-repository release. Work moves forward only when OS7 behavior, ROM sizes, and existing examples remain protected.

## Current baseline

- Alexis-Z80: 236/236 examples compile; 235 flat ROMs assemble with the balanced profile, totaling 1,183,205 bytes, and one MegaCart project is delegated to its target-specific builder/runtime validator.
- Clean repository: 81/81 examples compile; 80 flat ROMs assemble with the balanced profile, totaling 310,670 bytes, and one MegaCart project is delegated likewise.
- The OS7/EOS matrix has no remaining `PARTIAL` command rows.
- Native EOS DSK/DDP, OS7+EOS hybrid media, and current MegaCart project packaging have runtime evidence in Alexis-Z80.
- The clean repository contains the promoted EOS, ADAM project-form, and MegaCart evidence suites used by the public examples.

## Historical implementation evidence

Published ADAM and ColecoVision software from the 1980s may be studied when documentation is incomplete. The useful evidence includes firmware entry points, memory maps, device-control blocks, media layouts, boot sequences, VDP initialization, timing, and observable hardware behavior.

Amy Studio must reimplement the learned behavior in maintainable original code. Tests should identify the reference software and the behavior being reproduced. Code should not be copied when a behavioral specification or a small independently derived routine is sufficient.

## Milestone 1 - Trustworthy audit gate

Status: complete.

Completed evidence:

- Child-process launch failures are reported distinctly and fail the matrix.
- Catalogue audits generate exact counts, flat-ROM byte totals, and delegated project counts.
- `check-os7-size-regressions.mjs` protects six representative OS7 programs; savings pass visibly and unexplained growth fails.

- Make the feature-matrix runner fail clearly when a child test cannot launch.
- Record environment failures separately from semantic test failures.
- Regenerate example counts and byte totals instead of maintaining estimates.
- Add an explicit size-regression report for representative OS7 programs.
- Preserve a known-good revision before promoting optimizer or backend work.

Exit criteria:

- A deliberately missing child executable produces a nonzero result and a clear diagnostic.
- A normal matrix smoke test succeeds.
- Both repository catalogue audits pass and publish their exact totals.

## Milestone 2 - Clean-repository evidence parity

Status: complete for the promoted public surface.

Completed evidence:

- Native EOS, OS7+EOS hybrid, and MegaCart examples are public and editable.
- Their target-specific project, packaging, and bundled-emulator tests are present in the clean matrix.
- The generic catalogue auditor no longer misassembles multi-output MegaCart projects as flat ROMs.

- Port the relevant native EOS runtime tests, ADAM project-form test, and MegaCart tests.
- Port the MegaCart feasibility document.
- Add one audited native EOS example, one hybrid example, and one MegaCart example to the public test surface.
- Keep experimental-only research tools out of the clean repository.

Exit criteria:

- The clean repository compiles every public example.
- Its promoted EOS, hybrid, and MegaCart tests execute successfully in the bundled emulator.
- Documentation commands match files that actually ship.

## Milestone 3 - Bank-aware linker

Status: complete. The linker, runtime, debugger, trace, breakpoint, rewind, and
native profiler paths preserve `(bank, address)` identity.

- Represent file offsets separately from Z80 logical addresses.
- Qualify sections and symbols by bank.
- Generate fixed-bank trampolines for explicit cross-bank calls.
- Diagnose per-bank capacity and illegal cross-bank references.
- Extend source maps, breakpoints, traces, and profiling to `(bank, address)`.
- Finalize Amy bank syntax only after the linker model is proven.

Exit criteria:

- A multi-file Amy project can place procedures and data in independent banks.
- Two banks may use the same logical address without symbol collision.
- Cross-bank calls restore the previous bank and preserve the documented ABI.
- 64 KB through 1 MB MegaCart runtime tests pass.

Validated evidence:

- Two exports at `$C000` in different banks remain distinct in symbols,
  source maps, and simultaneous breakpoint candidates.
- GearColeco stops in the bank 2 Amy procedure and the native cycle profiler
  attributes only bank 2 instructions to that procedure.
- Runtime fixtures pass at 64, 128, 256, 512, and 1,024 KB while selecting two
  independent switchable banks and returning safely to fixed code.

## Milestone 4 - Incremental multi-file builds

Status: complete at the declared-output boundary. Independent MegaCart
switchable-bank outputs and ADAM loader/BOOT objects are cached by content and
build configuration; fixed-bank relinking and final media generation remain
conservative.

- Compile changed Amy and ASM sources into reusable objects.
- Track source, generated asset, and binary dependencies.
- Relink only affected outputs and banks.
- Retain full rebuild as the reference correctness path.

Validated so far:

- An unchanged second build reuses both independent switchable banks.
- Editing BANK1 recompiles BANK1 but reuses BANK2, then relinks the fixed bank.
- Incremental and explicit clean builds produce byte-identical MegaCart media.
- The FILES tree derives `MODIFIED`, `STALE`, `COMPILED`, and `FAILED` states
  from compiled fingerprints instead of adding source-tab buttons.
- Native EOS and hybrid DSK/DDP builds reuse unchanged loader and BOOT objects;
  edited program bytes and packs still force complete media regeneration.
- Incremental native and hybrid media are byte-identical to explicit clean
  builds, and the native DSK/DDP runtime test still renders its full ZX0 image.
- Amy textual includes now expose a tested dependency graph with direct and
  transitive fingerprints. FILES can distinguish a directly modified source
  from stale dependent sources while leaving unrelated branches compiled.
- Ordinary `include amy` files remain one compilation unit because they share
  declarations and compiler state; they are not misrepresented as relocatable
  objects.

Deliberately deferred beyond this milestone:

- Define an explicit module ABI and manifest output boundary before extending
  object reuse beyond bank-local Amy outputs; current native EOS and hybrid
  main programs remain intentionally monolithic.
- Persist no binary cache in project JSON until cache versioning and storage
  limits are defined; the current cache deliberately lasts one Studio session.

Exit criteria:

- Editing one independent bank does not recompile unrelated banks.
- Incremental and clean builds produce byte-identical media.
- The FILES tree shows modified, stale, compiled, and failed states without adding a row of source buttons.

All three exit criteria are validated. The dependency, incremental-build, and
bank-aware trace tests are registered in the permanent feature matrix rather
than depending on ad hoc invocation.

## Milestone 5 - Release workflow and documentation

Status: features exist; presentation is incomplete.

Validated so far:

- The comparison and MegaCart guides now describe the completed bank-qualified
  linker/debugger rather than the obsolete pre-linker limitation.
- The workflow documents target creation, target-specific media, generated
  files, and incremental FILES states.
- A browser walkthrough verified the MegaCart starter manifest and bank files;
  it also found and fixed the CSS rule that exposed the irrelevant DSK/DDP
  selector for cartridge targets.

Remaining:

- Capture stable browser screenshots after the loading-overlay capture issue is
  resolved; do not publish screenshots that show an intermediate loading layer.
- Add the project creation, FILES, build output, emulator setup, checkpoint,
  replay, and recording images to the workflow guide.

- Document native EOS, OS7+EOS hybrid, MegaCart, firmware, DSK, and DDP workflows.
- Add screenshots for project creation, build outputs, emulator setup, checkpoint routes, fast replay, and AVI recording.
- Remove experimental labels from native EOS and hybrid templates only after browser-level build-and-run tests pass.
- Decide separately whether animated GIF export is worth its implementation and CPU cost.

## Continuous gates

Every milestone must preserve:

- OS7 compile and runtime behavior.
- Existing ROM-size baselines unless a reviewed correctness fix explains a change.
- Safe, balanced, aggressive, and experimental optimizer semantics where supported.
- Native EOS DSK and DDP execution.
- Hybrid operation when EOS is present and graceful OS7-only operation when it is absent.
