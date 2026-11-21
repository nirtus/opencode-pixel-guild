# 01: Confined Test Sandbox Module Inside `tests/` & Failure-Safe Cleanup

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

How should temporary test files and directories (`test-operator-store-*`, `test-real-git-repo-*`, `test-svc-disc-*`, `test-issue-tracker-*`, `test-empty-proj-*`, `test-wsl-sync-*`, `test-auth-gate-*`, `test-proj-data-*`) be created and cleaned up across the test suite so they never pollute the repository root or leak into Git when an assertion fails, and how should `.gitignore` handle test folders?

## Answer

Confirmed in Grilling Round 1 (`Q2`, `Q3`):
- Create a deep `TestSandbox` module at `tests/test-sandbox.ts` exporting `withTestSandbox(prefix: string, fn: (sandbox: TestSandbox) => Promise<void> | void): Promise<void>`.
- Allocate all temporary test directories strictly inside `tests/.tmp/<prefix>-<random>` (auto-creating `tests/.tmp/` inside `tests/`).
- Wrap the caller callback in an outer `try / finally` block that unconditionally removes `sandbox.dirPath` (`rmSync(sandbox.dirPath, { recursive: true, force: true })`) even when an early assertion throws, and register a `process.once("exit")` cleanup sweep for `tests/.tmp/`.
- Replace all 8 root `mkdtempSync(join(process.cwd(), ...))` / `mkdtempSync(join(PROJECT_ROOT, ...))` call sites across `tests/00`, `tests/08`, `tests/14`, `tests/16`, `tests/17`, and `tests/20` with `withTestSandbox`.
- Add `tests/.tmp/`, `tests/test-*/`, `tests/**/*.sqlite*`, and root `test-*/` to `.gitignore` so all generated test files and folders are ignored by Git while keeping `tests/*.test.ts` tracked.

## Acceptance Criteria

- [x] `tests/test-sandbox.ts` allocates all temporary directories under `tests/.tmp/<prefix>-*` and cleans them up in an outer `try / finally` block plus a `process.once("exit")` sweep.
- [x] All 8 temporary directory allocations in `tests/00`, `08`, `14`, `16`, `17`, and `20` use `withTestSandbox` and never write `test-*` folders into the repository root.
- [x] `.gitignore` includes `tests/.tmp/`, `tests/test-*/`, `tests/**/*.sqlite*`, and `test-*/`, and running `npm test` leaves zero leftover directories in `./` or `tests/.tmp/`.
