# 03: Sticky Bottom Command Scroll Composer & `visualViewport` Virtual Keyboard Adapter

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

Should we dock the **Command Scroll Composer** (`#command-scroll-input` + `📜 Send ↵` + `⏹ Stop`) as a sticky bottom bar inside `.spectator-sidebar` so the primary send action is 100% visible above the fold in `peek` (`50dvh`) and `844×390` landscape states, wire a `window.visualViewport` adapter (`--keyboard-inset-height`) that lifts the composer above the mobile virtual keyboard when focused, and replace `Deselect [Esc]` on mobile with a `44×44px` `✕` button?

## Answer

Locked:
- Dock the **Command Scroll Composer** (`#command-scroll-input` + `📜 Send ↵` + `⏹ Stop`) as a sticky bottom footer inside `.spectator-sidebar` on mobile so the input and `📜 Send ↵` button are always visible above the fold in `peek` (`50dvh`) and `844×390` landscape states.
- Wire a `window.visualViewport` listener (`resize` and `scroll`) that updates `--keyboard-inset-height` on `document.documentElement` and promotes `mobileDrawerState` to `"expanded"` when `#command-scroll-input` or `.gate-custom-input` is focused on mobile (`window.innerWidth <= 960`).
- Replace the desktop `Deselect [Esc]` label on mobile with a `44×44px` `✕` close button, and provide a floating `✕ Exit Cinema` button when `isCinemaMode` is active.
