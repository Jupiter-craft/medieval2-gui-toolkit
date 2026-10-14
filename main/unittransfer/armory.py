"""Armory Studio, the kitbash workbench in the Models Editor (Phase 95e on).

A port of the behaviour of Armory Studio 3D (``Reference/armorystudio3d/``,
MIT, by muhamadridhomm) onto this toolkit's own readers and writers; none of
its code or art is carried over (ROADMAP, Phase 95).

The workbench builds one model out of parts of others. A part is an
**object**: one group of a source model (``Body``/``horse_body_01``), or one
object of an external file. The models the parts come out of are **assets**,
loaded from any installed mod - a model entry, the models of a unit - or from
a ``.obj``, ``.glb`` or ``.dae`` on disk. Nothing is copied while you work:
an object is its source and the changes made to it, and the export (95i)
reads each source again.

This module is the server side of the assets panel:

* :func:`catalogue` - what a mod offers to import, light enough to list;
* :func:`asset_view` - one model entry as an asset: its objects, skins,
  bones and skeletons, with a fingerprint per object;
* :func:`read_external` - an ``.obj``, ``.glb`` or ``.dae`` read into a
  :class:`~unittransfer.mesh.MeshFile` in the game's space, and
  :func:`external_view`, the same asset shape for it.

**Duplicate detection** is by fingerprint, a hash of an object's triangles
as positions, and by shape, its triangle count, centre and spread compared
with a tolerance, so the same art copied into another mod, loaded twice or
gone through an ``.obj`` is told apart from a part that merely shares a name.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import struct
import threading
import xml.etree.ElementTree as ET
from array import array
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

from . import config, gamepack, mesh
from . import i18n as _i18n

#: The image types an external model's textures may be in.
IMAGE_SUFFIXES = (".png", ".tga", ".dds", ".jpg", ".jpeg", ".texture", ".bmp")
#: The model files an external asset may be.
EXTERNAL_SUFFIXES = (".obj", ".glb", ".gltf", ".dae")

#: Where the workbench keeps its project and what it unpacks out of a .glb.
ARMORY_DIR = config.CONFIG_DIR / "armory"


class ArmoryError(ValueError):
    """Something the workbench cannot do, said as a sentence."""


# ---------------------------------------------------------------------------
# names


#: ``prefix__part`` with ``__opt`` for an optional part: the Blender kit's
#: object names, which is also how IWTE joins a group's type and mesh name.
_KIT_NAME = re.compile(r"^(?P<type>.+?)__(?P<mesh>.+?)(?:__(?P<opt>opt))?(?:\.\d{3})?$", re.I)


def split_name(name: str) -> Tuple[str, str, int]:
    """``(group type, mesh name, flag)`` out of an object's name.

    ``Body__horse_body_01__opt`` is type ``Body``, mesh ``horse_body_01``,
    optional. A name not in the kit's form is its own type and mesh, required.
    """
    m = _KIT_NAME.match(name.strip())
    if m:
        return m.group("type"), m.group("mesh"), 1 if m.group("opt") else 0
    clean = re.sub(r"\.\d{3}$", "", name.strip()) or "part"
    return clean, clean, 0


# ---------------------------------------------------------------------------
# fingerprints


def fingerprint(m: mesh.MeshFile, indices: Sequence[int]) -> str:
    """A hash of one object's triangles as positions, to a tenth of a millimetre.

    By position and not by index, so the same art in another file with its
    vertices in another order still matches as long as its triangles run the
    same way; rounded, so a copy that went through a float conversion does.
    """
    p = m.positions
    h = hashlib.blake2b(digest_size=10)
    buf = array("i")
    for i in indices:
        buf.extend((round(p[i * 3] * 10000), round(p[i * 3 + 1] * 10000),
                    round(p[i * 3 + 2] * 10000)))
        if len(buf) > 30000:
            h.update(buf.tobytes())
            buf = array("i")
    h.update(buf.tobytes())
    return h.hexdigest()


def shape(m: mesh.MeshFile, indices: Sequence[int]) -> List[float]:
    """``[triangles, centre x, y, z, spread]`` of one object, compared with a
    tolerance by the page: a copy whose floats went through six decimals in
    an ``.obj`` lands on the other side of a rounding step often enough that
    :func:`fingerprint` alone misses it."""
    p = m.positions
    n = len(indices)
    if not n:
        return [0, 0.0, 0.0, 0.0, 0.0]
    c = [sum(p[i * 3 + k] for i in indices) / n for k in range(3)]
    spread = (sum((p[i * 3] - c[0]) ** 2 + (p[i * 3 + 1] - c[1]) ** 2 + (p[i * 3 + 2] - c[2]) ** 2
                  for i in indices) / n) ** 0.5
    return [n // 3, round(c[0], 5), round(c[1], 5), round(c[2], 5), round(spread, 5)]


def file_hash(data: bytes) -> str:
    return hashlib.blake2b(data, digest_size=10).hexdigest()


# ---------------------------------------------------------------------------
# what a mod offers


def catalogue(mod) -> dict:
    """Every model entry and every unit with a soldier model, for the import list.

    A row per entry is its name, its LOD count and where its first LOD lives;
    a row per unit names the models it uses, each tagged with the slot
    (soldier, officer, upgrade) so the picker can offer them by role.
    """
    entries = []
    seen = set()
    for e in mod.modeldb.entries:
        k = e.name.lower()
        if k in seen:
            continue
        seen.add(k)
        entries.append({"name": e.name, "lods": len(e.lods),
                        "mesh": (e.lods[0][0] if e.lods else "").replace("\\", "/"),
                        "skeletons": e.skeletons()[:2]})
    known = {e["name"].lower() for e in entries}
    units = []
    for u in mod.edu.units:
        if not u.soldier_model:
            continue
        models = [{"name": u.soldier_model.lower(), "role": "soldier"}]
        models += [{"name": o.lower(), "role": "officer", "n": i + 1}
                   for i, o in enumerate(u.officers)]
        models += [{"name": a.lower(), "role": "upgrade", "n": i + 1}
                   for i, a in enumerate(u.armour_ug_models)]
        for row in models:
            row["missing"] = row["name"] not in known
        units.append({"type": u.type, "category": (u.category or "").lower(),
                      "class": (getattr(u, "class_type", "") or "").lower(),
                      "mount": u.mount or "", "models": models})
    return {"mod": mod.name, "entries": entries, "units": units}


def _read_entry_mesh(mod, entry, lod: int = 0) -> Tuple[mesh.MeshFile, str]:
    if not entry.lods:
        raise ArmoryError(_i18n.msg("eng.armory.entry_has_no_lods", "{name} names no model file", name=entry.name))
    rel = entry.lods[min(lod, len(entry.lods) - 1)][0].replace("\\", "/").strip()
    path, _where = gamepack.lookup(rel, mod)
    if path is None or not path.is_file():
        raise ArmoryError(_i18n.msg("eng.armory.mesh_not_found", "{rel} is in neither the mod, the game nor its packs", rel=rel))
    try:
        return mesh.read_mesh(path), file_hash(path.read_bytes())
    except mesh.MeshError as e:
        raise ArmoryError(str(e)) from e


def _objects(m: mesh.MeshFile) -> List[dict]:
    out = []
    for i, g in enumerate(m.groups):
        out.append({"index": i, "name": g.name, "mesh": g.texture_group,
                    "flag": g.flag, "triangles": g.triangles, "sheets": g.sheets,
                    "texture": g.texture,
                    "fingerprint": fingerprint(m, g.indices),
                    "shape": shape(m, g.indices)})
    return out


def asset_view(mod, name: str) -> dict:
    """One model entry as an asset: its first LOD's objects, skins and bones."""
    entry = mod.modeldb.by_name().get((name or "").lower())
    if entry is None:
        raise ArmoryError(_i18n.msg("eng.armory.no_such_entry", "{mod} has no model entry {name}", mod=mod.name, name=name))
    m, digest = _read_entry_mesh(mod, entry)
    view = mesh.entry_view(entry, mod.data, mod)
    return {"kind": "entry", "mod": mod.name, "entry": entry.name,
            "mesh": view["lods"][0]["rel"] if view["lods"] else "",
            "lods": len(entry.lods), "file_hash": digest,
            "skins": view["skins"], "skeletons": entry.skeletons(),
            "bones": m.bones, "vertices": m.vertices, "triangles": m.triangles,
            "objects": _objects(m)}


