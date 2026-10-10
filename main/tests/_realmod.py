"""Which real mod a test should measure itself against.

Three suites were written against ``Third_Age_6`` by name and died with a
``FileNotFoundError`` traceback the moment it was not installed - which says
nothing about the tool and hides whatever the run was meant to prove. The
installed set changes; the thing being tested does not. So a test names the mod
it *prefers* and takes whatever real mod is there instead, and when there is no
mod at all it says so and exits 0 rather than pretending to have failed.

The same goes for where the game is. Suites used to name one machine's install
folder outright, so on the next machine every one of them died with "no data/
folder under ...". :func:`game` asks the tool itself instead: the root saved in
``config/settings.json``, else the registry, the same lookup behind
``/api/detect_med2_root``.
"""
import sys
from pathlib import Path
from typing import Optional

from unittransfer import config

#: What :func:`game` hands back when there is no install and the caller can
#: cope: a relative path that is never a folder, so a test's own ``is_dir()``
#: guard skips its real-mod part, and a message naming it reads plainly.
NO_GAME = Path("<no Medieval II install found>")


def _find_game() -> Optional[Path]:
    """The installed game's root folder, or None.

    The saved root first, as the tool itself uses it; a saved root that is no
    longer a folder (the game moved, the machine changed) falls through to the
    registry rather than being trusted.
    """
    for look in (config.get_med2_root, config.detect_med2_root):
        try:
            found = look()
        except OSError:
            found = None
        if found and Path(found).is_dir():
            return Path(found)
    return None


#: Looked up once, at import: tests point ``config.SETTINGS_PATH`` at a temp
#: file soon after, and the install must not vanish when they do.
GAME_FOUND = _find_game()


def game(required: bool = True) -> Path:
    """The Medieval II install folder.

    With no install found, ``required`` exits the process with a SKIPPED line
    and status 0, as :func:`pick` does; otherwise :data:`NO_GAME` comes back
    for a test that guards its real-mod part itself.
    """
    if GAME_FOUND is None and required:
        print("SKIPPED - no Medieval II install found (none saved in "
              "config/settings.json, none in the registry)")
        sys.exit(0)
    return GAME_FOUND or NO_GAME


def mods(required: bool = True) -> Path:
    """The install's ``mods`` folder; see :func:`game` for ``required``."""
    return game(required) / "mods"


MODS = mods(required=False)


def installed(exclude=()) -> list:
    """Every mod folder under :data:`MODS` that really has a ``data/`` in it."""
    drop = {str(e).lower() for e in exclude}
    if not MODS.is_dir():
        return []
    return sorted((p for p in MODS.iterdir()
                   if p.is_dir() and (p / "data").is_dir() and p.name.lower() not in drop),
                  key=lambda p: p.name.lower())


def pick(*prefer, exclude=(), need="") -> Path:
    """The first preferred mod that is installed, else any other installed one.

    ``need`` is a path under the mod's ``data/`` the test cannot do without
    (``unit_models/battle_models.modeldb``, say); mods missing it are passed
    over. Exits the process with a SKIPPED line - and status 0 - when nothing
    qualifies, because "no mod to measure" is not a defect in the tool.
    """
    drop = {str(e).lower() for e in exclude} | {
        Path(str(e)).name.lower() for e in exclude}
    order = [MODS / p for p in prefer] + installed(exclude=drop)
    seen = set()
    for m in order:
        key = m.name.lower()
        if key in seen or key in drop:
            continue
        seen.add(key)
        if (m / "data").is_dir() and (not need or (m / "data" / need).exists()):
            return m
    want = " or ".join(prefer) or "any mod"
    print(f"SKIPPED - no installed mod to test against (wanted {want}"
          + (f" with data/{need}" if need else "") + f") under {MODS}")
    sys.exit(0)
