# Amy regression corpus from Claude (2026-11-11)

A self-contained set to run before handing off a new compiler package.

- `src/`: 40 complete single-file game sources, already merged by each game's build script, so they need no generators or includes. That's the 38 earlier ports, Out of Order (ReRUN 1990) and the DEEPWARDEN 32 KB teaser.
- `ref/`: the matching ROMs built with the accepted compiler, r8 or r10 (byte-identical to each other), balanced profile.
- `repros/`: today's bug repros. Expected values are in each file's header comments.
- `check.mjs`: compiles every source and compares it with `ref/`.

    node check.mjs <path-to>/toolchain/tools/amyc.mjs            # balanced: should print identical 40
    node check.mjs <path-to>/toolchain/tools/amyc.mjs aggressive # other profiles: build check only

The integrated Amy Studio copy is Windows-safe and exits nonzero when a build
fails or a balanced ROM differs, so it can be used as a CI or handoff gate.

From the Amy Studio repository root, run:

```text
node tools/regression-corpus/claude-2026-11-11/check.mjs tools/amyc.mjs balanced
```

How to read the result:
- A difference isn't automatically a bug. An intended codegen change shows up here first, so say which change explains each differing ROM.
- A ROM growing across many games, as in r9, is worth checking before handoff.
- The DEEPWARDEN teaser has only 6 bytes free in 32 KB. Any growth breaks it.

What it doesn't cover: runtime behaviour. Our bots and the GearColeco harness check that, and we still run them on each package.
