"""Ground truth for the toy character's model: a 5-bone figure with one box per bone, written as TFMD.

Used by the tests (the toy game loads <assets>/<name>/model.tfmd at character load). Everything here is made for
the tests, so it can be shipped, exported and compared freely."""

from __future__ import annotations

import math

from chardecomp.assets import Asset, Bone, Material, Mesh, Skeleton, Submesh
from chardecomp.assets.model import derive_inverse_binds, global_transforms
from chardecomp.assets.toyfmt import TFMD

S2 = math.sqrt(0.5)
BONES = [  # name, parent, translation, rotation (x, y, z, w)
    ("hips", -1, (0.0, 0.9, 0.0), (0.0, 0.0, 0.0, 1.0)),
    ("spine", 0, (0.0, 0.25, 0.0), (0.0, 0.0, 0.0, 1.0)),
    ("head", 1, (0.0, 0.4, 0.0), (0.0, 0.0, 0.0, 1.0)),
    ("arm_l", 1, (0.2, 0.3, 0.0), (0.0, 0.0, S2, S2)),    # 90 degrees about z
    ("arm_r", 1, (-0.2, 0.3, 0.0), (0.0, 0.0, -S2, S2)),
]
HALF = {"hips": (0.15, 0.1, 0.1), "spine": (0.12, 0.15, 0.08), "head": (0.1, 0.1, 0.1),
        "arm_l": (0.04, 0.15, 0.04), "arm_r": (0.04, 0.15, 0.04)}
BOX_TRIS = [(0, 1, 2), (0, 2, 3), (4, 6, 5), (4, 7, 6), (0, 4, 5), (0, 5, 1),
            (1, 5, 6), (1, 6, 2), (2, 6, 7), (2, 7, 3), (3, 7, 4), (3, 4, 0)]


def build() -> Asset:
    sk = Skeleton([Bone(n, p, t, r) for n, p, t, r in BONES])
    derive_inverse_binds(sk)
    globals_ = global_transforms(sk)
    pos, nrm, uv, jo, wt, idx = [], [], [], [], [], []
    for bi, (name, *_rest) in enumerate(BONES):
        hx, hy, hz = HALF[name]
        g = globals_[bi]
        base = len(pos)
        for k, (sx, sy, sz) in enumerate([(-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1),
                                          (-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)]):
            lx, ly, lz = sx * hx, sy * hy + hy, sz * hz  # box sits on the bone's origin, extending along +y
            x = g[0] * lx + g[4] * ly + g[8] * lz + g[12]
            y = g[1] * lx + g[5] * ly + g[9] * lz + g[13]
            z = g[2] * lx + g[6] * ly + g[10] * lz + g[14]
            pos.append((x, y, z))
            n = math.sqrt(sx * sx + sy * sy + sz * sz)
            nrm.append((sx / n, sy / n, sz / n))
            uv.append(((sx + 1) / 2, (sy + 1) / 2))
            if name == "spine" and sy < 0:  # waist vertices blend hips and spine
                jo.append((1, 0, 0, 0)), wt.append((0.5, 0.5, 0.0, 0.0))
            else:
                jo.append((bi, 0, 0, 0)), wt.append((1.0, 0.0, 0.0, 0.0))
        idx.extend(base + i for tri in BOX_TRIS for i in tri)
    mesh = Mesh(pos, idx, nrm, uv, jo, wt, [Submesh(0, len(idx), 0)])
    return Asset("generator", "fixtures/toy_model.py", "", sk, mesh, [Material("skin", (0.9, 0.7, 0.6, 1.0))])


def write(path) -> bytes:
    data = TFMD().encode(build())
    path.write_bytes(data)
    return data
