import type { CharacterState } from "../types/domain.ts";

export const ARCHIVED_MAX_IN_MEMORY_MESSAGES = 6;
export const ARCHIVED_MAX_TOOL_OUTPUT_PREVIEW_CHARS = 240;

export function compactArchivedCharacterPayload(char: CharacterState): boolean {
  let changed = false;

  if (Array.isArray(char.messages) && char.messages.length > ARCHIVED_MAX_IN_MEMORY_MESSAGES) {
    char.messages = char.messages.slice(-ARCHIVED_MAX_IN_MEMORY_MESSAGES);
    changed = true;
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
        let end = ARCHIVED_MAX_TOOL_OUTPUT_PREVIEW_CHARS - 1;
        const lastCode = rec.outputPreview.charCodeAt(end - 1);
        if (lastCode >= 0xd800 && lastCode <= 0xdbff) end -= 1;
        char.recentTools[i] = {
          ...rec,
          outputPreview: `${rec.outputPreview.slice(0, end)}…`,
        };
        changed = true;
      }
    }
  }

  return changed;
}
