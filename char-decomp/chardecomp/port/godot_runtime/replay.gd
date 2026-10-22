# Replays a source scenario (initial state + the input recorded every tick) and writes the port's trace.
# godot --headless --path PROJECT --script res://port/replay.gd -- scenario.json out.json
extends SceneTree


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var scen: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(args[0]))
	var spec: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://port/character.json"))
	var sim = load("res://port/character.gd").new(spec, scen["initial"], scen.get("projectile", {}))
	var out := [sim.snapshot(int(scen["start"]))]
	for k in range(int(scen["start"]), int(scen["end"])):
		sim.step(int(scen["inputs"].get(str(k), -1)))
		out.append(sim.snapshot(k + 1))
	var fh := FileAccess.open(args[1], FileAccess.WRITE)
	fh.store_string(JSON.stringify(out))
	fh.close()
	quit()
