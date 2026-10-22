"""Build a UCS document from a workspace's verified claims. Nothing is invented: a value appears only if a
verified claim (or a computation over verified facts, marked `derived`) establishes it."""

from __future__ import annotations

import statistics

from ..ledger import Ledger, _off, split_field
from ..workspace import completeness, load_config
from .model import (UCS, UCS_VERSION, AssetSpec, ComponentSpec, Controller, Conventions, Dependency, Fact,
                    FieldSpec, FramePhase, FunctionSpec, MoveSpec, ObjectSpec, Rejected, Source, TimeBase,
                    TransitionSpec, Unknown)

NOT_YET = {
    "mesh": "no verified mesh claim",
    "skeleton": "no verified skeleton claim",
    "materials": "no verified mesh claim with materials",
    "animation": "no verified animation claim",
    "physics": "no verified physics claim",
    "abilities": "no verified ability claim",
    "camera": "camera behaviour not recovered",
    "audio": "audio and gameplay events not recovered",
}


def _measured_rate(led: Ledger, claim: dict) -> tuple[float, float] | None:
    """Tick rate and jitter recomputed from the timestamps of the identity claim's tick_rate trace."""
    for c in claim["checks"]:
        if c["check"] == "tick_rate":
            t = led.trace(c["trace"])
            times = [x for x in t.snap_times if x is not None]
            if len(times) >= 3:
                iv = [b - a for a, b in zip(times, times[1:])]
                mean = statistics.fmean(iv)
                if mean > 0:
                    return 1000 / mean, statistics.pstdev(iv) / mean
    return None


