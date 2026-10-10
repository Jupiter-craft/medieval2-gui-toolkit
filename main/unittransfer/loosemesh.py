"""Battle meshes no modeldb entry names, and a skin to draw them in.

A mod's ``data/unit_models`` holds more ``.mesh`` files than its
``battle_models.modeldb`` names: a model an entry was cut from, a copy left
beside the one that moved, a work in progress. Divide and Conquer ships 269 of
them, nearly all in ``_units/en_lmail_hmail``. The viewer opens a model through
its entry, so until now these could not be looked at without first writing an
entry for them.

The geometry is no problem - :func:`unittransfer.mesh.read_mesh` decodes every
one of them. The texture is, because **a battle ``.mesh`` never names its
texture**: that is the entry's job, and these have no entry. All 289 in the two
installed overhauls were searched byte for byte for a ``.tga``, ``.dds`` or
``.texture`` and none holds one. So the skins offered here are guesses, and say
which kind of guess each is, best first:

* ``copy`` - the file is byte for byte a mesh some entry does name, so that
  entry's skins are right by construction;
* ``folder`` - a texture in the mesh's own ``textures/`` folder whose name holds
  the mesh's (``bear_lod0.mesh`` -> ``textures/bear.texture``);
* ``elsewhere`` - the same, anywhere under ``unit_models``.

Anything else is picked by hand in the viewer, from :func:`texture_files`.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional

from . import mesh

#: the sheets a battle model is painted from, as mods ship them
TEXTURE_SUFFIXES = (".texture", ".dds", ".tga")

#: a normal map is the shape of a skin and not one: it never paints the model
_NORMAL = re.compile(r"(^|[_\-])(normal|norm|nm|nrm|bump)([_\-.]|$)", re.I)
#: the attachment sheet, by the names mods give it
_ATTACH = re.compile(r"(^|[_\-])(att|attach|attachment|attachments)([_\-.\d]|$)", re.I)
#: what is left of a mesh's file name to look for: ``foo_lod0.mesh.mesh`` -> ``foo``
_LOD = re.compile(r"_lod\d+$", re.I)


def _norm(rel: str) -> str:
    return (rel or "").replace("\\", "/").strip().lower()


def _rel(mod, p: Path) -> str:
    return p.relative_to(mod.data).as_posix()


def _stem(name: str) -> str:
    """The part of a mesh's file name a texture would be named after."""
    s = name
    while s.lower().endswith(".mesh"):
        s = s[:-5]
    return _LOD.sub("", s).lower()


def _cache(mod) -> dict:
    """Walks kept on the mod, which is rebuilt when its files change.

    An overhaul's ``unit_models`` is tens of thousands of files, and opening
    mesh after mesh from the list would walk it once a click.
    """
    return mod.__dict__.setdefault("_loosemesh", {})


def _used(mod) -> Dict[str, object]:
    """Every mesh the modeldb names, lower-cased, to the entry naming it first."""
    c = _cache(mod)
    if "used" not in c:
        out: Dict[str, object] = {}
        for e in mod.modeldb.entries:
            for rel in e.mesh_files():
                out.setdefault(_norm(rel), e)
        c["used"] = out
    return c["used"]


def _walk(mod, suffixes) -> List[Path]:
    c = _cache(mod)
    if "files" not in c:
        base = mod.unit_models_dir
        c["files"] = ([p for p in base.rglob("*")
                       if p.suffix.lower() in TEXTURE_SUFFIXES + (".mesh",) and p.is_file()]
                      if base.is_dir() else [])
    return [p for p in c["files"] if p.suffix.lower() in suffixes]


def texture_files(mod) -> List[str]:
    """Every sheet under ``unit_models``, normal maps last, for the hand picker."""
    rels = sorted((_rel(mod, p) for p in _walk(mod, TEXTURE_SUFFIXES)), key=str.lower)
    return ([r for r in rels if not _NORMAL.search(Path(r).stem)]
            + [r for r in rels if _NORMAL.search(Path(r).stem)])


def _name_matches(stem: str, sheets: List[Path]) -> List[Path]:
    """The sheets whose name holds ``stem`` as a whole word: ``arin`` finds
    ``arin_fig`` but not ``marine``."""
    if len(stem) < 3:
        return []
    word = re.compile(r"(^|[_\-\s])" + re.escape(stem) + r"($|[_\-\s\d])", re.I)
    return [t for t in sheets
            if word.search(t.stem) and not _NORMAL.search(t.stem)]


