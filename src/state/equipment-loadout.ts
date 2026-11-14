import {
  reconcileCharacterRoleArchetype,
  ROLE_ARCHETYPE_HEADGEAR,
  type CharacterState,
  type EquipmentLoadout,
  type EquipmentSlotItem,
  type GuildRoleArchetype,
  type HeadgearSilhouette,
  type ToolBeltEntry,
  type WorkstationKind,
} from "../types/domain.ts";

export { ROLE_ARCHETYPE_HEADGEAR };

export const HEADGEAR_RPG_NAMES: Record<HeadgearSilhouette, string> = {
  "visored-helm": "Forgeplate Visor Helm",
  "arcane-circlet": "Strategist's Arcane Circlet",
  hood: "Pathfinder's Ranger Hood",
  "plumed-cap": "Vanguard Plumed Cap",
  "alchemist-goggles": "Artificer's Alchemist Goggles",
  "horned-crown": "Archon's Horned Crown",
};

export const WORKSTATION_WEAPON_META: Record<
  WorkstationKind,
  { rpgName: string; iconKey: string; colorHex: string }
> = {
  "Library Study Bookshelf": {
    rpgName: "Scholar's Magnifying Loupe",
    iconKey: "spyglass",
    colorHex: "#93c5fd",
  },
  "Observatory Spyglass": {
    rpgName: "Seeker's Brass Spyglass",
    iconKey: "spyglass",
    colorHex: "#38bdf8",
  },
  "Anvil Forge": {
    rpgName: "Blacksmith's Forge Hammer",
    iconKey: "hammer",
    colorHex: "#f97316",
  },
  "Crafting Workbench": {
    rpgName: "Architect's Golden Quill",
    iconKey: "quill",
    colorHex: "#fcd34d",
  },
  "Armory Wardrobe": {
    rpgName: "Quartermaster's Grimoire Staff",
    iconKey: "staff",
    colorHex: "#fde047",
  },
  "Arcane Lectern": {
    rpgName: "Runed Archmage Staff",
    iconKey: "staff",
    colorHex: "#a855f7",
  },
  "Alchemy Lab": {
    rpgName: "Alchemist's Distillation Scepter",
    iconKey: "scepter",
    colorHex: "#6ee7b7",
  },
  "Resource Stockpile": {
    rpgName: "Conduit Astral Scepter",
    iconKey: "scepter",
    colorHex: "#d97706",
  },
  "Goal Assembly Site": {
    rpgName: "Architect's Golden Quill",
    iconKey: "quill",
    colorHex: "#fbbf24",
  },
  "Dungeon Wilds": {
    rpgName: "Vanguard Broadsword",
    iconKey: "hammer",
    colorHex: "#ef4444",
  },
};

export const TIER_TITLES: Record<0 | 1 | 2 | 3, string> = {
  0: "Novice Initiate",
  1: "Field Adept",
  2: "Arcane Vanguard",
  3: "Grand Archon",
};

