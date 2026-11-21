# Character Equipment Loadout, OpenCode Tool Belt Inventory, and Zoom-Adaptive Pixel Sprites

Type: prototype
Status: closed
Blocked by: 01, 04

## Architectural Decisions Settled

- **Persistent 4-Slot RPG `Equipment Loadout` + Tool Belt Inventory (`Q1: A`, `Q4: A`)**:
  - Derive four persistent visual equipment slots and a cumulative Tool Belt inventory for every `Guild Adventurer` and `Squad Subagent` from live OpenCode session history (`GET /api/session/{id}/message`, `skillGrimoires`, `childSessionIds`, and `tokens`), where every item explicitly pairs its RPG name with the underlying OpenCode V2 object:
    1. **Headgear (`slot: "headgear"`)**: Class-specific pixel helm/circlet/hood (`build` = Forge Visor Helm, `plan` = Strategist Circlet, `explore` = Pathfinder Hood & Goggles, `general` = Plumed Warden Helm, custom = `Agent.Info.color` Crest) paired with `[agent: <agentClass> · model: <modelId>]`, upgraded with a golden commander crest when `childSessionIds.length > 0`.
    2. **Robes & Armor (`slot: "robes"`, `readinessTier: 0..3`)**: Scales with equipped `Skill Grimoire` count and session tool mastery (*Tier 0 Novice Tunic* $\rightarrow$ *Tier 1 Adept Vestments* $\rightarrow$ *Tier 2 Battlemage Robes & Pauldrons* $\rightarrow$ *Tier 3 Grand Artificer Regalia with Flowing Cape*), paired with `[skills: <skillIds> · <N> tool calls]`.
    3. **Main-Hand Weapon / Implement (`slot: "mainHand"`)**: Visually held in the character's right hand based on their active or signature `Workstation` and paired with the exact OpenCode tool command & argument preview:
       - `Anvil Forge` (`shell`, `edit`, `write` build) $\rightarrow$ **Runic Forge Hammer** `[tool: shell / edit / write]`
       - `Archive Radar` (`read`, `glob`, `grep`) $\rightarrow$ **Seeker Spyglass & Astrolabe** `[tool: read / glob / grep]`
       - `Drafting Table` (file edits/specs) $\rightarrow$ **Architect's Golden Quill** `[tool: edit / write / read]`
       - `Arcane Lectern` (`skill`) $\rightarrow$ **Arcane Grimoire Staff** `[tool: skill]`
       - `Reactor Console` (`execute`, `subagent`) $\rightarrow$ **Voltaic Code Scepter** `[tool: execute / subagent]`
       - `Comms Dish` (`webfetch`, `websearch`) $\rightarrow$ **Astral Signal Wand** `[tool: webfetch / websearch]`
    4. **Off-Hand Relic (`slot: "offHand"`) & Tool Belt (`toolBelt`)**: Floating **`Skill Grimoire` Codex**, **Squad Commander Banner**, or **Wayfinder Lantern** in the left hand, plus a persistent `toolBelt` array recording every OpenCode tool executed in the session (`toolName`, `workstation`, `count`, `lastInputPreview`).
- **Detail Level Adaptation Between All-Rooms Overview and Single-Room View (`Q2: A`)**:
  - **All Rooms (`roomFilter === "ALL"`)**: Clean, compact overview level of detail so all active `Workshop Room`s fit comfortably on the `Guild Floorplan`.
  - **Specific Room (`roomFilter !== "ALL"`)**: Auto-fit the selected `Workshop Room` to fill the available screen space (`tileScale` expanded dynamically to viewport bounds) and render full `24 × 24` multi-layer pixel-art character sprites (boots, tiered robes, pauldrons, flowing cape, held weapon/implement, off-hand tome/relic, facial eyes, headgear) and detailed pixel-art `Workstation` furniture with explicit OpenCode tool sub-labels.
