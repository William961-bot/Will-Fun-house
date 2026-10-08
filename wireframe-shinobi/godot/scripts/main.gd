extends Node3D
## Shadows Wired Twice: Godot port.
## Stage 1: world, the Wolf, camera, movement, evasion, swings.
## Stage 2: enemies with stance-switching move sets, deflects, posture, deathblows, Mikiri, perfect dodge,
## the adaptive boss, health, death and resurrection, idols.
## Level 2: the digital void, teleporting ninjas, the Hollow mask and Getsuga Tensho, and Mugen Ashina.

const INK := Color("0a0c13")
const MIST := Color("4a5470")
const BONE := Color("e9e3d1")
const DIM := Color("8b8fa3")
const BLOOD := Color("e3343f")
const GOLD := Color("f2b441")
const PB := Color("8fe6f2")
const EB := Color("f3a36f")
const BOSS_C := Color("f3dccb")
const PETAL := Color("d98fa8")
const TORII := Color("a8323a")
const SR := 22050
const VIOLET := Color("9b7bff")
const MUGEN_C := Color("7fd8ff")
const LEVEL_SCENES := {1: "res://world.tscn", 2: "res://void.tscn"}

var ARENA := Vector3(0, 0, 102)  # read from World/Arena at startup
const ARENA_R := 15.0
var IDOLS: Array = []  # read from World/Idols at startup, in order

var mono: SystemFont
var serif: SystemFont
var cam: Camera3D
var hud
var player: Fighter
var enemies: Array = []
var P := {}
var WP := {}
var PATK := {}
var MOVES := {}
var SETS := {}
var TPL := {}
var T := 0.0
var hitstop := 0.0
var slow_t := 0.0
var shake := 0.0
var cam_yaw := PI
var cam_pitch := 0.28
var cam_pos := Vector3(3, 3, -3)
var input_mode := "kb"

# game flow
var mode := "title"
var checkpoint := 0
var lit := [true, false]
var locked := false
var intro_t := 0.0
var banner := {}
var big_fx := {}
var dead_t := 0.0
var win_t := 0.0
var pops: Array = []

# input buffers
var buf := {"atk": 0.0, "hvy": 0.0, "step": 0.0, "jump": 0.0, "roll": 0.0}
var step_held := 0.0
var ghost_t := 0.0

# fx
var ghosts: Array = []
var nums: Array = []
var num_i := 0
var sparks: Array = []
var spark_i := 0
var spark_mesh: ImmediateMesh
var spark_mat: StandardMaterial3D
var glow: MeshInstance3D
var glow_mat: StandardMaterial3D
var clash := {"glow_t": 0.0, "flash_t": 0.0, "flash_a": 0.0, "last": -9.0, "dodge_t": 0.0}
var vignette: GradientTexture2D
var sounds := {}
var voices: Array[AudioStreamPlayer] = []
var voice_i := 0
var moon: Node3D
var petals: CPUParticles3D
var arena_fence: MeshInstance3D
var idol_mats: Array = []
var spawn_root: Node3D
var world_env: Environment

# Level 2
var level := 1
var walk_zones: Array = []
var code_sky: Array = []
var drift: Array = []
var glitch: Array = []
var sky_t := 0.0
var projectiles: Array = []
var spawn_queue: Array = []
var domain_t := 0.0
var domain_owner: Fighter = null
var portal: Node3D = null
var beam_mesh: ImmediateMesh
var beam_mat: StandardMaterial3D
var beams: Array = []  # active Hollow Purple beams and the scars they leave

# automated screenshots
var shot_path := ""
var demo := ""
var frame_n := 0


# ================================================================== setup
func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="):
			shot_path = a.substr(7)
		if a.begins_with("--demo"):
			demo = a.substr(7) if a.length() > 7 else "roll"
		if a.begins_with("--level="):
			level = int(a.substr(8))
	mono = SystemFont.new()
	mono.font_names = PackedStringArray(["Consolas", "Cascadia Mono", "Courier New", "monospace"])
	serif = SystemFont.new()
	serif.font_names = PackedStringArray(["Yu Mincho", "MS Mincho", "Georgia", "serif"])
	P = Data.poses()
	PATK = Data.player_attacks()
	MOVES = Data.moves()
	SETS = Data.sets()
	TPL = Data.templates()
	_setup_input()
	_setup_env()
	_build_weapons()
	_build_world()
	_build_sounds()
	_build_fx()
	cam = Camera3D.new()
	cam.fov = 58
	cam.far = 900
	add_child(cam)
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = preload("res://scripts/hud.gd").new()
	hud.main = self
	layer.add_child(hud)
	if level != 1:
		load_level(level)
		mode = "title"
	else:
		reset_all("title")
	if demo != "":
		_start()


func _key(k: Key) -> InputEventKey:
	var e := InputEventKey.new()
	e.physical_keycode = k
	return e


func _mb(b: MouseButton) -> InputEventMouseButton:
	var e := InputEventMouseButton.new()
	e.button_index = b
	return e


func _jb(b: JoyButton) -> InputEventJoypadButton:
	var e := InputEventJoypadButton.new()
	e.button_index = b
	return e


func _ja(axis: JoyAxis, v: float) -> InputEventJoypadMotion:
	var e := InputEventJoypadMotion.new()
	e.axis = axis
	e.axis_value = v
	return e


func _setup_input() -> void:
	var map := {
		"move_f": [_key(KEY_W), _key(KEY_UP), _ja(JOY_AXIS_LEFT_Y, -1), _jb(JOY_BUTTON_DPAD_UP)],
		"move_b": [_key(KEY_S), _key(KEY_DOWN), _ja(JOY_AXIS_LEFT_Y, 1), _jb(JOY_BUTTON_DPAD_DOWN)],
		"move_l": [_key(KEY_A), _ja(JOY_AXIS_LEFT_X, -1), _jb(JOY_BUTTON_DPAD_LEFT)],
		"move_r": [_key(KEY_D), _ja(JOY_AXIS_LEFT_X, 1), _jb(JOY_BUTTON_DPAD_RIGHT)],
		"cam_l": [_key(KEY_LEFT), _ja(JOY_AXIS_RIGHT_X, -1)],
		"cam_r": [_key(KEY_RIGHT), _ja(JOY_AXIS_RIGHT_X, 1)],
		"cam_u": [_ja(JOY_AXIS_RIGHT_Y, -1)],
		"cam_d": [_ja(JOY_AXIS_RIGHT_Y, 1)],
		"jump": [_key(KEY_SPACE), _jb(JOY_BUTTON_A)],
		"step": [_key(KEY_SHIFT), _key(KEY_L), _jb(JOY_BUTTON_B)],
		"roll": [_key(KEY_C), _jb(JOY_BUTTON_X)],
		"attack": [_key(KEY_J), _key(KEY_ENTER), _mb(MOUSE_BUTTON_LEFT), _jb(JOY_BUTTON_RIGHT_SHOULDER)],
		"heavy": [_key(KEY_F), _ja(JOY_AXIS_TRIGGER_RIGHT, 1)],
		"guard": [_key(KEY_K), _mb(MOUSE_BUTTON_RIGHT), _jb(JOY_BUTTON_LEFT_SHOULDER), _ja(JOY_AXIS_TRIGGER_LEFT, 1)],
		"lock": [_key(KEY_Q), _key(KEY_TAB), _mb(MOUSE_BUTTON_MIDDLE), _jb(JOY_BUTTON_RIGHT_STICK)],
		"heal": [_key(KEY_E), _jb(JOY_BUTTON_Y)],
		"restart": [_key(KEY_R), _jb(JOY_BUTTON_START)],
		"mask": [_key(KEY_V), _jb(JOY_BUTTON_LEFT_STICK)],
	}
	for action in map:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.2)
		for ev in map[action]:
			InputMap.action_add_event(action, ev)


func _setup_env() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = INK
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = INK
	env.fog_density = 1.0
	env.fog_depth_begin = 22.0
	env.fog_depth_end = 105.0
	env.fog_sky_affect = 0.0
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_hdr_threshold = 0.9
	world_env = env
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


static func codes(s: String) -> Array:
	return Data.codes(s)


func _build_weapons() -> void:
	WP = Data.weapons()


# ================================================================== world
## The level lives in world.tscn (instanced as the World child of main.tscn) so it can be edited in the editor.
func _build_world() -> void:
	var w: Node3D = get_node_or_null("World")
	if w == null:  # fallback if main.tscn lost its World instance: generate the default level
		w = Node3D.new()
		w.name = "World"
		add_child(w)
		World.build(w)
	_read_world(w)


func _read_world(w: Node3D) -> void:
	moon = w.get_node("Moon")
	arena_fence = w.get_node("Arena/ArenaFence")
	petals = w.get_node("Petals")
	ARENA = (w.get_node("Arena") as Node3D).global_position
	IDOLS.clear()
	idol_mats.clear()
	for idol in w.get_node("Idols").get_children():
		IDOLS.append((idol as Node3D).global_position)
		var m := Wire.mat(DIM, 0.9)
		for c in idol.get_children():
			if c is MeshInstance3D:
				c.material_override = m
		idol_mats.append(m)
	spawn_root = w.get_node("Spawns")
	walk_zones.clear()
	var wk := w.get_node_or_null("Walkable")
	if wk != null:
		for z in wk.get_children():
			if z is WalkZone:
				walk_zones.append(z)
	code_sky.clear()
	drift.clear()
	glitch.clear()
	for n in w.find_children("*", "", true, false):
		if n.is_in_group("code_sky"):
			code_sky.append(n)
		if n.is_in_group("drift"):
			drift.append(n)
		if n.is_in_group("glitch"):
			n.set_meta("base", n.position)
			glitch.append(n)


# ================================================================== audio (synthesised once at startup)
func _buf(dur: float) -> PackedFloat32Array:
	var b := PackedFloat32Array()
	b.resize(int(dur * SR))
	return b


func _noise(b: PackedFloat32Array, dur: float, vol: float, cutoff: float, hp: bool = false) -> void:
	var n := mini(b.size(), int(dur * SR))
	var y := 0.0
	var a := clampf(cutoff / SR * TAU, 0.001, 1.0)
	for i in n:
		var x := randf() * 2.0 - 1.0
		y += (x - y) * a
		var s := x - y if hp else y
		b[i] += s * vol * exp(-6.0 * i / n)


## shape: 0 sine, 1 saw, 2 square, 3 triangle
func _tone(b: PackedFloat32Array, f0: float, f1: float, dur: float, vol: float, shape: int = 0) -> void:
	var n := mini(b.size(), int(dur * SR))
	var phase := 0.0
	for i in n:
		var t := float(i) / n
		phase += f0 * pow(f1 / f0, t) / SR
		var s := sin(phase * TAU)
		match shape:
			1: s = (fmod(phase, 1.0) * 2.0 - 1.0) * 0.6
			2: s = signf(s) * 0.5
			3: s = absf(fmod(phase, 1.0) * 4.0 - 2.0) - 1.0
		b[i] += s * vol * exp(-5.0 * t)


func _wav(b: PackedFloat32Array) -> AudioStreamWAV:
	var data := PackedByteArray()
	data.resize(b.size() * 2)
	for i in b.size():
		data.encode_s16(i * 2, int(clampf(b[i], -1.0, 1.0) * 32000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = SR
	w.stereo = false
	w.data = data
	return w


func _build_sounds() -> void:
	var b: PackedFloat32Array
	b = _buf(0.14); _noise(b, 0.14, 0.5, 1800); sounds["swing"] = _wav(b)
	b = _buf(0.08); _noise(b, 0.08, 0.35, 900); sounds["jump"] = _wav(b)
	b = _buf(0.32); _noise(b, 0.32, 0.5, 400); _noise(b, 0.12, 0.2, 1600); sounds["roll"] = _wav(b)
	b = _buf(0.12); _noise(b, 0.12, 0.45, 2600, true); _tone(b, 900, 500, 0.1, 0.08); sounds["step"] = _wav(b)
	b = _buf(0.4); _tone(b, 2400, 2400, 0.35, 0.22, 3); _tone(b, 3610, 3610, 0.25, 0.14); _tone(b, 1210, 1210, 0.2, 0.05, 2); _noise(b, 0.08, 0.28, 6000, true); sounds["clang"] = _wav(b)
	b = _buf(0.18); _tone(b, 880, 880, 0.15, 0.2, 3); _noise(b, 0.08, 0.3, 3000); sounds["block"] = _wav(b)
	b = _buf(0.18); _noise(b, 0.14, 0.6, 700); _tone(b, 160, 60, 0.15, 0.2, 1); sounds["hit"] = _wav(b)
	b = _buf(0.55); _tone(b, 180, 170, 0.5, 0.25, 1); _tone(b, 271, 271, 0.5, 0.15, 1); sounds["peril"] = _wav(b)
	b = _buf(0.5); _tone(b, 520, 90, 0.45, 0.2, 2); sounds["brk"] = _wav(b)
	b = _buf(0.65); _noise(b, 0.3, 0.7, 500); _tone(b, 90, 40, 0.6, 0.3, 1); _tone(b, 1800, 1800, 0.5, 0.1); sounds["exec"] = _wav(b)
	b = _buf(0.25); _tone(b, 1400, 300, 0.2, 0.18, 2); _noise(b, 0.1, 0.3, 2000); sounds["mikiri"] = _wav(b)
	b = _buf(0.4); _tone(b, 600, 900, 0.35, 0.25); sounds["heal"] = _wav(b)
	b = _buf(1.4); _tone(b, 110, 40, 1.4, 0.3, 1); sounds["die"] = _wav(b)
	b = _buf(0.8); _tone(b, 660, 660, 0.6, 0.2); _tone(b, 990, 990, 0.8, 0.14); sounds["idol"] = _wav(b)
	b = _buf(0.32); _tone(b, 220, 330, 0.25, 0.14, 2); _tone(b, 440, 660, 0.3, 0.12, 3); sounds["adapt"] = _wav(b)
	b = _buf(0.2); _tone(b, 330, 990, 0.18, 0.16, 2); _noise(b, 0.05, 0.25, 4000, true); sounds["read"] = _wav(b)
	# parry: sharp transient + inharmonic metal partials + a short body thump
	b = _buf(0.5); _noise(b, 0.022, 0.6, 7500, true)
	for m in [[1.0, 0.2, 0.5], [1.51, 0.12, 0.34], [2.37, 0.08, 0.24], [3.11, 0.05, 0.16]]:
		_tone(b, 2150.0 * m[0], 2150.0 * m[0], m[2], m[1])
	_tone(b, 430, 170, 0.09, 0.15, 3); sounds["parry"] = _wav(b)
	b = _buf(0.6); _noise(b, 0.35, 0.3, 900); _tone(b, 1760, 1320, 0.6, 0.14); _tone(b, 2637, 1975, 0.5, 0.08); _tone(b, 220, 110, 0.4, 0.12, 3); sounds["perfect"] = _wav(b)
	b = _buf(0.25); _noise(b, 0.18, 0.3, 5000, true); _tone(b, 3300, 2200, 0.25, 0.07); sounds["shatter"] = _wav(b)
	b = _buf(0.14); _noise(b, 0.08, 0.4, 5000, true); _tone(b, 400, 2400, 0.12, 0.12, 2); sounds["blink"] = _wav(b)
	b = _buf(0.12); _noise(b, 0.1, 0.35, 2500); _tone(b, 1800, 900, 0.08, 0.08); sounds["throw"] = _wav(b)
	b = _buf(0.5); _noise(b, 0.5, 0.5, 600); sounds["smoke"] = _wav(b)
	b = _buf(1.0); _tone(b, 90, 55, 1.0, 0.3, 1); _tone(b, 180, 110, 0.9, 0.15, 2); _noise(b, 0.8, 0.4, 400); sounds["roar"] = _wav(b)
	b = _buf(0.6); _noise(b, 0.5, 0.5, 900); _tone(b, 220, 70, 0.6, 0.25, 1); _tone(b, 1600, 600, 0.3, 0.08); sounds["getsuga"] = _wav(b)
	b = _buf(0.5); _tone(b, 1320, 1320, 0.5, 0.15); _tone(b, 1980, 1980, 0.4, 0.08); _tone(b, 660, 660, 0.5, 0.06, 3); sounds["infinity"] = _wav(b)
	b = _buf(0.5); _tone(b, 300, 900, 0.5, 0.12); _tone(b, 450, 1350, 0.5, 0.06); sounds["charge"] = _wav(b)
	b = _buf(1.35); _tone(b, 150, 900, 1.35, 0.15); _tone(b, 225, 1350, 1.35, 0.06, 1); sounds["purple_charge"] = _wav(b)
	b = _buf(0.8); _noise(b, 0.7, 0.6, 300); _tone(b, 110, 55, 0.8, 0.25, 1); sounds["beam"] = _wav(b)
	b = _buf(2.0); _tone(b, 55, 50, 2.0, 0.25, 1); _tone(b, 82, 80, 2.0, 0.15); _tone(b, 1760, 880, 1.5, 0.05); sounds["domain"] = _wav(b)
	b = _buf(1.0); _tone(b, 220, 440, 1.0, 0.12); _tone(b, 330, 660, 1.0, 0.08); sounds["portal"] = _wav(b)
	for i in 12:
		var v := AudioStreamPlayer.new()
		add_child(v)
		voices.append(v)


func play(n: String, vol_db: float = -6.0, pitch_var: float = 0.05) -> void:
	var v := voices[voice_i]
	voice_i = (voice_i + 1) % voices.size()
	v.stream = sounds[n]
	v.volume_db = vol_db
	v.pitch_scale = randf_range(1.0 - pitch_var, 1.0 + pitch_var)
	v.play()


# ================================================================== fx
func _build_fx() -> void:
	for i in 220:
		var l := Label3D.new()
		l.font = mono
		l.font_size = 48
		l.outline_size = 0
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		l.shaded = false
		l.visible = false
		add_child(l)
		nums.append({"lab": l, "vel": Vector3.ZERO, "life": 0.0, "max": 1.0, "grav": 0.0})
	# streak sparks for weapon clashes
	spark_mat = StandardMaterial3D.new()
	spark_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	spark_mat.vertex_color_use_as_albedo = true
	spark_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	spark_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	spark_mesh = ImmediateMesh.new()
	var sm := MeshInstance3D.new()
	sm.mesh = spark_mesh
	add_child(sm)
	for i in 72:
		sparks.append({"p": Vector3.ZERO, "v": Vector3.ZERO, "life": 0.0, "max": 1.0})
	# contact glow
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 0.96, 1))
	g.set_color(1, Color(0.95, 0.7, 0.25, 0))
	g.add_point(0.25, Color(1, 0.84, 0.5, 0.85))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(1.0, 0.5)
	glow_mat = Wire.mat(Color.WHITE, 1.0, true, true)
	glow_mat.albedo_texture = gt
	glow_mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	glow_mat.no_depth_test = true
	var gq := QuadMesh.new()
	gq.size = Vector2(1, 1)
	glow = MeshInstance3D.new()
	glow.mesh = gq
	glow.material_override = glow_mat
	glow.visible = false
	add_child(glow)
	# Hollow Purple beams and their floor scars
	beam_mat = StandardMaterial3D.new()
	beam_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	beam_mat.vertex_color_use_as_albedo = true
	beam_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	beam_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	beam_mesh = ImmediateMesh.new()
	var bmi := MeshInstance3D.new()
	bmi.mesh = beam_mesh
	add_child(bmi)
	# cool vignette for slow motion
	var vg := Gradient.new()
	vg.set_color(0, Color(PB, 0))
	vg.set_color(1, Color(PB, 0.9))
	vg.add_point(0.55, Color(PB, 0))
	vignette = GradientTexture2D.new()
	vignette.gradient = vg
	vignette.fill = GradientTexture2D.FILL_RADIAL
	vignette.fill_from = Vector2(0.5, 0.5)
	vignette.fill_to = Vector2(1.05, 0.5)


