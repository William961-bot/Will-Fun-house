"""Asset format plugins. A plugin declares a name, how to recognise its files, and how to decode (and, if it can,
encode) them. Support for a format is claimed only by plugins with tests (see tests/test_assets.py)."""

from __future__ import annotations

import hashlib
from typing import Callable

from .model import Asset


class AssetFormatError(ValueError):
    """The bytes are not a valid file of this format."""


class Plugin:
    name: str = ""
    extensions: tuple[str, ...] = ()

    def sniff(self, data: bytes) -> bool:
        raise NotImplementedError

    def decode(self, data: bytes, source: str) -> Asset:
        raise NotImplementedError

    def encode(self, asset: Asset) -> bytes:
        raise NotImplementedError(f"{self.name} plugin cannot encode")

    @property
    def can_encode(self) -> bool:
        return type(self).encode is not Plugin.encode


PLUGINS: dict[str, Plugin] = {}


def register(cls: Callable[[], Plugin]):
    p = cls()
    PLUGINS[p.name] = p
    return cls


def find(data: bytes, name: str | None = None) -> Plugin:
    if name:
        if name not in PLUGINS:
            raise AssetFormatError(f"no asset plugin named {name!r}; have {sorted(PLUGINS)}")
        return PLUGINS[name]
    for p in PLUGINS.values():
        if p.sniff(data):
            return p
    raise AssetFormatError(f"no asset plugin recognises this file; have {sorted(PLUGINS)}")


def decode(data: bytes, source: str, name: str | None = None) -> Asset:
    return find(data, name).decode(data, source)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
