"""Validate and migrate UCS JSON documents.

`validate(doc)` returns a list of problems (empty = valid). It enforces the UCS contract: every known value
carries evidence that exists in the document's evidence index, every unknown has a reason, units come from a
fixed set, and every domain is present. `migrate(doc)` upgrades older versions step by step."""

from __future__ import annotations

from .model import UCS_VERSION

UNITS = {None, "ticks", "frames", "s", "Hz", "bytes", "deg", "units", "units/tick", "units/tick^2", "units/s",
         "units/s^2"}  # "units": source distance units (uncalibrated)
TOP_LEVEL = ("version", "source", "time_base", "conventions", "object", "components", "controller", "moves",
             "functions", "assets", "mesh", "skeleton", "materials", "animation", "physics", "abilities", "camera",
             "audio", "dependencies", "evidence", "rejected", "completeness")
DOMAIN_STATES = {"known", "complete", "partial", "unknown"}

# version -> (next version, function upgrading a document of that version to the next one).
MIGRATIONS: dict[str, tuple[str, callable]] = {
    # 0.1 -> 0.2: mesh/skeleton/materials may now be objects; every 0.1 document (all three Unknown) is valid 0.2.
    "0.1": ("0.2", lambda doc: dict(doc)),
    # 0.2 -> 0.3: animation may now be an object; 0.2 documents (animation Unknown) are valid 0.3.
    "0.2": ("0.3", lambda doc: dict(doc)),
    # 0.3 -> 0.4: physics and controller.input_mapping may now be objects/lists; 0.3 documents (both Unknown)
    # are valid 0.4.
    "0.3": ("0.4", lambda doc: dict(doc)),
}


class UCSError(ValueError):
    pass


def migrate(doc: dict) -> dict:
    seen = set()
    while doc.get("version") != UCS_VERSION:
        v = doc.get("version")
        if v in seen or v not in MIGRATIONS:
            raise UCSError(f"no migration from UCS version {v!r} to {UCS_VERSION}")
        seen.add(v)
        nxt, fn = MIGRATIONS[v]
        doc = fn(doc)
        doc["version"] = nxt
    return doc


def validate(doc: dict) -> list[str]:
    errors: list[str] = []
    if doc.get("version") != UCS_VERSION:
        errors.append(f"version is {doc.get('version')!r}, expected {UCS_VERSION} (run migrate first)")
    for k in TOP_LEVEL:
        if k not in doc:
            errors.append(f"missing domain {k!r}")
    ids = {str(k) for k in doc.get("evidence", {})}

    def walk(node, path):
        if isinstance(node, dict):
            if "value" in node and "unknown" in node:
                errors.append(f"{path}: both a value and unknown")
            if "value" in node and set(node) <= {"value", "unit", "evidence", "derived"}:
                evs = node.get("evidence")
                if not evs:
                    errors.append(f"{path}: value {node['value']!r} has no evidence")
                for e in evs or []:
                    if str(e) not in ids:
                        errors.append(f"{path}: evidence {e} is not in the evidence index")
                if node.get("unit") not in UNITS:
                    errors.append(f"{path}: unit {node.get('unit')!r} not in {sorted(u for u in UNITS if u)}")
            if "unknown" in node and set(node) == {"unknown"} and not (isinstance(node["unknown"], str) and node["unknown"]):
                errors.append(f"{path}: unknown without a reason")
            if path not in ("$.evidence",) and "evidence" in node and isinstance(node["evidence"], list) \
                    and "value" not in node:
                for e in node["evidence"]:
                    if str(e) not in ids:
                        errors.append(f"{path}: evidence {e} is not in the evidence index")
            for k, v in node.items():
                if path == "$" and k == "evidence":
                    continue
                walk(v, f"{path}.{k}")
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")

    walk(doc, "$")
    for k, state in doc.get("completeness", {}).get("domains", {}).items():
        if state not in DOMAIN_STATES:
            errors.append(f"completeness.domains.{k}: {state!r} not in {sorted(DOMAIN_STATES)}")
    return errors
