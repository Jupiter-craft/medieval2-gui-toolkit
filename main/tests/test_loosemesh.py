"""The meshes no modeldb entry names, over HTTP - loosemesh.py and its routes.

    /api/model/loose            every .mesh under unit_models no entry names
    /api/model/loose/textures   every sheet under unit_models, for the hand picker
    /api/model?loose=REL        one of them as an entry of one LOD, with guesses
    /api/model/geometry?loose=  its geometry, the same payload an entry's is

Run against a throwaway mod built from whichever mod is installed, with this
repo's reference horse planted at an entry's LOD and three loose meshes beside
it, one for each kind of guess:

* a byte-for-byte copy of the entry's mesh, which takes that entry's skins;
* ``knight_lod0.mesh`` with ``textures/knight.texture`` and ``knight_att`` beside
  it, paired as main and attachment, and a normal map that is never offered;
* ``arin_lod0.mesh``, whose sheet is in another folder, and which must not be
  matched to ``marine.texture`` - the name has to be a whole word.
"""
import json
import shutil
import struct
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from unittransfer import config, mesh, modeldb
from unittransfer.server import Registry, Handler, _Server
from tests import _realmod, _tmp

REFERENCE = (ROOT / "Reference" / "TWCenter" / "--- TOOLS n RESOURCES ---" /
             "TEMPLATE - Barded-Mailed Horses" / "Barded-Mailed Horses" /
             "mount_barded_horse_lod0.mesh")

ok = []


def check(label, cond):
    ok.append(bool(cond))
    print(f"  [{'OK ' if cond else 'FAIL'}] {label}")


BASE = ""


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=300) as r:
        return json.loads(r.read().decode("utf-8"))


def raw(path):
    with urllib.request.urlopen(BASE + path, timeout=300) as r:
        return r.read()


def status(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=300) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def enc(s):
    return urllib.parse.quote(str(s))


if not REFERENCE.is_file():
    print(f"SKIPPED - the reference model is not readable at {REFERENCE}")
    sys.exit(0)

mod_src = _realmod.pick("Divide_and_Conquer_EUR", "Third_Age_Reforged",
                        need="unit_models/battle_models.modeldb")

cfg = Path(_tmp.mkdtemp(prefix="ut_cfg_"))
config.CONFIG_DIR = cfg
config.BACKUP_DIR = cfg / "backups"
config.SETTINGS_PATH = cfg / "settings.json"
config.LOG_PATH = cfg / "transfers.json"

med2 = Path(_tmp.mkdtemp(prefix="ut_med2_"))
data = med2 / "mods" / "LooseMod" / "data"
(data / "text").mkdir(parents=True)
(data / "unit_models").mkdir(parents=True)
for rel in ("export_descr_unit.txt", "text/export_units.txt",
            "unit_models/battle_models.modeldb", "descr_mount.txt"):
    src = mod_src / "data" / rel
    if src.exists():
        shutil.copy2(src, data / rel)
config.save_settings(med2_root=str(med2), run_full_cleaner=False)

db = modeldb.parse_text((data / "unit_models" / "battle_models.modeldb")
                        .read_bytes().decode(modeldb.ENCODING))
entry = next((e for e in db.entries
              if e.mesh_files() and [t for t in e.main_textures
                                     if t.texture and t.texture != "0"]), None)
if entry is None:
    print("SKIPPED - no modeldb entry with both a mesh and a texture path")
    sys.exit(0)


def plant(rel, body=b"sheet"):
    p = data / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(body)
    return rel


horse = REFERENCE.read_bytes()
used_rel = plant(entry.mesh_files()[0].replace("\\", "/"), horse)
tex_rel = plant(next(t.texture for t in entry.main_textures
                     if t.texture and t.texture != "0").replace("\\", "/"))

L = "unit_models/loose_test"
copy_rel = plant(f"{L}/copyhorse_lod0.mesh", horse)
# a byte longer, so neither is a copy of the entry's mesh
knight_rel = plant(f"{L}/knight_lod0.mesh", horse + b"\0")
arin_rel = plant(f"{L}/arin_lod0.mesh", horse + b"\0\0")
plant(f"{L}/textures/knight.texture")
plant(f"{L}/textures/knight_att.texture")
plant(f"{L}/textures/knight_normal.texture")
plant("unit_models/elsewhere_test/textures/arin_fig.texture")
plant("unit_models/elsewhere_test/textures/marine.texture")

