@tool
class_name VoidWorld
extends RefCounted
## Generates Level 2, the digital void, as a tree of named nodes.
## Used once by tools/bake_void.gd to write void.tscn; after that the level is edited in the editor.
## Node names match world.tscn where the game looks for them: Moon, Petals, Arena/ArenaFence, Idols, Spawns,
## plus Walkable (WalkZone nodes) since there are no fences to stop you walking off.

const CYAN := Color("8fe6f2")
const VIOLET := Color("9b7bff")
const DEEP := Color("4b3d8a")
const WHITE := Color("e8f1ff")
const ARENA_R := 15.0

## [name, centre, radius]; the path runs along +Z
const ISLANDS := [["Start", Vector3(0, 0, 0), 6.0], ["Shard", Vector3(3, 0, 24), 8.0], ["Lattice", Vector3(-4, 0, 48), 7.0],
	["Mirror", Vector3(2, 0, 72), 9.0], ["Terminal", Vector3(0, 0, 92), 4.5]]
const ARENA := Vector3(0, 0, 118)


static func _group(parent: Node3D, n: String, pos: Vector3 = Vector3.ZERO) -> Node3D:
	var g := Node3D.new()
	g.name = n
	g.position = pos
	parent.add_child(g)
	return g


static func _part(parent: Node3D, n: String, pts: PackedVector3Array, m: Material, pos: Vector3 = Vector3.ZERO, ry: float = 0.0) -> MeshInstance3D:
	var mi := Wire.add(parent, pts, m, pos, ry)
	mi.name = n
	return mi


## a floating disc: rings and spokes on top, a crystal cone hanging underneath
static func _island(parent: Node3D, n: String, c: Vector3, r: float, rng: RandomNumberGenerator) -> Node3D:
	var g := _group(parent, n, c)
	var top := PackedVector3Array()
	var rr := r
	while rr > 0.9:
		top.append_array(Wire.ring(rr, int(clampf(rr * 8.0, 16, 72)), 0.0))
		rr -= 1.5
	var spokes := 24
	for i in spokes:
		var a := TAU * i / spokes
		top.append(Vector3(cos(a) * 0.9, 0, sin(a) * 0.9))
		top.append(Vector3(cos(a) * r, 0, sin(a) * r))
	_part(g, "Surface", top, Wire.mat(CYAN, 0.35))
	_part(g, "Rim", Wire.ring(r, 64, 0.0) + Wire.ring(r, 64, -0.25), Wire.mat(CYAN, 0.8))
	var under := _part(g, "Underside", Wire.cone(r, r * 1.3, 10, 4), Wire.mat(DEEP, 0.6))
	under.rotation.x = PI
	under.position.y = -r * 0.65 - 0.25
	under.add_to_group("glitch", true)
	for k in 5:  # hanging crystal shards
		var a := rng.randf() * TAU
		var d := rng.randf_range(r * 0.3, r * 0.8)
		var h := rng.randf_range(1.5, 4.0)
		var s := _part(g, "Shard%d" % (k + 1), Wire.cone(0.35, h, 5, 2), Wire.mat(VIOLET, 0.55), Vector3(cos(a) * d, -h / 2.0 - 0.3, sin(a) * d))
		s.rotation.x = PI
		s.add_to_group("glitch", true)
	return g


