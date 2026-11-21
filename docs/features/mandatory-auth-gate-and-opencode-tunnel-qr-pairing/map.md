# Feature Map: Mandatory Operator Auth Gate (Zero Unauthenticated Visibility) & Native OpenCode Tunnel / QR Barcode Pairing

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Mandatory Operator Auth Gate (Zero Unauthenticated Visibility) & Native OpenCode Tunnel / QR Barcode Pairing](./spec.md) through two parallel, non-blocking vertical-slice tickets:
1. **[01: Mandatory Operator Auth Gate & Zero Unauthenticated Workspace Leakage](./issues/01-mandatory-operator-auth-gate-and-zero-unauthenticated-leakage.md)** (`Blocked by: None`)
2. **[02: Native OpenCode Tunnel (`opencode pair --remote`) `/auth/connect/:code` Redemption & QR Barcode Scanner](./issues/02-opencode-tunnel-pair-redemption-and-qr-barcode-scanner.md)** (`Blocked by: None`)

## Notes

- **Mode**: Design phase complete (`spec.md` and parallel tickets `01..02` published; no production code modified).
- **Domain**: **Operator Auth Gate**, **Guild Operator**, **OpenCode Machine Pairing**, **Project World**, **Workshop Room**.
- **Architecture Review**: [Architecture Review Report (2026-10-26 v3)](../../architecture-review/architecture-review-20261026-v3.html) (`docs/images/architecture-review-20261026-v3.png`).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `opencode`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Architecture Review & Grilling Alignment (2026-10-26 v3)](../../architecture-review/architecture-review-20261026-v3.html): Locked `Q1–Q4` and updated `GLOSSARY.md` with `Operator Auth Gate` and `OpenCode Machine Pairing`.
- [Specification: Mandatory Operator Auth Gate (Zero Unauthenticated Visibility) & Native OpenCode Tunnel / QR Barcode Pairing](./spec.md): Published 15 user stories, 3 implementation decisions, and 3 testing seams.
- [01: Mandatory Operator Auth Gate & Zero Unauthenticated Workspace Leakage](./issues/01-mandatory-operator-auth-gate-and-zero-unauthenticated-leakage.md): Parallel vertical slice locking unauthenticated access behind the full-screen **Operator Auth Gate** with zero host daemon leakage.
- [02: Native OpenCode Tunnel (`opencode pair --remote`) `/auth/connect/:code` Redemption & QR Barcode Scanner](./issues/02-opencode-tunnel-pair-redemption-and-qr-barcode-scanner.md): Parallel vertical slice redeeming `/auth/connect/:code` OpenTunnel links and adding Camera + Image QR Barcode scanning.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and parallel vertical-slice tickets 01..02 -->

## Out of scope

- Unauthenticated guest browsing in production mode.