func spawn_num(p: Vector3, txt: String, color: Color, v: Vector3, life: float, size: float, grav: float) -> void:
	var q: Dictionary = nums[num_i]
	num_i = (num_i + 1) % nums.size()
	var l: Label3D = q["lab"]
	l.text = txt
	l.modulate = color
	l.pixel_size = size / 48.0
	l.global_position = p
	l.visible = true
	q["vel"] = v
	q["life"] = life
	q["max"] = life
	q["grav"] = grav


func burst(p: Vector3, list: Array, color: Color, n: int, spd: float, up: float = 2.0) -> void:
	for i in n:
		var v := Vector3(randf_range(-1, 1), randf_range(-0.3, 1), randf_range(-1, 1)).normalized() * spd * randf_range(0.35, 1.2)
		v.y += up
		spawn_num(p, str(list[randi() % list.size()]), color, v, randf_range(0.45, 0.9), randf_range(0.12, 0.2), 7)


func spawn_sparks(p: Vector3, n: int, spd: float) -> void:
	for i in n:
		var s: Dictionary = sparks[spark_i]
		spark_i = (spark_i + 1) % sparks.size()
		s["p"] = p
		s["v"] = Vector3(randf_range(-1, 1), randf_range(-0.2, 1), randf_range(-1, 1)).normalized() * spd * randf_range(0.5, 1.3)
		s["life"] = randf_range(0.1, 0.24)
		s["max"] = s["life"]


func pop(p: Vector3, txt: String, color: Color, size: int = 13, dur: float = 1.1) -> void:
	pops.append({"pos": p, "txt": txt, "color": color, "size": size, "t": 0.0, "dur": dur})


func big(txt: String, color: Color, sub: String) -> void:
	big_fx = {"txt": txt, "color": color, "sub": sub, "t": 0.0, "dur": 1.5}


func add_shake(v: float) -> void:
	shake = maxf(shake, v)
	if input_mode == "pad" and Input.get_connected_joypads().size() > 0:
		Input.start_joy_vibration(Input.get_connected_joypads()[0], minf(1.0, v * 5), minf(1.0, v * 3), 0.08 + v * 0.4)


func make_ghost(f: Fighter, color: Color, alpha: float, life: float) -> Dictionary:
	var g: Node3D = f.rig.duplicate()
	add_child(g)
	g.transform = f.rig.transform
	var m := Wire.mat(color, alpha, true, true)
	var labs: Array = []
	_ghostify(g, m, labs, color, alpha)
	var d := {"node": g, "mat": m, "labs": labs, "life": life, "max": life, "base": alpha,
		"pending": false, "perfect": false, "shattered": false}
	ghosts.append(d)
	return d


func _ghostify(n: Node, m: Material, labs: Array, color: Color, alpha: float) -> void:
	for c in n.get_children():
		if c is Label3D:
			c.modulate = Color(color, alpha)
			labs.append(c)
		elif c is MeshInstance3D:
			if c.name == "Scarf" or c.name == "Occ":
				c.visible = false
			else:
				c.material_override = m
		_ghostify(c, m, labs, color, alpha)


func _clear_ghosts() -> void:
	for g in ghosts:
		g["node"].queue_free()
	ghosts.clear()


## dodge/roll start: leave a hidden snapshot where the player stood; a perfect dodge reveals it
func _begin_evade(p: Fighter) -> void:
	if p.start_ghost != null:
		p.start_ghost["pending"] = false
		p.start_ghost["life"] = 0.0
	var g := make_ghost(p, PB, 0.0, 1.0)
	g["pending"] = true
	g["node"].visible = false
	p.start_ghost = g
	ghost_t = 0.0


func _update_fx(dt: float, rdt: float) -> void:
	for q in nums:
		var l: Label3D = q["lab"]
		if not l.visible:
			continue
		q["life"] -= dt
		if q["life"] <= 0:
			l.visible = false
			continue
		var v: Vector3 = q["vel"]
		v.y -= q["grav"] * dt
		q["vel"] = v
		l.global_position += v * dt
		l.modulate.a = clampf(q["life"] / q["max"], 0, 1)
	for i in range(ghosts.size() - 1, -1, -1):
		var g: Dictionary = ghosts[i]
		if g["pending"]:
			continue
		g["life"] -= dt
		var k := clampf(g["life"] / g["max"], 0.0, 1.0)
		var a: float = g["base"] * k * k
		if g["perfect"]:
			var age: float = g["max"] - g["life"]
			if not g["shattered"] and age > 0.2:  # the blade passes through the ghost and it breaks into its codes
				g["shattered"] = true
				play("shatter", -8)
				var c: Vector3 = g["node"].position + Vector3(0, 1.2, 0)
				burst(c, player.wp["codes"], PB, 16, 3, 1.5)
				spawn_sparks(c, 8, 5)
			a = g["base"] * k * k if g["shattered"] else g["base"] * (0.75 + 0.25 * sin(T * 45))
			if g["shattered"]:
				g["node"].scale *= 1.0 + dt * 0.5
		if g["life"] <= 0:
			g["node"].queue_free()
			ghosts.remove_at(i)
			continue
		var gm: StandardMaterial3D = g["mat"]
		gm.albedo_color.a = a
		for l in g["labs"]:
			l.modulate.a = a
	# sparks and glow run on real time so they keep flying through hitstop
	spark_mesh.clear_surfaces()
	var any := false
	for s in sparks:
		if s["life"] > 0:
			any = true
			break
	if any:
		spark_mesh.surface_begin(Mesh.PRIMITIVE_LINES, spark_mat)
		for s in sparks:
			if s["life"] <= 0:
				continue
			s["life"] -= rdt
			var v: Vector3 = s["v"]
			v.y -= 9.0 * rdt
			s["v"] = v
			s["p"] += v * rdt
			var k := maxf(0.0, s["life"] / s["max"])
			spark_mesh.surface_set_color(Color(k, k, k * 0.9, k))
			spark_mesh.surface_add_vertex(s["p"])
			spark_mesh.surface_set_color(Color(k * 0.5, k * 0.39, k * 0.17, k))
			spark_mesh.surface_add_vertex(s["p"] - v * 0.035)
		spark_mesh.surface_end()
	if clash["glow_t"] > 0:
		clash["glow_t"] -= rdt
		var k := maxf(0.0, clash["glow_t"] / 0.09)
		glow.visible = k > 0
		glow_mat.albedo_color.a = k
		glow.scale = Vector3.ONE * (0.5 + (1.0 - k) * 0.9)
	clash["flash_t"] = maxf(0.0, clash["flash_t"] - rdt)
	clash["dodge_t"] = maxf(0.0, clash["dodge_t"] - rdt)
	for q in pops:
		q["t"] += dt
	pops = pops.filter(func(q): return q["t"] < q["dur"])
	if not big_fx.is_empty():
		big_fx["t"] += dt
		if big_fx["t"] > big_fx["dur"]:
			big_fx = {}
	if not banner.is_empty():
		banner["t"] += dt
		if banner["t"] > banner["dur"]:
			banner = {}


# ================================================================== game flow
func _spawn_all(only_boss: bool) -> void:
	for e in enemies:
		e.free_body()
	enemies.clear()
	for sp in spawn_root.get_children():
		if not sp is SpawnPoint or (only_boss and not TPL[sp.enemy].get("boss", false)):
			continue
		var e := _mk_enemy(sp.enemy, sp.global_position)
		e.yaw = sp.global_rotation.y
		enemies.append(e)


func _mk_enemy(type: String, at: Vector3) -> Fighter:
	var t: Dictionary = TPL[type]
	var e := Fighter.new(self, {"wp": WP[t["wp"]], "col": t["col"], "sc": t["sc"], "hat": t["hat"]}, mono, P["idle"])
	e.type = type
	e.display_name = t["name"]
	e.sub = t.get("sub", "")
	e.max_hp = t["max_hp"]
	e.hp = e.max_hp
	e.hp_lag = e.hp
	e.max_post = t["max_post"]
	e.speed = t["speed"]
	e.reach = t["reach"]
	e.deflect = t["deflect"]
	e.marks = t["marks"]
	e.max_marks = t["marks"]
	e.is_boss = t.get("boss", false)
	e.adaptive = t.get("adaptive", false)
	e.cd_r = t["cd"]
	e.cd = randf_range(e.cd_r.x, e.cd_r.y)
	e.sets = SETS[t["sets"]]
	e.set_t = randf_range(5, 9)
	e.pos = at
	e.yaw = PI
	return e


func reset_all(m: String) -> void:
	mode = m
	checkpoint = 0
	lit = []
	for i in IDOLS.size():
		lit.append(i == 0)
	_respawn_common()


func respawn() -> void:
	mode = "play"
	_respawn_common()


func _respawn_common() -> void:
	_clear_ghosts()
	_spawn_all(checkpoint > 0 and checkpoint == IDOLS.size() - 1)
	if player:
		player.free_body()
	player = Fighter.new(self, {"is_player": true, "wp": WP["kusabimaru"]}, mono, P["wolf"])
	player.is_player = true
	player.mask_unlocked = level >= 2
	for q in projectiles:
		q["node"].queue_free()
	projectiles.clear()
	spawn_queue.clear()
	beams.clear()
	domain_t = 0.0
	if world_env != null:
		_apply_level_env()
	var start: Node3D = spawn_root.get_node_or_null("PlayerStart")
	if checkpoint == 0 and start != null:
		player.pos = start.global_position
		player.yaw = start.global_rotation.y
	else:
		player.pos = IDOLS[checkpoint] + Vector3(-2.2, 0, 1.5)
	locked = false
	intro_t = 0.0
	dead_t = 0.0
	win_t = 0.0
	banner = {}
	big_fx = {}
	pops.clear()
	cam_yaw = 0.0 if mode != "title" else cam_yaw


func _start() -> void:
	mode = "play"
	cam_yaw = player.yaw
	cam_pitch = 0.28
	if demo == "":
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		cam_yaw -= ev.relative.x * 0.0026
		cam_pitch = clampf(cam_pitch + ev.relative.y * 0.002, -0.15, 0.95)
	if (ev is InputEventKey or ev is InputEventMouseButton) and ev.is_pressed():
		input_mode = "kb"
	if ev is InputEventJoypadButton or (ev is InputEventJoypadMotion and absf(ev.axis_value) > 0.4):
		input_mode = "pad"
	if ev is InputEventKey and ev.is_pressed() and ev.physical_keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		return
	if ev is InputEventMouseButton and ev.is_pressed() and mode == "play" and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if mode == "title" and ev.is_pressed() and not ev is InputEventMouseMotion:
		if ev is InputEventJoypadMotion and absf(ev.axis_value) < 0.5:
			return
		if ev is InputEventKey and ev.physical_keycode == KEY_2 and level != 2:  # shortcut: start in the void
			load_level(2)
		_start()


# ================================================================== combat
func alive_foes() -> Array:
	return enemies.filter(func(e): return e.alive and e.state != "dead")


func adapt_lvl(e: Fighter, t: String) -> int:
	if not e.adaptive or not e.adapt.has(t):
		return 0
	return clampi(int(floor(e.adapt[t])) - 1, 0, 3)


func mid(a: Fighter, b: Fighter, y: float = 1.3) -> Vector3:
	return Vector3((a.pos.x + b.pos.x) / 2.0, maxf(a.pos.y, b.pos.y) + y, (a.pos.z + b.pos.z) / 2.0)


func head_pos(e: Fighter, h: float) -> Vector3:
	return Vector3(e.pos.x, e.pos.y + h * e.sc, e.pos.z)


func break_enemy(e: Fighter, by_hp: bool) -> void:
	e.state = "broken"
	e.st = 0.0
	e.vel = Vector3.ZERO
	e.peril = 0.0
	e.spin = 0.0
	e.broken_dur = 1e9 if by_hp else (3.0 if e.is_boss else 2.6)
	e.post = e.max_post
	play("brk")
	burst(e.chest(), e.wp["codes"], GOLD, 14, 3)


func check_break(e: Fighter) -> void:
	if e.post >= e.max_post and e.state != "broken" and e.state != "dead":
		break_enemy(e, false)


func kill_player() -> void:
	var p := player
	p.hp = 0
	p.state = "dead"
	p.st = 0.0
	p.vel = Vector3.ZERO
	mode = "dead"
	dead_t = 0.0
	play("die")
	add_shake(0.25)


func break_player(dmg: float) -> void:
	var p := player
	p.state = "broken"
	p.st = 0.0
	p.post = p.max_post
	p.hp -= dmg
	p.hit_flash = 0.2
	play("brk")
	add_shake(0.15)
	pop(head_pos(p, 2.3), "POSTURE BROKEN", GOLD, 12)
	if p.hp <= 0:
		kill_player()


func adapt_hit(e: Fighter, t: String) -> void:
	if not e.adaptive or not e.adapt.has(t):
		return
	var before := adapt_lvl(e, t)
	e.adapt[t] = minf(4.0, e.adapt[t] + (0.5 if t == "light" else 1.0))
	for k in Data.ATYPES:
		if k != t:
			e.adapt[k] = maxf(0.0, e.adapt[k] - 0.5)
	var after := adapt_lvl(e, t)
	if after > before:
		e.adapt_flash[t] = 1.2
		play("adapt", -8)
		var msg := "HE READS YOUR %s" % Data.ALABEL[t] if after == 3 else "ADAPTING TO %s · LV %d" % [Data.ALABEL[t], after]
		pop(head_pos(e, 2.9), msg, BLOOD if after == 3 else BOSS_C, 13, 1.6)


## Genichiro's read of your dodging: the highest level he has on whichever evade you are in (or either).
func _dodge_lvl(e: Fighter) -> int:
	if not e.adaptive:
		return 0
	var p := player
	if p.state == "dodge":
		return adapt_lvl(e, "step")
	if p.state == "roll":
		return adapt_lvl(e, "roll")
	return maxi(adapt_lvl(e, "step"), adapt_lvl(e, "roll"))