# ---------------------------------------------------------------------------
# external models


class _Builder:
    """Collects objects into one vertex pool in the game's space.

    Every external format is right-handed with Y up, and the game is
    left-handed (``mesh.py``), so x is negated and each triangle's winding
    reversed, the inverse of what ``modelexport`` does on the way out.
    """

    def __init__(self, source: str):
        self.m = mesh.MeshFile(source=source, format="mesh")
        self.weights = array("f")
        self.ids = bytearray()
        self.skinned = False
        self.object_textures: List[str] = []

    def add(self, name: str, pos, nrm, uv, tris, texture: str = "",
            joints=None, weights=None, bone_names: Sequence[str] = ()):
        # an object takes only the vertices its own triangles use: a .glb's
        # primitives can all share one pool (this toolkit's exporter does)
        used = sorted({i for t in tris for i in t})
        if len(used) < len(pos):
            remap = {old: new for new, old in enumerate(used)}
            pick = lambda seq: [seq[i] for i in used] if seq is not None else None
            pos, nrm, uv = pick(pos), pick(nrm), pick(uv)
            joints, weights = pick(joints), pick(weights)
            tris = [(remap[a], remap[b], remap[c]) for a, b, c in tris]
        base = self.m.vertices
        n = len(pos)
        for x, y, z in pos:
            self.m.positions.extend((-x, y, z))
        for i in range(n):
            if nrm:
                x, y, z = nrm[i]
                self.m.normals.extend((-x, y, z))
            else:
                self.m.normals.extend((0.0, 1.0, 0.0))
            if uv:
                self.m.uvs.extend(uv[i])
            else:
                self.m.uvs.extend((0.0, 0.0))
        if joints is not None and bone_names:
            self.skinned = True
            for i in range(n):
                pairs = sorted(zip(weights[i], joints[i]), reverse=True)[:2]
                while len(pairs) < 2:
                    pairs.append((0.0, 0))
                total = pairs[0][0] + pairs[1][0] or 1.0
                ids = []
                for w, j in pairs:
                    bone = bone_names[j] if j < len(bone_names) else ""
                    if bone not in self.m.bones:
                        self.m.bones.append(bone)
                    ids.append(self.m.bones.index(bone))
                    self.weights.append(w / total)
                # the file's packing: the first weight's bone in the THIRD
                # byte, the second's in the second (mesh.geometry_payload)
                self.ids += bytes((0, ids[1], ids[0], 0))
        else:
            for _ in range(n):
                self.weights.extend((1.0, 0.0))
                self.ids += bytes(4)
        idx = array("H")
        for a, b, c in tris:
            idx.extend((a + base, c + base, b + base))
        gtype, gmesh, flag = split_name(name)
        self.m.groups.append(mesh.MeshGroup(gtype, gmesh, idx, flag, texture=texture))

    def done(self) -> mesh.MeshFile:
        if self.m.vertices > 0xFFFF + 1:
            raise ArmoryError(_i18n.msg("eng.armory.too_many_vertices", "{n:,} vertices: a .mesh indexes at most 65,536", n=self.m.vertices))
        if not self.m.groups:
            raise ArmoryError(_i18n.msg("eng.armory.no_objects", "no geometry in this file"))
        if self.skinned:
            self.m.weights = self.weights
            self.m.bone_ids = bytes(self.ids)
        self.m.textures = sorted({g.texture for g in self.m.groups if g.texture})
        mesh._classify_sheets(self.m)
        return self.m


