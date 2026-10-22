"""Structural checks for decoded assets. Errors make an asset unusable; warnings are reported, not fatal."""

from __future__ import annotations

import math

from .model import Asset, global_transforms, mul

TOL = 1e-3


def _finite(vals) -> bool:
    return all(math.isfinite(x) for v in vals for x in (v if isinstance(v, (tuple, list)) else (v,)))


def check(a: Asset) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    sk, m = a.skeleton, a.mesh
    nb = len(sk.bones) if sk else 0

    if sk:
        if not sk.bones:
            errors.append("skeleton has no bones")
        roots = [i for i, b in enumerate(sk.bones) if b.parent < 0]
        if sk.bones and not roots:
            errors.append("skeleton has no root bone")
        for i, b in enumerate(sk.bones):
            if b.parent >= i:
                errors.append(f"bone {i} ({b.name}) has parent {b.parent}: parents must precede children (no cycles)")
            q = b.rotation
            if abs(math.sqrt(sum(x * x for x in q)) - 1) > TOL:
                warnings.append(f"bone {b.name}: rotation quaternion not normalised")
            if not _finite([b.translation, b.rotation, b.scale]):
                errors.append(f"bone {b.name}: non-finite transform")
        names = sk.names()
        if len(set(names)) != len(names):
            warnings.append("duplicate bone names")
        if not any(e.startswith("bone") for e in errors) and all(b.inverse_bind for b in sk.bones):
            for b, g in zip(sk.bones, global_transforms(sk)):
                prod = mul(b.inverse_bind, g)
                ident = [1.0 if i % 5 == 0 else 0.0 for i in range(16)]
                if max(abs(x - y) for x, y in zip(prod, ident)) > TOL:
                    errors.append(f"bone {b.name}: inverse bind matrix does not invert the bind pose")
        elif not all(b.inverse_bind for b in sk.bones):
            warnings.append("inverse bind matrices missing")

    if m:
        n = len(m.positions)
        if len(m.indices) % 3:
            errors.append(f"index count {len(m.indices)} is not a multiple of 3")
        bad = [i for i in m.indices if not 0 <= i < n]
        if bad:
            errors.append(f"{len(bad)} indices out of range (vertex count {n}), e.g. {bad[:5]}")
        for k in ("normals", "uvs", "joints", "weights"):
            arr = getattr(m, k)
            if arr is not None and len(arr) != n:
                errors.append(f"{k}: {len(arr)} entries for {n} vertices")
        if not _finite(m.positions):
            errors.append("non-finite vertex positions")
        if m.joints is not None:
            if not sk:
                errors.append("mesh has joint indices but no skeleton")
            else:
                over = sum(1 for j in m.joints for x in j if x >= nb)
                if over:
                    errors.append(f"{over} joint indices >= bone count {nb}")
        if m.weights is not None:
            neg = sum(1 for w in m.weights for x in w if x < 0)
            if neg:
                errors.append(f"{neg} negative skin weights")
            unnorm = [i for i, w in enumerate(m.weights) if abs(sum(w) - 1) > TOL]
            if unnorm:
                errors.append(f"{len(unnorm)} vertices whose weights do not sum to 1, e.g. vertex {unnorm[0]}")
        if (m.joints is None) != (m.weights is None):
            errors.append("joints and weights must both be present or both absent")
        if m.normals is not None:
            off = sum(1 for v in m.normals if abs(math.sqrt(sum(x * x for x in v)) - 1) > 1e-2)
            if off:
                warnings.append(f"{off} normals are not unit length")
        for s in m.submeshes:
            if s.first_index + s.index_count > len(m.indices):
                errors.append("submesh index range past the end of the index buffer")
            if s.material >= len(a.materials):
                errors.append(f"submesh material {s.material} does not exist")
    if not sk and not m:
        errors.append("asset has neither a skeleton nor a mesh")
    return {"errors": errors, "warnings": warnings}
