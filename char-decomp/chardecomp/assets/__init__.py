"""Asset recovery: format plugins (decode/encode), a neutral model, validation and glTF export.

Supported formats (each tested in tests/test_assets.py): `tfmd` / `tfan` (the toy fighter's model and clip
formats) and `gltf` (GLB: read and write, skins and rotation animations). Importing this package registers both plugins."""

from . import gltf, toyfmt  # importing registers the plugins
from .model import AnimationSet, Asset, Bone, Clip, Material, Mesh, Skeleton, Submesh
from .registry import PLUGINS, AssetFormatError, decode, find, sha256
from .validate import check


def combine(model: Asset, anim: Asset) -> Asset:
    """A model (skeleton, mesh, materials) with the clips from a separate animation asset."""
    return Asset(f"{model.decoder}+{anim.decoder}", f"{model.source}+{anim.source}", model.sha256, model.skeleton,
                 model.mesh, model.materials, anim.animations, missing=model.missing + anim.missing,
                 derived=model.derived + anim.derived)

__all__ = ["gltf", "toyfmt", "AnimationSet", "Clip", "Asset", "Bone", "Material", "Mesh", "Skeleton", "Submesh", "PLUGINS", "AssetFormatError", "decode", "find",
           "sha256", "check", "combine"]