def build(led: Ledger, cfg: dict) -> UCS:
    verified = led.claims(status="verified")
    failed = led.claims(status="failed")
    by = lambda kind: [c for c in verified if c["kind"] == kind]  # noqa: E731
    ev = lambda c: (c["id"],)  # noqa: E731

    evidence = {}
    for c in verified:
        traces = {}
        for ch in c["checks"]:
            if "trace" in ch:
                row = led.db.execute("SELECT sha256 FROM traces WHERE label=?", (ch["trace"],)).fetchone()
                traces[ch["trace"]] = row["sha256"] if row else None
        evidence[str(c["id"])] = {"kind": c["kind"], "subject": c["subject"], "name": c["name"],
                             "checks": [ch["check"] for ch in c["checks"]], "traces": traces}

    # --- source and time base
    static_ids = tuple(c["id"] for c in verified if any(ch["check"].startswith("static_") for ch in c["checks"]))
    sha = led.static.meta("binary_sha256") if led.static else None
    idents = by("identity")
    ident = idents[0] if idents else None
    rate = _measured_rate(led, ident) if ident else None
    tick_fn = None
    if ident:
        for ch in ident["checks"]:
            if "trace" in ch:
                tick_fn = led.trace(ch["trace"]).snap_identity[1]
                break
    source = Source(
        character=Fact(cfg["character"], ev(ident)) if ident and cfg.get("character") else
        Unknown("no verified identity claim names the character"),
        binary=Fact(cfg["binary"], static_ids) if static_ids and cfg.get("binary") else
        Unknown("no verified claim uses the static database"),
        binary_sha256=Fact(sha, static_ids) if static_ids and sha else Unknown("no verified static evidence"),
        module=Fact(cfg["module"], static_ids) if static_ids and cfg.get("module") else Unknown("no verified static evidence"),
        engine=Unknown("engine identification not implemented (source discovery, Stage 10 adapters)"),
        platform=Unknown("platform recorded per trace but not claimed"),
    )
    time_base = TimeBase(
        tick_function=Fact(tick_fn, ev(ident)) if tick_fn else Unknown("no verified identity claim"),
        tick_rate=Fact(round(rate[0], 3), ev(ident), "Hz", "mean of snapshot timestamp intervals") if rate else
        Unknown("no timed snapshots in a verified identity claim"),
        tick_jitter=Fact(round(rate[1], 3), ev(ident), None, "stdev / mean of intervals") if rate else
        Unknown("no timed snapshots in a verified identity claim"),
    )
    hz = rate[0] if rate else None

    def seconds(ticks, ids) -> Fact | Unknown:
        if hz is None:
            return Unknown("tick rate unknown")
        return Fact(round(ticks / hz, 6), tuple(ids) + ev(ident), "s", f"{ticks} ticks / {hz:.3f} Hz")

    conventions = Conventions(
        distance_unit=Unknown("source distance units not calibrated (Stage 6)"),
        coordinate_system=Unknown("not recovered"), up_axis=Unknown("not recovered"),
        handedness=Unknown("not recovered"))

    # --- structure
    root_fields, comp_fields = [], {}
    for c in by("field"):
        path, off = split_field(c["subject"])
        fs = FieldSpec(off, Fact(c["ctype"], ev(c)) if c["ctype"] else Unknown("type not stated"),
                       c["name"], c["statement"], ev(c))
        (comp_fields.setdefault(path, []) if path else root_fields).append(fs)
    obj = ObjectSpec(base=Fact(ident["subject"], ev(ident)) if ident else Unknown("no verified identity claim"),
                     size=Unknown("object size not proven (snapshots read a configured size)"),
                     fields=sorted(root_fields, key=lambda f: f.offset))
    components = [ComponentSpec(c["subject"], c["name"], c["statement"], ev(c),
                                sorted(comp_fields.pop(c["subject"], []), key=lambda f: f.offset))
                  for c in by("component")]
    for path, fs in comp_fields.items():  # fields of a component nobody has claimed yet
        components.append(ComponentSpec(path, "", "component not claimed; fields only", (), fs))

    # --- controller
    transitions, deps = [], []
    for c in by("transition"):
        tr = next(ch for ch in c["checks"] if ch["check"] == "transition")
        fld = f"{tr['path']}@{_off(tr['offset']):#x}" if tr.get("path") else hex(_off(tr["offset"]))
        dur = tr.get("duration")
        cause = next((ch for ch in c["checks"] if ch["check"] == "precedes"), None)
        transitions.append(TransitionSpec(
            c["name"], fld, tr["from"], tr["to"], c["statement"],
            Fact(dur, ev(c), "ticks") if dur is not None else Unknown("duration not claimed"),
            seconds(dur, ev(c)) if dur is not None else Unknown("duration not claimed"),
            Fact(cause["func"], ev(c)) if cause else Unknown("no precedes check names a cause"), ev(c)))
        if cause:
            deps.append(Dependency("caused_by", c["name"], cause["func"], ev(c)))
    controller = Controller(state_fields=sorted({t.field for t in transitions}), transitions=transitions)
    inputs = _inputs(by("input"))
    if inputs:
        controller.input_mapping = inputs
        for i in inputs:
            deps.append(Dependency("input", i["function"], i["effect"], tuple(i["evidence"])))
    physics = _physics(led, by("physics"), by("collision"), round(hz, 3) if hz else None, ev(ident) if ident else ())

    # --- combat (frame data from rle claims)
    moves = []
    for c in by("move"):
        rle = next(ch for ch in c["checks"] if ch["check"] == "rle")
        runs = [list(x) for x in rle["expect"]]
        where = rle.get("where")
        moves.append(MoveSpec(
            c["name"], c["statement"], hex(_off(rle["offset"])),
            f"{hex(_off(where['offset']))} == {where['eq']}" if where else None,
            [FramePhase(v, n, seconds(n, ev(c))) for v, n in runs], sum(n for _, n in runs), ev(c)))
    damage = {c["subject"]: c for c in by("damage")}
    for m in moves:
        mc = next(c for c in by("move") if c["name"] == m.name)
        d = damage.get(mc["subject"]) or damage.get(m.name)
        if d:
            m.on_hit = _effects(d)
            deps.append(Dependency("on_hit", m.name, d["name"], ev(d)))
    abilities = [_ability(led, c, damage.get(c["subject"])) for c in by("ability")]

    functions = [FunctionSpec(c["subject"], c["name"], c["statement"], ev(c)) for c in by("function")]
    for c in by("function"):
        for ch in c["checks"]:
            if ch["check"] == "called_from":
                deps.append(Dependency("calls", ch["caller"], ch["func"], ev(c)))
    for comp in components:
        if comp.evidence:
            deps.append(Dependency("has_component", "character", comp.path, comp.evidence))
    assets = [AssetSpec(c["subject"], c["statement"] or c["name"], ev(c)) for c in by("asset")]

    rejected = [Rejected(c["id"], c["kind"], c["subject"], c["name"],
                         "; ".join(r["detail"] for r in c["results"] if not r["ok"])) for c in failed]

    skeleton, mesh, materials = _assets(led, by("skeleton"), by("mesh"))
    animation = _animation(led, by("animation"))
    comp = completeness(led.work, led, cfg)
    domains = {
        "identity": "known" if ident else "unknown",
        "time_base": "known" if hz else "unknown",
        "object": _ratio(comp["fields"]),
        "components": _ratio(comp["components"]),
        "component_fields": _ratio(comp["component_fields"]),
        "code": _ratio(comp["functions"]),
        "controller": "partial" if transitions or inputs else "unknown",
        "combat": "partial" if moves else "unknown",
        "damage": "partial" if damage else "unknown",
        "assets": "partial" if assets else "unknown",
        **{k: "unknown" for k in NOT_YET},
        "skeleton": "known" if isinstance(skeleton, dict) else "unknown",
        "mesh": "known" if isinstance(mesh, dict) else "unknown",
        "materials": "known" if isinstance(materials, list) and materials else "unknown",
        "animation": "known" if isinstance(animation, dict) else "unknown",
        "physics": "known" if isinstance(physics, dict) and isinstance(physics["replay"], dict) else
        "partial" if isinstance(physics, dict) else "unknown",
        "collision": "known" if isinstance(physics, dict) and isinstance(physics["collision"], list) else "unknown",
        "input": "partial" if inputs else "unknown",
        "abilities": "partial" if abilities else "unknown",
    }
    completeness_doc = {"domains": domains, "observed_vs_explained": {
        k: {"observed": comp[k]["observed"], "explained": comp[k]["explained"]}
        for k in ("functions", "fields", "components", "component_fields")},
        "note": "Explained counts cover only what the recordings exercised; unrecorded behaviour is not counted."}

    return UCS(UCS_VERSION, source, time_base, conventions, obj, components, controller, moves, functions, assets,
               mesh, skeleton, materials, animation, physics, abilities or Unknown(NOT_YET["abilities"]),
               *(Unknown(NOT_YET[k]) for k in ("camera", "audio")),
               deps, evidence, rejected, completeness_doc)


