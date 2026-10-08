"""Hand-edit damage in a modeldb texture list, named exactly and mended.

Wars_of_Arda's ``datower_guards5`` stopped the whole mod opening. Its attachment
list said 3 and read ``aztecs``, ``denmark``, texture, normal, texture, normal,
``slave``, texture, normal: the ``denmark`` line had slipped up one skin. The
reader took ``denmark`` as aztecs' texture, died a line later on a "sprite
length" that was really a normal map's, and blamed a stray digit glued to a 0
that was not there.

The reader now looks from the faction: a faction name followed by another name
that is not a path is a skin with no files, and it says so on that line. It
also knows the mend for the shapes it can be sure of, and
:func:`modeldb.repair_text` makes them until the file reads:

* the next faction's line slipped above this one's files -> move it back down
* a skin's files really gone -> give it the next (or previous) skin's
* a stray digit glued to an attachment's 0 -> delete it

Anything it does not recognise is raised exactly as before, and nothing is
mended in part.

    python -m tests.test_modeldb_repair
"""
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from unittransfer import config, modeldb

ok = []


def check(label, cond):
    ok.append(bool(cond))
    print(f"  [{'OK ' if cond else 'FAIL'}] {label}")


def nm(v: str) -> str:
    return f"{len(v)} {v}"


TEX, NRM = "attach/guard_at.texture", "attach/guard_at_norm.texture"
SPR = "unit_sprites/guard.spr"


def skin(fac, att=True):
    return [nm(fac), nm(TEX), nm(NRM) + " 0"] if att else [nm(fac), nm(TEX), nm(NRM), nm(SPR)]


def files(att=True):
    return skin("x", att)[1:]


def entry(attach_lines, count):
    return "\n".join([
        nm("guard"), "1 1", nm("units/guard.mesh") + " 6400",
        "3", *skin("aztecs", False), *skin("denmark", False), *skin("slave", False),
        str(count), *attach_lines,
        "1", nm("None"), nm("MTW2_Spear") + " 0", "1", nm("MTW2_Spear_primary"), "0",
        "16 -0.09 0 0 -0.35 0.8 0.6", "",
    ])


def file_of(attach_lines, count=3):
    head = f"{len(modeldb.ARCHIVE_MAGIC)} {modeldb.ARCHIVE_MAGIC} 0 0 0 0 0 2 0 0\n"
    blank = nm("blank") + " " + " ".join(["0"] * 39) + "\n"
    return head + blank + entry(attach_lines, count)


GOOD = file_of([*skin("aztecs"), *skin("denmark"), *skin("slave")])


def factions(text):
    return [t.faction for t in modeldb.parse_text(text).entries[0].attach_textures]


def refused(text):
    try:
        modeldb.parse_text(text)
    except ValueError as e:
        return e
    return None


print("\n== a sound file is left alone ==")
fixed, notes = modeldb.repair_text(GOOD)
check("nothing to mend, nothing changed", fixed == GOOD and notes == [])

print("\n== the faction line that slipped (the Wars_of_Arda shape) ==")
SLIPPED = file_of([nm("aztecs"), nm("denmark"), *files(), *files(), *skin("slave")])
e = refused(SLIPPED)
check("it is refused", e is not None)
msg = str(e)
check("...on the bare faction's own line", "line 20," in msg)
check("...saying the faction lines slipped", "have slipped" in msg and "'denmark'" in msg)
check("...not blaming a glued digit", "glued" not in msg)
check("...and it can be mended", modeldb.repairable(e))
fixed, notes = modeldb.repair_text(SLIPPED)
check("the mend reads", factions(fixed) == ["aztecs", "denmark", "slave"])
check("...as the file it should have been, give or take a space",
      fixed.split() == GOOD.split())
check("...with one note naming the move", len(notes) == 1 and "moved it back down" in notes[0])

