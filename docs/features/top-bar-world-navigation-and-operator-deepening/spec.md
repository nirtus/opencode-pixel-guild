# Specification: Two-Row Universal Top-Bar Navigation, Canonical Project World Seam & Deepened Guild Operator Architecture

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **Desktop `Project World` Buttons Half-Hidden by Single-Row Controls**: When a **Guild Operator** logs in and pairs an **OpenCode Machine Pairing** target, the top navigation header packs the brand identity, **Project World** switcher, and seven unshrinkable operator/adapter controls onto a single non-wrapping horizontal row. Duplicate pairing indicators (a daemon URL badge and a verbose machine-label button that both open the exact same modal) plus an untruncated operator profile button (`👤 <username> (Profile Settings)`) consume nearly the entire desktop width, leaving only a few dozen pixels for the **Project World** switcher and cutting project buttons off mid-word (or collapsing them to zero width on narrower desktop viewports).
2. **Hardcoded Viewport Pixel Offsets**: The world canvas and camera fallback dimensions rely on hardcoded header pixel offsets rather than measuring the live layout container dynamically, making the viewport brittle whenever the header height changes.
3. **Fragmented `Project World` Matching & Overridden Session Counts**: Canonical project-root matching, persisted project selection fallback, and session-count badge calculations are duplicated across four separate spatial, persistence, and header modules. The spatial layout module computes a room-based count that the top-bar reconciler ignores and overrides with its own private session filter, while the HUD header strip builds unused room filter buttons.
4. **Hardcoded Modal Bindings & Dropped `Guild Operator` Preferences**: Client-side **Guild Operator** state is split between global client state and module-private variables, binds modal controls via sixteen hardcoded element identifiers, and drops server-persisted operator preferences (`selectedProjectId`, `selectedRoomId`, `rosterMode`, `visualStyleMode`, and **Spectator Drawer** subtab selections) upon login or boot.
5. **Leaky Server Route Handlers for `Guild Operator` & `OpenCode Machine Pairing`**: Server HTTP route handlers reach directly into operator runtime structures, duplicating pairing link/QR code redemption, active-machine loop resets, and synchronization between top-level profile status fields and the `pairedMachines` collection across four separate endpoints.

## Solution

1. **Two-Row Universal Top-Bar Header & Dynamic Viewport Sizing**:
   - Restructure the spectator top header universally across desktop and mobile into two dedicated rows reconciled through a single top-bar view-model seam:
     - **Row 1 (Top Identity & Operator Strip)**: Displays the brand crest and title on the left and compact consolidated controls on the right—merging the duplicate daemon badge and pairing button into a single status-dot **OpenCode Machine Pairing** pill (`🟢 🔗 <Machine Label>`, truncated with ellipsis and full connection details in its tooltip), compacting the **Guild Operator** account pill to `👤 <username>` (without the `(Profile Settings)` suffix, truncated with ellipsis), and rendering the summon, refresh, roster-mode, and visual-style controls.
     - **Row 2 (Dedicated `Project World` Navigation Strip)**: A full-width (`100%`) horizontal row dedicated exclusively to `WORLDS:` and the **Project World** buttons (`🏰 <projectName> (<sessionCount>)`), ensuring **Project World** buttons never compete with operator or machine controls on any screen width.
   - Replace hardcoded viewport pixel offsets with dynamic CSS Grid sizing and live container bounding-box measurements so the **Guild Floorplan** adapts automatically to the two-row header.
2. **Canonical `Project World` Resolution & Session Counting Seam**:
   - Deepen the **Project World** spatial layout module so canonical project-root grouping, fuzzy/persisted project selection matching, active room filtering, and roster-aware session counting (`Active Squads` vs `Full Lineage`) live behind a single seam shared by the **Guild Floorplan** and the top-bar reconciler, retiring all duplicated project-matching helpers and unused room filter button builders.
3. **Universal Client `Guild Operator` Session, Declarative Modal Delegation & Preference Sync**:
   - Deepen the client **Guild Operator** session module behind a universal interface that replaces hardcoded modal element selectors with declarative action and form-data delegation, hydrates all persisted **Guild Operator** preferences into client state on login and boot (respecting explicit URL query overrides), persists any preference change through one universal helper, and provides a single authenticated request seam.
4. **Deep Server `OperatorWorkspaceRegistry` Domain Seam**:
   - Deepen the server operator workspace registry so its interface owns operator registration, authentication, profile/preference updates, and **OpenCode Machine Pairing** redemption, activation, and removal—centralizing pairing redemption and single-active-machine invariants inside the registry and reducing the HTTP route handler module to a thin transport adapter.

## User Stories

