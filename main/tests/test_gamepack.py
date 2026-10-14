"""98f: the base game's packs, read without unpacking, and the one lookup.

Two halves. The first needs nothing installed: a small PACK file is written
here in the container's layout (stored blocks, a file over 64 KB so it spans
two of them), and a fake game folder around it, to hold the reader to the
layout and the lookup to its order: the mod's data/, the game's loose data/,
the packs.

The second reads the real install's packs, when there is one: files decoded
out of every pack at the size their record gives, the ones the game also keeps
loose compared byte for byte (a loose file the patch replaced differs, and is
the one the game reads), building art for a culture the mod draws none of, and
a transfer of a model whose files only the base game has.

Measured once by hand, not repeated here because it takes 15 minutes: every one
of the 37,168 files of the seven packs (7.08 GB) reads out at its size, and a
sample of 1,883 is byte for byte what CA's own unpacker writes.
"""
import random, shutil, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tests import _realmod, _tmp
from unittransfer import config, gamepack

ok = []
def check(label, cond):
    ok.append(bool(cond)); print(f"  [{'OK ' if cond else 'FAIL'}] {label}")


def write_pack(path: Path, files):
    """A PACK file holding ``files`` ({name: bytes}), every block stored."""
    names = list(files)
    blocks, firsts = [], []
    for name in names:
        firsts.append(len(blocks))
        data = files[name]
        blocks += [len(data[i:i + gamepack.BLOCK]) for i in range(0, len(data), gamepack.BLOCK)]

    def records(data_at):
        out, starts = b"", []
        for name, first in zip(names, firsts):
            starts.append(len(out))
            rec = struct.pack("<4I", data_at, first, len(files[name]), len(files[name]))
            rec += name.encode() + b"\0"
            out += rec + b"\0" * (-len(rec) % 4)
            data_at += len(files[name])
        return out, starts

    head = 24 + 4 * (len(names) - 1) + 4 * len(blocks)
    index, starts = records(head + len(records(0)[0]))
    path.write_bytes(b"PACK" + struct.pack("<HHIIII", 0, 3, len(names), len(index), len(blocks), 0)
                     + struct.pack(f"<{len(names) - 1}I", *starts[1:])
                     + struct.pack(f"<{len(blocks)}I", *blocks) + index
                     + b"".join(files[n] for n in names))


cfg = Path(_tmp.mkdtemp(prefix="ut_cfg_"))
config.CONFIG_DIR = cfg; config.SETTINGS_PATH = cfg / "settings.json"
tmp = Path(_tmp.mkdtemp(prefix="ut_gamepack_"))

print("a pack written here")
game = tmp / "game"
(game / "packs").mkdir(parents=True)
big = bytes(random.Random(98).randrange(256) for _ in range(70000))
write_pack(game / "packs" / "data_0.pack", {
    "data/unit_models/a/one.texture": b"ONE-FROM-PACK",
    "data/unit_models/a/big.mesh": big,
    "data/unit_models/a/both.texture": b"BOTH-PACK"})
p = gamepack.GamePack(game / "packs" / "data_0.pack")
check("three names in the index", sorted(p.entries) == ["data/unit_models/a/big.mesh",
      "data/unit_models/a/both.texture", "data/unit_models/a/one.texture"])
check("a small file reads back", p.read("data/unit_models/a/one.texture") == b"ONE-FROM-PACK")
check("a file over two blocks reads back whole", p.read("data/unit_models/a/big.mesh") == big)

mod_root = game / "mods" / "m"
(mod_root / "data" / "unit_models" / "a").mkdir(parents=True)
(game / "data" / "unit_models" / "a").mkdir(parents=True)
(game / "data" / "unit_models" / "a" / "both.texture").write_bytes(b"BOTH-LOOSE")
(mod_root / "data" / "unit_models" / "a" / "mine.texture").write_bytes(b"MINE")
class FakeMod:
    root = mod_root
    data = mod_root / "data"
m = FakeMod()
check("the game is found two above mods/<name>", gamepack.game_root_of(m) == game)
check("the mod's own file is the mod's", gamepack.exists("unit_models/a/mine.texture", m) == "mod")
check("a loose game file wins over the pack's", gamepack.lookup("unit_models/a/both.texture", m)[1] == "game"
      and gamepack.lookup("unit_models/a/both.texture", m)[0].read_bytes() == b"BOTH-LOOSE")
