"""Independent finite-state model for Crate Switch, in room coordinates."""
import os

START = ((3, 3), (3, 2))
DIRECTIONS = dict(left=(-1, 0), right=(1, 0), up=(0, -1), down=(0, 1))
ACTIONS = list(DIRECTIONS)
if os.getenv("CRATE_NO_RESET") != "1":
    ACTIONS.append("reset")


def inside(square):
    return 1 <= square[0] <= 5 and 1 <= square[1] <= 3


def is_goal(state):
    return state[1] == (1, 1)


def step(state, action):
    if action == "reset":
        return START
    player, crate = state
    dx, dy = DIRECTIONS[action]
    target = player[0] + dx, player[1] + dy
    if not inside(target):
        return state
    if target == crate:
        pushed = crate[0] + dx, crate[1] + dy
        if not inside(pushed):
            return state
        crate = pushed
    return target, crate
