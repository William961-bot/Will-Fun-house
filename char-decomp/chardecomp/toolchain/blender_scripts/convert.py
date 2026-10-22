# Run by Blender: blender -b --factory-startup --python convert.py -- INPUT OUTPUT SETTINGS.json
# Imports a model, renames bones (and the matching vertex groups) by a map, scales it, exports glb or fbx.
import json
import sys

import bpy

src, out, settings = sys.argv[sys.argv.index("--") + 1:][:3]
cfg = json.load(open(settings))
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = src.lower().rsplit(".", 1)[-1]
if ext in ("glb", "gltf"):
    bpy.ops.import_scene.gltf(filepath=src)
elif ext == "fbx":
    bpy.ops.import_scene.fbx(filepath=src)
else:
    raise SystemExit(f"unsupported input format: {ext}")
rename = cfg.get("rename", {})
for ob in bpy.data.objects:
    if ob.type == "ARMATURE":
        for b in ob.data.bones:
            if b.name in rename:
                b.name = rename[b.name]  # Blender renames the vertex groups bound to this bone too
scale = float(cfg.get("scale", 1.0))
if scale != 1.0:
    for ob in bpy.data.objects:
        if ob.parent is None:
            ob.scale = [v * scale for v in ob.scale]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
oext = out.lower().rsplit(".", 1)[-1]
if oext == "glb":
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
elif oext == "fbx":
    bpy.ops.export_scene.fbx(filepath=out, add_leaf_bones=False)
else:
    raise SystemExit(f"unsupported output format: {oext}")
