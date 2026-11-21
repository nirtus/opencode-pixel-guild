# 02: Two-Row Universal Top-Bar Header, Dedicated Project World Row & Dynamic Viewport Sizing

**What to build:** Restructure the spectator top header universally across desktop and mobile into a two-row layout reconciled through a single top-bar view-model seam—placing Brand and compact consolidated **OpenCode Machine Pairing**, **Guild Operator**, and action controls on Row 1, and placing `WORLDS:` and all **Project World** switcher buttons on their own dedicated full-width (`100%`) Row 2—while replacing hardcoded viewport pixel offsets with live container bounding-box measurements so **Project World** buttons are never half-hidden and the **Guild Floorplan** scales dynamically.

**Blocked by:** 01: Canonical Project World Resolution & Roster-Aware Session Counting Seam

**Status:** resolved

- [x] A single pure top-bar view-model builder produces the complete header state for Row 1 (consolidated connection status-dot pill with full daemon/adapter tooltip, compact `👤 <username>` account pill without `(Profile Settings)`, roster and style toggle button labels, and status summaries) and Row 2 (**Project World** tabs with session counts).
- [x] On both desktop and mobile viewports, Row 1 displays the brand crest/title and compact right-hand controls (with ellipsis truncation on connection and operator pills), and Row 2 gives `WORLDS:` (`#room-filter-buttons`) a dedicated `100%`-width horizontal row so **Project World** buttons never compete with right-hand controls.
- [x] The top-bar reconciler is the sole writer for `<header class="top-bar">`, eliminating out-of-band top-bar button text mutations and keeping `Roster` and `Style` button labels synchronized with client state.
- [x] Camera and canvas viewport sizing contain zero hardcoded header pixel offsets (`vh - 76` / `vh - 104`), measuring the live world container dynamically.
- [x] Automated tests and a headless Chrome visual capture at `1600×1000` verify that **Project World** buttons (`🏰 opencode-game-visualizer (1)`) render 100% unclipped on their dedicated second row when logged in with a paired machine, with all source files `<= 400` lines.
