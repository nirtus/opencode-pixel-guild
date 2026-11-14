import {
  buildAdventurerDispatchLogViewModel,
  type CharacterSheetViewModel,
  escapeHtml,
  formatChatMarkdownHtml,
  formatPublicSafePath,
  sanitizeAndExtractSkillsFromChatText,
} from "../hud/spectator-hud.ts";
import type { CharacterState } from "../types/domain.ts";
import { clientState, type HeroCategorySubtab } from "./client-state.ts";
import { isSessionKilling } from "./snapshot-gate.ts";

export { formatChatMarkdownHtml, sanitizeAndExtractSkillsFromChatText };

export const expandedChatMessageIds = new Set<string>();

function buildOneLinerPreviewText(cleanText: string): string {
  const singleLine = cleanText
    .replace(/```[\s\S]*?```/g, (block) => {
      const firstCodeLine = block.split("\n").slice(1, -1).find((l) => l.trim().length > 0) || "code";
      return `[${firstCodeLine.trim()}]`;
    })
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[**_`~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!singleLine) return "(empty message)";
  return singleLine.length > 180 ? `${singleLine.slice(0, 179)}…` : singleLine;
}

export function renderHeroSubtabBarHtml(
  activeSubtab: HeroCategorySubtab,
  toolsCount: number,
  skillsCount: number,
  hasQuestGate: boolean,
  hasUnviewedResult = false,
): string {
  const chatSuffix = hasQuestGate ? " ⚠️" : hasUnviewedResult ? " ✓" : "";
  const tabs: Array<{ id: HeroCategorySubtab; label: string }> = [
    {
      id: "chat",
      label: `💬 Chat${chatSuffix}`,
    },
    { id: "details", label: "📊 Details" },
    { id: "scrolls", label: `📘 Scrolls<span class="subtab-desktop-suffix"> &amp; Gear</span> (${skillsCount})` },
    { id: "tools", label: `🛠️ Tool<span class="subtab-desktop-suffix"> Log</span> (${toolsCount})` },
  ];

  return `
    <div class="subtab-deck-bar" role="tablist" aria-label="Character Sheet Categories">
      ${tabs
        .map(
          (t) =>
            `<button type="button" class="btn subtab-btn ${activeSubtab === t.id ? "active" : ""}" data-hero-subtab="${t.id}">${t.label}</button>`,
        )
        .join("")}
    </div>
  `;
}

export function renderHeroSubtabStaticHtml(
  sheet: CharacterSheetViewModel,
  subtabOrRawChar?: HeroCategorySubtab | CharacterState,
  legacySubtab?: HeroCategorySubtab,
  _legacyToolsPage = 0,
): string {
  const activeSubtab: HeroCategorySubtab =
    typeof subtabOrRawChar === "string"
      ? subtabOrRawChar
      : (legacySubtab ?? "chat");

  if (activeSubtab === "chat") {
    const dispatchLog =
      sheet.dispatchLog ??
      buildAdventurerDispatchLogViewModel({
        sessionId: sheet.sessionId,
        agentDisplayName: sheet.agentBadge?.displayName || "Adventurer",
        modelId: sheet.modelId || "",
        overheadLabel: sheet.overheadLabel || "Working",
        isBusy: Boolean(sheet.commandScroll?.isBusy),
        messages: sheet.messages ?? [],
        lastUserPromptText: sheet.lastUserPromptText ?? null,
        lastAssistantText: sheet.lastAssistantText ?? null,
      });

    const turns = dispatchLog.turns;
    const isBusy = dispatchLog.isBusy;
    const overheadVerb = dispatchLog.overheadVerb;
    const allExpanded =
      turns.length > 0 &&
      turns.every(
        (t) =>
          expandedChatMessageIds.has(t.messageId) ||
          expandedChatMessageIds.has(`${sheet.sessionId}:${t.messageId}`),
      );

    const turnsHtml = turns
      .map((turn, tIdx) => {
        const skillPillsHtml =
          turn.skills.length > 0
            ? `<div class="pill-list dispatch-skill-pills">${turn.skills
                .map(
                  (sk) =>
                    `<span class="inv-pill inv-pill-skill">@${escapeHtml(sk)}</span>`,
                )
                .join("")}</div>`
            : "";
        const inlineSkillBadge =
          turn.skills.length > 0
            ? `<span class="inv-pill inv-pill-skill dispatch-inline-skill">@${escapeHtml(turn.skills[0]!)}${turn.skills.length > 1 ? `+${turn.skills.length - 1}` : ""}</span>`
            : "";

        const autoExpandGateTurn =
          Boolean(sheet.pendingQuestGate) &&
          tIdx === turns.length - 1 &&
          turn.role === "assistant";
        const isExpanded =
          autoExpandGateTurn ||
          expandedChatMessageIds.has(turn.messageId) ||
          expandedChatMessageIds.has(`${sheet.sessionId}:${turn.messageId}`);
        const oneLinerText = buildOneLinerPreviewText(turn.cleanText);

        const rowClass =
          turn.role === "user" ? "dispatch-user-row" : "dispatch-assistant-row";
        const badgeHtml = turn.agentBadgeLabel
          ? `<span class="dispatch-agent-badge">${escapeHtml(turn.agentBadgeLabel)}</span>`
          : "";
        const togglePillHtml = `<span class="dispatch-toggle-pill">${isExpanded ? "Collapse ▴" : "Expand ▾"}</span>`;
        const bottomCollapseBtnHtml = isExpanded
          ? `<button type="button" class="btn btn-compact-action dispatch-expand-btn" data-toggle-chat-msg="${escapeHtml(turn.messageId)}">Collapse ▴</button>`
          : "";
        return `<div class="${rowClass} dispatch-turn-row ${isExpanded ? "is-expanded" : "is-collapsed"}" data-chat-message-id="${escapeHtml(turn.messageId)}"><button type="button" class="dispatch-turn-oneliner" data-toggle-chat-msg="${escapeHtml(turn.messageId)}" aria-expanded="${isExpanded ? "true" : "false"}" title="Click to ${isExpanded ? "collapse" : "expand"} message details"><span class="dispatch-turn-chevron">${isExpanded ? "▾" : "▸"}</span><strong class="dispatch-turn-speaker">${turn.speakerLabel}</strong>${inlineSkillBadge}<span class="dispatch-oneliner-preview">${escapeHtml(oneLinerText)}</span>${badgeHtml}${togglePillHtml}</button><div class="dispatch-turn-details"${isExpanded ? "" : " hidden"}>${skillPillsHtml}<div class="chat-md-body">${turn.fullHtml}</div>${bottomCollapseBtnHtml}</div></div>`;
      })
      .join("");

    const busyThinkingHtml = isBusy
      ? `<div class="dispatch-thinking-row">⏳ Adventurer is thinking / executing (${escapeHtml(overheadVerb)})...</div>`
      : "";
    const bodyHtml =
      turnsHtml || busyThinkingHtml
        ? `${turnsHtml}${busyThinkingHtml}`
        : `<div class="muted-empty-text">No messages dispatched in this turn yet. Inscribe a Command Scroll below to wake or steer ${escapeHtml(sheet.title)}.</div>`;
    const toggleAllBtnHtml =
      turns.length > 0
        ? `<button type="button" class="btn btn-compact-action dispatch-toggle-all-btn" data-toggle-all-chat-msgs="true">${allExpanded ? "Collapse All ▸" : "Expand All ▾"}</button>`
        : "";

    return `
      <div class="sheet-card dispatch-log-card" id="latest-assistant-response-card">
        <div class="sheet-card-title dispatch-card-title">
          <span>💬 Adventurer Dispatch Log (${turns.length})</span>
          <span class="dispatch-card-title-actions">${toggleAllBtnHtml}<span>${isBusy ? "⚡ Active" : sheet.hasUnviewedResult ? "✓ Result Ready" : "🟢 Idle"}</span></span>
        </div>
        <div class="dispatch-transcript-scroll">
          ${bodyHtml}
        </div>
      </div>
    `;
  }

  if (activeSubtab === "scrolls") {
    const eq = sheet.equipmentLoadout;
    const skillsHtml =
      sheet.skillGrimoireStack.length > 0
        ? sheet.skillGrimoireStack
            .map(
              (s) =>
                `<span class="inv-pill inv-pill-skill">📘 ${escapeHtml(s.name || s.skillId)}</span>`,
            )
            .join("")
        : `<span class="muted-empty-text">None equipped</span>`;

    const roomPlugins =
      sheet.connectedPlugins ??
      clientState.currentSnapshot.rooms?.[sheet.roomId]?.pluginAlcoves ??
      [];
    const pluginsHtml =
      roomPlugins.length > 0
        ? roomPlugins
            .map(
              (p) =>
                `<span class="inv-pill inv-pill-plugin">🔌 ${escapeHtml(("name" in p && p.name) || ("displayName" in p && p.displayName) || p.namespace)} (${escapeHtml(p.status)})</span>`,
            )
            .join("")
        : `<span class="muted-empty-text">Core OpenCode runtime</span>`;

    const beltEntries = Array.isArray(eq.toolBelt) ? eq.toolBelt : [];
    const totalBeltCalls = beltEntries.reduce(
      (sum, b) => sum + (b.count || 0),
      0,
    );
    const toolBeltHtml =
      beltEntries.length > 0
        ? beltEntries
            .map(
              (b) =>
                `<span class="inv-pill" title="${escapeHtml(b.preparationStation || b.workstation || b.toolName)}">🛠️ ${escapeHtml(b.toolName)} &times;${b.count}</span>`,
            )
            .join("")
        : `<span class="muted-empty-text">No tools executed yet</span>`;

    return `
      <div class="sheet-card">
        <div class="sheet-card-title">
          <span>🛡️ Armory Equipment Loadout</span>
          <span>Lv.${eq.level} · ${escapeHtml(eq.tierTitle)}</span>
        </div>
        <div class="inv-grid">
          <div class="inv-slot">
            <div class="inv-slot-label">Headgear (Agent)</div>
            <div class="inv-slot-val">${escapeHtml(eq.headgear.rpgName)}</div>
            <div class="inv-slot-sub">${escapeHtml(eq.headgear.opencodeBinding)}</div>
          </div>
          <div class="inv-slot">
            <div class="inv-slot-label">Robes (Context Tier)</div>
            <div class="inv-slot-val">${escapeHtml(eq.robes.rpgName)}</div>
            <div class="inv-slot-sub">${escapeHtml(eq.robes.opencodeBinding)}</div>
          </div>
          <div class="inv-slot">
            <div class="inv-slot-label">Main-Hand (Tool)</div>
            <div class="inv-slot-val">${escapeHtml(eq.mainHand.rpgName)}</div>
            <div class="inv-slot-sub">${escapeHtml(eq.mainHand.opencodeBinding)}</div>
          </div>
          <div class="inv-slot">
            <div class="inv-slot-label">Off-Hand (Relic)</div>
            <div class="inv-slot-val">${escapeHtml(eq.offHand.rpgName)}</div>
            <div class="inv-slot-sub">${escapeHtml(eq.offHand.opencodeBinding)}</div>
          </div>
        </div>
      </div>

      <div class="sheet-card sheet-card-flex-fill">
        <div class="sheet-card-title">
          <span>🎒 Inventory: Skills, Plugins &amp; Tools</span>
          <span>${totalBeltCalls} calls</span>
        </div>
        <div class="sheet-scroll-list">
          <div class="inv-section-block">
            <div class="inv-slot-label inv-section-title">Equipped Skills (Skill Grimoires)</div>
            <div class="pill-list">${skillsHtml}</div>
          </div>
          <div class="inv-section-block">
            <div class="inv-slot-label inv-section-title">Connected Plugins &amp; MCPs</div>
            <div class="pill-list">${pluginsHtml}</div>
          </div>
          <div>
            <div class="inv-slot-label inv-section-title">Shell &amp; Tool Belt Usage</div>
            <div class="pill-list">${toolBeltHtml}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (activeSubtab === "tools") {
    const totalTools = sheet.recentTools.length;
    const recentToolsHtml =
      totalTools > 0
        ? sheet.recentTools
            .map((rt) => {
              const isExpanded = clientState.selectedToolCallId === rt.callId;
              const maxLen = isExpanded ? 2000 : 180;
              const outText = rt.outputPreview
                ? `<div class="tool-log-output">↳ ${escapeHtml(rt.outputPreview.slice(0, maxLen))}</div>`
                : "";
              return `
                <div class="tool-log-entry ${isExpanded ? "active" : ""}" data-tool-call-id="${escapeHtml(rt.callId)}">
                  <div class="tool-log-header">
                    <strong class="tool-log-name">${escapeHtml(rt.toolName)}</strong>
                    <span class="tool-log-station">${escapeHtml(rt.preparationStation || rt.workstation)}</span>
                  </div>
                  ${rt.inputPreview ? `<div class="tool-log-input">${escapeHtml(rt.inputPreview)}</div>` : ""}
                  ${outText}
                </div>
              `;
            })
            .join("")
        : `<div class="muted-empty-text">No recent tool calls recorded.</div>`;

    return `
      <div class="sheet-card sheet-card-flex-fill">
        <div class="sheet-card-title">
          <span>📜 Recent Tool &amp; Shell Log</span>
          <span>${totalTools} total</span>
        </div>
        <div class="sheet-scroll-list">
          ${recentToolsHtml}
        </div>
      </div>
    `;
  }

  // Default: "details" subtab
  const subagentsCardHtml =
    sheet.childSubagents.length > 0
      ? `<div class="sheet-card sheet-card-flex-fill">
           <div class="sheet-card-title">
             <span>🤝 Squad Subagent Lineage</span>
             <span>${sheet.childSubagents.length} spawned</span>
           </div>
           <div class="sheet-scroll-list">
             <div class="pill-list">${sheet.childSubagents
               .map(
                 (sub) =>
                   `<span class="inv-pill inv-pill-verb">🤝 ${escapeHtml(sub.title || sub.sessionId)} (${escapeHtml(sub.lifecycleState)})</span>`,
               )
               .join("")}</div>
           </div>
         </div>`
      : "";

  return `
    <div class="sheet-card">
      <div class="sheet-card-title">
        <span>📊 Session &amp; Context Mana Details</span>
        <span>${escapeHtml(sheet.cost.formattedCost)}</span>
      </div>
      <div class="session-details-grid">
        ${sheet.projectHeraldry ? `<div>Project: <span class="val-gold" data-herald-party="${escapeHtml(sheet.projectHeraldry.partyKey)}">${escapeHtml(sheet.projectHeraldry.crestIcon)} ${escapeHtml(sheet.projectHeraldry.projectName)} [${escapeHtml(sheet.projectHeraldry.shortTag)}] (${escapeHtml(formatPublicSafePath(sheet.projectHeraldry.projectId))})</span></div>` : ""}
        <div>Session ID: <span class="val-light">${escapeHtml(sheet.sessionId)}</span></div>
        <div>Model: <span class="val-blue">${escapeHtml(sheet.modelId)}</span></div>
        <div>Context Mana: <span class="val-purple">${sheet.contextMana.usedTokens.toLocaleString()} / ${sheet.contextMana.limitTokens.toLocaleString()} (${sheet.contextMana.percent}%)</span></div>
        <div>Input / Output: <span class="val-light">${sheet.cost.inputTokens.toLocaleString()} in · ${sheet.cost.outputTokens.toLocaleString()} out</span></div>
        <div>Target Station: <span class="val-gold">${escapeHtml(sheet.activeTarget.preparationStation || sheet.activeTarget.workstation || "Break Lounge")}</span></div>
        <div>Compactions: <span class="val-emerald">${sheet.contextMana.compactionCount}</span></div>
      </div>
    </div>
    ${subagentsCardHtml}
    <div class="kill-section-wrap">
      ${
        clientState.pendingKillSessionId === sheet.sessionId || isSessionKilling(sheet.sessionId)
          ? `<div class="kill-confirm-box">
               <div class="kill-confirm-prompt">${escapeHtml(sheet.killAction.confirmPrompt)}</div>
               <div class="kill-confirm-actions">
                 <button id="btn-confirm-kill-character" type="button" class="btn btn-kill-confirm"${isSessionKilling(sheet.sessionId) ? " disabled" : ""}>${isSessionKilling(sheet.sessionId) ? "⏳ Deleting..." : "☠ Confirm Delete"}</button>
                 <button id="btn-cancel-kill-character" type="button" class="btn"${isSessionKilling(sheet.sessionId) ? " disabled" : ""}>Cancel</button>
               </div>
             </div>`
          : `<button id="btn-kill-character" type="button" class="btn btn-kill-danger">
               ☠ Kill Character (Delete Session)
             </button>`
      }
    </div>
  `;
}
