import type { CharacterState } from "../types/domain.ts";

export const ARCHIVED_MAX_IN_MEMORY_MESSAGES = 6;
export const ARCHIVED_MAX_TOOL_OUTPUT_PREVIEW_CHARS = 240;
export const ARCHIVED_MAX_TEXT_PREVIEW_CHARS = 800;

function truncateSurrogateSafe(text: string, maxChars: number): string {
  let end = maxChars - 1;
  const lastCode = text.charCodeAt(end - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) end -= 1;
  return `${text.slice(0, end)}…`;
}

export function compactArchivedCharacterPayload(char: CharacterState): boolean {
  let changed = false;

  if (typeof char.lastAssistantText === "string" && char.lastAssistantText.length > ARCHIVED_MAX_TEXT_PREVIEW_CHARS) {
    char.lastAssistantText = truncateSurrogateSafe(char.lastAssistantText, ARCHIVED_MAX_TEXT_PREVIEW_CHARS);
    changed = true;
  }
  if (typeof char.lastUserPromptText === "string" && char.lastUserPromptText.length > ARCHIVED_MAX_TEXT_PREVIEW_CHARS) {
    char.lastUserPromptText = truncateSurrogateSafe(char.lastUserPromptText, ARCHIVED_MAX_TEXT_PREVIEW_CHARS);
    changed = true;
  }

  if (Array.isArray(char.messages)) {
    if (char.messages.length > ARCHIVED_MAX_IN_MEMORY_MESSAGES) {
      char.messages = char.messages.slice(-ARCHIVED_MAX_IN_MEMORY_MESSAGES);
      changed = true;
    }
    for (let i = 0; i < char.messages.length; i++) {
      const msg = char.messages[i];
      if (msg && typeof msg.text === "string" && msg.text.length > ARCHIVED_MAX_TEXT_PREVIEW_CHARS) {
        char.messages[i] = { ...msg, text: truncateSurrogateSafe(msg.text, ARCHIVED_MAX_TEXT_PREVIEW_CHARS) };
        changed = true;
      }
    }
  }

  if (Array.isArray(char.recentTools)) {
    for (let i = 0; i < char.recentTools.length; i++) {
      const rec = char.recentTools[i];
      if (
        rec &&
        rec.status === "completed" &&
        typeof rec.outputPreview === "string" &&
        rec.outputPreview.length > ARCHIVED_MAX_TOOL_OUTPUT_PREVIEW_CHARS
      ) {
        char.recentTools[i] = {
          ...rec,
          outputPreview: truncateSurrogateSafe(rec.outputPreview, ARCHIVED_MAX_TOOL_OUTPUT_PREVIEW_CHARS),
        };
        changed = true;
      }
    }
  }

  return changed;
}
