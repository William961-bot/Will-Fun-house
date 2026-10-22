"""From a UCS document to a port: the portable rule set a target runtime executes, the assumptions the port makes
where the UCS is silent, and the compatibility report.

Only the UCS is read here, never the source game. Every value in the port spec is a UCS fact (its claim ids are
kept); everything else the runtime needs is either an explicit assumption (listed, and confirmed or refuted by
comparing target and source traces) or a manual item (the port cannot do it and says so)."""

from __future__ import annotations

from ..ucs import UCSError, migrate, validate

CATEGORIES = ("transferable", "convertible", "reimplementable", "manual", "unsupported", "unknown")

# Assumptions the runtime makes whenever it runs; each is tested by trace comparison, none is a UCS fact.
ASSUMPTIONS = [
    "update order per tick: the player's input, then for each fighter its timed state change, frame-data update "
    "and movement, then melee hits, then projectiles",
    "the opponent is the same character: same state ids and timed transitions",
    "a projectile starts at its owner's x and flies toward the opponent",
    "an attack's hit is checked once, on its first active frame (the collision rule's active_from)",
]


def _known(node) -> bool:
    return isinstance(node, dict) and "value" in node


def _v(node, default=None):
    return node["value"] if _known(node) else default


def _domain(node):
    """A known UCS domain object (a dict that is not an Unknown), else None."""
    return node if isinstance(node, dict) and "unknown" not in node else None


def _need(problems: list, node, what: str):
    if not _known(node):
        problems.append(f"{what}: {node.get('unknown', 'missing') if isinstance(node, dict) else 'missing'}")
        return None
    return node["value"]


def extract(doc: dict) -> dict:
    """The port spec: fields, physics, actions, moves, timed transitions, abilities, with evidence ids."""
    doc = migrate(dict(doc))
    errors = validate(doc)
    if errors:
        raise UCSError("UCS is not valid: " + "; ".join(errors[:5]))
    missing: list[str] = []
    ev: dict[str, list] = {}
    fields = {f["name"]: f["offset"] for f in doc["object"]["fields"]}
    types = {f["name"]: _v(f["type"], "i32") for f in doc["object"]["fields"]}
    for name in ("x", "y", "vx", "vy", "state"):
        if name not in fields:
            missing.append(f"object field {name!r} is not claimed")

    ph = _domain(doc["physics"])
    physics, action_kinds = {}, {}
    if ph:
        for k in ("gravity", "jump_impulse", "friction", "walk_speed"):
            physics[k] = _need(missing, ph["parameters"].get(k), f"physics {k}")
        action_kinds = {int(k): v for k, v in (_v(ph["replay"].get("inputs")) or {}).items()} \
            if _domain(ph["replay"]) else {}
        if not action_kinds:
            missing.append("physics replay inputs (which input values walk and jump)")
    else:
        missing.append("physics: " + doc["physics"].get("unknown", ""))

    im = doc["controller"]["input_mapping"]
    actions, input_fn = {}, None
    for i in (im if isinstance(im, list) else []):
        frm, to = (int(x) for x in i["effect"].split(": ")[1].split(" -> "))
        actions[int(i["value"])] = {"name": i["name"], "kind": action_kinds.get(int(i["value"]), "state"),
                                    "from": [frm], "to": to, "lag": _v(i["lag"], 1)}
        input_fn = input_fn or {"function": i["function"], "argument": i["argument"]}
        ev[f"input:{i['name']}"] = i["evidence"]

    moves = {}
    collisions = ph["collision"] if ph else []
    collisions = collisions if isinstance(collisions, list) else []
    for m in doc["moves"]:
        act = next((v for v, a in actions.items() if a["name"] == m["name"]), None)
        if act is None:
            missing.append(f"move {m['name']}: no input claim with the same name")
            continue
        state = actions[act]["to"]
        col = next((c for c in collisions if _v(c["attack_state"]) == state), None)
        actions[act]["kind"] = "move"
        moves[str(state)] = {"name": m["name"], "phases": [[p["value"], p["ticks"]] for p in m["phases"]],
                             "reach": _v(col["reach"]) if col else None,
                             "active_from": _v(col["active_from"]) if col else None,
                             "on_hit": _effects(m["on_hit"])}
        if not col:
            missing.append(f"move {m['name']}: no collision rule for attack state {state}")
        if not _known_effects(m["on_hit"]):
            missing.append(f"move {m['name']}: on-hit effects unknown")
        ev[f"move:{m['name']}"] = m["evidence"]

    timed = {}
    for t in doc["controller"]["transitions"]:
        if _known(t["duration_ticks"]):
            timed[str(t["from_value"])] = [t["to_value"], t["duration_ticks"]["value"]]
            ev[f"transition:{t['name']}"] = t["evidence"]

    abilities = {}
    ab = doc["abilities"]
    for a in (ab if isinstance(ab, list) else []):
        p = a["projectile"]
        obj, off = a["gate"]["resource"].split(":")
        resource = next((n for n, o in fields.items() if hex(o) == off), None) if obj == "0" else None
        if resource is None:
            missing.append(f"ability {a['name']}: gate resource {a['gate']['resource']} is not a claimed field")
        abilities[str(a["input"]["value"])] = {
            "name": a["name"], "from": [a["state"]["from"]], "to": a["state"]["to"], "resource": resource,
            "min": _v(a["gate"]["min"]), "cost": _v(a["cost"], 0),
            "projectile": None if not _domain(p) else {
                "speed": _v(p["speed"]), "radius": _v(p["hit_radius"]), "launch_frame": _v(p["launch_frame"]),
                "recorded_as": _v(p["object"])},
            "on_hit": _effects(a["on_hit"])}
        if _domain(p):
            for k in ("speed", "hit_radius", "launch_frame"):
                _need(missing, p[k], f"ability {a['name']} projectile {k}")
        ev[f"ability:{a['name']}"] = a["evidence"]

    entered = [a for a in actions.values() if a["kind"] != "walk"] + list(abilities.values())
    for a in entered:
        if str(a["to"]) not in timed:
            missing.append(f"state {a['to']} ({a['name']}): no timed transition out of it")
    walk = [a for a in actions.values() if a["kind"] == "walk"]
    manual = []
    for a in walk:
        if str(a["to"]) not in timed:
            manual.append(f"leaving the walk state ({a['to']}): no transition out of it is claimed; the port stays in "
                          "it until another action (positions are unaffected, the state field will differ)")
    for a in abilities.values():
        if a["projectile"]:
            manual.append(f"{a['name']} projectile lifetime when it misses: never observed (Unknown in the UCS); "
                          "the port keeps it flying")
    if _domain(doc["animation"]) and _v(doc["animation"]["interpolation"]) == "nlerp":
        manual.append("animation rotation blending: the source uses nlerp; targets that blend rotations with slerp "
                      "differ by a bounded amount (see the UCS animation runtime match)")
    return {"source_ucs_version": doc["version"], "character": _v(doc["source"]["character"]),
            "tick_rate": _v(doc["time_base"]["tick_rate"]), "fields": fields, "types": types, "physics": physics,
            "input": input_fn, "actions": {str(k): v for k, v in actions.items()}, "moves": moves,
            "timed": timed, "abilities": abilities, "hitstun_state": _hitstun_state(moves, abilities),
            "assumptions": ASSUMPTIONS, "manual": manual, "missing": missing, "evidence": ev}


