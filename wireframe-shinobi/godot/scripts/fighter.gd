@tool
class_name Fighter
extends RefCounted
## A jointed wireframe body plus its movement and combat state.
## The body faces +Z. Joint angles live in `pose` and are eased toward a target each frame.

const PK := ["hy", "tx", "ty", "hx", "sFx", "sFz", "eFx", "sBx", "sBz", "eBx",
	"lFx", "kFx", "lBx", "kBx", "wx", "tz", "hr", "hxo", "hdy", "wz", "hyw"]

## Joints are driven by damped springs. Lower damping = more overshoot and follow-through.
## Arms and blade whip past their target and settle; legs stay planted and firm.
const DAMP := {"sFx": 0.62, "sFz": 0.62, "eFx": 0.58, "sBx": 0.62, "sBz": 0.62, "eBx": 0.58, "wx": 0.55, "wz": 0.55,
	"tx": 0.72, "ty": 0.7, "tz": 0.72, "hr": 0.75, "hyw": 0.72, "hx": 0.85, "hdy": 0.8,
	"lFx": 0.9, "kFx": 0.9, "lBx": 0.9, "kBx": 0.9, "hy": 0.78, "hxo": 0.9}

var rig: Node3D
var j := {}
var pose := {}
var col := Color("e9e3d1")
var sc := 1.0
var is_player := false
var wp := {}
var body_mat: StandardMaterial3D
var arm_mat: StandardMaterial3D
var labels: Array[Label3D] = []
var tip_a: Node3D
var tip_b: Node3D
var scarf_mesh: ImmediateMesh
var scarf_mat: StandardMaterial3D

# movement
var pos := Vector3.ZERO
var yaw := 0.0
var vel := Vector3.ZERO
var vy := 0.0
var air := false
var state := "idle"
var st := 0.0
var ph := "wind"
var walk_ph := 0.0
var fall := 0.0
var spin := 0.0
var trail_k := 0
var parry_t := 0.0
var parry_side := false
var idle := {}
var occluders: Array[MeshInstance3D] = []
var pvel := {}  # joint angular velocities for the springs
var turn_rate := 0.0  # smoothed yaw speed, for leaning into turns
var prev_yaw := 0.0
var accel := Vector2.ZERO  # smoothed ground acceleration, for leaning into starts and stops
var prev_vel := Vector3.ZERO

# combat (shared)
var type := ""
var display_name := ""
var sub := ""
var hp := 100.0
var max_hp := 100.0
var hp_lag := 100.0
var post := 0.0
var max_post := 100.0
var post_cool := 0.0
var hit_flash := 0.0
var alive := true
var reach := 2.05
var hit_done := false

# player
var rez := 1
var gourd := 3
var guard_press := -9.0
var dg_dir := Vector2(0, 1)
var lock: Fighter = null
var aim: Fighter = null
var focus_t := 0.0
var start_ghost = null
var atk_id := 0
var A := {}
var atk_type := "light"
var combo := 0
var last_atk_end := -9.0
var healed := false

# enemy
var is_boss := false
var speed := 3.0
var deflect := 0.0
var marks := 1
var max_marks := 1
var cd := 1.0
var cd_r := Vector2(1, 2)
var tm := 1.0
var guard_bias := 0.0
var aggro := false
var seen_atk := -1
var guard_hits := 0
var phase := 1
var peril := 0.0
var sets: Array = []
var set_idx := 0
var set_t := 6.0
var set_flash := 0.0
var strafe_dir := 0.0
var strafe_t := 0.0
var evade_t := 0.0
var counter_type := ""
var force_deflect := false
var adapt := {"light": 0.0, "heavy": 0.0, "aerial": 0.0, "dash": 0.0, "step": 0.0, "roll": 0.0}
var adapt_flash := {"light": 0.0, "heavy": 0.0, "aerial": 0.0, "dash": 0.0, "step": 0.0, "roll": 0.0}
var mv := {}
var si := 0
var guard_dur := 0.0
var broken_dur := 0.0
var recoil_dur := 0.0
var adaptive := false  # Genichiro learns your attacks
var tele_t := 0.0  # frozen and flickering just after a teleport
var inf_down := 0.0  # Mugen's Infinity is down while this runs
var domain_used := false
var decoy := false  # smoke-ninja copies: shatter when touched
var decoy_t := 0.0
var remove_me := false

