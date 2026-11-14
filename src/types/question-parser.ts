import type { QuestGateOptionItem, QuestGateQuestionField } from "./command-types.ts";

export interface ConversationalQuestionDetection {
  readonly reason: string;
  readonly title: string;
  readonly fields: readonly QuestGateQuestionField[];
  readonly gateHash: string;
}

export function computeConversationalGateHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cleanMarkdownInline(raw: string): string {
  return raw
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/[**_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBulletOrNumberedOptionLine(line: string): QuestGateOptionItem | null {
  const trimmed = line.trim();
  const boldMatch = trimmed.match(
    /^(?:[-*•]|\d+[.)])\s+\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?\s*(?:[:—–-]\s*(.+))?$/,
  );
  if (boldMatch) {
    const baseLabel = boldMatch[1]!.trim();
    const paren = boldMatch[2]?.trim();
    const desc = boldMatch[3]?.trim();
    const label = paren ? `${baseLabel} (${paren})` : baseLabel;
    if (label.length >= 2 && label.length <= 120) {
      return { label, description: desc ? cleanMarkdownInline(desc) : undefined, value: label };
    }
  }
  const plainMatch = trimmed.match(
    /^(?:[-*•]|\d+[.)])\s+((?:Option|Candidate|Choice|Phase|Approach|Alternative|Variant)\s+[A-Z0-9][^:—–\n]{0,70}?)\s*(?:[:—–-]\s*(.+))?$/i,
  );
  if (plainMatch) {
    const label = cleanMarkdownInline(plainMatch[1]!);
    const desc = plainMatch[2] ? cleanMarkdownInline(plainMatch[2]) : undefined;
    if (label) return { label, description: desc, value: label };
  }
  return null;
}

function extractRecommendationFromLines(
  lines: readonly string[],
): { choice: string; description?: string } | null {
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const arrowMatch = trimmed.match(
      /^➡️\s*(?:\*\*)?(?:Recommended\s*:\s*)?([^—–:\n*]+?)(?:\*\*)?\s*(?:[—–:-]\s*(.+))?$/i,
    );
    if (arrowMatch) {
      const choice = cleanMarkdownInline(arrowMatch[1]!).replace(/^Recommended\s*:\s*/i, "").trim();
      const rest = arrowMatch[2] ? cleanMarkdownInline(arrowMatch[2]) : undefined;
      if (choice) return { choice, description: rest };
    }
    const startWithMatch = trimmed.match(/^Start with\s+\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?\s*:?$/i);
    if (startWithMatch) {
      const rawChoice = cleanMarkdownInline(startWithMatch[1]!);
      const shortChoice = rawChoice.replace(/\s+as\s+a\s+.+$/i, "").trim();
      return {
        choice: shortChoice || rawChoice,
        description: startWithMatch[2] ? cleanMarkdownInline(startWithMatch[2]) : rawChoice,
      };
    }
  }
  return null;
}

