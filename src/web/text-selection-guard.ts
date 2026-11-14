export function hasActiveTextSelection(containerEl?: unknown): boolean {
  const winSel =
    typeof window !== "undefined" && typeof window.getSelection === "function"
      ? window.getSelection()
      : null;
  const docSel =
    !winSel &&
    typeof document !== "undefined" &&
    typeof document.getSelection === "function"
      ? document.getSelection()
      : null;
  const sel = winSel ?? docSel;
  if (!sel || sel.isCollapsed) return false;
  const text = typeof sel.toString === "function" ? sel.toString().trim() : "";
  if (!text) return false;

  if (
    containerEl &&
    typeof (containerEl as { contains?: unknown }).contains === "function"
  ) {
    const anchor = (sel as { anchorNode?: Node | null }).anchorNode ?? null;
    const focus = (sel as { focusNode?: Node | null }).focusNode ?? null;
    if (anchor || focus) {
      const container = containerEl as { contains: (node: Node | null) => boolean };
      if (container.contains(anchor) || container.contains(focus)) return true;
      const containsNode = (sel as { containsNode?: (node: Node, partial?: boolean) => boolean }).containsNode;
      if (typeof containsNode === "function" && containsNode.call(sel, containerEl as Node, true)) {
        return true;
      }
      return false;
    }
  }
  return true;
}
