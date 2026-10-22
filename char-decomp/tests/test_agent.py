"""The agent's tools against a real recorded workspace, and agent.run with a fake client (no network).

The live Claude API loop is not exercised here; these tests check the tools, the request the agent builds,
and that its findings can only enter through the ledger."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from chardecomp import agent
from chardecomp.workspace import load_config


@pytest.fixture
def tools(fresh_work):
    return {t.name: t for t in agent.build_tools(fresh_work, interactive=False)}


def call(tools, tool, **kw):
    return tools[tool].call(kw)


def test_every_tool_has_a_valid_schema(tools):
    assert len(tools) == 25
    for t in tools.values():
        d = t.to_dict()
        assert d["input_schema"]["type"] == "object" and d["description"]


def test_read_tools(toy, tools):
    L = toy["loc"]
    ov = json.loads(call(tools, "overview"))
    assert {t["label"] for t in ov["traces"]} == {"idle", "heavy", "heavy_hit", "heavy_whiff"}
    assert ov["can_record"] is False and ov["completeness"]["identity"]["heavy_hit"]["verified"] is False
    assert L["update_move"] in call(tools, "coverage_diff", action="heavy")
    assert L["game_tick"] in call(tools, "char_methods", trace="heavy_hit")
    assert L["game_tick"] in call(tools, "frame_rate_functions", trace="heavy")
    assert json.loads(call(tools, "function_info", func=L["update_move"]))["func"] == L["update_move"]
    assert L["load_character"] in call(tools, "search_static", text="sprite.bin")
    assert json.loads(call(tools, "changing_fields", trace="heavy_whiff"))
    runs = json.loads(call(tools, "field_runs", trace="heavy_whiff", offset="0x38", where="0x18:i32:1"))
    assert [w["runs"] for w in runs if not w["cut"]][0] == [[0, 13], [1, 4], [0, 20]]
    assert L["update_move"] in call(tools, "watch_hits", trace="heavy_hit")
    assert "ryo/sprite.bin" in call(tools, "file_events", trace="heavy_hit")
    edges = json.loads(call(tools, "state_transitions", trace="heavy_whiff", offset="0x18"))["edges"]
    assert {(e["from"], e["to"]) for e in edges} == {(0, 1), (1, 0)}
    assert L["game_tick"].split("+")[0] in call(tools, "call_sites", trace="heavy_hit", func=L["update_move"])
    assert json.loads(call(tools, "object_graph", trace="heavy_whiff")) == []  # recorded without follow


def test_claims_go_through_the_ledger(toy, tools):
    L = toy["loc"]
    good = json.loads(call(tools, "record_claim", kind="function", subject=L["update_move"], name="update_move",
                           statement="advances the move", checks_json=json.dumps(
                               [{"check": "writes", "trace": "heavy_hit", "func": L["update_move"]}])))
    assert good["status"] == "verified"
    guess = json.loads(call(tools, "record_claim", kind="move", subject="heavy", name="heavy",
                            statement="13/4/21 from the move table", checks_json=json.dumps(
                                [{"check": "rle", "trace": "heavy_whiff", "offset": "0x38",
                                  "where": {"offset": "0x18", "type": "i32", "eq": 1},
                                  "expect": [[0, 13], [1, 4], [0, 21]]}])))
    assert guess["status"] == "failed"
    with pytest.raises(ValueError):
        call(tools, "record_claim", kind="function", subject=L["walk"], name="walk", statement="",
             checks_json=json.dumps([{"check": "static_field", "func": L["walk"], "offset": "0x18"}]))
    listed = json.loads(call(tools, "list_claims"))
    assert [c["status"] for c in listed] == ["verified", "failed"]
    call(tools, "retract_claim", claim_id=listed[1]["id"])
    assert len(json.loads(call(tools, "list_claims"))) == 1
    assert "wrote" in call(tools, "write_report")
    assert json.loads(call(tools, "write_ucs"))["written"].endswith("character.ucs.json")


def test_set_config_validates(toy, tools, fresh_work):
    with pytest.raises(ValueError):
        call(tools, "set_config", key="require_identity", value="false")
    with pytest.raises(ValueError):
        call(tools, "set_config", key="tick", value=f"toy_fighter+{toy['syms']['game_tick'] + 1:#x}")
    with pytest.raises(ValueError):
        call(tools, "set_config", key="char_base", value="[toy_fighter+0x4030")
    assert "unverified" in call(tools, "set_config", key="tick", value=toy["loc"]["update_move"])
    assert load_config(fresh_work)["tick"] == toy["loc"]["update_move"]


def test_recording_is_refused_without_capture(tools):
    with pytest.raises(RuntimeError, match="disabled"):
        call(tools, "request_recording", label="x", instructions="jump")


class FakeRunner:
    def __init__(self, messages):
        self.messages = messages

    def __iter__(self):
        return iter(self.messages)


class FakeClient:
    def __init__(self, messages):
        self.kwargs = None
        self.messages = messages
        self.beta = SimpleNamespace(messages=SimpleNamespace(tool_runner=self._runner))

    def _runner(self, **kwargs):
        self.kwargs = kwargs
        return FakeRunner(self.messages)


def msg(stop, *blocks):
    return SimpleNamespace(stop_reason=stop, content=list(blocks))


def test_run_builds_the_documented_request_and_writes_a_report(fresh_work, capsys):
    client = FakeClient([msg("tool_use", SimpleNamespace(type="tool_use", name="overview", input={})),
                         msg("end_turn", SimpleNamespace(type="text", text="Done: nothing verified yet."))])
    agent.run(fresh_work, goal="frame data", client=client, interactive=False)
    kw = client.kwargs
    assert kw["model"] == "claude-opus-5-5" and kw["thinking"]["type"] == "adaptive"
    assert kw["fallbacks"] == "default"
    assert set(kw["betas"]) == {"server-side-fallback-2026-07-01", "context-management-2025-06-27"}
    assert kw["context_management"]["edits"][0]["type"] == "clear_tool_uses_20250919"
    assert len(kw["tools"]) == 25 and "frame data" in kw["messages"][0]["content"]
    assert "identity claim" in kw["system"]
    out = capsys.readouterr().out
    assert "-> overview" in out and "Done: nothing verified yet." in out
    assert (fresh_work / "report" / "CHARACTER.md").exists()


def test_run_stops_on_refusal(fresh_work, capsys):
    client = FakeClient([msg("refusal"), msg("end_turn", SimpleNamespace(type="text", text="never shown"))])
    agent.run(fresh_work, client=client, interactive=False)
    out = capsys.readouterr().out
    assert "declined" in out and "never shown" not in out