Handler.registry = Registry(cfg / "icons")
httpd = _Server(("127.0.0.1", 0), Handler)
BASE = f"http://127.0.0.1:{httpd.server_address[1]}"
threading.Thread(target=httpd.serve_forever, daemon=True).start()
print(f"serving {BASE} · mod {mod_src.name} · entry {entry.name}")

try:
    print("\n== /api/model/loose - the list ==")
    listed = {m["rel"]: m for m in get("/api/model/loose?mod=LooseMod")["meshes"]}
    check("the three loose meshes are listed",
          {copy_rel, knight_rel, arin_rel} <= set(listed))
    check("the mesh the entry names is not", used_rel not in listed)
    check("knight is marked for a sheet in its own folder",
          listed.get(knight_rel, {}).get("hint") == "folder")
    check("arin is marked for a sheet in another folder",
          listed.get(arin_rel, {}).get("hint") == "elsewhere")
    check("a row carries its folder and size",
          listed.get(knight_rel, {}).get("group") == "loose_test"
          and listed[knight_rel]["bytes"] == len(horse) + 1)

    print("\n== /api/model?loose= - the guesses ==")
    info = get(f"/api/model?mod=LooseMod&loose={enc(copy_rel)}")
    check("a loose mesh opens as an entry of one LOD that is there",
          len(info["lods"]) == 1 and info["lods"][0]["exists"] and info["loose"] == copy_rel)
    first = (info["skins"] or [{}])[0]
    check(f"a byte-for-byte copy takes the skins of the entry it copies ({entry.name})",
          first.get("why") == "copy" and first.get("entry") == entry.name
          and first.get("rel", "").lower() == tex_rel.lower())

    info = get(f"/api/model?mod=LooseMod&loose={enc(knight_rel)}")
    rels = [(s["rel"], s["attach"], s["why"]) for s in info["skins"]]
    check("knight's own folder pairs the main sheet with the attachment",
          rels == [(f"{L}/textures/knight.texture", f"{L}/textures/knight_att.texture", "folder")])

    info = get(f"/api/model?mod=LooseMod&loose={enc(arin_rel)}")
    rels = [s["rel"] for s in info["skins"]]
    check("arin finds arin_fig in another folder",
          rels == ["unit_models/elsewhere_test/textures/arin_fig.texture"])
    check("and not marine - the name has to be a whole word",
          not any("marine" in r for r in rels))

    print("\n== the picker's list ==")
    tex = get("/api/model/loose/textures?mod=LooseMod")["textures"]
    check("every planted sheet is offered",
          {f"{L}/textures/knight.texture", "unit_models/elsewhere_test/textures/marine.texture"}
          <= set(tex))
    check("normal maps come last",
          tex.index(f"{L}/textures/knight_normal.texture") > tex.index(f"{L}/textures/knight.texture"))

    print("\n== /api/model/geometry?loose= ==")
    body = raw(f"/api/model/geometry?mod=LooseMod&loose={enc(copy_rel)}")
    hlen = struct.unpack("<I", body[4:8])[0]
    head = json.loads(body[8:8 + hlen])
    check("the geometry is the same payload an entry's is, and the horse's vertex count",
          body[:4] == b"M2GT" and head["vertices"] == len(mesh.read_mesh(REFERENCE).positions) // 3)

    print("\n== refusals ==")
    check("a path out of the mod is a 404",
          status("/api/model?mod=LooseMod&loose=../../../../windows/win.ini") == 404)
    check("a file that is not a .mesh is a 404",
          status(f"/api/model/geometry?mod=LooseMod&loose={enc(tex_rel)}") == 404)
finally:
    httpd.shutdown()

shutil.rmtree(med2, ignore_errors=True)
shutil.rmtree(cfg, ignore_errors=True)

print(f"\n{sum(ok)}/{len(ok)} checks passed")
sys.exit(0 if all(ok) else 1)
