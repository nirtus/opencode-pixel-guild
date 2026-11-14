import type { PluginStatusKind } from "../types/domain.ts";

export interface StatusCrystalVisual {
  status: PluginStatusKind;
  colorHex: string;
  effect: "lit-emerald" | "pulsing-amber-lock" | "red-smoke" | "unlit-stone";
  animates: boolean;
  label: string;
}

export const STATUS_PRIORITY: Readonly<Record<PluginStatusKind, number>> = Object.freeze({
  connected: 4,
  needs_auth: 3,
  failed: 2,
  disabled: 1,
});

export function buildStatusCrystal(status: PluginStatusKind): StatusCrystalVisual {
  switch (status) {
    case "connected":
      return {
        status: "connected",
        colorHex: "#10b981",
        effect: "lit-emerald",
        animates: false,
        label: "Connected",
      };
    case "needs_auth":
      return {
        status: "needs_auth",
        colorHex: "#f59e0b",
        effect: "pulsing-amber-lock",
        animates: true,
        label: "Needs Auth",
      };
    case "failed":
      return {
        status: "failed",
        colorHex: "#ef4444",
        effect: "red-smoke",
        animates: true,
        label: "Failed",
      };
    case "disabled":
      return {
        status: "disabled",
        colorHex: "#6b7280",
        effect: "unlit-stone",
        animates: false,
        label: "Disabled",
      };
  }
}
