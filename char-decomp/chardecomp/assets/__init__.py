"""Asset recovery: format plugins (decode/encode), a neutral model, validation and glTF export.

Supported formats (each tested in tests/test_assets.py): `tfmd` (the toy fighter's model format) and `gltf`
(GLB: read and write). Importing this package registers both plugins."""

from . import gltf, toyfmt  # importing registers the plugins
from .model import Asset, Bone, Material, Mesh, Skeleton, Submesh
from .registry import PLUGINS, AssetFormatError, decode, find, sha256
from .validate import check

__all__ = ["gltf", "toyfmt", "Asset", "Bone", "Material", "Mesh", "Skeleton", "Submesh", "PLUGINS", "AssetFormatError", "decode", "find",
           "sha256", "check"]
