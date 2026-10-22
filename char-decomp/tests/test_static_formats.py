"""Static exporter: unsupported architectures are rejected, PE32/PE32+ are analysed correctly.

Cross-compiled fixtures need zig (`pip install ziglang`); those tests skip without it. The patched-ELF
rejection test always runs."""

from __future__ import annotations

import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path

import lief
import pytest

from chardecomp import static_lite
from chardecomp.static_lite import UnsupportedBinary

from conftest import ROOT, run_cli

HAVE_ZIG = importlib.util.find_spec("ziglang") is not None
needs_zig = pytest.mark.skipif(not HAVE_ZIG, reason="needs zig for cross compiling (pip install ziglang)")


def zig_cc(target: str, src: Path, out: Path):
    subprocess.run([sys.executable, "-m", "ziglang", "cc", "-target", target, "-O1", "-o", str(out), str(src)],
                   check=True, capture_output=True)


def test_patched_aarch64_elf_is_rejected(toy, tmp_path):
    # Same bytes as an x86-64 binary, but e_machine says AArch64: the exporter must not disassemble it as x86.
    p = tmp_path / "toy_arm"
    data = bytearray((toy["dir"] / "toy_fighter").read_bytes())
    data[18:20] = (183).to_bytes(2, "little")  # EM_AARCH64
    p.write_bytes(bytes(data))
    with pytest.raises(UnsupportedBinary, match="AARCH64"):
        static_lite.export(p)


@needs_zig
def test_real_aarch64_elf_is_rejected_and_cli_reports_it(tmp_path, capsys):
    src = tmp_path / "arm.c"
    src.write_text("int add(int a, int b) { return a + b; }\nint main(void) { return add(1, 2); }\n")
    exe = tmp_path / "arm64"
    zig_cc("aarch64-linux-gnu", src, exe)
    with pytest.raises(UnsupportedBinary):
        static_lite.export(exe)
    w = tmp_path / "W"
    run_cli("init", w, "--binary", exe)
    with pytest.raises(SystemExit) as e:
        run_cli("static", w)
    assert "UnsupportedBinary" in str(e.value) and "AARCH64" in str(e.value)
    assert not (w / "static.db").exists()


@needs_zig
@pytest.mark.parametrize("target,bits", [("x86_64-windows-gnu", 64), ("x86-windows-gnu", 32)])
def test_pe_exports_are_analysed(tmp_path, target, bits):
    exe = tmp_path / "pe_mini.exe"
    zig_cc(target, ROOT / "fixtures" / "pe_mini.c", exe)
    b = lief.parse(str(exe))
    hurt = [e for e in b.get_export().entries if e.name.lstrip("_") == "hurt"][0]
    out = static_lite.export(exe)
    assert out["format"] == "pe" and out["arch"] == f"x86-{bits}"
    assert out["image_base"] == b.optional_header.imagebase
    by_rva = {f["rva"]: f for f in out["functions"]}
    f = by_rva[hurt.address]
    assert f["size"] > 0
    assert [0, "rw"] in f["fields"] or [0, "w"] in f["fields"]  # f->hp -= amount writes offset 0
    main = [g for g in out["functions"] if "fighter hp" in g["strings"]]
    assert main and hurt.address in main[0]["calls"]


def test_non_executable_file_is_rejected(tmp_path):
    p = tmp_path / "notes.txt"
    p.write_text("not a binary")
    with pytest.raises(ValueError):
        static_lite.export(p)


@pytest.mark.skipif(shutil.which("gcc") is None, reason="needs gcc")
def test_x86_64_elf_still_exports(toy):
    out = static_lite.export(toy["dir"] / "toy_fighter")
    assert out["arch"] == "x86-64"
    assert toy["syms"]["update_move"] in {f["rva"] for f in out["functions"]}