def _known_effects(node) -> bool:
    return isinstance(node, dict) and "events" in node and bool(node["events"])


def _effects(node) -> list | None:
    """On-hit field effects: [{"target": "self"|"opponent", "offset", "delta"|"set"}] from the first event set."""
    if not _known_effects(node):
        return None
    out = []
    for d in node["events"][0]["deltas"]:
        e = {"target": "self" if d["object"] == "self" else "opponent", "offset": d["offset"]}
        if "set" in d:
            e["set"] = d["set"]["value"]
        else:
            e["delta"] = d["delta"]["value"]
        out.append(e)
    return out


def _hitstun_state(moves: dict, abilities: dict):
    for m in list(moves.values()) + list(abilities.values()):
        for e in m.get("on_hit") or []:
            if e["target"] == "opponent" and "set" in e:
                return e["set"]
    return None


def compatibility(doc: dict, spec: dict | None = None, target: str = "godot4") -> dict:
    """Every UCS domain classified for the target: what transfers as data, what converts, what is reimplemented
    from rules, what needs a person, what the target cannot do, and what is unknown."""
    spec = spec or extract(doc)
    items = []

    def add(cat, item, why):
        items.append({"category": cat, "item": item, "why": why})

    gltf = target.startswith("godot")
    for k in ("skeleton", "mesh", "materials"):
        if not (_domain(doc[k]) if isinstance(doc[k], dict) else doc[k]):
            add("unknown", k, doc[k].get("unknown", "") if isinstance(doc[k], dict) else "")
        elif gltf:
            add("transferable", k, "exported as glTF 2.0 and imported by the target")
        elif k == "skeleton":
            add("manual", k, "Minetest 5.6 loads skinned meshes as B3D or X only; chardecomp has no B3D writer")
        elif k == "mesh":
            add("convertible", k, "exported as OBJ in the bind pose (no skin weights)")
        else:
            add("convertible", k, "base colour baked into a 1x1 texture")
    if _domain(doc["animation"]) and gltf:
        add("transferable", "animation clips", "glTF animations (keys, sample rate, notifies in extras)")
        add("convertible", "animation interpolation", "nlerp in the source; the target blends with slerp")
    elif _domain(doc["animation"]):
        add("manual", "animation clips", "needs a skinned B3D/X export for Minetest 5.6 (not implemented)")
    else:
        add("unknown", "animation", doc["animation"].get("unknown", ""))
    add("convertible", "time base", f"source ticks at {spec['tick_rate']} Hz; the port steps one source tick per "
                                    "target physics step")
    if spec["physics"] and None not in spec["physics"].values():
        add("reimplementable", "movement", "euler-after-move model and four measured parameters")
        add("convertible", "movement units", "per-tick values; per-second values are in the UCS. Distance units "
                                             "are uncalibrated: the port keeps source units")
    for m in spec["moves"].values():
        add("reimplementable", f"move {m['name']}", "frame data (ticks), collision reach, on-hit effects")
    for a in spec["abilities"].values():
        add("reimplementable", f"ability {a['name']}", "resource gate, cost, projectile speed/radius/launch frame")
    for st, (to, n) in spec["timed"].items():
        add("reimplementable", f"state {st} -> {to}", f"after {n} ticks")
    for m in spec["manual"]:
        add("manual", m.split(":")[0], m)
    for m in spec["missing"]:
        add("manual", m.split(":")[0], m)
    for k in ("camera", "audio"):
        add("unknown", k, doc[k].get("unknown", "") if isinstance(doc[k], dict) else "")
    for k in ("distance_unit", "coordinate_system", "up_axis", "handedness"):
        if not _known(doc["conventions"][k]):
            add("unknown", f"conventions.{k}", doc["conventions"][k]["unknown"])
    counts = {c: sum(1 for i in items if i["category"] == c) for c in CATEGORIES}
    return {"target": target, "counts": counts, "items": items, "assumptions": spec["assumptions"]}
