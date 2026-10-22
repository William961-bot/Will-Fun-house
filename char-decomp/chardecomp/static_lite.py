"""Built-in static export for x86/x64 PE and ELF files, with no Ghidra needed.

Function boundaries come from the binary's own unwind data (.pdata on x64 PE, .eh_frame on ELF) plus
symbols and exports, so they're the compiler's boundaries rather than heuristics. For every function it
records: direct calls, strings it references, immediates, and [reg+offset] memory accesses (the struct
offsets the function reads and writes). No decompiled C: use the Ghidra exporter or REA for that.

Output follows the same JSON schema as ghidra/ExportCharDecomp.java, so either feeds staticdb. Anything other
than x86/x86-64 PE or ELF raises UnsupportedBinary instead of being disassembled as x86.
"""

from __future__ import annotations

import bisect
import hashlib
from pathlib import Path


class UnsupportedBinary(ValueError):
    """The file is not something this exporter can analyse correctly."""


def export(binary: Path, module: str | None = None) -> dict:
    import capstone
    import lief
    from capstone import x86

    data = binary.read_bytes()
    b = lief.parse(str(binary))
    if b is None:
        raise ValueError(f"lief can't parse {binary}")
    is_pe = isinstance(b, lief.PE.Binary)
    if is_pe:
        image_base = b.optional_header.imagebase
        machine = b.header.machine
        bits = {lief.PE.Header.MACHINE_TYPES.AMD64: 64, lief.PE.Header.MACHINE_TYPES.I386: 32}.get(machine)
    elif isinstance(b, lief.ELF.Binary):
        image_base = b.imagebase
        machine = b.header.machine_type
        bits = {lief.ELF.ARCH.X86_64: 64, lief.ELF.ARCH.I386: 32}.get(machine)
    else:
        raise UnsupportedBinary(f"{binary.name}: only PE and ELF are supported by the built-in exporter")
    if bits is None:
        # Disassembling another architecture as x86 would produce plausible-looking garbage.
        raise UnsupportedBinary(f"{binary.name}: CPU architecture {str(machine).split('.')[-1]} is not supported "
                                "by the built-in exporter (x86 and x86-64 only); use the Ghidra exporter")

    # Executable and readable sections as (start_va, end_va, bytes, executable)
    secs = []
    for s in b.sections:
        va = s.virtual_address + (image_base if is_pe else 0)
        content = bytes(s.content)
        if not content:
            continue
        if is_pe:
            exe = s.has_characteristic(lief.PE.Section.CHARACTERISTICS.MEM_EXECUTE)
        else:
            exe = s.has(lief.ELF.Section.FLAGS.EXECINSTR)
        secs.append((va, va + len(content), content, exe))
    secs.sort()

    def read(va: int, n: int) -> bytes:
        for start, end, content, _ in secs:
            if start <= va < end:
                return content[va - start: va - start + n]
        return b""

    def is_exec(va: int) -> bool:
        return any(start <= va < end and exe for start, end, _, exe in secs)

    def string_at(va: int) -> str | None:
        raw = read(va, 256)
        if not raw:
            return None
        end = raw.find(b"\0")
        if end < 4:
            # UTF-16LE?
            if len(raw) > 8 and raw[1] == 0 and raw[3] == 0 and 32 <= raw[0] < 127:
                chars = []
                for i in range(0, len(raw) - 1, 2):
                    c = raw[i] | raw[i + 1] << 8
                    if c == 0:
                        break
                    if not (32 <= c < 127 or c in (9, 10, 13)):
                        return None
                    chars.append(chr(c))
                return "".join(chars) if len(chars) >= 4 else None
            return None
        s = raw[:end]
        if all(32 <= c < 127 or c in (9, 10, 13) for c in s):
            return s.decode("ascii")
        return None

    # Function starts and sizes
    to_va = (lambda a: a + image_base) if is_pe else (lambda a: a)
    funcs: dict[int, dict] = {}
    for f in b.functions:
        va = to_va(f.address) if is_pe and f.address < image_base else f.address
        if not is_exec(va):
            continue
        cur = funcs.get(va)
        name = f.name or ""
        if cur is None or (f.size and not cur["size"]) or (name and not cur["name"]):
            funcs[va] = {"size": f.size or (cur or {}).get("size", 0), "name": name or (cur or {}).get("name", "")}
    if not is_pe:
        for sym in b.symbols:
            if sym.type == lief.ELF.Symbol.TYPE.FUNC and sym.value and is_exec(sym.value):
                cur = funcs.setdefault(sym.value, {"size": sym.size, "name": ""})
                cur["name"] = cur["name"] or sym.name
                cur["size"] = cur["size"] or sym.size

    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64 if bits == 64 else capstone.CS_MODE_32)
    md.detail = True
    frame_regs = {x86.X86_REG_RSP, x86.X86_REG_RBP, x86.X86_REG_ESP, x86.X86_REG_EBP, x86.X86_REG_RIP,
                  x86.X86_REG_EIP, 0}
    image_hi = max(e for _, e, _, _ in secs)

    # Discover direct call targets that unwind data missed (leaf functions in 32-bit code, etc.)
    pending = sorted(funcs)
    starts = set(funcs)
    out = []
    while pending:
        va = pending.pop(0)
        info = funcs[va]
        size = info["size"]
        if not size:
            later = sorted(s for s in starts if s > va)
            size = min((later[0] - va) if later else 0x1000, 0x10000)
        code = read(va, size)
        calls, strings, consts, fields, data_refs, asm = [], [], [], {}, [], []
        for insn in md.disasm(code, va):
            asm.append(f"{insn.address - image_base:#x}: {insn.mnemonic} {insn.op_str}".rstrip())
            is_call = insn.group(capstone.CS_GRP_CALL)
            is_jump = insn.group(capstone.CS_GRP_JUMP)
            for op in insn.operands:
                if op.type == x86.X86_OP_IMM:
                    v = op.imm
                    if (is_call or is_jump) and is_exec(v):
                        if is_call or not (va <= v < va + size):
                            calls.append(v - image_base)
                            if v not in starts and is_call:
                                starts.add(v)
                                funcs[v] = {"size": 0, "name": ""}
                                bisect.insort(pending, v)
                    else:
                        if abs(v) < 1 << 32:
                            consts.append(v)
                        if image_base <= v < image_hi and v - image_base > 0x1000:
                            data_refs.append(v - image_base)
                            s = string_at(v)
                            if s:
                                strings.append(s)
                elif op.type == x86.X86_OP_MEM:
                    m = op.mem
                    if m.base in (x86.X86_REG_RIP, x86.X86_REG_EIP):
                        target = insn.address + insn.size + m.disp
                        data_refs.append(target - image_base)
                        s = string_at(target)
                        if s:
                            strings.append(s)
                    elif m.base == 0 and m.index == 0 and image_base <= m.disp < image_hi:
                        data_refs.append(m.disp - image_base)
                    elif m.base not in frame_regs and 0 <= m.disp < 0x10000:
                        acc = set(fields.get(m.disp, ""))
                        if op.access & capstone.CS_AC_READ:
                            acc.add("r")
                        if op.access & capstone.CS_AC_WRITE:
                            acc.add("w")
                        fields[m.disp] = "".join(sorted(acc))
        out.append({
            "rva": va - image_base, "size": size, "name": info["name"],
            "calls": sorted(set(calls)), "strings": sorted(set(strings)), "consts": sorted(set(consts)),
            "fields": [[d, a] for d, a in sorted(fields.items())], "data_refs": sorted(set(data_refs)),
            "asm": "\n".join(asm),
        })

    return {
        "module": module or binary.name, "image_base": image_base, "arch": f"x86-{bits}",
        "format": "pe" if is_pe else "elf", "source": "lite",
        "binary_sha256": hashlib.sha256(data).hexdigest(),
        "functions": sorted(out, key=lambda f: f["rva"]),
    }
