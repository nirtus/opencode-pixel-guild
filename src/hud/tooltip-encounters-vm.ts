import { resolveResourceCargo } from "../capability/classifier.ts";
import { resolveProjectHeraldry } from "../spatial/index.ts";
import { WORKSTATION_CATALOG, type GuildSnapshot } from "../types/domain.ts";
import {
  collectRoomCharacters,
  detailRow,
  formatPublicSafePath,
} from "./hud-formatters.ts";
import type {
  SceneHoverTarget,
  SceneObjectTooltipViewModel,
  SceneTooltipDetailRow,
} from "./hud-tooltip-types.ts";

export function buildCharacterTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "character" }>,
): SceneObjectTooltipViewModel | null {
  const char = snapshot.characters[target.sessionId];
  if (!char) return null;

  const loadout = char.equipmentLoadout;
  const skillIds = char.skillGrimoires.map((g) => g.skillId);
  const manaPct = Math.round(
    Math.min(
      100,
      Math.max(0, (char.contextMana.usedTokens / Math.max(1, char.contextMana.limitTokens)) * 100),
    ),
  );
  const activeCargo =
    char.activeResourceCargo ??
    (char.activeWorkstation
      ? resolveResourceCargo({
          workstation: char.activeWorkstation,
          toolName: char.activeCapability?.displayName ?? char.recentTools[0]?.toolName ?? null,
          pluginNamespace: char.activePluginNamespace,
        })
      : null);
  const liveActivity = target.isWalking
    ? target.haulingCargo
      ? `Hauling ${target.haulingCargo} → ${target.walkingToLabel || char.activeWorkstation || "Station"}`
      : `Walking → ${target.walkingToLabel || char.activeWorkstation || "Station"}`
    : char.activeCapability
      ? `Working at ${char.activeWorkstation}: ${char.activeCapability.displayName}${char.activeCapability.inputPreview ? ` (${char.activeCapability.inputPreview})` : ""}`
      : char.lifecycleState === "RestingInLounge"
        ? "Resting in Break Lounge (session.idle)"
        : char.lifecycleState;

  const toolBeltSummary =
    loadout.toolBelt.length > 0
      ? loadout.toolBelt
          .slice(0, 4)
          .map((t) => `${t.toolName}×${t.count}${t.lastInputPreview ? ` [${t.lastInputPreview}]` : ""}`)
          .join(" · ")
      : "No tools invoked yet";

  const heraldry = resolveProjectHeraldry(char, snapshot);
  const rows: SceneTooltipDetailRow[] = [
    detailRow(
      "Project Heraldry",
      `${heraldry.crestIcon} ${heraldry.projectName} [${heraldry.shortTag}] · ${heraldry.partyName}`,
      true,
      heraldry.accentHex,
    ),
    detailRow("OpenCode Session", `${char.sessionId} (${char.role})`),
    detailRow("Agent & Model", `agent: ${char.agentClass} · model: ${char.modelId}`, true, char.visualTraits.trimHex),
    detailRow("Live Activity", liveActivity, true, "#6ee7b7"),
    detailRow(`Headgear [T${loadout.headgear.tier}]`, `${loadout.headgear.rpgName} → ${loadout.headgear.opencodeBinding}`),
    detailRow(`Robes [T${loadout.robes.tier}]`, `${loadout.robes.rpgName} → ${loadout.robes.opencodeBinding}`),
    detailRow(`Main-Hand [T${loadout.mainHand.tier}]`, `${loadout.mainHand.rpgName} → ${loadout.mainHand.opencodeBinding}`, true, loadout.mainHand.colorHex),
    detailRow(`Off-Hand [T${loadout.offHand.tier}]`, `${loadout.offHand.rpgName} → ${loadout.offHand.opencodeBinding}`, true, loadout.offHand.colorHex),
    detailRow("Skill Grimoires", skillIds.length > 0 ? skillIds.join(", ") : "None equipped"),
    detailRow("Tool Belt", toolBeltSummary),
    detailRow(
      "Context Mana & Cost",
      `${char.contextMana.usedTokens.toLocaleString()}/${char.contextMana.limitTokens.toLocaleString()} tok (${manaPct}%) · $${char.contextMana.totalCostUsd.toFixed(4)} USD`,
    ),
  ];

  return Object.freeze({
    kind: "character",
    roomId: char.roomId,
    sessionId: char.sessionId,
    agentClass: char.agentClass,
    modelId: char.modelId,
    lifecycleState: char.lifecycleState,
    title: char.title,
    subtitle: `${heraldry.crestIcon} [${heraldry.shortTag}] · Lv.${loadout.level} ${loadout.tierTitle} · ${char.role}`,
    opencodeBinding: `project: ${heraldry.projectName} · session: ${char.sessionId} · agent: ${char.agentClass}`,
    accentHex: heraldry.accentHex || char.visualTraits.primaryHex,
    statusBadge: target.isWalking ? "WALKING" : char.lifecycleState,
    description: liveActivity,
    equipmentLoadout: Object.freeze({ ...loadout }),
    activeResourceCargo: activeCargo,
    skillIds: Object.freeze([...skillIds]),
    toolBelt: Object.freeze([...loadout.toolBelt]),
    recentTools: Object.freeze([...char.recentTools]),
    rows: Object.freeze(rows),
  });
}

