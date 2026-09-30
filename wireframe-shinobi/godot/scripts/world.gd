@tool
class_name World
extends RefCounted
## Generates the wireframe level as a tree of named nodes.
## Used once by tools/bake_world.gd to write world.tscn; after that the level is edited in the editor
## and the game loads world.tscn. Re-running the bake overwrites world.tscn, so only do it to start over.

const MIST := Color("4a5470")
const BONE := Color("e9e3d1")
const DIM := Color("8b8fa3")
const BLOOD := Color("e3343f")
const PETAL := Color("d98fa8")
const TORII := Color("a8323a")
const ARENA := Vector3(0, 0, 102)
const ARENA_R := 15.0


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


static func build(root: Node3D) -> void:
	var mist := Wire.mat(MIST, 0.55)
	var dim := Wire.mat(DIM, 0.5)
	var far := Wire.mat(MIST, 0.4, false)
	var torii := Wire.mat(TORII, 0.85)

	var grid := PackedVector3Array()
	for i in range(-65, 66):
		var v := i * 2.0
		grid.append_array(PackedVector3Array([Vector3(v, 0, -80), Vector3(v, 0, 180), Vector3(-130, 0, v + 50), Vector3(130, 0, v + 50)]))
	_part(root, "Ground", grid, Wire.mat(MIST, 0.26))

	var fences := _group(root, "Fences")
	for sx in [-13.0, 13.0]:
		var fp := PackedVector3Array()
		for z in range(-6, 86, 3):
			var z2 := minf(86, z + 3)
			fp.append_array(PackedVector3Array([Vector3(0, 0, z), Vector3(0, 1.1, z), Vector3(0, 0.9, z), Vector3(0, 0.9, z2),
				Vector3(0, 0.45, z), Vector3(0, 0.45, z2)]))
		_part(fences, "FenceLeft" if sx < 0 else "FenceRight", fp, dim, Vector3(sx, 0, 0))
	_part(fences, "FenceBack", PackedVector3Array([Vector3(-13, 0, 0), Vector3(13, 0, 0), Vector3(-13, 1.1, 0), Vector3(13, 1.1, 0)]), dim, Vector3(0, 0, -6))

	var gates := _group(root, "Torii")
	var gi := 1
	for z in [9.0, 41.0, 86.0]:
		var g := _group(gates, "Torii%d" % gi, Vector3(0, 0, z))
		gi += 1
		_part(g, "PillarLeft", Wire.cyl(0.16, 0.2, 3.4, 6), torii, Vector3(-2.6, 1.7, 0))
		_part(g, "PillarRight", Wire.cyl(0.16, 0.2, 3.4, 6), torii, Vector3(2.6, 1.7, 0))
		_part(g, "TopBeam", Wire.box(7.2, 0.22, 0.36), torii, Vector3(0, 3.5, 0))
		_part(g, "LowerBeam", Wire.box(5.8, 0.16, 0.2), torii, Vector3(0, 2.85, 0))

	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var pines := _group(root, "Pines")
	var pi_n := 1
	for i in 70:
		var side := -1.0 if rng.randf() < 0.5 else 1.0
		var x := side * (15.0 + rng.randf() * 22.0)
		var z := -12.0 + rng.randf() * 140.0
		if Vector2(x - ARENA.x, z - ARENA.z).length() < ARENA_R + 3:
			continue
		var g := _group(pines, "Pine%02d" % pi_n, Vector3(x, 0, z))
		pi_n += 1
		g.scale = Vector3.ONE * (0.8 + rng.randf() * 0.7)
		_part(g, "Trunk", Wire.cyl(0.12, 0.2, 4.2, 5), mist, Vector3(0, 2.1, 0))
		_part(g, "Boughs1", Wire.cone(1.7, 1.8, 7), mist, Vector3(0, 2.6, 0), rng.randf())
		_part(g, "Boughs2", Wire.cone(1.25, 1.5, 7), mist, Vector3(0, 3.6, 0), rng.randf())
		_part(g, "Boughs3", Wire.cone(0.8, 1.2, 7), mist, Vector3(0, 4.5, 0), rng.randf())

	var lanterns := _group(root, "Lanterns")
	var li := 1
	for z in range(4, 84, 12):
		for x in [-4.0, 4.0]:
			var g := _group(lanterns, "Lantern%02d" % li, Vector3(x, 0, z))
			li += 1
			_part(g, "Base", Wire.box(0.5, 0.3, 0.5), dim, Vector3(0, 0.15, 0))
			_part(g, "Post", Wire.cyl(0.08, 0.08, 0.8, 4), dim, Vector3(0, 0.7, 0))
			_part(g, "Lamp", Wire.box(0.46, 0.4, 0.46), dim, Vector3(0, 1.3, 0))
			_part(g, "Roof", Wire.cone(0.46, 0.36, 4), dim, Vector3(0, 1.68, 0), PI / 4)

	# the arena; its position is the boss fight's centre
	var arena := _group(root, "Arena", ARENA)
	_part(arena, "OuterRing", Wire.ring(ARENA_R, 64, 0.02), Wire.mat(BONE, 0.45))
	_part(arena, "InnerRing", Wire.ring(ARENA_R - 1.2, 64, 0.02), Wire.mat(MIST, 0.5))
	_part(arena, "CentreRing", Wire.ring(3, 32, 0.02), Wire.mat(BLOOD, 0.35))
	var af := PackedVector3Array()
	for i in 72:
		var a := float(i) / 72 * TAU
		var a2 := float(i + 1) / 72 * TAU
		var p1 := Vector3(cos(a), 0, sin(a)) * (ARENA_R + 0.3)
		var p2 := Vector3(cos(a2), 0, sin(a2)) * (ARENA_R + 0.3)
		af.append_array(PackedVector3Array([p1, p1 + Vector3(0, 2.6, 0), p1 + Vector3(0, 2.6, 0), p2 + Vector3(0, 2.6, 0),
			p1 + Vector3(0, 1.3, 0), p2 + Vector3(0, 1.3, 0)]))
	var fence := _part(arena, "ArenaFence", af, Wire.mat(BLOOD, 0.6))
	fence.visible = false  # the game shows it when the boss fight starts

	var keep := _group(root, "Keep", Vector3(0, 0, 175))
	var km := Wire.mat(DIM, 0.55, false)
	_part(keep, "Foundation", Wire.box(34, 7, 26), km, Vector3(0, 3.5, 0))
	var y := 7.0
	for i in 5:
		var w := 22.0 - i * 3.8
		var h := 4.4 - i * 0.3
		_part(keep, "Tier%d" % (i + 1), Wire.box(w, h, w * 0.75), km, Vector3(0, y + h / 2, 0))
		y += h
		var roof := _part(keep, "Roof%d" % (i + 1), Wire.cone(w * 0.82, 2.8, 4), km, Vector3(0, y + 1.2, 0), PI / 4)
		roof.scale.z = 0.78
		y += 2.2

	var mountains := _group(root, "Mountains")
	for i in 26:
		var a := float(i) / 26.0 * TAU + rng.randf() * 0.2
		var d := 230.0 + rng.randf() * 70.0
		var h := 50.0 + rng.randf() * 90.0
		_part(mountains, "Mountain%02d" % (i + 1), Wire.cone(45.0 + rng.randf() * 50.0, h, 5 + rng.randi() % 3, 3), far,
			Vector3(sin(a) * d, h / 2.0 - 12.0, 60 + cos(a) * d), rng.randf() * 3.0)
	_part(root, "Moon", Wire.sphere(22, 16, 10), Wire.mat(BONE, 0.32, false), Vector3(-80, 120, 320))

	# sculptor's idols: resting points and checkpoints, in order
	var idols := _group(root, "Idols")
	var k := 1
	for p in [Vector3(2.2, 0, 2), Vector3(2.2, 0, 79)]:
		var g := _group(idols, "Idol%d" % k, p)
		k += 1
		var im := Wire.mat(DIM, 0.9)
		_part(g, "Pedestal", Wire.box(0.8, 0.3, 0.8), im, Vector3(0, 0.15, 0))
		_part(g, "Body", Wire.cone(0.32, 1.05, 5), im, Vector3(0, 0.82, 0))
		_part(g, "Head", Wire.sphere(0.17, 5, 3), im, Vector3(0, 1.5, 0))

	var petals := CPUParticles3D.new()
	petals.name = "Petals"
	var q := QuadMesh.new()
	q.size = Vector2(0.05, 0.05)
	var pm := Wire.mat(PETAL, 0.75)
	pm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	pm.cull_mode = BaseMaterial3D.CULL_DISABLED
	q.material = pm
	petals.mesh = q
	petals.amount = 320
	petals.lifetime = 14.0
	petals.preprocess = 14.0
	petals.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	petals.emission_box_extents = Vector3(25, 1, 25)
	petals.position = Vector3(0, 13, 0)
	petals.direction = Vector3(-0.3, -1, 0.1)
	petals.spread = 25
	petals.gravity = Vector3.ZERO
	petals.initial_velocity_min = 0.6
	petals.initial_velocity_max = 1.1
	petals.local_coords = false
	root.add_child(petals)

	# where things start; drag these around in the editor
	var spawns := _group(root, "Spawns")
	var start := Marker3D.new()
	start.name = "PlayerStart"
	start.position = Vector3(0, 0, 3.5)
	spawns.add_child(start)
	var counts := {}
	var labels := {"grunt": "Soldier", "spear": "Spearman", "ronin": "Ronin", "boss": "Boss"}
	var list: Array = Data.SPAWNS.duplicate()
	list.append(["boss", Data.BOSS_POS.x, Data.BOSS_POS.z])
	for s in list:
		var sp := SpawnPoint.new()
		sp.enemy = s[0]
		counts[s[0]] = counts.get(s[0], 0) + 1
		sp.name = labels[s[0]] + ("" if s[0] == "boss" else str(counts[s[0]]))
		sp.position = Vector3(s[1], 0, s[2])
		sp.rotation.y = PI
		sp.gizmo_extents = 0.6
		spawns.add_child(sp)
