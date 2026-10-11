"""Models in a folder that is not a mod, over HTTP - meshfolder.py and its routes.

    /api/model/folder?path=     the folder read: entries, meshes no entry names
    ?mod=folder:<path>          on /api/model, /api/model/geometry and
                                /model_texture, the folder standing in for a mod

Built in a temp folder, with this repo's reference horse as every mesh:

* ``export/`` - a Blender export, one model to a folder. ``orc`` has an
  ``orc_bmdb.txt`` naming its sheets where the mod will keep them, and a
  distracting sheet beside them; ``khitan`` has two sheets named for nothing,
  taken in order as main and attachment; ``morannon`` names its sheets Main and
  Att the wrong way round alphabetically; ``lone`` has one.
* ``pasted/data/`` - a data folder with a modeldb whose paths start from
  ``data/``, naming one model that is in the folder and one that is not.
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

from unittransfer import config, mesh, meshfolder, modeldb
from unittransfer.server import Registry, Handler, _Server
from tests import _tmp

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


def s(text):
    return f"{len(text)} {text}"


def entry_text(name, mesh_rel, tex, att):
    """One complete entry: a LOD, a faction's main and attachment sheets."""
    return (f"{s(name)}\n1 1\n{s(mesh_rel)} 6400\n1\n{s('england')}\n{s(tex)}\n"
            f"{s(tex[:-8] + '_norm.texture')}\n{s('unit_sprites/x_sprite.spr')}\n"
            f"1\n{s('england')}\n{s(att)}\n{s(att[:-8] + '_norm.texture')} 0\n"
            f"1\n{s('none')}\n{s('MTW2_Swordsman')} {s('MTW2_Swordsman')}\n"
            f"1\n{s('MTW2_Swordsman_Primary')}\n1\n{s('MTW2_Swordsman_Primary')}\n"
            f"16 -0.09 0 0 -0.35 0.8 0.6\n")


if not REFERENCE.is_file():
    print(f"SKIPPED - the reference model is not readable at {REFERENCE}")
    sys.exit(0)

cfg = Path(_tmp.mkdtemp(prefix="ut_cfg_"))
config.CONFIG_DIR = cfg
config.BACKUP_DIR = cfg / "backups"
config.SETTINGS_PATH = cfg / "settings.json"
config.LOG_PATH = cfg / "transfers.json"
med2 = Path(_tmp.mkdtemp(prefix="ut_med2_"))
(med2 / "mods").mkdir()
config.save_settings(med2_root=str(med2), run_full_cleaner=False)

top = Path(_tmp.mkdtemp(prefix="ut_meshfolder_"))
horse = REFERENCE.read_bytes()


def plant(rel, body=b"sheet"):
    p = top / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(body)
    return p


E = top / "export"
plant("export/orc/orc.mesh", horse)
plant("export/orc/textures/orcskin.texture")
plant("export/orc/textures/orcskin.tga")
plant("export/orc/textures/orcskin_att.texture")
plant("export/orc/textures/aaa_other.texture")
plant("export/orc/orc_bmdb.txt", entry_text(
    "orc", "unit_models/_units/reaper/orc.mesh",
    "unit_models/_units/reaper/textures/orcskin.texture",
    "unit_models/_units/reaper/textures/orcskin_att.texture").encode())
plant("export/khitan/khitan.mesh", horse)
plant("export/khitan/textures/tielinjun.texture")
plant("export/khitan/textures/tielinjun.dds")
plant("export/khitan/textures/tielinjun2.texture")
plant("export/khitan/textures/tielinjun_n.texture")
plant("export/khitan/textures/tielinjun2_norm2.texture")
plant("export/morannon/morannon.mesh", horse)
plant("export/morannon/textures/Morannon_Att_Diff.texture")
plant("export/morannon/textures/Morannon_Main_Diff.texture")
plant("export/morannon/textures/Morannon_Main_Norm.texture")
plant("export/lone/lone.mesh", horse)
plant("export/lone/textures/lone_skin.texture")
plant("export/strat/only.glb", b"glTF")

D = top / "pasted"
plant("pasted/data/unit_models/_units/proj/elf.mesh", horse)
plant("pasted/data/unit_models/_units/proj/textures/elf.texture")
plant("pasted/data/unit_models/_units/proj/textures/elf_att.texture")
plant("pasted/data/unit_models/_units/proj/stray.mesh", horse)
plant("pasted/data/unit_models/battle_models.modeldb", (
    "22 serialization::archive 3 0 0 0 0 3 0 0\n5 blank " + " ".join(["0"] * 39) + "\n"
    + entry_text("elf", "unit_models/_units/proj/elf.mesh",
                 "unit_models/_units/proj/textures/elf.texture",
                 "unit_models/_units/proj/textures/elf_att.texture")
    + entry_text("dwarf", "unit_models/_units/other/dwarf.mesh",
                 "unit_models/_units/other/textures/dwarf.texture",
                 "unit_models/_units/other/textures/dwarf_att.texture")).encode())

