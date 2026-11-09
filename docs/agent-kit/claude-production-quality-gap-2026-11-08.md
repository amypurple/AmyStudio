# Claude toolbox production-quality gap

## Finding

Claude's toolbox does more than compile and validate Amy programs. Its reference
game and delivery gate encode production expectations that were absent or optional
in the Alexis-Z80 agent kit. The Moonseed Keeper blind pilot exploited that gap:
it omitted audio, used a fixed three-event sequence, and passed a permissive visual
review despite retaining scaffold-like presentation.

## High-value mechanisms found

- A complete reference game, not an empty syntax scaffold.
- Text-authored tile/sprite and music generators with previews.
- An independent JavaScript rules model.
- A screen-only bot reacting 12-25 frames late.
- Idle, hold, mash, zig-zag, and repeated-action strategies that must perform badly.
- Loop-rate measurement and visual glitch scans, not only final-state checks.
- Contact sheets spanning title, illustrated HOW TO, play, credits, and ending.
- A delivery command that reruns QA and refuses failed evidence.
- Concrete human targets for duration, fairness, and difficulty.

## Alexis-Z80 response

The new `production-polish` skill and `amy-author-quality-check` make the missing
contract explicit. New projects now declare audiovisual identity, illustrated HOW
TO, animated state changes, gameplay variation, human-paced bots, cheap-strategy
bots, and frame-budget proof. A one-shot title cue is required by default. Bot
expectations must enforce audio lifecycle, multiple variants, human runs, cheap
strategy failures, and frame budget. Visual approval needs named strengths and
defects considered.

This does not claim automatic artistic judgement. It prevents an agent from calling
a minimally functioning scaffold publishable and ensures a reviewer receives the
right comparative evidence. The next blind pilot must demonstrate the complete
contract before clean-repository promotion.
