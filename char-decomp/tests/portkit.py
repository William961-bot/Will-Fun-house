"""Builds the fully claimed toy workspace used by the Stage 8 port tests (every claim is checked by the ledger)."""

from __future__ import annotations

from pathlib import Path

from chardecomp import cli
from chardecomp.ledger import Ledger

SECONDS = "2.0"


def run_cli(*args):
    cli.main([str(a) for a in args])


def build(work: Path, toy_dir: Path, syms: dict) -> Path:
    g, p = syms["g_fighters"], syms["g_projectile"]
    tick = f"toy_fighter+{syms['game_tick']:#x}"
    exe, assets = toy_dir / "toy_fighter", toy_dir / "assets"

    def spawn(script, dist):
        return f"{exe} {assets} {script} 240 {dist}"

    run_cli("init", work, "--binary", exe, "--spawn", spawn("super", 60), "--character", "Ryo")
    run_cli("static", work)
    run_cli("set", work, f"char_base=[toy_fighter+{g:#x}]", f"tick={tick}", "snap_size=0x70")
    opts = ["--snap", "--snap-base", f"[toy_fighter+{g:#x}]", "--snap-base", f"[toy_fighter+{g + 8:#x}]",
            "--snap-base", f"[toy_fighter+{p:#x}]", "--hooks", tick, "--capture-args", tick, "--no-coverage"]
    for label, script, dist in (("super", "super", 60), ("whiff", "heavy", "far"), ("jump", "jump", "far"),
                                ("walk", "walk", "far"), ("at70", "heavy", 70), ("at71", "heavy", 71)):
        run_cli("record", work, label, "--seconds", SECONDS, "--spawn", spawn(script, dist), *opts)
    run_cli("record", work, "load", "--seconds", "1", "--files", "--spawn", spawn("idle", "far"))
    run_cli("record", work, "anim", "--seconds", SECONDS, "--spawn", spawn("heavy", "far"), "--snap", "--follow", "1",
            "--follow-size", "92")
    ch = lambda **kw: kw  # noqa: E731
    fit = lambda tr, prm, v, **kw: ch(check="motion_fit", trace=tr, param=prm, expect=v, tolerance=1e-3,  # noqa: E731
                                      air_state=4, **kw)
    params = {"gravity": 0.5, "jump_impulse": 6.0, "friction": 0.8, "walk_speed": 2.5}
    replay = lambda tr: ch(check="trajectory_matches", trace=tr, input_func=tick, input_arg=2,  # noqa: E731
                           inputs={"3": "walk", "4": "jump"}, params=params, tolerance=0.01)
    hit = lambda tr: ch(check="hit_outcome", trace=tr, attack_state=1, active_from=14, reach=70, defender=1)  # noqa: E731
    deltas = lambda st, hp, meter: ch(check="event_deltas", trace="super", trigger={"obj": 1, "offset": "0x4"},  # noqa: E731
                                      when={"obj": 0, "offset": "0x18", "eq": st},
                                      deltas=[{"obj": 1, "offset": "0x4", "delta": hp},
                                              {"obj": 0, "offset": "0x40", "delta": meter},
                                              {"obj": 1, "offset": "0x18", "eq": 2}])
    inp = lambda tr, v, to, **kw: ch(check="arg_precedes", trace=tr, func=tick, arg=2, value=v, offset="0x18",  # noqa: E731
                                     **{"from": 0, "to": to, "lag": 1, **kw})
    tr = lambda tr_, frm, to, n, **kw: ch(check="transition", trace=tr_, offset="0x18",  # noqa: E731
                                          **{"from": frm, "to": to, "duration": n, **kw})
    claims = [
        ("identity", f"[toy_fighter+{g:#x}]", "ryo", "", [
            ch(check="tick_rate", trace="super", min_hz=20, max_hz=2000),
            ch(check="field_equals", trace="super", offset="0x4", eq=1337, at="all")], ""),
        ("field", "0x4", "hp", "hit points", [ch(check="value_change", trace="super", offset="0x4", obj=1,
                                                  **{"from": 1000, "to": 905})], "i32"),
        ("field", "0x8", "x", "", [ch(check="changes", trace="walk", offset="0x8", type="f32")], "f32"),
        ("field", "0xc", "y", "", [ch(check="changes", trace="jump", offset="0xc", type="f32")], "f32"),
        ("field", "0x10", "vx", "", [ch(check="changes", trace="walk", offset="0x10", type="f32")], "f32"),
        ("field", "0x14", "vy", "", [ch(check="changes", trace="jump", offset="0x14", type="f32")], "f32"),
        ("field", "0x18", "state", "", [ch(check="changes", trace="super", offset="0x18")], "i32"),
        ("field", "0x38", "hitbox_active", "", [ch(check="changes", trace="whiff", offset="0x38")], "i32"),
        ("field", "0x40", "meter", "", [ch(check="changes", trace="super", offset="0x40")], "i32"),
        ("move", "heavy", "heavy", "whiff: 13 startup, 4 active, 20 recovery", [
            ch(check="rle", trace="whiff", offset="0x38", where={"offset": "0x18", "eq": 1},
               expect=[[0, 13], [1, 4], [0, 20]])], ""),
        ("input", "cmd1", "heavy", "", [inp("whiff", 1, 1)], ""),
        ("input", "cmd4", "jump", "", [inp("jump", 4, 4)], ""),
        ("input", "cmd3", "walk", "held; only from idle", [inp("walk", 3, 3, only_from=True)], ""),
        ("physics", "movement", "movement", "", [
            fit("jump", "gravity", 0.5), fit("jump", "jump_impulse", 6.0), fit("walk", "friction", 0.8),
            fit("walk", "walk_speed", 2.5, walk_state=3), replay("jump"), replay("walk")], ""),
        ("collision", "heavy", "heavy_reach", "", [hit("at70"), hit("at71")], ""),
        ("damage", "heavy", "heavy_hit", "", [deltas(1, -95, 19)], ""),
        ("damage", "super", "super_hit", "", [deltas(5, -150, 0)], ""),
        ("ability", "super", "super", "", [
            ch(check="gated_input", trace="super", func=tick, arg=2, value=5, resource={"obj": 0, "offset": "0x40"},
               min=50, cost=50, offset="0x18", lag=1, **{"from": 0, "to": 5}),
            ch(check="motion_fit", trace="super", param="speed", expect=8.0, tolerance=1e-3, obj=2,
               x_offset="0x4", state_offset="0x0", walk_state=1),
            ch(check="hit_outcome", trace="super", rule="overlap", attacker=2, attacker_x_offset="0x4",
               active_offset="0x0", reach=10, defender=1, only_while={"offset": "0x18", "eq": 5}),
            ch(check="rle", trace="super", obj=2, offset="0x0", where={"obj": 0, "offset": "0x18", "eq": 5},
               expect=[[0, 7], [1, 6], [0, 16]])], ""),
        ("transition", "state:1->0", "attack_end", "", [tr("whiff", 1, 0, 37)], ""),
        ("transition", "state:2->0", "hitstun_end", "", [tr("super", 2, 0, 18, obj=1)], ""),
        ("transition", "state:5->0", "super_end", "", [tr("super", 5, 0, 29)], ""),
    ]
    with Ledger(work) as led:
        air = led.trace("jump")
        from chardecomp import traces as T
        n = [e for e in T.transitions(T.series(air, 0x18, "i32"))["states"] if e["value"] == 4][0]["durations"][0]
        claims.append(("transition", "state:4->0", "land", "", [tr("jump", 4, 0, n)], ""))
        led.import_artifact("ryo_model", assets / "ryo" / "model.tfmd")
        led.import_artifact("ryo_anim", assets / "ryo" / "model.tfan")
        for a in ("ryo_model", "ryo_anim"):
            claims.append(("skeleton" if a == "ryo_model" else "animation", a, a, "", [
                ch(check="asset_decodes", artifact=a), ch(check="artifact_loaded", artifact=a, trace="load")]
                + ([ch(check="anim_matches", artifact=a, trace="anim", path="0x68", clip_offset="0x0",
                       frame_offset="0x4", pose_offset="0xc", tolerance_deg=0.01)] if a == "ryo_anim" else []), ""))
        failed = []
        for kind, subject, name, statement, checks, ctype in claims:
            r = led.add(kind, subject, name, statement, checks, ctype=ctype)
            if r["status"] != "verified":
                failed.append((name, [x["detail"] for x in r["results"] if not x["ok"]]))
    if failed:
        raise AssertionError(f"claims failed: {failed}")
    return work