def _pairs(mod, found: List[Path], why: str) -> List[dict]:
    """Name-matched sheets as skins: each main sheet with the first attachment."""
    att = [t for t in found if _ATTACH.search(t.stem)]
    main = [t for t in found if t not in att] or att[:1]
    a = _rel(mod, att[0]) if att else ""
    return [{"rel": _rel(mod, m), "exists": True,
             "attach": a if a and a != _rel(mod, m) else "",
             "attach_exists": bool(a) and a != _rel(mod, m),
             "factions": [], "why": why} for m in main]


def _copy_of(mod, src: Path, used: Dict[str, object]) -> Optional[object]:
    """The entry naming a mesh with exactly ``src``'s bytes, if any does."""
    c = _cache(mod)
    if "sizes" not in c:
        sizes: Dict[int, List[tuple]] = {}
        for rel, entry in used.items():
            try:
                sizes.setdefault((mod.data / rel).stat().st_size, []).append((rel, entry))
            except OSError:
                continue
        c["sizes"] = sizes
    try:
        size = src.stat().st_size
        body = None
        for rel, entry in c["sizes"].get(size, []):
            p = mod.data / rel
            try:
                if body is None:
                    body = src.read_bytes()
                if p.read_bytes() == body:
                    return entry
            except OSError:
                continue
    except OSError:
        pass
    return None


def suggestions(mod, rel: str) -> List[dict]:
    """The skins worth trying on one loose mesh, best guess first.

    Rows are shaped like :func:`unittransfer.mesh.entry_view`'s, so the viewer's
    skin picker takes them unchanged, plus ``why`` (``copy``, ``folder``,
    ``elsewhere``) and, for a copy, the ``entry`` whose skins they are.
    """
    src = mod.data / rel
    out: List[dict] = []
    seen = set()

    def add(rows):
        for r in rows:
            key = (r["rel"].lower(), (r.get("attach") or "").lower())
            if key not in seen:
                seen.add(key)
                out.append(r)

    entry = _copy_of(mod, src, _used(mod))
    if entry is not None:
        rows = mesh.entry_view(entry, mod.data)["skins"]
        for r in rows:
            r["why"], r["entry"] = "copy", entry.name
        add(r for r in rows if r["exists"])

    stem = _stem(src.name)
    folder = src.parent / "textures"
    local = [t for t in folder.iterdir()
             if t.is_file() and t.suffix.lower() in TEXTURE_SUFFIXES] if folder.is_dir() else []
    hits = _name_matches(stem, local)
    if hits:
        add(_pairs(mod, hits, "folder"))
    else:
        add(_pairs(mod, _name_matches(stem, _walk(mod, TEXTURE_SUFFIXES)), "elsewhere"))
    return out


def loose_meshes(mod) -> List[dict]:
    """Every ``.mesh`` under ``unit_models`` that no modeldb entry names.

    ``hint`` says whether a texture can be suggested from the name alone; a
    byte-for-byte copy is only found when the mesh is opened, since finding it
    means reading every mesh the same size.
    """
    used = _used(mod)
    sheets = [t for t in _walk(mod, TEXTURE_SUFFIXES) if not _NORMAL.search(t.stem)]
    by_folder: Dict[Path, List[Path]] = {}
    for t in sheets:
        by_folder.setdefault(t.parent, []).append(t)
    out = []
    for p in _walk(mod, (".mesh",)):
        rel = _rel(mod, p)
        if _norm(rel) in used:
            continue
        stem = _stem(p.name)
        hint = ("folder" if _name_matches(stem, by_folder.get(p.parent / "textures", []))
                else "elsewhere" if _name_matches(stem, sheets) else "")
        try:
            size = p.stat().st_size
        except OSError:
            size = 0
        out.append({"rel": rel, "name": p.name,
                    "group": Path(rel).parent.as_posix().split("unit_models/", 1)[-1],
                    "bytes": size, "hint": hint})
    out.sort(key=lambda m: (m["group"].lower(), m["name"].lower()))
    return out


def view(mod, rel: str) -> dict:
    """One loose mesh as the viewer's picker needs it - an entry of one LOD."""
    return {"name": Path(rel).name, "scale": 1.0, "loose": rel,
            "lods": [{"index": 0, "rel": rel, "distance": 0, "exists": True}],
            "skins": suggestions(mod, rel), "skeletons": []}