1. As a **Guild Operator** on a desktop screen, I want the **Project World** switcher buttons (`WORLDS: 🏰 <projectName> (<sessionCount>)`) rendered on their own dedicated full-width second row in the top header, so that project names and session counts are never clipped or half-hidden by account or machine controls.
2. As a **Guild Operator** on a mobile or tablet screen, I want the same universal two-row header structure (Row 1 for identity and operator/machine actions, Row 2 for **Project World** tabs), so that navigation behaves consistently across all devices.
3. As a **Guild Operator** with multiple open projects, I want the dedicated **Project World** row to span 100% of the header width and scroll horizontally when tabs exceed the viewport, so that I can switch between any number of **Project Worlds** cleanly.
4. As a **Guild Operator**, I want the duplicate daemon status pill and machine pairing button consolidated into a single compact connection button (`🟢 🔗 <Machine Label>`) on Row 1, so that the header has one unambiguous control for **OpenCode Machine Pairing**.
5. As a **Guild Operator**, I want hovering over the consolidated connection button to reveal the full connected daemon URL and active adapter mode in a tooltip, so that technical telemetry remains accessible without consuming permanent horizontal width.
6. As a **Guild Operator** whose paired machine is unreachable or unpaired, I want the consolidated connection button to reflect the current reachability status visually, so that I can spot connection issues at a glance.
7. As a **Guild Operator**, I want the account button on Row 1 to display `👤 <username>` without the verbose `(Profile Settings)` suffix and with ellipsis truncation for long usernames, so that Row 1 stays compact on every screen size.
8. As a **Guild Operator**, I want a single top-bar reconciler pass to update the connection pill, account pill, roster toggle label, visual style toggle label, status summary, and **Project World** tabs together, so that header controls never flicker or fall out of sync.
9. As a **Guild Operator**, I want the **Guild Floorplan** canvas and **Chamber Focus Mode** camera framing to measure the live world container bounds dynamically with zero hardcoded header pixel offsets, so that adding the dedicated **Project World** row never clips or misaligns the canvas.
10. As a **Guild Operator**, I want the session count badge on each **Project World** button (`🏰 <projectName> (<sessionCount>)`) to be computed by the same canonical **Project World** layout seam that places **Workshop Rooms** on the **Guild Floorplan**, so that top-bar counts and floorplan rooms never diverge.
11. As a **Guild Operator** viewing in `Active Squads` roster mode, I want each **Project World** tab badge to show the count of actively open sessions in that project (with a floor of `1` when the project has resting sessions), so that active work stands out clearly.
12. As a **Guild Operator** toggling to `Full Lineage` roster mode, I want each **Project World** tab badge and the `Roster` button label to immediately reflect the total session count across that project's root and worktrees.
13. As a **Guild Operator** refreshing the page or sharing a deep link with `?project=<id>`, I want canonical project selection matching to resolve exact IDs, normalized directory paths, or project name suffixes through one shared **Project World** seam.
14. As a **Guild Operator** logging into my account from a fresh browser session, I want all of my saved preferences (`selectedProjectId`, `selectedRoomId`, `rosterMode`, `visualStyleMode`, `activeDrawerTab`, `activeHeroSubtab`, and `activeLedgerSubtab`) automatically hydrated into the visualizer upon login and boot, so that my workspace restores to my exact preferred state.
15. As a **Guild Operator** opening a URL with an explicit `?project=` query parameter while logged in, I want the explicit URL parameter to take precedence over my saved `selectedProjectId` preference, so that deep links always open the requested **Project World**.
16. As a **Guild Operator** toggling roster mode, visual style mode, active **Project World**, or **Spectator Drawer** subtabs, I want those changes persisted universally through one operator preference synchronization seam.
17. As a maintainer, I want all interactive forms and buttons inside the **Guild Operator** and **OpenCode Machine Pairing** modals to dispatch through a universal declarative `data-operator-action` and form-data contract rather than sixteen hardcoded DOM element IDs, so that modal views and controller logic are decoupled and testable.
18. As a maintainer, I want all authenticated client HTTP requests and SSE connections to attach operator identity through one shared session seam, eliminating ad-hoc inline header construction.
19. As a maintainer, I want the server's operator workspace registry to own operator registration, login verification, profile/preference updates, and **OpenCode Machine Pairing** lifecycle operations behind a single domain interface, so that HTTP route handlers act purely as a transport adapter.
20. As a **Guild Operator** pairing, switching, or deleting an **OpenCode Machine Pairing** entry, I want the server registry to enforce in one place that at most one machine is active (`isActive: true`) and that top-level operator connection status fields are always derived from the active machine record.

## Implementation Decisions

1. **Unified Top-Bar View-Model & Two-Row Header Seam**:
   - Introduce a single pure top-bar view-model builder in the HUD module that accepts the current guild snapshot, client view state, and authenticated **Guild Operator** profile, returning the complete state for both header rows:
     - Row 1 state: consolidated connection pill (`label`, `tooltip`, `status`), operator account pill (`label`, `tooltip`, `authenticated`), roster toggle button text and active state, visual style toggle button text and active state, and status summary text.
     - Row 2 state: world navigation label (`Worlds:` or `Rooms:`) and the list of **Project World** tabs with their active selection flags and session counts.
   - Update the top-bar DOM reconciler so it is the sole writer for `<header class="top-bar">`, removing out-of-band button text mutations from the operator pairing controller.
   - Style `<header class="top-bar">` universally as a two-row container on both desktop and mobile: Row 1 houses the brand and compact right-hand controls (with `max-width` and `text-overflow: ellipsis` on the connection and operator pills), and Row 2 houses `#room-filter-buttons` at `100%` width (`flex: 1 1 100%`) with horizontal overflow scrolling.