## Every step or roll made near an adaptive boss teaches him a little. Fully read, he punishes where you land.
func _note_evade(p: Fighter, kind: String) -> void:
	for e in alive_foes():
		if not e.adaptive or not e.aggro or p.flat_to(e)["d"] > 6.0:
			continue
		var before := adapt_lvl(e, kind)
		e.adapt[kind] = minf(4.0, e.adapt[kind] + 0.5)
		for k in Data.DTYPES:
			if k != kind:
				e.adapt[k] = maxf(0.0, e.adapt[k] - 0.25)
		var after := adapt_lvl(e, kind)
		if after > before:
			e.adapt_flash[kind] = 1.2
			play("adapt", -8)
			var msg := "HE READS YOUR %s" % Data.ALABEL[kind] if after == 3 else "STUDYING YOUR %s · LV %d" % [Data.ALABEL[kind], after]
			pop(head_pos(e, 2.9), msg, BLOOD if after == 3 else BOSS_C, 13, 1.6)
		if after >= 3 and e.state in ["idle", "walk", "run", "guard"] and randf() < 0.8:
			_start_move(e, "readStep" if kind == "step" else "readRoll")
			play("read", -6)
			pop(head_pos(e, 2.9), "READ: " + Data.ALABEL[kind], BLOOD, 14, 1.1)


## Level 2: you dodge during his wind-up, so he holds the swing until your invulnerability runs out.
func _delay_for_dodge(e: Fighter) -> void:
	if not e.adaptive or e.get_meta("delayed", false):
		return
	var p := player
	var kind := "step" if p.state == "dodge" else ("roll" if p.state == "roll" else "")
	if kind == "" or p.st > 0.12 or adapt_lvl(e, kind) < 2:
		return
	e.set_meta("delayed", true)
	e.st -= 0.3 if kind == "step" else 0.45
	pop(head_pos(e, 2.7), "DELAYED", BOSS_C, 11, 0.7)


func strike_enemy(e: Fighter, A: Dictionary) -> void:
	if e.state == "dead" or e.state == "broken":
		return
	if e.decoy:
		_shatter_decoy(e)
		return
	var p := player
	var c := mid(p, e)
	var pierce: bool = A.get("pierce", false) or p.masked > 0
	if e.type == "mugen" and e.inf_down <= 0 and not pierce and e.state != "fatigue":
		_infinity_block(e, c)
		return
	if e.is_boss and e.evade_t > 0 and e.counter_type == A["type"]:  # he saw this coming
		if A["type"] == "light" or A["type"] == "aerial":
			play("clang")
			burst(c, e.wp["codes"], GOLD, 10, 3)
			hitstop = 0.05
			p.post += 16
			p.post_cool = 1.0
			if p.post >= p.max_post:
				break_player(6)
		else:
			pop(c + Vector3(0, 0.9, 0), "EVADED", BOSS_C, 12, 0.8)
		return
	var lvl := adapt_lvl(e, A["type"])
	var fb := 1.6 if p.focus_t > 0 else 1.0  # counter window after a perfect dodge
	if fb > 1.0:
		p.focus_t = 0.0
		pop(c + Vector3(0, 1, 0), "COUNTER", PB, 13, 0.9)
		burst(c, p.wp["codes"], PB, 8, 3)
	if p.masked > 0:
		fb *= 1.4
	if e.tele_t > 0:  # caught frozen right after a teleport
		fb *= 1.5
		pop(c + Vector3(0, 1.2, 0), "PUNISH", PB, 12, 0.7)
	if e.state == "guard" and e.facing(p) > 0.3:
		if e.force_deflect or randf() < e.deflect:
			play("clang")
			burst(c, e.wp["codes"], GOLD, 10, 3)
			hitstop = 0.05
			add_shake(0.06)
			p.post += 14
			p.post_cool = 1.0
			e.post += 2
			e.state = "idle"
			e.st = 0.0
			e.cd = minf(e.cd, 0.12)
			if p.post >= p.max_post:
				break_player(6)
		else:
			play("block")
			burst(c, p.wp["codes"], GOLD, 5, 2)
			e.post += A["post"] * fb * A.get("guard_break", 1.0) * (0.9 if e.is_boss else 1.3)
			e.post_cool = 1.2
			var f := p.fwd() * 2.0
			e.vel = Vector3(f.x, 0, f.y)
			e.guard_hits += 1
			if e.guard_hits >= 2:
				e.guard_hits = 0
				e.state = "idle"
				e.cd = 0.0
		adapt_hit(e, A["type"])
		check_break(e)
		return
	var dmg: float = A["dmg"] * (maxf(0.3, 1.0 - 0.22 * lvl) if lvl > 0 else 1.0) * (1.3 if p.masked > 0 else 1.0)
	e.hp -= dmg
	_rage(p, 3.0)
	e.post += A["post"] * fb
	e.post_cool = 1.2
	e.hit_flash = 0.12
	e.kick("tx", -6.0)
	e.kick("hx", -8.0)
	e.kick("ty", randf_range(-5.0, 5.0))
	e.guard_hits = 0
	play("hit")
	burst(c, codes("BLOOD"), BLOOD, 8, 2.5)
	add_shake(0.05)
	if e.is_boss:
		adapt_hit(e, A["type"])
		e.guard_bias = minf(0.35, e.guard_bias + 0.1)
		if (e.state == "idle" or e.state == "walk") and randf() < 0.5:
			e.state = "hurt"
			e.st = 0.14
	elif not (e.state == "attack" and e.mv["strikes"][e.si]["peril"] != ""):
		e.state = "hurt"
		e.st = 0.0
		var f := p.fwd() * 2.5
		e.vel = Vector3(f.x, 0, f.y)
	if e.hp <= 0:
		e.hp = 0
		break_enemy(e, true)
		return
	check_break(e)


func execute(e: Fighter) -> void:
	var p := player
	p.state = "execute"
	p.st = 0.0
	p.yaw = p.yaw_to(e)
	p.vel = Vector3.ZERO
	e.marks -= 1
	hitstop = 0.14
	add_shake(0.3)
	play("exec")
	burst(e.chest(), e.wp["codes"], BLOOD, 26, 4)
	burst(e.chest(), p.wp["codes"], PB, 12, 3)
	big("忍殺", BLOOD, "SHINOBI EXECUTION")
	var f := p.fwd()
	if e.marks > 0 and e.type == "mugen":  # no reset: the fight simply gets worse
		e.hp = maxf(e.hp, e.max_hp * 0.25)
		e.hp_lag = e.hp
		e.post = 0
		e.state = "recoil"
		e.st = 0.0
		e.recoil_dur = 1.4
		e.vel = Vector3(f.x * 5, 0, f.y * 5)
		e.tm *= 0.9
		e.speed *= 1.1
		banner = {"title": e.display_name, "sub": "He laughs. The void only deepens.", "t": 0.0, "dur": 2.6}
		return
	if e.marks <= 0:
		e.state = "dead"
		e.st = 0.0
		e.alive = false
		e.hp = 0
		e.vel = Vector3(f.x * 3, 0, f.y * 3)
		e.peril = 0.0
		if p.lock == e:
			p.lock = null
	else:  # the boss rises for a second phase
		e.hp = e.max_hp
		e.hp_lag = e.hp
		e.post = 0
		e.state = "recoil"
		e.st = 0.0
		e.recoil_dur = 1.8
		e.vel = Vector3(f.x * 5, 0, f.y * 5)
		e.phase = 2
		e.tm = 0.82
		e.speed *= 1.15
		e.sets = SETS["boss2"]
		e.set_idx = 1
		e.set_t = randf_range(7, 10)
		e.set_flash = 2.5
		for k in e.adapt:
			e.adapt[k] = maxf(0.0, e.adapt[k] - 1.0)
		banner = {"title": e.display_name, "sub": "Lightning answers. He still remembers how you fight.", "t": 0.0, "dur": 2.6}


func mikiri(e: Fighter) -> void:
	var p := player
	play("mikiri")
	hitstop = 0.08
	add_shake(0.12)
	e.post += 45 if e.is_boss else 60
	e.post_cool = 1.5
	e.state = "recoil"
	e.st = 0.0
	e.recoil_dur = 0.8
	e.peril = 0.0
	var f := e.fwd()
	e.vel = Vector3(-f.x * 3, 0, -f.y * 3)
	p.state = "mikiri"
	p.st = 0.0
	p.vel = Vector3.ZERO
	p.air = true
	p.vy = 3.5
	p.yaw = p.yaw_to(e)
	burst(mid(p, e, 0.4), e.wp["codes"], GOLD, 12, 3)
	pop(head_pos(p, 2.4), "MIKIRI COUNTER", PB, 13)
	_rage(p, 15.0)
	if e.type == "mugen":
		e.inf_down = 3.0
	check_break(e)


## where the two blades meet: between the Wolf's blade and the attacker's edge
func blade_contact(p: Fighter, e: Fighter) -> Vector3:
	var a := p.tip_a.global_position.lerp(p.tip_b.global_position, 0.45)
	var b := e.tip_a.global_position.lerp(e.tip_b.global_position, 0.6)
	var c := a.lerp(b, 0.5)
	var m := mid(p, e)
	return c if c.distance_to(m) < 1.4 else m


func player_deflect(e: Fighter, s: Dictionary) -> void:
	var p := player
	var rapid: bool = T - clash["last"] < 0.3
	clash["last"] = T
	var c := blade_contact(p, e)
	# everything below fires on this frame: sound, flash, sparks, glow, and the pose snap
	play("parry", -7.5 if rapid else -5.5, 0.05)
	clash["flash_t"] = 0.06
	clash["flash_a"] = 0.13 * (0.6 if rapid else 1.0)
	spawn_sparks(c, 9 if rapid else 14, 7)
	glow.global_position = c
	clash["glow_t"] = 0.09
	glow.visible = true
	glow_mat.albedo_color.a = 1.0
	glow.scale = Vector3.ONE * 0.5
	burst(c, e.wp["codes"], GOLD, 4 if rapid else 7, 2.6, 1.5)
	hitstop = 0.06
	add_shake(0.05)
	p.parry_side = not p.parry_side
	p.parry_t = 0.3
	p.kick("wx", 9.0 if p.parry_side else -9.0)
	p.kick("hx", -3.0)
	e.kick("sFx", 7.0)
	e.kick("eFx", 5.0)
	e.kick("tx", -4.0)
	var pp: Dictionary = P["parryB"] if p.parry_side else P["parryA"]
	for k in Fighter.PK:
		p.pose[k] += (pp[k] - p.pose[k]) * 0.7
	for k in ["sFx", "eFx", "sBx", "eBx", "wx", "tx"]:
		e.pose[k] += (P["hurt"][k] - e.pose[k]) * 0.45
	p.post = minf(p.max_post - 1, p.post + s["post"] * 0.22)
	p.post_cool = 0.6
	e.post += s["post"] * (0.95 if e.is_boss else 1.3) + (12.0 if s["peril"] != "" else 0.0)
	e.post_cool = 1.4
	_rage(p, 12.0)
	if e.adaptive:
		for k in Data.DTYPES:
			e.adapt[k] = maxf(0.0, e.adapt[k] - 0.75)
	if e.type == "mugen":
		e.inf_down = 3.5
		pop(head_pos(e, 2.7), "INFINITY BROKEN", MUGEN_C, 13, 1.0)
	check_break(e)


func perfect_dodge(e: Fighter) -> void:
	var p := player
	e.hit_done = true
	var g = p.start_ghost
	p.start_ghost = null
	if g != null and g["pending"]:
		g["pending"] = false
		g["perfect"] = true
		g["node"].visible = true
		g["life"] = 0.8
		g["max"] = 0.8
		g["base"] = 0.95
	slow_t = 0.42
	p.focus_t = 1.5
	p.post = maxf(0.0, p.post - 25)
	clash["dodge_t"] = 0.55
	play("perfect", -6, 0.0)
	pop(head_pos(p, 2.5), "PERFECT DODGE", PB, 14, 1.2)
	_rage(p, 8.0)


func try_enemy_hit(e: Fighter, s: Dictionary) -> void:
	var p := player
	if p.state == "dead":
		return
	var r := e.flat_to(p)
	var d: float = r["d"]
	var reach: float = e.reach * e.sc + s["extra_reach"] + 0.35 * _dodge_lvl(e)
	if d > reach + 0.3:
		return
	if not s["spin"] and d > 0.8 and e.facing(p) < 0.5:
		return
	var h := p.pos.y - e.pos.y
	if h > (3.0 if s["hits_air"] else 1.2):
		return
	if s["peril"] == "sweep" and h > 0.35:
		return
	var toward := p.dg_dir.dot(-r["n"])
	if s["peril"] == "thrust" and p.state == "dodge" and toward > 0.5 and p.st < 0.34:
		e.hit_done = true
		mikiri(e)
		return
	if (p.state == "dodge" and p.st > 0.02 and p.st < 0.24) or (p.state == "roll" and p.st > 0.04 and p.st < 0.22):
		perfect_dodge(e)
		return
	if p.state == "roll" and p.st > 0.04 and p.st < 0.4:
		return
	if p.state == "execute" or p.state == "mikiri" or p.state == "mask_on":
		return
	e.hit_done = true
	if e.decoy:  # a smoke copy's blow is only smoke
		_shatter_decoy(e)
		return
	var c := mid(p, e)
	var n: Vector2 = r["n"]
	if p.state == "guard" and p.facing(e) > 0.3 and s["peril"] != "sweep":
		if T - p.guard_press < 0.2:
			player_deflect(e, s)
			return
		if s["peril"] == "":
			play("block")
			burst(c, e.wp["codes"], GOLD, 5, 2)
			p.post += s["post"] * 0.85
			p.post_cool = 0.9
			p.kick("sFx", 4.0)
			p.kick("sBx", 4.0)
			p.kick("tx", -3.0)
			p.vel = Vector3(n.x * 3, 0, n.y * 3)
			if p.post >= p.max_post:
				break_player(s["dmg"] * 0.5)
			return
	var dmg: float = s["dmg"] * (1.3 if s["hits_air"] and p.air else 1.0)
	p.hp -= dmg
	_rage(p, dmg * 0.5)
	p.post += s["post"] * 0.5
	p.post_cool = 0.9
	p.hit_flash = 0.15
	p.state = "hurt"
	p.st = 0.0
	p.vel = Vector3(n.x * 3.5, 0, n.y * 3.5)
	p.kick("tx", -7.0)
	p.kick("hx", -9.0)
	p.kick("ty", randf_range(-5.0, 5.0))
	play("hit")
	add_shake(0.12)
	burst(p.chest(), codes("WOLF"), BLOOD, 9, 2.5)
	if p.hp <= 0:
		kill_player()
	elif p.post >= p.max_post:
		break_player(0)


# ================================================================== player
func executable() -> Fighter:
	for e in alive_foes():
		if e.state == "broken" and player.flat_to(e)["d"] < 2.4 and absf(e.pos.y - player.pos.y) < 1:
			return e
	return null


func _start_attack(type: String) -> void:
	var p := player
	if type == "light":
		var chain := T - p.last_atk_end < 0.32 and p.atk_type == "light"
		p.combo = (p.combo + 1) % 3 if chain else 0
		p.A = PATK["light"][p.combo]
	else:
		p.A = PATK[type]
	p.atk_type = type
	var tgt := p.lock
	if tgt == null:
		var bd := 3.8
		for e in alive_foes():
			var dd: float = p.flat_to(e)["d"]
			if dd < bd and p.facing(e) > -0.25:
				bd = dd
				tgt = e
	if tgt != null:
		p.yaw = p.yaw_to(tgt)
	p.aim = tgt
	p.state = "attack"
	p.st = 0.0
	p.ph = "wind"
	p.atk_id += 1
	buf["atk"] = 0.0
	buf["hvy"] = 0.0
	if type == "aerial":
		p.vy = maxf(p.vy, 1.5)


func _player_hit(A: Dictionary) -> void:
	var p := player
	var reach: float = p.reach * A.get("reach", 1.0)
	for e in alive_foes():
		var d: float = p.flat_to(e)["d"]
		if d > reach + 0.25 * e.sc:
			continue
		if d > 1 and p.facing(e) < 0.4:
			continue
		if absf(e.pos.y - p.pos.y) > 1.5:
			continue
		strike_enemy(e, A)


func _turn_to(f: Fighter, target: float, rate: float, dt: float) -> void:
	var d := angle_difference(f.yaw, target)
	f.yaw += clampf(d, -rate * dt, rate * dt)


func _to_idle(f: Fighter) -> void:
	f.state = "idle"
	f.st = 0.0