Handler.registry = Registry(cfg / "icons")
httpd = _Server(("127.0.0.1", 0), Handler)
BASE = f"http://127.0.0.1:{httpd.server_address[1]}"
threading.Thread(target=httpd.serve_forever, daemon=True).start()
print(f"serving {BASE} · folder {top}")


def skins(mod, rel):
    info = get(f"/api/model?mod={enc(mod)}&loose={enc(rel)}")
    return [(r["rel"].split("/")[-1], r["attach"].split("/")[-1], r["why"]) for r in info["skins"]]


try:
    print("\n== parse_entry - an entry with no archive around it ==")
    one = modeldb.parse_entry((E / "orc" / "orc_bmdb.txt").read_text(encoding="latin-1"))
    check("reads the name, LOD and both sheets",
          one.name == "orc" and one.mesh_files() == ["unit_models/_units/reaper/orc.mesh"]
          and one.attach_textures[0].texture.endswith("orcskin_att.texture"))

    print("\n== a Blender export ==")
    d = get(f"/api/model/folder?path={enc(E)}")
    mod = d["mod"]
    rels = sorted(m["rel"] for m in d["meshes"])
    check("it is read as an export, every .mesh listed and nothing else",
          d["kind"] == "export" and not d["entries"]
          and rels == ["khitan/khitan.mesh", "lone/lone.mesh", "morannon/morannon.mesh", "orc/orc.mesh"])
    check("its name on the other routes is folder: and its path",
          mod == meshfolder.PREFIX + str(E.resolve()))
    check("the _bmdb.txt's sheets are found by name in the folder, before anything guessed",
          skins(mod, "orc/orc.mesh")[0] == ("orcskin.texture", "orcskin_att.texture", "bmdb"))
    check("two sheets named for nothing are main then attachment, the normals left out",
          skins(mod, "khitan/khitan.mesh") == [("tielinjun.texture", "tielinjun2.texture", "pair")])
    check("Main and Att in the names win over the order they sort in",
          skins(mod, "morannon/morannon.mesh")
          == [("Morannon_Main_Diff.texture", "Morannon_Att_Diff.texture", "pair")])
    check("one sheet is the main sheet alone",
          skins(mod, "lone/lone.mesh") == [("lone_skin.texture", "", "folder")])

    body = raw(f"/api/model/geometry?mod={enc(mod)}&loose={enc('khitan/khitan.mesh')}")
    hlen = struct.unpack("<I", body[4:8])[0]
    head = json.loads(body[8:8 + hlen])
    check("the geometry is drawn from the folder",
          body[:4] == b"M2GT" and head["vertices"] == len(mesh.read_mesh(REFERENCE).positions) // 3)
    tex = get(f"/api/model/loose/textures?mod={enc(mod)}")["textures"]
    check("the hand picker offers the folder's sheets",
          "khitan/textures/tielinjun2.texture" in tex)

    print("\n== a data folder, picked at the folder above it ==")
    d = get(f"/api/model/folder?path={enc(D)}")
    dm = d["mod"]
    check("only the entry whose model is in the folder is listed, the other counted",
          d["kind"] == "data" and [e["name"] for e in d["entries"]] == ["elf"]
          and d["elsewhere"] == 1)
    check("a mesh no entry names is listed beside it",
          [m["rel"] for m in d["meshes"]] == ["data/unit_models/_units/proj/stray.mesh"])
    info = get(f"/api/model?mod={enc(dm)}&entry=elf")
    sk = info["skins"][0]
    check("the entry's paths, written from data/, are found under it",
          info["lods"][0]["exists"] and sk["exists"] and sk["attach_exists"]
          and sk["rel"] == "data/unit_models/_units/proj/textures/elf.texture")
    check("its geometry and its sheet are served",
          raw(f"/api/model/geometry?mod={enc(dm)}&entry=elf&lod=0")[:4] == b"M2GT"
          and status(f"/model_texture?mod={enc(dm)}&rel={enc(sk['rel'])}") in (200, 415))

    print("\n== refusals ==")
    check("a path that is not a folder is a 404",
          status(f"/api/model/folder?path={enc(top / 'nothing_here')}") == 404)
    check("a mesh outside the folder is a 404",
          status(f"/api/model?mod={enc(mod)}&loose={enc('../pasted/data/unit_models/_units/proj/elf.mesh')}") == 404)
    check("animations are refused for a folder - it has no skeletons",
          status(f"/api/model/anims?mod={enc(dm)}&entry=elf") == 400)
    check("an export is refused too",
          status(f"/api/model/export?mod={enc(dm)}&entry=elf") == 400)
finally:
    httpd.shutdown()

shutil.rmtree(top, ignore_errors=True)
shutil.rmtree(med2, ignore_errors=True)
shutil.rmtree(cfg, ignore_errors=True)

print(f"\n{sum(ok)}/{len(ok)} checks passed")
sys.exit(0 if all(ok) else 1)