# the Hollow mask (Level 2)
var mask_unlocked := false
var rage := 0.0
var masked := 0.0
var mask_node: Node3D
var pull := Vector3.ZERO  # external drag, e.g. Mugen's Blue


func _init(parent: Node3D, o: Dictionary, mono: Font, base_pose: Dictionary) -> void:
	is_player = o.get("is_player", false)
	col = o.get("col", col)
	sc = o.get("sc", 1.0)
	wp = o["wp"]
	pose = base_pose.duplicate()
	for k in PK:
		pose[k] = pose.get(k, 0.0)
		pvel[k] = 0.0
	_build(parent, mono, o.get("hat", ""))


func _jn(parent: Node3D, n: String, p: Vector3 = Vector3.ZERO) -> Node3D:
	var node := Node3D.new()
	node.name = n
	node.position = p
	parent.add_child(node)
	j[n] = node
	return node


## a shared anatomy mesh coloured with this fighter's material
func _mesh(parent: Node3D, part: String, m: Material, p: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = Anatomy.mesh(part)
	mi.material_override = m
	mi.position = p
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	var occ := MeshInstance3D.new()
	occ.name = "Occ"
	occ.mesh = Anatomy.occluder(part)
	occ.material_override = Anatomy.occluder_mat()
	occ.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.add_child(occ)
	occluders.append(occ)
	return mi


func _build(parent: Node3D, mono: Font, hat: String) -> void:
	rig = Node3D.new()
	rig.name = "Rig"
	parent.add_child(rig)
	body_mat = Wire.mat(col)
	arm_mat = Wire.mat(Color("f2b441")) if is_player else body_mat  # the Wolf's prosthetic arm

	# body parts are dense quad-grid meshes (see anatomy.gd) hung on the same joints the animation drives
	var hips := _jn(rig, "hips", Vector3(0, 0.9, 0))
	_mesh(hips, "pelvis", body_mat)
	var torso := _jn(hips, "torso")
	_mesh(torso, "torso", body_mat)
	if not is_player:
		_mesh(hips, "hakama", body_mat)
		if hat == "jingasa":  # foot soldiers wear a cuirass
			_mesh(torso, "chest_armor", body_mat)
	var head := _jn(torso, "head", Vector3(0, 0.6, 0))
	_mesh(head, "neck", body_mat)
	_mesh(head, "head", body_mat)
	var eye := MeshInstance3D.new()
	var eb := BoxMesh.new()
	eb.size = Vector3(0.022, 0.01, 0.01)
	eye.mesh = eb
	eye.material_override = Wire.mat(Color("8fe6f2") if is_player else Color("f3a36f"))
	eye.position = Vector3(-0.034, 0.165, 0.097)
	head.add_child(eye)
	match hat:
		"jingasa":
			Wire.add(head, Wire.cone(0.32, 0.14, 10), body_mat, Vector3(0, 0.3, 0))
		"crest":
			var arc := PackedVector3Array()
			for i in 12:
				var a0 := PI * i / 12.0
				var a1 := PI * (i + 1) / 12.0
				arc.append(Vector3(cos(a0) * 0.2, 0.3 + sin(a0) * 0.2, 0.04))
				arc.append(Vector3(cos(a1) * 0.2, 0.3 + sin(a1) * 0.2, 0.04))
			Wire.add(head, arc, body_mat)
			Wire.add(head, Wire.cyl(0.15, 0.17, 0.08, 8), body_mat, Vector3(0, 0.22, 0))
		"hood":  # ninja cowl and face cloth
			Wire.add(head, Wire.cone(0.15, 0.32, 12, 3), body_mat, Vector3(0, 0.25, -0.01))
			Wire.add(head, Wire.ring(0.1, 24, 0.0) + Wire.ring(0.098, 24, -0.03), body_mat, Vector3(0, 0.12, 0.004))
		"blindfold":  # a white band across the eyes and swept-back spikes of hair
			Wire.add(head, Wire.ring(0.097, 28, 0.0) + Wire.ring(0.096, 28, 0.025), Wire.mat(Color("7fd8ff")), Vector3(0, 0.16, 0.002))
			for i in 7:
				var spike := Wire.add(head, Wire.cone(0.035, 0.14, 5), body_mat, Vector3((i - 3) * 0.028, 0.29, -0.02 - absf(i - 3) * 0.008))
				spike.rotation = Vector3(-0.7, 0, (i - 3) * 0.18)
		_:
			Wire.add(head, PackedVector3Array([Vector3(0, 0.26, -0.04), Vector3(0, 0.34, -0.12),
				Vector3(0, 0.34, -0.12), Vector3(0, 0.3, -0.2)]), body_mat)

	for side in [["F", -0.23, body_mat], ["B", 0.23, arm_mat]]:
		var sh := _jn(torso, "sh" + side[0], Vector3(side[1], 0.5, 0))
		_mesh(sh, "upper_arm", side[2])
		var el := _jn(sh, "el" + side[0], Vector3(0, -0.3, 0))
		_mesh(el, "forearm", side[2])
		var hand := _jn(el, "hand" + side[0], Vector3(0, -0.28, 0))
		_mesh(hand, "hand", side[2], Vector3(0, 0.03, 0))
	for side in [["F", -0.1], ["B", 0.1]]:
		var hp_n := _jn(hips, "hip" + side[0], Vector3(side[1], -0.03, 0))
		_mesh(hp_n, "thigh", body_mat)
		var kn := _jn(hp_n, "knee" + side[0], Vector3(0, -0.43, 0))
		_mesh(kn, "shin", body_mat)
		_mesh(kn, "foot", body_mat)

	_build_weapon(mono)

	if is_player:
		scarf_mat = Wire.mat(Color("e3343f"), 0.9)
		scarf_mesh = ImmediateMesh.new()
		var sm := MeshInstance3D.new()
		sm.name = "Scarf"
		sm.mesh = scarf_mesh
		torso.add_child(sm)
	rig.scale = Vector3.ONE * sc


## Blade = the weapon's name written as ASCII codes, on two crossed text planes.
func _build_weapon(mono: Font) -> void:
	var weap := _jn(j["handF"], "weap")
	var blen: float = wp["len"]
	Wire.add(weap, PackedVector3Array([Vector3(0, 0, -wp["butt"]), Vector3(0, 0, 0.05),
		Vector3(-0.06, 0, 0.06), Vector3(0.06, 0, 0.06), Vector3(0, -0.06, 0.06), Vector3(0, 0.06, 0.06)]),
		Wire.mat(Color("e9e3d1"), 0.9))
	var s: String = wp["str"]
	while s.length() < 30:
		s += wp["str"]
	var width := mono.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, 32).x
	for k in 2:
		var holder := Node3D.new()
		holder.position = Vector3(0, 0, 0.07 + blen / 2.0)
		holder.rotation.z = PI / 2.0 * k
		weap.add_child(holder)
		var lab := Label3D.new()
		lab.text = s
		lab.font = mono
		lab.font_size = 32
		lab.outline_size = 0
		lab.modulate = wp["color"]
		lab.double_sided = true
		lab.shaded = false
		lab.pixel_size = blen / maxf(width, 1.0)
		lab.rotation.y = -PI / 2.0
		holder.add_child(lab)
		labels.append(lab)
	Wire.add(weap, PackedVector3Array([Vector3(0, 0, 0.07), Vector3(0, 0, 0.07 + blen)]), Wire.mat(wp["color"], 0.3))
	tip_a = Node3D.new()
	tip_a.position = Vector3(0, 0, 0.07 + blen * 0.3)
	weap.add_child(tip_a)
	tip_b = Node3D.new()
	tip_b.position = Vector3(0, 0, 0.07 + blen)
	weap.add_child(tip_b)


