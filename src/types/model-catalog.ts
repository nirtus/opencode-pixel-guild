export interface ModelCatalogEntry {
  id: string;
  providerId?: string;
  providerName?: string;
  name?: string;
  type?: string;
  disabled?: boolean;
  variants?: readonly string[];
  limitContext: number;
  limitOutput?: number;
  isFallbackCurrent?: boolean;
}

export interface ParsedModelRef {
  providerId?: string;
  id: string;
  modelId: string;
  variant?: string;
  fullSpec: string;
}

export interface DaemonModelRef {
  providerID: string;
  id: string;
  variant?: string;
}

export interface RawModelCatalogInput {
  id?: string;
  modelID?: string;
  model?: string;
  providerID?: string;
  providerId?: string;
  providerName?: string;
  name?: string;
  type?: string;
  disabled?: boolean;
  limit?: { context?: number; output?: number };
  limitContext?: number;
  limitOutput?: number;
  variants?: ReadonlyArray<string | { id?: string; name?: string }> | Record<string, unknown>;
}

export interface ModelProviderGroup {
  providerId: string;
  providerLabel: string;
  models: ModelCatalogEntry[];
}

export interface NormalizedModelCatalogResult {
  models: ModelCatalogEntry[];
  byKey: Record<string, ModelCatalogEntry>;
}

function splitModelIdAndVariant(raw: string): { base: string; variant?: string } {
  const trimmed = raw.trim();
  const hashIdx = trimmed.indexOf("#");
  if (hashIdx === -1) return { base: trimmed };
  const base = trimmed.slice(0, hashIdx).trim();
  const variant = trimmed.slice(hashIdx + 1).trim();
  return variant ? { base, variant } : { base };
}

export function parseModelRef(
  raw: unknown,
  fallbackObj?: Record<string, unknown>,
): ParsedModelRef | null {
  let providerId: string | undefined;
  let rawId: string | undefined;
  let explicitVariant: string | undefined;

  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const p = obj.providerID ?? obj.providerId;
    if (typeof p === "string" && p.trim()) providerId = p.trim();
    const idCandidate = obj.id ?? obj.model ?? obj.modelID;
    if (typeof idCandidate === "string" && idCandidate.trim()) rawId = idCandidate.trim();
    if (typeof obj.variant === "string" && obj.variant.trim()) explicitVariant = obj.variant.trim();
  } else if (typeof raw === "string" && raw.trim()) {
    rawId = raw.trim();
  }

  if (!rawId && fallbackObj) {
    const fallbackId = fallbackObj.modelID ?? fallbackObj.modelId;
    if (typeof fallbackId === "string" && fallbackId.trim()) rawId = fallbackId.trim();
    if (!providerId) {
      const fp = fallbackObj.providerID ?? fallbackObj.providerId;
      if (typeof fp === "string" && fp.trim()) providerId = fp.trim();
    }
    if (!explicitVariant && typeof fallbackObj.variant === "string" && fallbackObj.variant.trim()) {
      explicitVariant = fallbackObj.variant.trim();
    }
  }

  if (!rawId) return null;
  const { base, variant: inlineVariant } = splitModelIdAndVariant(rawId);
  if (!base) return null;

  let id = base;
  if (providerId) {
    const prefix = `${providerId}/`;
    if (base.startsWith(prefix)) {
      id = base.slice(prefix.length).trim();
    }
  } else {
    const slashIdx = base.indexOf("/");
    if (slashIdx > 0 && slashIdx < base.length - 1) {
      providerId = base.slice(0, slashIdx).trim();
      id = base.slice(slashIdx + 1).trim();
    }
  }
  if (!id) return null;

  const modelId = providerId ? `${providerId}/${id}` : id;
  const variant = explicitVariant || inlineVariant;
  const fullSpec = variant ? `${modelId}#${variant}` : modelId;
  return {
    ...(providerId ? { providerId } : {}),
    id,
    modelId,
    ...(variant ? { variant } : {}),
    fullSpec,
  };
}