export function buildSummoningTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "summoning-ritual" | "summoning-pad" }>,
): SceneObjectTooltipViewModel | null {
  const room = snapshot.rooms[target.roomId];
  if (!room) return null;

  const roomChars = collectRoomCharacters(snapshot, room);
  const allSubagents = roomChars.filter((c) => c.role === "Squad Subagent");
  const activeSubagents = allSubagents
    .filter((c) => c.lifecycleState !== "RestingInLounge" && c.lifecycleState !== "Archived")
    .map((c) =>
      Object.freeze({
        sessionId: c.sessionId,
        title: c.title,
        parentId: c.parentId,
        agentClass: c.agentClass,
        lifecycleState: c.lifecycleState,
      }),
    );
  const completedSubagentCount = allSubagents.length - activeSubagents.length;
  const isRitual = target.kind === "summoning-ritual";

  return Object.freeze({
    kind: target.kind,
    roomId: room.roomId,
    title: isRitual ? "Summoning Ritual" : "Summoning Pad",
    subtitle: isRitual ? `In-Place Floor Pentagram · ${room.projectName}` : `Subagent Spawn Rune · ${room.projectName}`,
    opencodeBinding: "tool: subagent / task (session.parentID)",
    accentHex: "#a855f7",
    statusBadge: `${activeSubagents.length} ACTIVE / ${completedSubagentCount} DONE`,
    description:
      "Casts an in-place floor pentagram ritual beneath the parent Guild Adventurer and materializes child Squad Subagents on the adjacent tile.",
    activeSubagents: Object.freeze(activeSubagents),
    completedSubagentCount,
    rows: Object.freeze([
      detailRow("OpenCode Binding", "subagent / task tool · session.parentID lineage", true, "#a855f7"),
      detailRow(
        "Active Squad Subagents",
        activeSubagents.length > 0
          ? activeSubagents.map((s) => `${s.title} (${s.agentClass} · ${s.lifecycleState})`).join(" | ")
          : "None currently active",
      ),
      detailRow("Completed Lineage", `${completedSubagentCount} completed subagent scroll(s) on Squad Bench`),
    ]),
  });
}