func _upd_player(dt: float) -> void:
	var p := player
	p.st += dt
	p.hit_flash -= dt
	p.focus_t -= dt
	p.hp_lag = lerpf(p.hp_lag, p.hp, 1.0 - exp(-3.0 * dt))
	for k in buf:
		buf[k] = maxf(0.0, buf[k] - dt)
	if Input.is_action_just_pressed("attack"): buf["atk"] = 0.22
	if Input.is_action_just_pressed("heavy"): buf["hvy"] = 0.22
	if Input.is_action_just_pressed("step"): buf["step"] = 0.15
	if Input.is_action_just_pressed("roll"): buf["roll"] = 0.15
	if Input.is_action_just_pressed("jump"): buf["jump"] = 0.12
	if Input.is_action_just_pressed("guard"): p.guard_press = T
	step_held = step_held + dt if Input.is_action_pressed("step") else 0.0
	if p.post_cool > 0:
		p.post_cool -= dt
	elif p.state != "broken":
		p.post = maxf(0.0, p.post - dt * (10.0 if p.state == "guard" else 24.0) * (0.35 + 0.65 * p.hp / p.max_hp))

	# lock-on
	if p.lock != null and (not p.lock.alive or p.lock.state == "dead" or p.flat_to(p.lock)["d"] > 22):
		p.lock = null
	if Input.is_action_just_pressed("lock"):
		if p.lock != null:
			p.lock = null
		else:
			var best: Fighter = null
			var bs := 1e9
			var cf := Vector2(sin(cam_yaw), cos(cam_yaw))
			for e in alive_foes():
				var r := p.flat_to(e)
				if r["d"] > 20:
					continue
				var sc: float = r["d"] * (1.6 - cf.dot(r["n"]))
				if sc < bs:
					bs = sc
					best = e
			p.lock = best

	var iv := Input.get_vector("move_l", "move_r", "move_b", "move_f")
	var cf2 := Vector2(sin(cam_yaw), cos(cam_yaw))
	var cr := Vector2(-cos(cam_yaw), sin(cam_yaw))
	var m := cf2 * iv.y + cr * iv.x
	var moving := m.length() > 0.12
	var free := p.state in ["idle", "walk", "run", "guard"]

	if p.state == "dead":
		p.vel *= exp(-6 * dt)
		p.fall = lerpf(p.fall, 1.0, 1.0 - exp(-4.0 * dt))
	elif free:
		var want := ""
		if buf["atk"] > 0:
			want = "aerial" if p.air else ("dash" if p.state == "run" else "light")
		elif buf["hvy"] > 0:
			want = "aerial" if p.air else ("getsuga" if p.masked > 0 else "heavy")
		var ex: Fighter = executable() if want != "" and not p.air else null
		if ex != null:
			buf["atk"] = 0.0
			buf["hvy"] = 0.0
			execute(ex)
		elif want != "":
			_start_attack(want)
		elif buf["step"] > 0 and not p.air:
			buf["step"] = 0.0
			var dir := (m if moving else -p.fwd()).normalized()
			p.dg_dir = dir
			_begin_evade(p)
			_note_evade(p, "step")
			p.vel = Vector3(dir.x * 11, 0, dir.y * 11)
			p.state = "dodge"
			p.st = 0.0
			play("step")
		elif buf["roll"] > 0 and not p.air:
			buf["roll"] = 0.0
			var dir := (m if moving else p.fwd()).normalized()
			p.dg_dir = dir
			_begin_evade(p)
			_note_evade(p, "roll")
			p.yaw = atan2(dir.x, dir.y)
			p.state = "roll"
			p.st = 0.0
			play("roll")
		elif Input.is_action_just_pressed("mask") and p.mask_unlocked and p.rage >= 100.0 and p.masked <= 0 and not p.air:
			_begin_mask()
		elif Input.is_action_just_pressed("heal") and p.gourd > 0 and not p.air:
			p.state = "heal"
			p.st = 0.0
			p.vel = Vector3.ZERO
			p.healed = false
		else:
			if buf["jump"] > 0 and not p.air:
				p.vy = 7.2
				p.air = true
				buf["jump"] = 0.0
				play("jump")
			var sprint := Input.is_action_pressed("step") and moving and step_held > 0.3 and not Input.is_action_pressed("guard")
			if Input.is_action_pressed("guard"):
				p.state = "guard"
			elif sprint:
				p.state = "run"
			elif moving:
				p.state = "walk"
			else:
				p.state = "idle"
			var spd := 1.7 if p.state == "guard" else (7.4 if sprint else 4.3)
			if domain_t > 0:  # the Unlimited Void drags at every step
				spd *= 0.5
			p.vel = Vector3(m.x * spd, 0, m.y * spd)
			if p.lock != null and p.state != "run":
				_turn_to(p, p.yaw_to(p.lock), 14, dt)
			elif moving:
				_turn_to(p, atan2(m.x, m.y), 12, dt)
	elif p.state == "attack":
		var A := p.A
		p.vel *= exp(-10 * dt)
		if p.ph == "wind":
			if Input.is_action_just_pressed("guard"):
				p.state = "guard"
			elif p.st >= A["wind"]:
				p.ph = "act"
				p.st = 0.0
				var f: Vector2 = p.fwd() * A["lunge"] * 10.0
				p.vel = Vector3(f.x, 0, f.y)
				play("swing")
				if A.get("wave", false):
					_fire_getsuga(p)
				else:
					_player_hit(A)
		elif p.ph == "act":
			if p.aim != null and p.flat_to(p.aim)["d"] < 1.05:
				p.vel = Vector3(0, 0, 0)
			if p.st >= A["act"]:
				p.ph = "rec"
				p.st = 0.0
		else:
			if Input.is_action_just_pressed("guard"):
				p.state = "guard"
				p.last_atk_end = T
			elif (buf["atk"] > 0 or buf["hvy"] > 0) and p.st > 0.06:
				p.last_atk_end = T
				var ex: Fighter = executable() if not p.air else null
				if ex != null:
					buf["atk"] = 0.0
					buf["hvy"] = 0.0
					execute(ex)
				else:
					_start_attack("aerial" if p.air else (("getsuga" if p.masked > 0 else "heavy") if buf["hvy"] > 0 else "light"))
			elif p.st >= A["rec"]:
				p.last_atk_end = T
				_to_idle(p)
	elif p.state == "dodge":
		p.vel *= exp(-6 * dt)
		if p.st > 0.34:
			_to_idle(p)
	elif p.state == "roll":
		var k := 1.0 if p.st < 0.42 else exp(-12 * (p.st - 0.42))
		p.vel = Vector3(p.dg_dir.x * 8.2 * k, 0, p.dg_dir.y * 8.2 * k)
		if p.st > 0.5 and (buf["atk"] > 0 or buf["hvy"] > 0):
			_start_attack("heavy" if buf["hvy"] > 0 else "light")
		elif p.st > 0.62:
			_to_idle(p)
	elif p.state == "hurt":
		p.vel *= exp(-8 * dt)
		if p.st > 0.32:
			_to_idle(p)
	elif p.state == "broken":
		p.vel *= exp(-8 * dt)
		if p.st > 1.0:
			_to_idle(p)
			p.post = p.max_post * 0.3
	elif p.state == "execute":
		p.vel = Vector3.ZERO
		if p.st > 0.6:
			_to_idle(p)
	elif p.state == "mikiri":
		p.vel *= exp(-6 * dt)
		if p.st > 0.42:
			_to_idle(p)
	elif p.state == "mask_on":
		p.vel = Vector3.ZERO
		if p.st > 0.45 and (p.mask_node == null or not p.mask_node.visible):
			_show_mask(p)
		if p.st > 0.9:
			_to_idle(p)
			p.masked = 15.0
	elif p.state == "heal":
		p.vel = Vector3.ZERO
		if not p.healed and p.st > 0.45:
			p.healed = true
			p.gourd -= 1
			p.hp = minf(p.max_hp, p.hp + 45)
			play("heal")
			burst(p.chest(), codes("HEAL"), PB, 8, 1, 2)
		if p.st > 0.85:
			_to_idle(p)

	# the mask burns the meter down, then shatters
	if p.masked > 0:
		p.masked -= dt
		p.rage = maxf(0.0, p.masked / 15.0 * 100.0)
		if p.masked <= 0:
			p.masked = 0.0
			_end_mask(p)
	if p.mask_node != null and p.mask_node.visible:
		_update_mask(p, dt)
	if domain_t > 0 and p.state != "dead":
		p.post += 9.0 * dt
		p.post_cool = 0.3
		if p.post >= p.max_post and p.state != "broken":
			break_player(0)
	# afterimages trail every step and roll; drop the unused start snapshot afterwards
	if p.state == "dodge" or p.state == "roll":
		ghost_t -= dt
		if ghost_t <= 0 and p.st > 0.03:
			make_ghost(p, PB, 0.3, 0.3)
			ghost_t = 0.045
	elif p.start_ghost != null:
		p.start_ghost["pending"] = false
		p.start_ghost["life"] = 0.0
		p.start_ghost = null
	_physics(p, dt)


func _physics(f: Fighter, dt: float) -> void:
	if f.air or f.pos.y > 0:
		f.vy -= 22.0 * dt
		f.pos.y += f.vy * dt
		if f.pos.y <= 0:
			var drop := clampf(-f.vy / 8.0, 0.0, 1.5)
			f.pos.y = 0
			f.vy = 0
			f.air = false
			f.kick("hy", -1.6 * drop)
			f.kick("kFx", 6.0 * drop)
			f.kick("kBx", 6.0 * drop)
			f.kick("tx", 3.0 * drop)
	f.pos.x += (f.vel.x + f.pull.x) * dt
	f.pos.z += (f.vel.z + f.pull.z) * dt
	f.pull *= exp(-8.0 * dt)
	var c := _clamp_pos(f, f.pos)
	f.pos.x = c.x
	f.pos.z = c.z


## Keep a point on solid ground: the arena while the duel is on, else the level's walkable zones.
func _clamp_pos(f: Fighter, v: Vector3) -> Vector3:
	if locked and (f.is_player or f.is_boss):
		var off := Vector2(v.x - ARENA.x, v.z - ARENA.z)
		var R := ARENA_R - 0.4
		if off.length() > R:
			off = off.normalized() * R
		return Vector3(ARENA.x + off.x, v.y, ARENA.z + off.y)
	if not walk_zones.is_empty():
		for z in walk_zones:
			if z.contains(v):
				return v
		var best := v
		var bd := INF
		for z in walk_zones:
			var cp: Vector3 = z.closest(v)
			var dd := Vector2(cp.x - v.x, cp.z - v.z).length()
			if dd < bd:
				bd = dd
				best = cp
		return best
	var out := v  # level 1 without zones: the fenced path
	out.z = clampf(out.z, -5.4, ARENA.z + ARENA_R - 0.4)
	var lim := 12.4 if out.z < 86 else ARENA_R
	out.x = clampf(out.x, -lim, lim)
	return out


# ================================================================== enemies
func _switch_set(e: Fighter, i: int) -> void:
	e.set_idx = i
	e.set_t = randf_range(6, 10)
	e.set_flash = 2.0


func _pick_move(e: Fighter, mset: Dictionary, d: float) -> String:
	var ok := []
	for mw in mset["moves"]:
		var r: float = MOVES[mw[0]].get("range", e.reach * e.sc + 0.45)
		if mw.size() > 2 and e.hp > e.max_hp * mw[2]:  # locked until his health drops that far
			continue
		if d <= r:
			ok.append(mw)
	if ok.is_empty():
		return ""
	var tot := 0.0
	for mw in ok:
		tot += mw[1]
	var r := randf() * tot
	for mw in ok:
		r -= mw[1]
		if r <= 0:
			return mw[0]
	return ok[0][0]


func _begin_strike(e: Fighter) -> void:
	var s: Dictionary = e.mv["strikes"][e.si]
	e.ph = "wind"
	e.st = 0.0
	e.hit_done = false
	e.spin = 0.0
	e.set_meta("delayed", false)
	if s["peril"] != "":
		e.peril = 0.95
		play("peril", -8)
	if s["tele"] != "":
		_teleport(e, s["tele"])
	match s["special"]:
		"blink_charge":
			pop(head_pos(e, 2.8), "BLINK", MUGEN_C, 13, 0.8)
			play("charge", -6)
		"blue":
			pop(head_pos(e, 2.8), "術式順転 · 蒼  BLUE", Color("4aa8ff"), 14, 1.0)
			play("charge", -5)
		"red":
			pop(head_pos(e, 2.8), "術式反転 · 赫  RED", BLOOD, 14, 1.0)
			play("charge", -5)
		"purple":
			big("虚式 · 茈", VIOLET, "HOLLOW PURPLE")
			play("purple_charge", -3)
			e.set_meta("aim", e.yaw_to(player))
			e.set_meta("beam_hit", false)
			e.set_meta("beam_fired", false)
		"domain":
			play("charge", -3)


func _start_move(e: Fighter, n: String) -> void:
	e.mv = MOVES[n]
	if n == "blinkChain":  # two or three blinks this time
		var mvd: Dictionary = (MOVES[n] as Dictionary).duplicate(true)
		var strikes: Array = mvd["strikes"]
		strikes.resize(1 + randi_range(2, 3))
		e.mv = mvd
	e.si = 0
	e.state = "attack"
	e.vel = Vector3.ZERO
	_begin_strike(e)


func _boss_counter(e: Fighter, t: String) -> void:
	e.counter_type = t
	e.evade_t = 0.75
	_start_move(e, Data.COUNTER[t])
	play("read", -6)
	pop(head_pos(e, 2.9), "READ: " + Data.ALABEL[t], BLOOD, 14, 1.1)
	if t == "heavy" or t == "dash":
		var n: Vector2 = e.flat_to(player)["n"]
		var side := -1.0 if randf() < 0.5 else 1.0
		e.vel = Vector3(-n.y * side * 11, 0, n.x * side * 11)


func _ai_free(e: Fighter, dt: float, r: Dictionary) -> void:
	var p := player
	var mset: Dictionary = e.sets[e.set_idx]
	var d: float = r["d"]
	var n: Vector2 = r["n"]
	if not e.aggro:
		if p.state != "dead" and ((not e.is_boss and d < 14) or (e.is_boss and locked)):
			e.aggro = true
			e.cd = randf_range(e.cd_r.x, e.cd_r.y)
		else:
			e.vel = Vector3.ZERO
			e.state = "idle"
			return
	if p.state == "dead" or (e.is_boss and intro_t > 0):
		e.vel = Vector3.ZERO
		e.state = "idle"
		return
	_turn_to(e, atan2(r["dx"], r["dz"]), 7, dt)
	if e.type == "mugen" and not e.domain_used and e.hp < e.max_hp * 0.2:
		_cast_domain(e)
		return
	# stance changes
	e.set_t -= dt
	var low := -1
	for i in e.sets.size():
		if e.sets[i]["low"]:
			low = i
	if low >= 0 and e.set_idx != low and e.hp < e.max_hp * 0.4:
		_switch_set(e, low)
	elif e.set_t <= 0:
		var opts := []
		for i in e.sets.size():
			if i != e.set_idx and not e.sets[i]["low"]:
				opts.append(i)
		if opts.size() > 0 and not (low >= 0 and e.set_idx == low):
			_switch_set(e, opts[randi() % opts.size()])
		else:
			e.set_t = randf_range(6, 10)
	# read the player's wind-up
	if p.state == "attack" and p.ph == "wind" and e.seen_atk != p.atk_id and d < 3.4:
		e.seen_atk = p.atk_id
		var lvl := adapt_lvl(e, p.atk_type) if e.is_boss else 0
		if lvl >= 3 and randf() < 0.85:
			_boss_counter(e, p.atk_type)
			return
		if randf() < mset["guard"] + e.guard_bias + lvl * 0.2:
			e.state = "guard"
			e.st = 0.0
			e.guard_dur = randf_range(0.45, 0.8)
			e.force_deflect = lvl >= 2
			e.vel = Vector3.ZERO
			return
	e.cd -= dt
	var want: float = mset["dist"] * e.sc
	var mv := Vector2.ZERO
	var spd := e.speed
	var run := false
	if d > want + 0.5:
		mv = n
		if d > 7:
			spd *= 1.7
			run = true
	elif d < want - 0.6:
		mv = -n * 0.7
	else:
		e.strafe_t -= dt
		if e.strafe_t <= 0:
			e.strafe_t = randf_range(1, 2.5)
			e.strafe_dir = ((-1.0 if randf() < 0.5 else 1.0) if randf() < mset["strafe"] else 0.0)
		mv = Vector2(-n.y, n.x) * e.strafe_dir * 0.45
	e.vel = Vector3(mv.x * spd, 0, mv.y * spd)
	e.state = ("run" if run else "walk") if mv.length() > 0.01 else "idle"
	if e.cd <= 0:
		var mname := _pick_move(e, mset, d)
		if mname != "":
			_start_move(e, mname)


