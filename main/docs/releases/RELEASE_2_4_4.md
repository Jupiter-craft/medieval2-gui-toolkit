# v2.4.4

**Nine fixes from a user's screenshots, and battle model files that mend
themselves.** Long trait text can be read and edited in a box of its own,
traits can be found by what they say, a Lua line opens in your editor, a
recruit pool can be copied from one building into another, and the unit
editor stays on the unit you just saved.

## New

* **👁 beside a trait's text.** Every text box on a trait level (description,
  effects line, gain and lose messages, epithet) and on an ancillary has an eye
  button. It opens the whole text in a large box, with the game's `\n` shown as
  real line breaks, and writes it back when you press Apply (Ctrl+Enter). Undo
  and Save treat it as typing.

* **Find text inside a trait.** A second box under the trait list matches any
  line of a trait's block in the file, or the words the player reads for it.
  Typing *Faramir* lists every trait that mentions him, not only the ones named
  after him.

* **Open ↗ on a Lua line.** Where the trait and ancillary screens list what the
  mod's EOP scripts do with a record, each line has a button that opens the
  script in the editor your system opens it with, at that line. VS Code,
  Notepad++, Sublime and most others go straight to it; Notepad opens at the
  top and the message says which line to go to.

* **Copy a recruit pool into another building.** 📋 on a pool row in the
  building editor copies the whole pool: unit, its four numbers and its
  requirements. Open any other building and *📋 Paste* in its Recruitment
  header adds it to the tier on screen. The copy stays until you copy
  something else, so one pool can go into every landmark in turn.

* **Battle model files with a known hand-edit fault are mended on request.**
  A `battle_models.modeldb` whose texture line slipped under the wrong faction,
  a skin with no files, a digit glued to a 0 or two numbers run together is
  named exactly, and a Repair bar offers to fix it. The file is backed up first
  and the mend can be undone from the Log.

## Fixed

* **Saving a unit no longer drops you back to the faction's list.** The editor
  reopens on the unit you saved (under its new name if the save renamed it), on
  the tab you saved from.

* **The unit editor's Recruitment rows at a large interface size.** The
  building's name collapsed under its own icon and the delete button was pushed
  out of the box. The numbers and the 🗑 now drop to a second line, with the
  column labels following them.

* **The "📍 regions pass" card in the building editor** showed as a thin
  sliver under the chip. It now opens in full, flips above the chip near the
  bottom of the window, and can be scrolled with the pointer.

* **The building editor's footer** wrapped "Fix unit **ownership** to match"
  and the text-cache box into narrow columns. Each reads as one line again.

* **The Minor Files tab strip's scrollbar** was drawn across the bottom of the
  tabs. It sits under them now.
