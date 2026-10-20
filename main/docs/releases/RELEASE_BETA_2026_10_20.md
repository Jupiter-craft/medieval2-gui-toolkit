# beta 2026-10-20

**Everything in v2.4.8 with the campaign map, Armory Studio and the unit card
generator switched on**: each faction's own card in the Unit Editor, borrowed
ones marked. On top of it, Armory Studio's second round.

## New in Armory Studio

* **Rig to bones.** Under Weights: put every vertex of the selected objects
  on one bone, or on two with a share, the bones listed in the Med2 order
  (head, torso, abs, pelvis, the arms from the hand in, the legs).
* **Several objects at once.** Shift+click selects a run in the object list,
  Ctrl+click adds or takes one. With several selected, set the group type,
  the mesh name (numbered `_01`, `_02`), a dye, Transfer weights or Rig to
  bones for all of them, each one Undo step.
* **The sliders.** Duplicate, Detail and Statistics sit beside the X, Y, Z
  sliders, and the mouse wheel over any of the nine numbers steps it (Shift
  finer, Ctrl coarser).
* **Loaded assets counts what is used**, "2 of 35 used" on each model, and
  *Only parts in the model* hides the rest.
* **Full view**, on the bar or Ctrl+Space as in Blender: the viewport takes
  the whole window, and the same key or Esc brings the panels back.
* **The import dialog** filters a mod's units by faction, category, class and
  culture, opens as a gallery, and every tile has a 🔍 for a closer look in
  the Models Editor's viewer. A battle `.mesh` from disk now brings its own
  sheets.
* **A Textures tab.** Every sheet the model wears; **Edit** opens a copy in
  your own image program and the viewport reloads each time you save there.
  Import a sheet, put it on the selected objects, export it to PNG, TGA, JPG,
  BMP, DDS or `.texture`. The mod itself is never written, and the export
  bakes the edited sheet.
* **A UV edit mode.** The selected object's UVs over its sheet: pick vertices
  or islands, G, R and S as in Blender, snap to texels, an M2 view of the
  main and attachment sheets side by side. The edits carry into the pose and
  the export.
* **Optimize**, from the Quick Cleanup addon: merge by distance (only where
  the UVs match, so seams stay), dissolve degenerate faces, recalculate
  normals and reset them, on each piece, with the Blender kit's checks.
* **The packer fills holes.** On export, a block of UVs now goes into any
  room its shape fits, a hole inside another block or a pocket at its side
  included. Mordor's bodyguard needs a scale of 0.71 to fit a 512 sheet where
  it needed 0.69; the reference horse fits 512 without scaling.
* **Free rotation**, a checkbox in the export's UV step, off unless ticked: a
  block may turn to whatever angle boxes it smallest, as well as by quarter
  turns. A block turned so is resampled, so its art softens slightly.

## Fixed in Armory Studio

* **Transfer weights tore shields and legs.** A shield came out split over
  three arm bones and the feet came out with no foot bone. A part now keeps
  its own weights where nothing reaches it, takes no bone from the other
  side, and a shield or weapon comes out on one bone.
* **A vertex on a sheet's right edge read the next sheet.** The packer could
  put a block's art flush against the right edge, where the game reads the
  vertex off the attachment sheet instead. Art now stops a texel short.

Nothing exported after a UV edit, a sheet edit or Optimize has been tried in
game yet.

This is still a **beta** for the reason the first one was: the campaign map
editor is the first thing this toolkit does that WRITES to a campaign, and a
campaign is the one part of a mod where a bad write shows up ten turns in rather
than the moment you load it. Everything it writes is backed up and one Undo
away. Read the plan before you press Apply.