export function toDaemonModelRef(
  modelId: string | undefined | null,
  variant?: string | null,
): DaemonModelRef | null {
  const parsed = parseModelRef(modelId);
  if (!parsed || !parsed.providerId || !parsed.id) return null;
  const effectiveVariant =
    typeof variant === "string" && variant.trim() ? variant.trim() : parsed.variant;
  return {
    providerID: parsed.providerId,
    id: parsed.id,
    ...(effectiveVariant ? { variant: effectiveVariant } : {}),
  };
}

export function resolveEffectiveModelVariant(
  modelId: string | undefined | null,
  explicitVariant?: string | null,
): string | null {
  if (explicitVariant === null) return null;
  if (typeof explicitVariant === "string" && explicitVariant.trim()) {
    return explicitVariant.trim();
  }
  return parseModelRef(modelId)?.variant ?? null;
}

export function formatModelDisplaySpec(
  modelId: string | undefined | null,
  variant?: string | null,
): string {
  const parsed = parseModelRef(modelId);
  if (!parsed) return (modelId ?? "").trim() || "default";
  const effectiveVariant =
    typeof variant === "string" && variant.trim() ? variant.trim() : parsed.variant;
  return effectiveVariant ? `${parsed.modelId}#${effectiveVariant}` : parsed.modelId;
}

export function extractModelVariants(rawVariants: RawModelCatalogInput["variants"]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const pushId = (val: unknown) => {
    if (typeof val !== "string") return;
    const trimmed = val.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };
  if (Array.isArray(rawVariants)) {
    for (const item of rawVariants) {
      if (typeof item === "string") pushId(item);
      else if (item && typeof item === "object") {
        pushId((item as { id?: string; name?: string }).id ?? (item as { name?: string }).name);
      }
    }
  } else if (rawVariants && typeof rawVariants === "object") {
    for (const key of Object.keys(rawVariants)) pushId(key);
  }
  return out;
}

export function isSelectableChatModel(
  model: Pick<ModelCatalogEntry, "id" | "type" | "disabled"> | null | undefined,
): boolean {
  if (!model || typeof model.id !== "string" || !model.id.trim()) return false;
  if (model.disabled) return false;
  if (model.type && model.type.trim().toLowerCase() !== "chat") return false;
  return true;
}

export function indexModelCatalogEntry(
  target: Record<string, ModelCatalogEntry>,
  entry: ModelCatalogEntry,
): void {
  const parsed = parseModelRef({ providerID: entry.providerId, id: entry.id });
  const canonicalId = parsed?.modelId ?? entry.id;
  const shortId = parsed?.id ?? entry.id.split("/").pop() ?? entry.id;
  const keys = new Set<string>([
    entry.id,
    entry.id.toLowerCase(),
    canonicalId,
    canonicalId.toLowerCase(),
    shortId,
    shortId.toLowerCase(),
  ]);
  const lastSegment = shortId.split("/").pop();
  if (lastSegment) {
    keys.add(lastSegment);
    keys.add(lastSegment.toLowerCase());
  }
  if (entry.providerId) {
    keys.add(`${entry.providerId}/${shortId}`);
    keys.add(`${entry.providerId}/${shortId}`.toLowerCase());
  }
  for (const key of keys) target[key] = entry;
}

export function normalizeCatalogModels(
  rawModels: ReadonlyArray<RawModelCatalogInput> | null | undefined,
  providerNameById?: Record<string, string>,
): NormalizedModelCatalogResult {
  const byKey: Record<string, ModelCatalogEntry> = {};
  const models: ModelCatalogEntry[] = [];
  const seenIds = new Set<string>();
  if (!Array.isArray(rawModels)) return { models, byKey };

  for (const raw of rawModels) {
    const parsed = parseModelRef({
      providerID: raw?.providerID ?? raw?.providerId,
      id: raw?.id ?? raw?.modelID ?? raw?.model,
    });
    if (!parsed) continue;
    const canonicalId = parsed.modelId;
    if (seenIds.has(canonicalId)) continue;
    seenIds.add(canonicalId);

    const providerId = parsed.providerId ?? raw.providerID ?? raw.providerId;
    const providerName =
      raw.providerName ?? (providerId && providerNameById ? providerNameById[providerId] : undefined);
    const variants = extractModelVariants(raw.variants);
    const contextLimit =
      typeof raw.limitContext === "number" && raw.limitContext > 0
        ? raw.limitContext
        : typeof raw.limit?.context === "number" && raw.limit.context > 0
          ? raw.limit.context
          : resolveModelContextLimit(canonicalId);
    const outputLimit =
      typeof raw.limitOutput === "number" && raw.limitOutput > 0
        ? raw.limitOutput
        : typeof raw.limit?.output === "number" && raw.limit.output > 0
          ? raw.limit.output
          : undefined;

    const entry: ModelCatalogEntry = {
      id: canonicalId,
      ...(providerId ? { providerId } : {}),
      ...(providerName ? { providerName } : {}),
      name: (raw.name ?? "").trim() || parsed.id,
      ...(raw.type ? { type: raw.type } : {}),
      ...(raw.disabled ? { disabled: true } : {}),
      ...(variants.length > 0 ? { variants } : {}),
      limitContext: contextLimit,
      ...(outputLimit ? { limitOutput: outputLimit } : {}),
    };
    models.push(entry);
    indexModelCatalogEntry(byKey, entry);
  }
  return { models, byKey };
}

