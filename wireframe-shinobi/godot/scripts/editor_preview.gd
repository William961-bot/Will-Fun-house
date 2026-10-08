@tool
extends Node3D
## Editor-only: draws the Wolf and each enemy on its spawn marker (World/Spawns) so you can see who stands where.
## Move or rotate a marker, or change its enemy type, and the figure follows. These figures are never saved;
## at runtime this node removes itself and main.gd spawns the real fighters from the same markers.

@export var show_fighters := true:
	set(v):
		show_fighters = v
		_clear()

var _figures := {}  # marker -> [Fighter, enemy type]
var _t := 0.0
var _mono: SystemFont
var _P := {}
var _WP := {}
var _TPL := {}


func _ready() -> void:
	if not Engine.is_editor_hint():
		queue_free()
		return
	_mono = SystemFont.new()
	_mono.font_names = PackedStringArray(["Consolas", "Cascadia Mono", "Courier New", "monospace"])
	_P = Data.poses()
	_WP = Data.weapons()
	_TPL = Data.templates()


func _process(dt: float) -> void:
	if not Engine.is_editor_hint():
		return
	_t -= dt
	if _t > 0:
		return
	_t = 0.2
	_sync()


func _clear() -> void:
	for k in _figures:
		_figures[k][0].free_body()
	_figures.clear()


func _sync() -> void:
	var spawns := get_node_or_null("../World/Spawns")
	if spawns == null or not show_fighters:
		_clear()
		return
	var seen := {}
	for m in spawns.get_children():
		if not m is Marker3D:
			continue
		var kind: String = m.enemy if m is SpawnPoint else "wolf"
		seen[m] = true
		if _figures.has(m) and _figures[m][1] != kind:
			_figures[m][0].free_body()
			_figures.erase(m)
		if not _figures.has(m):
			_figures[m] = [_make(kind), kind]
		var f: Fighter = _figures[m][0]
		f.pos = (m as Node3D).global_position - global_position
		f.yaw = (m as Node3D).global_rotation.y
		f.apply(1.0, _P["wolf"] if kind == "wolf" else _P["idle"], 1000.0, 0.0)
	for k in _figures.keys():
		if not seen.has(k) or not is_instance_valid(k):
			_figures[k][0].free_body()
			_figures.erase(k)


func _make(kind: String) -> Fighter:
	if kind == "wolf":
		return Fighter.new(self, {"is_player": true, "wp": _WP["kusabimaru"]}, _mono, _P["wolf"])
	var t: Dictionary = _TPL[kind]
	return Fighter.new(self, {"wp": _WP[t["wp"]], "col": t["col"], "sc": t["sc"], "hat": t["hat"]}, _mono, _P["idle"])