path, where = gamepack.lookup("unit_models/A/One.texture", m)
check("a pack file is found whatever its case, and read out of it",
      where == "pack" and path.read_bytes() == b"ONE-FROM-PACK")
check("nothing anywhere is ''", gamepack.exists("unit_models/a/none.texture", m) == "")

print("\na Kingdoms campaign: its own packs, named mods/<campaign>/data/...")
(mod_root / "packs").mkdir()
write_pack(mod_root / "packs" / "data_0.pack", {
    "mods/m/data/export_descr_unit.txt": b"type x\n",
    "mods/m/data/unit_models/a/one.texture": b"ONE-FROM-CAMPAIGN"})
check("the prefix is the campaign's", gamepack.own_prefix(m) == "mods/m/data/")
path, where = gamepack.lookup("unit_models/a/one.texture", m)
check("its own packed copy wins over the base game's, as the mod's",
      where == "modpack" and path.read_bytes() == b"ONE-FROM-CAMPAIGN")
check("the mod's loose file still wins over its pack",
      gamepack.exists("unit_models/a/mine.texture", m) == "mod")
check("a file only the base game has is still the base game's",
      gamepack.exists("unit_models/a/big.mesh", m) == "pack")
check("a path out of data/ is not followed", gamepack.lookup("../packs/data_0.pack", m)[1] == "")

G = _realmod.game(required=False)
if not gamepack.pack_paths(G):
    print("\nSKIPPED the real packs - no packs/ under the install")
else:
    print("\nthe installed game's packs")
    packs = gamepack.packs(G)
    check("seven packs indexed", len(packs) == 7)
    rnd = random.Random(98)
    good = n = 0
    for pk in packs:
        for name in rnd.sample(sorted(pk.entries), 8):
            n += 1
            good += len(pk.read(name)) == pk.size_of(name)
    check(f"{n} files decoded at the size their record gives", good == n)
    # a loose file of the same name is the one a patch put there, and the game
    # reads it instead; a few were left as they were packed, and those agree
    same = [name for pk in packs for name in pk.entries
            if (G / name).is_file() and gamepack.read_bytes(name, G) == (G / name).read_bytes()]
    check(f"{len(same)} files the game also keeps loose, unpatched, are byte for byte the same",
          len(same) >= 5)

    from unittransfer import buildings
    ui = buildings.GameUi(G, packs)
    check("the game's building art covers the four vanilla cultures",
          {"eastern_european", "middle_eastern", "northern_european", "southern_european"} <= set(ui.cultures))
    hit = ui.lookup("eastern_european", "#eastern_european_abbey")
    check("a picture out of a pack is readable art", hit is not None and hit.read_bytes()[:3] == b"\0\0\x02"
          or (hit is not None and hit.stat().st_size > 1000))

    print("\na transfer of a file only the base game has")
    from unittransfer import transfer
    class Plan:
        def __init__(self):
            self.base_game_assets, self.asset_files = [], []
    src_mod = _realmod.pick(need="unit_models/battle_models.modeldb")
    from unittransfer.mod import Mod
    s = Mod(src_mod)
    vanilla = next(nm[5:] for pk in packs for nm in pk.entries
                   if nm.startswith("data/unit_models/_units/") and nm.endswith(".texture")
                   and not (s.data / nm[5:]).is_file())
    plan = Plan()
    check("a mod of the same game reads it there: nothing copied",
          transfer._from_base_game(plan, s, s, vanilla) and plan.base_game_assets == [vanilla]
          and not plan.asset_files)
    plan = Plan()
    check("a mod of another game gets a copy out of the pack",
          transfer._from_base_game(plan, s, FakeMod(), vanilla) and plan.asset_files
          and plan.asset_files[0][1] == vanilla and plan.asset_files[0][0].is_file())
    check("a file the game has not got either is not claimed",
          not transfer._from_base_game(Plan(), s, s, "unit_models/no/such.texture"))

print(f"\n{sum(ok)}/{len(ok)} checks passed")
shutil.rmtree(tmp, ignore_errors=True); shutil.rmtree(cfg, ignore_errors=True)
sys.exit(0 if all(ok) else 1)