export function resolveModelContextLimit(
  modelId?: string | null,
  catalogModels?: Record<string, { limitContext: number }>,
): number {
  const parsed = parseModelRef(modelId);
  const raw = parsed?.modelId ?? (modelId ?? "").trim();
  if (raw) {
    const lower = raw.toLowerCase();
    const shortId = (parsed?.id ?? lower.split("/").pop() ?? lower).toLowerCase();
    const lastSeg = shortId.split("/").pop() ?? shortId;
    if (catalogModels) {
      const exact =
        catalogModels[raw] ??
        catalogModels[lower] ??
        catalogModels[shortId] ??
        catalogModels[lastSeg];
      if (exact && typeof exact.limitContext === "number" && exact.limitContext > 0) {
        return exact.limitContext;
      }
    }
    if (shortId.includes("gemini-")) return 1_048_576;
    if (shortId.includes("gpt-5") || shortId.includes("codex")) return 400_000;
    if (shortId.includes("flint-") || shortId.includes("qwen3")) return 262_144;
  }
  return 200_000;
}

export function groupSelectableModelsByProvider(
  models: ReadonlyArray<ModelCatalogEntry>,
): ModelProviderGroup[] {
  const groupMap = new Map<string, ModelProviderGroup>();
  for (const model of models) {
    if (!isSelectableChatModel(model)) continue;
    const parsed = parseModelRef({ providerID: model.providerId, id: model.id });
    const providerId = model.providerId ?? parsed?.providerId ?? "other";
    const providerLabel = (model.providerName ?? "").trim() || providerId;
    let group = groupMap.get(providerId);
    if (!group) {
      group = { providerId, providerLabel, models: [] };
      groupMap.set(providerId, group);
    }
    group.models.push(model);
  }
  const groups = [...groupMap.values()];
  groups.sort((a, b) => a.providerLabel.localeCompare(b.providerLabel));
  for (const g of groups) {
    g.models.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  }
  return groups;
}

export function resolveRoomSelectableModels(
  roomModels: ReadonlyArray<ModelCatalogEntry> | undefined,
  snapshotModels: ReadonlyArray<ModelCatalogEntry> | undefined,
  currentModelId?: string | null,
): ModelCatalogEntry[] {
  const source = roomModels && roomModels.length > 0 ? roomModels : snapshotModels ?? [];
  const filtered = source.filter((m) => isSelectableChatModel(m));
  const seen = new Set(filtered.map((m) => m.id.toLowerCase()));
  const parsedCurrent = parseModelRef(currentModelId);
  if (
    parsedCurrent &&
    parsedCurrent.modelId !== "default" &&
    parsedCurrent.modelId !== "unknown-model" &&
    !parsedCurrent.modelId.endsWith("/unknown-model") &&
    !seen.has(parsedCurrent.modelId.toLowerCase())
  ) {
    return [
      {
        id: parsedCurrent.modelId,
        ...(parsedCurrent.providerId ? { providerId: parsedCurrent.providerId } : {}),
        name: `${parsedCurrent.id} (current)`,
        type: "chat",
        limitContext: resolveModelContextLimit(parsedCurrent.modelId),
        isFallbackCurrent: true,
      },
      ...filtered,
    ];
  }
  return filtered;
}
