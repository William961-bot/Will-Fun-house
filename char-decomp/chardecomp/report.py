"""Write the character dossier from verified claims only. Rejected hypotheses are listed apart, by name."""

from __future__ import annotations

import json
from pathlib import Path

from .ledger import Ledger, _off
from .staticdb import parse_loc
from .workspace import TYPE_SIZE, completeness

C_TYPES = {"i8": "int8_t", "u8": "uint8_t", "i16": "int16_t", "u16": "uint16_t", "i32": "int32_t",
           "u32": "uint32_t", "f32": "float", "i64": "int64_t", "u64": "uint64_t", "f64": "double",
           "ptr": "void *"}


def _evidence(c: dict) -> str:
    return "<br>".join(f"`{ch['check']}` {r['detail']}" for ch, r in zip(c["checks"], c["results"]))


def _cell(s: str) -> str:
    return (s or "").replace("|", "\\|").replace("\n", " ")


def write(work: Path, ledger: Ledger, cfg: dict) -> Path:
    out = work / "report"
    out.mkdir(exist_ok=True)
    ledger.verify_all()
    comp = completeness(work, ledger, cfg)
    ok = ledger.claims(status="verified")
    failed = ledger.claims(status="failed")
    by = lambda kind: [c for c in ok if c["kind"] == kind]  # noqa: E731
    name = cfg.get("character") or "character"

    L = [f"# {name}: verified decomp", ""]
    L.append(f"Binary: `{cfg.get('binary')}` (module `{cfg.get('module')}`)"
             + (f", SHA-256 `{ledger.static.meta('binary_sha256')}`" if ledger.static else ""))
    L.append("")
    L.append("Every row below is backed by checks that `chardecomp verify` re-ran against the recorded traces "
             "and the binary. The **Evidence** column shows what each check measured.")
    L.append("")
    f, d = comp["functions"], comp["fields"]
    L.append(f"**Completeness {comp['score']}%**: {f['explained']}/{f['observed']} observed functions and "
             f"{d['explained']}/{d['observed']} changing fields are explained; {comp['moves']} moves and "
             f"{comp['assets']} assets verified.")
    L.append("")

    unproven = sorted(label for label, i in comp["identity"].items() if not i["verified"])
    if unproven:
        L.append(f"> **Identity not verified** for the snapshot recordings {', '.join(unproven)}: nothing yet proves "
                 "that their object 0 is the character and that their tick runs once per frame, so field and "
                 "frame-data rows from them may describe the wrong object. Add an identity claim (ADR 0003).")
        L.append("")
    idents = by("identity")
    if idents:
        L += ["## Identity", "", "| Character base | Statement | Evidence |", "|---|---|---|"]
        for c in idents:
            L.append(f"| `{c['subject']}` | {_cell(c['statement'])} | {_evidence(c)} |")
        L.append("")

    L += ["## Traces", "", "| Label | Recorded | SHA-256 |", "|---|---|---|"]
    for r in ledger.db.execute("SELECT * FROM traces ORDER BY recorded_at"):
        L.append(f"| {r['label']} | {r['recorded_at']} | `{r['sha256'][:16]}` |")
    L.append("")

    fields = sorted(by("field"), key=lambda c: _off(c["subject"]))
    L += ["## Object layout", "", "| Offset | Type | Name | Meaning | Evidence |", "|---|---|---|---|---|"]
    for c in fields:
        L.append(f"| {_off(c['subject']):#x} | {c['ctype'] or '?'} | `{c['name']}` | {_cell(c['statement'])} | {_evidence(c)} |")
    L.append("")

    L += ["## Functions", "", "| Address | Name | What it does | Evidence |", "|---|---|---|---|"]
    for c in sorted(by("function"), key=lambda c: parse_loc(c["subject"])[1]):
        L.append(f"| `{c['subject']}` | `{c['name']}` | {_cell(c['statement'])} | {_evidence(c)} |")
    L.append("")

    L += ["## Moves and frame data", "", "| Move | Frame data | Evidence |", "|---|---|---|"]
    for c in by("move"):
        L.append(f"| {c['name']} | {_cell(c['statement'])} | {_evidence(c)} |")
    L.append("")

    L += ["## Assets", "", "| File | What it is | Evidence |", "|---|---|---|"]
    for c in by("asset"):
        L.append(f"| `{c['subject']}` | {_cell(c['statement'])} | {_evidence(c)} |")
    L.append("")

    notes = by("note")
    if notes:
        L += ["## Notes", ""]
        L += [f"- **{c['name']}**: {c['statement']} ({_evidence(c)})" for c in notes]
        L.append("")

    L += ["## Not explained yet", ""]
    if not f["unexplained"] and not d["unexplained"]:
        L.append("Nothing: every observed function and changing field has a verified claim.")
    for u in f["unexplained"]:
        L.append(f"- function `{u['func']}`: {', '.join(u['seen'])}")
    for u in d["unexplained"]:
        L.append(f"- field {u['offset']}: changes in {', '.join(u['seen_in'])}")
    L.append("")

    if failed:
        L += ["## Rejected hypotheses", "", "Claims whose checks did not pass. They are not facts.", ""]
        for c in failed:
            L.append(f"- #{c['id']} {c['kind']} `{c['subject']}` \"{c['name']}\": {_evidence(c)}")
        L.append("")

    md = out / "CHARACTER.md"
    md.write_text("\n".join(L), encoding="utf-8")

    # C header from verified fields, with explicit padding where nothing is known.
    H = ["// Generated by chardecomp from verified field claims. Unknown bytes are padding.", "#include <stdint.h>",
         "", f"typedef struct {name.title().replace(' ', '') or 'Character'} {{"]
    pos = 0
    for c in fields:
        off = _off(c["subject"])
        size = TYPE_SIZE.get(c["ctype"] or "i32", 4)
        if off < pos:
            H.append(f"    // overlaps previous field: {c['name']} at {off:#x}")
            continue
        if off > pos:
            H.append(f"    uint8_t unk_{pos:x}[{off - pos:#x}];")
        H.append(f"    {C_TYPES.get(c['ctype'] or 'i32', 'int32_t')} {c['name']}; // {off:#x}")
        pos = off + size
    H.append(f"}} {name.title().replace(' ', '') or 'Character'};")
    (out / "character.h").write_text("\n".join(H) + "\n", encoding="utf-8")

    # Names for Ghidra (ghidra/ApplyCharDecompNames.java) or any other tool.
    names = []
    image_base = ledger.static.meta("image_base") if ledger.static else 0
    for c in by("function"):
        mod, rva = parse_loc(c["subject"])
        names.append({"loc": c["subject"], "rva": rva, "va": image_base + rva, "name": c["name"],
                      "comment": c["statement"]})
    (out / "names.json").write_text(json.dumps(names, indent=2) + "\n", encoding="utf-8")
    return md
