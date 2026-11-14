import { deriveGuildAssemblyShowcase } from "../encounter/index.ts";
import {
  listHostProjectHeraldries,
  resolveProjectHeraldry,
  resolveWorldFocusScope,
  type WorldFocusOptions,
} from "../spatial/index.ts";
import { normalizeLocationDirectory } from "../state/location-normalization.ts";
import type { GuildSnapshot, SessionTributeRecord } from "../types/domain.ts";
import { formatUsdCost } from "./hud-formatters.ts";
import type { GuildMasterLedgerViewModel } from "./hud-tooltip-types.ts";

function normalizeLedgerWorldFocusOptions(
  focusInput?: string | null | WorldFocusOptions,
): WorldFocusOptions {
  if (
    typeof focusInput === "string" ||
    focusInput === null ||
    focusInput === undefined
  ) {
    const trimmed = typeof focusInput === "string" ? focusInput.trim() || null : null;
    return {
      selectedRoomId: trimmed,
      selectedProjectId: trimmed,
      isAllWorldsFocused: !trimmed,
    };
  }
  return focusInput;
}

export function buildGuildMasterLedgerViewModel(
  snapshot: GuildSnapshot,
  focusInput?: string | null | WorldFocusOptions,
): GuildMasterLedgerViewModel {
  const focusOptions = normalizeLedgerWorldFocusOptions(focusInput);
  const scope = resolveWorldFocusScope(snapshot, focusOptions);
  const isFiltered = !scope.isMultiProjectScope;
  const scopedRoomIds = scope.scopedRooms.map((r) => r.roomId);
  const scopedRoomSet = new Set(scopedRoomIds);

  const allCharacters = Object.values(snapshot.characters ?? {});
  const characters = isFiltered ? scope.scopedCharacters : allCharacters;
  const scopedCharIdSet = new Set(characters.map((c) => c.sessionId));

  const focusRaw = (focusOptions.selectedProjectId ?? focusOptions.selectedRoomId ?? "").trim();
  const normFocus = focusRaw ? normalizeLocationDirectory(focusRaw).toLowerCase() : "";
  const rawLower = focusRaw.toLowerCase();
  const targetProjectRoot = isFiltered
    ? resolveProjectHeraldry(scope.selectedProjectRoom ?? focusRaw, snapshot).projectId.toLowerCase()
    : "";
  const scopedRoomNormSet = new Set(
    scopedRoomIds.map((id) => normalizeLocationDirectory(id).toLowerCase()),
  );
  const scopedProjectIds = new Set(
    scope.scopedRooms.map((r) => (r.projectId || "").toLowerCase()).filter(Boolean),
  );

  function matchesFocusedWorld(rec: SessionTributeRecord): boolean {
    if (!isFiltered) return true;
    const recRoomNorm = rec.roomId ? normalizeLocationDirectory(rec.roomId).toLowerCase() : "";
    const recLocNorm = rec.locationDirectory
      ? normalizeLocationDirectory(rec.locationDirectory).toLowerCase()
      : "";
    const recProjLower = (rec.projectId || "").toLowerCase();
    if (scopedRoomSet.has(rec.roomId) || scopedRoomSet.has(rec.locationDirectory)) return true;
    if ((recRoomNorm && scopedRoomNormSet.has(recRoomNorm)) || (recLocNorm && scopedRoomNormSet.has(recLocNorm))) {
      return true;
    }
    if (normFocus && (recRoomNorm === normFocus || recLocNorm === normFocus || recProjLower === normFocus)) {
      return true;
    }
    if (rawLower && recProjLower === rawLower) return true;
    if (recProjLower && scopedProjectIds.has(recProjLower)) return true;
    if (targetProjectRoot) {
      const recHeraldryRoot = resolveProjectHeraldry(
        { roomId: rec.roomId, locationDirectory: rec.locationDirectory, projectId: rec.projectId },
        snapshot,
      ).projectId.toLowerCase();
      if (recHeraldryRoot === targetProjectRoot) return true;
    }
    return false;
  }

  let activeUsedTokens = 0;
  let historicalUsedTokens = 0;
  let activeCostUsd = 0;
  let historicalCostUsd = 0;
  let highestMonsterTier = 0;
  let highestMonsterName = "None";

  for (const c of characters) {
    const mana = c.contextMana;
    const rec = snapshot.tributeLedger?.[c.sessionId];
    const inTok = Math.max(rec?.inputTokens ?? 0, mana?.inputTokens ?? 0);
    const outTok = Math.max(rec?.outputTokens ?? 0, mana?.outputTokens ?? 0);
    const cRead = Math.max(rec?.cacheReadTokens ?? 0, mana?.cacheReadTokens ?? 0);
    const cWrite = Math.max(rec?.cacheWriteTokens ?? 0, mana?.cacheWriteTokens ?? 0);
    const bucketSum = inTok + outTok + cRead + cWrite;
    activeUsedTokens += Math.max(rec?.totalTokens ?? 0, bucketSum, mana?.usedTokens ?? 0);
    activeCostUsd += Math.max(rec?.totalCostUsd ?? 0, mana?.totalCostUsd ?? 0);
  }

  for (const rec of Object.values(snapshot.tributeLedger ?? {})) {
    if (!rec?.sessionId || scopedCharIdSet.has(rec.sessionId)) continue;
    if (snapshot.characters?.[rec.sessionId]) continue;
    if (!matchesFocusedWorld(rec)) continue;
    const bucketSum =
      (rec.inputTokens ?? 0) +
      (rec.outputTokens ?? 0) +
      (rec.cacheReadTokens ?? 0) +
      (rec.cacheWriteTokens ?? 0);
    historicalUsedTokens += Math.max(rec.totalTokens ?? 0, bucketSum);
    historicalCostUsd += Math.max(0, rec.totalCostUsd ?? 0);
  }

  const totalUsedTokens = activeUsedTokens + historicalUsedTokens;
  const totalCostUsd = activeCostUsd + historicalCostUsd;
  const formattedCost = formatUsdCost(totalCostUsd, 3);
  const tokensTooltip =
    historicalUsedTokens > 0
      ? `Lifetime Tribute: ${totalUsedTokens.toLocaleString()} tokens (${activeUsedTokens.toLocaleString()} active · ${historicalUsedTokens.toLocaleString()} from deleted sessions)`
      : `Lifetime Tribute: ${totalUsedTokens.toLocaleString()} tokens`;
  const costTooltip =
    historicalCostUsd > 0
      ? `Lifetime Tribute: ${formattedCost} (${formatUsdCost(activeCostUsd, 3)} active · ${formatUsdCost(historicalCostUsd, 3)} from deleted sessions)`
      : `Lifetime Tribute: ${formattedCost}`;

  const allQuestGates = Object.values(snapshot.questGates ?? {});
  const scopedQuestGates = isFiltered
    ? allQuestGates.filter(
        (g) =>
          scopedRoomSet.has(g.roomId) ||
          Boolean(g.sessionId && scopedCharIdSet.has(g.sessionId)),
      )
    : allQuestGates;

  const openQuestGates = scopedQuestGates.filter(
    (g) => (g as { status?: string }).status === "pending" || !("status" in g),
  ).length;

  const roomEntries = scopedRoomIds
    .map((rid) => {
      const room = snapshot.rooms?.[rid];
      if (!room) return null;
      const roomChars = characters.filter((c) => c.roomId === rid);
      const activeCount = roomChars.filter(
        (c) =>
          c.lifecycleState !== "RestingInLounge" &&
          c.lifecycleState !== "Archived",
      ).length;
      return Object.freeze({
        roomId: rid,
        projectName: room.projectName,
        sessionCount: roomChars.length,
        activeCount,
      });
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const threatCount = scopedQuestGates.filter(
    (g) =>
      ((g as { status?: string }).status === "pending" || !("status" in g)) &&
      g.source !== "conversational",
  ).length;
  if (threatCount > 0) {
    const tierNum = threatCount >= 4 ? 4 : threatCount >= 2 ? 3 : 2;
    highestMonsterTier = tierNum;
    highestMonsterName =
      tierNum === 4 ? "Troll Boss" : tierNum === 3 ? "Cyclops" : "Goblin";
  }

  const showcase = deriveGuildAssemblyShowcase(snapshot, focusOptions);
  const totalParts = showcase.assembly.totalParts;
  const fittedParts = showcase.assembly.fittedCount;
  const assemblyPercent =
    totalParts > 0 ? Math.round((fittedParts / totalParts) * 100) : 0;
  const assemblyTier = showcase.milestone.tier;

  const totalAdventurers = isFiltered
    ? characters.filter((c) => !c.parentId).length
    : (snapshot.summary?.activeAdventurers ??
      characters.filter((c) => !c.parentId).length);
  const totalSubagents = isFiltered
    ? characters.filter((c) => Boolean(c.parentId)).length
    : (snapshot.summary?.activeSubagents ??
      characters.filter((c) => Boolean(c.parentId)).length);

  const canonicalWorldCount = isFiltered
    ? scope.scopedRooms.length > 0 ||
      characters.length > 0 ||
      Boolean(focusOptions.selectedProjectId || focusOptions.selectedRoomId)
      ? Math.max(
          1,
          new Set(
            scope.scopedRooms.map((r) =>
              resolveProjectHeraldry(r, snapshot).projectId.toLowerCase(),
            ),
          ).size,
        )
      : 0
    : listHostProjectHeraldries(snapshot).length ||
      snapshot.summary?.totalRooms ||
      roomEntries.length;

  return Object.freeze({
    totalRooms: canonicalWorldCount,
    totalAdventurers,
    totalSubagents,
    openQuestGates,
    totalUsedTokens,
    activeUsedTokens,
    historicalUsedTokens,
    totalCostUsd,
    activeCostUsd,
    historicalCostUsd,
    formattedCost,
    tokensTooltip,
    costTooltip,
    activeGoalAssembly: Object.freeze({
      name: "Feature Assembly Platform",
      featureSlug: showcase.featureSlug,
      sourceLabel: showcase.sourceLabel,
      tier: assemblyTier,
      milestoneName: showcase.milestone.name,
      totalParts,
      fittedCount: fittedParts,
      percentComplete: assemblyPercent,
      isMultiProjectScope: showcase.isMultiProjectScope,
      projectAssemblies: showcase.projectAssemblies,
      deliverables: showcase.deliverables,
      modifiedFiles: showcase.modifiedFiles,
      metrics: showcase.metrics,
    }),
    monsterThreat: Object.freeze({
      threatCount,
      highestTier: highestMonsterTier,
      highestName: highestMonsterName,
      description:
        threatCount > 0
          ? `${threatCount} active issue(s) under investigation in Dungeon Wilds.`
          : "Wilderness is peaceful. No active bug threats.",
    }),
    rooms: Object.freeze(roomEntries),
  });
}