export function buildBreakLoungeTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "break-lounge" }>,
): SceneObjectTooltipViewModel | null {
  const room = snapshot.rooms[target.roomId];
  if (!room) return null;

  const roomChars = collectRoomCharacters(snapshot, room);
  const hearthIdleSessions = roomChars
    .filter((c) => c.role === "Guild Adventurer" && c.lifecycleState === "RestingInLounge")
    .map((c) => Object.freeze({ sessionId: c.sessionId, title: c.title, agentClass: c.agentClass }));

  const benchArchiveSessions = roomChars
    .filter((c) => c.lifecycleState === "Archived")
    .map((c) => Object.freeze({ sessionId: c.sessionId, title: c.title, agentClass: c.agentClass }));

  const squadTrophyCount = roomChars.filter(
    (c) =>
      c.role === "Squad Subagent" &&
      (c.lifecycleState === "RestingInLounge" || c.lifecycleState === "Archived"),
  ).length;

  return Object.freeze({
    kind: "break-lounge",
    roomId: room.roomId,
    title: "Break Lounge & Hearth",
    subtitle: `Idle & Historical Session Quarter · ${room.projectName}`,
    opencodeBinding: "event: session.idle · archive: 30m threshold",
    accentHex: "#f59e0b",
    statusBadge: `${hearthIdleSessions.length} HEARTH · ${benchArchiveSessions.length} BENCH`,
    description:
      "Houses recently-idle sessions at the Hearth Table, historical sessions on the Session Bench, and Squad Subagent trophy scrolls.",
    hearthIdleSessions: Object.freeze(hearthIdleSessions),
    benchArchiveSessions: Object.freeze(benchArchiveSessions),
    squadTrophyCount,
    rows: Object.freeze([
      detailRow("OpenCode Binding", "session.idle -> Hearth Table · >30m idle -> Session Bench", true, "#f59e0b"),
      detailRow(
        `Hearth Table (${hearthIdleSessions.length})`,
        hearthIdleSessions.length > 0
          ? hearthIdleSessions.map((s) => `${s.title} (${s.agentClass})`).join(", ")
          : "No recently-idle sessions at Hearth",
      ),
      detailRow(
        `Session Bench (${benchArchiveSessions.length})`,
        benchArchiveSessions.length > 0
          ? benchArchiveSessions.map((s) => `${s.title} (${s.agentClass})`).join(", ")
          : "No historical archived sessions",
      ),
      detailRow("Squad Bench Trophies", `${squadTrophyCount} completed Squad Subagent scroll(s)`),
    ]),
  });
}

export function buildDemolitionBombTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "demolition-bomb" }>,
): SceneObjectTooltipViewModel | null {
  const room = snapshot.rooms[target.roomId] ?? target.room;
  if (!room) return null;

  const roomChars = collectRoomCharacters(snapshot, room);
  const sessionCount = roomChars.length || (room.characterIds ?? []).length;
  const isActive = (s: string) => s !== "RestingInLounge" && s !== "Archived";
  const activeAdventurerCount =
    room.activeAdventurerCount ??
    roomChars.filter((c) => c.role === "Guild Adventurer" && isActive(c.lifecycleState)).length;
  const activeSubagentCount =
    room.activeSubagentCount ??
    roomChars.filter((c) => c.role === "Squad Subagent" && isActive(c.lifecycleState)).length;
  const activeCount = activeAdventurerCount + activeSubagentCount;
  const teardownEndpoints = [
    "POST /api/session/{sessionID}/interrupt",
    "DELETE /api/session/{sessionID}",
    "DELETE /api/pty/{ptyID}",
    "DELETE /api/shell/{id}",
    "DELETE /api/worktree",
    "DELETE /api/debug/location",
  ] as const;
  const worktreeStatus = room.isWorktree
    ? "Git Worktree Annex (DELETE /api/worktree force: true + POST /api/worktree/refresh)"
    : "Primary Project Root (preserves repository files on disk; skips DELETE /api/worktree)";

  const safeDir = formatPublicSafePath(room.locationDirectory);
  return Object.freeze({
    kind: "demolition-bomb",
    roomId: room.roomId,
    title: `💣 Demolition Bomb — ${room.projectName}`,
    subtitle: `${room.isWorktree ? "Worktree Annex" : "Primary Workshop Room"} · ${safeDir}`,
    opencodeBinding: `DELETE /api/guild/room -> ${teardownEndpoints.join(", ")}`,
    accentHex: "#ef4444",
    statusBadge:
      activeCount > 0
        ? `${sessionCount} SESSIONS (${activeCount} ACTIVE)`
        : `${sessionCount} SESSIONS · READY`,
    description: `Click to confirm 5-step OpenCode V2 teardown of ${room.projectName} (${safeDir}): interrupts & deletes ${sessionCount} session(s), terminates PTYs/shells, ${room.isWorktree ? "removes git worktree checkout (DELETE /api/worktree)," : "preserves primary repo files,"} and evicts /api/debug/location.`,
    locationDirectory: room.locationDirectory,
    sessionCount,
    activeAdventurerCount,
    activeSubagentCount,
    activeCount,
    isWorktree: room.isWorktree,
    teardownEndpoints: Object.freeze([...teardownEndpoints]),
    rows: Object.freeze([
      detailRow(
        "Workshop Room",
        `${room.projectName}${room.isWorktree ? " [worktree]" : " [primary]"} (${safeDir})`,
        true,
        "#ef4444",
      ),
      detailRow(
        "Sessions & Active Units",
        `${sessionCount} total session(s) · ${activeAdventurerCount} active Guild Adventurer(s) · ${activeSubagentCount} active Squad Subagent(s)`,
        true,
        activeCount > 0 ? "#f59e0b" : "#94a3b8",
      ),
      detailRow("Worktree Status", worktreeStatus, true, room.isWorktree ? "#f97316" : "#38bdf8"),
      detailRow("OpenCode V2 Teardown", teardownEndpoints.join(" · "), true, "#fca5a5"),
    ]),
  });
}

