import { escapeHtml } from "../hud/spectator-hud.ts";
import { resolveProjectHeraldry } from "../spatial/index.ts";
import type { CharacterState, GuildSnapshot } from "../types/domain.ts";
import { hasCharacterUnviewedResult, isCharacterWaitingAtGate } from "./client-state.ts";
import { resolveCharacterDisplayBadge } from "./station-and-workflow-routing.ts";

const MAX_ROSTER_TREE_DEPTH = 3;

export interface RosterTreeNode {
  readonly character: CharacterState;
  readonly isSubagent: boolean;
  readonly isDetached: boolean;
  readonly depth: number;
  readonly children: RosterTreeNode[];
}

export function isRosterSubagent(c: CharacterState): boolean {
  return Boolean(c.parentId || c.parentSessionId || c.role === "Squad Subagent");
}

function resolveParentSessionId(c: CharacterState): string | null {
  return c.parentId || c.parentSessionId || null;
}

function isNodeInParentCycle(
  startId: string,
  byId: ReadonlyMap<string, CharacterState>,
): boolean {
  const seen = new Set<string>([startId]);
  let current = byId.get(startId);
  while (current) {
    const parentId = resolveParentSessionId(current);
    if (!parentId || !byId.has(parentId)) return false;
    if (parentId === startId) return true;
    if (seen.has(parentId)) return false;
    seen.add(parentId);
    current = byId.get(parentId);
  }
  return false;
}

export function buildRosterTree(chars: readonly CharacterState[]): RosterTreeNode[] {
  const byId = new Map<string, CharacterState>();
  const uniqueChars: CharacterState[] = [];
  for (const ch of chars) {
    if (!byId.has(ch.sessionId)) {
      byId.set(ch.sessionId, ch);
      uniqueChars.push(ch);
    }
  }

  const childrenByParent = new Map<string, CharacterState[]>();
  const roots: Array<{ character: CharacterState; isDetached: boolean }> = [];

  for (const ch of uniqueChars) {
    const parentId = resolveParentSessionId(ch);
    const hasValidParent =
      Boolean(parentId && parentId !== ch.sessionId && byId.has(parentId)) &&
      !isNodeInParentCycle(ch.sessionId, byId);
    if (hasValidParent && parentId) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(ch);
      childrenByParent.set(parentId, list);
    } else {
      roots.push({
        character: ch,
        isDetached: isRosterSubagent(ch),
      });
    }
  }

  const visited = new Set<string>();
  const buildNode = (
    ch: CharacterState,
    depth: number,
    isDetached: boolean,
    ancestors: Set<string>,
  ): RosterTreeNode | null => {
    if (visited.has(ch.sessionId) || ancestors.has(ch.sessionId)) return null;
    visited.add(ch.sessionId);
    ancestors.add(ch.sessionId);

    const nextDepth = Math.min(depth + 1, MAX_ROSTER_TREE_DEPTH);
    const childNodes: RosterTreeNode[] = [];
    for (const child of childrenByParent.get(ch.sessionId) ?? []) {
      const built = buildNode(child, nextDepth, false, ancestors);
      if (built) childNodes.push(built);
    }

    ancestors.delete(ch.sessionId);
    return {
      character: ch,
      isSubagent: isRosterSubagent(ch),
      isDetached,
      depth,
      children: childNodes,
    };
  };

  const result: RosterTreeNode[] = [];
  for (const root of roots) {
    const built = buildNode(root.character, 0, root.isDetached, new Set<string>());
    if (built) result.push(built);
  }
  for (const ch of uniqueChars) {
    if (visited.has(ch.sessionId)) continue;
    const built = buildNode(ch, 0, isRosterSubagent(ch), new Set<string>());
    if (built) result.push(built);
  }

  return result;
}