print("\n== a skin whose files are really gone ==")
for where, lines, want in (
        ("in the middle", [*skin("aztecs"), nm("denmark"), *skin("slave")], 3),
        ("at the end", [*skin("aztecs"), *skin("denmark"), nm("slave")], 3)):
    src = file_of(lines, want)
    e = refused(src)
    check(f"{where}: refused on that faction, with the mend",
          e is not None and "gives it no texture or normal map" in str(e) and modeldb.repairable(e))
    fixed, notes = modeldb.repair_text(src)
    check(f"{where}: the mend reads, every faction kept",
          factions(fixed) == ["aztecs", "denmark", "slave"])
    check(f"{where}: ...and the note says whose files it borrowed",
          len(notes) == 1 and "so it was given" in notes[0])

print("\n== a digit glued to the 0, and two mends in one file ==")
glued = file_of([*skin("aztecs"), nm("denmark"), *skin("slave")]).replace(
    nm(NRM) + " 0\n" + nm("denmark"), nm(NRM) + " 01\n" + nm("denmark"), 1)
fixed, notes = modeldb.repair_text(glued)
check("both mended in one call", factions(fixed) == ["aztecs", "denmark", "slave"]
      and len(notes) == 2)

print("\n== two numbers that lost the space between them (Silmarillion_Total_War) ==")
#: ``0 0-1 0 ...`` where the file means ``0 0 -1 ...``: the weapon count and
#: the torch index run together, and a float pair the same way
lost = GOOD.replace("\n0\n16 -0.09", "\n0-1 -0.09", 1).replace("0.8 0.6", "0.8-0.6", 1)
e = refused(lost)
check("refused on the glued token itself, naming both halves",
      e is not None and "'0-1' is two numbers, 0 and -1" in str(e) and modeldb.repairable(e))
fixed, notes = modeldb.repair_text(lost)
ent = modeldb.parse_text(fixed).entries[0]
check("both spaces put back, and the torch line reads as meant",
      len(notes) == 2 and ent.torch_index == -1 and ent.torch[-2:] == [0.8, -0.6])
check("a minus that is not between two numbers is not split",
      not modeldb.repairable(refused(GOOD.replace("\n0\n16 -0.09", "\n0-x -0.09", 1))))

print("\n== damage it does not know is raised, untouched ==")
#: a count one too high - the existing sentence about the count stands, and no
#: guess is made at which skin went missing
short = file_of([*skin("aztecs"), *skin("denmark")], 3)
e = refused(short)
check("a count that is one too many is not 'mended'", e is not None and not modeldb.repairable(e))
try:
    modeldb.repair_text(short)
    check("...and repair_text raises it", False)
except ValueError as err:
    check("...and repair_text raises it, the same sentence", str(err) == str(e))

print("\n== on disk: backed up, logged, undoable ==")
tmp = Path(tempfile.mkdtemp(prefix="ut_repair_"))
old_root = config.backup_root_for
try:
    (tmp / "mod" / "data" / "unit_models").mkdir(parents=True)
    path = tmp / "mod" / "data" / "unit_models" / "battle_models.modeldb"
    path.write_text(SLIPPED, encoding=modeldb.ENCODING, newline="")
    logged = []
    config.backup_root_for = lambda tid: tmp / "backups" / tid
    old_log, config.append_log = config.append_log, logged.append

    class _Mod:
        name, root, data, modeldb_path = "M", tmp / "mod", tmp / "mod" / "data", path
    try:
        res = modeldb.apply_repair(_Mod)
    finally:
        config.append_log = old_log
    check("the file on disk now reads",
          [t.faction for t in modeldb.parse_file(path).entries[0].attach_textures]
          == ["aztecs", "denmark", "slave"])
    kept = tmp / "backups" / res["id"] / "data" / "unit_models" / "battle_models.modeldb"
    check("the original is kept in the job's backup, byte for byte",
          kept.read_text(encoding=modeldb.ENCODING) == SLIPPED)
    check("one history record, naming the file to restore",
          len(logged) == 1 and logged[0]["manifest"]["backed_up"] == ["unit_models/battle_models.modeldb"])
finally:
    config.backup_root_for = old_root
    shutil.rmtree(tmp, ignore_errors=True)

print()
print(f"{sum(ok)}/{len(ok)} checks - "
      + ("ALL PASSED" if all(ok) else f"{len(ok) - sum(ok)} FAILED"))
sys.exit(0 if all(ok) else 1)
