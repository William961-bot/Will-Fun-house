"""Universal Character Specification (UCS): the typed, engine-independent description of a character.

Every leaf is either a Fact (a value, its unit, and the verified claims that establish it) or an Unknown (with
the reason it is unknown). There are no defaults: anything not established by verified evidence is Unknown.

Serialised form (JSON):
    Fact     {"value": ..., "unit": "ticks" | "Hz" | "s" | "bytes" | null, "evidence": [<claim id>, ...],
              "derived": "how it was computed" (only for values computed from other facts)}
    Unknown  {"unknown": "reason"}
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Union

UCS_VERSION = "0.4"  # 0.2: mesh/skeleton/materials; 0.3: animation; 0.4: physics, collision, input mapping


@dataclass(frozen=True)
class Fact:
    value: Any
    evidence: tuple[int, ...]
    unit: str | None = None
    derived: str | None = None

    def __post_init__(self):
        if not self.evidence:
            raise ValueError(f"a Fact needs evidence (value {self.value!r})")

    def to_json(self) -> dict:
        d = {"value": self.value, "unit": self.unit, "evidence": list(self.evidence)}
        if self.derived:
            d["derived"] = self.derived
        return d


@dataclass(frozen=True)
class Unknown:
    reason: str

    def __post_init__(self):
        if not self.reason:
            raise ValueError("an Unknown needs a reason")

    def to_json(self) -> dict:
        return {"unknown": self.reason}


Value = Union[Fact, Unknown]


def ser(v):
    """Serialise Facts, Unknowns, dataclasses, lists and dicts to JSON-ready data."""
    if isinstance(v, (Fact, Unknown)):
        return v.to_json()
    if hasattr(v, "__dataclass_fields__"):
        return {k: ser(getattr(v, k)) for k in v.__dataclass_fields__}
    if isinstance(v, (list, tuple)):
        return [ser(x) for x in v]
    if isinstance(v, dict):
        return {k: ser(x) for k, x in v.items()}
    return v


# ---------------------------------------------------------------------------------------------- domains


@dataclass
class Source:
    character: Value
    binary: Value
    binary_sha256: Value
    module: Value
    engine: Value
    platform: Value


@dataclass
class TimeBase:
    tick_function: Value
    tick_rate: Value          # Hz, measured from snapshot timestamps
    tick_jitter: Value        # stdev / mean of tick intervals
    note: str = "Durations are stored in source ticks (exact) and seconds (derived from the measured tick rate)."


@dataclass
class Conventions:
    distance_unit: Value
    coordinate_system: Value
    up_axis: Value
    handedness: Value


@dataclass
class FieldSpec:
    offset: int
    type: Value
    name: str
    meaning: str
    evidence: tuple[int, ...]


@dataclass
class ObjectSpec:
    base: Value               # address expression in the source process
    size: Value
    fields: list[FieldSpec] = field(default_factory=list)


@dataclass
class ComponentSpec:
    path: str
    name: str
    meaning: str
    evidence: tuple[int, ...]
    fields: list[FieldSpec] = field(default_factory=list)


@dataclass
class TransitionSpec:
    name: str
    field: str                # "0x18" or "PATH@OFFSET"
    from_value: Any
    to_value: Any
    rule: str
    duration_ticks: Value     # ticks spent in from_value before the change
    duration_seconds: Value
    caused_by: Value          # function location that runs in the same frame
    evidence: tuple[int, ...]


@dataclass
class Controller:
    state_fields: list[str]
    transitions: list[TransitionSpec] = field(default_factory=list)
    input_mapping: Any = field(default_factory=lambda: Unknown("no verified input claim"))


@dataclass
class FramePhase:
    value: Any                # e.g. hitbox active 0/1
    ticks: int
    seconds: Value


@dataclass
class MoveSpec:
    name: str
    statement: str
    measured_field: str       # the field whose runs give the frame data
    condition: str | None     # e.g. "0x18 == 1"
    phases: list[FramePhase]
    total_ticks: int
    evidence: tuple[int, ...]


@dataclass
class FunctionSpec:
    location: str
    name: str
    role: str
    evidence: tuple[int, ...]


@dataclass
class AssetSpec:
    path: str
    role: str
    evidence: tuple[int, ...]


@dataclass
class Dependency:
    kind: str                 # "calls" | "has_component" | "caused_by"
    source: str
    target: str
    evidence: tuple[int, ...]


@dataclass
class Rejected:
    claim: int
    kind: str
    subject: str
    name: str
    reason: str


@dataclass
class UCS:
    version: str
    source: Source
    time_base: TimeBase
    conventions: Conventions
    object: ObjectSpec
    components: list[ComponentSpec]
    controller: Controller
    moves: list[MoveSpec]
    functions: list[FunctionSpec]
    assets: list[AssetSpec]
    mesh: Any                 # dict of Facts/Unknowns when a mesh claim is verified, else Unknown
    skeleton: Any             # {"artifact", "sha256", "format", "bones": [...], ...} or Unknown
    materials: Any            # list of {"name", "base_color", "texture"} or Unknown
    animation: Any            # {"artifact", "sample_rate", "interpolation", "clips": [...], ...} or Unknown
    physics: Any              # {"model", "parameters", "per_second", "replay", "collision"} or Unknown
    abilities: Value
    camera: Value
    audio: Value
    dependencies: list[Dependency]
    evidence: dict                # str(claim id) -> {kind, subject, name, checks, traces: {label: sha256}}
    rejected: list[Rejected]
    completeness: dict

    def to_json(self) -> dict:
        return ser(self)
