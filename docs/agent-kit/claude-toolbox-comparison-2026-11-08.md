# Amy Agent Kit and Claude Toolbox Comparison

Date: 2026-11-08

Compared material:

- Amy Studio experimental agent kit under `docs/agent-kit/`;
- `C:\Users\Amy\Downloads\amy-toolbox-bundle.zip`, dated 2026-11-08;
- its top-level `AmyToolbox-kit/SKILL.md`, OS7 music skill, `TOOLBOX.json`,
  Star Catcher template, and QA checklist.

## Verdict

Claude's toolbox is the stronger **game-production harness**. Amy Studio is the
stronger **language, compiler, IDE, hardware-contract, and long-term source of
truth**. The right result is not to replace either one. Amy Studio should absorb
the toolbox's executable workflow while keeping the compiler, documentation, and
capability metadata live in the repository.

## Direct executable comparison

The 2026-11-08 comparison also inspected the actual `amy-kit` commands in
`amy-toolbox-bundle.zip`, not only its prose documentation.

| Capability | Claude `amy-kit` | Amy `amy-author-check` | Verdict |
| --- | --- | --- | --- |
| Environment doctor | Checks Node, Python/Pillow, compiler hash, BIOS and scripts; prints fixes | Checks Node, manifest, compiler fingerprint, BIOS, GearColeco JS/WASM and author tools | Equivalent core contract; Claude additionally checks Python asset dependencies |
| Project discovery | Assumes `game.json` or one generated `<name>.alexis` | Accepts one source or a directory, including `.amy` and `.amy.json` | Amy is more flexible |
| Build | Runs art, sound, tune, join, lint and compiler; deletes stale ROM first | Rebuilds declared Amy projects, deletes stale ROM/ASM/report first and preserves target metadata | Amy covers compilation; generated asset orchestration remains project-declared |
| Risk selection | Runs almost the same V01-V11 sequence for each packaged game | Infers capability tags and selects QA profiles/evidence | Amy is safer and cheaper for a large mixed corpus |
| Compiler traps | Hard-coded lint rules tied to a toolbox snapshot | Requires capability-versioned retirement, not implemented yet | Amy has the better contract; Claude has the working tool |
| Static safe area | Source scanner enforces all content in columns 2-29/rows 1-22 | Scans literal essential text/sprites; leaves decoration and dynamics to runtime review | Both run checks; Amy avoids rejecting intentional decoration |
| Sound table | Executable table-layout validator | Routes to Amy's validator but currently emits a placeholder argument | Claude is more operational |
| Reproducible ROM | Rebuilds and byte-compares shipped ROM | Rebuilds in a temporary directory and byte-compares the declared shipped output | Equivalent proof |
| Runtime bot | Runs project bot through GearColeco when BIOS is present | Runs the bot explicitly declared in `amy-author.json` | Equivalent contract; Amy supports shared-source sidecars |
| Visual QA | Regenerates look/strip, edge scan, glitch scan and text-area checks | Generates checkpoint PNGs and checks CRT edges, transient pixels, text areas, visible page writes and one-frame sprite disappearance | Equivalent machine checks; Amy keeps human approval separate |
| Result semantics | Pass/fail/skip; full verify can pass with runtime checks skipped | PASS/WARN/FAIL/SKIP plus machine/generated/human evidence states | Amy is stricter and clearer |
| Delivery | Writes ROM, screenshots and QA report but omits source | Requires doctor/proof/bot, human visual approval, complete declared source, evidence and hashes | Amy now has the stronger contract |
| Multi-file/ADAM | Template-centered single generated source; primarily ColecoVision | Resolves and delivers `@project/...` sources/assets with cartridge and ADAM target metadata | Amy has broader executable scope |

### Concrete toolbox contradictions to correct, not copy

- `rules.json` E10 says ports are limited to type-in listings. That is a toolbox
  editorial rule, not an Amy, hardware, legal, or historical requirement.
- E02 and V09 effectively reject every pixel outside the conservative safe area.
  Amy's correct contract allows deliberate decoration in overscan while protecting
  essential text, sprites, and decisions.
- E06 requires every game to have an original title tune. This is a useful default,
  not a correctness requirement.
- E07-E09 prescribe one menu and game-over structure. They should be reusable UX
  recipes, not universal release gates.
- E11 treats 32K as universal even though Amy also supports intentional MegaCart and
  ADAM media projects.
- `deliver.mjs` says the source must be delivered through E11, but the produced
  `deliver/` folder copies only the ROM, screenshots, and `QA-REPORT.txt`.
- `deliver.mjs` calls the gate full verification but accepts a PASS with skipped
  emulator checks. It records and warns about the skips, which is honest, but the
  artifact must not be described as fully runtime-tested.
