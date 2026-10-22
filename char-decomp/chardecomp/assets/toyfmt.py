"""TFMD: the toy fighter's character model format (fixtures/toy_fighter.c loads <name>/model.tfmd).

A small, fully specified skinned-mesh format used as a test character with exact ground truth:

    header   "TFMD" u32 version(=1) u16 bones u16 materials u32 vertices u32 indices
    bones    char name[16] i16 parent f32 t[3] f32 r[4] (x,y,z,w) f32 s[3]
    material char name[16] f32 rgba[4]
    vertex   f32 pos[3] f32 normal[3] f32 uv[2] u8 joints[4] f32 weights[4]
    indices  u16 * indices, then u16 material index for the whole mesh
All little-endian. Inverse bind matrices are not stored: the decoder derives them from the bind pose.
"""

from __future__ import annotations

import struct

from .model import AnimationSet, Asset, Bone, Clip, Material, Mesh, Skeleton, Submesh, derive_inverse_binds
from .registry import AssetFormatError, Plugin, register, sha256

HEADER = struct.Struct("<4sIHHII")
BONE = struct.Struct("<16sh3f4f3f")
MATERIAL = struct.Struct("<16s4f")
VERTEX = struct.Struct("<3f3f2f4B4f")


def _name(raw: bytes) -> str:
    return raw.split(b"\0", 1)[0].decode("ascii")


@register
class TFMD(Plugin):
    name = "tfmd"
    extensions = (".tfmd",)

    def sniff(self, data: bytes) -> bool:
        return data[:4] == b"TFMD"

    def decode(self, data: bytes, source: str) -> Asset:
        try:
            magic, version, nb, nm, nv, ni = HEADER.unpack_from(data, 0)
        except struct.error as e:
            raise AssetFormatError(f"TFMD header: {e}") from None
        if magic != b"TFMD" or version != 1:
            raise AssetFormatError(f"not a TFMD v1 file (magic {magic!r}, version {version})")
        need = HEADER.size + nb * BONE.size + nm * MATERIAL.size + nv * VERTEX.size + ni * 2 + 2
        if len(data) != need:
            raise AssetFormatError(f"TFMD size {len(data)} != {need} expected from the header")
        off = HEADER.size
        bones = []
        for _ in range(nb):
            n, parent, *v = BONE.unpack_from(data, off)
            off += BONE.size
            bones.append(Bone(_name(n), parent, tuple(v[0:3]), tuple(v[3:7]), tuple(v[7:10])))
        mats = []
        for _ in range(nm):
            n, *rgba = MATERIAL.unpack_from(data, off)
            off += MATERIAL.size
            mats.append(Material(_name(n), tuple(rgba)))
        pos, nrm, uv, jo, wt = [], [], [], [], []
        for _ in range(nv):
            v = VERTEX.unpack_from(data, off)
            off += VERTEX.size
            pos.append(v[0:3]), nrm.append(v[3:6]), uv.append(v[6:8]), jo.append(v[8:12]), wt.append(v[12:16])
        indices = list(struct.unpack_from(f"<{ni}H", data, off))
        off += ni * 2
        (mat,) = struct.unpack_from("<H", data, off)
        sk = Skeleton(bones)
        derive_inverse_binds(sk)
        mesh = Mesh(pos, indices, nrm, uv, jo, wt, [Submesh(0, ni, mat if mat != 0xFFFF else -1)])
        return Asset("tfmd", source, sha256(data), sk, mesh, mats,
                     missing=["textures", "tangents", "vertex colors", "morph targets", "LODs", "bone constraints"],
                     derived=["inverse bind matrices (from the bind pose)"])

    def encode(self, a: Asset) -> bytes:
        sk, m = a.skeleton, a.mesh
        out = [HEADER.pack(b"TFMD", 1, len(sk.bones), len(a.materials), len(m.positions), len(m.indices))]
        for b in sk.bones:
            out.append(BONE.pack(b.name.encode("ascii"), b.parent, *b.translation, *b.rotation, *b.scale))
        for x in a.materials:
            out.append(MATERIAL.pack(x.name.encode("ascii"), *(x.base_color or (1.0, 1.0, 1.0, 1.0))))
        for i, p in enumerate(m.positions):
            out.append(VERTEX.pack(*p, *m.normals[i], *m.uvs[i], *m.joints[i], *m.weights[i]))
        out.append(struct.pack(f"<{len(m.indices)}H", *m.indices))
        mat = m.submeshes[0].material if m.submeshes else -1
        out.append(struct.pack("<H", mat if mat >= 0 else 0xFFFF))
        return b"".join(out)


# ------------------------------------------------------------------------------------------------ TFAN (clips)
# "TFAN" u32 version(=1) u16 clips u16 bones f32 sample_rate
# clip: char name[16] u16 keys u16 loop u16 notifies; key: u16 frame + bones * f32[4]; notify: u16 frame char[16]
AN_HEADER = struct.Struct("<4sIHHf")
CLIP = struct.Struct("<16sHHH")
NOTIFY = struct.Struct("<H16s")


@register
class TFAN(Plugin):
    name = "tfan"
    extensions = (".tfan",)

    def sniff(self, data: bytes) -> bool:
        return data[:4] == b"TFAN"

    def decode(self, data: bytes, source: str) -> Asset:
        try:
            magic, version, nclips, nbones, rate = AN_HEADER.unpack_from(data, 0)
            if magic != b"TFAN" or version != 1:
                raise AssetFormatError(f"not a TFAN v1 file (magic {magic!r}, version {version})")
            off = AN_HEADER.size
            key = struct.Struct(f"<H{nbones * 4}f")
            clips = []
            for _ in range(nclips):
                n, nkeys, loop, nnot = CLIP.unpack_from(data, off)
                off += CLIP.size
                keys = []
                for _ in range(nkeys):
                    fr, *q = key.unpack_from(data, off)
                    off += key.size
                    keys.append((fr, [tuple(q[i:i + 4]) for i in range(0, len(q), 4)]))
                notes = []
                for _ in range(nnot):
                    fr, nm = NOTIFY.unpack_from(data, off)
                    off += NOTIFY.size
                    notes.append((fr, _name(nm)))
                clips.append(Clip(_name(n), bool(loop), keys, notes))
        except struct.error as e:
            raise AssetFormatError(f"TFAN truncated: {e}") from None
        if off != len(data):
            raise AssetFormatError(f"TFAN has {len(data) - off} trailing bytes")
        return Asset("tfan", source, sha256(data), animations=AnimationSet(rate, nbones, clips),
                     missing=["translation and scale tracks", "blend trees", "root motion", "IK", "additive layers"])

    def encode(self, a: Asset) -> bytes:
        an = a.animations
        out = [AN_HEADER.pack(b"TFAN", 1, len(an.clips), an.bone_count, an.sample_rate)]
        key = struct.Struct(f"<H{an.bone_count * 4}f")
        for c in an.clips:
            out.append(CLIP.pack(c.name.encode("ascii"), len(c.keys), int(c.loop), len(c.notifies)))
            for fr, qs in c.keys:
                out.append(key.pack(fr, *(x for q in qs for x in q)))
            for fr, nm in c.notifies:
                out.append(NOTIFY.pack(fr, nm.encode("ascii")))
        return b"".join(out)
