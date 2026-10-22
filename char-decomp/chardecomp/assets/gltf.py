"""glTF 2.0 binary (GLB) writer and reader for skinned meshes: the neutral export format.

Writes one mesh with one primitive, one skin whose joints are the skeleton's bones (as nodes, hierarchy kept),
inverse bind matrices, materials as baseColorFactor, and the asset's provenance in `asset.extras`. Reads the same
subset back (tightly packed accessors of the component types this writer uses, plus UNSIGNED_SHORT joints and
UNSIGNED_INT indices)."""

from __future__ import annotations

import json
import struct

from .model import Asset, Bone, Material, Mesh, Skeleton, Submesh
from .registry import AssetFormatError, Plugin, register, sha256

FLOAT, UBYTE, USHORT, UINT = 5126, 5121, 5123, 5125
SIZES = {FLOAT: 4, UBYTE: 1, USHORT: 2, UINT: 4}
FMT = {FLOAT: "f", UBYTE: "B", USHORT: "H", UINT: "I"}
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def write_glb(a: Asset) -> bytes:
    sk, m = a.skeleton, a.mesh
    if m is None:
        raise AssetFormatError("glTF export needs a mesh")
    gl = {"asset": {"version": "2.0", "generator": "chardecomp",
                    "extras": {"source": a.source, "source_sha256": a.sha256, "decoder": a.decoder,
                               "missing": a.missing, "derived": a.derived}},
          "buffers": [], "bufferViews": [], "accessors": [], "nodes": [], "meshes": [], "scenes": [], "scene": 0}
    blob = bytearray()

    def add(values, comp, typ, target=None, minmax=False):
        while len(blob) % 4:
            blob.append(0)
        flat = [x for v in values for x in (v if isinstance(v, (tuple, list)) else (v,))]
        data = struct.pack(f"<{len(flat)}{FMT[comp]}", *flat)
        view = {"buffer": 0, "byteOffset": len(blob), "byteLength": len(data)}
        if target:
            view["target"] = target
        blob.extend(data)
        gl["bufferViews"].append(view)
        acc = {"bufferView": len(gl["bufferViews"]) - 1, "componentType": comp, "count": len(values), "type": typ}
        if minmax:
            n = COMPONENTS[typ]
            acc["min"] = [min(v[i] for v in values) for i in range(n)]
            acc["max"] = [max(v[i] for v in values) for i in range(n)]
        gl["accessors"].append(acc)
        return len(gl["accessors"]) - 1

    attrs = {"POSITION": add(m.positions, FLOAT, "VEC3", 34962, minmax=True)}
    if m.normals is not None:
        attrs["NORMAL"] = add(m.normals, FLOAT, "VEC3", 34962)
    if m.uvs is not None:
        attrs["TEXCOORD_0"] = add(m.uvs, FLOAT, "VEC2", 34962)
    if m.joints is not None:
        attrs["JOINTS_0"] = add(m.joints, UBYTE if max(max(j) for j in m.joints) < 256 else USHORT, "VEC4", 34962)
    if m.weights is not None:
        attrs["WEIGHTS_0"] = add(m.weights, FLOAT, "VEC4", 34962)
    prim = {"attributes": attrs, "indices": add(m.indices, UINT if max(m.indices) > 0xFFFF else USHORT, "SCALAR", 34963),
            "mode": 4}
    mat = m.submeshes[0].material if m.submeshes else -1
    if a.materials:
        gl["materials"] = [{"name": x.name, "pbrMetallicRoughness": {"baseColorFactor": list(x.base_color or (1, 1, 1, 1))}}
                           for x in a.materials]
        if mat >= 0:
            prim["material"] = mat
    gl["meshes"].append({"name": "character", "primitives": [prim]})

    roots = []
    if sk:
        for i, b in enumerate(sk.bones):
            node = {"name": b.name}
            if b.translation != (0.0, 0.0, 0.0):
                node["translation"] = list(b.translation)
            if b.rotation != (0.0, 0.0, 0.0, 1.0):
                node["rotation"] = list(b.rotation)
            if b.scale != (1.0, 1.0, 1.0):
                node["scale"] = list(b.scale)
            kids = [j for j, c in enumerate(sk.bones) if c.parent == i]
            if kids:
                node["children"] = kids
            gl["nodes"].append(node)
            if b.parent < 0:
                roots.append(i)
        ibm = add([b.inverse_bind for b in sk.bones], FLOAT, "MAT4")
        gl["skins"] = [{"joints": list(range(len(sk.bones))), "inverseBindMatrices": ibm, "skeleton": roots[0]}]
    mesh_node = {"name": "character_mesh", "mesh": 0}
    if sk:
        mesh_node["skin"] = 0
    gl["nodes"].append(mesh_node)
    gl["scenes"].append({"nodes": roots + [len(gl["nodes"]) - 1]})
    while len(blob) % 4:
        blob.append(0)
    gl["buffers"].append({"byteLength": len(blob)})

    js = json.dumps(gl, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    return (struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
            + struct.pack("<II", len(blob), 0x004E4942) + bytes(blob))


def read_glb(data: bytes, source: str) -> Asset:
    if len(data) < 20 or data[:4] != b"glTF":
        raise AssetFormatError("not a GLB file")
    magic, version, total = struct.unpack_from("<III", data, 0)
    if version != 2 or total != len(data):
        raise AssetFormatError(f"GLB version {version}, length {total} vs {len(data)}")
    jlen, jtype = struct.unpack_from("<II", data, 12)
    if jtype != 0x4E4F534A:
        raise AssetFormatError("first GLB chunk is not JSON")
    gl = json.loads(data[20:20 + jlen])
    off = 20 + jlen
    blob = b""
    if off < len(data):
        blen, btype = struct.unpack_from("<II", data, off)
        if btype != 0x004E4942:
            raise AssetFormatError("second GLB chunk is not BIN")
        blob = data[off + 8: off + 8 + blen]

    def read(i):
        acc = gl["accessors"][i]
        view = gl["bufferViews"][acc["bufferView"]]
        comp, n = acc["componentType"], COMPONENTS[acc["type"]]
        if view.get("byteStride") not in (None, SIZES[comp] * n):
            raise AssetFormatError("interleaved accessors are not supported")
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        flat = struct.unpack_from(f"<{acc['count'] * n}{FMT[comp]}", blob, start)
        return [tuple(flat[k:k + n]) for k in range(0, len(flat), n)] if n > 1 else list(flat)

    meshes = gl.get("meshes", [])
    if len(meshes) != 1 or len(meshes[0]["primitives"]) != 1:
        raise AssetFormatError("only one mesh with one primitive is supported")
    prim = meshes[0]["primitives"][0]
    if prim.get("mode", 4) != 4:
        raise AssetFormatError("only triangle lists are supported")
    at = prim["attributes"]
    get = lambda k: read(at[k]) if k in at else None  # noqa: E731
    indices = read(prim["indices"]) if "indices" in prim else list(range(len(read(at["POSITION"]))))
    mesh = Mesh(get("POSITION"), list(indices), get("NORMAL"), get("TEXCOORD_0"), get("JOINTS_0"), get("WEIGHTS_0"),
                [Submesh(0, len(indices), prim.get("material", -1))])
    mats = [Material(x.get("name", f"material_{i}"),
                     tuple(x.get("pbrMetallicRoughness", {}).get("baseColorFactor", (1.0, 1.0, 1.0, 1.0))))
            for i, x in enumerate(gl.get("materials", []))]
    sk = None
    missing = []
    if gl.get("skins"):
        skin = gl["skins"][0]
        joints = skin["joints"]
        index_of = {node: k for k, node in enumerate(joints)}
        parent_node = {c: p for p, n in enumerate(gl["nodes"]) for c in n.get("children", [])}
        ibm = read(skin["inverseBindMatrices"]) if "inverseBindMatrices" in skin else None
        bones = []
        for k, node in enumerate(joints):
            n = gl["nodes"][node]
            bones.append(Bone(n.get("name", f"joint_{k}"), index_of.get(parent_node.get(node), -1),
                              tuple(n.get("translation", (0.0, 0.0, 0.0))), tuple(n.get("rotation", (0.0, 0.0, 0.0, 1.0))),
                              tuple(n.get("scale", (1.0, 1.0, 1.0))), list(ibm[k]) if ibm else None))
        sk = Skeleton(bones)
        if ibm is None:
            missing.append("inverse bind matrices")
    else:
        missing.append("skeleton")
    extras = gl.get("asset", {}).get("extras", {})
    return Asset("gltf", source, sha256(data), sk, mesh, mats, missing=missing + list(extras.get("missing", [])),
                 derived=list(extras.get("derived", [])))


@register
class GLTF(Plugin):
    name = "gltf"
    extensions = (".glb",)

    def sniff(self, data: bytes) -> bool:
        return data[:4] == b"glTF"

    def decode(self, data: bytes, source: str) -> Asset:
        return read_glb(data, source)

    def encode(self, asset: Asset) -> bytes:
        return write_glb(asset)