func fwd() -> Vector2:
	return Vector2(sin(yaw), cos(yaw))


func flat_to(o: Fighter) -> Dictionary:
	var dx := o.pos.x - pos.x
	var dz := o.pos.z - pos.z
	var d := maxf(sqrt(dx * dx + dz * dz), 1e-6)
	return {"dx": dx, "dz": dz, "d": d, "n": Vector2(dx / d, dz / d)}


## cosine of the angle between my facing and the direction to `o`
func facing(o: Fighter) -> float:
	var r := flat_to(o)
	return fwd().dot(r["n"])


func yaw_to(o: Fighter) -> float:
	return atan2(o.pos.x - pos.x, o.pos.z - pos.z)


func chest() -> Vector3:
	return pos + Vector3(0, 1.25 * sc, 0)


func _rot(n: String, x: float, y: float, z: float) -> void:
	(j[n] as Node3D).basis = Basis(Vector3.RIGHT, x) * Basis(Vector3.UP, y) * Basis(Vector3.BACK, z)


## Add angular velocity to a joint: hit reactions, landings, impacts.
func kick(k: String, amount: float) -> void:
	pvel[k] += amount


## Drive every joint toward `t` with a damped spring and write the result to the joints.
## `rate` sets how snappy this state is (natural frequency); DAMP sets overshoot per joint.
func apply(dt: float, t: Dictionary, rate: float, time: float) -> void:
	var w := rate * 0.9
	var steps := maxi(1, int(ceil(w * dt / 0.35)))
	var h := dt / steps
	for _s in steps:
		for k in PK:
			var z: float = DAMP.get(k, 0.8)
			var v: float = pvel[k] + (w * w * (t[k] - pose[k]) - 2.0 * z * w * pvel[k]) * h
			pvel[k] = v
			pose[k] += v * h
	var rolling := state == "roll"
	var lift := 0.45 if rolling else 0.0  # a roll pivots around the hips, not the feet
	var rp := clampf(st / 0.5, 0.0, 1.0)
	var rx := rp * rp * (3.0 - 2.0 * rp) * TAU if rolling else -fall * 1.45
	rig.transform = Transform3D((Basis(Vector3.UP, yaw + spin) * Basis(Vector3.RIGHT, rx)).scaled(Vector3.ONE * sc),
		pos + Vector3(0, lift * sc, 0))
	(j["hips"] as Node3D).basis = Basis(Vector3.UP, pose.hyw) * Basis(Vector3.BACK, pose.hr)
	(j["hips"] as Node3D).position = Vector3(pose.hxo, 0.9 + pose.hy - lift, 0)
	_rot("torso", pose.tx, pose.ty, pose.tz)
	_rot("head", pose.hx, pose.hdy, 0)
	_rot("shF", pose.sFx, 0, pose.sFz)
	_rot("elF", pose.eFx, 0, 0)
	_rot("shB", pose.sBx, 0, -pose.sBz)
	_rot("elB", pose.eBx, 0, 0)
	_rot("hipF", pose.lFx, 0, 0)
	_rot("kneeF", pose.kFx, 0, 0)
	_rot("hipB", pose.lBx, 0, 0)
	_rot("kneeB", pose.kBx, 0, 0)
	_rot("weap", pose.wx, 0, pose.wz)
	body_mat.albedo_color = Color(Color("e3343f") if hit_flash > 0 else col, body_mat.albedo_color.a)
	if scarf_mesh:
		var still := 1.0 if Vector2(vel.x, vel.z).length() < 1.0 else 0.0
		scarf_mesh.clear_surfaces()
		scarf_mesh.surface_begin(Mesh.PRIMITIVE_LINE_STRIP, scarf_mat)
		for i in 7:
			scarf_mesh.surface_add_vertex(Vector3(sin(time * 7.0 - i * 0.8) * 0.025 * i,
				0.52 - i * 0.02 - still * i * 0.06, -0.11 - i * (0.1 + (1.0 - still) * 0.03)))
		scarf_mesh.surface_end()


func set_blade_color(c: Color) -> void:
	for l in labels:
		l.modulate = Color(c, l.modulate.a)


func set_blade_glow(k: float) -> void:
	var c: Color = wp["color"]
	for l in labels:
		l.modulate = Color(c.lightened(clampf(k, 0.0, 0.8)), l.modulate.a)


## Fade the whole body (used for the dead).
func set_alpha(a: float) -> void:
	if body_mat.transparency != BaseMaterial3D.TRANSPARENCY_ALPHA:
		body_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	body_mat.albedo_color.a = a
	for o in occluders:  # a fading body must not leave a dark silhouette
		o.visible = a > 0.99
	for l in labels:
		l.modulate.a = a
	rig.visible = a > 0.01


func free_body() -> void:
	if is_instance_valid(rig):
		rig.queue_free()