- V08 marks screenshot generation as PASS when files exist; its own text correctly
  admits that a person must still inspect them. Generation and visual approval need
  separate states.
- `make.mjs` silently ignores unknown options. A production command should fail on
  misspelled flags.
- Active lint knowledge is stored separately from the compiler capability set. The
  archive already contains historical rules that became stale as Amy evolved.

### Current weaknesses of `amy-author-check`

- `--execute` runs selected Amy adapters for the agent kit, project compilation and
  byte identity, project bot, representative runtime/ABI gate, ZX0 VRAM path,
  bitmap equivalence, sound tables, visual checkpoints, and explicit promotion.
- Provenance detection is deliberately simple and can warn on a canonical source
  whose provenance lives in catalog metadata.
- `editors.json` validation currently proves valid JSON only, not Amy editor schema
  or asset bounds.
- Sound tables, literal essential safe-area checks, runtime edge measurements,
  checkpoint PNGs, transient pixels, opt-in text areas, visible page writes, and
  one-frame sprite disappearance are executable with explicit allow/measure/clear
  policies.
- Eight focused skills are represented in the manifest, each with canonical examples
  and executable checks.
- Child-process restrictions such as `EPERM`/`EACCES` are reported as `SKIP` with
  the exact direct command, never as runtime proof.

The remaining engineering target is not to clone `verify.mjs`, but to pilot the
completed scaffold and focused skills with independent agents while preserving the
distinction between **generated evidence**, **machine-approved evidence**, and
**human-reviewed evidence**.

The toolbox should keep an embedded compiler so it remains useful offline, but that
compiler must be generated from a validated Amy Studio release rather than maintained
as an independent fork. Never copy the toolbox snapshot back into Amy Studio. Its
current snapshot is build `4a16ead0f3`; it still documents divided table indexes and
`BCD += u16` as open limits, while the clean repository fixed both on 2026-11-08.

## Capability comparison

| Area | Claude toolbox | Amy agent kit / repository | Direction |
| --- | --- | --- | --- |
| Context size | One broad skill plus detailed docs | Progressive, one skill and recipe at a time | Keep Amy's routing |
| Compiler | Portable trimmed snapshot | Current compiler and all profiles | Regenerate snapshot from validated releases |
| New project | Complete Star Catcher generator template | Neutral native scaffold with source, target/provenance metadata, visual policy and editor ownership | Both are operational; Amy avoids mandatory house style |
| Build | `make.mjs`, generated assets, stale-ROM deletion | Compiler CLI and IDE build pipeline | Reuse current compiler behind one command |
| Environment check | `doctor.mjs` | Distributed checks | Adopt a repository-native doctor |
| Validation | V01-V11 executable gauntlet | Deeper subsystem tests, but not one author-facing gate | Add a focused author check |
| Delivery | Refuses packaging until QA passes | Publication is less uniformly gated | Adopt the delivery principle |
| Runtime tests | GearColeco harness, RAM/VRAM reads, bots | GearColeco tests and extensive compiler contracts | Share one harness contract |
| Game rules | Independent JS model and human-paced bots | Used in selected projects, not standardized | Adopt for substantial games |
| Visual QA | safe area, edge scan, contact sheets, visual glitches | Accurate CRT view and graphics tests | Combine both layers |
| Original-system study | C64 disk, BASIC, disassembly, traces | Historical sources and emulators vary by project | Keep as optional porting skill |
| Art | `tilekit.py`, `vdpart.py`, previews | Web graphics editors and `editors.json` | Connect generators to editable metadata |
| Compression | `packkit.mjs`, 16 codecs, ZX0 workflow | Same codec family plus measured comparison evidence | Use measured total cost |
| Music | `tunekit.py`, `os7music.py`, PSG validation | Studio Sound Manager, Tiny Sound decoder, language commands | Combine authoring and runtime proof |
| Documentation | Practical house rules and lessons learned | Canonical language/hardware documentation | Distill, do not duplicate |
| Machine-readable map | Strong `TOOLBOX.json`, rules and checks | Agent-kit test but no complete manifest yet | Adopt a versioned manifest |
| ADAM support | Primarily ColecoVision | ColecoVision and ADAM targets | Keep Amy's broader scope |
| VS Code / Web | Not integrated | Existing IDE and VS Code extension | Expose shared checks in both |

## What to adopt first

### 1. Machine-readable authoring manifest

Create `docs/agent-kit/manifest.json` as the source for:

- available skills and recipes;
- required versus optional checks;
- canonical examples;
- tool commands and prerequisites;
- hardware contracts;
- minimum compiler capability, not a hard-coded compiler hash.

