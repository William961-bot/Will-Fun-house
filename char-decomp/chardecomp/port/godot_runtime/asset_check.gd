# Loads the exported character (glTF) at runtime and reports what Godot sees: skeleton and animations.
# godot --headless --path PROJECT --script res://port/asset_check.gd -- out.json
extends SceneTree


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_file(ProjectSettings.globalize_path("res://assets/character.glb"), state)
	var out := {"error": err}
	if err == OK:
		var root := doc.generate_scene(state)
		var skel: Skeleton3D = root.find_children("*", "Skeleton3D", true, false)[0]
		var bones := []
		for i in skel.get_bone_count():
			bones.append({"name": skel.get_bone_name(i), "parent": skel.get_bone_parent(i)})
		out["bones"] = bones
		var players := root.find_children("*", "AnimationPlayer", true, false)
		var anims := []
		if players.size() > 0:
			var ap: AnimationPlayer = players[0]
			for n in ap.get_animation_list():
				anims.append({"name": n, "length": ap.get_animation(n).length})
		out["animations"] = anims
		out["meshes"] = root.find_children("*", "MeshInstance3D", true, false).size()
		root.free()
	var fh := FileAccess.open(args[0], FileAccess.WRITE)
	fh.store_string(JSON.stringify(out))
	fh.close()
	quit()