export function extractOptionsFromQuestionText(questionText: string): QuestGateOptionItem[] {
  const lines = questionText.split(/\r?\n/);
  const explicitOptions: QuestGateOptionItem[] = [];
  const seenLabels = new Set<string>();

  const pushOpt = (opt: QuestGateOptionItem, unshift = false) => {
    const key = opt.label.toLowerCase();
    if (!key || seenLabels.has(key)) return;
    seenLabels.add(key);
    if (unshift) explicitOptions.unshift(opt);
    else explicitOptions.push(opt);
  };

  for (const line of lines) {
    const parsed = parseBulletOrNumberedOptionLine(line);
    if (parsed) {
      const isGrillingContextStep =
        /^\s*\d+[.)]\s+/.test(line) &&
        lines.some((l) => l.trim().startsWith("➡️")) &&
        !/^(?:Option|Candidate|Choice|Approach|Alternative|Variant)\b/i.test(parsed.label);
      if (!isGrillingContextStep) pushOpt(parsed);
    }
  }

  const rec = extractRecommendationFromLines(lines);
  if (rec) {
    const isYesRec = /^yes\b/i.test(rec.choice);
    const isNoRec = /^no\b/i.test(rec.choice);
    if (isYesRec || isNoRec) {
      const targetKey = isYesRec ? "yes" : "no";
      const existingMatch = explicitOptions.find((o) => (o.value || o.label).trim().toLowerCase() === targetKey);
      const primaryOpt: QuestGateOptionItem = isYesRec
        ? { label: "Yes (Recommended)", description: rec.description || existingMatch?.description || "Accept the recommended design", value: "Yes" }
        : { label: "No (Recommended)", description: rec.description || existingMatch?.description || "Follow the recommended choice", value: "No" };
      const seenValues = new Set<string>([targetKey]);
      const deduped: QuestGateOptionItem[] = [primaryOpt];
      for (const opt of explicitOptions) {
        const valKey = (opt.value || opt.label).trim().toLowerCase();
        if (!valKey || seenValues.has(valKey)) continue;
        seenValues.add(valKey);
        deduped.push(opt);
      }
      if (deduped.length === 1) {
        deduped.push(
          isYesRec
            ? { label: "No / Revise", description: "Request adjustments or propose an alternative", value: "No — please revise" }
            : { label: "Yes", description: "Proceed with Yes instead", value: "Yes" },
        );
      }
      return deduped;
    } else {
      const existingIdx = explicitOptions.findIndex(
        (o) =>
          o.label.toLowerCase().includes(rec.choice.toLowerCase()) ||
          rec.choice.toLowerCase().includes(o.label.toLowerCase()),
      );
      if (existingIdx >= 0) {
        const match = explicitOptions[existingIdx]!;
        const updatedLabel = /recommended/i.test(match.label) ? match.label : `${match.label} (Recommended)`;
        explicitOptions.splice(existingIdx, 1);
        explicitOptions.unshift({
          label: updatedLabel,
          description: match.description || rec.description,
          value: match.value || match.label,
        });
      } else {
        const label = /recommended/i.test(rec.choice) ? rec.choice : `${rec.choice} (Recommended)`;
        pushOpt({ label, description: rec.description, value: rec.choice }, true);
      }
      if (explicitOptions.length === 1) {
        pushOpt({ label: "Discuss / Revise", description: "Ask for an alternative approach", value: "Let's revise this" });
      }
    }
  }

  if (explicitOptions.length > 0) return explicitOptions;

  const lastNonEmpty = [...lines].map((l) => l.trim()).filter(Boolean).pop() ?? "";
  const orMatch = lastNonEmpty.match(
    /\b(?:use|keep|choose|prefer|between|either)\s+([A-Za-z0-9_`.-]{2,40})\s+or\s+([A-Za-z0-9_`.-]{2,40})\s*\?/i,
  );
  if (orMatch) {
    const optA = cleanMarkdownInline(orMatch[1]!);
    const optB = cleanMarkdownInline(orMatch[2]!);
    if (optA && optB && optA.toLowerCase() !== optB.toLowerCase()) {
      return [{ label: optA, value: optA }, { label: optB, value: optB }];
    }
  }

  if (/\?\s*[*_)\]"'`]*$/.test(lastNonEmpty)) {
    if (/^(?:which|what)\s+(?:one|option|config|approach|candidate)/i.test(lastNonEmpty)) {
      return [
        { label: "First option (Recommended)", value: "Use the first option" },
        { label: "Second option", value: "Use the second option" },
      ];
    }
    return [
      { label: "Yes, proceed (Recommended)", description: "Confirm and continue with the proposed approach", value: "Yes, proceed" },
      { label: "No / Adjust first", description: "Hold off and adjust the approach", value: "No, let's adjust first" },
    ];
  }
  return [];
}

