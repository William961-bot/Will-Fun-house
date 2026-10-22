"""Ground truth for the toy character's animation clips (model.tfan): one clip per gameplay state.

Clip index = the fighter's state (0 idle, 1 attack, 2 hitstun), which the toy copies into Anim.clip; the toy
evaluates the current clip at Anim.frame every frame (nlerp between keys) and stores the pose in Anim.pose."""

from __future__ import annotations

import math

from chardecomp.assets import AnimationSet, Asset, Clip
from chardecomp.assets.toyfmt import TFAN

from toy_model import BONES

REST = [r for _n, _p, _t, r in BONES]


def rot(axis, deg):
    h = math.radians(deg) / 2
    return tuple(a * math.sin(h) for a in axis) + (math.cos(h),)


def mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz)


def pose(**turns):
    """REST with extra rotations: pose(spine=((1, 0, 0), 10)) bends the spine 10 degrees about x."""
    names = [n for n, *_ in BONES]
    out = list(REST)
    for name, (axis, deg) in turns.items():
        i = names.index(name)
        out[i] = mul(out[i], rot(axis, deg))
    return out


def build() -> Asset:
    idle = Clip("idle", True, [(0, pose()), (30, pose(spine=((1, 0, 0), 6), head=((1, 0, 0), -4))), (60, pose())])
    attack = Clip("attack", False, [
        (0, pose()),
        (13, pose(arm_r=((0, 0, 1), -70), spine=((0, 1, 0), -20))),   # wind-up
        (17, pose(arm_r=((0, 0, 1), 80), spine=((0, 1, 0), 25))),     # strike
        (37, pose()),
    ], notifies=[(13, "hit_on"), (17, "hit_off")])
    hitstun = Clip("hitstun", False, [(0, pose()), (9, pose(head=((1, 0, 0), -25), spine=((1, 0, 0), -15))),
                                      (18, pose())])
    return Asset("generator", "fixtures/toy_anim.py", "", animations=AnimationSet(60.0, len(BONES), [idle, attack, hitstun]))


def write(path) -> bytes:
    data = TFAN().encode(build())
    path.write_bytes(data)
    return data