export function deriveEquipmentLoadout(
  char: Pick<
    CharacterState,
    | "agentClass"
    | "modelId"
    | "role"
    | "visualTraits"
    | "activeWorkstation"
    | "activePluginNamespace"
    | "activeCapability"
    | "skillGrimoires"
    | "distilledSkillHistory"
    | "recentTools"
    | "childSessionIds"
    | "contextMana"
  >,
): EquipmentLoadout {
  const toolBeltMap = new Map<string, ToolBeltEntry>();
  for (const rec of char.recentTools) {
    const existing = toolBeltMap.get(rec.toolName);
    if (existing) {
      existing.count += 1;
      if (!existing.lastInputPreview && rec.inputPreview) {
        existing.lastInputPreview = rec.inputPreview;
      }
    } else {
      toolBeltMap.set(rec.toolName, {
        toolName: rec.toolName,
        workstation: rec.workstation,
        preparationStation: rec.preparationStation,
        count: 1,
        lastInputPreview: rec.inputPreview,
      });
    }
  }
  const toolBelt = [...toolBeltMap.values()];

  const skillCount =
    char.skillGrimoires.length + char.distilledSkillHistory.length;
  const toolCallCount = char.recentTools.length;
  const subagentCount = char.childSessionIds.length;
  const compactionCount = char.contextMana.compactionCount;
  const usedTokens = char.contextMana.usedTokens;

  const level = Math.max(
    1,
    1 +
      skillCount * 2 +
      Math.ceil(toolCallCount / 2) +
      subagentCount * 2 +
      compactionCount * 2 +
      (usedTokens >= 50_000 ? 2 : usedTokens >= 10_000 ? 1 : 0),
  );

  let readinessTier: 0 | 1 | 2 | 3 = 0;
  if (
    level >= 8 ||
    (skillCount >= 2 && (toolCallCount >= 2 || subagentCount >= 1)) ||
    (compactionCount >= 1 && skillCount >= 1)
  ) {
    readinessTier = 3;
  } else if (
    level >= 5 ||
    skillCount >= 2 ||
    (skillCount >= 1 && toolCallCount >= 1) ||
    toolCallCount >= 3 ||
    subagentCount >= 1
  ) {
    readinessTier = 2;
  } else if (
    level >= 2 ||
    skillCount >= 1 ||
    toolCallCount >= 1 ||
    Boolean(char.activeCapability) ||
    usedTokens > 0
  ) {
    readinessTier = 1;
  }

  const resolvedRole =
    (char as { roleArchetype?: GuildRoleArchetype }).roleArchetype ??
    reconcileCharacterRoleArchetype(char as CharacterState);
  const headgearSilhouette =
    ROLE_ARCHETYPE_HEADGEAR[resolvedRole] ?? char.visualTraits.headgear;
  const headgearTier: 0 | 1 | 2 | 3 =
    char.modelId &&
    char.modelId !== "default" &&
    char.modelId !== "unknown-model"
      ? (Math.max(1, readinessTier) as 0 | 1 | 2 | 3)
      : readinessTier;

  const headgear: EquipmentSlotItem = {
    slot: "headgear",
    rpgName: HEADGEAR_RPG_NAMES[headgearSilhouette] ?? "Guild Adventurer Helm",
    opencodeBinding: `agent: ${char.agentClass} · model: ${char.modelId}`,
    tier: headgearTier,
    iconKey: headgearSilhouette,
    colorHex: char.visualTraits.trimHex,
  };

  const classLabel = (char.agentClass || "build").toUpperCase();
  const robesRpgName =
    readinessTier === 3
      ? `Archmage Mantle of ${classLabel}`
      : readinessTier === 2
        ? `Runed Brigandine of ${classLabel}`
        : readinessTier === 1
          ? `Journeyman Tunic of ${classLabel}`
          : "Initiate Linen Tunic";
  const robesIconKey =
    readinessTier === 3
      ? "archmage-mantle"
      : readinessTier === 2
        ? "runed-brigandine"
        : readinessTier === 1
          ? "journeyman-tunic"
          : "initiate-tunic";
  const manaPct = Math.round(char.contextMana.fillRatio * 100);

  const robes: EquipmentSlotItem = {
    slot: "robes",
    rpgName: robesRpgName,
    opencodeBinding: `model: ${char.modelId} · role: ${char.role} · mana: ${manaPct}% (${char.contextMana.usedTokens.toLocaleString()}/${char.contextMana.limitTokens.toLocaleString()} tok)`,
    tier: readinessTier,
    iconKey: robesIconKey,
    colorHex: char.visualTraits.primaryHex,
  };

  const latestTool = char.recentTools[0] ?? null;
  const activeStation =
    char.activeWorkstation ?? latestTool?.workstation ?? null;
  const activeToolName =
    char.activeCapability?.displayName ?? latestTool?.toolName ?? null;
  const activePreview =
    char.activeCapability?.inputPreview || latestTool?.inputPreview || "";
  const activePluginNs =
    char.activePluginNamespace ?? latestTool?.pluginNamespace ?? null;

  let mainHand: EquipmentSlotItem;
  if (activeStation && activeToolName) {
    const weaponMeta =
      WORKSTATION_WEAPON_META[activeStation] ??
      WORKSTATION_WEAPON_META["Alchemy Lab"];
    const rpgName =
      activeStation === "Resource Stockpile" && activePluginNs
        ? `Conduit Astral Scepter (${activePluginNs})`
        : weaponMeta.rpgName;
    const weaponTier: 0 | 1 | 2 | 3 =
      toolCallCount >= 4 ? 3 : toolCallCount >= 2 ? 2 : 1;
    mainHand = {
      slot: "mainHand",
      rpgName,
      opencodeBinding: activePreview
        ? `tool: ${activeToolName} (${activePreview}) @ ${activeStation}`
        : `tool: ${activeToolName} @ ${activeStation}`,
      tier: weaponTier,
      iconKey: weaponMeta.iconKey,
      colorHex: weaponMeta.colorHex,
    };
  } else {
    const fallbackByClass: Record<
      string,
      { rpgName: string; iconKey: string }
    > = {
      build: { rpgName: "Apprentice Forge Hammer", iconKey: "hammer" },
      explore: { rpgName: "Scout's Pocket Spyglass", iconKey: "spyglass" },
      plan: { rpgName: "Draftsman's Golden Quill", iconKey: "quill" },
    };
    const fb = fallbackByClass[char.agentClass.toLowerCase()] ?? {
      rpgName: "Initiate Mage Staff",
      iconKey: "staff",
    };
    mainHand = {
      slot: "mainHand",
      rpgName: fb.rpgName,
      opencodeBinding: `tool: none (agent: ${char.agentClass} default)`,
      tier: 0,
      iconKey: fb.iconKey,
      colorHex: "#94a3b8",
    };
  }

  let offHand: EquipmentSlotItem;
  if (char.skillGrimoires.length > 0) {
    const skillIds = char.skillGrimoires.map((g) => g.skillId).join(", ");
    const subSuffix =
      subagentCount > 0 ? ` · subagents: ${subagentCount}` : "";
    const offTier = Math.min(3, char.skillGrimoires.length) as 0 | 1 | 2 | 3;
    offHand = {
      slot: "offHand",
      rpgName:
        char.skillGrimoires.length >= 2
          ? `Grand Grimoire Codex (${char.skillGrimoires.length} Tomes)`
          : `Skill Grimoire: ${char.skillGrimoires[0].name}`,
      opencodeBinding: `skills: [${skillIds}]${subSuffix}`,
      tier: offTier,
      iconKey: "grimoire",
      colorHex: char.skillGrimoires[0].emblemHex,
    };
  } else if (subagentCount > 0) {
    const offTier = Math.min(3, Math.max(1, subagentCount)) as 0 | 1 | 2 | 3;
    offHand = {
      slot: "offHand",
      rpgName: `Squad Commander's War Banner (${subagentCount})`,
      opencodeBinding: `subagents: ${subagentCount} (${char.childSessionIds.join(", ")})`,
      tier: offTier,
      iconKey: "banner",
      colorHex: "#f59e0b",
    };
  } else if (char.distilledSkillHistory.length > 0) {
    const distilledIds = char.distilledSkillHistory
      .map((g) => g.skillId)
      .join(", ");
    offHand = {
      slot: "offHand",
      rpgName: "Distilled Essence Lantern",
      opencodeBinding: `distilled skills: [${distilledIds}] · subagents: 0`,
      tier: 1,
      iconKey: "lantern",
      colorHex: "#22d3ee",
    };
  } else {
    offHand = {
      slot: "offHand",
      rpgName: "Wayfarer's Ward Lantern",
      opencodeBinding: "skills: [] · subagents: 0",
      tier: 0,
      iconKey: "lantern",
      colorHex: "#64748b",
    };
  }

  return {
    level,
    readinessTier,
    tierTitle: TIER_TITLES[readinessTier],
    headgear,
    robes,
    mainHand,
    offHand,
    toolBelt,
  };
}
