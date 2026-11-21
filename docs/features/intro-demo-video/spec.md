# Feature Specification: Introduction Demo Video & Showcase Director (`intro-demo-video`)

Status: `ready-for-agent`

## 1. Problem & Goal

Visitors landing on the GitHub repository or YouTube channel need an immediate, high-impact visual introduction to **OpenCode Pixel Guild Visualizer** that demonstrates how live OpenCode V2 sessions, projects, tools, skills, subagents, and debugging hunts come alive inside the 2D **Workshop Room** and **Dungeon Wilds**.

This feature delivers:
1. **In-Memory Client-Side Intro Demo Director (`?demo=intro-tour`)**: A deterministic 35-second (1,050 frames @ 30 FPS) 4-scene choreography and HUD callout director in `src/web/` that runs entirely in browser memory with zero mutation to `./data/`.
2. **Synchronized RPG Chapter & Callout Overlay Banner**: A crisp canvas-painted title and lower-third callout banner system mapping OpenCode V2 actions to Pixel Guild visuals (muted-friendly for GitHub `README.md` and clear on YouTube).
3. **Dockerized Headless Capture & Encoding Pipeline (`npm run demo:video`)**: A reproducible frame-accurate capture pipeline that steps `?demo=intro-tour` at `1920×1080` (30 FPS) and encodes:
   - `docs/video/opencode-pixel-guild-intro.mp4` (1080p 30 FPS H.264 YouTube video)
   - `docs/images/opencode-pixel-guild-intro-preview.gif` (animated preview embedded at the top of `README.md`)
   - `docs/video/youtube-publish-guide.md` (YouTube title, description, tags, and `00:00` chapter timestamps)

---

## 2. 4-Scene 35-Second Sizzle Storyboard (`30 FPS`, `1,050 Frames`)

| Scene | Time Window | Frame Range | Chamber Focus | Key Choreography & OpenCode → Pixel Guild Callout |
| :--- | :--- | :--- | :--- | :--- |
| **Scene 1: Guild Arrival & Multi-Project Heraldry** | `0:00–0:08` | `0..239` | `workshop` (`🏰 Room`) | Root sessions enter through the **South Swinging Guild Door** wearing distinct **Project Heraldry** uniforms and `[CREST TAG]` nameplates, fan out around the central **Goal Assembly Site**, and highlight with a **World Focus Aura**. |
| **Scene 2: Autonomous Preparation Stations & Resource Cargo** | `0:08–0:18` | `240..539` | `workshop` (`🏰 Room`) | Heroes execute tools across **Library Study Bookshelf** (`read`/`grep`), **Observatory Spyglass** (`websearch`), **Resource Stockpile** → **Crafting Workbench** (`edit` + **Resource Cargo** hauling), and **Anvil Forge** (`bash` hammer & tongs). |
| **Scene 3: Skill Grimoires & Squad Subagent Summoning** | `0:18–0:26` | `540..779` | `workshop` (`🏰 Room`) | Parent hero equips a **Skill Grimoire** at the **Armory Wardrobe**, casts a **Summoning Ritual** at the **Arcane Lectern** pentagram (`(206, 624)`), and spawned **Squad Subagents** emerge to fit **Assembly Parts** onto the rising **Goal Assembly Site** and deliver a **Report Scroll**. |
| **Scene 4: Dungeon Wilds Bug Hunt & Victory** | `0:26–0:35` | `780..1049` | `split` (`0:26–0:29`) → `wilds` (`0:29–0:35`) | Diagnostic searches pulse **Lantern Flares** through **Fog of War** while `WARRIOR`, `MAGE`, `SCOUT`, and `SAPPER` heroes engage **Bug Monsters** with role-specific **Combat Weapon Archetypes** until tests pass and monsters shatter into victory crystals. |

---

## 3. Technical Design & Module Boundaries

1. **`src/web/intro-demo-timeline.ts` (`<= 300 lines`)**:
   - Pure data and state builder defining the 4 scenes (`INTRO_DEMO_SCENES`), callout banner descriptors (`IntroDemoBannerSpec`), and deterministic snapshot/choreography state progression for any elapsed time `elapsedMs` (`0..35_000`).
2. **`src/web/intro-demo-director.ts` (`<= 300 lines`)**:
   - Detects `?demo=intro-tour` (or `?demo=1`), configures full-bleed canvas mode (`clientState.isGamemasterCollapsed = true`), exposes `window.__stepIntroDemoFrame(elapsedMs)` for deterministic frame-by-frame capture in headless Chromium, advances smoothly in real time during interactive browser playback, and paints the RPG chapter header + OpenCode-to-Pixel-Guild callout overlay banner onto the 2D canvas.
3. **`src/server/static-router.ts`**:
   - Serves `/docs/video/opencode-pixel-guild-intro.mp4` and `/docs/images/opencode-pixel-guild-intro-preview.gif` cleanly over HTTP if requested.
4. **Automated Capture & Test Verification**:
   - `tests/41-intro-demo-video-director.test.ts` verifies the 4-scene timeline, callout banners, full-bleed layout configuration, and presence/integrity of the generated video and `README.md` embed assets.
