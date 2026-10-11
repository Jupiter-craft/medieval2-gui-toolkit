# v2.4.5

**Building art can be replaced again, and the Models Editor shows the meshes
no battle model entry names.** The Replace button in the picture dialog did
nothing when the file you picked sat under a mod's `data\ui` folder, which is
where nearly every building icon lives.

## New

* **Meshes no entry names, in the Models Editor.** A folded list in the 3D
  panel holds every `.mesh` under `unit_models` that no `battle_models.modeldb`
  entry points at (268 in DaC, 18 in Third Age Reforged), and any one of them
  opens in the viewer. A battle mesh never says which texture it wears, so the
  skins offered are best guesses: a byte-for-byte copy of an entry's mesh takes
  that entry's skins, then a name match in the mesh's own `textures` folder,
  then anywhere under `unit_models`. Any sheet can also be put on by hand from
  a searchable list.

## Fixed

* **Replace image did nothing for a file under `ui\`.** Picking a replacement
  for a building's art (or any picture) out of another mod's `data\ui` folder
  opened the comparison dialog, but its Replace button had no effect. The
  path's backslashes were read as escape codes, and `\u` from `\ui\` broke the
  button outright. Paths now pass through untouched, which also fixes the same
  quiet mangling of `\n` and `\t` in paths on every other button that carries
  one.

* **The code view of a battle model entry with an animation record** stopped
  with an error instead of showing the entry. It shows it again.
