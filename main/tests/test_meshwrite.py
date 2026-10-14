"""The .mesh writer - unittransfer/meshwrite.py (Phase 95d).

Four kinds of check:

  * the seven reference models in this repo write back to their own bytes;
  * a model built from nothing (no layout kept) and one that was changed
    write a file both readers take back with the same geometry;
  * two models merged into one, the shape everything from 95e writes;
  * a SWEEP over every .mesh in the installed mods and the game's packs:
    each single-model file writes back byte for byte. The sky domes that
    hold several models are left to the reader's own refusal.
"""
import math
import sys
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from unittransfer import gamepack, mesh, meshwrite
from tests import _realmod

ok = []


def check(label, cond):
    ok.append(bool(cond))
    print(f"  [{'OK ' if cond else 'FAIL'}] {label}")


REFERENCE = (ROOT / "Reference" / "TWCenter" / "--- TOOLS n RESOURCES ---" /
             "TEMPLATE - Barded-Mailed Horses" / "Barded-Mailed Horses")


def fresh(m: mesh.MeshFile) -> mesh.MeshFile:
    """``m`` as a model built from nothing: its geometry, none of its layout."""
    out = mesh.MeshFile(source="new.mesh", format="mesh")
    out.positions = array("f", m.positions)
    out.normals = array("f", m.normals)
    out.uvs = array("f", m.uvs)
    out.weights = array("f", m.weights)
    out.bone_ids = bytes(m.bone_ids)
    out.bones = list(m.bones)
    out.bone_links = list(m.bone_links)
    out.groups = [mesh.MeshGroup(g.name, g.texture_group, array("H", g.indices), g.flag)
                  for g in m.groups]
    return out


def same_geometry(a, b, label):
    check(f"{label}: the same groups",
          [(g.name, g.texture_group, g.flag, list(g.indices)) for g in a.groups]
          == [(g.name, g.texture_group, g.flag, list(g.indices)) for g in b.groups])
    check(f"{label}: the same positions", list(a.positions) == list(b.positions))
    check(f"{label}: the same UVs", list(a.uvs) == list(b.uvs))
    check(f"{label}: the same weights and bones",
          list(a.weights) == list(b.weights) and a.bone_ids == b.bone_ids
          and a.bones == b.bones)
    worst = max((abs(x - y) for x, y in zip(a.normals, b.normals)), default=0.0)
    check(f"{label}: normals within one packed step ({worst:.4f})", worst <= 1 / 127)


# ---------------------------------------------------------------------------
print("\nReference models write back to their own bytes")

models = sorted(REFERENCE.glob("*.mesh")) if REFERENCE.is_dir() else []
check(f"the seven template meshes are present ({len(models)})", len(models) == 7)
for path in models:
    data = path.read_bytes()
    m = mesh.read_mesh(path, layout=True)
    check(f"{path.name}: its layout is read", m.layout is not None)
    check(f"{path.name}: written back byte for byte", mesh.write_mesh(m) == data)

horse = mesh.read_mesh(models[0], layout=True) if models else None

# ---------------------------------------------------------------------------
print("\nA model built from nothing")

if horse is not None:
    new = fresh(horse)
    raw = mesh.write_mesh(new)
    back = mesh.read_mesh_bytes(raw, "new.mesh", layout=True)
    check("the written file reads in the viewer's reader and the strict one",
          back.layout is not None)
    same_geometry(horse, back, "from nothing")
    check("the bone links come back", back.bone_links == horse.bone_links)
    check("a unit's LOD record is written: characterlod0",
          back.lod_name == "characterlod0"
          and back.layout.lod_body == meshwrite.CHARACTER_LOD_BODY)
    check("the template's LOD record is the one every unit carries",
          horse.layout.lod_body == meshwrite.CHARACTER_LOD_BODY)
    check("the same size as the original: nothing left out, nothing added",
          len(raw) == len(models[0].read_bytes()))
    # tangents are made from the UVs here; against the file's own they agree
    # in direction even though they are not the same bytes
    t0 = mesh._unpack_normals(horse.extra_streams[10], horse.vertices)
    t1 = mesh._unpack_normals(back.extra_streams[10], back.vertices)
    dots = [t0[i] * t1[i] + t0[i + 1] * t1[i + 1] + t0[i + 2] * t1[i + 2]
            for i in range(0, len(t0), 3)]
    agree = sum(d > 0.7 for d in dots) / len(dots)
    check(f"tangents worked out from the UVs agree with the file's ({agree:.0%})",
          agree > 0.85)
    b0 = mesh._unpack_normals(horse.extra_streams[11], horse.vertices)
    b1 = mesh._unpack_normals(back.extra_streams[11], back.vertices)
    dots = [b0[i] * b1[i] + b0[i + 1] * b1[i + 1] + b0[i + 2] * b1[i + 2]
            for i in range(0, len(b0), 3)]
    agree = sum(d > 0.7 for d in dots) / len(dots)
    check(f"and so do the binormals ({agree:.0%})", agree > 0.85)

