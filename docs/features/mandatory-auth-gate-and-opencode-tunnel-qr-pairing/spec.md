# Specification: Mandatory Operator Auth Gate (Zero Unauthenticated Visibility) & Native OpenCode Tunnel / QR Barcode Pairing

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **Unauthenticated Visitors Can See Host Sessions & Projects Without Logging In**: Although User CRUD and login/registration endpoints exist, any unauthenticated browser request without a valid logged-in session token falls back to the companion server's default context, exposing the host machine's auto-discovered **Project Worlds**, **Workshop Rooms**, active characters, and Git working-tree state before login. Furthermore, registering a new account without specifying a URL auto-discovers and attaches the host server's local OpenCode daemon, violating per-user isolation.
2. **Missing Native OpenCode Tunnel (`opencode pair --remote`) & QR Barcode Pairing**: OpenCode V2 connects remote and local machines via `opencode pair --remote` (OpenTunnel) and `opencode pair`, which generate a short-lived, single-use `/auth/connect/:code` URL (e.g., `https://<tunnel-host>/auth/connect/<code>`) and a terminal QR barcode. Calling `GET <origin>/auth/connect/:code` with `Accept: application/json` redeems that one-time code for a 30-day `{ token }` session password (`PairingSession`). Currently, the **OpenCode Machines** pairing window only accepts raw base URLs and manual passwords—pasting an `/auth/connect/:code` tunnel link fails, and there is no camera or image QR barcode scanner to scan the barcode printed by `opencode pair --remote`.

## Solution

1. **Mandatory Operator Auth Gate & Zero Unauthenticated Leakage**:
   - Enforce a strict **Operator Auth Gate**: whenever a browser is not authenticated as a registered **Guild Operator**, `GET /api/guild/users/me` returns `authenticated: false` and `GET /api/guild/snapshot` returns an empty locked snapshot (`0` rooms, `0` characters, `0` project worlds, `0` quest gates).
   - Render a mandatory, non-dismissible full-screen **Operator Auth Gate** (`🔑 Login` / `✨ Register`) whenever `authenticated === false`, hiding the world canvas, top-bar world tabs, and **Spectator Drawer** until the user signs in or registers.
   - Ensure newly registered **Guild Operator** accounts start with **0 paired machines** (an empty, isolated workspace) unless they explicitly supply a pairing link/URL during registration, and immediately guide them to the **`🔗 OpenCode Machines`** pairing window after registration.
   - Ensure clicking `🚪 Logout` clears the session token, wipes client state, and immediately locks the UI back behind the **Operator Auth Gate**.
2. **Native OpenCode Tunnel (`opencode pair --remote`) & QR Barcode Pairing**:
   - Deepen the **OpenCode Machine Pairing** module to natively parse and redeem OpenCode V2 `/auth/connect/:code` pairing links and QR payloads (`https://<tunnel-or-host>/auth/connect/<code>`):
     - The backend extracts `<origin>` and `<code>`, requests `GET <origin>/auth/connect/<code>` with `Accept: application/json`, receives `{ token: "<30-day-session-token>" }`, stores `<origin>` as `daemonUrl` and `<token>` as the Basic Auth password (`opencode:<token>`), and immediately connects the operator's isolated workspace to that remote machine.
   - Add a built-in **QR Barcode Scanner** inside the **`🔗 OpenCode Machines`** window supporting both:
     - **`📷 Scan QR with Camera`**: Opens a live camera viewfinder (`navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`) that scans the QR barcode printed by `opencode pair --remote` and auto-pairs the remote machine.
     - **`🖼️ Upload / Paste QR Screenshot`**: Decodes a QR barcode from an uploaded or pasted image/screenshot of a remote terminal and auto-pairs the machine in one click.

## User Stories

