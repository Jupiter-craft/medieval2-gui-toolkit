# beta 2026-10-11

**Everything in v2.4.5 with the campaign map switched on**: building art (and
any picture) can be replaced from a file under a mod's `data\ui` folder again,
the Models Editor lists and draws the meshes no battle model entry names, and
the code view of an entry with an animation record works again.

Nothing on the map itself changed since beta 2026-10-10.

This is still a **beta** for the reason the first one was: the campaign map
editor is the first thing this toolkit does that WRITES to a campaign, and a
campaign is the one part of a mod where a bad write shows up ten turns in rather
than the moment you load it. Everything it writes is backed up and one Undo
away. Read the plan before you press Apply.