def _assets(led: Ledger, skel_claims: list, mesh_claims: list):
    """Skeleton, mesh and material domains from verified skeleton/mesh claims (first claim of each kind)."""
    skeleton, mesh, materials = (Unknown(NOT_YET["skeleton"]), Unknown(NOT_YET["mesh"]), Unknown(NOT_YET["materials"]))
    if skel_claims:
        c = skel_claims[0]
        a = led.decoded(c["subject"])
        e = (c["id"],)
        ibm_derived = any("inverse bind" in d for d in a.derived)
        skeleton = {
            "artifact": Fact(c["subject"], e), "sha256": Fact(a.sha256, e), "format": Fact(a.decoder, e),
            "bones": [{"name": b.name, "parent": b.parent,
                       "translation": Fact(list(b.translation), e), "rotation": Fact(list(b.rotation), e),
                       "scale": Fact(list(b.scale), e),
                       "inverse_bind": Fact(b.inverse_bind, e, None, "computed from the bind pose by the decoder")
                       if ibm_derived else Fact(b.inverse_bind, e)} for b in a.skeleton.bones],
            "constraints": Unknown("bone constraints are not stored in this format"),
            "retargeting": Unknown("no retargeting metadata in the source"),
        }
    if mesh_claims:
        c = mesh_claims[0]
        a = led.decoded(c["subject"])
        e = (c["id"],)
        s = a.summary()
        m = a.mesh
        mesh = {
            "artifact": Fact(c["subject"], e), "sha256": Fact(a.sha256, e), "format": Fact(a.decoder, e),
            "vertices": Fact(s["vertices"], e), "triangles": Fact(s["triangles"], e),
            "attributes": Fact(s["attributes"], e),
            "skinned": Fact(m.joints is not None and m.weights is not None, e),
            "submeshes": Fact([[x.first_index, x.index_count, x.material] for x in m.submeshes], e),
            **{k.replace(" ", "_"): Unknown(f"{k} not present in the {a.decoder} format") for k in a.missing},
        }
        materials = [{"name": x.name, "base_color": Fact(list(x.base_color), e) if x.base_color
                      else Unknown("no base colour"),
                      "texture": Fact(x.texture, e) if x.texture else Unknown("no texture reference in the source")}
                     for x in a.materials] or Unknown("the mesh has no materials")
    return skeleton, mesh, materials


