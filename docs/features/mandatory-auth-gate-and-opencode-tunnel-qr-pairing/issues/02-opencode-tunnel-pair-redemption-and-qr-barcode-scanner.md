# 02: Native OpenCode Tunnel (`opencode pair --remote`) `/auth/connect/:code` Redemption & QR Barcode Scanner

**What to build:** Native support for connecting remote and local OpenCode V2 machines via `opencode pair --remote` (OpenTunnel) and `opencode pair` one-time links (`https://<tunnel-or-host>/auth/connect/<code>`) and QR barcodes. Pasting or scanning a `/auth/connect/:code` URL automatically calls `GET <origin>/auth/connect/:code` with `Accept: application/json`, exchanges the one-time code for OpenCode's 30-day `{ token }` session password, and pairs the remote machine with zero manual password entry. Includes live `📷 Scan QR with Camera` and `🖼️ Upload / Paste QR Image` barcode scanning plus `opencode pair --remote` CLI instructions inside the **`🔗 OpenCode Machines`** window.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `resolveAndRedeemOpenCodePairing` detects `/auth/connect/:code` URLs (from `opencode pair --remote` OpenTunnel or `opencode pair`), calls `GET <origin>/auth/connect/:code` with `Accept: application/json`, extracts `{ token }`, and returns `<origin>` + `token` as the machine's Basic Auth credential (`opencode:<token>`).
- [x] `POST /api/guild/users/me/machines` and `POST /api/guild/auth/register` accept `/auth/connect/:code` pairing links in `daemonUrl` / `pairingLink` and return a clear 400/401 error message if the one-time code is expired or invalid.
- [x] The **`🔗 OpenCode Machines`** window displays the `opencode pair --remote` CLI quick-start guide, a pairing link / URL input, **`📷 Scan QR with Camera`** (live video viewfinder with `BarcodeDetector` / canvas QR decoding), and **`🖼️ Upload / Paste QR Image`** (decoding QR barcodes from a screenshot/photo file or clipboard paste).
- [x] Automated tests verify `/auth/connect/:code` redemption into a 30-day token, authenticated remote daemon hydration, expired-code error handling, and QR scanner UI controls, with all source files `<= 400` lines.
