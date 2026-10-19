# Medieval 2 GUI Toolkit - Roadmap (present and future)

**This file is what is left to do.** Everything already built has been moved to
[ROADMAP_ARCHIVE.md](ROADMAP_ARCHIVE.md), verbatim, so a session no longer
reads 3,000 lines of finished work to find the next step. What stays here is
what a session still has to act on: the locked decisions, the phase index, the
map-format reference the map modules are built on, and the schedule of what is
left. **When a phase finishes, its write-up goes to the archive and its row here
moves up into the phase index, in the same commit** - the rule in *The four documents*
below, restored on 2026-09-23 after this file had grown back to 5,000 lines.

**Where to look**

| You want | Read |
|---|---|
| the next thing to do | this file, the **schedule** below, then `STATE.md` |
| what shipped and why a rule is a rule | `ROADMAP_ARCHIVE.md` |
| what the last few sessions did | `STATE_ARCHIVE.md` |
| the reasoning behind a backlog item | `docs/upstream/REFERENCE_GAPS.md` |
| the strict release rules | `RELEASE.md` |

**Reference tool:** [Mylae's M2TW Editor](https://github.com/Machiavello-1441/m2tw-editor)
(React/Base44, ~59.6k LOC, works directly on `main`, no releases - used with the
author's permission). We port **behaviour and format knowledge**, never JSX.

**Ground truth when a format is unclear:** the TWCenter tutorial archive in
`Reference/TWCenter/` (indexed in Phase 1), then the Blender M2TW addon in
`Reference/Medieval-2-Toolkit/` for 3D formats.

Since 2026-10-06 a phase is one major feature, built start to finish (see the
schedule); its lettered pieces are commits, not stopping points. A session doing roadmap work
**must** end by updating `STATE.md` (contract at the bottom of this file),
running the test suite, and running `graphify update .`.

---

## Locked decisions

- **One engine.** `unittransfer/` (Python) is the sole owner of parsing and
  disk I/O. No second parser for the same format anywhere, ever.
- **Vanilla UI only.** Reference modules are rewritten in our stack (plain JS
  served by the Python server, zero build step). No React, no npm.
- **Code View everywhere, built once.** A shared two-pane widget (GUI ⇄ raw
  code, hover-highlight, two-way live edits, server-side parsing with a
  field→line span map). Built in Phase 4, adopted by every editor after it.
- **No AI / autogenerate features. Hard no.** Excludes porting their
  `LuaAiAssistant`, `ScriptAIAssistant` and symbol generator. **Amended
  2026-09-03:** the OSM / Köppen / land-cover fetchers were swept in here by the
  same rule and are now *deferred, not excluded* - they land in Phases 25 and 27
  (see below), opt-in and off by default, because a map editor is the one module
  where a real-world backdrop is worth the network call. The three AI assistants
  above stay a permanent no.
- **V3 is the Campaign Map Editor** (Phase 16, sessions 16a-16k). It goes as
  deep as the reference tools do - map layers, regions, painting, validation,
  and the whole `descr_strat.txt` campaign database including characters,
  family trees, diplomacy and faction creation.
- **Pillow only, for the map too.** Measured on DaC's real map: all ten TGA
  layers decode in under 100 ms, the unique-colour census is 6 ms, the region
  label image 5 ms. The reference tool's lag is repeated work, not a slow
  language, so no numpy and no C extension - see the campaign map
  reference below.
- **A rule with no evidence reports nothing.** A check that needs a vocabulary
  asks for that file first and, when it is not on disk, names the file that
  would let it run. It never reads "no climate is declared" as "every climate
  colour is undeclared". Graduated out of `STATE.md` 2026-09-05; measured in
  16f, and it is why the stock game's packed `data/` does not produce 11 faults
  and 55,755 bad tiles against a map that ships with the game and works.
- **A baseline shows and stops blocking; it never hides.** A mod is somebody
  else's work with somebody else's bugs in it - vanilla's own map has 63
  findings - so an inherited fault stays visible and counted but does not refuse
  a save. A tool that blocks on 40 of them is one nobody uses twice; a tool that
  hides them is one nobody believes. Graduated 2026-09-05.
- **Localised names first** everywhere in the UI, code name in brackets -
  `Town Hall (core_building)`.
- **Self-hosted local app.** Never a hosted browser app; file access stays
  server-side with backup/undo on every write.
- **Don't vendor their `dist/`** or any bulk assets from the reference repo.
- **Versioning:** **2.0.0 shipped at the end of Phase 14** (2026-08-19), with
  every V2 editor module complete. Release titles are "M2 GUI-Kit
  VX.Y.Z - …".
  *This supersedes the original rule, which was "stay on 1.x until the Campaign
  Map Editor lands".* The reason it changed: 1.9.9 shipped a unit-transfer tool,
  and what is in 2.0.0 is a different program - a rebrand, six new editor
  modules, a shared Code View, and a whole polish pass over them. Holding the
  major number back for one unbuilt feature would have meant shipping all of
  that as a point release. **The Campaign Map Editor is now 3.0.0** (Phase 16).

---

## Phase index

Every phase in this table is finished. The write-up for each one is in
`ROADMAP_ARCHIVE.md` under the same heading; the table is here so the numbers in
commit messages, `docs/upstream/PORT_MANIFEST.json` and `STATE.md` still resolve.
A phase from the schedule further down moves up into this table when it
finishes; the schedule holds only what is left.

| # | Phase | Shipped in |
|---|---|---|
| 0-3 | V2 kickoff, TWCenter index, upstream tracking, UI split | 2.0.0 |
| 4-5 | Code View widget + line-map API; Home module | 2.0.0 |
| 6-9 | Strings editor; trigger/condition core; Traits; Ancillaries | 2.0.0 |
| 10-12 | Minor Files; Factions editor; EDB upgrades | 2.0.0 |
| 13 | EDU + Sounds audit | 2.0.0 |
| 14a-14i | Bug-fix and polish pass | 2.0.0 |
| 14j | Replace any picture | 2.0.1 |
| 15-15d | 3D model viewer: decoder, viewer, addon audit | 2.1.0 |
| 15e-15f | Port between mods, M2EX flag, docked viewer; two cleaners | 2.1.2, 2.1.3 |
| 15g-15h | Add a faction (twelve files); recruitment on the unit; UV mode | 2.1.8, 2.1.9 |
| 15i-15j | Model beside a transfer; resizable panels; no em dashes | 2.1.10, 2.1.11 |
| 16a-16k | **Campaign Map Editor** - read, render, paint, validate, query, write, preview | 3.0.0 (uncut) |
| 17a-17i | Campaign map correction pass - Home's card, the hover trail, the marker click, the markers layer, the tooltip, one faction screen, the prose and the credits | 3.0.0 (uncut) |
| 18a | Four files nobody could edit - guilds, campaign descriptions, faction movies, the region's mercenary pool | 3.1.0 (uncut) |
| 18b | Events and disasters - `descr_events.txt`, `descr_disasters.txt`, and their positions on the marker layer | 3.1.0 (uncut) |
| 19a | The keys a new record needs - the province and settlement names, and the pool a character's name comes out of | 3.1.0 (uncut) |
| 19b | Rename, and follow it - a province, a settlement and a faction slot, position-aware over twenty-four files | 3.1.0 (uncut) |
| 20a | Three layers read properly - the river overlay, the heights as transparency, and a number key per layer | 3.1.0 (uncut) |
| 20b | Getting to the thing you want - the campaign browser and the three campaigns nothing offered, the find box, named view presets | 3.1.0 (uncut) |
| 20c | Labels, and picking a tile - settlement names placed so none covers another, and one pin that writes a clicked tile into any coordinate field | 3.1.0 (uncut) |
| B1 | A new province reaches every campaign that reads the map - a settlement, a music type, the lookup pair, a campaign's own record file and compiled map; the creator is a picker and the shown names are required | 3.1.0 (uncut) |
| 21 | Two screens over data we hold - is this faction complete, with each gap copied from a template, and a raw text editor for any file the toolkit reads | 3.1.0 (uncut) |
| 22a | Forts and watchtowers - placed on a clicked tile, dragged, changed and deleted, one line each, filed under the province they stand in | 3.2.0 (uncut) |
| 22b | Resources through the same writer, the nearest tile that would do for every placement rule, the Localize ring, and 17d's drag made to drop | 3.2.0 (uncut) |
| 22c | A campaign that ships its own map files is drawn, probed, checked and fixed on them, and the brush is refused where it would paint a map nobody can see | 3.2.0 (uncut) |
| 23a-24 | The map in the game's own ground textures, winter and the tint; delete a province, make a campaign | 3.2.0 / v2.3.0 |
| 28-31, 33-36 | The map screen's menu and toolbar; missing textures; river rules; three map wins; add a climate; rebels in place; a region's colour | uncut, beta |
| 29 + B4 | The strat model viewer | v2.3.2 |
| 32a-32c | The mercenary pools: one parser, both directions, six rules and a repair | uncut, beta |
| 37-43 | The spawn export and FE zoom; campaign constants; the engine ceilings; the new province the engine cannot read; merge a name pool; a clone's missing art; playable and unlockable | uncut |
| 44-49 | The EDB tree checked; hidden resources; the Cultures screen; the sound scripts; two strings rows; the strips and one place for models | v2.3.5 onward |
| 50-53 | The map's defaults; the EDB editor's order and insert; change sets recorded and switched | uncut |
| 54 | Health - one door to every check (M17) | v2.3.7 |
| 55 | A battle model that moves (M16, playback) | uncut |
| M18 | The map in 3D | beta |
| 56-60, 62-69, 74-76 | Several factions and the faction zip; the animation editor and converter; will this mod launch; settlement mechanics; add a religion; one file in or out; the minor files (populace and off-map models, animals, standards, advice, battle banners, hero abilities, area effects, walls, agents and generals); a settlement model imported; the `.cas` view placed by its skeleton; a building tree from another mod; and 71's `data/` zip loaded back | v2.3.9 at the latest |
| 61, 70-73 | Delete, create and copy a settlement; every tile as text; a campaign as a zip; a horde start; a campaign from another mod | beta 2026-09-25 at the latest |
| 25-27 | The OSM backdrop and coastline; map resize and a map from scratch; the layer generators | beta 2026-09-25 |
| 77-81 | The packs read; the 687 slots named; transfer held against the destination's pack; every packed animation in the Models viewer, with its weapons, its mount, `.cas` models and another mod's side by side; a port appended to a pack and taken back | v2.4.0 |
| 83 | Unit Transfer brings a unit's missing animations into the destination's packs | v2.4.0 |
| 84 | A ported unit kept rebuildable: a loose `.cas` for each animation, its cues, and a `descr_skeleton.txt` block | v2.4.0 |
| 85 | Pack housekeeping: what a mod's packs hold that nothing plays, and a compacted pack with Undo | v2.4.0 |
| 82 | In-game proof: an appended pack loads, the two counts must agree, the first duplicate plays, a loose file does not override the pack | - (answers) |
| 86 | Animations on their own: an edit saved into the pack, another mod's animation in one slot, a skeleton ported alone | v2.4.0 |
| 87 | The real world, whole: Mylae's New Map Editor, 87a-87h | beta 2026-09-26 |

Nothing below Phase 16 gates anything still to be built - the dependency rules
that mattered while V2 was being built are recorded in the archive. What *does*
gate later work is stated where it applies: 17d's markers layer is what 18b (done),
20c (done) and part of 22 build on, and Phase 22 gates the orphan-handling half of 24.

`unittransfer/flatrecord.py` (extracted in Phase 11) is the shared engine for
every file that is a run of `<head> <name>` records with `keyword value` lines -
rebel factions, resources and factions today. Check for it before writing a
parser: Phase 11 needed none at all.

---
## Campaign map reference (living - read before touching a map module)

Phase 16 built the campaign map editor across eleven sessions, 16a to 16k, and
they are all done; the write-ups are in `ROADMAP_ARCHIVE.md`. **This section is
not history.** It is the reference every map module was built on and is still
built on: which of the four tools is the arbiter for what, why this is Pillow
and not C++, the format knowledge that was banked before a line was written,
and which module owns which file. A session changing `campmap.py`, `maptga.py`,
`campaint.py`, `mapcheck.py`, `mapquery.py`, `stratedit.py`, `stratchar.py`,
`stratcamp.py`, `winconds.py` or `cas.py` reads this first.

### The four references, and what each one is for

`Reference/Map/` holds three of them; the fourth is mirrored in this repo at
`refs/upstream/editor/main` and tracked by `dev/reference/upstream_sync.py`.

- **`Reference/Map/Demir.html`** ("StratMap Forge v0.4", 350 KB, one `<script>`)
  - the deepest **validation rule set** in the folder and the only **campaign
  database editor**. Its rules are the most valuable artifact in it. It is also
  the one that lags; the anatomy is below.
- **Mylae's `src/components/map/`** - the **paint tool**: layer picker,
  pencil/bucket/pipette, per-layer colour presets (`paintPresets.jsx`), the
  three-step new-region wizard, and the one performance fix he already found
  (debounced bitmap rebuild, per-layer async `toBlob` encode).
- **`Reference/Map/TWMapReader_source/`** (Java, ~25k lines) - the
  **reverse-engineered engine behaviour** nobody else has: region ID derivation,
  port ownership, the three coordinate systems, adjacency across land bridges
  and river crossings.
- **`Reference/Map/Geomod_Tool_and_Manual/`** plus
  `Reference/TWCenter/Creating a World – Basic mapping from scratch` - the
  **format arbiter**: layer sizes, the full colour tables, the river rules, the
  200-region cap and the crash list.

### Why this is Python and not C++

Measured with Pillow against DaC's real map (`map_regions.tga` 510x487, the
2x+1 layers 1021x975):

| operation | time |
|---|---|
| decode one RLE 32-bit `map_heights.tga` | 13 ms |
| decode all ten layers | 117 ms |
| unique region colours (`Image.getcolors`) | 202 colours, 13 ms |
| region-id label image, exact | 61 ms |
| per-region count, bbox and centroid, one pass | 180 ms |
| sea mask (`ImageChops`, in C) | ~5 ms |
| centre-sample a 2W+1 layer (`Image.transform`, affine) | 3 ms |
| `map_regions.tga` to PNG for the browser | 74 ms, 22 KB |
| worst case: exact per-pixel scan in pure Python | 106 ms |

**Two of those numbers were wrong when this phase was scoped, and 16a corrected
them by measuring.** `Image.quantize` with a fixed palette builds a label image
in 3 ms and is *approximate*: its nearest-colour matching put 1,320 of DaC's
248,370 pixels on the wrong region even with every colour in the image present
in the palette exactly. An index that is 99.5% right is not an index, so the
label image is an exact dictionary pass over the raw bytes at 61 ms. The whole
read of DaC's map, index included, is about 450 ms, once, at load.

`descr_terrain.txt` caps width and height at 510, so the largest layer any mod
can have is about a megapixel. **The reference tool does not lag because the
work is large - it lags because it repeats it.** In `Demir.html`: `paintAt`
(1224) nulls the layer canvas, so the next `render()` allocates a fresh
`<canvas>` and `putImageData`s the *whole* image, and `paintLine` (1723) calls
it per Bresenham pixel, so one 40 px drag is 40 full-image uploads inside a
single input event. The water brush (1235) invalidates the terrain composite,
which then rebuilds over ~820k pixels calling `sampleMapLayer` seven times per
pixel, each call allocating a three-element array and a `join(',')` string for a
Map lookup - about **5.7 M array and 1.6 M string allocations per painted
pixel**. `validate()` (1403) runs after every edit and is O(descr_strat lines x
army objects), 30 to 180 million iterations on a real mod. `commitStratLines`
re-parses the entire file after every edit, eight to ten times to save one
faction detail. Colour keys are template-literal strings allocated per pixel in
three separate builders.

None of that is a language problem. **Decision: Pillow only** - no numpy, no C
extension - which keeps the vanilla-UI, zero-build-step, one-dependency rule,
the small release zip (50-55 MB then, about 22 MB since 98f) and the disk
headroom on `D:`. Speed comes from four
architectural rules instead:

1. **A label image, built once.** Borders, selection masks, thematic recolour,
   hit tests, unknown-colour audits and per-region counts all read a
   `region_id` byte array, never RGB triples. Packed integer keys
   (`r<<16|g<<8|b`), never strings.
2. **Dirty rectangles.** An edit touches at most `brush^2` pixels; only that
   sub-rect is re-encoded and re-sent.
3. **Parse once, splice after.** The line-index-preserving edit model is the one
   thing Demir gets right - it keeps comments, tabs and unknown directives
   intact. Keep it, add a block interval index, never re-parse the world.
4. **Nothing O(pixels) on the interaction path.** Validation, adjacency and
   region IDs run on demand, never per stroke.

### Format knowledge banked before a line is written

Every item below is either measured on DaC or sourced to the arbiter, and each
one is a rule at least one reference tool gets wrong.

- **DaC's `descr_regions.txt` uses a `legion:` line**, making the record ten
  lines, not nine. Mylae's parser hard-codes RGB at offset 4 and its resync
  guard then skips **every DaC region** silently. Demir and TWMapReader both
  handle it.
- **A wasteland short form** exists (three lines, no settlement), and a
  wasteland province must be the **last entry in the file**.
- **The two bare numbers are triumph value then base farming level.** Confirmed
  twice over: the 2026-08-20 sync measured vanilla's 112 regions, and Geomod's
  manual says "Victory ... leave it at 5, other numbers may cause a crash" and
  "Agriculture ... 4 is approximately average, 6-7 highly fertile".
- **Religion percentages must sum to 100** or the game crashes.
- **A tile is sea iff its `map_heights.tga` pixel is not greyscale, or is pure
  black**, not from ground types. River crossings are force-excluded from the
  test. Measured at tile centres on DaC, where the rule is actually applied:
  74,317 tiles come out sea and 74,247 of those are also sea by ground type, so
  the two agree to 99.9%; the 70 that disagree are the underwater-land tiles the
  region-id scan has to skip. (An earlier note here said 165 of DaC's 420 height
  colours are `(0,0,B)` blues. 165 of them are non-greyscale; only 19 are blue,
  and the rest are near-greys like `(65,64,63)` living between the tile centres.)
- **The 2x+1 layers sample the block centre**: tile `(tx,ty)` reads pixel
  `(2*tx+1, 2*ty+1)`. Corner sampling is wrong.
- **Layer sizes**: `map_regions`, `map_features`, `map_trade_routes` at `W x H`;
  `map_roughness` at `2W x 2H`; `map_heights`, `map_fog`, `map_ground_types`,
  `map_climates` at `2W+1 x 2H+1`; `water_surface` nominally 256x256, but DaC
  ships 1021x975, so that one is advisory.
- **Three coordinate systems**: image (y down), game/`descr_strat` (y up,
  `game_y = H - 1 - image_y`), and double-size. Every accessor names which.
- **The TGA descriptor byte matters.** TWMapReader's `Utils.writeTGA` carries a
  field note that M2TW *crashed* on descriptor `0x18` and `0x20`, and that
  `0x08` is what works; every real DaC layer is `0x08` or `0x00`. Demir's writer
  flattens everything to uncompressed 24-bit `0x00`. Ours preserves type, depth,
  origin, any ID field and any 26-byte v2.0 footer, and all ten of DaC's layers
  re-encode **byte for byte identically** through it, RLE included. One trap
  found in 16a: `water_surface.tga` carries a 495-byte v2.0 extension area whose
  position is an *absolute file offset* stored in the footer, so a layer that
  re-encodes to a different length has to have that offset moved or the file is
  quietly broken.
- **200 regions maximum, sea colours included.** DaC has 202 unique colours in
  `map_regions.tga`, two of them the black/white markers - it is on the cap.
- **Rivers**: no diagonal connections, no rejoins, extend two pixels past the
  coastline, white pixel at the source, `0,255,255` for a ford.
- **A settlement or port pixel may not touch another region's pixel**, not even
  at a corner, and must not sit on a river/ford/source/volcano feature pixel
  (back-to-menu crash) or on impassable ground.
- **Port ownership** is decided by the four cardinal neighbours: a direction is
  a "dock" if it is sea and the opposite neighbour is on-map and not sea. Three
  docks picks the middle, two picks the most northerly, one picks itself, zero
  or four is undeterminable.
- **Region IDs** are the order of first appearance scanning row-major over
  `map_regions.tga`, skipping settlement and port pixels, and skipping tiles
  that `map_regions` calls land but `map_heights` calls sea.
- DaC's `map_features.tga` holds one stray `(1,1,1)` pixel - a live test case.

### Module layout

**Not `unittransfer/stratmap.py`.** That name is taken by the
`descr_model_strat.txt` cleaner (1046 lines, a different concern); the earlier
draft of this phase pointed 16a at it by mistake, and 16a corrects the line.

| module | owns |
|---|---|
| `unittransfer/campmap.py` | `descr_terrain.txt`, the ten TGA layers, `descr_regions.txt`, the region index, the coordinate transforms |
| `unittransfer/maptga.py` | TGA read/write preserving type, depth, origin and footer (Pillow decodes; the header is ours) |
| `unittransfer/mapvocab.py` | ground/climate/feature/height colour tables with localised names, in `edbvocab.py`'s shape - **and `RIVER_CODES`**, which `mapcheck`'s river rules and the map screen's river overlay both read (20a) |
| `unittransfer/campstrat.py` | `descr_strat.txt` as a line-preserving block model with an interval index |
| `unittransfer/campaint.py` | strokes, the undo stack, the palettes and the paint save (16e) |
| `unittransfer/mapcheck.py` | the 35 rules, the baseline and the four auto-fixes (16f, 31) |
| `web/js/mapcheck.js` | the validator panel, its filters and jump-to-pixel (16f) |
| `unittransfer/mapquery.py` | the fact table, the 24 filters, the themes, Geomod's information maps and the TGA export (16g) |
| `web/js/mapquery.js` | the query panel, the legends and the recolour of the region layer (16g) |
| `unittransfer/stratedit.py` | the settlement block written back: its fields, its buildings, the move between faction blocks (16h) |
| `web/js/stratedit.js` | the settlement panel, its building rows and the live plan under them (16h) |
| `unittransfer/stratchar.py` | the character block written back: the line, the traits, the army, the family rules, the move between factions (16i) |
| `web/js/stratchar.js` | the people panel, its trait and regiment rows and the family tab (16i) |
| `web/js/campmap.js` | viewer, layers, legend, inspector (16c, 16d) |
| `cmapMask` / `cmapModeKey` | the one pixel pass: the hide set, the river whitelist, the height ramp. Anything that changes what a layer looks like without changing where it is drawn goes here, and the composite's cache key reads `cmapModeKey` (16d, 20a) |
| `campmap.HOTKEYS` | which number key ticks which layer, sent out with the manifest so the panel and the handler cannot drift (20a) |
| `campmap.view` / `layer_png` | the manifest and the PNG the browser is served (16c) |
| `campmap.layer_legend` / `probe_pixel` | what a colour means, and what one tile is (16d) |
| `campmap.render_block` / `plan_region` | one region's record, spliced and saved (16d) |
| `web/js/campaint.js` | the paint tool and its undo |
| `unittransfer/stratcamp.py` | the campaign header, the three rosters, the diplomacy section, a faction's scalars, and creating or deleting a faction entry (16j-1, 16j-2) |
| `web/js/stratcamp.js` | the campaign settings tabs, the diplomacy matrix and the win conditions (16j) |
| `unittransfer/winconds.py` | `descr_win_conditions.txt` as lines plus an index over them (16j-2) |
| `unittransfer/cas.py` | the `.cas` chunk list: meshes, materials, the node table and the skeleton, handed to Phase 15's viewer as a `MeshFile` (16k) |
| `web/js/stratview.js` | the strat-model picker beside the map (16k) |
| `web/js/campmark.js` | the markers layer: everything with a coordinate, drawn and grouped per tile (17d, extended by 18b) |
| `unittransfer/campfiles.py` | the campaign folder's small files: menu text, faction movies, the region's mercenary pool (18a) |
| `unittransfer/campevents.py` | `descr_events.txt` and `descr_disasters.txt`, both spliced, and the positions the marker layer draws (18b) |
| `web/js/campevents.js` | the events and disasters panel, and `＋ from the picked tile` (18b) |
| `campstrat.campaign_paths` / `campaign_rel` | every campaign the mod ships at any depth, and the one conversion from a campaign name to a path under `world/maps/campaign` - every module that builds one goes through it (20b) |
| `campfiles.browse` | D14's payload: each campaign's dates, rosters, contents, which of the folder's files it has and whether it ships map layers of its own (20b) |
| `web/js/campbrowse.js` | the campaign browser, and the pick (20b) |
| `web/js/mapfind.js` | the find box: `cfdSearch` is pure and searches the manifest, not the server (20b) |
| `web/js/mapviews.js` | named view presets: `cvwPlan` reconciles a saved one against this manifest, and is pure (20b) |
| `campaint.map_campaigns` | which copy of each map file every campaign reads - its own when it is in the folder, `world/maps/base` when not. **The engine takes each file separately**, so anything written to the base map has to ask this which campaigns see it (B1) |
| `stratedit.new_block` / `plan_new_settlement` | a new settlement block in the shape its own file writes them, last in the owner's block, guarded like 16h's edits - B1's writer, and the one B2's create is to share |
| `web/js/maplabels.js` | settlement names on the map: `clnLayout` is the pure placement - TWMapReader's candidates, biggest province first, markers as obstacles, a name with no room left off and counted - and `clnDraw` draws the cached layout for the zoom on screen (20c) |
| `web/js/mappin.js` | the pin: `cpinButton` beside any coordinate, `cpinTake` the click that answers it, flipped once into game coordinates (20c) |
| `mapquery.add_music_region` | the one write `descr_sounds_music_types.txt` gets: a name on the end of one `regions` line (B1) |
| `unittransfer/factionaudit.py` | D6: every faction against every file that should name it, one pass a file for all of them (`Census`); gap or note per row, measured on the installed mods; the repair is `factionclone.clone_file` per gap (21) |
| `web/js/facaudit.js` | the "Is it complete?" panel on the faction screen, the picker's gap counts, and the Copy-from repair (21) |
| `unittransfer/rawtext.py` | D11: any text file the toolkit reads, as text - its own encoding and line endings kept (`splice`), a stale save refused, the readers' before-and-after as warnings (21) |
| `web/js/rawtext.js` | the Raw text mode: the list, the box that is never redrawn, the plan under it (21) |
| `unittransfer/stratobj.py` | D9: a fort, a watchtower or a resource, one line, edited, added, deleted or moved; a fort between region sections, a resource between the province headings a file groups them under; where a new one goes read off the file; the rules measured on the 800 forts and 2,813 resources installed (22a, 22b) |
| `unittransfer/mapsnap.py` | D10: the nearest tile a caller's own rule accepts, nearest first, within 40 tiles. The rules stay where they are - `stratobj`, `stratchar` and `mapcheck.marker_faults` each hand theirs over (22b) |
| `web/js/campforts.js` | the forts and resources panel: place with the pin, the province's list, the form, D10's ⌖ Move button, and the drop 17d's drag hands it (22a, 22b) |
| `unittransfer/mapterrain.py` | D7 and T1: `descr_aerial_map_ground_types.txt`, and the map drawn with the mod's own aerial-map textures. `Vocabulary.texture` is the one place the engine's four rules are applied, `plan` the cheap half the validator reads, `composite` the picture, and `_index` an exact colour-to-index pass in Pillow's C (23a) |
| `cmapTerrainOn` / `cmapTerrainDraw` | whether the backdrop is being drawn, and the one blit of it - under the whole stack, at its own several pixels a tile, addressed in tiles like everything else on the screen (23a) |
| `cmapThemeDraw` | 16g's colouring over the terrain and the stack both: the fill, blended for T12's tint or laid on for a solid, and the frontiers, which are never blended. It is on the screen canvas rather than in the composite because that is one pixel a tile and the terrain is not (23b) |
| `Colouring.payload`'s `bands` / `cqGroups` | which group each province is in, `-1` for none, absent for anything that is not a province. What a border is worked out from on both sides; the colour cannot answer it, because a "none" group and no group are painted the same grey (23b) |
| `regiondel.heirs` / `regiondel.campaigns_reading` | who can inherit a province's land, ordered by shared border, and which campaigns a change to this map reaches. The first is `campaint.neighbours` with the record joined on; the second is 22c's ruling as a list (24) |
| `renames.mentions` | every line in the mod naming a thing, split into the scripts (listed, never written) and everything else (counted per file). A rename's scan, shared with the delete (24) |
| `cmapLayerState` / `cmapCampQ` / `cmapGoTile` | the one snapshot of the layer stack, the one place a request appends a campaign, and the one way of arriving at a tile (20b) |

Reuse: `keyblock.py` for the splice discipline (`flatrecord.py` does **not**
fit - `descr_regions.txt` is positional, not `keyword value`);
`IconCache.png_bytes` for the disk-cached never-raises PNG route;
`triggers.split_lines` so a line number means the same thing in every editor;
`v3UvEdDraw` / `v3UvPointers` / `v3UvAt` (`web/js/viewer3d.js:1013-1219`) for
pan, zoom, DPR and the "a press that moved under 4 px is a pick" rule.

**The browser never parses a TGA.** Python decodes, serves PNG and owns the
canonical pixel buffer; the browser paints a local RGBA preview and posts stroke
operations. That is the "one engine" rule, and it is what makes undo, backups
and server-side validation possible at all.

**The browser's own arithmetic is tested in node**, not reimplemented in Python
to be tested there. `tests/test_maplayers.py` loads the real `campmap.js` into a
bare V8 context with a stubbed canvas - the file has no top-level side effects,
so `vm.runInContext` is enough and there is no DOM library - and hands it pixels
the suite wrote and real layers projected through `campmap.tile_view`. 20a's
mask pass is measured that way, and so is 20c's label placement
(`tests/test_maplabels.py`, over every installed map at six zooms).


---

# The schedule - what is left

Set on 2026-09-23 on the user's word ("finish all phases remaining in
roadmap"), with 87 and 88 added on 2026-09-25. A finished row moves up into
the phase index. The schedule as it stood, with how it was ordered and the
notes on 74-76, is in `ROADMAP_ARCHIVE.md` under *The 2026-09-23 schedule*.

On 2026-09-30 the user moved the translations to the end ("skip the languages
phases for now and group them move it to later and do the other stages
first"): 88a-88c are done, and the catalogues themselves (several million
tokens of output) wait until 89-94 are built. On 2026-10-01 the user had them
split one language per phase, 88d-88t, so each can be done and stopped after
on its own.

**Regrouped by major feature on 2026-10-06**, when the work moved to a new
machine on a larger plan (the user: "no need to partition based on 5 hour
basis but rather partition based on major features"). A row below is one
feature, built start to finish in one go. The old letter splits (89a-89d,
90a-90c, 92a-92d, 93a-93b, 94a-94b) stay in each write-up as the **pieces**
of the feature and the order to build them in, not as places to stop; each
piece is still its own commit. The same day the user put the kitbash
workbench first ("the next major feature i want you to implement is a port
of armorystudio3d") and brought back Japanese, Korean, Turkish and
Portuguese. The order is now:

**Grouped into five major phases on 2026-10-06** (the user: "group all the
existing phases into major phases"). A major phase is the unit of work on the
new machine; the numbered phases inside it keep their numbers and write-ups,
and their lettered pieces are commits. Build the majors in this order.

| Major | Phase | Feature | Pieces | Line |
|---|---|---|---|---|
| **0. Six reports** (done 2026-10-14) | **98** | Six reports of 2026-10-13: the Spanish wording, a Ko-fi link, the Strat map 3D panel losing its model, building art that needs a refresh, texture paths that point somewhere else, vanilla files read from the game's packs (and the shipped building art dropped) | 98a-98f | both |
| **I. Models Editor and Armory Studio** (done 2026-10-14) | **95** | The Models Editor rebuilt around Armory Studio 3D: galleries and filters, unit rows, the strat split, a `.mesh` writer, the workbench (assets, objects, viewport, animations, UV packing and bake, normal maps, import), the asset library, the card maker | 95a-95m | both |
| **I b. Armory Studio after its first use** (done 2026-10-15) | **99** | Fifteen requests of 2026-10-15: Pull keeping its place, face orientation as Blender colours it, the card maker's gap, side panels and the top menu that fold, a themed scrollbar, import as a gallery, rename in place, undo and redo, T-pose, a view gizmo, a crop to the UVs exactly, moving the unit in the card maker, the Blender kit's IK rig and pose library, saved sessions with backups | 99a-99o | both |
| **I c. Armory Studio's second round** | **100** | Fourteen pieces of 2026-10-19: transferred weights that tear shields and legs, rig a mesh to chosen bones (transfer overwrites, checked), each faction's own card in the Unit Editor, shift-select and several objects at once, Duplicate and Detail beside the sliders, sliders on the wheel, Loaded assets counting what is used, a full view mode, the import dialog's filters, gallery and closer look, textures from a file on disk, a Textures tab with an outside editor, a UV edit mode, Optimize | 100a-100n | both |
| | 99p | SimpleBake's two ideas for the packer: holes and side pockets filled, free rotation as an opt-in | one | both |
| **II. Campaign map** | 97 | The map viewer, 2D and 3D: editable and selectable in 3D, floating faction names by default, an icons toggle, agents and settlements as 3D models on their tiles | 97a-97d | beta |
| | 96b-96d | Two layout faults (the green box, the bottom gap), ports and the capital by icon with one port per region, the garrison in the settlement editor | 96b, 96c, 96d | beta |
| | 89 | Four reports from users: the resource list open on M2EX, a new resource, a watchtower's line of sight, the real-world map | 89a-89d | a, b both; c, d beta |
| | 96e4 | A new region wizard; many towns at once with auto-garrison | one | beta |
| **III. Factions, units and mod data** | 96a | `can_homeless` on M2EX mods | one | both |
| | 91c | A cloned faction's three campaign files | one | both |
| | 92 | Four things another import tool does that Unit Transfer does not | 92a-92d | both |
| | 94 | A recruitment screen that lags, and its turns | 94a-94b | both |
| | 96e1-3, 96e5-7 | From the Oogway editor: the script builder and add-ons, checking (log, deep check, report), characters (family tree, portraits), units (model swap, voices), art (emblem, banners, recolouring), rules and mods (vanilla values, hard-link mod folders) | six areas | both |
| **IV. Interface** | 90 | A layout that fits the window at every interface size | 90a-90c | both |
| | 93 | Two reports on getting around | 93a-93b | both |
| **V. Translations** | 88 | The remaining catalogues through 88d's workflow: 88e French, 88h Portuguese (Brazil), 88i Polish, 88l Turkish, 88m Russian, 88o Simplified Chinese with the CJK fonts and line breaking, 88p Traditional Chinese, 88q Japanese, 88r Korean | nine catalogues | both |

**Phase 100 put next on 2026-10-19** (the user: "Add all these as immediate
next step to our roadmap"): Armory Studio requests, a weights bug and a
player's Unit Editor suggestion, ahead of 99p and major II.

**Phase 99 put next on 2026-10-15** (the user: "Add these as immediate next
phase"): fifteen requests after the first model out of Armory Studio, ahead
of major II.

**Phase 98 put first on 2026-10-13** (the user: "Add all these into our
roadmap as immediate next phase"): six reports, ahead of major I.

On 2026-10-13 the user first sent 98a to the end with the languages ("move
all languages to the end for now"), then took it back the same day ("i meant
only move the new languages at the end"): **the catalogues already shipped,
German and Spanish, are kept whole as work lands**, every new string
translated in the same commit; only the languages not started yet wait for
major V.

Translations stay last on the user's 2026-09-30 word, so every string the
other majors add is translated once. Interface (IV) comes after the feature
work so the layout pass sees the new screens.

Done so far in 88: 88a-88c (the plumbing, every string externalised, the
termbase), 88d German and the per-language workflow (2026-10-01), 88f
Spanish (2026-10-02). In 88, 88o comes before 88p, 88q and 88r because it
lays the CJK groundwork the other three use; the European ones can go in any
order.

**Still postponed indefinitely:** 88g Italian, 88j Czech, 88k Hungarian, 88n
Ukrainian, and 88t Arabic with 88s, the right-to-left layout, which only
Arabic needs. Their write-ups below stay as the plan for when they come back;
their termbase columns stay, and nothing offers them while they have no
catalogue. The history: all of these plus Portuguese, Polish and Turkish were
postponed on 2026-10-01 ("Postpone italian, portugese, polish, czech,
hungarian, turkish, arabic indefinitely for now"), Polish was brought back the
same day, Ukrainian, Japanese and Korean were postponed after it, and on
2026-10-06 Japanese, Korean, Turkish and Portuguese came back ("bring back
Japanese, Korean, Turkish, Portugese").

Releasing stays on request: each piece is committed to master as it lands.

# Phases 77-86 - animations that travel with a unit, scheduled 2026-09-23

**Asked for by the user on 2026-09-23**: "the main thing I want to do now is to
be able to port animations when transferring units ... without complete
unpacking or repacking if that's possible; if not, packing and unpacking is
fine too. Plan it out and turn it into phases, to do after all the remaining
phases are done". So these go **after 25-27**, unrated, in this order.

**The answer to "without unpacking": yes.** Nothing has to be unpacked or
repacked. A pack is a plain concatenation (verified on 21 195 animations and
730 skeletons), so porting a unit's animations is: read the few entries it
needs straight out of the source's `.dat` by offset, **append** them to the
end of the destination's `.dat`, and rewrite the destination's small `.idx`.
DaC's `pack.dat` is 352 MB and is never rewritten; the append for one soldier
skeleton is a median **1.6 MB** once animations the destination already has
(byte for byte, under any path) are reused. Undo is a truncate back to the
recorded length plus the old `.idx`, so the 352 MB file is never backed up
whole. The engine-rebuild route IWTE uses (loose `.cas` + `descr_skeleton.txt`,
the game regenerates the packs) is kept as Phase 84, a second safety net, not
the main path.

## Where the knowledge comes from

- **The pack format notes**, `Reference/PackFormats/` (untracked, on this
  machine): the container, a packed animation and a packed skeleton, byte by
  byte, with `tools/m2tw_packs.py verify` re-measuring every claim on vanilla
  DE, ROCSS and DaC in 5 s. Called "the format notes" below.
- **Discord with Wilddog and Makanyane** (IWTE's author and tester, June to
  September 2026). The facts that shape this design:
  1. IWTE gets a unit's skeleton **without unpacking**: it reads the modeldb
     for the skeleton name, then reads the skeleton pack and indexes it by
     name. (27/08)
  2. The packs are "a continuous list of unpacked skeletons or animations",
     no compression. (27/08; confirmed byte for byte.)
  3. IWTE writes loose `.cas` files and `descr_skeleton.txt` and **lets the
     engine regenerate** both packs, because of the tables at the end of a
     skeleton that nobody knows how to build. Older tools instead copied an
     existing packed skeleton and replaced its bones and animation list,
     keeping those tables. (27/08, 23/09) Phase 81 does the second thing:
     it moves whole skeletons, tables included, and never builds a table.
  4. **Many mods appended to their packs, so `descr_skeleton.txt` is often out
     of sync with them. The packs are the truth**, not the text file. (09/06,
     23/09)
  5. Duplicates in a pack come from that appending and "are often not
     actually exact duplicates". (23/09; DaC has 916 paths twice, vanilla 3,
     and vanilla lists the `MTW2_Halberd_primary` skeleton twice with
     different data.)
  6. A skeleton's animation list is a fixed sequence, "either a zero or an
     animation reference". (07/06, 23/09; measured: 687 slots, the last is
     `default`.)
  7. Each model has one skeleton, named in the modeldb (which holds one set
     per mount type), **plus weapon skeletons** for the primary and secondary
     weapon. They matter to the
     animation only when the mesh has vertices weighted to the weapon bones,
     but modders copy modeldb entries wholesale, so most entries carry them.
     (07/06, Makanyane; TWCenter thread "Understanding M2TW weapon skeletons
     and animations")
  8. Siege engines are different: a standard `.cas`, a mesh and an XML that
     aligns bones. Not in the packs. (23/09) Transfer already handles them
     (`descr_engine_skeleton.txt`); these phases do not touch them.
  9. A unit's `.cas` mesh has to be parented to its skeleton to be placed;
     buildings have no skeleton. (23/09) Relevant to Phase 80.
  10. Robust modeldb reading: IWTE reads every value into one list first and
      checks afterwards, so missing or extra CR/LF does not matter; a wrong
      count or an extra 0 still throws it. (23/09) An aside for `bmdb.py`, not
      part of these phases.

## Measured before a line is written (2026-09-23)

| fact | number | why it matters |
|---|---|---|
| every modeldb primary/secondary skeleton is in `skeletons.idx` | ROCSS 3 303/3 303, DaC 2 761/2 761 | the pack is the list to check a transfer against |
| **the modeldb weapon lists are skeleton names too** | ROCSS 5 372/5 375 found in `skeletons.idx`, DaC 3 780/3 780 | transfer's missing-skeleton check ignores them today (`ModelEntry.skeletons()` returns only primary/secondary) |
| ROCSS modeldb weapon skeletons not in its own pack | 3 (`MTW2_axe_Primary` ×2, `MTW2_HR_mace_Primary`) | a Health finding waiting to be reported |
| DaC and ROCSS share no animation path string | 0 of 45 784 | paths carry the mod they were built in (`mods/Third_Age_3/...`, `mods/americas/...`), so matching by path finds nothing |
| DaC animations already in ROCSS **byte for byte** under another path | 9 736 of 45 784 slot references (**11 133**, re-measured two ways in Phase 81); 166 of the 215 of DaC's `MTW2_2HSwordsman` | content dedup halves the append |
| DaC skeleton names ROCSS already has, with different data | **134 of 410** | renaming a ported skeleton is the common case, not an edge case |
| animations per soldier skeleton | median 145, max 219 | the unit of work |
| bytes appended per skeleton | median 3.3 MB, 1.6 MB after content dedup; max 5.1 MB | small against 70-352 MB packs |

## The design, in one place

- **One engine module, `unittransfer/animpack.py`**, owns every read and write
  of the four pack files (locked decision: one parser per format). `casanim.py`
  keeps loose `.cas`; `animpack` hands it arrays.
- **The packs are the truth.** `descr_skeleton.txt` is read, reported against
  the packs and kept in step for what we add, but never trusted over them.
- **Whole entries move, byte for byte**, with two exceptions that are
  rewrites of names, not of data: a skeleton's slot paths (when an animation
  path is renamed or deduplicated onto the destination's path) and nothing
  else. The combat tables at the end of a skeleton are carried as opaque
  bytes; the serializer is proven by round-tripping all 730 installed
  skeletons byte for byte before it writes anything.
- **Dedup order for an animation**: same path and same bytes in the
  destination, reuse; same bytes under another path, point the skeleton's
  slot at that path and append nothing; otherwise append, under the source's
  path, or under a namespaced path (`mods/<dest>/data/animations/ported/<source>/...`)
  when the destination has that path with different bytes.
- **Dedup order for a skeleton**: same name and same bytes, reuse; same bytes
  under another name, point the modeldb at that name; otherwise add, renamed
  `<name>_<source tag>` when the name is taken (the modeldb entry's skeleton
  and weapon names follow, through the `model_renames` machinery transfer
  already has).
- **Write order, for a crash midway**: append to `.dat`, write the new `.idx`
  to a temp file and swap it in, then update the `.dat` header's count. A
  crash leaves at worst unindexed bytes at the end of the `.dat`, which undo
  truncates.
- **Undo** records `(file, length before, sha of the header and last 64 KB
  before)` for each `.dat` and a normal backup of each `.idx`. It refuses,
  and says why, if the `.dat` is no longer the file it appended to (the game
  rebuilt it, or another tool wrote it). A new manifest kind next to
  `backed_up`/`created`, so `revert_to` still undoes newest first.
- **Never while the game runs** (the `.dat` is open), and never without the
  free space checked first (`D:` has been full before).

## The phases

**77 to 86 are done**, 2026-09-26 (84's in-game check waits on a mod that can rebuild, and 86's on the user's game); each one's scoping and write-up are in
`ROADMAP_ARCHIVE.md`, 82's six answers with them.

**Not in these phases**: exporting a unit with an animation for Blender (the
user's other Discord goal; 80 builds exactly the posed, animated unit an
exporter would need, and `modelexport.py` would carry it), and Rome/RR packs (a
half-frame layout; nothing here is measured on it).

# Phase 88 - every major language, scheduled 2026-09-25

**Asked for by the user on 2026-09-25**: "add a phase to add support for all
major languages. Make sure the words are correct technical words fitting for
the contexts". Unrated, both lines (it is not map work, and every screen
changes), after 87 in the table.

**What was there.** No internationalisation at all: `index.html` was
`<html lang="en">` and every string a person reads was an English literal in
one of the ~80 modules under `web/js/` or in a message the engine raises. The
crude count of ~380 and ~350 was an order of magnitude short.

**Measured by 88a, 2026-09-27** (`dev/checks/i18n_scan.py`, a lexer and the
rules for what is text): **6,927 runs of text in `web/js/` and `index.html`**
(3,280 in markup, 516 tooltips and placeholders, 3,131 plain literals, about
68,000 words before repeats), and **1,826 engine messages** in 94 of the 116
modules under `unittransfer/`, plus 159 built with `+` or `%`. After repeats
were merged the catalogue holds **8,027 strings, about 60,000 words**: 6,289
for the interface (41,000 words; 91 shared under `common.`, 64 of
index.html's under `app.`) and 1,738 engine messages (19,000 words).

**Two languages, never confused.** The *interface language* is the toolkit's
own buttons, headings and messages, and it is what this phase adds. The *mod's
language* is whatever its `data/text` files hold, and the locked decision
*Localised names first* already shows it: `Town Hall (core_building)` stays the
mod's own string whatever the interface language is. **Choosing an interface
language never changes a byte written to a mod.**

## The languages

English stays the source locale and the fallback. The targets, by BCP 47 tag:

| Group | Languages |
|---|---|
| Western and central European | German `de`, French `fr`, Spanish `es`, Italian `it`, Portuguese (Brazil) `pt-BR`, Polish `pl`, Czech `cs`, Hungarian `hu`, Turkish `tr` |
| Cyrillic | Russian `ru`, Ukrainian `uk` |
| CJK | Chinese (Simplified) `zh-Hans`, Chinese (Traditional) `zh-Hant`, Japanese `ja`, Korean `ko` |
| Right-to-left | Arabic `ar` |

Any language after these is one catalogue file and one termbase column, with
no code change; that is the test that the plumbing is right.

## The correct word, not the literal one

A literal translation is the failure this phase is built against: a mod tool
that calls a *trait* by the word for a personality quirk, or translates the
file keyword `hidden_resource`, is worse than English. So every string is
translated against a **termbase** (`web/i18n/termbase.json`), and each entry
records which of four rules it falls under and where its rendering comes from:

1. **Never translated.** File names, file-format keywords, script commands,
   condition names, attributes, code names, file extensions and product
   names (OpenStreetMap, Overpass, IWTE):
   `descr_strat.txt`, `recruit_pool`, `hidden_resource`, `export_units.txt`,
   `.cas`, `pack.dat`, EDU, EDB, modeldb. They are read exactly as written,
   by the engine or by the person searching for them, so they stay as they
   are, in the monospace style, isolated with `<bdi>` so right-to-left text cannot reorder
   them.
2. **The game's own term.** A concept the player sees in the game (faction,
   settlement, province, general, trait, ancillary, agent, building, unit,
   recruitment, mercenary, climate) takes the word the game's official release
   in that language uses, so the toolkit and the game name one thing the same
   way. The termbase cites the source string for each.
3. **The modding community's term.** A concept with no in-game name (skeleton,
   animation pack, heights map, ground types, bone weights, pivot, mesh,
   texture, UV map, strat model, the campaign map's layers) takes the
   established 3D and modding term in that language, which is often the
   English one kept as a loanword; the termbase says so rather than inventing
   a word nobody searches for.
4. **The platform's standard term.** Generic interface words (Save, Undo,
   Redo, Cancel, Settings, Import, Export, Browse, Preview, Apply) take the
   standard Windows term for that language (the Microsoft terminology
   collection), so a button reads the way it does in every other program on
   the machine.

A term with no source for its rendering is marked *unsourced* and the checker
reports it. Each catalogue carries a review status; a language no native
speaker who mods the game has read is shown as **draft** in the language
picker, never presented as finished.

## Rules the code keeps

- **Display is localised, file values are not.** Numbers, sizes and dates on
  screen go through `Intl.NumberFormat` and `Intl.DateTimeFormat`; a value
  typed into a field that is written to a file is parsed and written in the
  file's own format, ASCII digits and a `.` decimal separator, in every
  locale. A German decimal comma or Arabic-Indic digits never reach a mod.
- **Plurals by CLDR, not by `+ "s"`.** `Intl.PluralRules` picks the form
  (Polish, Russian, Ukrainian and Czech have three or four; Arabic six;
  Chinese, Japanese and Korean one), and the catalogue holds every category
  its locale needs.
- **Named placeholders only** (`{count} tiles in {region}`), never string
  concatenation, because word order changes between languages.
- **Sorting by `Intl.Collator`** in the interface language wherever a list is
  sorted by its shown name; lists sorted by code name keep code order.
- **The engine speaks message IDs.** A message the engine raises keeps its
  English text for the log and the command line, and carries an ID and its
  parameters; the interface shows the catalogue's string for that ID, or the
  English text when there is none. Logs, `server.log` and `transfer_cli.py`
  stay English, so a bug report is readable by whoever fixes it.
- **Vanilla stack.** `web/js/i18n.js` and one JSON catalogue per locale under
  `web/i18n/`, served by the Python server; no npm, no build step, no web
  fonts.

## The pieces

**88a - the plumbing and the pseudo-locales.** `i18n.js` (`t(id, params)`,
plural selection, the formatters, fallback to English per string),
`unittransfer/i18n.py` (message IDs and parameters on the engine's errors),
the interface language in Settings (defaulting to the first supported entry of
`navigator.languages`, else English), and `<html lang dir>` set from it. Two
pseudo-locales for testing: `en-XA` (accented, lengthened by about 35%,
bracketed, so a hard-coded string and a clipped button are both visible) and
`ar-XB` (English mirrored right-to-left). The real string count is measured and
recorded here. Done when: Home and Settings run fully under both
pseudo-locales, and English is unchanged.

*Done 2026-09-27.* The names the code calls are `tt(id, params)`,
`ttA` (inside an attribute) and `ttN(id, n, params)` (a plural): `t` is a
local variable in 294 places across `web/js/`, and a global of that name would
be shadowed in each. The server writes `i18n/catalogue.js` (English, the
chosen locale's catalogue and the offered list), loaded with `i18n.js` before
every other module, so a string is there when a module's first line asks for
it; the interface language is `ui_lang` in Settings, else the first entry of
`Accept-Language` with a catalogue (the server's view of
`navigator.languages`), else English, never a pseudo-locale. Choosing one
saves and reloads. The engine side is `unittransfer/i18n.py`: `msg(id,
template, **params)` is a `str` holding the English, exactly as the f-string
made it (`format(v, spec)`), and remembers its ID; `Handler._json` adds an
`_i18n` map of `{text: [id, params]}` to a reply holding one, and
`i18nFromServer` in `api.get` and `api.post` swaps each for the catalogue's
string in any language but English. index.html's own text is marked
`data-i18n` / `data-i18n-title` and so on, the English kept in the page.
`tests/test_i18n` (34).

**88b - every string externalised.** Every module under `web/js/`,
`index.html` and the engine's user-facing messages moved into `en.json` under
stable, namespaced IDs (`map.paint.brush_size`, not the English text as the
key). A lint suite fails on any prose literal outside the catalogue, with an
allowlist for rule 1's code names. Done when: the lint is clean, and every
screen in English is the same text as before, checked against a snapshot
taken first.

*Done 2026-09-27*, by two codemods rather than by hand, each proved rather
than trusted. `dev/checks/i18n_extract.py` rewrites a module's literals: a
run of text in markup becomes `${tt('id',{name:expr})}` (a quoted literal
holding markup becomes a template literal to take it), a tooltip
`${ttA('id')}`, a plain literal `tt('id')`. Every rewritten literal (5,411)
is evaluated twice in Node, old and new, with its expressions replaced by
markers and the real `i18n.js` loaded on the new catalogue, and must come out
the same string; then `node --check` on every file. A line break and its
indent inside HTML text is stored as one space (it draws as one; `<pre>`,
`<textarea>`, `<style>` and `<script>` are left out). IDs are
`<module>.<first words>`, `common.<words>` for a string three or more modules
share, `app.` for index.html, `eng.<module>.` for the engine.
`dev/checks/i18n_extract_py.py` does the engine's 1,826 messages: the first
argument of a `raise`, the arguments of a call named like a report
(`finding`, `Finding`, `fail`, any `...Error`), an `.append` onto a list
named like one (`notes`, `errors`, `warnings`...), and a report key in a dict
(`error`, `why`...), never `log.*`. The 47 literals that are code shaped like
words (`/icon?...` addresses, `onclick` handler strings, `translate()`,
`hsla()`, a media query) were found in the catalogue and put back as they
were; the rule that caught them is now in the extractor. **The lint is the
extractors' own rules**, so what one moves and the other checks cannot
disagree: `test_i18n` runs both over the tree and finds nothing left. The
before-and-after walk: every module's screen and the Settings dialog read
from a worktree of `2c5d589b` and from the result, text compared line for
line: identical but for two timings. Tests that read a module's words go
through `tests/_webtext.py`, which puts each call's English back (94.5% of
lines come back identical to the old source, the rest folded HTML text).

**Left for 88c** (done, see below), before a word is translated: 714 entries are fragments of a
sentence the code still joins with `+` (`tt('home.reading') + path + '…'`),
130 places make a plural with `+ 's'`, and 159 engine messages are built with
`+` or `%` and are still English only. Each needs its sentence whole, with
named placeholders, and its plural through `ttN`, or no translation of it can
be right.

**88c - whole sentences, then the termbase.** First what 88b left: the 714
fragments joined into sentences with named placeholders, the 130 `+ 's'`
plurals through `ttN` with a form per CLDR category, and the 159 engine
messages built with `+` or `%` given IDs. Then every technical term in `en.json` extracted and
classified under the four rules, with a rendering and its source per target
language. The checker enforces it: an English string containing a termbase
term must contain that term's rendering in each translation, a rule-1 term
must appear untranslated, and placeholders and plural categories must match
the source. Done when: every term has a rendering and a source in every
language, and the checker passes on the pseudo-locales.

*Done 2026-09-29.* **Whole sentences.** `dev/checks/i18n_joins.py` finds three
kinds of site: a `tt()` joined to other text with `+` (641 in `web/js` when it
first ran), an English plural made in code, `n===1?'':'s'` and its kin (226),
and a catalogue string that is half a sentence joined inside a template where
no `+` shows (`' after {delay}s'`, `'Could not read '`: one that opens with a
space and a lower-case word, or stops on a word and a space). With `--py` it
lists the engine's messages built with `+`, `%` or `.format` (159) and those
that make a plural in a parameter, `x='s' if n == 1 else ''` (33). All four
are at zero. A sentence is now one string with named placeholders; a clause
that was dropped in or left empty (`' and the record for {region}'`) is two
strings, one with it and one without, since a translator cannot inflect a
clause apart from its verb; a count is `ttN(id, n)` in the page and
`_i18n.msgN(id, n, one, other)` in the engine, whose `{count}` the page fills
with the right CLDR form. en.json holds **8,074 strings, 324 of them plurals**
(there was one). A site that is not a sentence at all keeps its shape with an
`// i18n-ok: <why>` on the line (14, twelve of them `undo.js`'s stack keys).
`dev/checks/i18n_params.py` holds each call to its string: every `{name}` the
string uses is passed, and every name passed is used, in the page and in the
engine, so a sentence that lost a piece on the way shows as a failure and not
as `{x}` on the screen; the few strings that show braces as text (a tile
address's `{z}/{x}/{y}`, the `{tag}text` form) are listed there by ID.

**What changed on the screen, on purpose.** English is otherwise the text it
was. A count of 1,000 or more now has its thousands separator (`ttN` formats
`{count}` for the screen). The singular now reads right where the code had only
one wording: "1 level", "1 region follows it", "1 guild gets points", "1
faction declares", "1 entry block shares", "1 tile has no texture". 88b had
moved some code into the catalogue as if it were text, and it is code again:
key prefixes (`'minor:' + tab`, a findings box's open state), and attributes
whose values are expressions (` aria-label="${...}"`, `data-vc="..."`); the
scanner now knows both shapes. About 300 strings still hedge with `file(s)`:
they are whole sentences, so each translation writes its language's own
neutral form, and turning them into plurals is left for when a count is at
hand.

**The termbase**, `web/i18n/termbase.json`: **189 terms** (80 of the game's,
43 of the modding community's, 66 of the platform's), each with the English
forms it is matched by and a gloss that says what it means here ("port" is the
verb, "tile" a square of the campaign map), and in each of the 16 languages a
rendering, a stem that every inflected form contains, its source kind (`game`,
`community`, `loan`, `ms`) and a confidence. Rule 1 has no entries: what is
inside a `<code>`, a file name, a `snake_case` name and the `keep` list (EDU,
EDB, IWTE...) are carried verbatim. **The renderings are a language model's
draft from memory, checked against nothing**: 1,835 are marked high, 922
medium, 267 low, and the file is marked draft; a native speaker who mods the
game reviews each language before 88d leans on it. `dev/checks/i18n_termbase.py`
is the checker: a translated catalogue has English's IDs and shapes, its
placeholders (a plural form may leave one out, as English's own forms do, but
uses none English does not), the CLDR categories of its language, the same
HTML tags, every rule-1 token as written, and each rule-2 and rule-3 term's
stem, a rule-4 word checked only where a string is that word alone (a button),
with an `_exempt` list per ID for a sentence worded around a term.
`tests/test_termbase` (27), and `tests/test_i18n` (37) runs the join, fragment
and parameter checks over the tree. `tests/_webtext.py` now puts English back
for a plural (the form chosen when it runs) and for an ID chosen by a ternary.
Full suite: 14 of 167 red, each failing the same way on a worktree of the
commit before (the 13 of 88b, and `modeldb_header`, which reads a mod file
with a hand edit in it).

**88d onward - one language per phase.** Split on 2026-10-01 on the user's
word ("split apart the next phases into different languages so that i can
safely do one at a time and start with one language"). Each phase is one
catalogue, about 8,000 strings and 60,000 English words, and stands alone:
stopping after any of them leaves a working toolkit with one more language in
it, and nothing in a later phase depends on an earlier one's words. The
order puts the one that tests the layout hardest first, and keeps the CJK
groundwork and the right-to-left layout in their own first phases, so a
translation phase is only ever translation.

**How a language is done safely**, set up in 88d and used by every phase
after it:

- **Work in progress is never offered.** Settings offers a locale as soon as
  `web/i18n/<tag>.json` exists (`i18n.available`), and `web/` ships whole,
  so a catalogue is built in `dev/i18n/<tag>.json`, which never ships and
  nothing serves, and moved to `web/i18n/<tag>.json` only when the checker
  passes on it whole. A half
  translated language never reaches a user, and a session that stops in the
  middle leaves nothing broken.
- **Resumable by namespace.** `dev/checks/i18n_todo.py <tag>` lists, for one
  language, the IDs still missing, the ones whose English changed since they
  were translated (`dev/i18n/<tag>.source.json` keeps a hash of the English
  each string was made from, out of the catalogue the page loads whole), and any the English no longer has, grouped by
  namespace (`map.`, `transfer.`, `eng.buildings.`...). A language is written
  a namespace at a time, so a session ends at a namespace boundary and the
  next one starts from the list. The same report is what keeps a finished
  language current after later phases add or reword text.
- **Never the whole catalogue in context.** A batch is the report's slice of
  `en.json` and the termbase's column for that language, and only the new
  strings come back.
- **Draft until reviewed.** Every language lands as `draft` in the picker
  (the termbase it leans on is a model's draft); a native speaker who mods
  the game reading it is what makes it `reviewed`.

**88d - German, and the workflow.** `i18n_todo.py`, the `dev/i18n/` work
catalogue and its promotion step, the source hashes, a style guide per
language (`dev/i18n/de.md`), and the German catalogue. German is
first because it is the longest of the sixteen (often 30% past English), so
it sets the layout: panels, toolbar and tabs wrap or truncate with a
tooltip, never clip. Done when: the checker passes on `de`, `i18n_todo.py de`
lists nothing, every screen is looked at in German at desktop width and
375 px with nothing clipped or overlapping, and a reworded English string
shows as stale in the report.

*Done 2026-10-01.* **The workflow.** `dev/checks/i18n_todo.py <tag>` reports
missing, stale and extra IDs by namespace; `--batch` writes the next strings
with the termbase renderings they use, `--merge` holds each string to the
checker on its own and merges only those that pass (under a lock, so several
batches go in at once), and `--promote` checks the whole catalogue and moves
it from `dev/i18n/` to `web/i18n/`, after which a merge writes there. The
English each string was made from is hashed in `dev/i18n/<tag>.source.json`;
a reworded English string shows as stale (checked). `dev/i18n/de.md` is
German's style guide (Sie, infinitive buttons, „…“, the terms that need
care) and holds the review notes: every `_exempt` taken, with why, and every
coined word. **German**: 8,112 strings, 0 problems, written in nine batches
(148 by hand to set the voice, the rest by helpers held to the guide and the
checker), offered in Settings as *Deutsch (German) - Entwurf*.

**What translating turned up**, fixed on the way: eight sites still made an
English plural in code (`'y':'ies'`, `' is'`/`'s are'`), now `ttN` plurals
that `i18n_joins.py` catches; eight HTML comments 88b had moved into the
catalogue as text are comments again, and both scanners pass over comments;
the checker read `<code>&lt;key&gt;</code>` two ways at once (no translation
could pass) and refused English's explicit `zero` form in other languages;
a stem may list alternatives for a vowel change (`stadt|städt`). The German
termbase column: ancillary is *Gefolge* and turn *Runde* as in the German
game, tier *Ausbaustufe*; shield, gate, ground types, sprite sheet, heights
map, UV map and checkbox now match their whole term, not the bare common
word that also means something else here.

**The layout.** Every module measured for text clipped by a box that hides
overflow, in German at the pane's desktop width and at 375 px: none from the
translation (the cards' clipped names are the mod's own unit names, as in
English). One squeeze at 375 px, the Buildings view toggle, fixed with
`flex:none`; the page never scrolls sideways. The Settings dialog read at
375 px.

**Left for a native speaker**: the review notes in `dev/i18n/de.md`, the
coined words there (*Gegenstück*, *Schmiede*, *Befund*, *Zuruf*...), and the
`{noun}s` strings, which take an English word from the code and are worded
around it. About 40 strings stay English on purpose: the unit file's own
syntax (field orders, keyword values) as the file spells it.

**88e to 88n - the other European and Cyrillic languages, one each:** 88e
French `fr`, 88f Spanish `es`, 88g Italian `it`, 88h Portuguese (Brazil)
`pt-BR`, 88i Polish `pl`, 88j Czech `cs`, 88k Hungarian `hu`, 88l Turkish
`tr`, 88m Russian `ru`, 88n Ukrainian `uk`. **88g, 88j, 88k and 88n are
postponed indefinitely** (2026-10-01; 88h and 88l came back on 2026-10-06,
see the schedule). Each is the catalogue only,
through 88d's workflow. Polish, Czech, Russian and Ukrainian carry three or
four plural forms each, and the checker holds every `ttN` string to them.
Done when, for each: the checker passes, the report is empty, and Home,
Settings, Transfer and the map are walked in it at desktop width.

*88f done 2026-10-02, ahead of 88e on the user's word ("start spanish
next").* **Spanish**: 8,120 strings, 0 problems, offered in Settings as
*Español (Spanish) - borrador*. Spain Spanish as the Spanish release of the
game, *tú* but impersonal where it can be, infinitive buttons, «…».
`dev/i18n/es.md` is the style guide and the review notes. 92 strings by hand
to set the voice, the rest in eight batches by helpers held to the guide and
the checker. The Spanish termbase column narrowed where it collided:
ancillary *séquito*, tier *grado* (level is *nivel*), log *Historial*
(record is *registro*), add *Añadir*, tooltip *descripción emergente*; the
stems of battle model, strat model, mount and view take their plurals and
participles. Every module measured for clipped text at desktop width, and
Home, Transfer, the map, My Changes, the unit editor, Buildings and Settings
at 375 px: nothing clipped but the mod's own unit names, no sideways scroll.

**What translating turned up**, fixed for every language: the trigger
editor's *and*/*or* joiner was read back from its translated label, so a
German user wrote `oder` into the trigger file (the options now carry
`value`); about thirty sites filled a placeholder with English typed in the
code (`' has'`/`'s have'`, `'an'`, `'wider'`, `'summer or winter'`,
`' to '`, `'(nobody)'`...), now whole sentences, plurals or translated
values (42 new IDs, 8,162 in all). **Still English from the server**: the
`noun` in the `eng.minorfiles`, `eng.flatrecord` and `eng.portrecords`
messages, Home's module rows (`_module_rows` in `modfiles.py`), the
`{tail}` clause `mapcheck.py` builds for an unreachable settlement, and the
terrain names in the ground messages; My Changes no longer throws when it is reopened before its first
load lands. German's 8 strings from the 2026-10-01 transfer fixes were
filled.

**88o - Simplified Chinese, and the CJK groundwork.** The `zh-Hans`
catalogue, plus what all four CJK languages share: a font fallback stack of
Windows system fonts per language (Microsoft YaHei, Microsoft JhengHei, Yu
Gothic UI, Malgun Gothic), line breaking set for CJK, and no synthetic
italics or letter spacing on CJK text. Done when: the checker passes, and
every screen renders with no missing-glyph boxes and no line broken inside a
word.

**88p to 88r - the other CJK languages, one each** (88q and 88r were
postponed on 2026-10-01 and brought back on 2026-10-06): 88p Chinese
(Traditional) `zh-Hant`, 88q Japanese `ja` (with `line-break: strict`), 88r
Korean `ko`. Done when, for each: the checker passes, the report is empty,
and the screens show no missing-glyph boxes.

**88s - the right-to-left layout, no translation.** *Postponed indefinitely
with Arabic (2026-10-01).* Done under the `ar-XB`
pseudo-locale (English mirrored), so the layout work is separate from any
Arabic words: `index.html` and the modules moved to CSS logical properties
(`margin-inline-start`, `inset-inline-end`, `text-align: start`), panels and
toolbars mirrored. What must **not** mirror stays left-to-right: the campaign
map, the 3D viewer and every canvas, Code View's raw pane, file paths,
coordinates and code names. Done when: every screen is walked in `ar-XB`, and
on the map a click, the tile pin and a drag land on the same tile as in
English.

**88t - Arabic.** *Postponed indefinitely (2026-10-01).* The `ar` catalogue, with its six plural forms, on 88s's
layout. Done when: the checker passes, the report is empty, and every screen
is walked in Arabic.

# Phase 89 - four reports from users, scheduled 2026-09-26

**Passed on by the user on 2026-09-26**, from users of the toolkit, with "add
these into the roadmap at the end". Two suggestions, one bug report against
beta 2026-09-25, and one report on the real-world map. Unrated. 89a and 89b
are not map work and go on both lines; 89c and 89d are map work and go on the
beta.

## What was reported

1. *A button for creating new resources*, like the one the Religions tab
   already has.
2. *Remove the warning in Minor Files > Resources*: with **Runs on M2EX - no
   engine limits** ticked, a 29th resource (`citrus`) is flagged on line 149
   as "not one of the 28 resources the engine knows - the line is read and then
   ignored", yet in the game it shows and it trades.
3. *A watchtower's line of sight drawn on the map* when one is placed, with a
   switch to show or hide it. Two looks were sent: a filled, see-through disc
   that tints the tiles it covers, and an outline circle only.
4. *The real-world map*, from someone who built a campaign on it: renaming a
   region takes a long time on a map with many provinces; after painting a
   province and setting its capital they could not go back to painting it, and
   did not find how to redraw a province at all; and they still need a way to
   get the correct province names.

## The pieces

**89a - the resource list is open on M2EX (the bug, 2).** Resources are
edit-only today on a stated decision (`minorfiles.py`, `ACTIONS` and
`REFUSED`): "the engine's list is closed", so a 29th name is a line nothing
reads. That was measured on mods that do not run M2EX, and the report shows it
is not true under M2EX. Every place that holds a name against
`KNOWN_RESOURCES` asks `modflags.is_m2ex(mod)` first, the way the faction
limit already does (`factions.py`, `factionclone.py`):

- the `unknown-resource` finding in `minorfiles.py` is not raised on an M2EX
  mod;
- the row's `known` flag, and the "not an engine resource" note it drives in
  `minorfiles.js`, treat every declared name as known;
- the map's resource name box (`stratobj.resource_names`) offers the file's
  own names as it already does, and is checked to not fall back to the 28.

What M2EX's own ceiling is, if it has one, is found out, not assumed: the
finding becomes "resource N of M2EX's M" if there is a number, and nothing if
there is not. On a mod without M2EX the warning stays exactly as it is, since
there it is still true. Done when: a 29th resource on an M2EX mod shows no
finding and no note, the same file with the flag off shows both, and the
suite covers both.

**89b - a new resource (the suggestion, 1).** Built on 89a: `add` joins
`resources` in `ACTIONS` **only on an M2EX mod**. Without the flag the button
is not offered and `REFUSED` says why, as today. The button is the Religions
tab's (`+ New ...` in the list, `mfNew`), and a copy of the open resource
through the existing clone (`mfClone`), since a resource is a model, an icon
and a trade value that are usually taken from one that works. A new resource
brings:

- its record in `descr_sm_resources.txt` (name, trade value, model, icon, the
  mine flag);
- its shown name in `text/strat.txt`, with the missing-key rule the Religions
  tab already follows;
- its icon, copied from a picked `.tga` or from the resource it was cloned
  from, the way a new religion's pip is.

It is then placed on the map with 22b's resource tool, which must offer the
new name. Deleting a resource stays refused on every mod, for the reason
`REFUSED` gives (`descr_regions.txt` places resources by name). Done when: a
resource made in the tab, placed on the map and saved loads in the game on an
M2EX mod, and the tab offers no add on one without it.

*89a and 89b done 2026-09-30, uncut; the in-game check waits on someone with
M2EX.* **M2EX's ceiling, found out:** its release notes say trade goods "are no
longer a hardcoded list", are "fully data-driven from descr_sm_resources.txt",
and "you can add as many new ones as you want". A new one is named by
`SMT_RESOURCE_<NAME>` in `text/strat.txt` and `TMT_<NAME>_TOOLTIP` in
`text/tooltips.txt` (`localised_name` still overrides). With no number given,
nothing is counted: on a mod marked as running on M2EX, the
`unknown-resource` finding is not raised and every row is `known`
(`minorfiles.is_m2ex`). The same file with the flag off gets the vanilla
warning as before, and `REFUSED` now says the flag opens the list.
`actions_for` / `refused_for` replace the fixed `ACTIONS` / `REFUSED` lookups:
on M2EX, resources are `edit` and `add`, and delete stays refused, with its
reason. The map's resource box already offers the file's own names, and falls
back to the 28 only when a mod has no `descr_sm_resources.txt`.

A new resource, from **+ New resource** or **Clone**, brings:

- its record, laid out the way the file is. `flatrecord.new_record` now copies
  a neighbouring record's indent and value column. It had written every new
  rebel faction and resource indented with a space before the value, and no
  real file does that.
- its name as a new key at the end of `strat.txt`. This is the one `strat.txt`
  write the tool makes. It is only a key the file lacks, and it goes after
  every other key, so no entry moves. Every installed mod's compiled
  `strat.txt.strings.bin` and `tooltips.txt.strings.bin` is read by position
  (style 1, 1307 and 382 entries), so the tool can't rebuild it. It is backed
  up and removed instead, and the game builds it again from the text. The
  name, if none is typed, is the resource's own in words (`dried_fish` → "Dried
  Fish"), never its key. A mod with only the compiled file gets a warning and
  no name. An existing resource's name is still the Strings module's.
- its tooltip in `tooltips.txt`, the same way, defaulting to the name.
- its icon, copied from the resource picked in *Icon from* (a clone picks its
  donor) to `data/ui/resources/resource_<name>.tga`. When the donor's icon is
  not a loose file (it is in the packs), the new resource uses the donor's path
  instead, which draws, and nothing is copied. The model is the donor's. There
  is no "pick a .tga from disk": a new religion's pip has none either.

One save, one Undo. `test_minorfiles` 89a/89b (19): the flag off and on, the
refusal, a new resource planned and applied with its icon, both keys and both
caches, the layout, the pack-held icon, and Undo byte for byte. The page was
checked against Third_Age_Reforged with the flag switched on for the check and
off again after (a clone of `amber` plans the icon copy and the file's own
layout). Nothing was written to the mod.

**89c - a watchtower's line of sight (the suggestion, 3).** First the number:
how far a watchtower sees, in tiles, and whether a mod file sets it or the
engine does. It is found in a file or measured in the game, and recorded with
where it came from, never guessed; if it depends on something (the culture's
tower, the owner's traits) that is recorded too. Then the drawing, on the
markers layer 17d built: every watchtower gets its radius, shown as either
look from the report (**filled** tints the covered tiles, **outline** draws
only the circle), picked in the layer's options, with a switch in the layer
list and a number key like the other layers. It is on while a watchtower is
being placed or dragged (22a), so the spot can be chosen by what it covers,
and it follows the drag. Done when: both looks draw at the right size against
a tower measured in the game, the switch hides them, and the radius moves with
a dragged tower.

*89c done 2026-09-30, uncut; one step is left, the in-game measurement.*
**The number: 10 tiles**, the engine's own, the same for every tower. No file
sets it: the installed mods were searched, and `descr_campaign_db.xml` holds
only `spy_watchtower_modifier`, which is a spy's odds, not a range. A tower has
no culture's or owner's figure either. What it covers is the tiles within 10 of
the tower: a disc of 317 tiles, not the 441 of a 21 × 21 square. In game a hill
or a forest can hide part of it, so the drawing shows the furthest a tower
reaches, and its hint says so. **Still to do:** confirm the 10 against a tower
in the game.

Built in `campmark.js` on 17d's markers layer (`cmkSight*`), drawn from
`cmapOverlay` under the markers. **Filled** tints each covered tile (one
rectangle per row of the disc, so 21 per tower). **Outline** draws one circle,
10.5 tiles out from the tower's tile centre. The switch and the look are in the
markers panel under the categories, and both are remembered in Settings
(`map_sight`). The switch starts off. The key is **`w`**, a letter like the
other view switches because the ten digits are the ten image layers. The sight
is drawn whatever the switch says while a watchtower is being placed (under the
pointer, whichever of the create buttons armed the pin) or dragged (where it is
now, not where it was). The hover repaints the whole map while placing, since
the disc is not the one cell a hover redraws. Measured on Divide and Conquer's
295 towers, all drawn: about 2 ms a frame. `tests/test_mapsight` (20, in Node
on the real `campmark.js`).

**89d - the real-world map report (4).** Three problems and one question, each
reproduced on a map with as many provinces as the reporter's before anything
is changed:

- **Renaming a region is slow.** 19b's rename follows the name through
  twenty-four files. Time it on a large real-world campaign, find where the
  time goes (re-reading files per region, re-drawing the map, re-running the
  checks), and fix that. Done when: a rename on that map finishes in a
  measured, stated time, and the numbers before and after are recorded here.
- **Painting stops after the capital is set.** Reproduce the order the report
  gives: paint a province, set its capital, go back to the brush. Find what
  holds the brush (a mode left on, a pin not released, a guard on a province
  that now has a settlement) and fix it. Done when: paint, set capital, paint
  again works in that order on a real-world map, with a test for it.
- **How to redraw a province was not found.** Whatever the painting fix turns out to be, the way
  to repaint a province's tiles is made visible where someone looking for it
  would look: in the region's own panel, not only on the toolbar.
- **The correct province names.** 87e names each province after its city
  (`<City>_Province`, with the campaign's name in front when the key is
  taken). Ask the reporter what "correct" means for their map: real
  administrative regions from the same OpenStreetMap data (boundaries at a
  chosen `admin_level`), historical names, or only an easier way to rename
  many at once. Build that answer, and nothing until it is known.

*89d done 2026-09-30 but for the question, uncut.* No real-world campaign is
installed here, so the first two were measured and reproduced on the two that
are.

- **Renaming a region is slow: the time was not in the provinces.** On a fresh
  load of the mod, the first rename plan took **11.3 s** on DaC and 6.4 s on
  Reforged, and the second 0.4 s. Of the first, 6.2 s was
  `luascan.mod_files`, the one walk of the mod folder that also feeds the
  mentions scan, and 4.7 s of that was a `stat` per entry (49,544 on DaC),
  from `Path.is_dir()`. Every save invalidates the mod, so every rename paid it
  again. The walk is now `os.scandir`, whose entries already know whether they
  are a folder: DaC 5.6 s to 0.5 s, Reforged 3.1 s to 0.4 s, and the same lists
  byte for byte on both. **After:** a rename on a copy of DaC's campaign files
  plans in 1.0 s the first time (0.4 s after) and applies in 0.1 s. The walk
  grows with the mod's files and not with its provinces, so a real-world map
  with more provinces pays about the same. The reporter's own number is still
  to hear.
- **Painting stops after the capital is set: the unsaved painting was thrown
  away.** Reproduced on a scratch copy of Reforged, through the page's own
  calls: a stroke onto Pinnath-Gelin, then Anfalas made its faction's capital
  in the Settlement panel. The save invalidated the mod, and the registry read
  the map again. The paint session belonged to the old map object, so the next
  request dropped it: the stroke was gone, with only a toast
  ("the map was re-read from disk"), and the side panel was left on the
  Province tab. Now `PaintSession.rebase` carries a session onto the map read
  again, and it does so where the map is read (`Registry.campaign_map`), so the
  page's own reload after the save already shows the strokes. The one
  condition is that every layer it holds pixels for is still, on disk, the
  file it read (size and mtime taken when the layer was first painted), so a
  layer saved from Photoshop under it still ends the session, and says so. A
  session with nothing in it no longer reports a reset either. The same run
  after the fix: the stroke survives the save, one Undo away, and the next
  stroke is the second.
- **How to redraw a province was not found:** the region's own panel now has
  **Paint its tiles** beside *Change colour…*. It opens the Paint tab's brush
  with that province as its colour, armed, and says Save is on the Paint tab.
- **The correct province names: asked, not built.** The question for the
  reporter stands as written above: real administrative regions from
  OpenStreetMap at a chosen `admin_level`, historical names, or an easier way
  to rename many at once.

`test_campaint` 89d (5): a re-read keeps the session and its pixels, Undo is
byte for byte, a layer changed on disk still resets, an empty session follows
silently. The walk: `test_eop_and_lua`, `test_cleaner`,
`test_unit_rename_refs`, `test_renames` green.

# Phase 90 - a layout that fits the window at every interface size, scheduled 2026-09-26

**Reported by a user on 2026-09-26**, passed on by the user: "UI scaling seems
to work but the elements are not responsive. Can you make the ui properly
responsive". Unrated, both lines (every screen changes). The screenshot is
Minor Files > Ancillaries on a 1600 px window: the tab strip breaks into
two-line tabs of uneven width with the file path squeezed in after the last
one, **+ New ancillary** and **Port from another mod** are bars the whole width
of the page with their labels pushed to the right, and the page scrolls
sideways.

**Why the size setting and the layout disagree.** Settings' interface size
(`core.js`, `uiScaleApply`) draws the page with CSS `zoom` on the root and
corrects the `vh`/`vw` units by `--uiz`. The `@media (max-width: ...)`
breakpoints in `index.html` (about a dozen, each written for one screen) are
**not** corrected: they measure the window, not the zoomed page. At 125% on a
1280 px window the page lays out in 1024 px of room while every breakpoint
still sees 1280, and at 60% the reverse. So a breakpoint fires at the wrong
size, or never, depending on the setting. This is checked first, in the
browser, before it is treated as the cause.

**90a - measured.** Every screen at the three window widths people use (1280,
1600, 1920) times the interface sizes (60, 80, 100, 125%), plus 375 px at
100%: horizontal page scroll, clipped or overlapping controls, and a tab strip
or toolbar that breaks badly. A list of what fails where, recorded here.

**90b - breakpoints that see the page.** The layout decides on the room the
page actually has. Either container queries (measured in the zoomed page, so
the interface size is taken into account by construction) or one class set on
`<html>` from `innerWidth / zoom`, whichever fixes the most screens with the
least change; chosen in 90a, not in advance. Done when: each existing
breakpoint fires at the same *page* width at 60% and 125%.

**90c - the shared pieces, fixed once.**

- **Tab strips** (Minor Files, the editors' sub-tabs) are one row that
  scrolls sideways inside itself, with the file path on its own line under
  it, rather than wrapping into tabs of different heights.
- **Action buttons** such as *+ New ...* and *Port from another mod* are the
  size of their label, in a row, and not a full-width bar with right-aligned
  text.
- **List and form panes** (the list, the record, Code View beside it) go from
  side by side to stacked at one shared width, not one per screen.
- **No horizontal page scroll** anywhere: anything wide (a table, a path, a
  canvas) scrolls inside its own box.

Done when: 90a's list is walked again at every size and width and nothing
is left on it, with a screenshot of Minor Files at 60% and 125% to show it.

*Done 2026-09-30, uncut.* **90a, measured.** A script in the page opened
each of the 30 screens (the campaign map apart, checked on its own) at 1280,
1600 and 1920 px times 60, 80, 100 and 125%, and at 375 px at 100%. It
recorded how far `#main` or the page scrolls sideways, a record pane squeezed
under 200 px, and a tab strip whose tabs are not all one height. The
cause was checked first, in the browser: at 125% on a 1280 px window the body
lays out in 1024 px while `(max-width:1100px)` does not match. What failed:

- **The Minor Files tab strip, on all 16 screens under it.** Nineteen tabs in
  a row that does not wrap, shrunk into tabs one, two and three lines tall at
  every size, even 60%. Past its minimum width it pushed `#main` sideways:
  at 1280 px by 46-209 px at 80%, 359-519 at 100% and 607-767 at 125%; at
  1600 px by 39-199 at 100% and 351-511 at 125%; at 1920 px by 95-255 at 125%;
  at 375 px by about 1,300. Most of the report is this one strip: with the
  page scrolling, the list column is laid out wider than 280 px, its buttons
  are bars with the label pushed right, and at 375 px the record pane is 0
  to 49 px wide.
- At 1280 px and 125%: two tables wider than their pane (Banners, Agents and
  generals, `.smxtab`, 768 and 795 px).
- At 375 px, besides the strip: the unit editor, Unit Transfer and Buildings
  (the 210 px filter column beside cards 165 px wide, Buildings' faction header
  not wrapping its buttons), Unit Sounds (a six-column grid, 468 px over), My
  changes (a long path in `<code>`, 368 over), Hero abilities (a long `<code>`,
  24 over).

**90b, chosen: container queries.** `body{container:page/inline-size}`, and
all twelve `@media (max-width)` rules became `@container page (max-width)`.
It is one declaration and a search-and-replace, where a class set from
`innerWidth / zoom` would need every rule rewritten and a script kept in step.
A container query measures the body as laid out, zoom included. Proven with a
probe `.edsplit` (breakpoint 1100): at 1280 px it now fires at 125% (page 1024)
and not at 100%, 80% or 60%. At a 1000 px window it fires at 100% and not at
60% (page 1667), where the media query had fired at both.

**90c, the shared pieces.** The tab strip is one row that scrolls in itself
(`overflow-x:auto`, tabs `flex:0 0 auto; white-space:nowrap`), with the open
tab scrolled into view (`mfTabsReveal`), and the file path is a line of its
own under it (`.mfpath`). **+ New ...** and **Port from another mod** sit in a
`.trnewrow`, the size of their labels (Traits, Ancillaries, Guilds, Minor
Files). The list and the record stack at one width, 760 px of page, for every
screen built on `.trwrap`. The unit list's filters go above the cards at 600 px.
Nothing wide moves the page: `.smxtab` and `.sndlist` scroll in their own box,
a long `<code>` breaks where it has to, and Buildings' faction header wraps.
**The walk again: nothing is left** at any of the fifteen combinations, and
the campaign map scrolls at none (it stacks at 375 px, its 1000 px rule now
seeing the page). Screenshots: Ancillaries at 1280 px, 125% (the strip one
row with its scrollbar, the path under it, the two buttons in a row) and 60%
(all nineteen tabs in the row). `tests/test_layout` (14) holds the source to
it.

# Phase 91 - a cloned faction's missing faction button, scheduled 2026-09-26

**Reported by a user on 2026-09-26** against the beta: a faction added with
*Add a faction* (a copy of one they already had) works in the game, "it all
works perfectly and took just 15-20 minutes", **except** that the faction
button on the campaign map's settlement bar (circled in their screenshot, left
of the settlement's name plate) is missing for that faction. The screen it
opens still comes up with the hotkey **O** (`faction_button` in
`descr_shortcuts.txt`), so the button's action is there and only its picture
is not. Factions they added by hand never had this. They sent the tutorial
they used by hand (Imperial forum, "Сичевые Свитки", *adding a new faction to
M2TW from scratch*, two posts, from 2014 and 2007) and asked whether the
toolkit does the same thing. Unrated, both lines.

**The comparison with that tutorial.** Its first post lists fourteen places,
the second walks through them with an example (Aragon):

| the tutorial | what *Add a faction* does |
|---|---|
| `descr_sm_factions.txt`, "the main file" | copied from the donor, re-headed; every value kept, `logo_index` and `small_logo_index` included |
| `descr_character.txt` | joins the donor's lists |
| `export_descr_unit.txt` | joins every `ownership` line the donor is in |
| `export_descr_buildings.txt` | joins every `requires factions { }` the donor is in |
| `text/expanded.txt` (+ `.strings.bin`) | the name and the `EMT_*` keys copied; the `.bin` refreshed |
| `descr_names.txt` | the donor's section copied |
| `descr_banners_new.xml` | a row in every banner the donor has one in |
| `descr_offmap_models.txt` | the donor's block copied |
| `descr_lbc_db.txt` | the donor's paragraph copied |
| `descr_model_strat.txt` | every `texture <donor>, ...` line duplicated |
| `descr_sounds_accents.txt` (second post) | joins the donor's accent |
| `menu/symbols` (`fe_buttons_24`, `fe_buttons_48`, `fe_symbols_80`, `fe_faction_units`) | found by the donor's name and copied under the new one, with `ui/faction_symbols`, captain cards, unit cards and banners |
| `descr_strat.txt` | **not done, on purpose**, and the plan says so: two factions cannot start in one settlement |
| `descr_win_conditions.txt` | **reported, not copied** (`REVIEW_FILES`) |
| `campaign_descriptions.txt` (+ `.strings.bin`) | **not done** |
| delete `map.rwm` | not needed by the clone itself, since it does not change `descr_strat.txt` or the map |

The toolkit also does two the tutorial does not name:
`battle_models.modeldb` (the donor's skins) and `descr_faction_standing.txt`.
**So the method is the same one**, a copy of an existing faction under a new
name, and the gaps are the three files the campaign needs, not the button.

**Where the button's picture comes from.** The tutorial names it: `logo_index`
is the identifier of "the strat icon, the shields", and `small_logo_index` the
small one. The value is a sprite **name** in the interface's sprite sheets
(`strategy.sd` for `logo_index`, `shared.sd` for the small one, under each
culture's `ui/` folder), not a file the clone could copy. If the name is not
in the sheet the engine is reading, the button has no picture and nothing to
click, which is what the screenshot shows. A clone keeps the donor's value,
which is in the donor's sheet, so a plain clone should show the donor's
shield. Something differs for this faction, and 91a finds what.

**91a - the reporter's files.** Ask for the new faction's and the donor's
`descr_sm_factions.txt` blocks, and whether the new faction's `logo_index`,
`small_logo_index` or `culture` was changed after the copy (the Factions
editor offers those as free fields), and whether the mod runs M2EX or another
engine patch. The hypotheses,
in order: a `logo_index` value changed to a name the sheet does not have (the
tutorial's own `FACTION_LOGO_ARAGON` is that kind of name, and the tutorial
never says how to add it to the sheet); a culture changed so the sheet read is
a different culture's; the faction's position in the list against a patched
engine's limit. Done when: the cause is known and written here.

**91a, found 2026-09-27, from the reporter's two sheets.** The user's friend
sent the mod's `data/ui/strategy.sd` and `data/ui/shared.sd` (a Gothic mod,
Khorinis and the clans), saying these were the files that "didn't generate
right" because the new factions' entries were not in them. What they hold:

- **Both sheets are sound.** Version 6, read to the last byte (317 sprites on
  6 pages, 351 on 4); no name twice; all 36 shields and 42 small shields have
  a non-empty hit mask (the button is a shaped one, clickable only where the
  mask is set). Twelve factions were added by hand, on `stratpage_06.tga` and
  `sharedpage_02.tga`, each as `FACTION_LOGO_<NAME>` and
  `SMALL_FACTION_LOGO_<NAME>`.
- **There is one sheet of each for every culture.** The sheet is
  `data/ui/strategy.sd`; only its `.tga` pages are per culture
  (`ui/<culture>/interface/`). So the culture hypothesis is out: a culture
  change moves which pages are drawn from, not which names exist.
- **The value is a name, resolved to a position when the roster loads.** A
  name not in the sheet does not stop the game; sprite 0 is drawn in the
  shield's place (in this sheet `BUILD_BUTTON_IMAGE`, in DaC and Reforged
  some other button too), never the faction's shield.
- **The clone never writes a name that is not in the sheet.** It copies the
  donor's `logo_index` and `small_logo_index` as they are, so a plain clone
  shows the donor's shield. Nothing in the toolkit wrote a logo name at all.

**So the cause is the first hypothesis**: the new factions' records name
shields the sheets do not have, most likely `FACTION_LOGO_<new name>` typed
into the Factions editor's free box after the clone, as the tutorial does,
expecting the entry to exist. The friend's own words fit it exactly. Their
`descr_sm_factions.txt` blocks for the new factions would confirm the value;
91b's check now names it on screen either way.

**91b - the fix, and a check so it cannot happen quietly.** Whatever 91a
finds is fixed where it lives (the clone, the Factions editor or the
documentation). Then the check: `logo_index` and `small_logo_index` are held
against the sprite names in the sheets the faction's culture uses, in *Is
this faction complete* (Phase 21), in the Factions editor (a name not in the
sheet is a finding, and the box offers only names that are), and in Health.
Reading sprite names out of an `.sd` is new: the interface skins are the
unrated row in *Unrated, and the rating is not the reason*, and this needs
only the names, not an editor for them. Done when: a faction whose logo name
is not in its sheet is reported in all three places, and the reporter's
faction shows its button.

**91b, built 2026-09-27, uncut; the in-game check waits on the reporter.**
`unittransfer/spritesheet.py` reads a sheet's pages and sprite names and
writes one thing, `add_alias`: another name for a picture the sheet already
has, appended so every sprite keeps its position (a roster using numbers keeps
its meaning). Every sheet in both installed mods and the reporter's two read
to their last byte.

- **The check**, only where the mod ships the sheet loose (a packed one is no
  evidence): `factions.check_file` reports `logo-not-in-sheet` with the line
  (a name not there, a name that differs only in case, a number past the end).
  That is the Factions editor's finding and Health's, once. The audit (Phase 21)
  has a **Faction shield** row, a gap. Baseline: all 61 factions in DaC and
  Reforged are clean.
- **The editor's box** offers only the shields in the sheet when the mod ships
  it, and a value not in it reads "(not in the sheet - no shield)".
- **The repair**: the audit's Copy from on that row adds the faction's own
  name to the sheet, drawn as the template's shield, and leaves the roster
  alone. One undo takes it back. This is what fixes the reporter's factions.
- **The clone** now gives a new faction shields of its own name,
  `FACTION_LOGO_<NEW>` and `SMALL_FACTION_LOGO_<NEW>`, drawn as the donor's
  until someone paints them, and points its record at them. A name already in
  the sheet is used as it is (someone drew it); packed sheets keep the donor's
  value, as before. A batch lands every row's names in one sheet.
- `tests/test_spritesheet` (44). Painting a new shield into a page, and its
  hit mask, is still the modder's job; the name is now where they expect it.

**91c - the three campaign files the clone leaves to the modder.** With the
tutorial side by side, the plan already names `descr_strat.txt`; it also
names `descr_win_conditions.txt` and `campaign_descriptions.txt` as things
still to do before the faction is playable, with a link to the editors that
write them (the campaign descriptions editor from 18a). Whether the clone
should copy the donor's `descr_win_conditions.txt` block and
`campaign_descriptions` keys outright, like it copies `expanded.txt`, is
decided here: both are per-faction blocks with no settlement in them, so the
reason `descr_strat.txt` is not copied does not apply to them.

*91c done 2026-09-30, uncut.* **Decided: both are copied, and not blindly.**
Measured first on the two installed mods. The premise above is half right:
`descr_win_conditions.txt` has no settlement in it, but it does name places.
`hold_regions` lists the donor's provinces (Reforged's `sicily` holds Anorien,
Umbar and five more), and `outlive` names other factions. So
`clone_win_conditions` copies the donor's block under the new name in every
campaign that has the file (Reforged's imperial and Fellowship, each its own),
with **both `hold_regions` lines left empty**, the form Divide and Conquer
writes for all its factions. `take_regions`, `outlive` and `short_campaign`
are copied as they are. `clone_campaign_descriptions` adds
`{<CAMPAIGN>_<NEW>_TITLE}` and `_DESCR` for every campaign that has the
donor's: the title is the clone's shown name, the description is the donor's
text to start from. The compiled `.strings.bin` is tagged in both mods and is
rebuilt. The plan says what was left:
the provinces to hold, once the faction has a place in `descr_strat.txt`, and
the text to rewrite. `descr_win_conditions.txt` leaves `REVIEW_FILES`.
`descr_strat.txt` stays as it was: not copied, and said so.
`test_factionclone` 91c (17): both cloners on text, the real plan on Reforged,
and an apply on a copy (the compiled title is there, every campaign has the
block, one Undo puts all of it back byte for byte).

# Phase 92 - four things another import tool does that Unit Transfer does not, scheduled 2026-09-28

**Passed on by the user on 2026-09-28**: a friend wrote an import tool of
their own (about 1,500 lines of Python, one window: pick a game, a mod and
the units, Check, Import, Undo) and the user asked what in it is worth having
here. Everything it does, Unit Transfer already does or does better (the dry
run and undo, renames on a clash, relocated assets, sprite sheets, mounts,
projectiles, cards, `strings.bin`, packs read directly, the missing
animations ported by 83), except the four below. Reported on 2026-09-28,
"sounds good" to adding them. Unrated, not map work, both lines. Their code
is not copied: the ideas are.

**92a - an M2EX mod that reads its battle models as text.** The friend's
tool is written for M2EX games that read their battle models from
`data/descr_model_battle.txt` instead of `unit_models/battle_models.modeldb`,
switched on by `model_battle_source text` in `data/descr_caps_ex.txt`. Unit
Transfer only ever writes the `.modeldb`, and the M2EX flag
(`modflags.is_m2ex`) only lifts ceilings and lets effects travel. On such a
mod a transfer writes models the game never reads. Neither installed mod runs
this way, so **measured before a line is written**: a real
`descr_caps_ex.txt` and `descr_model_battle.txt` are asked for (the friend
has them), and what the file holds is recorded here: the keys (`type`,
`scale`, `skeleton`, `skeleton_<mount>`, `skeleton_attachment_primary` and
`_secondary`, `mesh <path>, <distance>`, `texture`, `texture_attachments`,
`torch`), whether a mesh distance is the square root of the `.modeldb`'s
figure, whether the first entry is special, comments and encoding. Then:

- a mod is known to read text models from its `descr_caps_ex.txt`, not from
  the M2EX tick alone, and says so on its Home card;
- a reader and writer for the text file beside `modeldb.py`, answering the
  same questions a `ModelEntry` does (names, skeletons, files, texture
  records), so transfer, the 79 skeleton check and the Models viewer read
  either;
- transfer, as source or destination, reads and writes whichever file the mod
  reads, and a transfer between one of each converts the entry;
- Health warns when a mod reads text models and has a `.modeldb` that has
  moved on since (or the other way round), since one of the two is dead.

Done when: a unit transferred into a text-model M2EX mod loads in the game
with its own model, one taken out of such a mod lands in a `.modeldb` mod,
and the suite covers both directions against the sample files.

*92a done 2026-09-30, uncut; not yet loaded in game.* **Measured** on the
M2EX install the user pointed to (`EUREXV1/M2EX`): the base game's
`data/descr_caps_ex.txt` says `model_battle_source text` ("modeldb ... default
for mods"; each of its four campaigns has its own caps file), and its
`descr_model_battle.txt` is 701 models, 11,250 CRLF lines, "generated from
battle_models.modelDB". The M2EX build of EUR installed in the mods folder
still reads its `.modeldb` (no caps file). What the file holds, per model:
`type`, `scale` (7 of 701; 1 when absent), `skeleton <pri>, <sec>` with a
`skeleton_attachment_primary` / `_secondary` line per weapon skeleton, the same
as `skeleton_horse`, `_camel`, `_elephant` for the other mount types,
`mesh <path>, <distance>`, `texture <faction>, <diff>, <norm>, <sprite>`,
`texture_attachments <faction>, <diff>, <norm>`, `torch <bone>, <6 offsets>`
(677 of 701). **A distance is the square root of the `.modeldb`'s**: Tsardoms
holds 953 of its 1,015 as perfect squares (6400, 121, 900) and the text's are
80, 11, 30; a non-square (1200) is rounded, the one thing a trip through text
changes. The first skeleton block is written `skeleton` whatever its mount
type, so going back to a `.modeldb` its type comes from the units that wear the
model (`horse` for a mounted unit, else `none`). No first entry is special.

Built: `unittransfer/modeltext.py` reads the file, writes an entry as text and
as a `.modeldb` entry, and `Mod.text_models` (the mod's own caps file) makes
`Mod.modeldb` read the text, so transfer, the 79 skeleton check and the Models
viewer read either. Transfer writes whichever file the destination reads,
appending in its own line endings, and a transfer between one of each converts
the entry. The Home card says **Battle models from descr_model_battle.txt**,
and Health's **Battle models: which file the game reads** warns when the file
the game does not read was changed after the one it does. Found on the way:
Reforged's `.modeldb` holds a weapon skeleton name with a newline inside its
length-prefixed string, which a line of text cannot, so every value is
stripped as it is written. **Not covered:** the Models editor's own saves still
write the `.modeldb`, and on a text-model mod they should be refused or moved
to the text; that is left for when such a mod is installed here.
`tests/test_modeltext` (23): all 701 models round trip both ways, the caps
switch, the Health rule, and a transfer in each direction (Tsardoms into a
text copy of Reforged, then out of it into a copy of Tsardoms), with Undo.

**92b - recruitment set up by the transfer.** Today a transferred unit is
recruitable nowhere until someone adds it in the Recruitment tab. The
friend's tool does it in the same step, behind a tick (*Let the faction
recruit them*), and so should this, through the Recruitment tab's own writer
(`buildings.py`, the plan and apply road), never a second one:

- **a renamed copy of a unit the destination already has** (the collision
  rename) gets a copy of every `recruit_pool` line the original has there
  that the destination faction can use, its `factions { }` narrowed to the
  destination faction;
- **a new unit** goes into the building and level that recruited it in the
  source mod, for the source faction, when the destination has a building
  and level of that name; the plan lists each one;
- anything left over is "not recruitable" in the report, with a link to the
  unit's Recruitment tab, as today.

Done when: the plan shows every pool it will add, the unit trains there in
the game, one Undo takes the pools back with the transfer, and the suite
covers both kinds and the leftover.

*92b done 2026-09-30, uncut; not seen in game.* A **Recruitment** box on the
transfer page, *Let the faction recruit them* (`set_recruitment`, off by
default). `transfer._plan_recruitment` works on the final block's owners:

- **a renamed copy** (the unit type is the destination's own, written under a
  new one) gets a copy of each of the original's pools in the destination
  whose `factions { }` names an owner, the list held to those owners
  (`_narrow_factions`);
- **a new unit** gets each pool that recruits it in the source, in the
  destination's line and level of the same name, its factions list held to the
  owners (or made of them when the source's names none of them), and a clause
  with no list is given one.

The pools go through `buildings.plan_edit`, the Recruitment tab's own writer,
and the EDB text it plans is written in the transfer's job, so one Undo takes
both back. The box lists each pool (line, level, clause), and a unit left with
none says **NOT RECRUITABLE** and why. Not in replace or models-only mode.
`tests/test_transfer_recruit` (13): the narrowing rule, Reforged's Gondor
Spearmen as a renamed copy (6 pools, applied, 6 places in the EDB, one Undo
byte for byte), the same unit as a new one into a copy without it (6 pools),
and a Tsardoms unit whose levels Reforged has none of (not recruitable).
**Phase 92 is done**: a, b, c and d.

**92c - one faction's look only.** Transfer copies every texture the model
names, so a DaC unit with a dozen faction skins brings a dozen sets of
`.texture` files for a faction that wears one. The friend's tool copies only
the source faction's and writes it as the destination faction's and as
`default`. Here it is an option on the transfer (*Copy only the skins the
new owners wear*), off by default: the copied entry keeps the texture
records for the factions in its final ownership and `default` (and `slave`
where the unit is a rebel or mercenary), the rest are dropped from the entry
and their files are not copied. That needs a writer that removes a texture
record and lowers the group's count, the opposite of
`modeldb.add_texture_factions`. The plan states the saving in files and MB.
Done when: a DaC unit taken with the option on shows the right skin in the
game for its owner, the copy is measurably smaller, and the entry's counts
agree with its records (the suite reads the result back).

*92c done 2026-09-30, uncut; not seen in game.* The writer already existed:
`modeldb.set_texture_factions` (the model card's faction checklist) keeps
exactly a list of factions in each texture group, clones a record for one it
lacks and rewrites each count. The option is `own_skins_only` (off by default,
a **Skins** box on the transfer page). `transfer._plan_own_skins` gives each
copied entry its final block's owners (`all` left out, `slave` added for a
mercenary or a rebel's unit, `default` kept where an entry has one). It drops
from the copy list the files only the left-out records named, a sprite's
sheets with it, and says how many records, files and MB. Measured on Tsardoms'
*Hungarian Peasants* (32 skins) into a copy of Reforged: 6 owners kept, 104
records across its entries left out, but only 2 files, 0.1 MB, saved, because
Tsardoms points most factions' records at shared textures. A mod with a file
per faction saves far more. `tests/test_transfer_skins` (6): off by default,
the owners only, the saving, and the applied `.modeldb` reading back with
counts that agree and every kept texture copied. **The suites that copy DaC's
files cannot run** until the hand edit in the M2EX EUR's `.modeldb` is fixed
(see Phase 94's note).

**92d - a banner the destination does not have.** A unit whose `banner
faction` names a banner missing from the destination's
`descr_banners_new.xml` (a Hospitaller or Templar banner, say) is copied as
it is today, and Health finds it afterwards. The transfer does it first:
the plan names the banner and offers to port it with 65's banner writer
(`banners.py`) or to swap it for `main_cavalry` or `main_infantry` by the
unit's category, which is what the friend's tool always does. `banner holy`
and `banner unit` get the same treatment. Done when: neither choice leaves a
Health finding on the destination, and the suite covers both.

*92d done 2026-09-30, uncut; not seen in game.* Measured first: between the
two installed mods only one unit carries a banner the other has not got,
Reforged's *Bomb Platforms* (`banner faction main_none`), and Reforged does
not declare `main_none` either. The transfer plan now reads the final block's
`banner` lines against the destination's `descr_banners_new.xml`
(`transfer._plan_banners`), and the transfer page shows a **Banners ... has
not got** box with the choice (`options.banner_mode`):

- **Bring the banner across** (the default): `banners.port_banner` puts the
  source's `<Banner>` at the end of the destination's list of that kind. Its
  rows are cut to the destination's factions, and each faction that will own
  the unit and has no row gets one, copied from the banner's first row. So the
  destination's own check has nothing to say about it: the coverage rule is a
  row for every owner. The loose files it names that the source ships are
  copied with the unit. A banner the source does not declare either (the one
  real case) falls back to the swap, and says why.
- **Use main_cavalry or main_infantry instead** (`banners.swap_for`): a
  faction banner becomes one of those by the unit's category, a holy banner
  becomes `crusade`, and a unit banner's line goes, so the unit carries its
  faction's banner.

Written in the same job as the unit, one Undo. `tests/test_transfer_banners`
(16): the port on text (the list, the rows, the files, no finding afterwards),
the swaps, and the real plan in both modes. **92a is not started**: it waits
on the friend's `descr_caps_ex.txt` and `descr_model_battle.txt`, as written.

**Left out, and why.** Two smaller things in the friend's tool are recorded
so they are not rediscovered: when a skeleton cannot be ported and there is
no base unit to borrow from, it guesses one by trimming words off the name
(`MTW2_Spear_new` to `MTW2_Spear`), and it swaps a missing effect for a close
one (`bolt_impact_ground_set` to `arrow_impact_ground_set`) where this tool
uses the invisible placeholder. Either can be a last fallback here later.
Writing into the base game's own `data` folder, which it also does, is not
taken: the mods folder is there so that is never needed.

# Phase 93 - two reports on getting around, scheduled 2026-09-29

**Reported by the user on 2026-09-29**, with a screenshot of each. Unrated, not
map work, both lines.

**93a - Restart now to apply it comes back without its console.** Settings →
Launcher, *Keep the console window open* ticked, *Restart now to apply it*:
the tool comes back on the same address, but no console window stays open. The
restart road is `restartServer()` (`web/js/transfer.js`) posting
`/api/restart` with `console: true`, `_restart_into` (`unittransfer/server.py`)
and `startup.spawn_server(..., console=True)`. The likely cause, to be
confirmed before it is fixed: a server started by the normal launch is the
detached child, and that child runs on `pythonw.exe` (`startup._pythonw`). So
in the server doing the restart `sys.executable` is already `pythonw.exe`, and
`spawn_server`'s `exe = sys.executable` for the console case hands a new
console to the windowless interpreter, which never shows one or writes
nothing to it. The fix picks the console interpreter (`python.exe` beside
`pythonw.exe`) explicitly, and falls back to the setting being applied at the
next launch, said so in the modal, when there is none. Worth checking on the
way: the replacement's log still reaches the new console (`logutil`'s
`StreamHandler` is bound to `sys.stdout` at setup), and unticking the box and
restarting closes it again. Done when: from a normal launch with the box
ticked, a restart leaves a console showing every request, one without the box
leaves none, and the suite covers the interpreter choice for both starting
points (`python.exe` and `pythonw.exe`).

**93b - a middle click opens the screen in a new tab.** The Home card's
buttons (Unit Editor, Unit Transfer, Buildings, Campaign Map, Models Editor,
Unit Sounds, Minor Files, Raw text, Health, My changes) are `<button
onclick="homeGo(...)">`, so a middle click does nothing and a right click has
no *Open in new tab*. The route already exists: `navUrl(r, mod)` in
`web/js/core.js` builds `/?mod=&go=<mode>`, and the startup code reads it back
for that tab only, without changing the remembered mod. So each of those
buttons becomes a real link to its `navUrl`, looking exactly as it does now,
whose plain left click still runs `homeGo` in place (default prevented) and
whose middle click, Ctrl+click and context menu are the browser's own. The
same treatment for the other places that switch screen by name where it is
cheap: the mode bar at the top and the trail's crumbs. Done when: a middle
click on each Home button opens that screen for that mod in a new tab, the
first tab stays where it was, a left click behaves as before, and a
keyboard user reaches and presses each one as before.

*Phase 93 done 2026-09-30, uncut.* **93a, confirmed by reading and fixed:**
`spawn_server` ran a console restart on `sys.executable`, and in a server from
the normal launch that is `pythonw.exe` (started by `_pythonw`), so the new
console had nothing writing to it. `startup._python_console` now picks
`python.exe` beside `pythonw.exe`. When there is none, the server does not
restart (it would come back exactly as it is) and says `console_later`, and the
page says the console comes at the next launch. `test_startup` covers both
starting points: from `pythonw.exe` the command is `python.exe`, and a
`pythonw.exe` with no `python.exe` beside it has no console interpreter
(76/76). **Not checked here:** a restart from a normal `.bat` launch leaving a
console on screen, which needs the user's launch.

**93b.** The Home card's ten screen buttons, the "Last time you were in"
button and the side menu's items are links to their `navUrl` (the Home ones
carry their card's mod), styled as they were (`a.btn`, `a.navitem`). A plain
left click still runs `homeGo` / `setAppMode` in place with the default
prevented. A middle click, Ctrl+click and the context menu's *Open in new tab*
are the browser's own, and Space presses them as it pressed the buttons
(`navPlain`, `navLinkKey` in `core.js`). The menu's links are re-pointed at
the mod on show each time it opens. The trail's crumbs were links already.
Checked in the page: 30 Home links (`/?mod=Tsardoms-3.0&go=sounds`...), a
plain click on one switched mod and screen in the same page with no load, and
`/?mod=Third_Age_Reforged&go=buildings` opened in a second tab lands on
Reforged's Buildings.

# Phase 94 - a recruitment screen that lags, and its turns, scheduled 2026-09-29

**Passed on by the user on 2026-09-29**, from a user on Tsardoms 3.0, with three
screenshots. One performance report and one suggestion. Unrated, not map work,
both lines.

## What was reported

1. *The Buildings editor is laggy on a level's recruit pools.* A ▲▼ on a pool's
   numbers "takes a while to register" and the next click cannot follow
   straight away; Chrome then shows *These pages aren't responding* for the
   Buildings tab and two Unit Editor tabs, and they have to press **Wait**. The
   level in the screenshots is Tsardoms' Barracks, where the recruitment-limit
   banner counts 40 to 50 pools per faction for 19 to 24 factions. A build
   from the week before is just as slow, and clearing the cache did not help.
2. *The turns beside a replenish rate on the Unit Editor's Recruitment tab.*
   The Buildings editor already prints "= 8.9 turns" beside the rate, but the
   Unit Editor's table of every pool the unit has (Kruje Castle, Barracks 4/5,
   Armoury 5/5...) shows only 0.112, 0.084, 0.125. "I have difficulties
   remembering how many turns 0.084 for example is."

## The pieces

**94a - measure the lag, then remove it.** Not reproduced yet: Tsardoms is
not installed here, so the first step is either the user's mod or the
largest EDB on this machine with a level padded to Tsardoms' size, and a
profile of one ▲ click. The hang takes the Unit Editor tabs down with it
because Chrome runs same-origin tabs in one renderer, so every open tab of the
toolkit freezes while one is busy; that is a symptom, not a second bug. The
suspects, read from the code but not timed, all run on every click and all
cost the size of the whole building, not of the one box:

- `undoTick` (`web/js/undo.js`) fires twice per ▲, once on the button's click
  and once on the `input` it dispatches, and each `undoCapture` does a
  `JSON.stringify` of the whole scope.
- `paintDirty` runs from both `undoTick` and `bldDirtyNote`, and its
  `bldDirty()` (`web/js/buildings.js`) stringifies all of `b.work` to compare
  it with `b.orig`.
- `bldDirtyNote` also calls `bldLevelDirty`, which does `JSON.parse(b.orig)`
  of the whole building and two more stringifies, for one level's chip.
- `bldCvFollow` hands the change to `cvFromGui`, which is debounced but then
  reserializes the whole `building ... { ... }` block into the text pane.

The fix follows the profile, not this list: likely a cached parse of
`b.orig`, one dirty check per event instead of three, and the undo snapshot
and the text pane pushed off the click's own frame. The recruitment-limit
banner (`bldRecruitPressure`) is worth timing too, if anything redraws it.
Done when: on a level of Tsardoms' size a ▲ updates its box and the "= N turns"
beside it within a frame, ten fast clicks land as ten steps, no tab reports
not responding, and undo still steps back one click at a time.

**94b - the turns in the Unit Editor's pool table.** `edRecRowHtml` and
`edRecAddRowHtml` (`web/js/edrecruit.js`) pass the `per_turn` box to `numBox`
with no readout, while the Buildings editor and the tab's own "numbers each
new pool gets" block pass `<span class="turns">= ...</span>`. Pass the same
readout on both row kinds; `wireNumBoxes` already keeps any `.turns` beside a
box in step with what is typed. It has to fit the row without pushing the
delete button off at the narrow widths Phase 90 set. On the way: `poolTurns`
(`web/js/buildings.js`) still builds "N turns" and "never" in English, which
Phase 88c's plurals by count should cover. Done when: every pool row on the
Recruitment tab, existing and new, shows "= N turns" beside its rate, it
follows ▲▼ and typing, and it reads correctly in every shipped language.

*Phase 94 done 2026-09-30, uncut.* **94a, measured on Tsardoms 3.0 itself**
(installed by the user for this). Its `militia_barracks` level holds **1,131
recruit pools**; the largest in DaC is 343 (`militia_drill_square`) and in
Reforged 166 (`barracks_2`). So the lag is general and Tsardoms is where it
shows: every cost below grows with the level. The building's working copy is 5
MB as JSON and the dialog 265,454 elements. Ten fast ▲ clicks took **4.2 s**,
each a long task of 300-440 ms, of which the click itself was about 50 ms.
Where the rest went, found by timing every timer callback, not by reading the
list above:

- **240-290 ms: the page-wide resize observer** (`rszInit` in `core.js`). It
  takes any added node for "a box may have appeared", and the "= N turns" text
  swapped on every click is an added text node, so each click re-queried the
  whole page. Now only an added element counts. This was none of the four
  suspects.
- **about 100 ms: the dirty checks.** `bldDirty` stringified the whole building
  twice per click, and `bldLevelDirty` parsed the 5 MB original on every call,
  once per level on opening. The original is now parsed once per `b.orig`
  (each level's string kept), and `paintDirty` and the level chip follow a
  burst, 120 ms after its last edit.
- **74-100 ms of layout** on a value change: pool rows off screen now skip it
  (`content-visibility:auto` on `#bldBody [data-cap]`).

**After:** ten fast clicks in **189 ms**, 12-40 ms each, the "= N turns"
beside the box following each, ten undo steps, and Undo stepping back one click
at a time (0.5, 0.333, 0.25, 0.2). **Left:** an undo on that level redraws all
1,131 rows, about 2 s, and opening the level still takes about 2 s. Both are
one-off and not per click.

**94b.** Every pool row on the Unit Editor's Recruitment tab, existing and new,
shows "= N turns" under its rate box (under, so the column keeps its 90 px and
the delete button its place), following ▲▼ and typing. `poolTurns` takes "never"
and a plural "N turns" (`buildings.turns_count`) from the catalogue. Checked on
Reforged's Arnor Militia: six rows, "= 5 turns" going to "= 4 turns" on a ▲.
`tests/test_bigbuilding` (9); `test_unit_recruitment` green. `test_buildings`
cannot run for now: the M2EX EUR the user installed has a hand edit in its
`battle_models.modeldb` (a stray `v` after a `0` in entry #88,
`cardolan_sharpshooters`), which the modeldb reader refuses.

# Phase 95 - the Models Editor rebuilt around Armory Studio 3D, scheduled 2026-10-06

**Asked for by the user on 2026-10-06**: "the next major feature i want you to
implement is a port of the armorystudio3d ... It will be a tool that will be
used for automatic kitbashing. His version seems to be quiet bloated so make
sure to optimize it when importing it." First in the schedule.

**The source.** [muhamadridhomm/armorystudio3d](https://github.com/muhamadridhomm/armorystudio3d),
MIT licence, no releases, cloned on 2026-10-06 into `Reference/armorystudio3d/`
(untracked, its `.git` removed). A browser kitbash workbench with a Python
`http.server` backend: 4,294 lines of `index.html`, a 2,471-line
`ArmoryStudioEngine.js` on vendored three.js, `server.py` (1,130), a mesh
compiler, a texture compositor and a parts-manifest builder. It is 351 MB, and
**346 MB of that is data**: 140 MB of PNG textures, 54 MB of sample exports,
6 MB of geometry JSON, 6 MB of emblems. **Its backend imports this toolkit**:
`armory_mesh_compiler.py` puts `Medieval2-GUI-Toolkit-2.1.8` on `sys.path` and
reads every source model with `unittransfer.mesh`, so the port is largely
coming home. Code may be ported with credit under MIT; **the bundled art may
not**. The textures and the sliced parts are other mods' work (SSHIM Expanded
with Sandy's units, the GoT mod, Marka's barding), so the port ships no art
and builds its parts list out of the mods the user has installed.

## What it does, checked against the code

| Area | What it claims | What the code does |
|---|---|---|
| Assembler | 8 slots (torso, helmet, arms, legs, hands, cape, primary, shield), plus face, hair, beard, belt and coif | Picks one group per slot out of any source `.mesh` and draws them on one figure. Real. |
| Variants | several choices per slot, with weights | The first choice is written with group flag 0 and the rest flag 1. **The weights are never written**, because the format has none: the game picks among flag-1 groups itself. |
| Micro-nudge | XYZ move, yaw/pitch/roll, scale per slot | **Move and uniform scale only** reach the exported mesh, about the part's own centroid. Rotation is preview-only. |
| Squad mode | a single figure, or a three-rank block | Preview only. |
| Cavalry | four mounts, saddle offset, caparison matching the rider's livery | Preview only: the export writes the rider and a `mount` line, never a horse model. |
| Animation | 24-bone rig, 6 poses, idle and canter loops | **Procedural** poses in three.js, not the game's `.cas` animations. |
| Library | a searchable parts catalogue, a scanner that slices a mod's `.mesh` into parts | The scanner lists a model's groups and adds the chosen ones to `parts_manifest.json`, by source file and group index. |
| Texture | dyes per part, "metal protection", a pattern detector, a coat of arms stamped on | Pillow plus numpy. A dye is a multiply over each part's UV triangles, skipping low-chroma pixels so metal keeps its colour. The arms are pasted at a UV spot with a blend mode. A normal map is made out of the diffuse. |
| Export | `.mesh` LOD0 to LOD3, DXT5 `.texture` with mips, modeldb and EDU snippets | **LOD0 only.** It writes the mesh by copying a 47-byte header and the bone table tail out of one template model (`northern_general_lod0.mesh.orig_bak`) and splicing the parts' vertex streams between them, then checks the result with `unittransfer.mesh.read_mesh`. The textures are a pure-Python DXT5. The modeldb entry is printed with counted strings, and its animation block names `fs_test_shield` for every role. |

**Where it breaks**: every path is the author's Linux machine
(`/media/muhamadridhomm/...`), with environment variables as the only way
round them. The compiler assumes every source model has exactly the streams
and strides of its template (0, 1, 2, 3, 4, 10 and 11) and copies bone indices
unchanged, so a part from a model with another bone table comes out wrongly
skinned. The hand-built boost class bookkeeping is right only for the stream
order it writes. The texture catalogue is a hard-coded dictionary of the
author's own files.

## What the port keeps, and what it drops

**Kept**, as behaviour, on this toolkit's own code:

- parts out of any installed mod's battle models: model, group and texture,
  indexed like the model browser and never copied into the toolkit;
- slots with variants written as flag 0 and flag 1, said plainly as "the game
  picks one", with no weights the game would never read;
- move and scale per slot, applied to the exported vertices;
- dyes that leave metal alone, and a coat of arms stamped on;
- a written `.mesh`, the two `.texture` sheets, and the modeldb entry and EDU
  `soldier` line handed to this toolkit's own writers rather than to snippets
  the user pastes.

**Dropped**: three.js (`viewer3d.js` is plain WebGL and stays that way), the
procedural rig (`v3anim.js` already plays a unit's real `.cas` animations on
its real skeleton), numpy (the locked decision is Pillow only), the bundled
art and sample exports, the hard-coded catalogues, the install readme, and
the second server. The squad and cavalry previews, the pose presets and the
generated normal map were on this list until the user's checklist answers
brought them back (below).

## The user's spec, 2026-10-06

The user widened the phase the same day, after running the tool: "port over
the armory tool under a new menu inside our models editor. I want it to be
optimized and fit to fit our current tool in the models editor", and "If the
existing armory tool does exactly what i say then you can enhance and
optimize it". The spec covers the whole Models Editor, not only the
workbench, and it is written down below piece by piece in the user's order.
**The user's own words win over anything in this write-up**; where a piece
says "measured" or "found", that is this session's reading of the code.

**What the tool does better than the spec** went to the user as a checklist
on 2026-10-06, with a Port / Later / Skip choice and a note per item:
<https://claude.ai/artifact/Vj4KWogKza8pcVBRFtXhNj>. The answers are in that
artifact's database, collection `answers`, one document per item
(`verdict`, `note`, `title`), readable with the `ArtifactData` tool
(`action: "list"`, `collection: "answers"`).

**The answers, read 2026-10-06: Port on 16 of the 17**, and each is now a
requirement of the piece it sits in:

| Item | Piece |
|---|---|
| Material channels inside one object (metal, leather, cloth, trim split per pixel, each dyed on its own; the 95f material dropdown sets the default, the channels refine it) | 95f, baked in 95i |
| Metal never tinted (low-chroma pixels skipped by every dye, no mask) | 95f, 95i |
| Pure white kept white | 95f, 95i |
| Pattern detector (a part's colours clustered into layers with swatch and area share, each recoloured live) | 95f |
| Blend modes: multiply, overlay, soft light, screen, hard light, and one that keeps the cloth's creases and shadows | 95f, 95i |
| Coat of arms and emblem stamper (position, rotation, blend, baked in) | 95i |
| Live dye preview on the model, before any bake | 95f, 95g |
| A real normal map made from the texture: this is **Generic** in 95j, and Specialized tunes it per material | 95j |
| Head parts (helmet, coif, face, hair, beard) moving and scaling as one | 95g |
| Triangle budget badge, the threshold measured from real units rather than his 3,500 | 95g (statistics) |
| Squad preview. **The user's note: "Add an option to do either autovariation or the three sample. do the cycle by default"**: one toggle between the auto-variation cycle (default) and a three-rank block | 95a, 95b, 95g |
| Rider on a horse with the caparison matched to the rider's livery (this answers the first open question: the preview is wanted) | 95g, 95k |
| Unit role templates (heavy infantry, spear, pike, archer, crossbow, javelin, cavalry fill the modeldb skeletons and weapons, EDU class, formation, attributes, mount), offered beside duplicating a unit | 95k |
| Texture matching for parts, and a model's own textures read from the modeldb | 95e |
| Duplicate detection on import | 95e, 95l |
| Named pose presets (T-pose, guard, spear brace, archer draw, riding, march), built as frames of the real animations | 95h, 95m |

Left unanswered and so not done: install notes beside the export (My
Changes already says what was written).

**Where the Models Editor stands** (measured 2026-10-06): the mode is
`MODES` id `bmdb` (`web/js/core.js:696`), its tabs `BMDB_TABS`
(`core.js:1260`): Model entries (`bmdb.js`, `renderBmdb`), Sprites
(`sprites.js`), Strat map (`stratmap.js`, `renderStratmap`) and Unit cards
(`cards.js`, the cleanup: `cards.plan_cleanup`/`apply_cleanup`). Model
entries filters on a search box and an unused-only box, and nothing else
(`bmdb.js:48-52`); `used_by` comes from `edu` `model_names()` (soldier,
officers, mount) in `bmdb.overview`. The viewer is plain WebGL with one
context per canvas (`viewer3d.js`), docked beside the list
(`bmPrevAttach`). Strat map's 3D button calls `v3OpenCas`
(`viewer3d.js:336`), which is the full-screen viewer the user does not want.
`.glb`/`.obj` export and `.texture`/`.dds` exist (`modelexport.py`,
`sprites.py`); **no `.mesh` writer exists** (`modelexport.py:19-22`).

**The Blender kit** the spec keeps pointing at is the user's own,
[WK-313/Medieval-2-Blender-Toolkit](https://github.com/WK-313/Medieval-2-Blender-Toolkit);
a copy is in `Reference/Medieval-2-Toolkit/Medieval-2-Toolkit-main/`, which
may be older than GitHub, so check upstream first. What it does, read on
2026-10-06, with the file each fact is in:

- **Names**: every object is `prefix__part`. Its fixes: `name` becomes
  `name__name`, `a_b` becomes `a__b`, `hair1`/`hair_1`/`hair__1` become
  `hair__hair_1`, and a trailing `.001` is removed. The known prefixes
  (`panels/qol_panel.py:13-33`): weapon0/1, primaryactive0/1,
  primarypassive0/1, secondaryactive0/1, shield0/1, shieldactive0/1,
  shieldpassive0/1, ramrod0, `cannon ball0` (with the space), `ballista
  arrow0`.
- **Toggle opt** (`qol_panel.py:258-282`): adds or removes `__opt`, placed
  before any trailing `.001`. **Apply prefix** (`qol_panel.py:209-251`): add
  mode makes `x` into `prefix__x`; swap mode replaces what is before the
  first underscore; a `__` inside the kept part collapses to `_`.
- **Transfer weights** (`qol_panel.py:38-103`): Blender's data transfer of
  vertex-group weights, nearest-face interpolated by default (nearest vertex
  and nearest edge offered), then five smoothing passes.
- **Bone names** (`qol_panel.py:141-206`): `_R`/`_L` to `_r`/`_l` and back,
  with `_RThigh`/`_rthigh` handled on their own. The ranged skeletons use
  the lower case, the melee ones the upper.
- **Export checks** (`tasks/export_checks.py:260-416`): trailing numbers
  removed (a clash is an error); `x_y` converted to `x__y`, anything still
  not `x__y` a warning; a ranged skeleton with no `primaryactive0__` or no
  `secondaryactive0__` a warning; duplicate material slots and identical
  materials merged; 0 or more than 2 materials an error; **an object with no
  vertex weights an error**; UVs outside their tile a warning; a texture
  not square or not a power of two an error.
- **Normal maps**: **none are generated.** It copies a blank `512.dds`,
  `1024.dds` or `2048.dds` from `normals/` (`tasks/unit_exporter.py:182-185`),
  named `<texture>_norm`, when a material has none.
- **Unit cards** (`tasks/card_renderer.py`, `panels/unit_info_panel.py:220-300`):
  sizes 48x64, 68x90 (large) and 180x230 (info), or custom; rendered at 10x
  and scaled down (480x640 for 48x64), 64 EEVEE samples; an orthographic
  camera at a fixed place, ortho scale 1.2 adjustable; a sun at strength 4.0,
  or a point lamp at 500 from the camera; a compositor of a bilateral blur
  and rescale to card size, then colour (brightness, contrast, gamma,
  exposure, curves), then a 0.2 sharpen and hue/saturation; a black line-art
  outline, 0.30 card pixels; an optional HD render at 10x to 40x without the
  blur. Output `units/<dir>/#<unit>.tga` and `unit_info/<dir>/<unit>_info.tga`.
- **UV tiles**: main-texture objects in u 0..1, attachment objects in u 1..2
  (`export_checks.py:501-519`), the convention `mesh.py` already speaks.

**UVPackmaster** (in `Reference/` as a `.rar`) is a paid Blender add-on
whose packer is a compiled engine. Take its options and behaviour as the
reference (margins, rotation steps, island grouping, heuristic search) and
write the packer here; none of its code is ported.

## The pieces

Each piece is one feature, built start to finish, committed as it lands.
The order puts what the rest stands on first.

**95a - galleries and filters in Model entries.** A gallery mode beside the
list: every entry at once as a tile with the model drawn and its name under
it, with **auto spin** and **auto variation** toggles (a new random pick of
each part's variant every few seconds). One WebGL context draws all the
tiles (render each model into its own region or to an image), because a
canvas per tile runs out of contexts, and both WebGL traps in this UI apply
(no `requestAnimationFrame` in a hidden tab, `loseContext` is final). New
filters: owned by a faction (its textures), not used by any unit, unit type
(the EDU category and class of the units using it), animation type, and
skeleton type (both off the entry's skeleton lines).
**Done 2026-10-14**: `web/js/gallery.js`. One WebGL context on a canvas that
is never on the page draws each tile and copies it into the tile's own 2D
canvas; only the tiles on screen (an IntersectionObserver with 300 px of slack)
are fetched, four at a time, as the entry's second LOD with its first skin at
256 px (`/model_texture?small=1`), and past 60 models the ones longest off
screen are let go. The shaders, the geometry parser, the part folding, the
randomizer and the framing are the viewer's (wider for a tile, so a horse is
not cut in two). The loop is `requestAnimationFrame` restarted on
`visibilitychange`, and a lost context is rebuilt on a new canvas. **List /
Gallery**, **Auto spin** and **Auto variation** are settings
(`bmdb_view`, `gallery_spin`, `gallery_vary`), both on by default. The filters
come from `bmdb.overview`: the factions an entry has a skin for, the EDU
category and class of the units using it, its mount types (the "animation
type") and its primary skeletons, plus **no unit uses it**. Heirs of Elendil:
1,434 tiles; 31 factions, 5 categories, 4 classes, 4 mount types, 96
skeletons to filter on.

**95b - Unit entries.** A second mode: the models grouped by EDU unit, one
row per unit, the soldier model and each officer model side by side with
enough space between them never to overlap, and the row scrolling sideways
when it is wider than the screen. Same gallery tiles and toggles as 95a.
**Done 2026-10-14**: a third view, **Units**, beside List and Gallery
(`bmdb_view: units`). `bmdb.overview` sends each unit's soldier, officers and
armour upgrades; a row is the unit's name, category and class, then its tiles
labelled soldier, officer n, upgrade n, in a strip that scrolls sideways. A
model named by a unit and missing from the modeldb is a dashed tile. The
gallery now keys its tiles by element, so one model under many units loads
once and draws in each. The filters choose units by their soldier entry, and
the search box also finds a unit by its type. Heirs of Elendil: 477 units,
2,377 tiles, 3 missing models.

**95c - Strat map split in two.** **Strat models**: the agents and
characters out of `descr_model_strat.txt`, whose 3D button shows **that
agent's model** in the docked viewer, not full screen. **CAS models**: the
buildings and settlement models, moved there from where the 3D button opens
them today.
**Done 2026-10-14**: the Models Editor's tabs are Model entries, Sprites,
**Strat models**, **CAS models** and Unit cards. Strat models is the
`descr_model_strat.txt` list it was, and the 🧊 on an entry's card now closes
the card and draws in the docked panel (it opened the full-screen viewer).
CAS models (`casmodels`, `renderCasModels` in `stratmap.js`) is the list of
every `.cas` under `data/models_strat` that 98c folded under the model, now a
column of its own the page's length, beside the same docked viewer; closing
the panel there only empties it. The fold and its setting are gone. Heirs of
Elendil: 631 files.

**95d - write a `.mesh`.** `mesh.write_mesh(model)` produces the boost
archive from a `MeshFile`, its class bookkeeping derived from what is
written rather than copied from a template. **Done when** every `.mesh` in
the installed mods reads and writes back to the same bytes (or a difference
that is explained), and the game loads a written model. Everything from 95e
on exports through it.
**Done 2026-10-14, not yet loaded in game**: `unittransfer/meshwrite.py`,
`mesh.write_mesh`, `mesh.read_mesh(path, layout=True)`. The whole archive is
read now, every class header, object id and reference (`read_layout`), and the
writer counts the ids itself: a pointer writes its class, its class's header
the first time, then the next object id; a reference writes the class and an
earlier id; an object held by value writes `00 00` the first time its class
turns up, which are the zero runs `mesh.py` steps over. The class ids are the
game's (4 the model, 7 the part list, 11 a group, 6 the vertex pool, 3 the LOD
table, 39 a unit's LOD record and 38 a building's), and the streams sit in
three lists by bytes a vertex (8, 12, 4), each in the file's own order. The
LOD record after its name is kept as bytes; a model built from nothing gets
the one 2,407 of the 2,983 `characterlod0` models carry. Found on the way: the
bone table's second number is not the bone's position (`bone_weapon01` and
`bone_weapon` both say 20) and is kept as `bone_links`; the old reader comes
away from 34 models in the packs (23 units, 11 siege engines) with the wrong
bone table, which the strict one reads. A changed
model has its streams written from the arrays that changed and kept as read
otherwise; tangents are made again as the game makes them (the negated
direction u grows in, and binormal = tangent x normal, measured 94% and 98%
on the reference horses), and the bounding sphere is a tight one, as the
game's is. **Measured**: all 6,155 single-model `.mesh` files in Heirs of
Elendil and the game's packs write back byte for byte; the 9 that hold several
models are refused as the reader refuses them. `tests/test_meshwrite` (42).
**Left: a written model loaded in game.**

**95e - Armory Studio, the assets panel.** A new tab in the Models Editor.
To start: pick units or model entries to import (with a unit, choose which
of its models), then pick one as the base to work on, or start from scratch.
Imports land in a collapsible **Loaded assets** panel on the left; each
asset expands into its objects as a gallery or a list, and any object can be
pulled into the model being edited. **External meshes**: `.glb`, `.dae` and
`.obj`, with their textures found in the same folder and attached on their
own, else asked for. Assets can also come from the asset library (95l).
**Done 2026-10-14**: **Armory Studio** is the sixth tab of the Models Editor
(`armory`, `web/js/armory.js`, `unittransfer/armory.py`, `/api/armory/*`).
**Import** opens a dialog of three tabs: *From a mod* (any installed mod, its
units with each model as a chip tagged soldier, officer n or upgrade n, or
its model entries; a Find box that repaints only the rows), *A file on disk*
(a `.obj`, `.glb`, `.gltf` or `.dae`, typed or browsed) and *From the asset
library* (95l). After the first import into an empty model, **Start from**
asks for a loaded model to start from, every object pulled in, or nothing.
**Loaded assets** on the left folds; each asset folds open into its objects as
a list or a gallery of thumbnails, with the entry's skins to choose from, and
a part is pulled into the model by its button or a double click (or the whole
asset by *Pull all*). External files are read into the game's space (x
mirrored, winding reversed, a COLLADA `Z_UP` turned, `v` flipped for `.obj`
and `.dae`); an object named in the Blender kit's form (`Body__body_01__opt`)
takes its type, mesh name and flag from it; a skin keeps each vertex's two
strongest weights; textures are matched by the file's own material, else by
name in its folder and its `textures/`, else asked for (*Sheet…*). A `.glb`
and an `.obj` out of this toolkit's exporters come back as the same
triangles. **Duplicates**: an asset already loaded, or the same file under
another name, is refused on import; an object whose art is already loaded
elsewhere wears a *duplicate* badge, matched by a hash of its triangles or,
for a copy through an `.obj`'s six decimals, its triangle count, centre and
spread (30 of 30 against 14 of 30 by the hash alone). The project
(`config/armory/project.json`) holds the assets and the objects and none of
the art. One WebGL context, on a canvas never on the page, draws the viewport
and every thumbnail. `tests/test_armory` (22).

**95f - the objects panel.** On the right, every object of the model being
edited, grouped automatically by class name into collapsible groups that
hide and show at once, plus **custom collections** to hide, show, export or
delete together. Per object: recolour from generic presets (metal, rusted
metal, leather and the like, never named factions) or a custom preset of the
user's own; a **material** dropdown (metal, fabric, leather...) that drives
the normal maps in 95i; the Blender kit's rename fix, prefix change and opt
toggle exactly as listed above; transfer weights; duplicate, merge, and a
blank object for an empty variant. **Detail view and split**: open one
object on its own, select its connected parts the way Blender's L does, or
pick vertices by hand with an X-ray mode, and split the selection off into
a new object, asking its name.
**Done 2026-10-14**: `web/js/armobj.js`, and `armory.object_mesh`,
`transfer_weights`, `bone_remap` on the server. An object now holds
**pieces**: a whole group of an asset, some of its triangles (a split), each
with a matrix of its own once merged; it turns and scales about the mean of
its pieces' indices, counted the same way in the page and the server. The
panel folds the objects by group type, each fold hiding and showing at once,
and lists the user's **collections** below (hide, show, *export* ticked for
95i, delete with or without their objects). The selected object's properties:
group type and mesh name, opt, **Fix name** and **Prefix** (add or swap, the
kit's 17 prefixes) exactly as `qol_panel.py` does them (checked in Node: `Cube`
to `Cube__Cube`, `sword_blade` to `sword__blade`, `hair1`, `hair_1` and
`hair__1` to `hair__hair_1`, `.001` dropped), a material (metal, fabric,
leather, wood, skin, hair, bone, other), a collection. **Recolour** is
previewed live from the object's own crop of its sheet: twelve generic
presets (metal and rusted metal the only ones that reach grey pixels) and the
user's own (`config/armory/presets.json`), six blend modes (multiply,
overlay, soft light, screen, hard light, and keep shading, the target's colour
at the pixel's own lightness), a strength, white kept, metal never tinted, and
**channels** inside the object (cloth, leather, gold trim, told apart per
pixel by hue, saturation and lightness) each with a colour of its own; the
material picks which channel the object's colour dyes by default. **Detect
layers** clusters the part's own pixels (its UV triangles filled as a mask)
into up to five layers with their swatch and share, each recoloured whole.
**Transfer weights** runs on the server, nearest face interpolated (or vertex
or edge) from every other visible object with weights, then five smoothing
passes; the reference horse's head, its weights taken away, gets its own
strongest bone back on 95% of its vertices. **Duplicate**, **Merge** (each
piece keeps where it stood) and **＋ Empty** (a group with no triangles, the
variant that shows nothing). **Detail view**: the object alone, a click picks
a triangle, **Select connected (L)** grows it through shared corners (by
position, so a UV seam does not cut a part), **X-ray** shows the vertices to
click or box-select, and **Split off** asks a name and keeps both parts where
they were. A loose `.mesh` can now be imported as a file too. Found on the
way: a project that came back from the server as `{}` gave every 95e object a
null id; ids are repaired on load. `tests/test_armory` (33).

**95g - the viewport.** In the middle, behaving like Blender: the object
under the cursor highlights, and navigation and selection use Blender's
mouse and keys (middle drag orbit, shift pan, wheel zoom, numpad views,
click and shift-click select, box select, G R S with an axis and a typed
value, H hide, alt-H show). Move, rotate and scale also from sliders at the
bottom left. **Every shortcut is editable.** Toggles for face orientation
and a statistics overlay. **Bone remapping**: an object brought in from a
skeleton with other bone names, the archer `_r` against the melee `_R`
above all, has its weights renamed to the skeleton in use, on import.
**Done 2026-10-14**: `web/js/armview.js`. Blender's mouse (middle drag orbits, Shift pans, Ctrl or the wheel zooms, Alt+left for a mouse without a middle button; click selects, Shift adds, a left drag box-selects) and keys: G, R, S with X, Y or Z and a typed number, Enter or a click keeps, Esc or the right button puts back; H, Alt+H, A, Alt+A, X; the numpad's front, right, top (Ctrl for the opposite), 5 for orthographic, `.` to frame the selection. **Every shortcut is editable** (*Shortcuts…*, `config/armory/keys.json`, a key taken from whatever held it). Several objects move, turn and scale about their middle, as Blender's median point; **Head as one** takes helmet, coif, face, hair and beard together. Sliders under the view set move, turn and scale. **Face orientation** paints fronts blue and backs red; **Statistics** counts objects, vertices, triangles and the selection, with a badge measured on every unit's soldier model at LOD0 (base game median 5,432 and 95th percentile 8,540; Heirs of Elendil 5,780 and 14,417), not Armory Studio's 3,500. A part pulled in from a skeleton that spells its bones another way is told it takes the spelling of the skeleton in use, and which bones it is weighted to that the skeleton has not got; bones are matched without regard to case from here on. `tests/test_armory` (36).

**95h - the animation previewer.** A collapsible window at the bottom right:
choose the skeleton, play its animations on the model being edited
(`v3anim.js`), to check the rigging.
**Done 2026-10-14**: `web/js/armanim.js`. A folding window at the bottom right of the viewport: the skeletons of any loaded model entry (its sets and every skeleton they name, 147 playable actions for the Heirs of Elendil militia archers), a Find box over the actions, play, pause, a scrubber, four speeds and *Rest*. Each object is laid out in the game's space with its own move, turn and scale, then skinned by `v3anim.js`'s own arithmetic with its source's weights or the ones 95f transferred, the weapon skeletons hung off the hand as the Models viewer does, walking in place and stood on the ground. The window names parts weighted to bones the skeleton has not got and parts with no weights at all. Checked on the Elessar Bodyguard with a militia archer's head: all 30 objects follow the walk.

**95i - check, UV packing and the bake.** *Check model for export* runs the
Blender kit's checks above that still apply (names, opt, weights, materials,
the ranged objects), offers the rename fix, and drops the UV and texture
checks, since the textures are baked new. Export only what is visible, or
only chosen collections. Then the **UV menu**: the area of every object's
UVs measured, and the texture size it needs (512, 1024, 2048 or 4096). A
list on the side sets which sheet each object goes on, main or attachment,
starting from where it came from; an object left unset goes where there is
more room. **Packing**: keep each object's original texel size wherever
possible; islands that overlap in their source texture are packed as one so
the same art never takes space twice; a margin, as a percentage, bleeds the
bake past each island's edge; move and rotate freely while packing but
**never scale** at this step. When a sheet runs out of room, offer: an
automatic choice (said plainly to cost quality); moving chosen islands to
the other sheet, listing each with the share of the sheet it takes; scaling
islands down with a margin and a recommended margin; or lowering the bleed.
Only then bake, **losing no quality** (copy the source texels, resample only
what was scaled on request). Dyes can be applied here.
**Done 2026-10-14, not yet loaded in game**: `unittransfer/armbake.py`,
`web/js/armexport.js`, `/api/armory/check`, `/api/armory/uv`,
`/api/armory/bake`. **Export…** in the bar opens three steps. *Check* takes
everything visible or the collections chosen (those ticked *export* first)
and runs the kit's checks that still apply: an empty name, a name not in the
kit's form (with *Fix names*, the kit's own fix, and `_opt` at the end of a
mesh name made the optional flag), two objects of one name, no weights, an
external part with no sheet, more than 65,536 vertices, and a ranged
skeleton (by the entries' skeleton names, `MTW2_HR_Bow` and the like, or the
one the previewer plays) with no `primaryactive0` or `secondaryactive0`.
Errors hold the export back. *UVs and packing*: each object's triangles joined
through shared vertices are its islands, measured in its source's own texels
(an entry's main sheet for u 0..1, its attachment sheet for 1..2, the two
glued where an island crosses; an external file's one image), with the sheet
size each needs. Islands whose art overlaps in one source, dyed the same way,
fold into one block (the peasants: 295 islands in 24 blocks), so the same art
is never packed twice. Blocks go where they came from, or where there is more
room for a file's parts, or where the list or a block's own *Move to* puts
them, and are packed by a skyline with quarter turns, a margin as a share of
the sheet round each, never scaled unless asked; *Smallest that fits* picks
512 to 4096. A sheet that runs out of room lists what did not fit with its
share of the sheet, and offers *Choose for me* (move blocks where the other
sheet has room, then scale the rest as one, saying so), moving blocks, a
scale per object or per sheet with the margin a scaled sheet should keep, and
the margin itself. *Bake* copies each block's texels, its margin bleeding the
source's own art, resamples only a scaled block, and writes `<name>.mesh`, a
DXT5 `<name>.texture` per sheet and a `.png` of each. The dyes are
`armDyePixels` in numpy (the same bytes on six dyes and 576 pixels), and
**the coat of arms stamper** (the objects panel, *Coat of arms and emblems*)
places an image by a share of the part's own box on its sheet, sized, turned,
blended by the dye's modes or laid on, with an opacity, previewed live and
baked the same way. On the reference horse every one of 3,435 vertices reads
on its new sheet the texel it read before. `tests/test_armory` (57).
**Fixed 2026-10-15, after an exported model crashed the game** in battle.
Its bone table was the bones its parts happened to use, in the order met and
numbered 0 on, with one unnamed and no `bone_weapon`, where the game reads
each bone's second number as its skeleton slot: of 756 soldier meshes in
Heirs of Elendil and the Americas campaign, every one carries one of four
standard tables (682 the melee one: pelvis 0 to lfoot 19, then the weapon and
shield bones sharing 20 to 22; the bows and slingers add theirs). The bake
now writes the table its source models carry, by the vertices each brings
(never one without every bone named), the standard melee one when no part
brings one, and finds each vertex's bones in it by name. Its sheets had no
mipmaps, where 797 of 800 shipped sheets carry the whole chain: they do now.
The main and attachment sheets were two sizes (2048 and 1024): they are one
size now, chosen once (*Sheets*). And a block as wide as the sheet no longer
goes to the next size up for its margin, which may run off the sheet's edge.

**95j - normal maps.** A new normal map for each sheet from the material
choices in 95f, with a preview of the unit wearing it. Measure the normal
maps the installed mods ship first, to set the baseline strength. Three
choices: **Skip** (a flat map, which is what the Blender kit ships),
**Generic** (one setting for everything) and **Specialized** (per material:
metal, fabric, leather...). In Specialized, each object's part of the map can
be edited and updates live in the side panel. Note for the user: the spec
said Generic uses "the default settings from our blenderkit", and the kit's
default is the flat map, so Generic needs its own settings.
**Done 2026-10-14, not yet loaded in game**: `web/js/armnormal.js` and
`armbake.normal_pixels`. **Measured first**: 30 skins in Heirs of Elendil and
the Americas campaign, each shipped normal map against its own diffuse. The
maps are tangent space, flat at (0.5, 0.5, 0.97), and follow the art's
lightness: they tilt against its slope in both x and y (correlations -0.58
and -0.82), with a spread 1.27 times the slope's (1.03 to 1.57 between the
quartiles), which is the baseline: strength 1 is a gain of 2.53. Their alpha
is all but empty (a median of 0.01 to 0.03), and is left empty. The choice
sits on the project, under **Normal maps** at the foot of the objects panel:
**Skip** writes a flat map, **Generic** one strength, blur and invert, and
**Specialized** one per material in use (metal shallow and sharp, fabric and
leather softened, wood deepest, skin barely raised, each changeable), with
*A setting of its own* in an object's properties on top. **Preview on the
model** draws the map in the viewport live: each object's own crop of its
sheet, after its dyes and emblems, made into a normal map by the same
arithmetic as the bake (the same bytes, blur and all) and lit through
tangents worked out per pixel from how the UVs run. The bake writes
`<name>_normal.texture` and `<name>_attach_normal.texture` with a `.png`
of each, each block's part made from its baked art with its object's
setting, flat where there is no art. `tests/test_armory` (67).

**95k - the import unit menu.** Three choices: **Skip** (a new modeldb entry
for this model only, choosing the folder and the mesh name); **Add to a
unit** (this model joins an existing unit as a soldier model); **New unit**
(duplicate a chosen unit, with this entry as its soldier model). All through
the plan/apply door, so My Changes shows it and it can be undone. A button
here opens the unit card generator (95m) on this model.
**Done 2026-10-14, not yet loaded in game**: `unittransfer/armunit.py`,
`/api/armory/templates`, `/api/armory/install/plan` and `/apply`, the export's
fourth step, **Into a mod**, once a bake is written. **Skip** plans one new
modeldb entry through `edit.plan_bmdb`; **Add to a unit** the same entry
through `edit.plan_edit` with `assign_to: soldier`; **New unit** is the
same-mod transfer the unit list's *new unit from this one* is (the copy keeps
the voice of the unit it copies), then that edit on the new unit. Every write
goes through `file_op`, so My Changes shows it and the Log's Undo takes it
back. An entry is a clone of one the mod has (`edit.NewModel`): the baked
mesh, its sheets and normal maps copied into the folder and its
`textures/`, the clone's skeletons, weapons, sprites and faction records kept.
The clone is the unit's own soldier model, an entry named, or a **role
template's**. **Role templates** (heavy infantry, spear, pike, archer,
crossbow, javelin, cavalry) are measured on the mod itself: the units playing
each role by EDU category and class and their soldier's skeleton, the
animation set their entries share most (whose most typical entry is cloned,
so skeletons and weapons are the role's), and the class, formation,
attributes and, for cavalry, mount they share most, set on a new unit. The
Americas campaign: 65 heavy infantry, 48 spear, 13 pike (`MTW2_Pike`,
phalanx, `pike`), 53 archer, 16 crossbow, 19 javelin, 97 cavalry (heavy
horse). The plan is shown before anything is written; a new unit's second
step is shown on the unit it copies. `edit._plan_new_model` now warns when an
attachment sheet has no record to sit in. Its *Unit cards…* button waits on
95m. `tests/test_armory` (80), the three ways written into a scratch mod and
one undone.

**95l - the asset library.** Existing models sorted into categories for
later, each with a name and notes of the user's own beside its code name,
and custom collections and categories. By default the categories are unit
class, unit type, faction and tier.
**Done 2026-10-14**: `unittransfer/armlib.py`, `web/js/armlib.js`,
`/api/armory/library` (read, save) and `/api/armory/library/add`. The library
is `config/armory/library.json`: each item where its model is (a mod's entry,
or a file), a name of the user's own beside its code name, notes, and the
user's own collections and categories, never the art. **＋ Library** on a
loaded asset keeps it; one already kept is refused, by its place or, for the
same model file in another mod or under another entry, by its bytes (the 95e
hash). **Library** in the bar opens it grouped by unit class, unit type,
faction or tier (worked out from the units of its mod that wear each entry,
as soldier, officer or armour upgrade, and the factions it has a skin for),
by collection or category, or not at all; the find box repaints only the rows
under it; each item renames, takes notes, ticks its collections and
categories, and loads. The import dialog's *From the asset library* tab picks
items to load. `tests/test_armory` (89).

**95m - Unit cards in two.** The Unit cards tab splits into **Generate**,
the card maker as a system of its own, and **Clean up**, the menu that is
there today. The maker follows the Blender kit's procedure above: pose the
unit with preset poses, or play an animation and pause it; light it (level,
direction, amount, type, ambient); render at 10x and scale down with the
blur, colour and sharpen steps and the outline. A live preview of the card
in HD at the top right and the finished pixel card at the bottom right.
**Done 2026-10-14**: `web/js/cardgen.js`, `armory.save_card`,
`/api/armory/cards/save`. The Unit cards tab opens on **Generate**, with
**Clean up** (the menu that was there, `cards.js`) beside it. The maker draws
the model Armory Studio holds (one variant of each group type unless *every*
is asked for), through the same renderer, read without the Armory tab being
opened (`armEnsureLoaded`). **Pose**: the six presets, each a frame of the
real animation of that name from the loaded entries' skeletons (guard
`stand_a_idle`, spear brace `ready`, archer draw `attack_missile_hold`
halfway, riding a horse-riding skeleton's idle, march `walk`, T-pose the
bind pose), said plainly when no loaded skeleton has one, or any animation
stopped anywhere on a scrubber. **Light**: one lamp, a sun or a point,
placed about the camera's own direction as the kit's lamp stays beside its
camera, with direction, height, amount, level and an ambient (a card mode in
the viewport's shader). **Render** orthographic at 10x the card (up to 40x),
from a camera with turn, tilt, the kit's ortho scale 1.2 and a height; a
second pass draws the silhouette, grown by the outline's width (0.30 card
pixels) into the black line art. **Scale down**: blurred, drawn down at the
card's size, then exposure, brightness, contrast, gamma, saturation and hue,
and a 0.2 sharpen. The HD render is at the top right, the pixel card at the
bottom right at 4x. Sizes: unit card 48x64, large 68x90, info card 180x230,
or the user's own. **Save the card** writes `#<name>.tga` (or
`<name>_info.tga`) and a `.png` under `config/armory/cards/<name>/`, and
**Give it to the unit** plans and applies the unit editor's own card import,
which copies it to every owning faction's folder through the edit door (so
My Changes shows it and Undo takes it back); *Save the HD render* keeps the
large one. Armory Studio's export (95k) opens the maker on the model and
unit it just wrote. `tests/test_armory` (95).

**Phase 95 is finished** (major I), 2026-10-14. Left for it: a written model
loaded in game (95d on).

**Answered 2026-10-06**: parts may come from any installed mod, not only the
active one (the user: "yes it can from from different mods too"), the way the
transfer reads a second mod; 95e's import lists models from every installed
mod, and the export carries each part's textures across. How automatic
"automatic kitbashing" should be is **deferred to a later version** by the
user (see *Deferred to a later version* under *What else is open*).

# Phase 96 - five suggestions from the user, scheduled 2026-10-06

Sent by the user on 2026-10-06 with screenshots, to be stored and not acted
on yet ("Store all changes in roadmap dont act rn"). After 95 in the schedule.

**96a - `can_homeless` on a mod that runs on M2EX.** The user: "make this
available to the user when the checkbox for 'Runs on M2EX no Engine Limits'
is checked ... Just be mindful to not allow it to be available to Papal
states and Rebels." A `yes`/`no` line in a `descr_sm_factions.txt` record,
**placed before `can_sap`**, as the user's example shows:

```
custom_battle_availability   yes
can_homeless                 yes
can_sap                      no
prefers_naval_invasions      yes
```

What it does, from the user's reference: a faction with no settlements but a
leader and an army tries to take the nearest settlement, horde-like (Rome 2
style), with no horde units and no sacking, and shows on the minimap as a
horde with a star; it works for any faction except the Senate and the slave
and papal factions. In the faction form it is offered only when
`modflags.is_m2ex(mod)` is true (the Home card's flag), and never for
`papal_states` or `slave`. Where the field order and the yes/no fields live:
`factions.py:85`, `:93` and `YES_NO` at `:103`. A record that already has the
line on a mod not marked M2EX is shown and kept, never removed.

**96b - two layout faults on the campaign map.** A stray green box at the
top middle of the screen, above the `+487 · 403 of 612 named` count in the
user's screenshot (an empty element drawn with a fill; find it, don't
restyle around it); and an unused gap along the bottom of the screen under
the map. Check 90 (the layout at every interface size) before fixing, in case
it already covers the gap.

**96c - ports and the capital, by icon.** In the region editor: add, remove
and move the region's port, and move its capital (the settlement), each as
one easy-to-click icon rather than a form. **A region has at most one port**:
adding a second is refused, and a move replaces the old one. The existing
writers do the saving (`campfiles`, `campaint`, 19a's move); this piece is
the controls and the one-port rule.

**96d - the garrison in the settlement editor.** The settlement-editing
options gain the garrison: the units `descr_strat.txt` places in or with the
settlement, added, removed and changed there.

**96e - what another campaign editor does that this one does not.** The
user's word: "analyze this github and see what sort of features does he
have that we could port over. And once again give me a checklist."
[MasterOogwayHomebrew/RTW-M2TW-Campaign-Editor](https://github.com/MasterOogwayHomebrew/RTW-M2TW-Campaign-Editor),
cloned 2026-10-06 into `Reference/oogway-campaign-editor/` (untracked).
**Licence GPLv3**: port behaviour only, never code, as with Mylae's editor.
Most of its core is already here (cloning, unit and building editors,
painting, moving towns and ports, placing armies, terrain, events, victory
conditions, diplomacy, imports, 3x scaling). The eighteen things it has that
this toolkit lacks or half has went to the user as a checklist on 2026-10-06:
<https://claude.ai/artifact/WX5ZcGdjgdqinBbgjmwX1q>, answers in its database,
collection `answers` (`verdict`, `note`, `title`), read with `ArtifactData`.
The items: a no-code WHEN/IF/DO script builder (against the out-of-scope line
for a block script editor), ready-made add-ons, the game log explained, a deep
check that rehearses pending edits, a mod contents report, a drawn family
tree, custom portraits, a portrait library, a new region wizard, settlement
names by culture (check M2TW reads it), many towns at once with
auto-garrison, replacing a unit's model from another mod, voice preview and a
custom name call, an emblem set from one picture, a banner maker, recolouring
a faction's pictures, vanilla values with a reset on every rule, and a new
mod folder of hard links.

**The answers, read 2026-10-06: Port on 17 of the 18.** 96e is therefore
split by area, each built from the behaviour described in the checklist:

- **96e1 scripting**: the no-code WHEN / IF / DO script builder (dropdowns,
  searchable engine conditions and commands, player-tickable settings,
  worked examples, the script read back in plain words, shareable as a zip),
  and the ready-made add-ons on it (sack a settlement, avoid growth, player
  diplomacy). This **moves the out-of-scope line** for a block script editor
  (see *Explicitly out of scope*).
- **96e2 checking**: the game's `system.log.txt` explained (crash first,
  errors grouped, meaning and fix each); a deep check that rehearses every
  pending edit on an in-memory copy and writes nothing; a mod contents report
  by category.
- **96e3 characters**: a family tree drawn like the game's (couples side by
  side, children below, leader and heir marked, add any relation, off-map
  family); a custom portrait per character imported from PNG, JPG or TGA; a
  portrait library per culture with bulk add.
- **96e4 campaign map**: a new region wizard (every field of the record in one
  form, added to the owner's towns); many towns at once with auto-garrison to
  a cost limit, beside 96d.
- **96e5 units**: replace a unit's model from this or another mod (files
  carried, a texture for every owning faction, a warning when the mount type
  differs); voice preview by accent and a custom `.wav` name call.
- **96e6 art**: an emblem set from one picture (every size and button state);
  a banner maker (patterns, a symbol on a grid, M2TW's banner sheet recoloured
  per banner); recolouring a faction's pictures from donor to new colours,
  keeping light and shade, with before and after (shares its dye code with
  95).
- **96e7 rules and mods**: the vanilla value and a Reset beside every rule;
  a new mod folder whose unchanged files are hard links.

**Later**: settlement names by the owner's culture (under *Deferred to a
later version*; check first whether M2TW reads such a table at all).

# Phase 97 - the map viewer, 2D and 3D, scheduled 2026-10-06

Asked for by the user on 2026-10-06 with a reference picture (a Middle-earth
campaign map with faction names lettered large over their lands: ROHAN in
carved wood, GONDOR in white stone, MORDOR in black rock, each curved along
its territory and standing off the terrain with a shadow): "improve our 3d
viewer ... right now its only view only but i also want it to be editable with
selectable regions. Also if its possible can you make it so that we can have
such types of dynamic floating faction names as the default look of our map
viewer both 2d and 3d. Also add a button to turn on and off the icons. And in
the 3d viewer i want you to be able to also place in the agents and their 3d
models as well as the settlement 3d models in the respective tiles."

Where it starts: the 3D view is M18, a mode of the campaign map (`web/js/map3d.js`,
the `D` key), drawing the flat map's own composed colour map on one vertex
per tile; markers, labels and the tooltip stay on the flat map today. Labels
are 20c's (`web/js/maplabels.js`). Both WebGL traps apply (no
`requestAnimationFrame` in a hidden tab; `loseContext` is final).

**97a - select and edit in 3D.** A click in the 3D view picks the tile under
the cursor (a ray against the height field) and selects its region exactly as
a click on the flat map does, so every panel, the tooltip and the tools work
on it; hover highlights the region. The paint tools and the edits that take a
tile (moving a settlement, a port, an army) work in 3D through the same code
the flat map uses, never a second copy.

**97b - floating faction names, the default look.** Each faction's name
lettered over its territory: laid along the main axis of its largest
connected block of land (fitted to the shape, curving with it), sized to the
territory, coloured from the faction's colours, and drawn with depth and a
shadow. In 2D on the canvas; in 3D standing off the terrain, readable from the
camera's side. The name is the faction's display name from the mod's text.
Recomputed when ownership changes. **On by default** in both views, with a
toggle. Fallbacks: a faction too small or too scattered for a curve gets a
straight label; overlapping names give way by size.

**97c - an icons toggle.** One button that shows or hides every map icon
(settlements, armies, agents, resources, forts and the other marker kinds),
in 2D and 3D, remembered with the view.

**97d - agents and settlements as 3D models.** In the 3D view, each
character and agent drawn as its strat model (`descr_model_strat.txt` and the
`.cas` reader behind the Strat models tab, 95c) and each settlement as its
level's and culture's strat model (`settlemodel.py`), on its tile. Placing an
agent and moving one work in 3D (97a). Many models at once, so share one
loaded model per kind and drop detail with distance.

# Phase 100 - Armory Studio's second round, and faction cards in the Unit Editor, scheduled 2026-10-19, first in the schedule

Sent by the user on 2026-10-19: a list of requests for Armory Studio, a bug
report on transferred weights (dated 17/10, with a screenshot of a spearman
whose shield bends away from his arm), and a suggestion from a player on
Discord (diocletianexcubitor) for the Unit Editor. The user: "Add all these
as immediate next step to our roadmap". It goes **before 99p and major II**.
**The user's own words win over anything in this write-up**; they are quoted
with each piece. The pieces are in build order: the faults first, then the
Unit Editor, then the object panel, the layout, the import dialog, and the
larger features (textures, UV editing, Optimize) last.

**100a - Transferred weights tear shields and legs.** "Something is wrong
when you transfer weight with shields" and "Same with some of the legs".
The screenshot shows a shield whose rim stretches away from the arm, so its
vertices took different bones. Read in the code before scheduling:
`transfer_for` (`unittransfer/armory.py`) takes every other visible object
with weights as the source, and `transfer_weights` gives each vertex the
nearest face's two strongest bones, then five smoothing passes. A shield
sits between the forearm, the torso and the thigh, so its far rim picks up
the torso or a leg; a leg near the other leg or a skirt picks up the wrong
side. Fix it so a rigid prop moves as one: a shield, a weapon and anything
the kit calls equipment take the single bone most of its vertices would
take (or the one the kit's rigs give that slot), and a body part takes its
bones only from the same side and the same body part where the source's
names say which. Check against Blender's own transfer (the kit's
`medieval2toolkit.weight_transfer`) on the reported spearman and on a leg.

**100b - Overwrite, and rig a whole mesh to chosen bones.** "Can you check
if transfer weights overwrites the weights or not. A button to rig entire
mesh to select bones. Put Head, Torso, Pelvis first followed by the R hand
.. and L hand.. and only then the leg bones." The answer, read in the code:
**it overwrites.** `transfer_for` clears the object's weights before it
starts and stores the new ones in their place; nothing of the old weights
is kept or blended, and Undo (99i) is the only way back. Say so in the
button's tooltip. New: *Rig to bones*, which gives every vertex of the
selected objects one or two bones picked from a list (weight 1.0, or split
by a slider for two), the list in this order: head, torso, pelvis, then the
right arm and hand bones, then the left, then the legs; the same order
wherever the workbench lists bones.

**100c - The Unit Editor shows each faction's own card.** From Discord:
"Can unit cards change in the Unit Editor main section so they reflect
their specific factions images? Say, the Colovia faction has different unit
cards than the rest, can those appear here? I changed a ton of unit cards
and this could help me see if I forgot some of them." The Unit Editor's
main list groups units by faction, but every group shows the same card for
a unit. Each tile takes the card from that faction's own folder
(`ui/units/<faction>/#<unit>.tga`, through 98f's lookup of mod, game
`data/` and packs), falling back as the game does, with a small mark on a
tile whose card is the fallback rather than the faction's own, so a missed
card shows at a glance. A filter for "only the fallbacks" makes the check a
list.

**100d - Shift-select in the object list.** "Being able to shift-select the
object list." A click selects one, Ctrl+click adds or takes one,
Shift+click selects the run from the last one clicked, across folds and
collections in the order they are drawn.

**100e - Several objects at once.** "Selecting multiple objects options:
transfer weight, recolor(?), group name and mesh name." With more than one
object selected, the panel offers what applies to all: Transfer weights
(each in turn, one Undo step), Recolour (the same dye on each), the group
name set for all, and the mesh name set for all (numbered where two would
clash, as the kit's name rules do).

**100f - Duplicate and Detail move beside the sliders.** "Move the
duplicate, detail views from the top of the object list to the right beside
the XYZ sliders, and below the statistics button." The two buttons leave
the head of the object list and sit at the right of the X, Y, Z sliders,
under Statistics.

**100g - The sliders take the wheel.** "Xyz being scrollable." The wheel
over an X, Y or Z slider (or its number) steps it, Shift for a finer step,
Ctrl for a coarser one; one Undo step per run of turns.

**100h - Loaded assets says what is used.** "On the 'loaded assets' show
how many assets are selected from a model (so it's easy to close models
that you don't need). A checkmark for only show enabled." Each model in
Loaded assets shows how many of its parts are in the project ("3 of 12
used"), and a checkbox at the top hides the parts not in it, remembered.

**100i - A full view mode.** "A full view mode (no ui)." One key (editable
as 95g's keys) and a button hide every panel, bar and strip and give the
viewport the whole window; the same key or Esc brings them back, each panel
as it was.

**100j - The import dialog: filters, the gallery first, a closer look.**
"Filter for 'import' factions, unit types, cultures", "3d view for all the
import option similar to our gallery view of bmdb", "Make the gallery view
default in the imported list tab", "Being able to have a closer look at the
models in 'import'". The import dialog's lists take the Models Editor's
filters (faction, unit type or class, culture); every list in it (a mod's
units, its model entries, the library, a folder) draws as a 3D gallery as
95a's BMDB gallery does; Gallery becomes the default (`armory_import_view`
starts at gallery, a saved choice still wins); and a tile opens into a
large view (orbit, zoom, its variations and animations, as the docked
viewer has) before it is pulled in.

**100k - Import from disk brings its textures.** "Import from disk: only
able to import mesh, not texture." A `.obj`, `.glb` or `.dae` comes in with
its sheets: the ones it names (the `.mtl`, the glTF's images, the Collada
image library), else sheets beside it by name, else picked by hand; a
`.glb`'s embedded images taken out of the file.

**100l - A Textures tab.** "Would be good to be able to edit textures; for
example, in detailed view, an option to look at the texture, then a button
to edit -> open the image in a personal image editing program." and
"Basically a texture tab where you can import and export textures, like if
I wanted to change how the cloth look". A tab in the workbench listing every
sheet the project uses, which objects use it, and its size; the detail view
of an object shows its sheet with its UV islands over it. Import a sheet
(any common format, `.dds` and `.tga` among them), export one, swap an
object's sheet for another loaded one, and **Edit**, which writes the sheet
to a working file, opens it in the program the user sets in Settings (else
the OS's default for the type) and reloads it into the viewport whenever
the file changes on disk.

**100m - A UV edit mode.** "UV edit mode: Similar to blender you can select
an object and change its UV. Add an option to view texture of the object
being edited, change the objects texture to another loaded texture. or
switch to m2 view which will then use the designated main and attach
textures side by side like how we do." A UV editor beside the viewport, as
Blender's: the selected object's UVs over its sheet, vertices, edges, faces
and islands selected and moved, turned and scaled (G, R, S as 95g), snapped
to texels; a sheet picker to show or swap in any loaded sheet; and an M2
view that lays the main and attachment sheets side by side as the export's
plan does (95i), each island drawn on the sheet it will land on.

**100n - Optimize.** "'Optimize' button that runs the optimization ... from
our quick mesh cleanup addon like the reset vectors, merge vertices as well
as our check model for export button from our blenderkit and so on make it
a configurable set of checkboxes." A button on the objects panel and a
dialog of checkboxes, remembered: merge vertices by distance (threshold
shown), reset vectors (recalculate normals, clear custom split normals),
remove loose geometry and empty groups, clean UV layers and number suffixes
(the kit's `qol_panel.py`), and the kit's export checks (95i) run last with
their report. The whole run is one Undo step. **To find first**: the quick
mesh cleanup addon is not under `C:\Users\projy\OneDrive\Coding\Blender` by
any of those names (searched 2026-10-19); ask the user where it lives and
take its exact list of steps from it. *Found 2026-10-19:* it is the user's
own, https://github.com/ProJ-Yeet/Quick-Cleanup-Blender-Addon-.

## Phase 100, as it goes

* **100a** (2026-10-19): reproduced on the user's open project (Dunedain
  knights with an elf shield). The shield, rigid on `bone_lelbow` in its
  mod, came out split over `lhand`, `lelbow` and `lupperarm`; the legs' 94
  foot vertices came out with no foot bone, because nothing but the legs
  reaches the feet (11 cm away at the median); the left hand took the
  forearm while the right took `rhand` off the spear. `transfer_weights`
  now takes the part's own weights (`own`): a vertex with no source surface
  within 5 cm, or whose own strongest bone no source carries, keeps its own,
  and one whose own bones are on one side takes no bone of the other
  (`bone_side`). A part named as the kit's prefixes name a shield or weapon,
  or rigid on one bone, comes out on one bone (`rigid`): the one most
  vertices take, or its own where a quarter of them would. A body part takes
  nothing from a shield or weapon. The smoothing is now Blender's vertex
  group smooth at 0.5, as the kit runs it, not a full average. On the
  project every part now comes back on the bones it wore, left and right
  alike, and the suite's horse head takes back its own strongest bone on 94%
  of its vertices (the check asks for 70%). The tooltip
  says it overwrites (100b's question). `tests/test_armory` (+6).

# Phase 99 - Armory Studio after its first use, scheduled 2026-10-15, first in the schedule

Sent by the user on 2026-10-15, after the first model out of Armory Studio
(Phase 95) went into a mod and the crash it caused was fixed (`cd6921a1`).
The user: "Add these as immediate next phase". It goes **before major II**.
**The user's own words win over anything in this write-up**; they are quoted
with each piece. The pieces are in build order: the faults first, then what
the whole interface gets, then the larger features.

**99a - Pull keeps the page where it was.** "When pressing pull it scrolls
up a little." Pulling a part in (the button or a double click in Loaded
assets) repaints the panel, and the panel's scroll moves. Keep the scroll of
the asset list, and of the objects panel the part lands in, where it was.

**99b - Face orientation the way Blender colours it.** "Face orientation is
i think inverted in red and blue color refer to blender." Blender paints a
face's front blue and its back red. The viewport mirrors x into the game's
left-handed space (`ARM_MIRROR`), which turns every winding round, so
`gl_FrontFacing` is very likely the wrong way round in that view. Check
against Blender on one model whose fronts are known (the reference horse
through the toolkit's own `.glb` export), then swap the colours if so.

**99c - The card maker's gap.** "Also the unit card maker seems to have a
large gap in the middle fix that." The Generate layout (`.cggrid`) leaves
the space between the controls and the two cards empty: the HD render and
the card should use the width.

**99d - The side panels open and close at will.** "I want the side menus to
be expanded on will and collapsible." Armory Studio's Loaded assets (left)
and Objects (right) each fold to a strip and open again, the viewport taking
the room, and remember how they were left.

**99e - The top menu folds too, everywhere.** "Make top menu also
collapsible make this universal." The top bar (the mode, the mod, Settings,
Log) and the tab strips under it fold away and come back, in every mode,
remembered.

**99f - A softer scrollbar, everywhere.** "Make the scroll bar a softer
looking scrollbar that matches our theme and not the default scroll bar,
make this universal around the project." One themed scrollbar (thin, the
theme's colours, a rounded thumb that brightens on hover) for every
scrolling area of the page, in light and dark, through the shared styles in
`web/index.html`, with nothing set per panel.

**99g - Import as a gallery.** "I want the import assets to be gallery view
as well." The import dialog's lists (a mod's units, its model entries, the
asset library) get the List / Gallery choice the Model entries tab has, the
tiles drawn the way 95a draws them (one WebGL context, only the tiles on
screen fetched).

**99h - Rename in place.** "I should be able to rename the objects and their
classifications too directly by double clicking them." A double click on an
object's row edits its mesh name in place, and on a group's fold header
edits the group type (the classification) for every object in it; Enter
keeps, Esc puts back, and the kit's name rules apply as *Fix names* does.

**99i - Undo and redo.** "I should be able to undo and redo." Ctrl+Z and
Ctrl+Shift+Z (and Ctrl+Y) in Armory Studio, over every change to the
project: pulls, moves, turns and scales, renames, dyes, emblems, splits,
merges, deletes, hides, collections, weights, normal settings. Each step a
snapshot of the project (it holds no art, so a step is small), a drag or a
slider being one step; the shortcuts editable as 95g's are.

**99j - T-pose.** "An option to go to T pose i.e. disable animations." A
toggle in the viewport, beside the animation window, that turns animation
off and stands every part in its bind pose, and back on where it was.

**99k - The view gizmo.** "X Y Z view at top sphere like blender has in top
right." Blender's navigation gizmo at the top right of the viewport: the
three axes as coloured balls (X red, Y green, Z blue, the negative ends
hollow) turning with the view; a click on one looks down that axis, a drag
orbits.

**99l - Crop to the UVs exactly.** "I want you to make the cropping algo
even better it should only crop exactly the uv instead of a rectangle." The
bake (95i) copies and packs each island as its bounding rectangle, and folds
islands whose rectangles overlap into one: the corners of a rectangle that no
triangle covers take room on the sheet for nothing (the peasants: 295 islands
in 24 blocks). Copy only the texels under the UV triangles, grown by the
margin, and pack the islands by their shapes (a mask per island, placed so
masks never overlap), so islands nest into each other's empty corners. Art
that overlaps in the source is still packed once. The dye preview's crop
(95f) goes the same way.

**99m - Move and turn the unit in the card maker.** "In the unit card maker
i want to be able to move the unit around and rotate it like in blender too."
The card maker's HD view takes 95g's mouse and keys (middle drag orbits,
Shift pans, the wheel zooms, G and R with an axis), moving the model in the
frame and the card following.

**99n - Dynamic poses and an IK rig, as the Blender kit has.** "Also i dont
want the default poses like that i want there to be more dynamic poses and
ik rig like we have in our blender toolkits unit card function." The kit
(`Reference/Medieval-2-Toolkit/...`; check upstream first) poses a card
through an IK control rig (`tasks/control_rig.py`, the layouts in
`control_rig_data.py`: IK_Infantry, IK_Archer, IK_Dwarf) and a pose library
(`tasks/pose_library.py`, `assets/Poses.blend`: 231 pose assets, about 180
of them on the rig's controller bones, sorted into catalogs: IK Full 1H, 2H,
Archer, Crossbow, Javelin, Mounted, Polearm, Spears, the dwarf set, and IK
Bodyparts arms, head, legs and posture). Here: the rig's controllers in the
card maker's view (feet, hands, pelvis, the poles), solved as two-bone IK
chains onto the Med2 skeleton and dragged with the mouse; the library's
poses offered as a browser by catalog, applied whole or by body part; the
six presets of 95m kept as a start. **To find out first**: how to read the
poses out of `Poses.blend`, a binary Blender file (read its actions with a
reader of Blender's file format, or export them once to JSON through
Blender), and whether that data may ship with the toolkit (the kit is the
user's own).

**99o - Saved sessions and backups.** "I should be able to save units im
working on as saved sessions that i can continue as i please, also include
periodic backups as well in case of crash and needing to revert." Armory
Studio's project, today one file (`config/armory/project.json`), becomes
named sessions: save the one open under a name, open another, carry on where
it was left, duplicate and delete them. Each session is backed up on its own
every few minutes while it changes (a set number kept), and a list of its
backups with their times reverts it to any of them, as does reopening after
a crash. The export dialog's settings, the camera and the card maker's
settings ride with the session.

## Phase 99, done 2026-10-15

On the user's word ("Complete all the stuff related to armory studio"), in
five commits: `7b43740f` (99a-99f), `cccb34af` (99g-99k), `92a68acb` (99l),
`94992d28` (99m-99n) and the one for 99o. German and Spanish complete in each.

* **99a**: the asset and object panels keep their scroll, and the page its
  own, when a Pull repaints them; scroll anchoring off in both.
* **99b**: confirmed inverted. The viewport mirrors x (`ARM_MIRROR`) and keeps
  the game's winding, so a face's front is what GL calls its back; the
  `.glb` export reverses the winding for the same reason. The shader now
  takes `!gl_FrontFacing` as the front: on the user's open model 91,440
  pixels read blue and 532 red.
* **99c**: the card maker's output is a grid, the HD render filling its
  column and the card beside it; stacked below 1,250 px.
* **99d**: Loaded assets and Objects fold to a 34 px strip with their names
  upright, the viewport taking the room; settings `armory_left_shut` and
  `armory_right_shut`.
* **99e**: a fold button at the right of the top bar hides the bar, the trail
  under it and the module's tab strip (`#main > .mftabs`, not a second-level
  strip), in every mode; a tab at the top middle brings them back. Setting
  `top_shut`.
* **99f**: one scrollbar in `index.html`'s shared styles: 10 px, no track, a
  rounded thumb in the theme's grey that turns the accent under the pointer;
  Firefox takes `scrollbar-width: thin` instead. `.mftabs` lost its own
  rule. The toolkit has one theme, the dark one.
* **99g**: List / Gallery in the import dialog for a mod's units (a row per
  unit, as 95b), its model entries and the library, setting
  `armory_import_view`. The gallery (`gallery.js`) now holds a model by mod
  and name, so any installed mod, and the library's several mods, draw
  through its one context; it lets go of tiles that left the page. A file on
  disk in the library shows its name, no tile.
* **99h**: a double click on an object's mesh name, a group's fold (every
  object of that group type) or a collection's fold edits it in place; a
  trailing `.001` and `__opt` go, a whole `type__mesh` is split and fixed as
  Fix names does, a group type loses any `__`. A click on the one object
  already selected no longer repaints the panel, which is what lets the
  double click land.
* **99i**: a snapshot of the project at each save (folds, an asset's list or
  gallery, the animation chosen, the session and its extras left out), two
  hundred kept; Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y and ↶ ↷ on the bar, editable as
  95g's keys and working anywhere in the workbench. `armKeyName` now writes
  Shift for a letter held with Ctrl or Alt.
* **99j**: T-pose beside the animation window's fold, and a key of its own
  (unbound): the clock stops, the parts stand in their bind pose, and it
  plays on from the same frame. The card maker poses whatever it says.
* **99k**: Blender's gizmo at the top right, the game's axes (Y up, the axes
  the sliders and G/R/S use), X red, Y green, Z blue, negative ends hollow,
  turning with the view; a click looks down that axis, a drag orbits.
* **99l**: a block is its shape: the texels under its UV triangles (edges
  drawn too) grown by the margin. Islands fold only when a texel is under
  both; blocks are set down column by column against a depth profile, so an
  empty corner of one takes the next, three ways of choosing tried until one
  fits and the one leaving least kept (no single way won on all four
  soldiers measured); the bake copies only the masked texels, the normal map
  likewise; the export dialog draws each sheet's shapes from a picture the
  plan sends. At 512 the Dunedain knights need a scale of 0.54 (rectangles
  0.50), Mordor's bodyguard 0.69 (0.65), the reference horse 0.998 (0.902).
  The dye preview's crop dyes only the texels under the piece. **Not looked
  at while building it, raised by the user afterwards: SimpleBake.** It has
  no packer of its own; it calls Blender's `uv.pack_islands` with the
  concave shape method, any rotation, merge overlapping and a margin method,
  then rebakes through Cycles. Two things worth taking; the user said yes
  to both (2026-10-15), scheduled as 99p.

**99p - SimpleBake's two ideas for the packer, scheduled 2026-10-15, next.**
The user: "yes both". (1) A placer that fills holes and side pockets: a
full mask search over the sheet's occupancy (a coarse grid, then the exact
texels), not 99l's column profile, which loses every hole under a block.
(2) Free rotation as an opt-in in the UV step: any angle, said to cost a
resample (the bake is a 1:1 texel copy otherwise), quarter turns staying
the default. Measured on the four soldiers 99l was measured on, at 512.
* **99m**: the HD view takes the mouse: middle drag orbits the card camera,
  Shift pans (`cam.pan`, new), Ctrl or the wheel zooms the ortho scale; G and
  R (X, Y, Z for an axis; click or Enter keeps, Esc or the right button puts
  back) move and turn the model about its middle in the frame. `armRender`
  takes a `pre` matrix for it.
* **99n**: upstream (WK-313/Medieval-2-Toolkit) checked first: the rig data
  is the same, the catalogs now spell Javelin, and the controller hides the
  Med2 skeleton. Blender 5.1 (`D:/Blender-5.1.2`, not 4.5, whose folder holds
  no executable) read the three rigs and the 231 pose assets out of the kit
  into `unittransfer/data/m2_poses.json` (163 KB, the 18 old mount poses
  left out), served at `/api/armory/poses`. `web/js/cgrig.js` solves the rig
  as Blender does (chained rests and pose channels; two-bone IK with
  Blender's pole rule, bent in the rest plane and falling back to the plane
  of shoulder, target and pole where that would put the elbow on the far
  side; the torso chain keeping its controller's twist, Copy Rotation taken
  without scale; the Switch pinning the left fist to the Pole's tail) and
  puts each Med2 bone's turn on the model's skeleton, Blender's y and z
  swapped. Against Blender's own solve of every pose on all three rigs (414)
  the Med2 bones agree within 1.1 cm at the median and 9 cm at the 90th
  centile; the worst is an orc pose on the dwarf rig, 31 cm. In the card
  maker: an IK rig pose (rig by skeleton, or chosen), its controllers drawn
  over the HD view and dragged (the head turns), the library by catalog
  applied whole or by arms, legs, head or posture, two hands, back to rest;
  the six presets kept. `tests/rig_truth.json` keeps Blender's solve of
  thirteen poses for the suite. The pose data ships: the user made the kit
  (2026-10-15, "im the creator of blenderkit").
* **99o**: sessions in `config/armory/sessions/<id>.json`, the open one the
  working `project.json` (`project.session`), every save a save of both;
  backups in `config/armory/backups/<id or _unsaved>/`, one every 180 s while
  the model changes, twenty kept, and one more whenever a session is opened,
  a backup put back, or a save would empty a model that has objects. The
  camera, the card maker's settings and the export settings ride in
  `project.extra`. A page that closes sends its project and goodbye by
  beacon (`/api/armory/closed`); one that never did shows "Not closed
  cleanly" on the bar. A Sessions dialog saves, opens, duplicates, renames,
  deletes and reverts. Found while testing: a reload while the project was
  still loading could have sent an empty project over the user's (the write
  failed only because two writes shared one temporary file). Fixed three
  ways: nothing is sent before the project has loaded, each write has its
  own temporary file, and an emptying save backs up first.

# Phase 98 - six reports, scheduled 2026-10-13, first in the schedule

Sent by the user on 2026-10-13: three reports from a player who uses the
toolkit in English and read the Spanish catalogue for us, then three of the
user's own, with screenshots. The user: "Add all these into our roadmap as
immediate next phase". It goes **before Phase 95**. The pieces are in build
order, smallest first; 98f is the large one.

**98a - the Spanish wording the player flagged.** **Done 2026-10-13**: the
five strings and both rules, 359 strings in all (352 instructions moved from
*Hay que* to tú, six explanations kept, the three *carpeta raíz*, the three
*Salud*); the rules and review notes in `dev/i18n/es.md`. `Estado` went into
the style guide's term table rather than the termbase, which needs a word in
all 16 languages for a row and has none for Health (German itself says
*Gesundheit* and *Zustand*). Five strings on Home and
one term, in `web/i18n/es.json`:

| key | now | becomes |
|---|---|---|
| `home.root_mod_folder_the_medieval_ii` | Carpeta raíz de mods. La carpeta de Medieval II bajo la que están los mods. | Carpeta de mods. La carpeta de Medieval II en la que están los mods. |
| `home.pick_a_mod_then_a_module` | Hay que elegir un mod y después un módulo. | Elige un mod y después un módulo. |
| `home.every_write_is_backed_up_log` | Toda escritura tiene copia de seguridad. 🕑 Historial deshace cualquiera de ellas. | Toda edición se guarda en el 🕑 Historial. Allí puedes deshacer cualquier acción. |
| `home.last_time_you_were_in` | La última vez se estuvo en | La última vez estuviste en |
| `core.health` and the other two | Salud | Estado |

The player's reasons: "carpeta raíz" is not what a Spanish speaker calls it;
"bajo la que" reads as the mods crushed under the folder; "Hay que" is an
impersonal "we must", where the rest of an interface says "Elige"; the backup
sentence is clearer said as what the user can do. **Two rules follow for the
whole catalogue, not only these five:** `carpeta raíz` goes everywhere (three
strings), and the impersonal `Hay que ...` / `se estuvo` for an instruction
becomes the direct `tú` form wherever it tells the user to do something (157
strings use `Hay que` or `se estuvo`; most are explanations and stay, so read
each). `Salud` becomes `Estado` everywhere the Health screen is named. Write
both rules into the style guide `dev/i18n/es.md`, and `Estado` into the
termbase's Spanish column. `dev/checks/i18n_todo.py` still reports 0 problems
after.

**98b - a Ko-fi link in the tool.** A Ko-fi link at the bottom right of Home
and in the Credits (`web/js/core.js`). It opens in the browser, never inside
the app. **The URL is `https://ko-fi.com/projyeet`**, the one the README and
the GitHub page already link (the user, 2026-10-13: "our kofi is on our
github"); nothing in `web/` links it yet. **Done 2026-10-13**: `kofiLink()` in `core.js`, a
foot row on Home (`.homefoot`) and a Support block last in the Credits, its two
strings in German and Spanish.

**98c - the Strat map 3D panel loses the model.** Reported: picking a model
on the Strat map tab of the Models Editor shows it "for a few seconds then it
disappears and gets replaced by a huge list of `models_strat/residences`
files that extends beyond the page". The cause, read in the code: the panel
built by `stmPrevMake` (`web/js/stratmap.js`) is the bar, then the file
browser (`#cmodBrowse`, `web/js/stratview.js`), then the 3D view. The browser
is empty while `/api/map/models` walks the folder, so the model draws at the
top; when the list arrives (635 files in The Elder Scrolls, 285 under
`residences` alone) it paints above the view with no height limit and pushes
the model out of sight. Fix: the 3D view comes first and the file browser is
a folded list under it, closed by default, its rows in a scrolling box of
bounded height, the same pattern as the BMDB panel's folded lists. Its open
or closed state is remembered. The same screenshot shows rows marked `1 not
shipped`; those files are in the base game's packs, and 98f is what lets them
be drawn. **Done 2026-10-14**: the view first, the list in a fold under it
(`stratview.all_model_files`), closed until opened and remembered in the
setting `stratmap_browse_open`; the directory walk waits for the fold. The cap
is `min(320px, 38vh)` on `.stmbrowse`, because the old `max-height:38%` had no
panel height to take a share of and so held nothing. 631 files in Heirs of
Elendil sit in a 274 px box with the model drawn above.

**98d - building art that needs a refresh.** The user: "Building arts change
requires a refresh on subsequent art updates Sometimes." A second replace of
the same picture can show the old one until the page is reloaded. Reproduce
it first (replace the same building's art twice in a row, then a third time
from a different file of the same name). The likely cause is the browser
holding the picture by its URL, which does not change when the file does; if
so, every building-art URL carries the file's mtime and size, so a new file is
a new URL. Check the picture dialog, the building card and the level list,
since all three show the art. **Done 2026-10-14**: the cause was on the page,
not the server. The server's picture cache is keyed by each file's mtime and
size already; the browser holds an image by its URL, and `bldIcon`
(`web/js/buildings.js`) was the one picture URL that did not carry
`iconBust()`, the stamp `imgBust()` moves on every write. So the re-render after
a replace built the URL it had before and the browser drew the picture it held
for it. All three places build their URL through `bldIcon`; the replace dialog
reads the stamped URL as the same building.

**98e - texture paths that point somewhere else.** Reported: "Sometimes when
creating/editing units, the GUI Toolkit copies and references the texture
files in a specific folder (usually the same as the meshes, eg _units/France).
Even if I change them by using the 'import' option, they are still there, the
solution being manually writing down the folder location." The player edited
textures and normal maps for a while without seeing a change in game, because
the entry named a copy in another folder. The second screenshot shows it: the
model folder is `unit_models/_Units/skyrim`, the texture and attachment
texture are under its `textures/`, but the normal map and attachment normal
map are in the mesh folder itself (`skyrim/bendr_nm.texture`,
`skyrim/rift_nm.texture`), boxed in amber. What the code does
(`web/js/editor.js`): `edImportDir` lands an imported file **beside the file
it replaces**, falling back to the model folder's `textures/` only when the
slot was empty, and `edRebase` moves every path to `<folder>/textures/` only
when a folder move is pending. So a path that was in the mesh folder stays
there through every Import. The pieces:

- **One rule for where a texture lands**: the model folder's `textures/`,
  which is what the form already says ("Meshes here, textures in its
  `textures/`, one folder"). Import puts the file there whatever the old path
  was, and the box changes to the new path.
- **Say where it went**: after an Import, the box shows the path it now names,
  and a line under the form lists every texture slot whose path is outside
  the model folder's `textures/`, with one button to bring them in (copied,
  the paths changed, one Undo).
- **Say when it names nothing**: a slot whose file does not exist in the mod
  (nor, after 98f, in the base game) is marked as missing, distinct from the
  amber of an edited box.
- Find out what made the copies in the mesh folder in the first place (a
  transfer, Add a model, or a save of the form) and make it follow the same
  rule. Reproduce on the player's case before changing anything.

**98e done 2026-10-14.** Where the copies came from: **Add a model**
(`_plan_new_model` in `unittransfer/edit.py`) copied the texture, normal map
and both attachment files into the folder the form names, beside the mesh,
while the form said textures go in its `textures/`. They now go in
`<folder>/textures` (`_texture_dir_of`). Import (`edImportDir`) lands a texture
in the model folder's `textures/` whatever the box named; a sprite still lands
beside the one it replaces. The folder report gains `home` and
`stray_textures` (a texture outside `<home>/textures`; an attachment texture
only while it is in the model folder itself, a shared set elsewhere is not
this model's), and the card `absent` (mesh and texture paths no file answers,
a dashed red box with a tooltip) and `twins` (strays with a file of the same
name in `textures/` too, the player's trap). A box under the default textures
lists the strays with **Bring them in** (`gather` on the model edit,
`_plan_gather`): each is copied into `textures/` and the entry repointed, a
file already there is pointed at and never written over, the old copy is left
for any other entry, and Undo is the save's. The box shows only where the
Standardise box above is silent (an entry that looks tidy) or there is a twin,
and it is amber only for a twin: 299 of Heirs of Elendil's 1,446 entries read
a texture from outside their folder, nearly all shared on purpose.
`tests/test_texture_home.py`, 21 checks.

**98f - vanilla files read from the game's packs, nothing unpacked.** The
user: "The mods that rely on vanilla assets (like vanilla expanded ones or the
Kingdoms expansions) throw errors of missing files/textures when editing
units. Can you see if you can gather the data from the packs directly without
unpacking them like we have done for the animations and skeletons." A mod that
leans on vanilla ships only what it changed; the engine finds the rest in the
base game's `packs/`, and the toolkit does not look there, so the unit editor,
the modeldb checks, Health and the Strat map tab (98c's `not shipped`) report
files that the game itself finds.

What is there, measured 2026-10-13 on the Steam install
(`C:/Program Files (x86)/Steam/steamapps/common/Medieval II Total War`):
`packs/data_0.pack` to `data_4.pack` (3.9 GB in all), `localized.pack` and
`voices.pack`; CA's own `tools/unpacker/unpacker.exe` with `unpack_all.bat`
and one `.bat` per Kingdoms campaign (americas, britannia, crusades,
teutonic). These are not the animation packs that 77 reads (`pack.dat` /
`.idx` under `data/animations`), so this is a new, read-only reader.

- **The reader**: `.pack` files indexed once (names, offsets, sizes), the
  index cached on disk keyed by each pack's size and mtime, and one file read
  out by name on demand into memory or a cache folder, never the whole pack.
  CA's `unpacker.exe` is the fallback for a file the reader cannot decode
  (asked for one file, into a temp folder), never the main path.
- **One lookup**: a file a mod names is looked for in the mod's `data/`, then
  in the base game's loose `data/` (an install that was unpacked already),
  then in the packs. This is the order the game uses; confirm it with 82's
  in-game method before relying on it. Every place that today says "missing"
  or "not shipped" goes through it: the unit editor's model and texture
  slots, the modeldb and texture checks, Health, the 3D viewers (battle and
  strat) and Unit Transfer's file copy. A file found only in a pack is shown
  as **from the base game**, not as missing, and a transfer copies it out of
  the pack only when the destination does not reach the same base game.
- **Kingdoms**: a campaign under `mods/americas` and the other three reads its
  own folder first, then the base game, as the engine does. Check whether the
  Kingdoms campaigns have packs of their own on this install.
- **Building art from the packs**: once the reader works, the building
  pictures come from the base game's packs and the shipped copy goes. Today
  that copy is `main/vanilla_ui` (35 MB), which `config.get_vanilla_ui_root()`
  and `buildings.vanilla_ui()` read, packed by
  `dev/release/pack_vanilla_ui.py`. Drop it only after every building screen
  is checked against a mod that has no art of its own, and keep a clear
  message for an install with no packs. **This changes a release rule**: a
  release zip is about 50-55 MB with the art and about 19 MB without it, and
  RELEASE.md and the release check treat 19 MB as broken. The rule, the size
  and the check change in the same commit that drops the folder, nowhere
  sooner.
- Measure the reader against the unpacked files before any screen uses it:
  every name in the index read out and compared byte for byte with what
  `unpacker.exe` writes, on a sample from each pack.

**98f done 2026-10-14.** **The reader** is `unittransfer/gamepack.py`. A
`.pack` is a header, an offset per record, a size per 64 KB block, the records
(offset, first block, size, packed size, name) and the blocks; each block is
LZO1X on its own, or stored when packing did not shrink it. No LZO library is
installed, so the decoder is in the module, in Python. Indexing all seven
packs reads about 3 MB of tables in 0.13 s, so the index is held in memory
(keyed by each pack's size and mtime) and not cached on disk. A file a caller
needs as a path is read into the toolkit's cache once. **Measured:** every one
of the 37,168 files (7.08 GB) reads out at its recorded size, and CA's
unpacker, run with the user's consent to its terms, wrote the same file list
for all seven packs and the same bytes for all 1,883 files sampled. It fails
partway on a destination with a long path (Windows' 260 characters), so it was
run into `C:/ut98u`. The unpacker was not built in as a fallback: it stops on
three Y/N prompts, and no file needed it.

**One lookup**, `gamepack.lookup`: the mod's `data/`, the game's loose `data/`,
the packs. The loose-before-pack order is the game's: 93 files the game keeps
loose differ from their packed copy, and they are the patch's newer versions
(more lines in the text files, 512 px aerial tiles where the pack has 256).
The in-game check with 82's method was not run. It is wired into
`edit.absent_files` (a box naming a base-game file is dotted and says so),
`mesh.entry_view` and the battle viewer's routes, the strat viewer and
`cas.texture_rel`, the Strat map tab (Heirs of Elendil: 224 rows from
"1 not shipped" to "1 from the base game", 13 still missing), the `.glb`
export, and Unit Transfer (`_from_base_game`: nothing copied when the
destination reads the same game, a copy out of the pack otherwise). Heirs of
Elendil's battle entries with a missing file went from 37 to 5. Health had no
check that names a missing mesh or texture, so nothing changed there.
**Kingdoms**, added the same day once the user installed the four campaigns:
each keeps every file in its own `packs/` (`data_0`, `data_1`, `localized`),
named `mods/<campaign>/data/...`. `gamepack.lookup` reads them after the
campaign's loose `data/` and before the base game, and calls the result
`modpack` (the mod's own file, not the base game's); `Mod._read_required` reads
a required file out of them, so the four open: americas 459 units and 722
model entries, british_isles 458 and 766, crusades 471 and 790, teutonic 469
and 810, each in 0.2 s, and their models draw in the viewer and the gallery.
A write still lands loose in the campaign's `data/`, which the game reads first.

**Building art** comes from the game (`buildings.GameUi`, its `data/ui` then
its packs) ahead of any `vanilla_ui` folder; all 1,567 pictures the shipped
copy held are in the packs. Checked over every level and culture, small and
large, with and without the any-culture sweep: 16,744 lookups for Heirs of
Elendil and 16,744 for a mod with no art, the same answer with the copy and
without it. **`main/vanilla_ui` is dropped** in the same commit as the release
rule: `RELEASE.md` rule 2, the release-check agent and the README now say a
zip is about 22 MB (21.8 MB measured) and has no `vanilla_ui/`, and
`build_release.py` lists `vanilla_ui` as forbidden. The setting
`vanilla_ui_root` and `pack_vanilla_ui.py` stay for a game with no packs.
`tests/test_gamepack.py`, 17 checks.

# What else is open

Every rated item is built: the five- and four-star rows, and the three-star
rows, which became Phases 56-73 and 25-27. Their write-ups are in
`ROADMAP_ARCHIVE.md`, with how the ratings were reconciled with the 2026-09-05
triage board.

## Deferred to a later version, by the user

**How automatic "automatic kitbashing" is** (Phase 95). Asked on 2026-10-06
with three answers offered: (A) random within rules the user sets (a recipe
of allowed parts, colours and a count, rolled into variants), (B) matched to
an existing unit's look (find parts of the same kind across every installed
mod and build variants that still read as that unit), or (C) both, B's
match as the default recipe that A then loosens or tightens; and whether the
result is several models or one model with many variants per slot. The user:
"I think this should be something for later versions store this question for
once we finish setting up everything." So 95 builds the workbench by hand
and leaves the one-button kitbash for a later version; ask this question
again when it comes up.

**Settlement names by the owner's culture** (96e, marked Later by the user on
2026-10-06): a per-culture table of town names, shown when ownership changes.
Check first whether M2TW reads such a table or whether it is a Rome feature.

## Unrated, and the rating is not the reason

**`battle.sd`, `strategy.sd`, `shared.sd`** - the interface skins, 23 archive
documents between them and a dedicated editor already in the archive
(`m2_sd_editor`). It was left unrated and it is the one row on the ballot that
argued against itself: this is GUI skinning rather than mod data. It stays here
so the decision is recorded rather than rediscovered.

---

# How this file is kept

## The audit itself

`docs/upstream/REFERENCE_GAPS.md` holds the full write-up of all fifty-one items - what
each one is, where the reference implements it, what was verified against this
repo, and what it would cost. Every phase above names the ids it closes; the
audit is where the reasoning behind each id lives.

The classification is also live at the triage board published 2026-09-05, which
holds the priority per item in its own store. If the audit and this file ever
disagree, this file is the plan and the audit is the evidence.

---
## Explicitly out of scope for V2 and V3 (future expansion only)

Script editor (eventual Scratch-style block UI for faction events), Animations,
Unit Card Generator, Goat Tools, LUA Scripts, New Map Editor, Export/validation
dashboard. Tracked in `docs/upstream/PORT_MANIFEST.json` as `out-of-scope`; nothing in
V2 or V3.0.0 may depend on them.

**Reclassified 2026-09-03.** These were in the same bucket and are now scheduled
rather than excluded: `OsmBackground`, `OsmRegionSearch` and
`CoastlineTracer` move to **Phase 25**; `OverlayMapGenerator`,
`BboxLayerGenerator`, `FeaturesLayerGenerator`, `autoGroundTypes` and the
Köppen / land-cover fetchers move to **Phase 27**. Re-triage them in
`docs/upstream/PORT_MANIFEST.json` when Phase 25 starts. `LuaAiAssistant`,
`ScriptAIAssistant` and `SymbolGenerator` are **not** reclassified - they are
the AI/autogenerate rule and stay a permanent no.

**Reclassified again.** *Animations* became Phases 77-86 (2026-09-23), and the
*New Map Editor* became Phase 87 (2026-09-25, done). The *Script editor*
became 96e1 (2026-10-06, the user ported the Oogway editor's WHEN / IF / DO
builder).

---
## The four documents, and what goes where

Four files, and each one has exactly one job. This split was made on 2026-09-05
because `ROADMAP.md` had reached 3,031 lines and `STATE.md` 2,094, and a fresh
session was reading both in full to find one sentence.

| File | Holds | Grows |
|---|---|---|
| `ROADMAP.md` | locked decisions, phase index, the map-format reference, the schedule of what is left | only when work is added or a decision is locked |
| `ROADMAP_ARCHIVE.md` | the write-up of every finished phase | when a phase finishes and is moved out of the backlog |
| `STATE.md` | where the project is **right now**, under ~60 lines | rewritten, never appended to |
| `STATE_ARCHIVE.md` | the dated session log, newest first | one section per session |

The rule that keeps this working: **when a phase is finished, its write-up moves
to `ROADMAP_ARCHIVE.md` and its entry leaves the backlog in the same commit.** A
phase marked done but still sitting in the roadmap is how the old file got to
3,000 lines.

---

## STATE.md contract

`STATE.md` (repo root) is the first thing a fresh session reads and the last
thing a working session writes. Format - exactly these sections, in order,
**total length under ~100 lines**. (That number was ~60 until 2026-09-05, when
Phases 18-27 were scoped and the Phase status table gained a row per scoped-but-
unbuilt group. The bound is one screenful of scrolling, not a line count for its
own sake; if it is being fought, the thing to cut is duplication of ROADMAP.md,
which is what the Next up section is for.)

```markdown
# STATE - Medieval 2 GUI Toolkit
_Updated: YYYY-MM-DD · vX.Y.Z · after <what this session did>_

## Next up
One imperative sentence: the exact next action (phase + step).

## Phase status
| Phase | Status | Note |
|---|---|---|
Only phases that are in-progress, blocked, scoped-but-unstarted, or the newest
done one. Status ∈ {done, in-progress, blocked, scoped}. One row per phase or
per contiguous group of them, one short note. Finished phases live in
ROADMAP_ARCHIVE.md, not here.

## In-progress detail
Exact stopping point when a phase is mid-flight: files half-edited, failing
tests, the next concrete step. "Clean." when nothing is mid-flight.

## Read first
2–5 paths a fresh session must read before acting (ROADMAP.md is implied).

## Upstream
reference-tool reviewed SHA + date; "sync overdue" flag if >2 weeks old.

## Decisions
Append-only, dated, one line each. Prune into ROADMAP's Locked decisions when
a decision graduates, and into STATE_ARCHIVE.md when the list passes ~10.
```

Rules: update it even for partial sessions (that is its whole point); never let
it exceed a screen - the session write-up goes in `STATE_ARCHIVE.md`, the
reasoning goes in `docs/upstream/` notes or the roadmap, not here; phase exit criteria
live in `ROADMAP.md` only, `STATE.md` just points at them.

**Writing a session up.** At the end of a session, put the "what this session
did" section at the **top** of `STATE_ARCHIVE.md`, dated, and leave `STATE.md`
holding only the six sections above. The old habit of prepending each session's
section to `STATE.md` itself is what took it to 2,094 lines.
