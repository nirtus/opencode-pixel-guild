import {
  parseModelRef,
  resolveEffectiveModelVariant,
  toDaemonModelRef,
  type GuildCommandRequest,
} from "../types/domain.ts";

export interface DaemonPostResult {
  ok: boolean;
  status: number;
  raw: Record<string, any> | null;
}

export type DaemonPostJsonFn = (
  path: string,
  body: Record<string, unknown>,
) => Promise<DaemonPostResult>;

export type DaemonErrorFormatter = (res: {
  status: number;
  raw: Record<string, any> | null;
}) => string;

export interface DaemonSwitchResult {
  ok: boolean;
  sessionId: string;
  error?: string;
}

export async function executeDaemonAgentSwitch(
  postJson: DaemonPostJsonFn,
  formatResponseError: DaemonErrorFormatter,
  sessionId: string,
  query: string,
  agentClass: string,
): Promise<DaemonSwitchResult> {
  const res = await postJson(
    `/api/session/${encodeURIComponent(sessionId)}/agent${query}`,
    { agent: agentClass.trim() },
  );
  return {
    ok: res.ok,
    sessionId,
    ...(res.ok ? {} : { error: formatResponseError(res) }),
  };
}

export async function executeDaemonModelSwitch(
  postJson: DaemonPostJsonFn,
  formatResponseError: DaemonErrorFormatter,
  sessionId: string,
  query: string,
  modelId: string,
  modelVariant?: string | null,
): Promise<DaemonSwitchResult> {
  const modelRef = toDaemonModelRef(modelId, modelVariant);
  if (!modelRef) {
    return {
      ok: false,
      sessionId,
      error: `Invalid OpenCode model reference: ${modelId}`,
    };
  }
  const res = await postJson(
    `/api/session/${encodeURIComponent(sessionId)}/model${query}`,
    modelRef as unknown as Record<string, unknown>,
  );
  return {
    ok: res.ok,
    sessionId,
    ...(res.ok ? {} : { error: formatResponseError(res) }),
  };
}

export async function applyPrePromptSessionSwitches(
  postJson: DaemonPostJsonFn,
  formatResponseError: DaemonErrorFormatter,
  cmd: Extract<GuildCommandRequest, { command: "scroll.send" }>,
  query: string,
): Promise<DaemonSwitchResult | null> {
  const reqAgent = cmd.agentClass?.trim();
  const curAgent = cmd.currentAgentClass?.trim();
  if (reqAgent && (!curAgent || reqAgent !== curAgent)) {
    const agentRes = await executeDaemonAgentSwitch(
      postJson,
      formatResponseError,
      cmd.sessionId,
      query,
      reqAgent,
    );
    if (!agentRes.ok) return agentRes;
  }

  const reqModelRaw = cmd.modelId?.trim();
  if (reqModelRaw) {
    const reqParsed = parseModelRef(reqModelRaw);
    const reqModelId = reqParsed?.modelId ?? reqModelRaw;
    const reqVariant = resolveEffectiveModelVariant(reqModelRaw, cmd.modelVariant) ?? undefined;

    const curParsed = cmd.currentModelId ? parseModelRef(cmd.currentModelId) : null;
    const curModelId = curParsed?.modelId ?? cmd.currentModelId?.trim();
    const curVariant = resolveEffectiveModelVariant(cmd.currentModelId, cmd.currentModelVariant) ?? undefined;

    const modelChanged = !curModelId || reqModelId !== curModelId;
    const variantChanged = Boolean(curModelId) && (reqVariant ?? "") !== (curVariant ?? "");
    if (modelChanged || variantChanged) {
      const modelRes = await executeDaemonModelSwitch(
        postJson,
        formatResponseError,
        cmd.sessionId,
        query,
        reqModelId,
        reqVariant,
      );
      if (!modelRes.ok) return modelRes;
    }
  }

  return null;
}