func _upd_enemy(e: Fighter, dt: float) -> void:
	e.st += dt
	e.tele_t -= dt
	e.inf_down -= dt
	if e.decoy and e.alive:
		e.decoy_t -= dt
		if e.decoy_t <= 0:
			_shatter_decoy(e)
			return
	e.hit_flash -= dt
	e.peril -= dt
	e.set_flash -= dt
	if e.evade_t > 0:
		e.evade_t -= dt
		if e.evade_t <= 0:
			e.counter_type = ""
	for k in e.adapt_flash:
		e.adapt_flash[k] = maxf(0.0, e.adapt_flash[k] - dt)
	e.hp_lag = lerpf(e.hp_lag, e.hp, 1.0 - exp(-3.0 * dt))
	if e.adaptive:
		for k in Data.DTYPES:
			e.adapt[k] = maxf(0.0, e.adapt[k] - dt * 0.12)
	e.guard_bias = maxf(0.0, e.guard_bias - dt * 0.12)
	if e.post_cool > 0:
		e.post_cool -= dt
	elif e.state != "broken" and e.state != "dead":
		e.post = maxf(0.0, e.post - dt * (5.0 + 14.0 * e.hp / e.max_hp))
	var p := player
	var r := e.flat_to(p)
	var d: float = r["d"]
	match e.state:
		"idle", "walk", "run":
			_ai_free(e, dt, r)
		"attack":
			var s: Dictionary = e.mv["strikes"][e.si]
			e.vel *= exp(-(9.0 if e.ph == "wind" and e.counter_type != "" else 10.0) * dt)
			if e.ph == "wind":
				_turn_to(e, atan2(r["dx"], r["dz"]), 9.0 if e.is_boss else 6.0, dt)
				if s["special"] == "purple":
					_purple_charge(e, s)
				_delay_for_dodge(e)
				if e.st >= s["wind"] * e.tm:
					e.ph = "act"
					e.st = 0.0
					e.hit_done = false
					var f: Vector2 = e.fwd() * s["lunge"] * 10.0
					e.vel = Vector3(f.x, 0, f.y)
					if s["leap"] > 0:
						e.vy = s["leap"]
						e.air = true
						e.vel *= 0.45
					play("swing", -9)
					if s["proj"] > 0:
						_throw_shuriken(e, s["proj"])
					if s["smoke"]:
						_smoke_split(e)
					match s["special"]:
						"red":
							_fire_red(e)
						"domain":
							_open_domain(e)
			elif e.ph == "act":
				var track := _dodge_lvl(e)
				if track >= 1 and player.state in ["dodge", "roll"]:
					_turn_to(e, atan2(r["dx"], r["dz"]), 4.0 * track, dt)
				if s["special"] == "blue":
					_blue_pull(e)
				elif s["special"] == "purple":
					_purple_beam(e)
				if d < 1 and e.facing(p) > 0.5:
					e.vel = Vector3.ZERO
				if s["spin"]:
					e.spin = e.st / s["act"] * TAU
				if not e.hit_done and not s["nohit"] and (s["leap"] <= 0 or e.st > 0.2):
					try_enemy_hit(e, s)
				if e.state == "attack" and e.st >= s["act"]:
					e.spin = 0.0
					if not e.hit_done and s["peril"] == "sweep" and p.air and d < e.reach + 1:
						e.post += 25
						e.post_cool = 1.2
						pop(head_pos(p, 2.4), "JUMP COUNTER", PB, 12, 0.9)
						check_break(e)
					if e.state == "attack":
						e.ph = "rec"
						e.st = 0.0
			elif e.st >= s["rec"] * e.tm:
				e.si += 1
				if e.si < e.mv["strikes"].size():
					_begin_strike(e)
				elif e.mv.get("fatigue", 0.0) > 0:  # the Nurse's price: spent after a blink chain
					e.state = "fatigue"
					e.st = 0.0
					e.inf_down = e.mv["fatigue"] + 0.4
					pop(head_pos(e, 2.6), "FATIGUED", GOLD, 12, 1.0)
				else:
					e.state = "idle"
					e.st = 0.0
					e.cd = randf_range(e.cd_r.x, e.cd_r.y) * e.sets[e.set_idx]["cd_mul"] * e.tm
		"guard":
			e.vel = Vector3.ZERO
			_turn_to(e, atan2(r["dx"], r["dz"]), 10, dt)
			if e.st > e.guard_dur:
				_to_idle(e)
				e.force_deflect = false
		"hurt":
			e.vel *= exp(-8 * dt)
			if e.st > 0.32:
				_to_idle(e)
				e.cd = minf(e.cd, 0.5)
		"recoil":
			e.vel *= exp(-6 * dt)
			if e.st > e.recoil_dur:
				_to_idle(e)
		"fatigue":
			e.vel *= exp(-6 * dt)
			if e.st > e.mv.get("fatigue", 1.6):
				_to_idle(e)
				e.cd = 0.4
		"broken":
			e.vel *= exp(-8 * dt)
			if e.st > e.broken_dur:
				_to_idle(e)
				e.post = e.max_post * 0.4
		"dead":
			e.vel *= exp(-5 * dt)
			e.fall = lerpf(e.fall, 1.0, 1.0 - exp(-4.0 * dt))
	_physics(e, dt)


func _separate(a: Fighter, b: Fighter) -> void:
	var r := a.flat_to(b)
	var mn := 0.45 * (a.sc + b.sc)
	if r["d"] >= mn or absf(a.pos.y - b.pos.y) > 1:
		return
	var o: float = (mn - r["d"]) / 2.0
	var n: Vector2 = r["n"]
	a.pos.x -= n.x * o
	a.pos.z -= n.y * o
	b.pos.x += n.x * o
	b.pos.z += n.y * o


# ================================================================== animation
func _look_target(f: Fighter) -> Fighter:
	if not f.is_player:
		return player if player != null and player.state != "dead" and f.aggro else null
	if f.lock != null:
		return f.lock
	var best: Fighter = null
	var bd := 12.0
	for e in alive_foes():
		if not e.aggro:
			continue
		var d: float = f.flat_to(e)["d"]
		if d < bd:
			bd = d
			best = e
	return best


## small procedural layer on the Wolf's stance: breathing, weight shifts, grip re-settles, eyes on the foe
func _wolf_layer(f: Fighter, t: Dictionary, dt: float, full: bool) -> void:
	var I := f.idle
	if I.is_empty():
		I.merge({"grip": 0.0, "grip_next": randf_range(2.5, 5), "grip_sign": 1.0, "sac": 0.0, "sac_y": 0.0, "sac_next": 1.5})
	var bp := T * 1.75
	var breath := sin(bp) + 0.25 * sin(2 * bp)
	t.tx += 0.011 * breath
	t.hy += 0.004 * breath
	t.sFx -= 0.014 * breath
	t.sBx -= 0.014 * breath
	t.hx -= 0.007 * breath
	I.sac_next -= dt
	if I.sac_next <= 0:
		I.sac = randf_range(-0.1, 0.1)
		I.sac_y = randf_range(-0.04, 0.04)
		I.sac_next = randf_range(1.2, 3)
	var tg := _look_target(f)
	var rel := clampf(angle_difference(f.yaw, f.yaw_to(tg)), -0.7, 0.7) if tg != null else 0.0
	t.hdy += rel * 0.75 + I.sac * (0.5 if tg != null else 1.0)
	t.ty += rel * 0.12
	t.hx += I.sac_y
	if not full:
		return
	var w := sin(T * 0.8) * 0.6 + sin(T * 0.37 + 1.3) * 0.4
	t.hxo = 0.016 * w
	t.hr = -0.022 * w
	t.tz = 0.018 * w
	t.kFx += 0.05 * w
	t.kBx -= 0.05 * w
	t.hy -= 0.005 * absf(w)
	t.sFz += 0.014 * sin(T * 1.3 + 0.5)
	t.sBz += 0.011 * sin(T * 1.1 + 2)
	I.grip_next -= dt
	if I.grip_next <= 0:
		I.grip = 1.0
		I.grip_next = randf_range(3, 6)
		I.grip_sign = -1.0 if randf() < 0.5 else 1.0
	I.grip = maxf(0.0, I.grip - dt * 2.2)
	var g := sin(I.grip * PI)
	t.wx += 0.1 * g * I.grip_sign
	t.wz += 0.07 * g
	t.eFx -= 0.04 * g
	if tg != null and f.flat_to(tg)["d"] < 6:
		t.hy -= 0.025
		t.kFx += 0.05
		t.kBx += 0.04


func _target_pose(f: Fighter, dt: float) -> Array:
	var b: Dictionary = P["wolf"] if f.is_player else P["idle"]
	var rate := 12.0 if f.is_player else 14.0
	match f.state:
		"guard":
			b = P["guard"]
			rate = 30
		"run":
			b = P["sprint"]
			rate = 14
		"attack":
			var s: Dictionary = f.A if f.is_player else f.mv["strikes"][f.si]
			if f.ph == "wind":
				b = P[s["w"]]
				rate = 30 if f.is_player else 10
			else:
				b = P[s["s"]]
				rate = 42 if f.ph == "act" else 9
		"dodge":
			b = P["dodge"]
			rate = 30
		"roll":
			b = P["roll"] if f.st < 0.45 else P["wolf"]
			rate = 24
		"hurt", "recoil":
			b = P["hurt"]
			rate = 26
		"broken", "dead":
			b = P["broken"]
			rate = 9
		"execute":
			b = P["deathblow"]
			rate = 30
		"heal":
			b = P["drink"]
			rate = 14
		"mikiri":
			b = P["mikiri"]
			rate = 30
		"mask_on":
			b = P["roar"]
			rate = 18
		"fatigue":
			b = P["fatigue"]
			rate = 10
	if f.air and f.state in ["idle", "walk", "run"]:
		b = P["jump"]
	var t := b.duplicate()
	var spd := Vector2(f.vel.x, f.vel.z).length()
	if f.is_player and f.state == "walk" and not f.air:
		t.hy = -0.06
		t.kFx += 0.1
		t.kBx += 0.1
	if f.state in ["walk", "run", "guard"] and not f.air and spd > 0.3:
		var amp := 0.95 if f.state == "run" else 0.5
		var wp := f.walk_ph
		t.lFx = -sin(wp) * amp
		t.kFx = 0.15 + maxf(0.0, cos(wp)) * amp * 1.2
		t.lBx = sin(wp) * amp
		t.kBx = 0.15 + maxf(0.0, -cos(wp)) * amp * 1.2
		rate = 22
	# gait: hips bob twice per stride, the pelvis twists with the legs, shoulders counter-twist, the head stays on target
	if f.state in ["walk", "run", "guard"] and not f.air and spd > 0.3:
		var runk := 1.0 if f.state == "run" else 0.0
		var ph := f.walk_ph
		t.hy += 0.012 - absf(sin(ph)) * (0.025 + 0.05 * runk)
		t.hyw += sin(ph) * (0.1 + 0.1 * runk)
		t.ty -= sin(ph) * (0.15 + 0.12 * runk)
		t.hdy += sin(ph) * (0.1 + 0.1 * runk)
		t.hr += sin(ph) * 0.035
		t.tx += minf(spd, 8.0) * 0.018
		if runk > 0:  # arms pump while sprinting, blade trailing
			t.sBx += sin(ph) * 0.4
			t.eBx -= 0.25 + maxf(0.0, cos(ph)) * 0.3
			t.sFx -= sin(ph) * 0.25
	# lean into starts, stops and turns
	if f.state not in ["roll", "dead", "broken"]:
		var along := f.accel.dot(f.fwd())
		var turn_k := clampf(spd / 4.0, 0.0, 1.5)
		t.tx += clampf(along * 0.012, -0.18, 0.18)
		t.tz += clampf(-f.turn_rate * 0.035 * turn_k, -0.22, 0.22)
		t.hr += clampf(-f.turn_rate * 0.018 * turn_k, -0.1, 0.1)
		t.hx -= clampf(along * 0.006, -0.08, 0.08)
	if not f.air and f.state in ["idle", "guard", "walk"]:
		_wolf_layer(f, t, dt, f.state == "idle")
	# deflect reaction fades back into whatever stance the state wants, without taking control away
	if f.parry_t > 0:
		f.parry_t -= dt
		var w := clampf(f.parry_t / 0.3, 0.0, 1.0)
		var ew := w * w * (3.0 - 2.0 * w)
		var pp: Dictionary = P["parryB"] if f.parry_side else P["parryA"]
		for k in Fighter.PK:
			t[k] += (pp[k] - t[k]) * ew
		rate = maxf(rate, 24.0)
	return [t, rate]


func _animate(f: Fighter, dt: float) -> void:
	if dt > 0.0001:
		var tr := angle_difference(f.prev_yaw, f.yaw) / dt
		f.turn_rate = lerpf(f.turn_rate, clampf(tr, -12.0, 12.0), 1.0 - exp(-8.0 * dt))
		var dv := Vector2(f.vel.x - f.prev_vel.x, f.vel.z - f.prev_vel.z) / dt
		f.accel = f.accel.lerp(dv.limit_length(40.0), 1.0 - exp(-6.0 * dt))
	f.prev_yaw = f.yaw
	f.prev_vel = f.vel
	var spd := Vector2(f.vel.x, f.vel.z).length()
	if spd > 0.3:
		var fw := f.fwd()
		var dir := 1.0 if f.vel.x * fw.x + f.vel.z * fw.y >= -0.1 else -1.0
		f.walk_ph += dt * spd * 2.3 * dir
	var r := _target_pose(f, dt)
	f.apply(dt, r[0], r[1], T)
	if not f.is_player and f.state != "dead":  # flicker while frozen after a teleport
		f.rig.visible = f.tele_t <= 0 or int(T * 40) % 2 == 0
	if f.state == "dead" and not f.is_player:
		f.set_alpha(maxf(0.0, 1.0 - (f.st - 1.6) / 1.4))
		return
	var hot := (f.state == "attack" and f.ph == "act") or f.state == "execute"
	var glow_k := 0.45 if hot else ((0.3 + 0.15 * sin(T * 12)) if f.focus_t > 0 else 0.0)
	f.set_blade_glow(glow_k)
	if f.is_player and f.masked > 0:
		f.set_blade_color(Color("ff3b3b").lightened(0.15 + 0.15 * sin(T * 9)))
	# the blade leaves its own ASCII codes hanging in the air
	if hot and (f.state != "execute" or f.st < 0.15):
		var a := f.tip_a.global_position
		var b := f.tip_b.global_position
		for i in 3:
			var c: int = f.wp["codes"][f.trail_k % f.wp["codes"].size()]
			f.trail_k += 1
			spawn_num(a.lerp(b, i / 2.0), str(c), f.wp["color"], Vector3(0, 0.15, 0), 0.26, 0.11, 0)


# ================================================================== frame
func _process(delta: float) -> void:
	var dt := minf(delta, 0.033)
	var rdt := dt
	T += dt
	frame_n += 1
	if demo != "":
		_run_demo()
	if slow_t > 0:
		slow_t -= rdt
		dt *= 0.3
	if hitstop > 0:
		hitstop -= dt
		dt *= 0.08
	if mode == "title":
		cam_yaw = PI * 0.85 + T * 0.12
	else:
		_upd_player(dt)
		for e in enemies:
			_upd_enemy(e, dt)
		for d in spawn_queue:
			enemies.append(d)
		spawn_queue.clear()
		for e in enemies.duplicate():
			if e.remove_me:
				e.free_body()
				enemies.erase(e)
		_update_projectiles(dt)
		_update_domain(dt)
		var live := alive_foes()
		if player.state != "dead" and player.state != "roll":
			for e in live:
				_separate(player, e)
		for i in live.size():
			for k in range(i + 1, live.size()):
				_separate(live[i], live[k])
		_update_flow(dt)
		var cam_in := Input.get_vector("cam_l", "cam_r", "cam_u", "cam_d")
		cam_yaw -= cam_in.x * 2.7 * rdt
		cam_pitch = clampf(cam_pitch + cam_in.y * 1.6 * rdt, -0.15, 0.95)
		var p := player
		if p.lock != null:
			cam_yaw += angle_difference(cam_yaw, p.yaw_to(p.lock)) * (1.0 - exp(-6.0 * rdt))
			cam_pitch = lerpf(cam_pitch, 0.26, 1.0 - exp(-3.0 * rdt))
		elif input_mode == "pad" and cam_in.x == 0 and p.state in ["walk", "run"]:
			cam_yaw += angle_difference(cam_yaw, p.yaw) * (1.0 - exp(-1.2 * rdt))
	_animate(player, dt)
	for e in enemies:
		_animate(e, dt)
	_update_fx(dt, rdt)
	moon.rotation.y += dt * 0.05
	petals.global_position = Vector3(player.pos.x, 13.0 if level == 1 else -2.0, player.pos.z)
	_update_void(dt)
	_draw_beams(rdt)
	for i in IDOLS.size():
		idol_mats[i].albedo_color = Color(GOLD if lit[i] else DIM, 0.9)
	arena_fence.visible = locked
	_place_camera(rdt)
	if shot_path != "" and frame_n == _shot_frame():
		print("demo fps: ", Engine.get_frames_per_second())
		get_viewport().get_texture().get_image().save_png(shot_path)
		get_tree().quit()


