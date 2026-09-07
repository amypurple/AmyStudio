# Deterministic validation

Use the same commands before and after compiler, optimizer, runtime, or Studio changes.

| Command | Purpose |
|---|---|
| `node tools/amy-qa.mjs quick` | Fast compiler and high-risk regression gate. |
| `node tools/amy-qa.mjs full` | Complete feature matrix plus every catalogued example assembled in Balanced. |
| `node tools/amy-qa.mjs runtime` | GearColeco runtime assertions and visual baselines. |
| `node tools/amy-qa.mjs measure --output build/before.json` | Record ROM size, RAM use, and optimized-ASM hash under every profile. |
| `node tools/amy-qa.mjs compare --before build/before.json --after build/after.json` | Report corpus size changes and the affected programs. |

## Safe workflow

1. Run `quick` and create `build/before.json`.
2. Make one focused change.
3. Run `quick`, create `build/after.json`, then run `compare`.
4. Run `full` and `runtime` before promotion to the clean repository.

A smaller ROM is not proof of correctness. Accept a change only when compilation, runtime assertions, self-tests, and relevant visual baselines still pass. Use `--require-no-growth` only for changes expected to be non-regressive for every program; a compiler feature can legitimately add code to programs that use it.

Reports omit timestamps so identical inputs produce directly comparable JSON. Paths are repository-relative; no workstation path is stored in the report.
