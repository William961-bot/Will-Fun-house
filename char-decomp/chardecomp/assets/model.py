"""Engine-neutral asset data: skeleton, skinned mesh, materials, with provenance.

Conventions inside this package: right-handed, metres are NOT assumed (units stay the source's), quaternions are
(x, y, z, w), matrices are 4x4 column-major lists of 16 floats (glTF's layout). Anything a decoder could not read
from the file is listed in `Asset.missing`; anything it computed rather than read is listed in `Asset.derived`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

Vec3 = tuple[float, float, float]
Quat = tuple[float, float, float, float]
Mat4 = list[float]  # column-major, 16 floats


@dataclass
class Bone:
    name: str
    parent: int                      # -1 for a root
    translation: Vec3 = (0.0, 0.0, 0.0)
    rotation: Quat = (0.0, 0.0, 0.0, 1.0)
    scale: Vec3 = (1.0, 1.0, 1.0)
    inverse_bind: Mat4 | None = None  # read from the file, or derived from the bind pose (see Asset.derived)


@dataclass
class Skeleton:
    bones: list[Bone]

    def parents(self) -> list[int]:
        return [b.parent for b in self.bones]

    def names(self) -> list[str]:
        return [b.name for b in self.bones]


@dataclass
class Material:
    name: str
    base_color: tuple[float, float, float, float] | None = None
    texture: str | None = None       # path or identifier of the base colour texture, if any


@dataclass
class Submesh:
    first_index: int
    index_count: int
    material: int                    # index into Asset.materials, -1 = none


@dataclass
class Mesh:
    positions: list[Vec3]
    indices: list[int]               # triangle list
    normals: list[Vec3] | None = None
    uvs: list[tuple[float, float]] | None = None
    joints: list[tuple[int, int, int, int]] | None = None
    weights: list[tuple[float, float, float, float]] | None = None
    submeshes: list[Submesh] = field(default_factory=list)


@dataclass
class Clip:
    """Rotation keyframes per bone (frame numbers at the set's sample rate) and gameplay notifies."""
    name: str
    loop: bool
    keys: list[tuple[int, list[Quat]]]           # (frame, rotation per bone), frames strictly increasing
    notifies: list[tuple[int, str]] = field(default_factory=list)

    @property
    def length(self) -> int:
        return self.keys[-1][0] if self.keys else 0

    def evaluate(self, frame: int, interpolation: str = "nlerp") -> list[Quat]:
        """Pose at an integer frame: the surrounding keys blended with normalised lerp (or slerp)."""
        last = self.length
        f = frame % last if self.loop and last > 0 else frame
        f = min(max(f, 0), last)
        k = 0
        while k + 1 < len(self.keys) and self.keys[k + 1][0] <= f:
            k += 1
        k1 = min(k + 1, len(self.keys) - 1)
        f0, q0 = self.keys[k]
        f1, q1 = self.keys[k1]
        t = 0.0 if k1 == k else (f - f0) / (f1 - f0)
        blend = slerp if interpolation == "slerp" else nlerp
        return [blend(a, b, t) for a, b in zip(q0, q1)]


@dataclass
class AnimationSet:
    sample_rate: float                           # frames per second of the key frame numbers
    bone_count: int
    clips: list[Clip]


@dataclass
class Asset:
    decoder: str
    source: str                      # where the bytes came from (path or artifact label)
    sha256: str
    skeleton: Skeleton | None = None
    mesh: Mesh | None = None
    materials: list[Material] = field(default_factory=list)
    animations: AnimationSet | None = None
    missing: list[str] = field(default_factory=list)   # information the format/decoder does not provide
    derived: list[str] = field(default_factory=list)   # values computed by the decoder, not stored in the file

    def summary(self) -> dict:
        m, s = self.mesh, self.skeleton
        return {
            "decoder": self.decoder, "sha256": self.sha256,
            "bones": len(s.bones) if s else None, "bone_names": s.names() if s else None,
            "parents": s.parents() if s else None,
            "vertices": len(m.positions) if m else None, "triangles": len(m.indices) // 3 if m else None,
            "attributes": [k for k in ("normals", "uvs", "joints", "weights") if m and getattr(m, k) is not None],
            "materials": [x.name for x in self.materials],
            "clips": [c.name for c in self.animations.clips] if self.animations else None,
            "sample_rate": self.animations.sample_rate if self.animations else None,
            "missing": self.missing, "derived": self.derived,
        }


# ---------------------------------------------------------------------------------------------- math


def identity() -> Mat4:
    return [1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0]


def mul(a: Mat4, b: Mat4) -> Mat4:
    """a @ b, both column-major."""
    out = [0.0] * 16
    for c in range(4):
        for r in range(4):
            out[c * 4 + r] = sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4))
    return out