func _update_flow(dt: float) -> void:
	var p := player
	for i in IDOLS.size():
		if i > checkpoint and p.state != "dead" and Vector2(p.pos.x - IDOLS[i].x, p.pos.z - IDOLS[i].z).length() < 2.2:
			checkpoint = i
			lit[i] = true
			p.hp = p.max_hp
			p.gourd = 3
			p.rez = 1
			p.post = 0
			play("idol")
			pop(IDOLS[i] + Vector3(0, 2.3, 0), "SCULPTOR'S IDOL · RESTED", GOLD, 12, 1.8)
	var boss: Fighter = null
	for e in enemies:
		if e.is_boss:
			boss = e
	if not locked and boss != null and boss.alive and mode == "play" and Vector2(p.pos.x - ARENA.x, p.pos.z - ARENA.z).length() < ARENA_R - 2:
		locked = true
		intro_t = 1.6
		banner = {"title": boss.display_name, "sub": boss.sub, "t": 0.0, "dur": 2.8}
	intro_t -= dt
	if boss != null and not boss.alive and mode == "play":
		win_t += dt
		if win_t > 2.4:
			if level == 1:
				if portal == null:
					_open_portal()
			else:
				mode = "win"
				locked = false
	if portal != null and mode == "play" and Vector2(p.pos.x - portal.global_position.x, p.pos.z - portal.global_position.z).length() < 1.5:
		_enter_portal()
		return
	if mode == "dead":
		dead_t += dt
		if dead_t > 1.1:
			if Input.is_action_just_pressed("attack") and p.rez > 0:
				p.rez -= 1
				p.hp = p.max_hp * 0.5
				p.hp_lag = p.hp
				p.post = 0
				p.fall = 0
				_to_idle(p)
				mode = "play"
				big("回生", BLOOD, "RESURRECTION")
				for e in alive_foes():
					if e.flat_to(p)["d"] < 9 and e.state != "broken":
						e.state = "recoil"
						e.st = 0.0
						e.recoil_dur = 1.2
						e.peril = 0.0
			elif Input.is_action_just_pressed("restart") or Input.is_action_just_pressed("guard"):
				respawn()
	elif mode == "win" and (Input.is_action_just_pressed("restart") or Input.is_action_just_pressed("attack")):
		load_level(1)


func _place_camera(dt: float) -> void:
	var p := player
	var dist := 4.6
	var cp := cos(cam_pitch)
	var target := Vector3(p.pos.x - sin(cam_yaw) * dist * cp, p.pos.y + 1.55 + dist * sin(cam_pitch), p.pos.z - cos(cam_yaw) * dist * cp)
	cam_pos = cam_pos.lerp(target, 1.0 - exp(-14.0 * dt))
	cam.global_position = cam_pos
	if shake > 0.005:
		cam.global_position += Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * shake
	shake *= exp(-10.0 * dt)
	var look := Vector3(p.pos.x, p.pos.y + 1.25, p.pos.z)
	if p.lock != null:
		look = look.lerp(p.lock.chest(), 0.3)
	cam.look_at(look, Vector3.UP)
	if demo == "portrait" or demo == "mask":  # close front view of the Wolf for screenshots
		cam.global_position = p.pos + Vector3(0.35, 1.15, 2.3)
		cam.look_at(p.pos + Vector3(0, 0.95, 0), Vector3.UP)


# ================================================================== automated demos (screenshots)
func _shot_frame() -> int:
	match demo:
		"roll": return 124
		"fight": return 420
		"boss": return 200
		"portrait": return 60
		"void": return 520
		"mask": return 130
		"mugen": return 420
		"domain": return 300
		"getsuga": return 238
		"portal": return 330
		"ninjas": return 520
		"dodgespam": return 262
	return 90


func _run_demo() -> void:
	match demo:
		"roll":
			if frame_n == 20: Input.action_press("move_f")
			if frame_n == 110:
				Input.action_release("move_f")
				Input.action_press("roll")
			if frame_n == 112: Input.action_release("roll")
		"fight":  # walk into the first soldier, lock on and trade blows
			if frame_n == 20: Input.action_press("move_f")
			if frame_n == 230:
				Input.action_release("move_f")
				Input.action_press("lock")
			if frame_n == 232: Input.action_release("lock")
			if frame_n > 240 and frame_n % 18 == 0: Input.action_press("attack")
			if frame_n > 240 and frame_n % 18 == 2: Input.action_release("attack")
		"boss":  # teleport into the arena to see the boss fight open
			if frame_n == 5:
				checkpoint = 1
				lit[1] = true
				respawn()
				player.pos = Vector3(0, 0, 95)
			if frame_n == 8: Input.action_press("move_f")
			if frame_n == 120: Input.action_release("move_f")
		"void":  # start in the void and walk to the first pair of blink ninjas
			if frame_n == 5: load_level(2)
			if frame_n == 8: Input.action_press("move_f")
			if frame_n == 360: Input.action_release("move_f")
			if frame_n > 380 and frame_n % 20 == 0: Input.action_press("attack")
			if frame_n > 380 and frame_n % 20 == 2: Input.action_release("attack")
		"mask":  # put on the Hollow mask
			if frame_n == 5: load_level(2)
			if frame_n == 10:
				player.rage = 100.0
				Input.action_press("mask")
			if frame_n == 12: Input.action_release("mask")
		"mugen", "domain", "getsuga":  # straight into the duel with Mugen
			if frame_n == 5:
				load_level(2)
				checkpoint = IDOLS.size() - 1
				lit[checkpoint] = true
				respawn()
				player.pos = ARENA + Vector3(0, 0, -12)
			if frame_n == 8: Input.action_press("move_f")
			if frame_n == 70:
				Input.action_release("move_f")
				Input.action_press("lock")
			if frame_n == 72: Input.action_release("lock")
			if demo == "mugen" and frame_n > 80 and frame_n % 15 == 0: Input.action_press("guard")
			if demo == "mugen" and frame_n > 80 and frame_n % 15 == 3: Input.action_release("guard")
			if demo == "domain" and frame_n == 150:
				for e in enemies:
					if e.type == "mugen":
						e.hp = e.max_hp * 0.18
			if demo == "getsuga" and frame_n == 150:
				player.rage = 100.0
				Input.action_press("mask")
			if demo == "getsuga" and frame_n == 152: Input.action_release("mask")
			if demo == "getsuga" and frame_n == 225: Input.action_press("heavy")
			if demo == "getsuga" and frame_n == 227: Input.action_release("heavy")
		"dodgespam":  # spam steps in front of Genichiro until he reads them
			if frame_n == 5:
				checkpoint = 1
				lit[1] = true
				respawn()
				player.pos = ARENA + Vector3(0, 0, 3)
			if frame_n > 40 and frame_n % 22 == 0:  # sidestep left and right, right in his face
				Input.action_press("move_l" if (frame_n / 22) % 2 == 0 else "move_r")
				Input.action_press("step")
			if frame_n > 40 and frame_n % 22 == 3:
				Input.action_release("step")
				Input.action_release("move_l")
				Input.action_release("move_r")
		"ninjas":  # stand among the shuriken ninjas, then the smoke ninja
			if frame_n == 5:
				load_level(2)
				player.pos = Vector3(-4, 0, 44)
			if frame_n == 260:
				player.pos = Vector3(2, 0, 68)
			if frame_n > 20 and frame_n % 16 == 0: Input.action_press("attack")
			if frame_n > 20 and frame_n % 16 == 2: Input.action_release("attack")
		"portal":  # finish Genichiro and step into the rift
			if frame_n == 5:
				checkpoint = 1
				lit[1] = true
				respawn()
				player.pos = ARENA + Vector3(0, 0, -6)
			if frame_n == 20:
				locked = true
				for e in enemies:
					if e.is_boss:
						e.alive = false
						e.state = "dead"
			if frame_n == 200: Input.action_press("move_f")
			if frame_n == 300: Input.action_release("move_f")


# ================================================================== HUD
func _text(c: Control, font: Font, p: Vector2, s: String, size: int, color: Color, align := HORIZONTAL_ALIGNMENT_LEFT, width := -1.0) -> void:
	c.draw_string(font, p, s, align, width, size, color)


func _hp_bar(c: Control, r: Rect2, e: Fighter) -> void:
	c.draw_rect(r, Color(BONE, 0.08))
	c.draw_rect(Rect2(r.position, Vector2(r.size.x * clampf(e.hp_lag / e.max_hp, 0, 1), r.size.y)), Color(BONE, 0.55))
	c.draw_rect(Rect2(r.position, Vector2(r.size.x * clampf(e.hp / e.max_hp, 0, 1), r.size.y)), BLOOD)
	c.draw_rect(r, Color(BONE, 0.45), false, 1.0)


func _post_bar(c: Control, cx: float, y: float, w: float, e: Fighter, h: float = 5.0) -> void:
	var f := clampf(e.post / e.max_post, 0, 1)
	c.draw_rect(Rect2(cx - w / 2, y, w, h), Color(BONE, 0.3), false, 1.0)
	c.draw_rect(Rect2(cx - w * f / 2, y, w * f, h), Color("ff6a2a") if f > 0.8 else GOLD)
	c.draw_rect(Rect2(cx - 0.5, y - 2, 1, h + 4), BONE)


func _screen(v: Vector3):
	if cam.is_position_behind(v):
		return null
	return cam.unproject_position(v)


func _enemy_ui(c: Control, e: Fighter) -> void:
	if not e.alive:
		return
	var s = _screen(head_pos(e, 2.3))
	if s == null:
		return
	var d := cam.global_position.distance_to(e.pos)
	if d > 30:
		return
	var k := clampf(9.0 / d, 0.6, 1.25)
	if e.aggro and (e.post > 1 or e.state == "broken"):
		_post_bar(c, s.x, s.y, 64 * k, e, 4)
	if not e.is_boss and e.aggro and e.hp < e.max_hp:
		c.draw_rect(Rect2(s.x - 26 * k, s.y - 8, 52 * k, 3), Color(BONE, 0.15))
		c.draw_rect(Rect2(s.x - 26 * k, s.y - 8, 52 * k * e.hp / e.max_hp, 3), BLOOD)
	if e.aggro and (e.set_flash > 0 or player.lock == e):
		var a := minf(1.0, e.set_flash) if e.set_flash > 0 else 0.6
		_text(c, mono, Vector2(s.x - 150, s.y - 14), "STANCE · " + String(e.sets[e.set_idx]["name"]).to_upper(),
			int(10 * k), Color(BOSS_C if e.is_boss else EB, a), HORIZONTAL_ALIGNMENT_CENTER, 300)
	if e.state == "broken":
		var cs = _screen(e.chest())
		if cs != null:
			var pulse := 1.0 + sin(T * 10) * 0.15
			c.draw_arc(cs, 12 * k * pulse, 0, TAU, 32, BLOOD, 1.5)
			c.draw_circle(cs, 4 * k, BLOOD)
	if e.peril > 0:
		_text(c, serif, Vector2(s.x - 60, s.y - 26 * k), "危", int(40 * k), Color(BLOOD, minf(1.0, e.peril / 0.25)), HORIZONTAL_ALIGNMENT_CENTER, 120)


func draw_hud(c: Control) -> void:
	var vs := c.get_viewport_rect().size
	var W := vs.x
	var H := vs.y
	if clash["dodge_t"] > 0:
		c.draw_texture_rect(vignette, Rect2(0, 0, W, H), false, Color(1, 1, 1, 0.22 * clash["dodge_t"] / 0.55))
	if clash["flash_t"] > 0:
		c.draw_rect(Rect2(0, 0, W, H), Color(1, 0.93, 0.8, clash["flash_a"] * clash["flash_t"] / 0.06))
	if mode == "title":
		_draw_title(c, W, H)
		return
	for e in enemies:
		_enemy_ui(c, e)
	var p := player
	# player panel
	_text(c, mono, Vector2(20, 26), "WOLF · VITALITY", 10, DIM)
	_hp_bar(c, Rect2(20, 32, 240, 9), p)
	_text(c, mono, Vector2(20, 60), "POSTURE", 10, DIM)
	_post_bar(c, 180, 53, 150, p)
	c.draw_arc(Vector2(274, 36), 5, 0, TAU, 20, BLOOD, 1.0)
	if p.rez > 0:
		c.draw_circle(Vector2(274, 36), 2.6, BLOOD)
	_text(c, mono, Vector2(20, 80), "GOURD " + "o".repeat(p.gourd) + ".".repeat(3 - p.gourd), 10, PB)
	if p.mask_unlocked:  # the Hollow meter
		var full := p.rage >= 100.0 and p.masked <= 0
		var rc := BLOOD.lightened(0.25 * (0.5 + 0.5 * sin(T * 8))) if full else BLOOD
		_text(c, mono, Vector2(20, 100), "HOLLOW", 10, rc if p.masked > 0 or full else DIM)
		c.draw_rect(Rect2(105, 93, 150, 6), Color(BONE, 0.08))
		c.draw_rect(Rect2(105, 93, 150 * clampf(p.rage / 100.0, 0, 1), 6), rc)
		c.draw_rect(Rect2(105, 93, 150, 6), Color(BONE, 0.35), false, 1.0)
		if full:
			_text(c, mono, Vector2(265, 100), ("L3" if input_mode == "pad" else "V") + "  WEAR THE MASK", 10, rc)
		elif p.masked > 0:
			_text(c, mono, Vector2(265, 100), ("RT" if input_mode == "pad" else "F") + "  GETSUGA TENSHO", 10, BLOOD)
	if p.lock != null:
		var ls = _screen(p.lock.chest())
		if ls != null:
			c.draw_polyline(PackedVector2Array([ls + Vector2(0, -7), ls + Vector2(7, 0), ls + Vector2(0, 7), ls + Vector2(-7, 0), ls + Vector2(0, -7)]), BONE, 1.2)
	# boss panel with the adaptation read-out
	var boss: Fighter = null
	for e in enemies:
		if e.is_boss:
			boss = e
	if boss != null and locked and boss.alive:
		var bw := minf(320.0, W * 0.42)
		var bx := W - bw - 20
		_text(c, serif, Vector2(0, 28), boss.display_name, 18, BOSS_C, HORIZONTAL_ALIGNMENT_RIGHT, W - 20)
		_hp_bar(c, Rect2(bx, 36, bw, 8), boss)
		for i in boss.max_marks:
			var mp := Vector2(bx - 12 - i * 14, 40)
			c.draw_arc(mp, 4.5, 0, TAU, 16, BLOOD, 1.0)
			if i < boss.marks:
				c.draw_circle(mp, 2.3, BLOOD)
		if boss.type == "mugen":  # Infinity status instead of the adaptation read-out
			if boss.inf_down > 0:
				_text(c, mono, Vector2(bx, 62), "INFINITY DOWN", 10, BLOOD)
				c.draw_rect(Rect2(bx, 67, bw * clampf(boss.inf_down / 3.5, 0, 1), 3), BLOOD)
			else:
				_text(c, mono, Vector2(bx, 62), "∞  INFINITY ACTIVE", 10, MUGEN_C)
	if boss != null and locked and boss.alive and boss.adaptive:
		var bw := minf(320.0, W * 0.42)
		var bx := W - bw - 20
		_text(c, mono, Vector2(bx, 62), "HOW WELL HE KNOWS YOUR ATTACKS", 9, DIM)
		var cw := bw / 4.0
		for i in Data.ATYPES.size():
			var t: String = Data.ATYPES[i]
			var cx: float = bx + i * cw
			var lvl := adapt_lvl(boss, t)
			var fl: float = boss.adapt_flash[t]
			var colr := BLOOD if lvl == 3 else (BOSS_C if fl > 0 else BONE)
			var a := 0.6 + 0.4 * minf(1.0, fl + (0.5 if lvl > 0 else 0.0))
			_text(c, mono, Vector2(cx, 77), Data.ALABEL[t], 9, Color(colr, a))
			for jj in 3:
				var rr := Rect2(cx + jj * 11, 82, 8, 5)
				var pc := BLOOD if lvl == 3 else BOSS_C
				if jj < lvl:
					c.draw_rect(rr, pc)
				c.draw_rect(rr, pc, false, 1.0)
		_text(c, mono, Vector2(bx, 104), "HOW WELL HE KNOWS YOUR DODGES", 9, DIM)
		for i in Data.DTYPES.size():
			var t: String = Data.DTYPES[i]
			var cx: float = bx + i * cw
			var lvl := adapt_lvl(boss, t)
			var fl: float = boss.adapt_flash[t]
			var colr := BLOOD if lvl == 3 else (BOSS_C if fl > 0 else BONE)
			_text(c, mono, Vector2(cx, 119), Data.ALABEL[t], 9, Color(colr, 0.6 + 0.4 * minf(1.0, fl + (0.5 if lvl > 0 else 0.0))))
			for jj in 3:
				var rr := Rect2(cx + jj * 11, 124, 8, 5)
				var pc := BLOOD if lvl == 3 else BOSS_C
				if jj < lvl:
					c.draw_rect(rr, pc)
				c.draw_rect(rr, pc, false, 1.0)
	# hint + legend
	if mode == "play":
		var hint := ""
		var hints: Array = (Data.PAD_HINTS if input_mode == "pad" else Data.HINTS) if level == 1 else _void_hints()
		for h in hints:
			if p.pos.z > h[0]:
				hint = h[1]
		if boss != null and locked and boss.type == "mugen":
			hint = "Infinity stops your blade. Deflect him, punish his fatigue after a blink chain, or wear the mask."
		elif boss != null and locked:
			hint = "Vary your attacks, and don't lean on B: he studies spammed dodges. Deflecting throws off his read." if input_mode == "pad" \
				else "Vary your attacks, and don't spam Shift / C: he studies your dodges. Deflecting throws off his read."
		_text(c, mono, Vector2(0, H - 22), hint, 11, DIM, HORIZONTAL_ALIGNMENT_CENTER, W)
		if input_mode == "kb" and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			_text(c, mono, Vector2(0, H - 40), "Click the view to capture the mouse for camera control", 11, GOLD, HORIZONTAL_ALIGNMENT_CENTER, W)
		_text(c, mono, Vector2(0, H - 70), "KUSABIMARU =", 10, DIM, HORIZONTAL_ALIGNMENT_RIGHT, W - 20)
		_text(c, mono, Vector2(0, H - 56), WP["kusabimaru"]["str"], 10, PB, HORIZONTAL_ALIGNMENT_RIGHT, W - 20)
	if domain_t > 0:
		c.draw_texture_rect(vignette, Rect2(0, 0, W, H), false, Color(0.75, 0.45, 1.0, 0.55))
		_text(c, serif, Vector2(0, 118), "無量空処", 30, Color(VIOLET, 0.9), HORIZONTAL_ALIGNMENT_CENTER, W)
		_text(c, mono, Vector2(0, 140), "UNLIMITED VOID  %.1f  ·  %s TO SHATTER IT" % [domain_t, "L3" if input_mode == "pad" else "V"], 11, Color(BONE, 0.8), HORIZONTAL_ALIGNMENT_CENTER, W)
	if clash.get("tear_t", 0.0) > 0:  # the screen tears as the mask forms
		for i in 9:
			var y := randf() * H
			c.draw_rect(Rect2(randf_range(-40, 40), y, W, randf_range(2, 10)), Color(1, 1, 1, 0.08) if i % 2 else Color(BLOOD, 0.12))
	for q in pops:
		var s = _screen(q["pos"])
		if s == null:
			continue
		var a := clampf(1.0 - q["t"] / q["dur"], 0, 1)
		_text(c, mono, Vector2(s.x - 200, s.y - q["t"] * 26), q["txt"], q["size"], Color(q["color"], a), HORIZONTAL_ALIGNMENT_CENTER, 400)
	_draw_overlays(c, W, H)