def _fan(face: Sequence[int]) -> List[Tuple[int, int, int]]:
    return [(face[0], face[i], face[i + 1]) for i in range(1, len(face) - 1)]


def _read_obj(path: Path) -> mesh.MeshFile:
    """An ``.obj``: ``o``/``g`` start an object, ``usemtl`` names its material,
    ``map_Kd`` in the ``.mtl`` its texture. ``v`` counts from the bottom of an
    image in OBJ and from the top in the game, so it is flipped."""
    text = path.read_text(encoding="utf-8", errors="replace")
    vs, vts, vns = [], [], []
    materials: Dict[str, str] = {}
    objects: List[dict] = []
    cur = None

    def start(name):
        nonlocal cur
        cur = {"name": name, "faces": [], "mtl": cur["mtl"] if cur else ""}
        objects.append(cur)

    for raw in text.splitlines():
        parts = raw.split()
        if not parts or parts[0].startswith("#"):
            continue
        tag = parts[0]
        if tag == "v":
            vs.append(tuple(float(x) for x in parts[1:4]))
        elif tag == "vt":
            vts.append((float(parts[1]), 1.0 - float(parts[2]) if len(parts) > 2 else 0.0))
        elif tag == "vn":
            vns.append(tuple(float(x) for x in parts[1:4]))
        elif tag in ("o", "g"):
            name = " ".join(parts[1:]) or "part"
            if cur is None or cur["faces"] or tag == "o":
                start(name)
            else:
                cur["name"] = name
        elif tag == "usemtl":
            if cur is None:
                start(path.stem)
            if cur["faces"]:
                start(cur["name"])
            cur["mtl"] = " ".join(parts[1:])
        elif tag == "mtllib":
            mtl = path.parent / " ".join(parts[1:])
            if mtl.is_file():
                name = ""
                for line in mtl.read_text(encoding="utf-8", errors="replace").splitlines():
                    bits = line.split()
                    if not bits:
                        continue
                    if bits[0] == "newmtl":
                        name = " ".join(bits[1:])
                    elif bits[0].lower() == "map_kd" and name:
                        materials[name] = bits[-1]
        elif tag == "f":
            if cur is None:
                start(path.stem)
            cur["faces"].append([tuple(int(x) if x else 0 for x in (c.split("/") + ["", ""])[:3])
                                 for c in parts[1:]])
    b = _Builder(str(path))
    for ob in objects:
        if not ob["faces"]:
            continue
        key: Dict[tuple, int] = {}
        pos, nrm, uv, tris = [], [], [], []
        for face in ob["faces"]:
            ids = []
            for vi, ti, ni in face:
                k = (vi, ti, ni)
                if k not in key:
                    key[k] = len(pos)
                    pos.append(vs[vi - 1 if vi > 0 else vi])
                    uv.append(vts[ti - 1 if ti > 0 else ti] if ti else (0.0, 0.0))
                    nrm.append(vns[ni - 1 if ni > 0 else ni] if ni else (0.0, 1.0, 0.0))
                ids.append(key[k])
            tris += _fan(ids)
        b.add(ob["name"], pos, nrm if vns else None, uv, tris,
              texture=materials.get(ob["mtl"], ""))
    return b.done()


