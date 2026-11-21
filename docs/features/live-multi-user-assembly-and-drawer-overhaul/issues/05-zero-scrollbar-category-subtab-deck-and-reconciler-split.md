# 05: Zero-Scrollbar Category Subtab Deck for Character Sheet & Guild Master Ledger

**What to build:** Overhaul the **Spectator Drawer** (`Character Sheet`, `Guild Master Ledger`, and `Ticker`) into a zero-scrollbar **Category Subtab Deck** where every category view occupies `100%` of the drawer height without vertical scrollbars. Removes the permanently pinned `115px` bottom ticker panel; splits the `Hero` tab into four subtabs (`Details`, `Chat`, `Scrolls & Gear`, `Tool Log`); splits the `General` tab into three subtabs (`Overview`, `Assembly & Commit`, `Roster`); uses compact page steppers (`◀ Prev · Page X/Y · Next ▶`) whenever list items exceed the viewport; and decomposes the side-panel reconcilers into focused single-responsibility modules well under the 400-line ceiling.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The permanently pinned bottom ticker panel (`115px` height) is removed from beneath the main drawer sheet; `General`, `Hero`, and `Ticker` each occupy `100%` of the drawer body height when selected.
- [x] Selecting `Hero` renders the **Category Subtab Deck** bar with four full-height subtabs:
  - `Details`: Hero identity, role badge, model, active station, **Context Mana** gauge, token/cost grid, squad lineage, and `Kill Character` button.
  - `Chat`: Full-height user prompt + streaming assistant response view + active **Quest Gate** resolution card + sticky **Command Scroll** composer.
  - `Scrolls & Gear`: 2×2 **Equipment Loadout**, equipped **Skill Grimoires**, and **Resource Stockpile** (MCP/plugin/tool) pills.
  - `Tool Log`: Viewport-fitted recent tool & shell executions with `◀ Prev / Next ▶` pagination and click-to-view single-tool output preview.
- [x] Selecting `General` renders the **Category Subtab Deck** bar with three full-height subtabs:
  - `Overview`: Room header, 2×2 telemetry summary, open **Quest Gate** quick-jump alerts, **Dungeon Wilds** status, and `Summon New Adventurer` button.
  - `Assembly & Commit`: Live **Goal Assembly Site** part checklist + **Assembly Commit Ledger** slot.
  - `Roster`: Viewport-fitted room character cards with `◀ Prev / Next ▶` pagination.
- [x] All drawer views enforce zero vertical scrollbars (`overflow: hidden` on the deck body with bounded items per page) on both desktop (`1600×1000`) and mobile (`390×844`).
- [x] Side-panel reconcilers are decomposed into focused single-responsibility modules so every file in `src/` is `<= 400` lines, and live headless Chrome screenshots verify every subtab visually.