1. As an unauthenticated visitor opening the visualizer, I want to see only the full-screen **Operator Auth Gate** (`🔑 Login` / `✨ Register`), so that no user's **Project Worlds**, **Workshop Rooms**, or sessions are ever visible without logging in.
2. As a **Guild Operator**, I want unauthenticated calls to `/api/guild/snapshot` and `/api/guild/events` to return an empty locked state (`authenticated: false`, `rooms: {}`, `characters: {}`), so that network inspection cannot leak host sessions before login.
3. As a **Guild Operator**, I want the close button (`✕`) and backdrop dismiss on the authentication modal disabled while I am unauthenticated, so that the **Operator Auth Gate** cannot be bypassed without logging in or registering.
4. As a new **Guild Operator** registering an account without an initial pairing link, I want my account created with `0` paired machines and an empty workspace, so that I never inherit someone else's local OpenCode daemon.
5. As a newly registered **Guild Operator**, I want to be taken directly to the **`🔗 OpenCode Machines`** window after registration, so that I can immediately pair my first remote or local OpenCode machine via tunnel link or QR barcode.
6. As a logged-in **Guild Operator** with `0` paired machines, I want the canvas stage to display a clear empty-workspace prompt (`No OpenCode Machine Paired — Click 🔗 Pair OpenCode to scan a QR barcode or paste an opencode pair --remote link`), so that I know why my workspace has no rooms yet.
7. As a logged-in **Guild Operator**, I want clicking `🚪 Logout` in the **Profile & Config** window to immediately clear my session token, wipe the in-memory snapshot, and lock the screen behind the **Operator Auth Gate**.
8. As a **Guild Operator** connecting a remote machine, I want to run `opencode pair --remote` (or `opencode pair`) on that machine and paste the printed `https://<tunnel-or-host>/auth/connect/<code>` link directly into the **`🔗 OpenCode Machines`** window, so that I can pair across the internet via OpenTunnel without configuring ports or typing passwords.
9. As a **Guild Operator**, I want the server to automatically detect `/auth/connect/:code` in my pairing input, call `GET <origin>/auth/connect/:code` with `Accept: application/json`, and exchange the one-time code for OpenCode's 30-day session token (`{ token }`), so that authentication is completely automatic.
10. As a **Guild Operator**, I want clear error feedback if a pasted or scanned `/auth/connect/:code` link has expired (5-minute TTL) or was already used, so that I know to run `opencode pair --remote` again.
11. As a **Guild Operator** on a phone or laptop with a camera, I want to click **`📷 Scan QR with Camera`** in the **`🔗 OpenCode Machines`** window to open a live video viewfinder and scan the QR barcode displayed in my remote terminal by `opencode pair --remote`, so that pairing takes one scan with zero typing.
12. As a **Guild Operator** on a desktop or phone, I want to click **`🖼️ Upload / Paste QR Image`** (or paste an image from my clipboard) to decode a screenshot or photo of the `opencode pair --remote` QR barcode, so that I can pair even without pointing a physical camera at another screen.
13. As a **Guild Operator**, I want the **`🔗 OpenCode Machines`** window to display a concise CLI quick-start box showing `opencode pair --remote` (for remote OpenTunnel connection) and `opencode pair` (for local/SSH connection), so that I always have the exact command at hand.
14. As a **Guild Operator**, I want to be able to pair multiple remote OpenTunnel machines and switch between them in the **`🔗 OpenCode Machines`** window, so that I can monitor and control agents across all my machines from one account.
15. As a **Guild Operator**, I want direct daemon URL + optional password pairing to remain supported alongside `/auth/connect/:code` tunnel links and QR barcodes, so that standalone `opencode serve` instances can also be paired.

## Implementation Decisions

### 1. Mandatory Operator Auth Gate & Unauthenticated Workspace Lock
- Add an `authenticated: boolean` flag to `GET /api/guild/users/me` and `GuildSnapshot`:
  ```ts
  export interface AuthGateStatus {
    readonly authenticated: boolean;
    readonly operatorId: string | null;
    readonly username: string | null;
  }
  ```
- When the server is started with operator authentication enabled (or whenever `X-Guild-Operator-Id` / `?operatorId` does not match an authenticated operator in the registry during browser requests):
  - `GET /api/guild/users/me` returns `{ authenticated: false, operatorId: null, username: null, paired: false, daemonUrl: null, reachable: false, pairedMachines: [] }`.
  - When unauthenticated, `resolveContextForRequest` returns a **locked empty context** whose reducer holds `0` rooms, `0` characters, and `0` quest gates (while preserving backward compatibility for existing unit tests that inject a custom `reducer` or `initialPresetId` without `operatorStorePath` / `requireAuth`).
  - In `POST /api/guild/auth/register`: never call `discoverService()` when `daemonUrl` / `pairingInput` is omitted! A new user who registers without providing a machine pairing starts with `pairedMachines: []` and `0` rooms until they pair their own OpenCode machine.
- On the client:
  - On boot (`connectCompanionBackend`), check `GET /api/guild/users/me`. If `!profile.authenticated`:
    - Set `clientState.isAuthenticated = false`, clear `clientState.currentSnapshot` to an empty snapshot, add `data-auth-locked="true"` to `document.body`, and immediately open `#operator-pairing-modal` on the `🔑 Login` tab in non-dismissible **Operator Auth Gate** mode (hiding the `✕` close button and `🔗 OpenCode Machines` / `👤 Profile & Config` tabs until authenticated).
  - Once `POST /api/guild/auth/login` or `POST /api/guild/auth/register` succeeds, set `clientState.isAuthenticated = true`, remove `data-auth-locked="true"`, and:
    - If `pairedMachines.length === 0`, switch the modal to the **`🔗 OpenCode Machines`** tab so the user can immediately scan a QR barcode or paste their `opencode pair --remote` link.
    - If `pairedMachines.length > 0`, close the modal and hydrate the user's private snapshot and SSE stream.

