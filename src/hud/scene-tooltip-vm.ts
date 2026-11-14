import { layoutProjectWorld, resolveProjectHeraldry } from "../spatial/index.ts";
import {
  type GuildSnapshot,
  resolveOperatorDisplayAlias,
} from "../types/domain.ts";
import type {
  OverflowAlcoveBadgeViewModel,
  RoomPluginBadgeViewModel,
} from "./hud-character-types.ts";
import {
  formatPluginStatusLabel,
  formatPublicSafeEndpoint,
} from "./hud-formatters.ts";
import type {
  RoomHeaderStripViewModel,
  SceneHoverTarget,
  SceneObjectTooltipViewModel,
  TopBarClientStateInput,
  TopBarOperatorSummaryInput,
  TopBarViewModel,
} from "./hud-tooltip-types.ts";
import {
  buildBreakLoungeTooltip,
  buildBugMonsterTooltip,
  buildCharacterTooltip,
  buildDemolitionBombTooltip,
  buildGoalAssemblySocketTooltip,
  buildPropTooltip,
  buildSummoningTooltip,
} from "./tooltip-encounters-vm.ts";
import {
  buildAlcoveSceneTooltip,
  buildResourceStockpileTooltip,
  buildWorkstationTooltip,
} from "./tooltip-fixtures-vm.ts";

export function buildRoomHeaderStripViewModel(
  snapshot: GuildSnapshot,
  selectedRoomId: string | null = null,
): RoomHeaderStripViewModel {
  const allRoomIds =
    snapshot.roomOrder?.length > 0
      ? snapshot.roomOrder
      : Object.keys(snapshot.rooms ?? {});
  const totalChars = Object.keys(snapshot.characters ?? {}).length;
  const s = snapshot.summary ?? {
    totalRooms: allRoomIds.length,
    activeAdventurers: 0,
    activeSubagents: 0,
    openQuestGates: 0,
  };
  const roomsText = `${s.totalRooms} ${s.totalRooms === 1 ? "room" : "rooms"}`;
  const activeTotal = (s.activeAdventurers ?? 0) + (s.activeSubagents ?? 0);
  const advText = `${activeTotal} active (${totalChars} sessions)`;
  const gateText = `${s.openQuestGates} ${s.openQuestGates === 1 ? "quest gate" : "quest gates"}`;
  const statusSummaryText = `${roomsText} · ${advText} · ${gateText}`;
  const daemonIndicatorText = `Daemon: ${formatPublicSafeEndpoint(snapshot.daemonUrl || "live")} (${snapshot.activeAdapter || "opencode-client"})`;
  const tuiFooterStatusText = `GUILD: ${statusSummaryText}`;

  const headerRoomId =
    selectedRoomId && snapshot.rooms[selectedRoomId]
      ? selectedRoomId
      : (allRoomIds[0] ?? null);
  const headerRoom = headerRoomId ? snapshot.rooms[headerRoomId] : null;
  const overflowCount = headerRoom?.overflowPluginNamespaces.length ?? 0;
  const pluginBadges: readonly RoomPluginBadgeViewModel[] = headerRoom
    ? Object.freeze(
        headerRoom.pluginAlcoves.map((alcove) =>
          Object.freeze({
            namespace: alcove.namespace,
            displayName: alcove.displayName,
            monogram: alcove.monogram,
            status: alcove.status,
            statusLabel: formatPluginStatusLabel(alcove.status),
            overflowCount,
          }),
        ),
      )
    : Object.freeze([]);
  const overflowBadge: Readonly<OverflowAlcoveBadgeViewModel> | null =
    headerRoom && overflowCount > 0
      ? Object.freeze({
          label: `+${overflowCount} overflow`,
          count: overflowCount,
          namespaces: Object.freeze([...headerRoom.overflowPluginNamespaces]),
        })
      : null;

  return Object.freeze({
    daemonIndicatorText,
    statusSummaryText,
    tuiFooterStatusText,
    selectedRoomId,
    totalRooms: allRoomIds.length,
    pluginBadges,
    overflowBadge,
  });
}

