"""Address expressions and code locations, validated before they reach the game.

Locations name code as "module+0xRVA". Address expressions name data and are evaluated by `evalExpr` in
frida_agent.js; this module accepts exactly the grammar that function evaluates:

    expr := term ("+" term)*
    term := "[" expr "]"            (read a pointer)
          | 0x<hex> | <decimal>     (a number)
          | <module name>           (that module's base address)
"""

from __future__ import annotations

import re

_LOC = re.compile(r"^([^+\[\]\s][^+\[\]]*)\+0x([0-9a-fA-F]+)$")
_NUM = re.compile(r"^(0x[0-9a-fA-F]+|\d+)$")
_MODULE = re.compile(r"^[^\[\]+\s][^\[\]+]*$")


class AddressError(ValueError):
    pass


def check_location(s: str) -> str:
    """Validate "module+0xRVA" and return it normalised (lower-case hex)."""
    m = _LOC.match(s.strip())
    if not m:
        raise AddressError(f"{s!r} is not a code location of the form module+0xRVA")
    return f"{m.group(1).strip()}+{int(m.group(2), 16):#x}"


def _split_top(s: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for c in s:
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth < 0:
                raise AddressError(f"unbalanced ']' in {s!r}")
        if c == "+" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += c
    if depth != 0:
        raise AddressError(f"unbalanced '[' in {s!r}")
    parts.append(cur)
    return parts


def check_expr(expr: str) -> str:
    """Validate an address expression; return it stripped. Raises AddressError with the reason."""
    s = expr.strip()
    if not s:
        raise AddressError("empty address expression")
    for part in _split_top(s):
        part = part.strip()
        if not part:
            raise AddressError(f"empty term in {expr!r}")
        if part.startswith("[") and part.endswith("]"):
            check_expr(part[1:-1])
        elif not (_NUM.match(part) or _MODULE.match(part)):
            raise AddressError(f"term {part!r} in {expr!r} is not a number, module name or [pointer]")
    return s


def expr_modules(expr: str) -> set[str]:
    """Module names an expression refers to."""
    out = set()
    for part in _split_top(expr.strip()):
        part = part.strip()
        if part.startswith("[") and part.endswith("]"):
            out |= expr_modules(part[1:-1])
        elif not _NUM.match(part):
            out.add(part)
    return out