def _animation(led: Ledger, claims: list):
    if not claims:
        return Unknown(NOT_YET["animation"])
    c = claims[0]
    e = (c["id"],)
    a = led.decoded(c["subject"])
    an = a.animations
    match = next(ch for ch in c["checks"] if ch["check"] == "anim_matches" and ch["artifact"] == c["subject"])
    cmp_ = led.anim_comparison(match)
    rate = an.sample_rate
    notify_checks = [ch for ch in c["checks"] if ch["check"] == "notify_aligns"]
    clips = []
    for i, clip in enumerate(an.clips):
        notes = []
        for fr, name in clip.notifies:
            aligned = [ch for ch in notify_checks if ch["clip"] == clip.name and ch["notify"] == name]
            notes.append({"name": name, "frame": Fact(fr, e, "frames"),
                          "seconds": Fact(round(fr / rate, 6), e, "s", f"{fr} frames / {rate} Hz sample rate"),
                          "gameplay_event": Fact({k: aligned[0][k] for k in ("offset", "from", "to", "lag")}, e)
                          if aligned else Unknown("no notify_aligns check ties this notify to gameplay")})
        clips.append({"name": clip.name, "index": i, "loop": Fact(clip.loop, e),
                      "length_frames": Fact(clip.length, e, "frames"),
                      "length_seconds": Fact(round(clip.length / rate, 6), e, "s", f"{clip.length} frames / {rate} Hz"),
                      "keys": Fact([f for f, _ in clip.keys], e, "frames"),
                      "bones_animated": Fact(an.bone_count, e), "notifies": notes})
    return {
        "artifact": Fact(c["subject"], e), "sha256": Fact(a.sha256, e), "format": Fact(a.decoder, e),
        "sample_rate": Fact(rate, e, "Hz"),
        "interpolation": Fact(cmp_["interpolation"], e, None, "the interpolation that reproduced the recorded poses"),
        "state_binding": Fact({"path": match["path"], "clip_offset": match.get("clip_offset", 0),
                               "frame_offset": match.get("frame_offset", 4), "pose_offset": match.get("pose_offset", 12),
                               "rule": "clip index = value at clip_offset; frame = value at frame_offset"}, e),
        "runtime_match": {"max_error": Fact(round(cmp_["max_error_deg"], 9), e, "deg"),
                          "snapshots": Fact(cmp_["snapshots"], e), "clips_seen": Fact(cmp_["clips_seen"], e)},
        "clips": clips,
        **{k.replace(" ", "_"): Unknown(f"{k}: not present in the {a.decoder} format") for k in a.missing},
    }