func _draw_overlays(c: Control, W: float, H: float) -> void:
	var my := H * 0.42
	if not banner.is_empty():
		var a := minf(1.0, minf(banner["t"] / 0.3, (banner["dur"] - banner["t"]) / 0.5))
		c.draw_line(Vector2(W / 2 - 180, my - 64), Vector2(W / 2 + 180, my - 64), Color(BONE, a * 0.4), 1.0)
		_text(c, serif, Vector2(0, my - 80), banner["title"], 36, Color(BOSS_C, a), HORIZONTAL_ALIGNMENT_CENTER, W)
		_text(c, mono, Vector2(0, my - 44), String(banner["sub"]).to_upper(), 11, Color(DIM, a), HORIZONTAL_ALIGNMENT_CENTER, W)
	if not big_fx.is_empty():
		var k: float = big_fx["t"] / big_fx["dur"]
		var a := minf(1.0, minf(big_fx["t"] / 0.08, (1.0 - k) / 0.35))
		var sz := int(130 * (1.25 - 0.25 * minf(1.0, big_fx["t"] / 0.15)))
		_text(c, serif, Vector2(0, my + 30), big_fx["txt"], sz, Color(big_fx["color"], a), HORIZONTAL_ALIGNMENT_CENTER, W)
		_text(c, mono, Vector2(0, my + 62), big_fx["sub"], 12, Color(BONE, a), HORIZONTAL_ALIGNMENT_CENTER, W)
	if mode == "dead":
		var a := minf(1.0, dead_t / 0.9)
		c.draw_rect(Rect2(0, 0, W, H), Color(INK, 0.72 * a))
		_text(c, serif, Vector2(0, my + 70), "死", 210, Color(BLOOD, a), HORIZONTAL_ALIGNMENT_CENTER, W)
		if dead_t > 1.1:
			var pad := input_mode == "pad"
			if player.rez > 0:
				_text(c, mono, Vector2(0, my + 120), "RB  resurrect   (1 left)" if pad else "Click / J  resurrect   (1 left)", 12, BONE, HORIZONTAL_ALIGNMENT_CENTER, W)
			_text(c, mono, Vector2(0, my + 142), "Start  return to the sculptor's idol" if pad else "R  return to the sculptor's idol", 12, DIM, HORIZONTAL_ALIGNMENT_CENTER, W)
	if mode == "win":
		c.draw_rect(Rect2(0, 0, W, H), Color(INK, 0.6))
		_text(c, serif, Vector2(0, my), "Mugen Ashina has fallen", 40, BONE, HORIZONTAL_ALIGNMENT_CENTER, W)
		_text(c, mono, Vector2(0, my + 32), "83 72 73 78 79 66 73  ·  87 73 78 83", 12, PB, HORIZONTAL_ALIGNMENT_CENTER, W)
		_text(c, mono, Vector2(0, my + 60), "RB / Start  play again" if input_mode == "pad" else "R  play again", 12, DIM, HORIZONTAL_ALIGNMENT_CENTER, W)


func _draw_title(c: Control, W: float, H: float) -> void:
	c.draw_rect(Rect2(0, 0, W * 0.62, H), Color(INK, 0.78))
	var lx := clampf(W * 0.06, 20, 80)
	var ty := maxf(90, H * 0.14)
	_text(c, serif, Vector2(lx, ty), "隻狼", 64, BLOOD)
	_text(c, serif, Vector2(lx, ty + 48), "Shadows Wired Twice", 38, BONE)
	_text(c, mono, Vector2(lx, ty + 74), "THIRD PERSON · WIREFRAME BODIES · BLADES FORGED FROM ASCII CODES", 11, DIM)
	_text(c, mono, Vector2(lx, ty + 92), "KUSABIMARU  =  " + WP["kusabimaru"]["str"], 11, PB)
	_text(c, mono, Vector2(lx, ty + 110), "The lord of the keep learns: hit him the same way twice and he adapts.", 11, BOSS_C)
	_text(c, mono, Vector2(lx, ty + 126), "Beat him to open the rift into the void  ·  press 2 to start there", 11, VIOLET)
	var rows := []
	if input_mode == "pad":
		rows = [["Left stick", "move"], ["Right stick", "camera"], ["A", "jump · clears a 危 sweep"],
			["B", "tap: step · hold: sprint · step into a 危 thrust = Mikiri"], ["X", "roll"],
			["RB", "strike · in the air = aerial · sprinting = dash"], ["RT", "heavy thrust"],
			["LB / LT", "guard · tap as the blow lands to deflect"], ["R3", "lock on"], ["Y", "healing gourd"], ["L3", "Hollow mask (void)"]]
	else:
		rows = [["WASD", "move"], ["Mouse", "camera (click to capture, Esc to release)"], ["Space", "jump · clears a 危 sweep"],
			["Shift", "tap: step · hold: sprint · step into a 危 thrust = Mikiri"], ["C", "roll"],
			["Click / J", "strike · in the air = aerial · sprinting = dash"], ["F", "heavy thrust"],
			["Right-click / K", "guard · tap as the blow lands to deflect"], ["Q / Tab / middle", "lock on"], ["E", "healing gourd"], ["V", "Hollow mask (void)"]]
	for i in rows.size():
		var yy := ty + 152 + i * 21
		_text(c, mono, Vector2(lx, yy), rows[i][0], 12, BONE)
		_text(c, mono, Vector2(lx + 150, yy), rows[i][1], 12, DIM)
	var blink := 0.55 + 0.45 * sin(T * 3)
	_text(c, mono, Vector2(lx, ty + 152 + rows.size() * 21 + 24), "PRESS ANY KEY OR BUTTON", 12, Color(GOLD, blink))


# ================================================================== Level 2: the void
## Swap the level scene under World and start it fresh.
func load_level(n: int) -> void:
	level = n
	var old := get_node_or_null("World")
	if old != null:
		remove_child(old)
		old.queue_free()
	var w: Node3D = (load(LEVEL_SCENES[n]) as PackedScene).instantiate()
	w.name = "World"
	add_child(w)
	move_child(w, 0)
	_read_world(w)
	if portal != null:
		portal.queue_free()
		portal = null
	reset_all("play")
	_apply_level_env()


func _apply_level_env() -> void:
	if level == 2:
		world_env.background_color = Color("06050d")
		world_env.fog_light_color = Color("0b0820")
		world_env.fog_depth_begin = 30.0
		world_env.fog_depth_end = 170.0
	else:
		world_env.background_color = INK
		world_env.fog_light_color = INK
		world_env.fog_depth_begin = 22.0
		world_env.fog_depth_end = 105.0


func _void_hints() -> Array:
	var pad := input_mode == "pad"
	return [
		[-99.0, "Void ninjas blink in behind you. Right after a teleport they flicker, frozen: punish it."],
		[40.0, "Deflect a shuriken just as it lands (%s) to send it back at the thrower." % ("LB" if pad else "K")],
		[62.0, "The Smoke Ninja splits into copies. Only one is real; the others shatter when touched."],
		[84.0, "Deflects fill the HOLLOW meter. Full: %s puts on the mask, and %s becomes Getsuga Tensho." % (["L3", "RT"] if pad else ["V", "F"])],
	]


func _rage(p: Fighter, v: float) -> void:
	if not p.is_player or not p.mask_unlocked or p.masked > 0:
		return
	var was := p.rage
	p.rage = minf(100.0, p.rage + v)
	if was < 100.0 and p.rage >= 100.0:
		pop(head_pos(p, 2.5), "HOLLOW READY", BLOOD, 13, 1.2)


# ---------------------------------------------------------------- teleports, decoys
func _teleport(e: Fighter, how: String) -> void:
	var p := player
	var pf := p.fwd()
	var n: Vector2 = e.flat_to(p)["n"]
	var target := e.pos
	match how:
		"behind":
			target = p.pos - Vector3(pf.x, 0, pf.y) * 1.5
		"side":
			var side := -1.0 if randf() < 0.5 else 1.0
			target = p.pos + Vector3(-pf.y, 0, pf.x) * side * 1.7
		"away":
			target = e.pos - Vector3(n.x, 0, n.y) * 6.0 + Vector3(-n.y, 0, n.x) * randf_range(-3.0, 3.0)
		"through":
			target = p.pos + Vector3(n.x, 0, n.y) * 2.0
	target.y = 0
	target = _clamp_pos(e, target)
	make_ghost(e, VIOLET, 0.5, 0.35)
	burst(e.chest(), e.wp["codes"], VIOLET, 8, 2.5)
	e.pos = target
	e.yaw = e.yaw_to(p)
	e.vel = Vector3.ZERO
	e.tele_t = 0.15 if e.type == "mugen" else 0.3
	burst(e.chest(), e.wp["codes"], VIOLET, 8, 2.5)
	play("blink", -7)


func _smoke_split(e: Fighter) -> void:
	if e.decoy:
		return
	var p := player
	burst(e.chest(), [48, 49], Color(0.8, 0.8, 0.9), 18, 3, 1)
	play("smoke", -5)
	var base := randf() * TAU
	var real := randi() % 3
	for k in 3:
		var a := base + TAU * k / 3.0
		var spot := _clamp_pos(e, p.pos + Vector3(sin(a), 0, cos(a)) * 3.2)
		if k == real:
			make_ghost(e, VIOLET, 0.5, 0.35)
			e.pos = spot
			e.yaw = e.yaw_to(p)
			e.tele_t = 0.3
		else:
			var d := _mk_enemy(e.type, spot)
			d.decoy = true
			d.decoy_t = 8.0
			d.hp = 1.0
			d.aggro = true
			d.cd = randf_range(0.3, 0.9)
			d.yaw = d.yaw_to(p)
			d.tele_t = 0.3
			spawn_queue.append(d)
		burst(spot + Vector3(0, 1, 0), [48, 49], Color(0.8, 0.8, 0.9), 10, 2, 1)


func _shatter_decoy(e: Fighter) -> void:
	if e.remove_me:
		return
	burst(e.chest(), e.wp["codes"], VIOLET, 14, 3)
	spawn_sparks(e.chest(), 6, 4)
	play("shatter", -8)
	pop(head_pos(e, 2.2), "DECOY", DIM, 11, 0.7)
	e.alive = false
	e.state = "dead"
	e.remove_me = true
	if player.lock == e:
		player.lock = null


# ---------------------------------------------------------------- projectiles
func _proj_label(txt: String, color: Color, size: float) -> Label3D:
	var l := Label3D.new()
	l.font = mono
	l.font_size = 48
	l.pixel_size = size / 48.0
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.modulate = color
	l.outline_size = 0
	l.shaded = false
	l.text = txt
	add_child(l)
	return l


func _throw_shuriken(e: Fighter, n: int) -> void:
	var base := e.yaw_to(player)
	for i in n:
		var a := base + (i - (n - 1) / 2.0) * 0.14
		var l := _proj_label("83", VIOLET, 0.22)
		projectiles.append({"kind": "shuriken", "node": l, "pos": e.chest(), "vel": Vector3(sin(a), 0, cos(a)) * 14.0,
			"from": e, "dmg": 9.0, "post": 12.0, "life": 1.6, "radius": 0.45, "reflected": false, "hit": {}})
	play("throw", -6)


func _fire_red(e: Fighter) -> void:
	var node := Node3D.new()
	add_child(node)
	Wire.add(node, Wire.sphere(0.45, 10, 6), Wire.mat(BLOOD, 0.9, true, true))
	var l := Label3D.new()
	l.font = serif
	l.font_size = 64
	l.pixel_size = 0.009
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.modulate = BLOOD
	l.outline_size = 0
	l.text = "赫"
	node.add_child(l)
	var d := player.chest() - e.chest()
	d.y = 0
	projectiles.append({"kind": "red", "node": node, "pos": e.chest(), "vel": d.normalized() * 18.0, "from": e,
		"dmg": 22.0, "post": 30.0, "life": 2.5, "radius": 0.9, "knock": 13.0, "hit": {}})
	play("throw", -3)


func _fire_getsuga(p: Fighter) -> void:
	var node := Node3D.new()
	add_child(node)
	var labs := []
	var cs: Array = codes("GETSUGA")
	for i in 13:
		var l := Label3D.new()
		l.font = mono
		l.font_size = 64
		l.pixel_size = 0.007
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		l.outline_size = 0
		l.shaded = false
		l.text = str(cs[i % cs.size()])
		l.modulate = Color("ff3b3b") if i % 2 == 0 else Color("ffd0d0")
		node.add_child(l)
		labs.append(l)
	var f := p.fwd()
	projectiles.append({"kind": "getsuga", "node": node, "labs": labs, "pos": p.chest(), "vel": Vector3(f.x, 0, f.y) * 20.0,
		"from": p, "dmg": 30.0, "post": 45.0, "life": 0.9, "radius": 1.9, "hit": {}, "yaw": p.yaw})
	play("getsuga", -4)
	add_shake(0.1)


func _place_getsuga(q: Dictionary) -> void:
	var yaw: float = q["yaw"]
	var fwdv := Vector3(sin(yaw), 0, cos(yaw))
	var right := Vector3(cos(yaw), 0, -sin(yaw))
	var labs: Array = q["labs"]
	var qp: Vector3 = q["pos"]
	for i in labs.size():
		var t := (i / float(labs.size() - 1) - 0.5) * 2.0  # -1 .. 1 across the crescent
		var l: Label3D = labs[i]
		l.global_position = qp + right * t * 1.8 - fwdv * t * t * 0.8 + Vector3(0, t * 0.35, 0)
		if randf() < 0.3:
			l.text = str(randi() % 10)
	if randf() < 0.7:
		var t2 := randf_range(-1.0, 1.0)
		spawn_num(qp + right * t2 * 1.6, str(randi() % 10), BLOOD, Vector3(0, 0.3, 0), 0.3, 0.12, 0)


func _update_projectiles(dt: float) -> void:
	for i in range(projectiles.size() - 1, -1, -1):
		var q: Dictionary = projectiles[i]
		q["life"] -= dt
		q["pos"] += q["vel"] * dt
		var gone: bool = q["life"] <= 0
		match q["kind"]:
			"shuriken":
				var l: Label3D = q["node"]
				l.global_position = q["pos"]
				l.text = str([83, 72, 85, 82][int(T * 30) % 4])
				if q["reflected"]:
					if _proj_hit_enemies(q):
						gone = true
				elif _proj_hit_player(q):
					gone = true
			"red":
				var nd: Node3D = q["node"]
				nd.global_position = q["pos"]
				nd.rotate_y(dt * 9.0)
				if randf() < 0.6:
					spawn_num(q["pos"], str(randi() % 10), BLOOD, Vector3.ZERO, 0.25, 0.12, 0)
				if _proj_hit_player(q):
					gone = true
			"getsuga":
				_place_getsuga(q)
				_proj_hit_enemies(q)
		if gone:
			q["node"].queue_free()
			projectiles.remove_at(i)


