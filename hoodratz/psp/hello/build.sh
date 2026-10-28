#!/usr/bin/env bash
# Build hello/EBOOT.PBP with pspdev on a Linux machine (Ubuntu/Debian, or WSL2).
# First run installs the toolchain into ~/pspdev (about 170 MB download).
#   bash hoodratz/psp/hello/build.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export PSPDEV="${PSPDEV:-$HOME/pspdev}"
export PATH="$PATH:$PSPDEV/bin"

if ! command -v psp-cmake >/dev/null; then
    echo "== installing pspdev into $PSPDEV"
    sudo apt-get update -qq
    sudo apt-get install -y -qq build-essential cmake pkgconf libusb-0.1-4 libgpgme11 libarchive-tools fakeroot curl
    mkdir -p "$PSPDEV"
    curl -fL https://github.com/pspdev/pspdev/releases/latest/download/pspdev-ubuntu-latest-x86_64.tar.gz \
        | tar -xz -C "$(dirname "$PSPDEV")"
    grep -q 'PSPDEV=' ~/.bashrc || printf 'export PSPDEV=%s\nexport PATH="$PATH:$PSPDEV/bin"\n' "$PSPDEV" >> ~/.bashrc
fi

cd "$HERE"
psp-cmake -S . -B build >/dev/null
cmake --build build
ls -l build/EBOOT.PBP