### 2. OpenCode Tunnel (`/auth/connect/:code`) Redeemer Module
- Build a dedicated **OpenCode Pairing Input Resolver & Redeemer module** with an injectable `fetchImpl` seam:
  ```ts
  export interface ResolvedOpenCodePairing {
    readonly daemonUrl: string;
    readonly daemonPassword?: string;
    readonly redeemedFromCode: boolean;
  }
  ```
- Input formats accepted by `resolveAndRedeemOpenCodePairing(rawInput, passwordFallback, fetchImpl)`:
  1. **Full Pairing Link (`http(s)://<host>/auth/connect/<code>`)**:
     - Parses `origin` (`<protocol>//<host>`) and `code` (`decodeURIComponent(<code>)`).
     - Calls `GET ${origin}/auth/connect/${encodeURIComponent(code)}` with header `Accept: application/json`.
     - Expects HTTP 200 JSON `{ token: string }` (or `{ data: { token: string } }`).
     - Returns `{ daemonUrl: origin, daemonPassword: token, redeemedFromCode: true }`.
     - If HTTP status is not 200 or `token` is missing, throws a descriptive error (`"Pairing link expired or invalid — run 'opencode pair --remote' to generate a fresh link"`).
  2. **Base URL + Separate Pairing Code or Password**:
     - If `passwordFallback` matches a pairing URL or if `rawInput` is a base URL and `pairingCode` is provided, redeems `${baseUrl}/auth/connect/${code}`.
     - Otherwise treats `rawInput` as `daemonUrl` and `passwordFallback` as Basic Auth password.
- Wire `resolveAndRedeemOpenCodePairing` into both `POST /api/guild/users/me/machines` (`daemonUrl` / `pairingLink`) and `POST /api/guild/auth/register` so users can paste an `opencode pair --remote` link or scan a QR barcode anywhere a machine URL is accepted.

### 3. Camera & Image QR Barcode Scanner Module
- Build a dedicated client-side **QR Barcode Scanner module** integrated into the **`🔗 OpenCode Machines`** window:
  - **`📷 Scan QR with Camera`**:
    - Requests `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` and mounts a compact `<video>` preview inside the modal.
    - Uses the browser's `BarcodeDetector({ formats: ["qr_code"] })` (plus a canvas frame analyzer fallback) on animation frames to detect any QR payload containing `http://` or `https://`.
    - As soon as a QR code is detected, stops the camera stream, populates `#machine-url-input` with the decoded `/auth/connect/:code` URL, and automatically submits the pairing request!
  - **`🖼️ Upload / Paste QR Image`**:
    - Provides a file input (`accept="image/*"`) and clipboard `paste` listener that decodes a QR barcode image via `createImageBitmap` / `<canvas>` + `BarcodeDetector` (or QR matrix decoder fallback), populates `#machine-url-input`, and submits the pairing request.

## Testing Decisions

### What Makes a Good Test
- Tests verify external behavior at the HTTP, SSE, and module interfaces using deterministic in-memory and mock-fetch adapters.

### Primary Testing Seams
1. **Operator Auth Gate & Zero-Leakage Seam (`createGuildCompanionServer`)**:
   - Verifies that when `requireAuth: true` (or `operatorStorePath` is configured), unauthenticated `GET /api/guild/users/me` returns `authenticated: false`, unauthenticated `GET /api/guild/snapshot` returns `0` rooms and `0` characters, registering a new user without a URL starts with `pairedMachines: []` and `0` rooms, and logging in unlocks only that user's paired rooms.
2. **OpenCode Tunnel & `/auth/connect/:code` Redemption Seam (`resolveAndRedeemOpenCodePairing` & `POST /api/guild/users/me/machines`)**:
   - Verifies parsing of `https://<tunnel>.opentunnel.dev/auth/connect/<code>` and `http://127.0.0.1:49374/auth/connect/<code>`, verifies `GET <origin>/auth/connect/<code>` with `Accept: application/json`, verifies that the returned `{ token }` is used as `Basic base64("opencode:<token>")` when connecting to the remote daemon, and verifies clear error handling on expired/401 codes.
3. **QR Barcode Scanner & Modal UI Seam (`operator-modal-views.ts` & `qr-barcode-scanner.ts`)**:
   - Verifies rendering of the **Operator Auth Gate** (`data-auth-locked="true"`), the `opencode pair --remote` CLI instructions, the `📷 Scan QR with Camera` and `🖼️ Upload QR Image` controls, and decoding of QR payloads into `/auth/connect/:code` pairing requests.

## Out of Scope

- Unauthenticated guest browsing in production mode.
- Hosting an OpenTunnel relay server inside the visualizer (OpenCode V2 CLI's built-in `opencode pair --remote` already provisions the OpenTunnel endpoint).

## Further Notes

- All source files in `src/` must remain strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- Visual verification via headless Chrome screenshots on port `4310` is mandatory for the unauthenticated **Operator Auth Gate**, the **`🔗 OpenCode Machines`** Tunnel & QR Scanner window, and the authenticated workspace.