static func build(root: Node3D) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 23
	var islands := _group(root, "Islands")
	for isl in ISLANDS:
		_island(islands, isl[0], isl[1], isl[2], rng)

	# bridges between neighbouring islands, and the walkable zones that match them
	var bridges := _group(root, "Bridges")
	var walk := _group(root, "Walkable")
	var stops := []
	for isl in ISLANDS:
		stops.append([isl[1], isl[2]])
	stops.append([ARENA, ARENA_R])
	for i in stops.size():
		var z := WalkZone.new()
		z.name = "Zone%d" % (i + 1)
		z.shape = "circle"
		z.radius = stops[i][1] - 0.2
		z.position = stops[i][0]
		walk.add_child(z)
	for i in stops.size() - 1:
		var a: Vector3 = stops[i][0]
		var b: Vector3 = stops[i + 1][0]
		var d := b - a
		var yaw := atan2(d.x, d.z)
		var from: float = stops[i][1] - 0.8
		var to: float = d.length() - stops[i + 1][1] + 0.8
		var length := to - from
		var centre := a + d.normalized() * (from + length / 2.0)
		var br := _group(bridges, "Bridge%d" % (i + 1), centre)
		br.rotation.y = yaw
		var hz := length / 2.0
		var pts := PackedVector3Array()
		for sx in [-1.5, 1.5]:
			pts.append_array(PackedVector3Array([Vector3(sx, 0, -hz), Vector3(sx, 0, hz), Vector3(sx, 0.9, -hz), Vector3(sx, 0.9, hz)]))
			var zz := -hz
			while zz <= hz:
				pts.append_array(PackedVector3Array([Vector3(sx, 0, zz), Vector3(sx, 0.9, zz)]))
				zz += 2.0
		var zz2 := -hz
		while zz2 <= hz:
			pts.append_array(PackedVector3Array([Vector3(-1.5, 0, zz2), Vector3(1.5, 0, zz2)]))
			zz2 += 0.8
		_part(br, "Deck", pts, Wire.mat(CYAN, 0.5))
		var z := WalkZone.new()
		z.name = "Bridge%d" % (i + 1)
		z.shape = "box"
		z.size = Vector2(3.0, length + 1.0)
		z.position = centre
		z.rotation.y = yaw
		walk.add_child(z)

	# the arena: a wide disc with a hex pattern, and the fence that rises for the duel
	var arena := _group(root, "Arena", ARENA)
	var ap := PackedVector3Array()
	for rr in [ARENA_R, ARENA_R - 1.0, 9.0, 4.0, 1.5]:
		ap.append_array(Wire.ring(rr, 96, 0.0))
	for i in 6:
		var a := TAU * i / 6.0
		ap.append_array(PackedVector3Array([Vector3(cos(a) * 1.5, 0, sin(a) * 1.5), Vector3(cos(a) * ARENA_R, 0, sin(a) * ARENA_R)]))
	_part(arena, "Floor", ap, Wire.mat(WHITE, 0.4))
	var under := _part(arena, "Underside", Wire.cone(ARENA_R, 18, 14, 5), Wire.mat(DEEP, 0.5))
	under.rotation.x = PI
	under.position.y = -9.2
	var af := PackedVector3Array()
	for i in 72:
		var a := float(i) / 72 * TAU
		var a2 := float(i + 1) / 72 * TAU
		var p1 := Vector3(cos(a), 0, sin(a)) * (ARENA_R + 0.3)
		var p2 := Vector3(cos(a2), 0, sin(a2)) * (ARENA_R + 0.3)
		af.append_array(PackedVector3Array([p1, p1 + Vector3(0, 3.0, 0), p1 + Vector3(0, 3.0, 0), p2 + Vector3(0, 3.0, 0)]))
	var fence := _part(arena, "ArenaFence", af, Wire.mat(VIOLET, 0.7))
	fence.visible = false

	# a sky of code: giant walls of digits all round, scrolled by the game
	var sky := _group(root, "CodeSky")
	for i in 10:
		var a := TAU * i / 10.0
		var pos := Vector3(sin(a) * 150.0, 20.0, 60.0 + cos(a) * 150.0)
		var lab := Label3D.new()
		lab.name = "Wall%d" % (i + 1)
		var lines := PackedStringArray()
		for l in 18:
			var row := ""
			for c in 48:
				row += str(rng.randi() % 10) if rng.randf() < 0.8 else " "
			lines.append(row)
		lab.text = "\n".join(lines)
		lab.font_size = 64
		lab.pixel_size = 0.12
		lab.modulate = Color(CYAN, 0.07)
		lab.outline_size = 0
		lab.shaded = false
		lab.double_sided = true
		lab.transform = Transform3D(Basis.looking_at(Vector3(sin(a), 0, cos(a))), pos)
		lab.add_to_group("code_sky", true)
		sky.add_child(lab)

	# drifting debris
	var drift := _group(root, "Debris")
	for i in 60:
		var a := rng.randf() * TAU
		var d := rng.randf_range(22.0, 90.0)
		var pos := Vector3(sin(a) * d, rng.randf_range(-35.0, 30.0), 60.0 + cos(a) * d)
		var s := rng.randf_range(0.6, 3.0)
		var pts := Wire.box(s, s, s) if rng.randf() < 0.5 else Wire.sphere(s * 0.7, 4, 2)
		var m := _part(drift, "Bit%02d" % (i + 1), pts, Wire.mat(VIOLET if rng.randf() < 0.4 else CYAN, 0.35, false), pos, rng.randf() * TAU)
		m.rotation.x = rng.randf() * TAU
		m.add_to_group("drift", true)

	_part(root, "Moon", Wire.sphere(34, 22, 14), Wire.mat(VIOLET, 0.3, false), Vector3(0, 95, 330))

	# save terminals: resting points and checkpoints, in order
	var idols := _group(root, "Idols")
	var k := 1
	for p in [Vector3(2.8, 0, 1.0), Vector3(2.0, 0, 92.0)]:
		var g := _group(idols, "Terminal%d" % k, p)
		g.rotation.y = PI  # screen faces back down the path, toward you as you arrive
		k += 1
		var im := Wire.mat(CYAN, 0.9)
		_part(g, "Pedestal", Wire.box(0.6, 0.9, 0.4), im, Vector3(0, 0.45, 0))
		var screen := _part(g, "Screen", Wire.box(0.9, 0.6, 0.04), im, Vector3(0, 1.25, 0))
		screen.rotation.x = -0.35
		var lab := Label3D.new()
		lab.name = "Prompt"
		lab.text = ">_ SAVE"
		lab.font_size = 32
		lab.pixel_size = 0.006
		lab.modulate = CYAN
		lab.outline_size = 0
		lab.position = Vector3(0, 1.27, 0.04)
		lab.rotation.x = -0.35
		g.add_child(lab)

	# data motes drifting up (named Petals so the game treats them like level 1's petals)
	var motes := CPUParticles3D.new()
	motes.name = "Petals"
	var q := QuadMesh.new()
	q.size = Vector2(0.04, 0.04)
	var pm := Wire.mat(CYAN, 0.8)
	pm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	pm.cull_mode = BaseMaterial3D.CULL_DISABLED
	q.material = pm
	motes.mesh = q
	motes.amount = 280
	motes.lifetime = 10.0
	motes.preprocess = 10.0
	motes.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	motes.emission_box_extents = Vector3(25, 6, 25)
	motes.position = Vector3(0, -2, 0)
	motes.direction = Vector3(0, 1, 0)
	motes.spread = 15
	motes.gravity = Vector3.ZERO
	motes.initial_velocity_min = 0.4
	motes.initial_velocity_max = 1.0
	motes.local_coords = false
	root.add_child(motes)

	# where things start; drag these around in the editor
	var spawns := _group(root, "Spawns")
	var start := Marker3D.new()
	start.name = "PlayerStart"
	start.position = Vector3(0, 0, -2)
	spawns.add_child(start)
	var list := [["blink", "BlinkNinja1", Vector3(5, 0, 25)], ["blink", "BlinkNinja2", Vector3(1, 0, 27)],
		["shuriken", "ShurikenNinja1", Vector3(-1, 0, 51)], ["shuriken", "ShurikenNinja2", Vector3(-7, 0, 47)],
		["smoke", "SmokeNinja1", Vector3(2, 0, 75)], ["blink", "BlinkNinja3", Vector3(5, 0, 70)],
		["mugen", "Boss", ARENA + Vector3(0, 0, 7)]]
	for s in list:
		var sp := SpawnPoint.new()
		sp.enemy = s[0]
		sp.name = s[1]
		sp.position = s[2]
		sp.rotation.y = PI
		sp.gizmo_extents = 0.6
		spawns.add_child(sp)