This captures the useful role of Claude's `TOOLBOX.json` without freezing Amy
Studio inside the kit.

### 1b. Toolbox release synchronization

Add one Amy Studio release task that rebuilds the portable toolbox compiler and
writes a compatibility record containing:

- Amy Studio Git commit and release date;
- compiler-module hash;
- supported language-capability identifiers;
- known limitations that still reproduce on that exact build;
- regression suites executed while preparing the snapshot;
- minimum toolbox manifest version.

Rules and workarounds must be tied to capability identifiers, not prose copied from
an earlier bug report. For example, when the `bcd-u16-compound` capability is present,
the toolbox must reject or retire any lint rule claiming `BCD += u16` is unsupported.
When `divided-word-index` is present, the old temporary-index workaround becomes a
historical note rather than active advice.

`doctor.mjs` should report three independent versions:

1. toolbox workflow version;
2. embedded Amy compiler version;
3. rules/skills manifest version.

It should fail when its active lint rules contradict the compiler capabilities, warn
when a newer compatible compiler is available, and remain fully usable offline with
the last validated snapshot.

### 2. One repository-native author check

Build `tools/amy-author-check.mjs` as a router over existing Amy tests and selected
toolbox-derived checks. Its first useful checks should be:

- compiler and asset availability;
- ROM and RAM budgets;
- CRT safe-area static warnings;
- sound-table order and area collisions;
- `editors.json` integrity;
- provenance and credits metadata;
- optional runtime contract declared by the project.

It must report `PASS`, `WARN`, `FAIL`, and `SKIP` distinctly. Missing copyrighted
OS7 must skip only checks that truly require it and explain the limitation.

### 3. Curated template, not a mandatory house style

Adapt Star Catcher's structure into a small Amy template, but separate universal
contracts from editorial preferences. For example:

- ROM integrity, safe controller flow, readable credits, and no inaccessible
  required pixels are contracts;
- a particular title-menu order, mandatory original tune, or no play-again choice
  are useful defaults, not language laws;
- ports are not limited to type-in listings when rights and provenance permit other
  work.

The template should use ordinary `.alexis` files and `editors.json`; generated art
or music remains optional rather than mandatory placeholders.

### 4. Delivery evidence

Adopt the toolbox rule that an untested build cannot be called ready. A repository
delivery command should package:

- ROM and complete source/project files;
- exact compiler version and optimization profile;
- QA report with skipped checks visible;
- representative screenshots;
- provenance, liberties, and controls.

Do not require every small example to carry a full game bot. Select checks by project
capabilities and risk.

## What not to copy directly

- An embedded compiler or bug list copied manually without the release synchronization
  and capability checks above.
- Hard-coded assumptions that every game uses the same menu, tune, or generated-file
  pipeline.
- Bash-only entry points where Amy Studio already supports Windows and browser users.
- Rules that confuse Amy's editorial preferences with TMS9918A or OS7 requirements.
- Generated `main.alexis` placeholder workflows as the only accepted project form.
- Claims validated only against the open BIOS when real OS7 timing or ABI behavior
  matters.
- All examples or the complete toolbox in an agent's context.

## Music-specific conclusion

Claude's OS7 music skill is immediately valuable and more operational than the first
Amy Tiny Sound skill. The Amy skill remains the better context router. Merge them by
keeping Amy's levels and adding Claude's verified four-stream recipe:

1. Flynn's Gold: compact four-stream teaching case.
2. Lamplighter: several simple scene songs.
3. Hassle Castle: long four-stream composition plus priority-managed effects.
4. Commando: most elaborate scheduled composition.
5. Raging Thunder: current source is a two-stream music case with other channel areas
   used for effects, unless a newer source changes that layout.

The reusable recipe is two Tiny Sound tonal voices plus muted tone-3 pitch driving a
periodic-noise bass/drum stream. PSG logs through real OS7 remain the final proof.

## Staged implementation order

1. Add the machine-readable manifest and keep its references under test.
2. Add the toolbox release-synchronization task and retire stale rules by capability.
3. Wrap existing static checks in `amy-author-check.mjs` without changing compiler
   output.
4. Port safe-area and sound-table ideas as focused tests, comparing them against Amy's
   existing equivalents before retaining duplicate code.
5. Build one small canonical template with `editors.json` and no mandatory generator.
6. Add opt-in model/bot scaffolding for games whose rules justify it.
7. Add delivery packaging only after the author check has stable PASS/WARN/FAIL/SKIP
   semantics.
8. Expose the same report in CLI, VS Code, and Web Studio.

This order gains most of Claude's practical value without changing the compiler or
forcing hundreds of existing projects into a new structure.
