@tool
class_name WalkZone
extends Node3D
## Marks ground the fighters can stand on. Put these under World/Walkable; everyone is kept inside the union
## of all zones. A circle uses `radius`; a box uses `size` (X width, Z length) and follows the node's Y rotation.
## Shown in the editor as a cyan outline.

@export_enum("circle", "box") var shape := "circle":
	set(v):
		shape = v
		_redraw()
@export var radius := 6.0:
	set(v):
		radius = v
		_redraw()
@export var size := Vector2(3, 10):
	set(v):
		size = v
		_redraw()

var _outline: MeshInstance3D


func _ready() -> void:
	_redraw()


func _redraw() -> void:
	if not is_inside_tree():
		return
	if _outline == null:
		_outline = MeshInstance3D.new()
		add_child(_outline)  # not owned, so it is never saved into the scene
	_outline.visible = Engine.is_editor_hint()
	var pts := PackedVector3Array()
	if shape == "circle":
		pts = Wire.ring(radius, 48, 0.05)
	else:
		var hx := size.x / 2.0
		var hz := size.y / 2.0
		var c := [Vector3(-hx, 0.05, -hz), Vector3(hx, 0.05, -hz), Vector3(hx, 0.05, hz), Vector3(-hx, 0.05, hz)]
		for i in 4:
			pts.append(c[i])
			pts.append(c[(i + 1) % 4])
	_outline.mesh = Wire.lines_mesh(pts, Wire.mat(Color("8fe6f2"), 0.8))


## Is the flat point (x, z in world space) inside this zone?
func contains(p: Vector3, margin: float = 0.0) -> bool:
	var l := to_local(Vector3(p.x, global_position.y, p.z))
	if shape == "circle":
		return Vector2(l.x, l.z).length() <= radius - margin
	return absf(l.x) <= size.x / 2.0 - margin and absf(l.z) <= size.y / 2.0 - margin


## Nearest point inside this zone (world space, keeps the original height).
func closest(p: Vector3, margin: float = 0.3) -> Vector3:
	var l := to_local(Vector3(p.x, global_position.y, p.z))
	if shape == "circle":
		var v := Vector2(l.x, l.z)
		var r := maxf(0.0, radius - margin)
		if v.length() > r:
			v = v.normalized() * r
		l.x = v.x
		l.z = v.y
	else:
		l.x = clampf(l.x, -size.x / 2.0 + margin, size.x / 2.0 - margin)
		l.z = clampf(l.z, -size.y / 2.0 + margin, size.y / 2.0 - margin)
	var g := to_global(l)
	return Vector3(g.x, p.y, g.z)