2. **Dynamic Container-Measured Viewport Sizing**:
   - Remove hardcoded header pixel deductions from the camera and pointer sizing logic. Measure the live world section / canvas container bounding rectangle (`getBoundingClientRect()`) and rely on CSS Grid (`grid-template-rows: auto minmax(0, 1fr)`) so any header height is handled automatically.
3. **Canonical `Project World` Resolution & Session Counting**:
   - Consolidate canonical project root extraction, worktree grouping, candidate `selectedProjectId` matching, active project room filtering, and roster-aware session counting (`active-squads` vs `full-lineage`) inside the spatial **Project World** module.
   - Have client state, persistence, and the top-bar reconciler call the canonical **Project World** module rather than maintaining separate directory-matching loops, and remove the dead room-filter button array from the HUD header strip view-model.
4. **Universal Client `Guild Operator` Session & Declarative Modal Contract**:
   - Replace the sixteen hardcoded `#id` selectors coupling the operator modal view templates and controller with a universal `data-operator-action` attribute and standard named `<form>` inputs read via `FormData`.
   - Store operator authentication and profile state coherently with client state and provide a universal preference synchronization seam that hydrates all persisted `GuildOperatorPreferences` fields on login/boot (yielding to explicit URL `?project=` parameters when present) and persists preference updates back to the server.
5. **Deep Server `OperatorWorkspaceRegistry` Domain Interface**:
   - Expand the server operator workspace registry interface with domain methods for registering operators, authenticating credentials, reading and updating operator profiles/preferences, and pairing, activating/updating, or removing **OpenCode Machine Pairing** records.
   - Centralize pairing link / QR URL redemption (`resolveAndRedeemOpenCodePairing`), single-active-machine enforcement, and derivation of top-level profile connection fields (`paired`, `daemonUrl`, `reachable`, `lastSyncedAtMs`, `errorMessage`) inside the registry so the HTTP route module contains zero direct map or array mutations.

## Testing Decisions

- **What Makes a Good Test**:
  - Tests exercise external behavior through each module's public interface (view-model outputs, canonical **Project World** layout and tab outputs, client preference hydration and declarative action dispatch, and server registry domain methods / HTTP endpoints) rather than asserting on private internal helpers or hardcoded DOM IDs.
- **Primary Testing Seams & Modules to Test**:
  1. **Spatial `Project World` Seam**: Test `layoutProjectWorld` with multi-project snapshots, git worktrees, fuzzy/persisted `selectedProjectId` values, and both `active-squads` and `full-lineage` roster modes to verify tab session counts and active room filtering.
  2. **HUD Top-Bar View-Model & Reconciler Seam**: Test the unified top-bar view-model builder and reconciler across unauthenticated, logged-in unpaired, and logged-in paired states (including long usernames and machine labels) to verify consolidated Row 1 badges and full Row 2 **Project World** tab labels.
  3. **Client `Guild Operator` Session & Preference Sync Seam**: Test universal preference hydration on login/boot, URL `?project=` override precedence, and declarative `data-operator-action` modal handling.
  4. **Server `OperatorWorkspaceRegistry` Seam**: Test operator registration, login, preference updates, pairing link redemption, active machine switching, and machine deletion directly through the registry interface as well as through the HTTP adapter routes.
- **Prior Art in the Codebase**:
  - Spatial & Project World isolation tests in `tests/03-floorplan-layout.test.ts` and `tests/09-choreography-and-project-isolation.test.ts`.
  - HUD view-model and responsive layout tests in `tests/05-spectator-hud-and-simulator.test.ts` and `tests/14-mobile-ux-best-practices.test.ts`.
  - Guild Operator authentication, preferences, and OpenCode pairing tests in `tests/16-user-auth-station-choreography-and-live-git.test.ts` and `tests/17-mandatory-auth-gate-and-opencode-tunnel-qr-pairing.test.ts`.
  - Filesystem 400-line ceiling invariant test in `tests/00-architecture-invariants.test.ts`.

## Out of Scope

- Modifying indoor **Workshop Room** station coordinates, character sprite matrices, or **Dungeon Wilds** combat mechanics.
- Changing the cryptographic password hashing algorithm or the on-disk JSON persistence format for existing **Guild Operator** records.

## Further Notes

- Every source file must remain strictly `<= 400` lines as enforced by the architecture invariants test suite.
- Visual verification must capture a live headless Chrome screenshot at `1600×1000` confirming that Row 1 displays the consolidated operator and machine controls and Row 2 displays the full, unclipped **Project World** buttons (`WORLDS: 🏰 opencode-game-visualizer (1)`).
