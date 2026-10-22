# chardecomp port runtime: executes a character's UCS rules (res://port/character.json), one source tick per step.
# Generic: every number comes from the port spec, which comes from verified UCS facts. Rules the UCS does not
# state are the port's listed assumptions (see character.json "assumptions").
extends RefCounted

var spec: Dictionary
var by_offset := {}           # "0x40" -> field name
var f := []                   # two fighters: dictionaries of field values + "n" (snapshots in state) + "air"
var proj := {"active": 0, "x": 0.0, "vx": 0.0}


func _init(port_spec: Dictionary, initial: Array, projectile := {}) -> void:
	spec = port_spec
	for name in spec["fields"]:
		by_offset["0x%x" % int(spec["fields"][name])] = name
	for i in 2:
		var c: Dictionary = initial[i].duplicate()
		c["n"] = 1
		c["air"] = float(c.get("y", 0.0)) > 0.0 or float(c.get("vy", 0.0)) > 0.0
		f.append(c)
	if not projectile.is_empty():
		proj = projectile.duplicate()


func step(cmd: int) -> void:
	var p: Dictionary = f[0]
	var key := str(cmd)
	if spec["actions"].has(key):
		_act(p, spec["actions"][key])
	if spec["abilities"].has(key):
		_ability(p, spec["abilities"][key])
	for i in 2:
		_advance(f[i], i)
		_move(f[i])
	_melee(f[0], f[1])
	_projectile(f[1])


func _enter(c: Dictionary, state: int) -> void:
	c["state"] = state
	c["n"] = 0


func _act(c: Dictionary, a: Dictionary) -> void:
	var allowed := _in(c["state"], a["from"])
	match a["kind"]:
		"walk":
			if allowed:
				_enter(c, int(a["to"]))
			if int(c["state"]) == int(a["to"]):
				c["vx"] = float(spec["physics"]["walk_speed"])
		"jump":
			if allowed:
				_enter(c, int(a["to"]))
				c["vy"] = float(spec["physics"]["jump_impulse"])
				c["air"] = true
		_:
			if allowed:
				_enter(c, int(a["to"]))


func _ability(c: Dictionary, a: Dictionary) -> void:
	if not _in(c["state"], a["from"]) or float(c[a["resource"]]) < float(a["min"]):
		return
	c[a["resource"]] = int(c[a["resource"]]) - int(a["cost"])
	_enter(c, int(a["to"]))


func _advance(c: Dictionary, who: int) -> void:
	var st := str(int(c["state"]))
	if spec["timed"].has(st) and int(c["n"]) >= int(spec["timed"][st][1]):
		_enter(c, int(spec["timed"][st][0]))
		st = str(int(c["state"]))
	c["n"] = int(c["n"]) + 1
	if spec["fields"].has("hitbox_active"):
		c["hitbox_active"] = _phase(spec["moves"][st]["phases"], int(c["n"])) if spec["moves"].has(st) else 0
	if who == 0 and spec["abilities"].size() > 0:
		for a in spec["abilities"].values():
			var pr = a["projectile"]
			if pr != null and int(c["state"]) == int(a["to"]) and int(c["n"]) == int(pr["launch_frame"]):
				var dir := 1.0 if float(f[1]["x"]) >= float(c["x"]) else -1.0
				proj = {"active": 1, "x": float(c["x"]), "vx": float(pr["speed"]) * dir, "radius": float(pr["radius"]),
						"on_hit": a["on_hit"]}


func _phase(phases: Array, n: int) -> int:
	var k := 0
	for ph in phases:
		k += int(ph[1])
		if n <= k:
			return int(ph[0])
	return 0


func _move(c: Dictionary) -> void:
	var ph: Dictionary = spec["physics"]
	c["x"] = float(c["x"]) + float(c["vx"])
	c["y"] = float(c["y"]) + float(c["vy"])
	c["vx"] = float(c["vx"]) * float(ph["friction"])
	if float(c["y"]) > 0.0 or float(c["vy"]) > 0.0:
		c["vy"] = float(c["vy"]) - float(ph["gravity"])
	if c["air"] and float(c["y"]) <= 0.0:
		c["y"] = 0.0
		c["vy"] = 0.0
		c["air"] = false


func _melee(a: Dictionary, d: Dictionary) -> void:
	var st := str(int(a["state"]))
	if not spec["moves"].has(st):
		return
	var m: Dictionary = spec["moves"][st]
	if m["active_from"] == null or int(a["n"]) != int(m["active_from"]):
		return
	if absf(float(d["x"]) - float(a["x"])) <= float(m["reach"]):
		_hit(a, d, m["on_hit"])


func _projectile(d: Dictionary) -> void:
	if int(proj["active"]) != 1:
		return
	proj["x"] = float(proj["x"]) + float(proj["vx"])
	if absf(float(d["x"]) - float(proj["x"])) <= float(proj["radius"]):
		proj["active"] = 0
		_hit(f[0], d, proj["on_hit"])


func _hit(a: Dictionary, d: Dictionary, effects) -> void:
	if effects == null:
		return
	for e in effects:
		var c: Dictionary = a if e["target"] == "self" else d
		var name: String = by_offset.get(e["offset"], "")
		if name == "":
			continue
		if e.has("set"):
			if name == "state":
				_enter(c, int(e["set"]))
				c["n"] = 1
			else:
				c[name] = e["set"]
		else:
			c[name] = c[name] + e["delta"]


func _in(v, values: Array) -> bool:
	for x in values:
		if int(x) == int(v):
			return true
	return false


func snapshot(tick: int) -> Dictionary:
	var out := {"tick": tick, "fighters": [], "projectile": {"active": int(proj["active"]), "x": float(proj["x"])}}
	for c in f:
		var row := {}
		for name in spec["fields"]:
			if c.has(name):
				row[name] = c[name]
		out["fighters"].append(row)
	return out