_GL_TYPES = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
_GL_WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def _read_gltf(path: Path) -> Tuple[mesh.MeshFile, Dict[str, bytes]]:
    """A ``.glb`` or ``.gltf``: one object per primitive, named for its node.

    Images packed inside the file come back as bytes by name, to be unpacked
    beside the project; ``v`` counts from the top in glTF as in the game.
    """
    data = path.read_bytes()
    buffers: List[bytes] = []
    if data[:4] == b"glTF":
        from .modelexport import read_glb
        gltf, binary = read_glb(data)
        buffers = [binary]
    else:
        gltf = json.loads(data.decode("utf-8"))
        for buf in gltf.get("buffers", []):
            uri = buf.get("uri", "")
            if uri.startswith("data:"):
                buffers.append(base64.b64decode(uri.split(",", 1)[1]))
            else:
                buffers.append((path.parent / uri).read_bytes())

    def view_bytes(vi: int) -> bytes:
        v = gltf["bufferViews"][vi]
        start = v.get("byteOffset", 0)
        return buffers[v.get("buffer", 0)][start:start + v["byteLength"]]

    def accessor(ai: int) -> List[tuple]:
        a = gltf["accessors"][ai]
        fmt = _GL_TYPES[a["componentType"]]
        width = _GL_WIDTH[a["type"]]
        v = gltf["bufferViews"][a["bufferView"]]
        raw = view_bytes(a["bufferView"])
        size = struct.calcsize(fmt)
        stride = v.get("byteStride") or size * width
        off = a.get("byteOffset", 0)
        out = []
        for i in range(a["count"]):
            vals = struct.unpack_from(f"<{width}{fmt}", raw, off + i * stride)
            if a.get("normalized") and fmt != "f":
                top = float(2 ** (8 * size) - 1 if fmt.isupper() else 2 ** (8 * size - 1) - 1)
                vals = tuple(x / top for x in vals)
            out.append(vals)
        return out

    images: Dict[str, bytes] = {}
    names: List[str] = []
    for i, img in enumerate(gltf.get("images", [])):
        name = img.get("name") or f"image_{i}"
        ext = ".png" if "png" in img.get("mimeType", "png") else ".jpg"
        if "bufferView" in img:
            images[name + ext] = view_bytes(img["bufferView"])
            names.append(name + ext)
        else:
            uri = img.get("uri", "")
            if uri.startswith("data:"):
                images[name + ext] = base64.b64decode(uri.split(",", 1)[1])
                names.append(name + ext)
            else:
                names.append(uri)

    def material_texture(mi) -> str:
        if mi is None:
            return ""
        mat = gltf.get("materials", [])[mi]
        tex = (mat.get("pbrMetallicRoughness", {}).get("baseColorTexture") or {}).get("index")
        if tex is None:
            return ""
        src = gltf.get("textures", [])[tex].get("source")
        return names[src] if src is not None and src < len(names) else ""

    b = _Builder(str(path))
    nodes = gltf.get("nodes", [])
    for node in nodes:
        if "mesh" not in node:
            continue
        gm = gltf["meshes"][node["mesh"]]
        skin = gltf.get("skins", [])[node["skin"]] if "skin" in node else None
        bone_names = [nodes[j].get("name", f"bone_{j}") for j in skin["joints"]] if skin else []
        prims = gm.get("primitives", [])
        for pi, prim in enumerate(prims):
            at = prim["attributes"]
            pos = accessor(at["POSITION"])
            nrm = accessor(at["NORMAL"]) if "NORMAL" in at else None
            uv = accessor(at["TEXCOORD_0"]) if "TEXCOORD_0" in at else None
            if "indices" in prim:
                flat = [i[0] for i in accessor(prim["indices"])]
            else:
                flat = list(range(len(pos)))
            tris = [tuple(flat[i:i + 3]) for i in range(0, len(flat) - 2, 3)]
            joints = accessor(at["JOINTS_0"]) if skin and "JOINTS_0" in at else None
            weights = accessor(at["WEIGHTS_0"]) if joints is not None and "WEIGHTS_0" in at else None
            name = node.get("name") or gm.get("name") or "part"
            if len(prims) > 1:
                name = f"{name}_{pi + 1}"
            b.add(name, pos, nrm, uv, tris, texture=material_texture(prim.get("material")),
                  joints=joints, weights=weights, bone_names=bone_names)
    return b.done(), images


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _read_dae(path: Path) -> mesh.MeshFile:
    """A COLLADA ``.dae``: one object per ``<triangles>``/``<polylist>``
    block, named for its geometry, with the skin's two strongest weights a
    vertex where a controller binds one. A ``Z_UP`` file (Blender's default)
    is turned to Y up first."""
    root = ET.parse(path).getroot()
    find = lambda el, name: [c for c in el.iter() if _local(c.tag) == name]
    z_up = any((u.text or "").strip().upper() == "Z_UP" for u in find(root, "up_axis"))

    def turn(v):
        return (v[0], v[2], -v[1]) if z_up else v

    images = {img.get("id"): next((t.text or "" for t in img.iter() if _local(t.tag) == "init_from"), "")
              for img in find(root, "image")}
    # effect -> image, through the sampler's surface the way Blender writes it
    effect_image: Dict[str, str] = {}
    for eff in find(root, "effect"):
        for t in eff.iter():
            if _local(t.tag) == "init_from" and (t.text or "").strip() in images:
                effect_image[eff.get("id")] = images[(t.text or "").strip()]
                break
            if _local(t.tag) == "texture" and t.get("texture") in images:
                effect_image[eff.get("id")] = images[t.get("texture")]
                break
    material_image: Dict[str, str] = {}
    for mat in find(root, "material"):
        for t in mat.iter():
            if _local(t.tag) == "instance_effect":
                material_image[mat.get("id")] = effect_image.get(t.get("url", "").lstrip("#"), "")
    # the symbol a <triangles material=...> names is bound to a material in the scene
    symbol: Dict[str, str] = {}
    for im in find(root, "instance_material"):
        symbol[im.get("symbol")] = material_image.get(im.get("target", "").lstrip("#"), "")

    skins: Dict[str, Tuple[List[str], List[List[Tuple[int, float]]]]] = {}
    for ctl in find(root, "skin"):
        sources = {s.get("id"): s for s in ctl if _local(s.tag) == "source"}
        joints_src = weights_src = None
        for inp in [c for c in ctl.iter() if _local(c.tag) == "input"]:
            if inp.get("semantic") == "JOINT":
                joints_src = sources.get(inp.get("source", "").lstrip("#"))
            if inp.get("semantic") == "WEIGHT":
                weights_src = sources.get(inp.get("source", "").lstrip("#"))
        if joints_src is None or weights_src is None:
            continue
        names = next((t.text or "" for t in joints_src.iter() if _local(t.tag) == "Name_array"), "").split()
        wts = [float(x) for x in next((t.text or "" for t in weights_src.iter() if _local(t.tag) == "float_array"), "").split()]
        vw = next((c for c in ctl if _local(c.tag) == "vertex_weights"), None)
        if vw is None:
            continue
        vcount = [int(x) for x in next((t.text or "" for t in vw if _local(t.tag) == "vcount"), "").split()]
        v = [int(x) for x in next((t.text or "" for t in vw if _local(t.tag) == "v"), "").split()]
        per, at = [], 0
        for c in vcount:
            per.append([(v[at + 2 * k], wts[v[at + 2 * k + 1]]) for k in range(c)])
            at += 2 * c
        skins[ctl.get("source", "").lstrip("#")] = (names, per)

    b = _Builder(str(path))
    for geo in find(root, "geometry"):
        gm = next((c for c in geo if _local(c.tag) == "mesh"), None)
        if gm is None:
            continue
        arrays: Dict[str, Tuple[List[float], int]] = {}
        for src in [c for c in gm if _local(c.tag) == "source"]:
            fa = next((t for t in src.iter() if _local(t.tag) == "float_array"), None)
            acc = next((t for t in src.iter() if _local(t.tag) == "accessor"), None)
            if fa is not None:
                arrays[src.get("id")] = ([float(x) for x in (fa.text or "").split()],
                                         int(acc.get("stride", 3)) if acc is not None else 3)
        vert_src = {}
        for vt in [c for c in gm if _local(c.tag) == "vertices"]:
            for inp in vt:
                if _local(inp.tag) == "input" and inp.get("semantic") == "POSITION":
                    vert_src[vt.get("id")] = inp.get("source", "").lstrip("#")
        skin = skins.get(geo.get("id"))
        blocks = [c for c in gm if _local(c.tag) in ("triangles", "polylist", "polygons")]
        for bi, blk in enumerate(blocks):
            inputs = [(i.get("semantic"), i.get("source", "").lstrip("#"), int(i.get("offset", 0)), i.get("set"))
                      for i in blk if _local(i.tag) == "input"]
            if not inputs:
                continue
            stride = max(o for _s, _src, o, _set in inputs) + 1
            p = [int(x) for x in " ".join((t.text or "") for t in blk if _local(t.tag) == "p").split()]
            vcount = [int(x) for x in next((t.text or "" for t in blk if _local(t.tag) == "vcount"), "").split()]
            if _local(blk.tag) == "triangles" or not vcount:
                vcount = [3] * (len(p) // (3 * stride))

            def get(sem, corner):
                for s, src, off, _set in inputs:
                    if s == sem:
                        arr, w = arrays.get(vert_src.get(src, src), ([], 3))
                        k = p[corner * stride + off]
                        return arr[k * w:k * w + w], k
                return None, None

            key: Dict[tuple, int] = {}
            pos, nrm, uv, tris, jn, wt = [], [], [], [], [], []
            corner = 0
            for c in vcount:
                ids = []
                for _ in range(c):
                    k = tuple(p[corner * stride:(corner + 1) * stride])
                    if k not in key:
                        key[k] = len(pos)
                        v, vi = get("VERTEX", corner)
                        pos.append(turn(tuple(v[:3])))
                        n, _ = get("NORMAL", corner)
                        nrm.append(turn(tuple(n[:3])) if n else (0.0, 1.0, 0.0))
                        t, _ = get("TEXCOORD", corner)
                        uv.append((t[0], 1.0 - t[1]) if t else (0.0, 0.0))
                        if skin:
                            pairs = skin[1][vi] if vi < len(skin[1]) else []
                            jn.append([j for j, _w in pairs] or [0])
                            wt.append([w for _j, w in pairs] or [1.0])
                    ids.append(key[k])
                    corner += 1
                tris += _fan(ids)
            name = geo.get("name") or geo.get("id") or "part"
            if len(blocks) > 1:
                name = f"{name}_{bi + 1}"
            b.add(name, pos, nrm, uv, tris, texture=symbol.get(blk.get("material"), ""),
                  joints=jn if skin else None, weights=wt if skin else None,
                  bone_names=skin[0] if skin else ())
    return b.done()


_EXT_LOCK = threading.Lock()
#: path -> (stamp, MeshFile, textures by object name, unpacked folder)
_EXTERNAL: Dict[str, tuple] = {}


def external_id(path: Path) -> str:
    return "ext:" + hashlib.blake2b(str(path).lower().encode("utf-8"), digest_size=8).hexdigest()


def _find_texture(folder: Path, named: str, hints: Sequence[str]) -> Optional[Path]:
    """The image a model names, else one in its folder named for the object."""
    if named:
        p = Path(named.replace("file:///", "").replace("%20", " "))
        cand = p if p.is_absolute() else folder / p
        if cand.is_file():
            return cand
        for sub in (folder, folder / "textures"):
            hit = sub / p.name
            if hit.is_file():
                return hit
    images = [p for sub in (folder, folder / "textures") if sub.is_dir()
              for p in sub.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES]
    for hint in hints:
        hint = hint.lower()
        for p in images:
            if p.stem.lower() == hint:
                return p
        for p in images:
            if hint and hint in p.stem.lower():
                return p
    return None


def read_external(path_text: str) -> Tuple[str, mesh.MeshFile, dict]:
    """``(id, model, textures)`` for an ``.obj``, ``.glb``, ``.gltf`` or ``.dae``.

    Kept while the file is unchanged, so the geometry route serves it without
    a second parse. ``textures`` maps each object's index to the image found
    for it (``""`` where none was: the panel asks for one).
    """
    path = Path((path_text or "").strip().strip('"'))
    if not path.is_file():
        raise ArmoryError(_i18n.msg("eng.armory.no_such_file", "{path} is not a file", path=str(path)))
    suffix = path.suffix.lower()
    if suffix not in EXTERNAL_SUFFIXES:
        raise ArmoryError(_i18n.msg("eng.armory.not_a_model_file", "{name} is not a .obj, .glb, .gltf or .dae", name=path.name))
    st = path.stat()
    stamp = (st.st_size, st.st_mtime_ns)
    key = str(path).lower()
    with _EXT_LOCK:
        hit = _EXTERNAL.get(key)
        if hit and hit[0] == stamp:
            return external_id(path), hit[1], hit[2]
    try:
        if suffix == ".obj":
            m, packed = _read_obj(path), {}
        elif suffix in (".glb", ".gltf"):
            m, packed = _read_gltf(path)
        else:
            m, packed = _read_dae(path), {}
    except (ValueError, KeyError, IndexError, struct.error, ET.ParseError) as e:
        raise ArmoryError(_i18n.msg("eng.armory.could_not_read_model", "{name} could not be read: {e}", name=path.name, e=e)) from e
    unpacked = ARMORY_DIR / "external" / external_id(path)[4:]
    if packed:
        unpacked.mkdir(parents=True, exist_ok=True)
        for name, raw in packed.items():
            (unpacked / Path(name).name).write_bytes(raw)
    textures = {}
    for i, g in enumerate(m.groups):
        found = None
        if g.texture and packed and (unpacked / Path(g.texture).name).is_file():
            found = unpacked / Path(g.texture).name
        if found is None:
            found = _find_texture(path.parent, g.texture, (g.texture_group, g.name, path.stem))
        textures[i] = str(found) if found else ""
    with _EXT_LOCK:
        _EXTERNAL[key] = (stamp, m, textures)
    return external_id(path), m, textures


def external_by_id(ext: str) -> Optional[Tuple[mesh.MeshFile, dict]]:
    with _EXT_LOCK:
        for key, (_stamp, m, textures) in _EXTERNAL.items():
            if external_id(Path(key)) == ext:
                return m, textures
    return None


def texture_allowed(path_text: str) -> bool:
    """Only an image an external asset found, or the user picked for one, is served."""
    want = str(Path(path_text)).lower()
    with _EXT_LOCK:
        if any(want == str(Path(t)).lower() for _s, _m, tx in _EXTERNAL.values() for t in tx.values() if t):
            return True
        return want in _PICKED


_PICKED: set = set()


def allow_texture(path_text: str) -> bool:
    """A sheet picked by hand for an object with none found. True if it is an image."""
    p = Path((path_text or "").strip().strip('"'))
    if not p.is_file() or p.suffix.lower() not in IMAGE_SUFFIXES:
        return False
    with _EXT_LOCK:
        _PICKED.add(str(p).lower())
    return True


def external_view(path_text: str) -> dict:
    """An external model as an asset, the same shape :func:`asset_view` gives."""
    ext, m, textures = read_external(path_text)
    path = Path(path_text.strip().strip('"'))
    objects = _objects(m)
    for o in objects:
        o["texture_file"] = textures.get(o["index"], "")
    return {"kind": "external", "id": ext, "path": str(path), "entry": path.stem,
            "mesh": path.name, "file_hash": file_hash(path.read_bytes()),
            "skins": [], "skeletons": [], "bones": m.bones,
            "skinned": bool(m.weights), "vertices": m.vertices,
            "triangles": m.triangles, "objects": objects}


# ---------------------------------------------------------------------------
# the project


PROJECT = ARMORY_DIR / "project.json"


def load_project() -> dict:
    try:
        return json.loads(PROJECT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_project(project: dict) -> None:
    ARMORY_DIR.mkdir(parents=True, exist_ok=True)
    tmp = PROJECT.with_suffix(".tmp")
    tmp.write_text(json.dumps(project, indent=1), encoding="utf-8")
    tmp.replace(PROJECT)
