# YouTube & Repository Publish Guide (`opencode-pixel-guild-intro.mp4`)

## 1. Rendered Video Artifacts

| Artifact | Path | Resolution / Format | Target Use |
| :--- | :--- | :--- | :--- |
| **1080p YouTube Master Video** | [`docs/video/opencode-pixel-guild-intro.mp4`](./opencode-pixel-guild-intro.mp4) | `1920×1080` · `30 FPS` · `H.264 (yuv420p)` · `35s` | Direct upload to YouTube, GitHub Releases / PR video embeds, and high-res repository link. |
| **Animated README Preview** | [`docs/images/opencode-pixel-guild-intro-preview.gif`](../images/opencode-pixel-guild-intro-preview.gif) | `920×518` · `2x Speed Loop` · `GIF` | Inline auto-playing animated hero preview at the top of `README.md`. |
| **Live Browser Replay URL** | `http://127.0.0.1:4310/?demo=intro-tour` | Live 30 FPS HTML5 Canvas | Interactive in-memory showcase tour inside the running visualizer container. |

To regenerate both the 1080p MP4 and the animated GIF preview at any time against the running Docker container:

```bash
npm run demo:video
```

---

## 2. Ready-to-Paste YouTube Title, Description & Chapters

### YouTube Title

```text
OpenCode Pixel Guild Visualizer — Live 2D RPG Workshop & Dungeon Companion for OpenCode V2
```

### YouTube Description (with Chapter Timestamps)

```text
OpenCode Pixel Guild Visualizer turns live OpenCode V2 hosts, projects, Git worktrees, root sessions, subagents, tool executions, @skill grimoires, and debugging hunts into an interactive 2D RPG Workshop Room and Dungeon Wilds.

⏱️ Chapters:
00:00 Act I — Unified Workshop Room, Project Heraldry & World Focus Aura
00:08 Act II — Autonomous Preparation Stations & Resource Cargo Hauling
00:18 Act III — Skill Grimoires, Arcane Lectern Subagent Summoning & Goal Assembly
00:26 Act IV — Dungeon Wilds Lantern Flares & Bug Monster Combat

⚔️ OpenCode V2 → Pixel Guild Mapping:
• Root Session → Guild Adventurer (Warrior, Mage, Scout, Alchemist, Cleric, Sapper)
• Projects & Worktrees → Project Heraldry Uniforms, [CREST TAG] Nameplates & World Focus Aura
• Tool Calls → Specialized Preparation Stations (Library Bookshelf, Spyglass, Workbench, Anvil Forge, Alchemy Lab)
• MCP & Plugins → Resource Stockpile Cargo Hauling
• @skill Attachments → Off-Hand Skill Grimoires Equipped at the Armory Wardrobe
• Subagent / Task Tool → Pentagram Summoning Ritual at the Arcane Lectern & Report Scroll Delivery
• Failing Tests & Debugging → Dungeon Wilds Lantern Flares & Real-Time Bug Monster Combat
```

### Suggested YouTube Tags

```text
OpenCode, OpenCode V2, AI Coding Agent, Pixel Guild, Developer Tools, 2D RPG Visualizer, Coding Companion, HTML5 Canvas, TypeScript, Autonomous Agents
```
