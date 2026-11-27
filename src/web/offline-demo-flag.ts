const INTRO_DEMO_VALUES = new Set(["intro-tour", "1", "sizzle", "true"]);
const DOCS_SHOWCASE_VALUES = new Set(["docs-showcase", "showcase"]);

function readSearchString(searchStr?: string): string {
  if (typeof searchStr === "string") return searchStr;
  if (typeof window === "undefined") return "";
  return window.location?.search || "";
}

export function isIntroDemoQuery(searchStr?: string): boolean {
  const val = new URLSearchParams(readSearchString(searchStr)).get("demo")?.trim().toLowerCase() ?? "";
  return INTRO_DEMO_VALUES.has(val);
}

export function isDocsShowcaseModeActive(searchStr?: string): boolean {
  const val = new URLSearchParams(readSearchString(searchStr)).get("demo")?.trim().toLowerCase() ?? "";
  return DOCS_SHOWCASE_VALUES.has(val);
}

export function getRequestedDocsShowcaseSceneId(searchStr?: string): string | null {
  if (!isDocsShowcaseModeActive(searchStr)) return null;
  const raw = new URLSearchParams(readSearchString(searchStr)).get("scene")?.trim().toLowerCase() ?? "";
  return raw || "split-chamber";
}

export function isOfflineDemoModeActive(searchStr?: string): boolean {
  return isIntroDemoQuery(searchStr) || isDocsShowcaseModeActive(searchStr);
}
