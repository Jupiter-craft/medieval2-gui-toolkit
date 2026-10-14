"""Armory Studio's server side - unittransfer/armory.py (Phase 95e on).

  * object names in the Blender kit's form split into type, mesh and flag;
  * external models: a .glb and an .obj out of this toolkit's own exporters
    come back as the same triangles, and a hand-written COLLADA file with Z up
    and a skin is read into the game's space with its two strongest weights;
  * duplicates: the same art through an .obj's six decimals still matches;
  * a real mod's catalogue and one entry as an asset.
"""
import io
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from unittransfer import armory, mesh, modelexport
from tests import _realmod, _tmp

ok = []


def check(label, cond):
    ok.append(bool(cond))
    print(f"  [{'OK ' if cond else 'FAIL'}] {label}")


tmp = Path(_tmp.mkdtemp("ut_armory_"))
armory.ARMORY_DIR = tmp / "armory"
armory.PROJECT = armory.ARMORY_DIR / "project.json"

REFERENCE = (ROOT / "Reference" / "TWCenter" / "--- TOOLS n RESOURCES ---" /
             "TEMPLATE - Barded-Mailed Horses" / "Barded-Mailed Horses")

# ---------------------------------------------------------------------------
print("\nObject names")

check("Body__horse_body_01__opt is Body, horse_body_01, optional",
      armory.split_name("Body__horse_body_01__opt") == ("Body", "horse_body_01", 1))
check("a trailing .001 goes", armory.split_name("Head__head_01.001") == ("Head", "head_01", 0))
check("a name not in the kit's form is its own type and mesh",
      armory.split_name("Cube.002") == ("Cube", "Cube", 0))


def tri_positions(m, g):
    return [m.positions[i * 3 + k] for i in g.indices for k in range(3)]


# ---------------------------------------------------------------------------
print("\nExternal models")

horse_path = REFERENCE / "mount_barded_horse_lod0.mesh"
horse = mesh.read_mesh(horse_path) if horse_path.is_file() else None
if horse is not None:
    glb = tmp / "horse.glb"
    glb.write_bytes(modelexport.export_glb(horse, name="horse"))
    view = armory.external_view(str(glb))
    back = armory.external_by_id(view["id"])[0]
    check(f"a .glb comes back with every triangle ({view['triangles']} of {horse.triangles})",
          view["triangles"] == horse.triangles and len(view["objects"]) == len(horse.groups))
    worst = max(max(abs(a - b) for a, b in zip(tri_positions(back, g1), tri_positions(horse, g0)))
                for g0, g1 in zip(horse.groups, back.groups))
    check(f"in the game's space, winding and all ({worst:.1e})", worst < 1e-5)
    check("each object takes only its own vertices",
          back.vertices <= horse.vertices * 1.01)

    z = zipfile.ZipFile(io.BytesIO(modelexport.export_obj_zip(horse, name="horse")))
    z.extractall(tmp / "obj")
    view = armory.external_view(str(tmp / "obj" / "horse.obj"))
    back = armory.external_by_id(view["id"])[0]
    check("an .obj's objects take their kit names: type and mesh",
          [(o["name"], o["mesh"]) for o in view["objects"]]
          == [(g.name, g.texture_group) for g in horse.groups])
    worst = max(max(abs(a - b) for a, b in zip(tri_positions(back, g1), tri_positions(horse, g0)))
                for g0, g1 in zip(horse.groups, back.groups))
    check(f"and the same triangles to the .obj's six decimals ({worst:.1e})", worst < 2e-6)
    # duplicates: the fingerprint can miss a copy through six decimals, the
    # shape cannot
    orig = armory._objects(horse)
    same = sum(1 for a, b in zip(orig, view["objects"])
               if a["shape"][0] == b["shape"][0]
               and all(abs(a["shape"][i] - b["shape"][i]) <= 1e-4 for i in range(1, 5)))
    check(f"every object's shape matches its original ({same} of {len(orig)})", same == len(orig))

