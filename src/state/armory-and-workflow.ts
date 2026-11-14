import {
  classifyCharacterWorkflowIntent,
  deriveOverheadActionLabel,
  extractCapabilityToolName,
  isCharacterExploringOrGatheringInfo,
  PREPARATION_STATION_DISPLAY_NAMES,
  resolveCanonicalPreparationStation,
  type ClassifiableCharacterInput,
} from "../encounter/index.ts";
import {
  reconcileCharacterRoleArchetype,
  type CharacterState,
  type SessionChatMessage,
  type WorkflowIntentKind,
  type WorkstationKind,
} from "../types/domain.ts";

export { reconcileCharacterRoleArchetype };

export function cleanChatMessagePrefix(rawText: string): string {
  return String(rawText || "")
    .replace(/<skill_content\s+name="[^"]+"[^>]*>[\s\S]*?(?:<\/skill_content>|$)/gi, "")
    .replace(/<EXTREMELY[_-]IMPORTANT>[\s\S]*?(?:<\/EXTREMELY[_-]IMPORTANT>|$)/gi, "")
    .replace(/<SUBAGENT-STOP>[\s\S]*?(?:<\/SUBAGENT-STOP>|$)/gi, "")
    .replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function isSyntheticMessageId(id: string): boolean {
  return /^(?:user|asst|u|a):/.test(id);
}

export function reconcileCharacterMessages(
  char: CharacterState,
  incoming?: ReadonlyArray<SessionChatMessage>,
  liveAssistantText?: string | null,
  activityTimestampMs = Date.now(),
): void {
  if (Array.isArray(incoming) && incoming.length > 0) {
    const combined = [...(char.messages ?? []), ...incoming];
    const canonicalPrefixes = new Set(
      combined
        .filter((m) => !isSyntheticMessageId(m.messageId))
        .map((m) => `${m.role}:${cleanChatMessagePrefix(m.text)}`),
    );
    const hasCanonicalAsst = combined.some((m) => m.role === "assistant" && !isSyntheticMessageId(m.messageId));
    const byId = new Map<string, SessionChatMessage>();
    for (const m of combined) {
      if (isSyntheticMessageId(m.messageId)) {
        const key = `${m.role}:${cleanChatMessagePrefix(m.text)}`;
        if (canonicalPrefixes.has(key) || (m.role === "assistant" && m.messageId.includes(":live") && hasCanonicalAsst)) {
          continue;
        }
      }
      const prev = byId.get(m.messageId);
      if (!prev || m.text.length >= prev.text.length) byId.set(m.messageId, m);
    }
    const sorted = [...byId.values()].sort((a, b) => a.createdAtMs - b.createdAtMs);
    const deduped: SessionChatMessage[] = [];
    for (const m of sorted) {
      const pfx = cleanChatMessagePrefix(m.text);
      const prev = deduped[deduped.length - 1];
      if (prev && prev.role === m.role && cleanChatMessagePrefix(prev.text) === pfx) {
        const pickIncoming = !isSyntheticMessageId(m.messageId) || (isSyntheticMessageId(prev.messageId) && m.text.length >= prev.text.length);
        const mergedSkills = Array.from(new Set([...(prev.attachedSkills ?? []), ...(m.attachedSkills ?? [])]));
        deduped[deduped.length - 1] = {
          ...(pickIncoming ? m : prev),
          text: m.text.length >= prev.text.length ? m.text : prev.text,
          createdAtMs: m.role === "user" ? Math.min(prev.createdAtMs, m.createdAtMs) : Math.max(prev.createdAtMs, m.createdAtMs),
          ...(mergedSkills.length > 0 ? { attachedSkills: mergedSkills } : {}),
        };
        continue;
      }
      if (
        m.role === "user" &&
        isSyntheticMessageId(m.messageId) &&
        deduped.some((prevMsg) => prevMsg.role === "user" && cleanChatMessagePrefix(prevMsg.text) === pfx)
      ) {
        continue;
      }
      deduped.push(m);
    }
    char.messages = deduped.slice(-60);
    const latestUser = [...char.messages].reverse().find((m) => m.role === "user");
    if (latestUser?.text) {
      char.lastUserPromptText = latestUser.text.slice(0, 8000);
    }
    return;
  }

  if (typeof liveAssistantText === "string" && liveAssistantText.trim()) {
    const trimmed = liveAssistantText.trim();
    const pfx = cleanChatMessagePrefix(trimmed);
    const msgs = [...(char.messages ?? [])];
    const last = msgs[msgs.length - 1];
    if (last?.role === "assistant" && (isSyntheticMessageId(last.messageId) || cleanChatMessagePrefix(last.text) === pfx)) {
      if (trimmed.length >= last.text.length) {
        msgs[msgs.length - 1] = { ...last, text: trimmed, updatedAtMs: activityTimestampMs };
        char.messages = msgs;
      }
    } else if (!last || last.role === "user") {
      msgs.push({
        messageId: `asst:${char.sessionId}:live`,
        role: "assistant",
        text: trimmed,
        createdAtMs: Math.max(activityTimestampMs, (last?.createdAtMs ?? 0) + 1),
      });
      char.messages = msgs.slice(-60);
    }
  }
}

export function resolveToolCategory(input: {
  toolName?: string | null;
  workstation?: WorkstationKind | null;
  skillId?: string | null;
  pluginNamespace?: string | null;
}): string {
  const tool = (input.toolName ?? "").trim().toLowerCase();
  if (
    input.skillId ||
    tool === "skill" ||
    input.workstation === "Armory Wardrobe"
  ) {
    return "skill";
  }
  if (
    tool === "subagent" ||
    tool === "task" ||
    tool === "batch" ||
    tool === "todowrite" ||
    tool === "todoread" ||
    input.workstation === "Arcane Lectern"
  ) {
    return "subagent";
  }
  if (
    tool === "edit" ||
    tool === "write" ||
    tool === "multiedit" ||
    tool === "apply_patch" ||
    tool === "notebookedit" ||
    input.workstation === "Crafting Workbench"
  ) {
    return "edit";
  }
  if (
    tool === "bash" ||
    tool === "shell" ||
    tool === "terminal" ||
    tool === "test" ||
    input.workstation === "Anvil Forge"
  ) {
    return "bash";
  }
  if (
    tool === "read" ||
    tool === "glob" ||
    tool === "grep" ||
    tool === "list" ||
    tool === "ls" ||
    tool === "lsp" ||
    tool === "codesearch" ||
    input.workstation === "Library Study Bookshelf"
  ) {
    return "read";
  }
  if (
    tool === "webfetch" ||
    tool === "websearch" ||
    tool === "fetch" ||
    input.workstation === "Observatory Spyglass"
  ) {
    return "comms";
  }
  if (
    tool === "compact" ||
    tool === "compaction" ||
    tool === "summarize"
  ) {
    return "compact";
  }
  if (
    tool === "execute" ||
    Boolean(input.pluginNamespace) ||
    input.workstation === "Alchemy Lab" ||
    input.workstation === "Resource Stockpile"
  ) {
    return "execute";
  }
  return tool || "general";
}

export function applyArmoryTransition(
  char: CharacterState,
  nextCategory: string | null,
  forceEquip = false,
): void {
  if (!nextCategory) {
    char.equippingAtArmory = false;
    return;
  }
  const previousCategory = char.lastEquippedToolCategory;
  if (forceEquip || previousCategory !== nextCategory) {
    char.equippingAtArmory = true;
    char.lastEquippedToolCategory = nextCategory;
  } else {
    char.equippingAtArmory = false;
  }
}

export function deriveWorkflowIntent(
  char: ClassifiableCharacterInput,
): WorkflowIntentKind {
  return classifyCharacterWorkflowIntent(char, { ignoreStoredIntent: true });
}

export function deriveOverheadLabel(
  char: ClassifiableCharacterInput,
): string {
  return deriveOverheadActionLabel(char, {
    ignoreStoredLabel: true,
    workflowIntent: char.workflowIntent,
  });
}

export function syncCharacterWorkflow(char: CharacterState): void {
  char.roleArchetype = reconcileCharacterRoleArchetype(char);
  char.workflowIntent = deriveWorkflowIntent(char);
  char.overheadLabel = deriveOverheadLabel(char);
  if (
    char.lifecycleState === "RestingInLounge" ||
    char.lifecycleState === "Archived" ||
    (char.lifecycleState === "DistillingContextMana" && char.deferredLifecycleState === "RestingInLounge")
  ) {
    char.activePreparationStation = "Break Lounge";
  } else if (char.equippingAtArmory || char.activeWorkstation === "Armory Wardrobe" || char.activeCapability?.kind === "skill") {
    char.activePreparationStation = "Armory Wardrobe";
  } else if (char.activeWorkstation || char.activeCapability || char.questGate) {
    const activeToolName =
      extractCapabilityToolName(char.activeCapability) ||
      char.recentTools?.find((r) => r.toolName.toLowerCase() !== "question")?.toolName;
    const isDebugGather =
      char.workflowIntent === "debugging-hunt" &&
      !char.questGate &&
      isCharacterExploringOrGatheringInfo(char);
    const canon = resolveCanonicalPreparationStation({
      toolName: activeToolName,
      lastToolName: char.recentTools?.[0]?.toolName,
      workstation: char.activeWorkstation,
      lastEquippedToolCategory: char.lastEquippedToolCategory,
      pluginNamespace: char.activePluginNamespace,
      workflowIntent: char.workflowIntent,
      agentClass: isDebugGather ? "explore" : char.agentClass,
    });
    char.activePreparationStation = PREPARATION_STATION_DISPLAY_NAMES[canon];
  } else {
    char.activePreparationStation = null;
  }
}