function unwrapRawFieldsArray(rawFields: unknown): unknown[] {
  if (Array.isArray(rawFields)) return rawFields;
  if (typeof rawFields === "string" && rawFields.trim()) {
    try {
      return unwrapRawFieldsArray(JSON.parse(rawFields));
    } catch {
      return [];
    }
  }
  if (rawFields && typeof rawFields === "object") {
    const obj = rawFields as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions;
    if (Array.isArray(obj.fields)) return obj.fields;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

function pickStr(obj: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

export function normalizeQuestGateFields(rawFields: unknown): QuestGateQuestionField[] {
  const arr = unwrapRawFieldsArray(rawFields);
  if (arr.length === 0) return [];
  const result: QuestGateQuestionField[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown> | null;
    if (!item || typeof item !== "object") continue;
    const key = pickStr(item, ["key", "id", "name"]) || `q${i}`;
    const header = pickStr(item, ["header", "title", "label"]);
    const question = pickStr(item, ["question", "description", "prompt", "text"]) || header || `Question ${i + 1}`;
    const rawOpts = unwrapRawFieldsArray(item.options ?? item.choices ?? item.items ?? item.enum ?? item.values);
    const options: QuestGateOptionItem[] = [];
    for (const opt of rawOpts) {
      if (typeof opt === "string" && opt.trim()) {
        options.push({ label: opt.trim(), value: opt.trim() });
      } else if (opt && typeof opt === "object") {
        const o = opt as Record<string, unknown>;
        const label = pickStr(o, ["label", "title", "name", "text", "value", "id"]);
        if (label) {
          const desc = pickStr(o, ["description", "detail", "hint", "summary"]);
          const val = pickStr(o, ["value", "id"]) || label;
          options.push({ label, description: desc, value: val });
        }
      }
    }
    const finalOptions = options.length > 0 ? options : extractOptionsFromQuestionText(question);
    const multiple = item.multiple === true || item.type === "multiselect" || item.type === "checkbox";
    result.push({
      key,
      header,
      question,
      options: finalOptions.length > 0 ? finalOptions : undefined,
      multiple,
      required: item.required !== false,
    });
  }
  return result;
}

export function mergeQuestGateFields(baseRaw: unknown, incomingRaw: unknown): QuestGateQuestionField[] {
  const base = normalizeQuestGateFields(baseRaw);
  const incoming = normalizeQuestGateFields(incomingRaw);
  if (!base.length) return incoming;
  if (!incoming.length) return base;
  const pickKey = (bKey: string | undefined, iKey: string | undefined, idx: number): string => {
    const isGeneric = (k: string | undefined) => !k || /^q\d+$/.test(k);
    if (iKey && !isGeneric(iKey)) return iKey;
    if (bKey && !isGeneric(bKey)) return bKey;
    return iKey || bKey || `q${idx}`;
  };
  if (incoming.length > base.length) {
    return incoming.map((hf, idx) => ({ ...hf, key: pickKey(base[idx]?.key, hf.key, idx) }));
  }
  return base.map((ef, idx) => {
    const hf = incoming[idx];
    if (!hf) return ef;
    return {
      key: pickKey(ef.key, hf.key, idx),
      header: hf.header || ef.header,
      question: hf.question.length >= ef.question.length ? hf.question : ef.question,
      options: (hf.options?.length ?? 0) >= (ef.options?.length ?? 0) ? (hf.options ?? ef.options) : ef.options,
      multiple: hf.multiple ?? ef.multiple,
      required: ef.required ?? hf.required,
    };
  });
}

const QUESTION_MARKER_LINE_RE = /^\s*(?:[#>*\-\d.)\s*_`~])*❓\s*(?:\*\*?(Q\d+)\*\*?|(Q\d+))?\s*(?:[—–:\-]\s*(.+))?$/i;
const STRUCTURED_Q_HEADING_RE = /^\s*(?:(?:#{1,4}|[-*•]|\d+[.)])\s+)?\*\*(Q\d+)\b([^*]*)\*\*\s*(?:[—–:\-]\s*(.+))?$/i;

function matchQuestionBlockStart(line: string): { qKey: string; headerTitle: string } | null {
  const trimmed = line.trim();
  if (/^(?:[#>*\-\d.)\s*_`~])*❓/.test(trimmed)) {
    const m = trimmed.match(QUESTION_MARKER_LINE_RE);
    const qKey = (m?.[1] || m?.[2] || "").toUpperCase();
    const rest = cleanMarkdownInline(trimmed.replace(/^(?:[#>*\-\d.)\s*_`~])*❓\s*/, ""));
    return { qKey, headerTitle: rest || qKey || "Question" };
  }
  const sm = trimmed.match(STRUCTURED_Q_HEADING_RE);
  if (sm) {
    const qKey = sm[1]!.toUpperCase();
    const suffix = cleanMarkdownInline(`${sm[2] ?? ""} ${sm[3] ?? ""}`);
    return { qKey, headerTitle: suffix ? `${qKey} — ${suffix}` : qKey };
  }
  return null;
}

export function detectConversationalQuestionPrompt(fullText: string | null | undefined): ConversationalQuestionDetection | null {
  if (!fullText || !fullText.trim()) return null;
  const rawLines = fullText.split(/\r?\n/);

  const blockStarts: Array<{ lineIdx: number; qKey: string; headerTitle: string }> = [];
  for (let i = 0; i < rawLines.length; i++) {
    const m = matchQuestionBlockStart(rawLines[i]!);
    if (m) blockStarts.push({ lineIdx: i, ...m });
  }

  const hasArrowOrEmoji = fullText.includes("❓") || rawLines.some((l) => l.trim().startsWith("➡️"));
  if (blockStarts.length > 0 && (hasArrowOrEmoji || blockStarts.length >= 2)) {
    const firstIdx = blockStarts[0]!.lineIdx;
    const introText = rawLines.slice(0, firstIdx).filter((l) => !/^\s*---+\s*$/.test(l)).join("\n").trim();
    const fields: QuestGateQuestionField[] = [];
    for (let b = 0; b < blockStarts.length; b++) {
      const start = blockStarts[b]!;
      const endLineIdx = b + 1 < blockStarts.length ? blockStarts[b + 1]!.lineIdx : rawLines.length;
      const chunkText = rawLines.slice(start.lineIdx, endLineIdx).filter((l) => !/^\s*---+\s*$/.test(l)).join("\n").trim();
      const key = start.qKey || `Q${b + 1}`;
      const header = start.headerTitle || `Question ${b + 1}`;
      const questionBody = b === 0 && introText ? `${introText}\n\n${chunkText}` : chunkText;
      const options = extractOptionsFromQuestionText(chunkText);
      fields.push({ key, header, question: questionBody, options: options.length > 0 ? options : undefined, multiple: false, required: true });
    }
    const fullReason = rawLines.filter((l) => !/^\s*---+\s*$/.test(l)).join("\n").trim();
    const title = fields.length > 1 ? `${fields.length} Questions (${fields.map((f) => f.key).join(", ")})` : fields[0]?.header || "Waiting for User Input";
    return { reason: fullReason, title, fields, gateHash: computeConversationalGateHash(fullReason) };
  }

  const nonEmptyLines = rawLines.filter((l) => Boolean(l.trim()) && !/^\s*---+\s*$/.test(l));
  const nonArrowLines = nonEmptyLines.filter((l) => !l.trim().startsWith("➡️"));
  const lastLine = (nonArrowLines[nonArrowLines.length - 1] ?? "").trim();
  const isCodeOrUrl = lastLine.startsWith("```") || /^https?:\/\/\S+$/i.test(lastLine);
  const endsWithQuestion = !isCodeOrUrl && /[a-zA-Z0-9)\]"'`]\?[*_)\]"'`]*\s*$/.test(lastLine);

  if (endsWithQuestion) {
    let startIdx = Math.max(0, rawLines.length - 40);
    for (let i = rawLines.length - 2; i >= 0; i--) {
      if (/^\s*#{1,3}\s+/.test(rawLines[i]!)) { startIdx = i; break; }
    }
    const sectionText = rawLines.slice(startIdx).filter((l) => !/^\s*---+\s*$/.test(l)).join("\n").trim();
    const options = extractOptionsFromQuestionText(sectionText);
    const field: QuestGateQuestionField = {
      key: "q0",
      header: cleanMarkdownInline(lastLine),
      question: sectionText,
      options: options.length > 0 ? options : undefined,
      multiple: false,
      required: true,
    };
    return { reason: sectionText, title: "Waiting for User Input", fields: [field], gateHash: computeConversationalGateHash(sectionText) };
  }
  return null;
}
