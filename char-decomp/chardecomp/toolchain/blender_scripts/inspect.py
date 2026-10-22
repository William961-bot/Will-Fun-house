# Run by Blender: blender -b --factory-startup --python inspect.py -- INPUT OUTPUT.json
# Reports what Blender sees in a model file: armatures (bones, parents, rest positions), actions, meshes.
import json
import sys

import bpy

src, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = src.lower().rsplit(".", 1)[-1]
if ext in ("glb", "gltf"):
    bpy.ops.import_scene.gltf(filepath=src)
elif ext == "fbx":
    bpy.ops.import_scene.fbx(filepath=src)
else:
    raise SystemExit(f"unsupported input format: {ext}")
res = {"armatures": [], "actions": [], "meshes": []}
for ob in bpy.data.objects:
    if ob.type == "ARMATURE":
        res["armatures"].append({"name": ob.name, "bones": [
            {"name": b.name, "parent": b.parent.name if b.parent else None,
             "head": [round(v, 6) for v in b.head_local]} for b in ob.data.bones]})
    elif ob.type == "MESH":
        res["meshes"].append({"name": ob.name, "vertices": len(ob.data.vertices), "faces": len(ob.data.polygons),
                              "vertex_groups": [g.name for g in ob.vertex_groups]})
for a in bpy.data.actions:
    res["actions"].append({"name": a.name, "frame_range": [round(a.frame_range[0], 3), round(a.frame_range[1], 3)],
                           "curves": len(a.fcurves)})
with open(out, "w") as f:
    json.dump(res, f)