export function buildPropTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "prop" }>,
): SceneObjectTooltipViewModel | null {
  const room = snapshot.rooms[target.roomId];
  if (!room) return null;

  const nearKind = target.nearWorkstation ?? "Arcane Lectern";
  const catalogEntry = WORKSTATION_CATALOG[nearKind] ?? WORKSTATION_CATALOG["Arcane Lectern"];
  const zoneLabel = target.zone ?? "study-wood";

  return Object.freeze({
    kind: "prop",
    roomId: room.roomId,
    title: target.label,
    subtitle: `Guild Workshop Prop · ${room.projectName}`,
    opencodeBinding: `${catalogEntry.kind} (${catalogEntry.mappedTools.join(", ")})`,
    accentHex: catalogEntry.accentHex,
    statusBadge: zoneLabel.toUpperCase(),
    description:
      target.description ??
      `Architectural guild hall fixture in the ${zoneLabel} zone supporting ${catalogEntry.kind} (${catalogEntry.mappedTools.join(", ")}).`,
    rows: Object.freeze([
      detailRow("Guild Hall Prop", `${target.label} (${target.propId})`),
      detailRow("Functional Zone", `${zoneLabel} · anchored near ${catalogEntry.kind}`, true, catalogEntry.accentHex),
      detailRow("OpenCode V2 Context", `${catalogEntry.kind} -> ${catalogEntry.mappedTools.join(", ")}`, true, catalogEntry.accentHex),
    ]),
  });
}

