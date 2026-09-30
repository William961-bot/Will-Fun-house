extends SceneTree
## One-off: generate the level and save it as res://world.tscn with every node editable.
## Run:  Godot --headless --path <project> --script res://tools/bake_world.gd
## This OVERWRITES world.tscn, throwing away any edits made to it in the editor.


func _init() -> void:
	var root := Node3D.new()
	root.name = "World"
	World.build(root)
	_own(root, root)
	var packed := PackedScene.new()
	var err := packed.pack(root)
	if err == OK:
		err = ResourceSaver.save(packed, "res://world.tscn")
	print("bake_world: ", "saved res://world.tscn" if err == OK else "failed, error %d" % err)
	root.free()
	quit()


func _own(n: Node, owner_node: Node) -> void:
	for c in n.get_children():
		c.owner = owner_node
		_own(c, owner_node)