def _effects(c: dict) -> dict:
    """What one hit does, from a damage claim's event_deltas checks: field deltas per event, by object."""
    e = (c["id"],)
    out = []
    for ch in c["checks"]:
        if ch["check"] == "event_deltas":
            out.append({"trace": ch["trace"], "condition": Fact(ch.get("when"), e) if ch.get("when") else
                        Unknown("no condition: every trigger event"),
                        "deltas": [{"object": "self" if d.get("obj", 0) == 0 else f"snapshot object {d['obj']}",
                                    "offset": hex(_off(d["offset"])),
                                    **({"set": Fact(d["eq"], e)} if "eq" in d else {"delta": Fact(d["delta"], e)})}
                                   for d in ch["deltas"]]})
    return {"name": c["name"], "statement": c["statement"], "events": out, "evidence": [c["id"]]}


def _ability(led: Ledger, c: dict, damage: dict | None) -> dict:
    """A resource-gated input (gated_input), with its projectile (motion_fit speed, overlap hit_outcome) if any."""
    e = (c["id"],)
    g = next(ch for ch in c["checks"] if ch["check"] == "gated_input")
    speed = next((ch for ch in c["checks"] if ch["check"] == "motion_fit" and ch["param"] == "speed"), None)
    hit = next((ch for ch in c["checks"] if ch["check"] == "hit_outcome" and ch.get("rule") == "overlap"), None)
    proj = Unknown("no projectile checks in this ability claim")
    launch = next((ch for ch in c["checks"] if ch["check"] == "rle" and ch.get("where", {}).get("eq") == g["to"]), None)
    if speed or hit:
        proj = {"speed": Fact(speed["expect"], e, "units/tick") if speed else Unknown("speed not claimed"),
                "hit_radius": Fact(hit["reach"], e, "units") if hit else Unknown("hit rule not claimed"),
                "hit_radius_proven_range": _reach_range(led, [hit], e) if hit else Unknown("hit rule not claimed"),
                "rule": Fact("hits on the first frame within hit_radius of the defender, then disappears", e)
                if hit else Unknown("hit rule not claimed"),
                "launch_frame": Fact(launch["expect"][0][1] + 1, e, "ticks", "first frame of the ability state in "
                                     "which the projectile is active (rle check)")
                if launch and launch["expect"] and launch["expect"][0][0] == 0
                else Unknown("no rle check on the projectile's active flag during the ability"),
                "object": Fact({"obj": hit["attacker"], "x_offset": hit.get("attacker_x_offset", "0x4"),
                                "active_offset": hit.get("active_offset", "0x0")}, e) if hit
                else Unknown("hit rule not claimed")}
    return {"name": c["name"], "statement": c["statement"],
            "input": {"function": g["func"], "argument": g["arg"], "value": g["value"]},
            "gate": {"resource": f"{g['resource'].get('obj', 0)}:{hex(_off(g['resource']['offset']))}",
                     "min": Fact(g["min"], e),
                     "min_proven_range": Fact(list(led.gate_bounds(g)), e, None,
                                              "(largest value refused, smallest value allowed] in the recording")},
            "cost": Fact(g["cost"], e) if "cost" in g else Unknown("cost not claimed"),
            "state": {"field": hex(_off(g["offset"])), "from": g["from"], "to": g["to"],
                      "lag": Fact(g.get("lag", 1), e, "ticks")},
            "on_hit": _effects(damage) if damage else Unknown("no verified damage claim for this ability"),
            "projectile": proj, "evidence": [c["id"]]}


