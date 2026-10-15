# v2.4.6

**Fixes for transferred and deleted units, the base game's files read straight
out of its packs, and a Models Editor that shows a whole mod at once.** The
campaign map, Armory Studio and the unit card generator stay on the beta line;
everything below is on this one.

## Fixed

* **A transferred unit's texture glitched on every faction row but the
  first.** One model entry often names the same texture in several spellings
  (other capitals, backslashes, a leading `data/`). Only the first spelling
  was copied and rewritten, so the rows below kept pointing at the old path,
  which in the destination can hold another unit's texture. Every row naming
  a file is now moved with it, whatever its spelling.
* **Deleting a mounted unit left its mount behind.** Deleting a unit now
  removes its battle-model entries by default, and with them its mount from
  `descr_mount.txt` (every copy of it) when no other unit rides it, and the
  mount's model entry when nothing else uses it.
* **Copies of one mount piled up in `descr_mount.txt`, and mounts went
  invisible in battle.** Each new transfer of a unit whose mount the
  destination already had in another form appended another renamed copy. A
  transfer now reuses a mount the destination already has with the same
  content, under any name.
* **The Spanish wording a player flagged** is corrected, and German and
  Spanish are complete again.
* **The Strat map 3D panel lost its model under the file list.** The model
  comes first now, the file list folded under it.
* **Building art needed a refresh to show a second replacement**, and
  **textures a model names elsewhere** land in the model folder's
  `textures/`, with strays shown.

## New

* **The base game's files are read straight out of its `.pack` files**, so the
  release no longer ships its own copy of the vanilla interface art: the zip
  is about 22 MB.
* **Models Editor:** a gallery of every battle model, with spin and variation
  and five new filters; Unit entries, each unit's soldier, officers and
  upgrades in a row; Strat models and CAS models as two tabs drawing in the
  docked viewer; models from any folder (a Blender export or a pasted `data`
  folder), playing the chosen mod's animations.
* **The four Kingdoms campaigns open**, read out of their own packs.
* **The top bar folds away** (the ▴ at its right) in every mode, and every
  scrolling area has one soft scrollbar in the toolkit's colours.
* **A Ko-fi link** on Home and in the Credits.