export function buildGoalAssemblySocketTooltip(
  target: Extract<SceneHoverTarget, { kind: "goal-assembly-socket" }>,
): SceneObjectTooltipViewModel {
  if (target.projectStatus) {
    const pStatus = target.projectStatus;
    const fitted = target.fittedCount ?? 0;
    const total = target.totalParts ?? 0;
    const pct = target.percentComplete ?? 0;
    const badge =
      target.projectStatusLabel ||
      (pStatus === "complete" ? "★ COMPLETE" : pStatus === "in-progress" ? "⚙️ IN PROGRESS" : pStatus === "open" ? "📐 OPEN" : "✨ READY");
    const accentHex =
      pStatus === "complete" ? "#10b981" : pStatus === "in-progress" ? "#f59e0b" : pStatus === "open" ? "#60a5fa" : "#38bdf8";
    const description =
      pStatus === "complete"
        ? "Completed Project Mini-Assembly (100% of parts fitted) — visually energized on the Goal Assembly Site."
        : pStatus === "in-progress"
          ? "Minimized project assembly actively in progress on the Goal Assembly Site."
          : pStatus === "open"
            ? "Minimized project assembly with open blueprint parts waiting to be crafted."
            : "Clean project repository (0/0 Blueprint Ready) — ready for new feature blueprints or changes.";
    return Object.freeze({
      kind: "goal-assembly-socket",
      title: `${target.crestIcon || "🛡️"} ${target.projectName || target.name || "Project"} [${target.shortTag || "PROJ"}]`,
      subtitle: `Project Mini-Assembly · ${target.featureSlug || "Blueprint Ready"}`,
      opencodeBinding: `Project: ${target.projectId || target.projectName || "guild"} [${fitted}/${total} (${pct}%)]`,
      accentHex,
      statusBadge: badge,
      description,
      rows: Object.freeze([
        { label: "Status", value: `${badge} (${fitted}/${total} · ${pct}%)`, accentHex },
        { label: "Feature / Source", value: target.featureSlug || "Blueprint Ready", mono: true },
        { label: "Milestone Tier", value: target.milestoneName || "Foundation & Steam Conduit" },
      ]),
    });
  }

  const isFitted = target.status === "fitted";
  const projPrefix = target.shortTag ? `${target.crestIcon ? `${target.crestIcon} ` : ""}[${target.shortTag}] ` : "";
  return Object.freeze({
    kind: "goal-assembly-socket",
    title: `${projPrefix}${target.name || `Assembly Part #${(target.partIndex ?? 0) + 1}`}`,
    subtitle: `Feature Milestone Socket #${(target.partIndex ?? 0) + 1} (${target.partId || "part"})`,
    opencodeBinding: `Task: ${target.name || "Milestone"} [Status: ${isFitted ? "resolved" : "open"}]`,
    accentHex: isFitted ? "#fbbf24" : "#94a3b8",
    statusBadge: isFitted ? "FITTED" : "UNBUILT",
    description: isFitted
      ? "Vibrant, fitted mechanical component snapped into position on the central platform."
      : "Bleak, unbuilt blueprint wireframe waiting for task/milestone completion.",
    rows: Object.freeze([
      { label: "Status", value: isFitted ? "Fitted (Resolved)" : "Pending (Unbuilt)", accentHex: isFitted ? "#10b981" : "#f59e0b" },
      { label: "Component", value: target.name || "Task Item" },
    ]),
  });
}

export function buildBugMonsterTooltip(
  target: Extract<SceneHoverTarget, { kind: "bug-monster" }>,
): SceneObjectTooltipViewModel {
  const tier = target.tier ?? 1;
  const status = target.status ?? "combat";
  const currentHp = target.currentHp ?? 100;
  const maxHp = target.maxHp ?? 100;
  return Object.freeze({
    kind: "bug-monster",
    roomId: target.roomId,
    title: target.name || `Tier ${tier} Bug Monster`,
    subtitle: `Tier ${tier} Wilderness Anomaly`,
    opencodeBinding: `telemetry: error / test-failure (tier ${tier})`,
    accentHex: status === "defeated" ? "#10b981" : "#ef4444",
    statusBadge: status.toUpperCase(),
    description:
      status === "defeated"
        ? "Bug anomaly vanquished by passing verification checks."
        : "Active bug anomaly spawned by failing tests, tool errors, or blocked quest gates.",
    rows: Object.freeze([
      detailRow("Hit Points", `${currentHp}/${maxHp} HP`, true, currentHp > 0 ? "#ef4444" : "#10b981"),
      detailRow("Severity Tier", `Tier ${tier}`),
    ]),
  });
}
