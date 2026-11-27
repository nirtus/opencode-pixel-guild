import type { TopBarMachineTabViewModel } from "../hud/index.ts";
import { dispatchOperatorModalAction } from "./operator-pairing-controller.ts";
import { getPendingOperatorAction } from "./snapshot-gate.ts";

let stripControlsInitialized = false;
let lastMachineStripSig = "";
let lastActiveMachineId: string | null = null;
let pendingMachineOverflowRaf = false;

export type MachineStripLike = Pick<
  HTMLElement,
  "childElementCount" | "scrollWidth" | "clientWidth" | "scrollLeft"
>;
export type MachineNavBtnLike = {
  classList: { toggle(cls: string, force?: boolean): boolean };
  disabled: boolean;
};
export type MachineWrapLike = {
  classList: { toggle(cls: string, force?: boolean): boolean };
};

export function syncMachineStripOverflowControls(
  strip: MachineStripLike | null,
  prevBtn: MachineNavBtnLike | null,
  nextBtn: MachineNavBtnLike | null,
  wrap: MachineWrapLike | null,
): void {
  const hasMachines = Boolean(strip && strip.childElementCount > 0);
  wrap?.classList.toggle("is-hidden", !hasMachines);
  if (!strip || !hasMachines) {
    prevBtn?.classList.toggle("is-hidden", true);
    nextBtn?.classList.toggle("is-hidden", true);
    return;
  }
  const overflows = strip.scrollWidth > strip.clientWidth + 1;
  prevBtn?.classList.toggle("is-hidden", !overflows);
  nextBtn?.classList.toggle("is-hidden", !overflows);
  if (overflows) {
    if (prevBtn) prevBtn.disabled = strip.scrollLeft <= 1;
    if (nextBtn) {
      nextBtn.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
    }
  }
}

export function scheduleMachineStripOverflowSync(): void {
  if (pendingMachineOverflowRaf || typeof document === "undefined") return;
  pendingMachineOverflowRaf = true;
  const run = () => {
    pendingMachineOverflowRaf = false;
    syncMachineStripOverflowControls(
      document.getElementById("header-machine-strip"),
      document.getElementById("btn-machine-strip-prev") as HTMLButtonElement | null,
      document.getElementById("btn-machine-strip-next") as HTMLButtonElement | null,
      document.getElementById("header-machine-strip-wrap"),
    );
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else run();
}

export function initMachineStripOverflowControls(): void {
  if (stripControlsInitialized || typeof document === "undefined") return;
  stripControlsInitialized = true;

  const machineStrip = document.getElementById("header-machine-strip");
  if (!machineStrip) return;

  const btnPrev = document.getElementById("btn-machine-strip-prev");
  const btnNext = document.getElementById("btn-machine-strip-next");
  btnPrev?.addEventListener("click", () => {
    machineStrip.scrollBy({ left: -180, behavior: "smooth" });
  });
  btnNext?.addEventListener("click", () => {
    machineStrip.scrollBy({ left: 180, behavior: "smooth" });
  });
  machineStrip.addEventListener("scroll", scheduleMachineStripOverflowSync, { passive: true });
  machineStrip.addEventListener(
    "wheel",
    (e) => {
      if (
        machineStrip.scrollWidth > machineStrip.clientWidth + 1 &&
        Math.abs(e.deltaY) > Math.abs(e.deltaX)
      ) {
        e.preventDefault();
        machineStrip.scrollLeft += e.deltaY;
      }
    },
    { passive: false },
  );
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(scheduleMachineStripOverflowSync);
    ro.observe(machineStrip);
    const topBar = document.querySelector(".top-bar");
    if (topBar) ro.observe(topBar);
  }
}

export function reconcileHeaderMachineStrip(
  machineTabs: readonly TopBarMachineTabViewModel[],
  onStateChanged: () => void,
): void {
  const machineStrip = document.getElementById("header-machine-strip");
  if (!machineStrip) return;

  const desiredMachineIds = new Set<string>();
  const existingMachineBtns = new Map<string, HTMLButtonElement>();
  for (const btn of machineStrip.querySelectorAll<HTMLButtonElement>(
    "button[data-machine-switch-id]",
  )) {
    const mid = btn.getAttribute("data-machine-switch-id");
    if (mid) existingMachineBtns.set(mid, btn);
  }

  let activeBtn: HTMLButtonElement | null = null;
  let activeId: string | null = null;
  const sigParts: string[] = [];

  for (const mTab of machineTabs) {
    desiredMachineIds.add(mTab.machineId);
    let mBtn = existingMachineBtns.get(mTab.machineId);
    if (!mBtn) {
      mBtn = document.createElement("button");
      mBtn.type = "button";
      mBtn.className = "btn machine-switch-btn";
      mBtn.setAttribute("data-machine-switch-id", mTab.machineId);
      mBtn.addEventListener("click", () => {
        void dispatchOperatorModalAction(
          "activate-machine",
          { machineId: mTab.machineId },
          onStateChanged,
          null,
        );
      });
      machineStrip.appendChild(mBtn);
    }
    const isSwitching = getPendingOperatorAction() === `activate-machine:${mTab.machineId}`;
    mBtn.disabled = isSwitching;
    mBtn.classList.toggle("active", mTab.isActive);
    const nextText = isSwitching ? "⏳ Switching..." : mTab.buttonText;
    if (mBtn.textContent !== nextText) mBtn.textContent = nextText;
    mBtn.title = mTab.tooltip;
    sigParts.push(`${mTab.machineId}:${mTab.isActive ? 1 : 0}:${nextText}`);
    if (mTab.isActive) {
      activeId = mTab.machineId;
      activeBtn = mBtn;
    }
  }

  for (const [mid, btn] of existingMachineBtns.entries()) {
    if (!desiredMachineIds.has(mid)) btn.remove();
  }

  const stripSig = sigParts.join("|");
  if (stripSig !== lastMachineStripSig) {
    lastMachineStripSig = stripSig;
    scheduleMachineStripOverflowSync();
  }
  if (activeId && activeId !== lastActiveMachineId) {
    lastActiveMachineId = activeId;
    activeBtn?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  } else if (!activeId) {
    lastActiveMachineId = null;
  }
}