def _inputs(claims: list) -> list:
    """Input mapping: which captured argument value of which function causes which state change."""
    out = []
    for c in claims:
        for ch in c["checks"]:
            if ch["check"] == "arg_precedes":
                out.append({"name": c["name"], "function": ch["func"], "argument": ch["arg"], "value": ch["value"],
                            "only_from": bool(ch.get("only_from")),
                            "effect": f"{_off(ch['offset']):#x}: {ch['from']} -> {ch['to']}",
                            "lag": Fact(ch.get("lag", 1), (c["id"],), "ticks"), "evidence": [c["id"]]})
    return out


PARAM_UNITS = {"gravity": "units/tick^2", "jump_impulse": "units/tick", "walk_speed": "units/tick", "friction": None}


def _reach_range(led: Ledger, checks: list, e: tuple):
    from ..physics import predicted_hits, reach_bounds
    lo, hi = reach_bounds([predicted_hits(led.trace(ch["trace"]), ch) for ch in checks])
    return Fact([lo, hi], e, "units", "[largest distance that hit, smallest distance that missed) in the recordings")


def _physics(led: Ledger, claims: list, collisions: list, hz: float | None, ident_ev: tuple):
    """Movement parameters (motion_fit), the model that replays recordings (trajectory_matches) and hit rules."""
    if not claims and not collisions:
        return Unknown(NOT_YET["physics"])
    from ..physics import MODEL
    params, replay, model = {}, Unknown("no trajectory_matches check replays a recording"), Unknown("no replay")
    for c in claims:
        e = (c["id"],)
        for ch in c["checks"]:
            if ch["check"] == "motion_fit":
                params[ch["param"]] = Fact(ch["expect"], e, PARAM_UNITS[ch["param"]],
                                           f"measured from snapshots, within {ch.get('tolerance', 1e-3)}")
            if ch["check"] == "trajectory_matches":
                model = Fact(MODEL, e, None, "replays every recorded position from the first snapshot and inputs")
                replay = {"trace": Fact(ch["trace"], e), "tolerance": Fact(ch.get("tolerance", 0.01), e, "units"),
                          "inputs": Fact(ch["inputs"], e)}
                for k, v in ch["params"].items():
                    params.setdefault(k, Fact(v, e, PARAM_UNITS.get(k), "the value the replay used"))
    per_second = {}
    if hz:
        for k, f in params.items():
            if f.unit == "units/tick":
                per_second[k] = Fact(round(f.value * hz, 6), f.evidence + ident_ev, "units/s", f"{f.value} * {hz:.3f} Hz")
            elif f.unit == "units/tick^2":
                per_second[k] = Fact(round(f.value * hz * hz, 6), f.evidence + ident_ev, "units/s^2",
                                     f"{f.value} * ({hz:.3f} Hz)^2")
    for k in PARAM_UNITS:
        params.setdefault(k, Unknown(f"no verified claim measures {k}"))
    collision = []
    for c in collisions:
        hits = [ch for ch in c["checks"]
                if ch["check"] == "hit_outcome" and ch.get("rule", "first_active") == "first_active"]
        if not hits:
            continue
        ch, e = hits[0], (c["id"],)
        collision.append({"name": c["name"],
                          "rule": Fact("|x_defender - x_attacker| <= reach on the first active frame", e),
                          "reach": Fact(ch["reach"], e, "units"),
                          "reach_proven_range": _reach_range(led, hits, e),
                          "attack_state": Fact(ch["attack_state"], e),
                          "active_from": Fact(ch["active_from"], e, "ticks"),
                          "boundary_tested": Fact(sorted({x["trace"] for x in hits}), e)})
    return {"model": model, "parameters": params, "per_second": per_second or Unknown("tick rate unknown"),
            "replay": replay, "collision": collision or Unknown("no verified collision claim"),
            "units": Unknown("source distance units are not calibrated to metres")}


def _ratio(d: dict) -> str:
    if d["observed"] == 0:
        return "unknown"
    return "complete" if d["explained"] == d["observed"] else "partial"


def build_workspace(work) -> UCS:
    with Ledger(work) as led:
        led.verify_all()
        return build(led, load_config(work))