# ---------------------------------------------------------------------------
print("\nA model that was changed")

if horse is not None:
    m = mesh.read_mesh(models[0], layout=True)
    for i in range(1, len(m.positions), 3):
        m.positions[i] += 0.25
    m.groups[0].flag = 1
    raw = mesh.write_mesh(m)
    back = mesh.read_mesh_bytes(raw, "moved.mesh", layout=True)
    check("a moved model writes and reads back", back.layout is not None)
    check("its positions moved by exactly what was added",
          all(abs(b - a - 0.25) < 1e-5 for a, b in
              zip(horse.positions[1::3], back.positions[1::3])))
    cx, cy, cz, r = meshwrite.struct.unpack("<4f", back.layout.sphere)
    far = max(math.dist((cx, cy, cz), back.positions[i:i + 3])
              for i in range(0, len(back.positions), 3))
    check(f"a new bounding sphere holds every vertex ({far:.3f} <= {r:.3f})", far <= r)
    r0 = meshwrite.struct.unpack("<4f", horse.layout.sphere)[3]
    check(f"and is about as tight as the game's ({r:.3f} against {r0:.3f})",
          r <= r0 * 1.06)
    check("the group's flag is written", back.groups[0].flag == 1)
    check("the normals as read are kept: they did not change",
          back.extra_streams[3] == horse.extra_streams[3])

# ---------------------------------------------------------------------------
print("\nTwo models merged into one")

if len(models) >= 2:
    a = mesh.read_mesh(models[0])
    b = mesh.read_mesh(models[-1])
    m = fresh(a)
    base = m.vertices
    m.positions.extend(b.positions)
    m.normals.extend(b.normals)
    m.uvs.extend(b.uvs)
    m.weights.extend(b.weights)
    m.bone_ids = m.bone_ids + b.bone_ids
    for g in b.groups:
        m.groups.append(mesh.MeshGroup(g.name, g.texture_group + "_b",
                                       array("H", (i + base for i in g.indices)), 1))
    back = mesh.read_mesh_bytes(mesh.write_mesh(m), "merged.mesh", layout=True)
    check(f"{len(m.groups)} groups and {m.vertices} vertices come back",
          len(back.groups) == len(m.groups) and back.vertices == m.vertices)
    check("the second model's groups index its own vertices",
          min(back.groups[len(a.groups)].indices) >= base)
    same_geometry(m, back, "merged")

    too_big = fresh(a)
    too_big.positions = array("f", bytes(12 * 70000))
    try:
        mesh.write_mesh(too_big)
        refused = False
    except mesh.MeshError as e:
        refused = "65,536" in str(e)
    check("more vertices than a .mesh can index is refused by name", refused)

# ---------------------------------------------------------------------------
print("\nEvery .mesh installed writes back byte for byte")

game = _realmod.game(required=False)
seen = same = multi = 0
differ = []
if game.is_dir():
    sources = [(str(p), p.read_bytes) for p in (game / "mods").rglob("*.mesh")]
    for pk in gamepack.packs(game):
        sources += [(f"{pk.path.name}:{n}", (lambda pk=pk, n=n: pk.read(n)))
                    for n in pk.entries if n.endswith(".mesh")]
    for src, get in sources:
        data = get()
        try:
            layout, _parts = meshwrite.read_layout(data, src)
        except mesh.MeshError as e:
            if "more than one model" in str(e):
                multi += 1
            else:
                differ.append(f"{src}: {e}")
            continue
        try:
            m = mesh.read_mesh_bytes(data, src, layout=True)
        except mesh.MeshError:
            continue
        seen += 1
        if mesh.write_mesh(m) == data:
            same += 1
        else:
            differ.append(f"{src}: written differently")
    print(f"  {len(sources)} files: {same} of {seen} written back exactly, "
          f"{multi} holding several models")
    check("every single-model .mesh writes back to its own bytes",
          seen and same == seen and not differ)
    for line in differ[:5]:
        print(f"          {line[:120]}")
else:
    print("  no game installed; the sweep is skipped")

print(f"\n{sum(ok)}/{len(ok)} checks passed")
sys.exit(0 if all(ok) else 1)