function renderRosterRowButtonHtml(
  node: RosterTreeNode,
  hasBugs: boolean,
  snapshot: GuildSnapshot,
): { buttonHtml: string; partyKey: string } {
  const ch = node.character;
  const heraldry = resolveProjectHeraldry(ch, snapshot);
  const badge = resolveCharacterDisplayBadge(ch, hasBugs);
  const wfClass =
    badge.workflowIntent === "debugging-hunt"
      ? "val-red"
      : badge.workflowIntent === "information-gathering"
        ? "val-sky"
        : "val-gold";
  const wfBadge = `<span class="${wfClass}">${badge.workflowShortLabel}</span>`;
  const gateTag = isCharacterWaitingAtGate(ch)
    ? `<span class="roster-gate-tag">[${escapeHtml(ch.questGate?.marker || "?")}] </span>`
    : hasCharacterUnviewedResult(ch)
      ? `<span class="roster-gate-tag">[${ch.turnOutcome === "failed" || ch.errorState ? "⚠️" : ch.turnOutcome === "interrupted" ? "⏹" : "✓"}] </span>`
      : "";
  const projTag = `<span class="roster-project-pill" data-herald-party="${escapeHtml(heraldry.partyKey)}">[${escapeHtml(heraldry.crestIcon)} ${escapeHtml(heraldry.shortTag)}]</span>`;
  const titleText = escapeHtml(ch.title || ch.sessionId);

  let btnClass = "btn roster-row-btn";
  let titlePrefix: string;
  if (node.isSubagent) {
    const subClass = (ch.agentClass || "").trim() || "sub";
    const subBadge = `<span class="roster-subagent-badge">✦ ${escapeHtml(subClass)}</span>`;
    if (node.isDetached) {
      btnClass = "btn roster-row-btn roster-row-subagent is-detached";
      titlePrefix = `${projTag} ${subBadge} `;
    } else {
      btnClass = "btn roster-row-btn roster-row-subagent";
      titlePrefix = `${subBadge} `;
    }
  } else {
    titlePrefix = `${projTag} ⚔️ `;
  }

  const buttonHtml = `<button type="button" class="${btnClass}" data-select-session="${escapeHtml(ch.sessionId)}"><span class="roster-row-title">${titlePrefix}${gateTag}${titleText}</span><span class="roster-row-meta">${wfBadge} · ${escapeHtml(badge.overheadVerb)}</span></button>`;
  return { buttonHtml, partyKey: heraldry.partyKey };
}

function renderRosterChildrenHtml(
  children: readonly RosterTreeNode[],
  parentPartyKey: string,
  hasBugs: boolean,
  snapshot: GuildSnapshot,
): string {
  if (children.length === 0) return "";
  const branchesHtml = children
    .map((child, idx) => {
      const isLast = idx === children.length - 1;
      const { buttonHtml } = renderRosterRowButtonHtml(child, hasBugs, snapshot);
      const grandChildrenHtml = renderRosterChildrenHtml(child.children, parentPartyKey, hasBugs, snapshot);
      return `<div class="roster-tree-branch${isLast ? " is-last" : ""}" data-roster-depth="${child.depth}"><div class="roster-tree-row-wrap">${buttonHtml}</div>${grandChildrenHtml}</div>`;
    })
    .join("");
  return `<div class="roster-tree-children" data-herald-party="${escapeHtml(parentPartyKey)}">${branchesHtml}</div>`;
}

export function renderCharacterRosterRowsHtml(
  chars: readonly CharacterState[],
  hasBugs: boolean,
  snapshot: GuildSnapshot,
): string {
  if (chars.length === 0) {
    return `<div class="muted-empty-text">No active sessions in this room.</div>`;
  }
  const tree = buildRosterTree(chars);
  return tree
    .map((root) => {
      const { buttonHtml, partyKey } = renderRosterRowButtonHtml(root, hasBugs, snapshot);
      const childrenHtml = renderRosterChildrenHtml(root.children, partyKey, hasBugs, snapshot);
      return `<div class="roster-tree-node" data-roster-depth="${root.depth}">${buttonHtml}${childrenHtml}</div>`;
    })
    .join("");
}