DAE = """<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
 <asset><up_axis>Z_UP</up_axis></asset>
 <library_images><image id="skin_png"><init_from>skin.png</init_from></image></library_images>
 <library_effects><effect id="mat-effect"><profile_COMMON>
  <newparam sid="s"><surface type="2D"><init_from>skin_png</init_from></surface></newparam>
 </profile_COMMON></effect></library_effects>
 <library_materials><material id="mat"><instance_effect url="#mat-effect"/></material></library_materials>
 <library_geometries><geometry id="g" name="Shield__shield_01__opt"><mesh>
  <source id="p"><float_array id="pa" count="9">0 0 0 1 0 0 0 0 1</float_array>
   <technique_common><accessor source="#pa" count="3" stride="3"/></technique_common></source>
  <source id="n"><float_array id="na" count="3">0 -1 0</float_array>
   <technique_common><accessor source="#na" count="1" stride="3"/></technique_common></source>
  <source id="t"><float_array id="ta" count="6">0 0 1 0 0 1</float_array>
   <technique_common><accessor source="#ta" count="3" stride="2"/></technique_common></source>
  <vertices id="v"><input semantic="POSITION" source="#p"/></vertices>
  <triangles material="m" count="1">
   <input semantic="VERTEX" source="#v" offset="0"/><input semantic="NORMAL" source="#n" offset="1"/>
   <input semantic="TEXCOORD" source="#t" offset="2" set="0"/>
   <p>0 0 0 1 0 1 2 0 2</p></triangles>
 </mesh></geometry></library_geometries>
 <library_controllers><controller id="c"><skin source="#g">
  <source id="j"><Name_array id="ja" count="3">bone_pelvis bone_head bone_shield</Name_array></source>
  <source id="w"><float_array id="wa" count="4">1 0.6 0.3 0.1</float_array></source>
  <joints><input semantic="JOINT" source="#j"/></joints>
  <vertex_weights count="3"><input semantic="JOINT" source="#j" offset="0"/><input semantic="WEIGHT" source="#w" offset="1"/>
   <vcount>1 3 1</vcount><v>0 0 1 1 2 2 0 3 2 0</v></vertex_weights>
 </skin></controller></library_controllers>
 <library_visual_scenes><visual_scene id="s"><node><instance_controller url="#c">
  <bind_material><technique_common><instance_material symbol="m" target="#mat"/></technique_common></bind_material>
 </instance_controller></node></visual_scene></library_visual_scenes>
</COLLADA>"""
(tmp / "dae").mkdir()
(tmp / "dae" / "part.dae").write_text(DAE, encoding="utf-8")
from PIL import Image
Image.new("RGBA", (8, 8), (200, 40, 40, 255)).save(tmp / "dae" / "skin.png")
view = armory.external_view(str(tmp / "dae" / "part.dae"))
m = armory.external_by_id(view["id"])[0]
o = view["objects"][0]
check("a .dae object takes its kit name", (o["name"], o["mesh"], o["flag"]) == ("Shield", "shield_01", 1))
check("its texture is found beside it", Path(o["texture_file"]).name == "skin.png")
# Z up: (1,0,0) stays x; (0,0,1) is up; then x is mirrored for the game
check("Z up is turned to Y up and x mirrored",
      [round(v, 4) for v in m.positions] == [0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 1.0, 0.0])
check("and the winding reversed with it", list(m.groups[0].indices) == [0, 2, 1])
check("v counts from the top, as in the game", [round(v, 4) for v in m.uvs[1::2]] == [1.0, 1.0, 0.0])
check("the skin's bones are named", set(m.bones) == {"bone_pelvis", "bone_head", "bone_shield"})
w1 = (round(m.weights[2], 3), round(m.weights[3], 3))
check(f"the second vertex keeps its two strongest weights, made whole {w1}", w1 == (0.667, 0.333))
first = m.bones[m.bone_ids[4 + 2]]
check(f"and the heavier one's bone is in the third byte ({first})", first == "bone_head")

# ---------------------------------------------------------------------------
print("\nThe project")
armory.save_project({"v": 1, "objects": [{"id": 1}]})
check("a project saves and loads back", armory.load_project() == {"v": 1, "objects": [{"id": 1}]})

# ---------------------------------------------------------------------------
print("\nA real mod")
game = _realmod.game(required=False)
mods = sorted(p for p in (game / "mods").iterdir() if (p / "data").is_dir()) if game.is_dir() else []
if mods:
    from unittransfer.mod import Mod
    mod = Mod(mods[0])
    cat = armory.catalogue(mod)
    check(f"{mod.name}: {len(cat['entries'])} entries and {len(cat['units'])} units offered",
          cat["entries"] and cat["units"])
    unit = next(u for u in cat["units"] if not u["models"][0]["missing"])
    check("a unit's soldier is listed first", unit["models"][0]["role"] == "soldier")
    asset = armory.asset_view(mod, unit["models"][0]["name"])
    check(f"its soldier as an asset: {len(asset['objects'])} objects, {asset['triangles']} triangles",
          asset["objects"] and sum(o["triangles"] for o in asset["objects"]) == asset["triangles"])
    try:
        armory.asset_view(mod, "no_such_entry_here")
        refused = False
    except armory.ArmoryError:
        refused = True
    check("an entry the mod has not got is refused by name", refused)
else:
    print("  no mod installed; skipped")

shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{sum(ok)}/{len(ok)} checks passed")
sys.exit(0 if all(ok) else 1)
