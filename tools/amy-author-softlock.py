"""Check a trusted deterministic Python puzzle model for reachable traps."""
import argparse
import runpy
from collections import defaultdict, deque


def check(model, limit):
    start = model["START"]
    pending = deque([start])
    parents = {start: None}
    reverse = defaultdict(set)
    goals = set()
    while pending:
        state = pending.popleft()
        if model["is_goal"](state):
            goals.add(state)
            continue
        for action in model["ACTIONS"]:
            target = model["step"](state, action)
            if target not in parents:
                if len(parents) >= limit:
                    print("INCONCLUSIVE: state limit reached")
                    return 2
                parents[target] = (state, action)
                pending.append(target)
            reverse[target].add(state)
    winnable = set(goals)
    pending.extend(goals)
    while pending:
        for state in reverse[pending.popleft()]:
            if state not in winnable:
                winnable.add(state)
                pending.append(state)
    trapped = [state for state in parents if state not in winnable]
    print(f"{len(parents)} reachable, {len(goals)} goals, {len(trapped)} trapped")
    if not trapped:
        return 0
    path = []
    state = trapped[0]
    while parents[state] is not None:
        state, action = parents[state]
        path.append(action)
    print("Shortest trap path:", " ".join(map(str, reversed(path))) or "(start)")
    return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", help="trusted Python model (executed)")
    parser.add_argument("--max-states", type=int, default=100000)
    args = parser.parse_args()
    if args.max_states < 1:
        parser.error("--max-states must be positive")
    raise SystemExit(check(runpy.run_path(args.model), args.max_states))