export function buildTopBarViewModel(
  snapshot: GuildSnapshot,
  state: TopBarClientStateInput = {},
  operatorProfile: TopBarOperatorSummaryInput | null = null,
): TopBarViewModel {
  const stripVm = buildRoomHeaderStripViewModel(
    snapshot,
    state.selectedRoomId ?? null,
  );
  const rosterMode = state.rosterMode ?? "active-squads";
  const visualStyleMode = state.visualStyleMode ?? "clean-cartoon";
  const isAuthenticated =
    state.isAuthenticated !== false &&
    operatorProfile?.authenticated !== false;

  const activeMach =
    operatorProfile?.pairedMachines?.find((m) => m.isActive) ??
    operatorProfile?.pairedMachines?.[0];
  const hasPairedMachine =
    isAuthenticated &&
    Boolean(activeMach || (operatorProfile?.paired && operatorProfile?.daemonUrl));
  const isReachable =
    activeMach?.reachable ??
    operatorProfile?.reachable ??
    snapshot.activeAdapter === "opencode-client";
  const statusDot = isReachable ? "🟢" : "🟠";
  const machLabel =
    activeMach?.label ||
    (operatorProfile?.daemonUrl
      ? formatPublicSafeEndpoint(operatorProfile.daemonUrl)
      : "OpenCode Machine");
  const resolvedDaemonUrl = formatPublicSafeEndpoint(
    activeMach?.daemonUrl ||
      operatorProfile?.daemonUrl ||
      snapshot.daemonUrl ||
      "live",
  );

  const connectionPill = Object.freeze({
    label: hasPairedMachine ? `${statusDot} 🔗 ${machLabel}` : "🔗 Pair OpenCode",
    tooltip: hasPairedMachine
      ? `Daemon: ${resolvedDaemonUrl} (${snapshot.activeAdapter || "opencode-client"}) — Click to manage OpenCode Machine Pairing`
      : "Pair & Manage OpenCode Machines",
    status: (hasPairedMachine
      ? isReachable
        ? "connected"
        : "unreachable"
      : "unpaired") as "connected" | "unreachable" | "unpaired",
  });

  const machineTabs = Object.freeze(
    isAuthenticated && Array.isArray(operatorProfile?.pairedMachines)
      ? operatorProfile.pairedMachines.map((m) => {
          const mReachable = m.reachable !== false;
          const mDot = mReachable ? "🟢" : "🟠";
          const mLabel = m.label?.trim() || formatPublicSafeEndpoint(m.daemonUrl);
          const mSafeUrl = formatPublicSafeEndpoint(m.daemonUrl);
          const mActive = Boolean(m.isActive);
          return Object.freeze({
            machineId: m.machineId,
            label: mLabel,
            buttonText: `${mDot} 🖥️ ${mLabel}`,
            tooltip: mActive
              ? `Active Machine: ${mLabel} (${mSafeUrl}) — Click to reconnect or refresh`
              : `Click to switch active OpenCode Machine to ${mLabel} (${mSafeUrl})`,
            isActive: mActive,
            reachable: mReachable,
            status: (mReachable ? "connected" : "unreachable") as "connected" | "unreachable",
          });
        })
      : [],
  );
  const pairActionLabel = machineTabs.length > 0 ? "+ Pair" : connectionPill.label;

  const uname = operatorProfile?.username?.trim();
  const displayAlias = isAuthenticated
    ? resolveOperatorDisplayAlias(operatorProfile)
    : null;
  const hasNamedOperator = Boolean(displayAlias);
  const accountPill = Object.freeze({
    label: displayAlias ? `👤 ${displayAlias}` : "👤 Login / Register",
    tooltip: displayAlias
      ? `Signed in as ${displayAlias}${uname && displayAlias !== uname ? ` (${uname})` : ""} — Click for Account & Profile Settings`
      : "Login, Register & User Profile",
    authenticated: hasNamedOperator,
  });

  const projWorld = layoutProjectWorld(
    snapshot,
    state.selectedProjectId ?? null,
    rosterMode,
  );
  const worldTabs = Object.freeze(
    projWorld.topBarTabs.map((t) => {
      const heraldry = resolveProjectHeraldry(
        { roomId: t.projectId, locationDirectory: t.projectId, projectName: t.projectName },
        snapshot,
      );
      return Object.freeze({
        ...t,
        crestIcon: heraldry.crestIcon,
        shortTag: heraldry.shortTag,
        partyKey: heraldry.partyKey,
        primaryHex: heraldry.primaryHex,
        accentHex: heraldry.accentHex,
        partyName: heraldry.partyName,
      });
    }),
  );

  return Object.freeze({
    daemonIndicatorText: stripVm.daemonIndicatorText,
    statusSummaryText: stripVm.statusSummaryText,
    tuiFooterStatusText: stripVm.tuiFooterStatusText,
    connectionPill,
    pairActionLabel,
    machineTabs,
    accountPill,
    rosterButtonText:
      rosterMode === "full-lineage"
        ? "Roster: Full Lineage"
        : "Roster: Active Squads",
    rosterActive: rosterMode === "full-lineage",
    styleButtonText:
      visualStyleMode === "pixel-atlas"
        ? "Style: Pixel Atlas"
        : "Style: Clean Cartoon",
    styleActive: visualStyleMode === "pixel-atlas",
    worldLabel: worldTabs.length > 0 ? "Worlds:" : "Rooms:",
    worldTabs,
    totalRooms: stripVm.totalRooms,
  });
}

export function buildSceneObjectTooltip(
  snapshot: GuildSnapshot,
  target: SceneHoverTarget,
): SceneObjectTooltipViewModel | null {
  switch (target.kind) {
    case "character":
      return buildCharacterTooltip(snapshot, target);
    case "workstation":
      if (target.workstation === "Resource Stockpile") {
        return buildResourceStockpileTooltip(snapshot, {
          kind: "resource-stockpile",
          roomId: target.roomId,
        });
      }
      if (target.workstation === "Break Lounge") {
        return buildBreakLoungeTooltip(snapshot, {
          kind: "break-lounge",
          roomId: target.roomId,
        });
      }
      return buildWorkstationTooltip(snapshot, target);
    case "alcove":
      return buildAlcoveSceneTooltip(snapshot, target);
    case "resource-stockpile":
      return buildResourceStockpileTooltip(snapshot, target);
    case "summoning-ritual":
    case "summoning-pad":
      return buildSummoningTooltip(snapshot, target);
    case "break-lounge":
      return buildBreakLoungeTooltip(snapshot, target);
    case "demolition-bomb":
      return buildDemolitionBombTooltip(snapshot, target);
    case "prop":
      return buildPropTooltip(snapshot, target);
    case "goal-assembly-socket":
      return buildGoalAssemblySocketTooltip(target);
    case "bug-monster":
      return buildBugMonsterTooltip(target);
  }
}
