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
    "mesh": "mesh recovery not implemented yet (Stage 4)",
    "skeleton": "skeleton recovery not implemented yet (Stage 4)",
    "materials": "material recovery not implemented yet (Stage 4)",
    "animation": "animation clip recovery not implemented yet (Stage 5)",
    "physics": "physics parameters not recovered yet (Stage 6)",
    "abilities": "ability system not recovered yet (Stage 7)",
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

    comp = completeness(led.work, led, cfg)
    domains = {
        "identity": "known" if ident else "unknown",
        "time_base": "known" if hz else "unknown",
        "object": _ratio(comp["fields"]),
        "components": _ratio(comp["components"]),
        "component_fields": _ratio(comp["component_fields"]),
        "code": _ratio(comp["functions"]),
        "controller": "partial" if transitions else "unknown",
        "combat": "partial" if moves else "unknown",
        "assets": "partial" if assets else "unknown",
        **{k: "unknown" for k in NOT_YET},
    }
    completeness_doc = {"domains": domains, "observed_vs_explained": {
        k: {"observed": comp[k]["observed"], "explained": comp[k]["explained"]}
        for k in ("functions", "fields", "components", "component_fields")},
        "note": "Explained counts cover only what the recordings exercised; unrecorded behaviour is not counted."}

    return UCS(UCS_VERSION, source, time_base, conventions, obj, components, controller, moves, functions, assets,
               *(Unknown(NOT_YET[k]) for k in ("mesh", "skeleton", "materials", "animation", "physics", "abilities",
                                                "camera", "audio")),
               deps, evidence, rejected, completeness_doc)


def _ratio(d: dict) -> str:
    if d["observed"] == 0:
        return "unknown"
    return "complete" if d["explained"] == d["observed"] else "partial"


def build_workspace(work) -> UCS:
    with Ledger(work) as led:
        led.verify_all()
        return build(led, load_config(work))

