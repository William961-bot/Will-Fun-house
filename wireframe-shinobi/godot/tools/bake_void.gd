extends SceneTree
## One-off: generate Level 2 (the digital void) and save it as res://void.tscn with every node editable.
## Run:  Godot --headless --path <project> --script res://tools/bake_void.gd
## This OVERWRITES void.tscn, throwing away any edits made to it in the editor.


func _init() -> void:
	var root := Node3D.new()
	root.name = "World"
	VoidWorld.build(root)
	_own(root, root)
	var packed := PackedScene.new()
	var err := packed.pack(root)
	if err == OK:
		err = ResourceSaver.save(packed, "res://void.tscn")
	print("bake_void: ", "saved res://void.tscn" if err == OK else "failed, error %d" % err)
	root.free()
	quit()


func _own(n: Node, owner_node: Node) -> void:
	for c in n.get_children():
		c.owner = owner_node
		_own(c, owner_node)