## Returns true if the projectile was used up on the Wolf.
func _proj_hit_player(q: Dictionary) -> bool:
	var p := player
	if p.state in ["dead", "execute", "mask_on", "mikiri"]:
		return false
	var qp: Vector3 = q["pos"]
	if Vector2(qp.x - p.pos.x, qp.z - p.pos.z).length() > q["radius"] or absf(qp.y - (p.pos.y + 1.1)) > 1.2:
		return false
	if (p.state == "dodge" and p.st < 0.26) or (p.state == "roll" and p.st < 0.42):
		return false
	var v: Vector3 = q["vel"]
	var n := Vector2(v.x, v.z).normalized()
	if q["kind"] == "shuriken" and p.state == "guard" and p.fwd().dot(-n) > 0.2:
		if T - p.guard_press < 0.2:  # deflected: send it back at the thrower
			var from: Fighter = q["from"]
			var dir := (from.chest() - qp).normalized() if from.alive else -v.normalized()
			q["vel"] = dir * 22.0
			q["reflected"] = true
			q["hit"] = {}
			play("parry", -8)
			spawn_sparks(qp, 8, 5)
			_rage(p, 5.0)
			pop(qp + Vector3(0, 0.6, 0), "REFLECTED", PB, 12, 0.8)
			return false
		play("block")
		p.post += 8
		p.post_cool = 0.8
		burst(qp, [83], GOLD, 4, 2)
		if p.post >= p.max_post:
			break_player(4)
		return true
	_hurt_player(q["dmg"], q["post"], n, q.get("knock", 3.5))
	return true


func _proj_hit_enemies(q: Dictionary) -> bool:
	var any := false
	var qp: Vector3 = q["pos"]
	var hit: Dictionary = q["hit"]
	for e in alive_foes():
		if e == q["from"] or hit.has(e):
			continue
		if Vector2(qp.x - e.pos.x, qp.z - e.pos.z).length() > q["radius"] + 0.3 * e.sc or absf(qp.y - (e.pos.y + 1.1)) > 1.6:
			continue
		hit[e] = true
		strike_enemy(e, {"dmg": q["dmg"], "post": q["post"], "type": q["kind"], "pierce": true})
		any = true
	return any


func _hurt_player(dmg: float, post: float, n: Vector2, knock: float) -> void:
	var p := player
	p.hp -= dmg
	_rage(p, dmg * 0.5)
	p.post += post * 0.5
	p.post_cool = 0.9
	p.hit_flash = 0.15
	p.state = "hurt"
	p.st = 0.0
	p.vel = Vector3(n.x * knock, 0, n.y * knock)
	p.kick("tx", -7.0)
	p.kick("hx", -9.0)
	p.kick("ty", randf_range(-5.0, 5.0))
	play("hit")
	add_shake(0.14)
	burst(p.chest(), codes("WOLF"), BLOOD, 9, 2.5)
	if p.hp <= 0:
		kill_player()
	elif p.post >= p.max_post:
		break_player(0)


# ---------------------------------------------------------------- Mugen: Infinity, Blue, Hollow Purple, Domain
func _infinity_block(e: Fighter, c: Vector3) -> void:
	var p := player
	play("infinity", -6)
	for k in 12:
		var a := TAU * k / 12.0
		spawn_num(e.chest() + Vector3(cos(a) * 0.8, sin(a) * 0.8, 0).rotated(Vector3.UP, e.yaw), str(randi() % 10), MUGEN_C, Vector3.ZERO, 0.35, 0.12, 0)
	pop(c + Vector3(0, 0.9, 0), "∞", MUGEN_C, 22, 0.6)
	hitstop = 0.03
	p.kick("tx", -4.0)
	p.post += 4
	p.post_cool = 0.6


func _blue_pull(e: Fighter) -> void:
	var p := player
	if p.state in ["dodge", "roll", "dead", "mask_on"]:
		return
	var r := p.flat_to(e)
	var n: Vector2 = r["n"]
	if r["d"] > 1.4:
		p.pull = Vector3(n.x, 0, n.y) * 7.5
	if randf() < 0.6:
		spawn_num(p.chest().lerp(e.chest(), randf()), str(randi() % 10), Color("4aa8ff"), (e.chest() - p.chest()).normalized() * 4.0, 0.3, 0.12, 0)


func _purple_charge(e: Fighter, s: Dictionary) -> void:
	if e.st < s["wind"] * e.tm - 0.3:  # track the Wolf until the last moment, then commit
		e.set_meta("aim", e.yaw_to(player))
	var aim: float = e.get_meta("aim", e.yaw)
	var core := e.chest() + Vector3(sin(aim), 0, cos(aim)) * 0.9
	var right := Vector3(cos(aim), 0, -sin(aim))
	var k := clampf(e.st / (s["wind"] * e.tm), 0.0, 1.0)
	for side in [-1.0, 1.0]:  # blue and red converge into purple
		var from: Vector3 = core + right * side * (1.8 - 1.6 * k)
		spawn_num(from, str(randi() % 10), Color("4aa8ff") if side < 0 else BLOOD, (core - from) * 2.0, 0.25, 0.14, 0)
	if k > 0.8:
		spawn_num(core, str(randi() % 10), VIOLET, Vector3.ZERO, 0.2, 0.2, 0)


func _purple_beam(e: Fighter) -> void:
	var aim: float = e.get_meta("aim", e.yaw)
	var dir := Vector3(sin(aim), 0, cos(aim))
	var o := e.chest()
	if not e.get_meta("beam_fired", false):
		e.set_meta("beam_fired", true)
		beams.append({"o": o, "dir": dir, "t": 0.7, "scar": 4.5})
		play("beam", -2)
		add_shake(0.35)
		clash["flash_t"] = 0.08
		clash["flash_a"] = 0.25
	for k in 10:
		spawn_num(o + dir * randf_range(1.0, 45.0) + Vector3(randf_range(-0.8, 0.8), randf_range(-0.8, 0.8), randf_range(-0.8, 0.8)),
			str(randi() % 10), VIOLET, Vector3(0, 1.0, 0), 0.4, 0.2, 0)
	var p := player
	if e.get_meta("beam_hit", false) or p.state in ["dead", "execute", "mask_on"]:
		return
	if (p.state == "dodge" and p.st < 0.26) or (p.state == "roll" and p.st < 0.42):
		return
	var rel := p.chest() - o
	var along := rel.dot(dir)
	var perp := rel - dir * along
	perp.y = 0
	if along > 0 and along < 45 and perp.length() < 1.3:
		e.set_meta("beam_hit", true)
		var side := Vector2(perp.x, perp.z).normalized() if perp.length() > 0.01 else Vector2(dir.z, -dir.x)
		_hurt_player(45.0, 50.0, side, 6.0)


func _draw_beams(dt: float) -> void:
	beam_mesh.clear_surfaces()
	if beams.is_empty():
		return
	beam_mesh.surface_begin(Mesh.PRIMITIVE_LINES, beam_mat)
	for i in range(beams.size() - 1, -1, -1):
		var b: Dictionary = beams[i]
		b["t"] -= dt
		b["scar"] -= dt
		var o: Vector3 = b["o"]
		var dir: Vector3 = b["dir"]
		var right := Vector3(dir.z, 0, -dir.x)
		if b["t"] > 0:  # the beam: a bundle of violet lines
			var k: float = clampf(b["t"] / 0.7, 0, 1)
			for j in 16:
				var a := TAU * j / 16.0 + T * 6.0
				var off := right * cos(a) * 1.1 + Vector3(0, sin(a) * 1.1, 0)
				beam_mesh.surface_set_color(Color(0.75, 0.55, 1.0, k))
				beam_mesh.surface_add_vertex(o + off)
				beam_mesh.surface_add_vertex(o + off + dir * 45.0)
		if b["scar"] > 0:  # the erased strip of floor it leaves behind
			var sk: float = clampf(b["scar"] / 4.5, 0, 1) * 0.6
			var g := Vector3(o.x, 0.03, o.z)
			for side in [-1.2, 1.2]:
				beam_mesh.surface_set_color(Color(0.6, 0.4, 1.0, sk))
				beam_mesh.surface_add_vertex(g + right * side)
				beam_mesh.surface_add_vertex(g + right * side + dir * 45.0)
			var z := 1.0
			while z < 45.0:
				beam_mesh.surface_set_color(Color(0.6, 0.4, 1.0, sk * 0.6))
				beam_mesh.surface_add_vertex(g + dir * z - right * 1.2)
				beam_mesh.surface_add_vertex(g + dir * (z + 0.7) + right * 1.2)
				z += 1.4
		if b["t"] <= 0 and b["scar"] <= 0:
			beams.remove_at(i)
	beam_mesh.surface_end()


func _cast_domain(e: Fighter) -> void:
	e.domain_used = true
	e.mv = {"strikes": [Data.S("seal", "seal", 1.2, 0.05, 0.5, 0, 0, 0.0, {"nohit": true, "special": "domain"})]}
	e.si = 0
	e.state = "attack"
	e.vel = Vector3.ZERO
	_begin_strike(e)
	pop(head_pos(e, 2.9), "領域展開", VIOLET, 18, 1.2)


func _open_domain(e: Fighter) -> void:
	domain_t = 8.0
	domain_owner = e
	big("領域展開", VIOLET, "DOMAIN EXPANSION · UNLIMITED VOID")
	play("domain", -2)
	hitstop = 0.2
	add_shake(0.3)
	player.rage = minf(100.0, player.rage + 40.0)
	world_env.background_color = Color("140a2a")
	world_env.fog_light_color = Color("1a0d36")


func _update_domain(dt: float) -> void:
	if domain_t <= 0:
		return
	domain_t -= dt
	var p := player
	var colrs := [MUGEN_C, VIOLET, Color.WHITE]
	for k in 6:  # a starfield of code folding round the Wolf
		var dir := Vector3(randf_range(-1, 1), randf_range(-0.4, 1), randf_range(-1, 1)).normalized()
		spawn_num(p.chest() + dir * randf_range(4.0, 11.0), str(randi() % 10), colrs[randi() % 3], -dir * 0.5, 1.2, 0.14, 0)
	if domain_t <= 0:
		_close_domain(false)


func _close_domain(shattered: bool) -> void:
	domain_t = 0.0
	_apply_level_env()
	var e := domain_owner
	domain_owner = null
	if shattered:
		big("破", PB, "DOMAIN SHATTERED")
		play("shatter", -2)
		add_shake(0.3)
		if e != null and e.alive:
			e.post += 60
			e.inf_down = 4.0
			check_break(e)
	else:
		pop(head_pos(player, 2.4), "THE VOID RECEDES", VIOLET, 13, 1.2)


# ---------------------------------------------------------------- the Hollow mask
func _begin_mask() -> void:
	var p := player
	p.state = "mask_on"
	p.st = 0.0
	p.vel = Vector3.ZERO
	play("roar", -3)
	add_shake(0.25)
	clash["tear_t"] = 0.6
	var h := head_pos(p, 1.72)
	for k in 44:  # digits swarm in and lock onto the face
		var dir := Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)).normalized()
		spawn_num(h + dir * 1.6, str(randi() % 10), Color.WHITE if randf() < 0.7 else BLOOD, -dir * 3.2, 0.5, 0.12, 0)
	if domain_t > 0:
		_close_domain(true)


func _show_mask(p: Fighter) -> void:
	if p.mask_node == null:
		_build_mask(p)
	p.mask_node.visible = true
	var h := head_pos(p, 1.72)
	burst(h, [48, 49], Color.WHITE, 10, 1.5)
	spawn_sparks(h, 8, 4)
	pop(head_pos(p, 2.4), "HOLLOW", BLOOD, 16, 1.2)
	add_shake(0.2)


## The glitched ASCII mask: a shell of digits over the face, with red stripes over the left eye.
func _build_mask(p: Fighter) -> void:
	var m := Node3D.new()
	m.name = "HollowMask"
	(p.j["head"] as Node3D).add_child(m)
	for row in 9:
		for col in 11:
			var th := (col - 5) * 0.15
			var ph := -0.6 + row * 0.16
			var nrm := Vector3(sin(th) * cos(ph), sin(ph), cos(th) * cos(ph))
			var l := Label3D.new()
			l.font = mono
			l.font_size = 24
			l.pixel_size = 0.0016
			l.outline_size = 0
			l.shaded = false
			l.double_sided = true
			l.transform = Transform3D(Basis.looking_at(-nrm), Vector3(nrm.x * 0.11, 0.15 + nrm.y * 0.14, nrm.z * 0.125 + 0.02))
			var kind := "n"
			l.text = str(randi() % 10)
			l.modulate = Color("f4f1ea")
			if row == 5 and (col == 3 or col == 7):  # eye holes
				kind = "eye"
				l.text = "0"
				l.modulate = GOLD
			elif row == 1 and col >= 2 and col <= 8:  # a jagged grin
				kind = "teeth"
				l.text = "V" if col % 2 == 0 else "^"
			elif (col == 7 or col == 8) and row >= 2 and row != 5:  # the red stripes
				l.modulate = BLOOD
			l.set_meta("kind", kind)
			l.set_meta("base", l.position)
			m.add_child(l)
	p.mask_node = m


func _update_mask(p: Fighter, dt: float) -> void:
	var labs := p.mask_node.get_children()
	for k in 6:
		var l: Label3D = labs[randi() % labs.size()]
		if l.get_meta("kind") == "n":
			l.text = str(randi() % 10)
		l.position = l.get_meta("base") + Vector3(randf_range(-0.004, 0.004), randf_range(-0.004, 0.004), 0)
	if randf() < dt * 3.0:  # a whole row slips sideways for a frame
		var row := randi() % 9
		for c in 11:
			var l: Label3D = labs[row * 11 + c]
			l.position = l.get_meta("base") + Vector3(0.015, 0, 0)


func _end_mask(p: Fighter) -> void:
	if p.mask_node != null:
		p.mask_node.visible = false
	var h := head_pos(p, 1.72)
	burst(h, [48, 49], Color.WHITE, 16, 2.5)
	burst(h, [48, 49], BLOOD, 8, 2.5)
	play("shatter", -6)
	pop(head_pos(p, 2.4), "MASK SHATTERED", DIM, 12, 1.0)


# ---------------------------------------------------------------- the void itself
func _update_void(dt: float) -> void:
	clash["tear_t"] = maxf(0.0, clash.get("tear_t", 0.0) - dt)
	if portal != null:
		portal.rotate_y(dt * 0.8)
		for l in portal.get_children():
			if l is Label3D and randf() < 0.1:
				l.text = str(randi() % 10)
	if level != 2:
		return
	sky_t -= dt
	if sky_t <= 0:  # the sky scrolls: every wall shifts down a line and mutates
		sky_t = 0.12
		for l in code_sky:
			var lab: Label3D = l
			var lines: PackedStringArray = lab.text.split("\n")
			var last := lines[lines.size() - 1]
			lines.remove_at(lines.size() - 1)
			var chars := last.to_utf8_buffer()
			for k in 4:
				chars[randi() % chars.size()] = 48 + randi() % 10
			lines.insert(0, chars.get_string_from_utf8())
			lab.text = "\n".join(lines)
	for n in drift:
		n.rotate_y(dt * 0.25)
		n.rotate_x(dt * 0.12)
	for n in glitch:  # undersides and shards glitch now and then
		if randf() < dt * 1.2:
			n.position = n.get_meta("base") + Vector3(randf_range(-0.35, 0.35), randf_range(-0.2, 0.2), randf_range(-0.35, 0.35))
		elif randf() < dt * 10.0:
			n.position = n.get_meta("base")


func _open_portal() -> void:
	locked = false
	portal = Node3D.new()
	add_child(portal)
	portal.global_position = ARENA
	var ring := Wire.add(portal, Wire.ring(1.7, 48, 0.0), Wire.mat(VIOLET, 0.9, true, true), Vector3(0, 1.8, 0))
	ring.rotation.x = PI / 2
	for k in 28:
		var a := TAU * k / 28.0
		var l := Label3D.new()
		l.font = mono
		l.font_size = 48
		l.pixel_size = 0.005
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		l.outline_size = 0
		l.modulate = MUGEN_C if k % 2 else VIOLET
		l.text = str(randi() % 10)
		l.position = Vector3(cos(a) * 1.4, 1.8 + sin(a) * 1.4, 0)
		portal.add_child(l)
	banner = {"title": "A rift has opened", "sub": "Walk into it. The void waits beyond.", "t": 0.0, "dur": 3.0}
	play("portal", -4)


func _enter_portal() -> void:
	play("portal", -2)
	load_level(2)
	big("虚", VIOLET, "INTO THE VOID")
	banner = {"title": "The Void", "sub": "Mugen Ashina waits at the end of the code", "t": 0.0, "dur": 3.0}
	cam_yaw = player.yaw