def trs(t: Vec3, q: Quat, s: Vec3) -> Mat4:
    x, y, z, w = q
    n = math.sqrt(x * x + y * y + z * z + w * w) or 1.0
    x, y, z, w = x / n, y / n, z / n, w / n
    r = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
         2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
         2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)]
    return [r[0] * s[0], r[1] * s[0], r[2] * s[0], 0.0,
            r[3] * s[1], r[4] * s[1], r[5] * s[1], 0.0,
            r[6] * s[2], r[7] * s[2], r[8] * s[2], 0.0,
            t[0], t[1], t[2], 1.0]


def invert(m: Mat4) -> Mat4:
    """General 4x4 inverse (Gauss-Jordan on a row-major copy)."""
    a = [[m[c * 4 + r] for c in range(4)] + [1.0 if i == r else 0.0 for i in range(4)] for r in range(4)]
    for col in range(4):
        piv = max(range(col, 4), key=lambda r: abs(a[r][col]))
        if abs(a[piv][col]) < 1e-12:
            raise ValueError("matrix is singular")
        a[col], a[piv] = a[piv], a[col]
        p = a[col][col]
        a[col] = [v / p for v in a[col]]
        for r in range(4):
            if r != col and a[r][col]:
                f = a[r][col]
                a[r] = [v - f * w for v, w in zip(a[r], a[col])]
    return [a[r][4 + c] for c in range(4) for r in range(4)]


def global_transforms(sk: Skeleton) -> list[Mat4]:
    """Model-space bind transform of every bone (parents must come before children)."""
    out: list[Mat4] = []
    for i, b in enumerate(sk.bones):
        local = trs(b.translation, b.rotation, b.scale)
        out.append(local if b.parent < 0 else mul(out[b.parent], local))
    return out


def derive_inverse_binds(sk: Skeleton) -> None:
    for b, g in zip(sk.bones, global_transforms(sk)):
        b.inverse_bind = invert(g)


def nlerp(a: Quat, b: Quat, t: float) -> Quat:
    if sum(x * y for x, y in zip(a, b)) < 0:  # shortest path
        b = tuple(-x for x in b)
    q = [x * (1 - t) + y * t for x, y in zip(a, b)]
    n = math.sqrt(sum(x * x for x in q)) or 1.0
    return tuple(x / n for x in q)


def slerp(a: Quat, b: Quat, t: float) -> Quat:
    d = sum(x * y for x, y in zip(a, b))
    if d < 0:
        b, d = tuple(-x for x in b), -d
    if d > 0.9995:
        return nlerp(a, b, t)
    th = math.acos(min(1.0, d))
    s0, s1 = math.sin((1 - t) * th) / math.sin(th), math.sin(t * th) / math.sin(th)
    return tuple(s0 * x + s1 * y for x, y in zip(a, b))


def angle_deg(a: Quat, b: Quat) -> float:
    """Rotation angle between two orientations, in degrees."""
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    d = abs(sum(x * y for x, y in zip(a, b))) / (na * nb)
    return math.degrees(2 * math.acos(min(1.0, d)))
