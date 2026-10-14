"""98e: a model's textures live in its folder's textures/, and the editor says so.

Reported by a player: the normal map and the attachment normal map of a unit
sat in the mesh folder (`skyrim/bendr_nm.texture`) while its texture was in
`skyrim/textures/`. They edited the copy in textures/ for a while and nothing
changed in game. The folder check counted the mesh folder and its textures/ as
one folder, so the entry looked tidy, and Import landed beside the old file, so
the path never moved. Covered here:

* the folder report lists a texture outside textures/ as a stray
* `absent` lists the paths no file answers
* "Bring them in" (`gather`) copies a stray into textures/ and repoints the
  entry; when textures/ already holds a file of that name it is pointed at,
  not written over; undo puts it all back
* Add a model copies its textures into the folder's textures/, not beside the mesh

Works on a throwaway copy of an installed mod's data files; the real mod is
never touched.
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tests import _realmod, _tmp
from unittransfer import config, edit, modeldb
from unittransfer.mod import Mod

SRC_MOD = _realmod.pick("ROCSS", need="unit_models/battle_models.modeldb")

ok = []
def check(label, cond):
    ok.append(bool(cond)); print(f"  [{'OK ' if cond else 'FAIL'}] {label}")


cfg = Path(_tmp.mkdtemp(prefix="ut_cfg_"))
config.CONFIG_DIR = cfg; config.BACKUP_DIR = cfg / "backups"
config.SETTINGS_PATH = cfg / "settings.json"; config.LOG_PATH = cfg / "transfers.json"

root = Path(_tmp.mkdtemp(prefix="ut_texhome_"))
data = root / "data"
(data / "text").mkdir(parents=True); (data / "unit_models").mkdir(parents=True)
for rel in ("export_descr_unit.txt", "text/export_units.txt",
            "unit_models/battle_models.modeldb"):
    shutil.copy2(SRC_MOD / "data" / rel, data / rel)
picked = Path(_tmp.mkdtemp(prefix="ut_texpick_"))

mod = Mod(root)
unit = next(u for u in mod.edu.units if u.model_names()
            and u.model_names()[0].lower() in mod.modeldb.by_name())
entry = mod.modeldb.by_name()[unit.model_names()[0].lower()]
mesh = next(s["value"] for s in modeldb.path_slots(entry) if s["kind"] == "mesh")
HOME = mesh.rsplit("/", 1)[0]
TEX, NORM = f"{HOME}/textures/hero.texture", f"{HOME}/hero_nm.texture"
print(f"unit={unit.type!r} entry={entry.name!r} folder={HOME!r}")


def plan_for(**model_edit):
    me = {"entry": entry.name, "faction_paths": {}}
    me.update(model_edit)
    return edit.plan_edit(Mod(root), edit.request_from_dict(
        {"unit": unit.type, "model_edits": [me]}))


def pointed(plan_or_raw, name):
    raw = plan_or_raw if isinstance(plan_or_raw, str) else plan_or_raw.entry_updates.get(entry.name, "")
    return sorted({p for p in re.findall(r"[\w/.]+", raw) if p.endswith(name)})


print("\nthe player's layout: texture in textures/, normal map beside the mesh")
res = edit.apply_edit(plan_for(defaults={"texture": TEX, "normal": NORM}))
(data / TEX).parent.mkdir(parents=True, exist_ok=True)
(data / TEX).write_bytes(b"TEX"); (data / NORM).write_bytes(b"NORM-BESIDE-MESH")
e2 = Mod(root).modeldb.by_name()[entry.name]
info = edit.folder_info(e2)
check("the folder is the mesh's", info["home"].lower() == HOME.lower())
check("the normal map is listed as outside textures/", NORM in info["stray_textures"])
check("the texture in textures/ is not", TEX not in info["stray_textures"])
absent = edit.absent_files(Mod(root), modeldb.path_slots(e2))
check("absent names the mesh, which this copy has no file for", mesh in absent)
check("absent leaves out the two files that are there",
      TEX not in absent and NORM not in absent)

print("\nBring them in")
plan = plan_for(gather=True)
GOAL = f"{HOME}/textures/hero_nm.texture"
check("plans without errors", not plan.errors)
check("the entry now names textures/hero_nm.texture", pointed(plan, "hero_nm.texture") == [GOAL])
check("the file is copied there", [r for _s, r in plan.copies] == [GOAL])
res = edit.apply_edit(plan)
check("it is in the mod", (data / GOAL).read_bytes() == b"NORM-BESIDE-MESH")
check("the old copy is left where it was", (data / NORM).is_file())
from unittransfer.transfer import undo
undo(res["record"]["id"] if "record" in res else res["id"])
check("undo takes the copy away", not (data / GOAL).exists())
check("and the entry names the old path again",
      pointed(Mod(root).modeldb.by_name()[entry.name].raw, "hero_nm.texture") == [NORM])

print("\nBring them in, with a file of that name already in textures/")
(data / GOAL).write_bytes(b"EDITED-IN-TEXTURES")
card = edit.model_payload(Mod(root).modeldb.by_name()[entry.name], mod=Mod(root))
check("the card names the normal map as having a twin in textures/", card["twins"] == [NORM])
plan =plan_for(gather=True, defaults={"texture": TEX, "normal": GOAL})
check("plans without errors", not plan.errors)
check("nothing is copied over it", not plan.copies)
check("the entry names it", pointed(plan, "hero_nm.texture") == [GOAL])
edit.apply_edit(plan)
check("the file there is untouched", (data / GOAL).read_bytes() == b"EDITED-IN-TEXTURES")

print("\nAdd a model")
for name in ("new.mesh", "new.texture", "new_nm.texture"):
    (picked / name).write_bytes(name.encode())
plan = edit.plan_edit(Mod(root), edit.request_from_dict({"unit": unit.type, "new_models": [{
    "name": "ut_texhome_new", "clone_from": entry.name, "dest_dir": "unit_models/_units/newone",
    "mesh_src": str(picked / "new.mesh"), "texture_src": str(picked / "new.texture"),
    "normal_src": str(picked / "new_nm.texture")}]}))
copied = sorted(r for _s, r in plan.copies)
check("plans without errors", not plan.errors)
check("the mesh goes in the folder", "unit_models/_units/newone/new.mesh" in copied)
check("the texture and normal map go in its textures/",
      "unit_models/_units/newone/textures/new.texture" in copied
      and "unit_models/_units/newone/textures/new_nm.texture" in copied)
check("a folder that already is a textures/ is not nested",
      edit._texture_dir_of("unit_models/x/textures") == "unit_models/x/textures")

print(f"\n{sum(ok)}/{len(ok)} checks passed")
shutil.rmtree(root, ignore_errors=True); shutil.rmtree(picked, ignore_errors=True)
shutil.rmtree(cfg, ignore_errors=True)
sys.exit(0 if all(ok) else 1)
