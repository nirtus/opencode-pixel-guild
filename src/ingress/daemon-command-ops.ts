import { toDaemonDirectoryPath } from "../state/world-reducer.ts";
import { toDaemonModelRef, type GuildCommandRequest } from "../types/domain.ts";
import {
  applyPrePromptSessionSwitches,
  executeDaemonAgentSwitch,
  executeDaemonModelSwitch,
} from "./daemon-session-switches.ts";
import { fetchWithDockerHostFallback } from "./opencode-pair-redeemer.ts";

export function extractMergedSkills(
  promptText: string | undefined,
  explicitSkills: readonly string[] | undefined,
): string[] {
  const skills = new Set<string>();
  if (Array.isArray(explicitSkills)) {
    for (const sk of explicitSkills) if (typeof sk === "string" && sk.trim()) skills.add(sk.trim());
  }
  if (typeof promptText === "string" && promptText) {
    for (const match of promptText.matchAll(/(?:^|\s)@([a-zA-Z0-9_-]+)(?=\s|$|[.,!?;:)\]}])/g)) {
      if (match[1]) skills.add(match[1]);
    }
  }
  return [...skills];
}

export function formatAnswersAsText(
  answers: Readonly<Record<string, string | readonly string[]>> | undefined,
): string {
  if (!answers) return "";
  const lines: string[] = [];
  for (const [key, val] of Object.entries(answers)) {
    const joined = Array.isArray(val) ? val.join(", ") : String(val ?? "");
    if (joined.trim()) lines.push(`${key}: ${joined.trim()}`);
  }
  return lines.join("\n");
}

export function parseModelSpec(
  modelId?: string,
  modelVariant?: string | null,
): { providerID: string; id: string; variant?: string } | undefined {
  const ref = toDaemonModelRef(modelId, modelVariant);
  if (!ref || ref.id === "unknown-model") return undefined;
  return ref;
}

let activeSessionCreates = 0;
const sessionCreateQueue: Array<() => void> = [];
function acquireSessionCreateSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = () => {
      activeSessionCreates += 1;
      let done = false;
      resolve(() => {
        if (done) return;
        done = true;
        activeSessionCreates = Math.max(0, activeSessionCreates - 1);
        sessionCreateQueue.shift()?.();
      });
    };
    if (activeSessionCreates < 6) grant();
    else sessionCreateQueue.push(grant);
  });
}

export async function executeDaemonCommand(
  rootUrl: string,
  headers: Record<string, string>,
  cmd: GuildCommandRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  const rawDir = (cmd.directory || "").trim();
  const daemonDir = rawDir ? toDaemonDirectoryPath(rawDir) : "";
  const query = daemonDir ? `?location[directory]=${encodeURIComponent(daemonDir)}` : "";
  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...headers,
    ...(daemonDir
      ? {
          "x-opencode-directory": /^[\x00-\x7F]*$/.test(daemonDir)
            ? daemonDir
            : encodeURIComponent(daemonDir),
        }
      : {}),
  };

  function formatResponseError(res: { status: number; raw: Record<string, any> | null }): string {
    const rawMsg = res.raw?.message ?? res.raw?.error?.message ?? res.raw?.error;
    return typeof rawMsg === "string" && rawMsg.trim()
      ? `${rawMsg.trim()} (HTTP ${res.status})`
      : `HTTP ${res.status}`;
  }

  async function postJson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; raw: Record<string, any> | null }> {
    const isCreate = path.startsWith("/api/session?") || path === "/api/session";
    const release = isCreate ? await acquireSessionCreateSlot() : null;
    try {
      let lastRes: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          lastRes = await fetchWithDockerHostFallback(
            `${rootUrl}${path}`,
            { method: "POST", headers: reqHeaders, body: JSON.stringify(body) },
            fetchImpl,
          );
          if (lastRes.status < 500) break;
        } catch (err) {
          if (attempt === 2) throw err;
        }
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
      const response = lastRes!;
      let raw: Record<string, any> | null = null;
      try {
        const parsed = await response.json();
        if (parsed && typeof parsed === "object") raw = parsed as Record<string, any>;
      } catch {
        raw = null;
      }
      return { ok: response.ok, status: response.status, raw };
    } finally {
      release?.();
    }
  }

  async function postPromptWithFastAck(
    sessionId: string,
    body: Record<string, unknown>,
    fallbackBody?: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; raw: Record<string, any> | null }> {
    const promptPath = `/api/session/${encodeURIComponent(sessionId)}/prompt${query}`;
    let r = await postJson(promptPath, body);
    if (!r.ok && fallbackBody) r = await postJson(promptPath, fallbackBody);
    return r;
  }

  async function lookupSessionGate(
    paths: readonly string[],
    sessionId: string,
    gateId?: string,
  ): Promise<{ id: string; fields?: Array<Record<string, any>> } | null> {
    for (const listPath of paths) {
      try {
        const response = await fetchWithDockerHostFallback(`${rootUrl}${listPath}${query}`, { headers: reqHeaders }, fetchImpl);
        if (!response.ok) continue;
        const parsed = await response.json().catch(() => null);
        const items: Array<Record<string, any>> = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : [];
        const match =
          (gateId ? items.find((it) => it && (it.id === gateId || it.gateId === gateId || it.metadata?.tool?.id === gateId || it.tool?.callID === gateId)) : undefined) ??
          items.find((it) => it && (!(it.sessionID ?? it.sessionId) || (it.sessionID ?? it.sessionId) === sessionId));
        const resolvedId = match?.id ?? match?.gateId;
        const resolvedFields = Array.isArray(match?.fields) ? match.fields : Array.isArray(match?.questions) ? match.questions : undefined;
        if (typeof resolvedId === "string" && resolvedId.trim()) {
          return { id: resolvedId.trim(), fields: resolvedFields };
        }
      } catch {
        // try next path
      }
    }
    return null;
  }

  function buildCoercedFormAnswer(
    rawAnswers: Readonly<Record<string, string | readonly string[]>> | undefined,
    formFields: Array<Record<string, any>> | undefined,
    promptText: string | undefined,
  ): Record<string, unknown> {
    if (!Array.isArray(formFields) || formFields.length === 0) {
      return { ...(rawAnswers ?? {}) };
    }
    const out: Record<string, unknown> = {};
    const rawValues = Object.values(rawAnswers ?? {});
    const cleanPrompt = promptText?.trim() && promptText.trim() !== "Proceed" ? promptText.trim() : "";
    for (let i = 0; i < formFields.length; i += 1) {
      const field = formFields[i]!;
      const key = typeof field?.key === "string" ? field.key : "";
      if (!key) continue;
      const isMulti = field.type === "multiselect" || field.multiple === true;
      const existing =
        rawAnswers?.[key] ??
        (formFields.length === 1 ? rawValues[0] : rawAnswers?.[`q${i}`]);
      const hasExisting = existing !== undefined && existing !== null && (Array.isArray(existing) ? existing.length > 0 : String(existing).trim() !== "");
      if (hasExisting) {
        out[key] = isMulti ? (Array.isArray(existing) ? existing.map(String) : [String(existing).trim()]) : Array.isArray(existing) ? existing.join(", ") : String(existing);
      } else if (field.required !== false) {
        const firstOpt = Array.isArray(field.options) ? field.options[0] : undefined;
        const optVal = typeof firstOpt === "string" ? firstOpt : (firstOpt?.value ?? firstOpt?.label ?? "");
        const fallback = field.default ?? (optVal || cleanPrompt);
        if (fallback !== undefined && fallback !== "") {
          out[key] = isMulti ? (Array.isArray(fallback) ? fallback : [String(fallback)]) : String(fallback);
        }
      }
    }
    return out;
  }

  async function dismissPendingDaemonGate(
    sessionId: string,
    gateId: string,
    kind?: "permission" | "question",
    source?: string,
  ): Promise<void> {
    const encSid = encodeURIComponent(sessionId);
    const encGid = encodeURIComponent(gateId);
    if (kind === "permission" || source === "permission") {
      await postJson(`/api/session/${encSid}/permission/${encGid}/reply${query}`, { decision: "reject" }).catch(() => null);
    } else if (source === "form" || gateId.startsWith("frm_") || gateId.startsWith("form_") || gateId.startsWith("que_")) {
      if (gateId.startsWith("que_")) {
        await postJson(`/api/question/${encGid}/reject${query}`, {}).catch(() => null);
      } else {
        const delRes = await fetchWithDockerHostFallback(
          `${rootUrl}/api/session/${encSid}/form/${encGid}${query}`,
          { method: "DELETE", headers: reqHeaders },
          fetchImpl,
        ).catch(() => null);
        if (!delRes || (!delRes.ok && delRes.status !== 409)) {
          await postJson(`/api/session/${encSid}/form/${encGid}/reject${query}`, {}).catch(() => null);
        }
      }
    }
  }

  try {
    if (cmd.command === "scroll.send") {
      if (cmd.gateId?.trim()) {
        await dismissPendingDaemonGate(cmd.sessionId, cmd.gateId.trim(), cmd.kind, cmd.source);
      }
      const switchFailure = await applyPrePromptSessionSwitches(postJson, formatResponseError, cmd, query);
      if (switchFailure && !switchFailure.ok) return switchFailure;
      const mergedSkills = extractMergedSkills(cmd.promptText, cmd.skills);
      const res = await postPromptWithFastAck(
        cmd.sessionId,
        {
          text: cmd.promptText,
          ...(mergedSkills.length > 0 ? { skills: mergedSkills.map((id) => ({ id })) } : {}),
          delivery: cmd.delivery ?? "steer",
        },
        mergedSkills.length > 0 ? { text: cmd.promptText, delivery: cmd.delivery ?? "steer" } : undefined,
      );
      return { ok: res.ok, sessionId: cmd.sessionId, ...(res.ok ? {} : { error: formatResponseError(res) }) };
    }

    if (cmd.command === "agent.switch") {
      return executeDaemonAgentSwitch(postJson, formatResponseError, cmd.sessionId, query, cmd.agentClass);
    }

    if (cmd.command === "model.switch") {
      return executeDaemonModelSwitch(postJson, formatResponseError, cmd.sessionId, query, cmd.modelId, cmd.modelVariant);
    }

    if (cmd.command === "turn.interrupt") {
      const res = await postJson(`/api/session/${encodeURIComponent(cmd.sessionId)}/interrupt${query}`, {});
      return { ok: res.ok, sessionId: cmd.sessionId, ...(res.ok ? {} : { error: formatResponseError(res) }) };
    }

    if (cmd.command === "session.view") {
      const idleTs = typeof cmd.idleAtMs === "number" && cmd.idleAtMs > 0 ? cmd.idleAtMs : Date.now();
      const encSid = encodeURIComponent(cmd.sessionId);
      const syncView = async () => {
        const res = await postJson(`/api/session/${encSid}/view${query}`, { idle: idleTs });
        if (!res.ok) {
          const infoRes = await fetchWithDockerHostFallback(`${rootUrl}/api/session/${encSid}${query}`, { headers: reqHeaders }, fetchImpl).catch(() => null);
          if (infoRes?.ok) {
            const infoJson = (await infoRes.json().catch(() => null)) as Record<string, any> | null;
            const infoData = (infoJson?.data ?? infoJson) as Record<string, any> | null;
            const daemonIdle = infoData?.time?.idle ?? infoData?.time?.updated;
            if (typeof daemonIdle === "number" && daemonIdle > 0) {
              await postJson(`/api/session/${encSid}/view${query}`, { idle: daemonIdle });
            }
          }
        }
      };
      if (fetchImpl !== fetch && fetchImpl !== globalThis.fetch) await syncView();
      else void syncView().catch(() => null);
      return { ok: true, sessionId: cmd.sessionId };
    }

    if (cmd.command === "adventurer.summon") {
      const parsedModel = parseModelSpec(cmd.modelId, cmd.modelVariant);
      let res = await postJson(`/api/session${query}`, {
        title: cmd.title || undefined,
        agent: cmd.agentClass || "build",
        ...(parsedModel ? { model: parsedModel } : {}),
        ...(daemonDir ? { location: { directory: daemonDir } } : {}),
      });
      if (!res.ok && parsedModel) {
        res = await postJson(`/api/session${query}`, {
          title: cmd.title || undefined,
          agent: cmd.agentClass || "build",
          ...(daemonDir ? { location: { directory: daemonDir } } : {}),
        });
      }
      const raw = res.raw;
      const data = raw && typeof raw.data === "object" && raw.data ? (raw.data as Record<string, any>) : null;
      const newSessionId = String(data?.id ?? data?.sessionId ?? raw?.id ?? raw?.sessionId ?? "");
      if (!res.ok || !newSessionId) {
        return { ok: false, error: !res.ok ? `HTTP ${res.status}` : "Daemon did not return a session ID" };
      }
      if (cmd.promptText?.trim()) {
        const promptText = cmd.promptText.trim();
        const mergedSkills = extractMergedSkills(promptText, cmd.skills);
        const promptRes = await postPromptWithFastAck(
          newSessionId,
          { text: promptText, ...(mergedSkills.length > 0 ? { skills: mergedSkills.map((id) => ({ id })) } : {}) },
          mergedSkills.length > 0 ? { text: promptText } : undefined,
        );
        if (!promptRes.ok) {
          await fetchWithDockerHostFallback(
            `${rootUrl}/api/session/${encodeURIComponent(newSessionId)}${query}`,
            { method: "DELETE", headers: reqHeaders },
            fetchImpl,
          ).catch(() => null);
          return { ok: false, sessionId: newSessionId, error: `Prompt HTTP ${promptRes.status}` };
        }
      }
      return { ok: true, sessionId: newSessionId };
    }

    if (cmd.command === "gate.resolve") {
      const encSid = encodeURIComponent(cmd.sessionId);
      if (cmd.decision === "dismiss") {
        await dismissPendingDaemonGate(cmd.sessionId, cmd.gateId, cmd.kind, cmd.source);
        return { ok: true, sessionId: cmd.sessionId };
      }
      if (cmd.kind === "permission" || cmd.source === "permission") {
        let res = await postJson(
          `/api/session/${encSid}/permission/${encodeURIComponent(cmd.gateId)}/reply${query}`,
          { decision: cmd.decision ?? "once" },
        );
        if (!res.ok) {
          const found = await lookupSessionGate(
            [`/api/session/${encSid}/permission`, "/api/permission/request"],
            cmd.sessionId,
            cmd.gateId,
          );
          if (found && found.id !== cmd.gateId) {
            res = await postJson(
              `/api/session/${encSid}/permission/${encodeURIComponent(found.id)}/reply${query}`,
              { decision: cmd.decision ?? "once" },
            );
          }
        }
        return { ok: res.ok, sessionId: cmd.sessionId, ...(res.ok ? {} : { error: `HTTP ${res.status}` }) };
      }

      const fallbackText = cmd.promptText?.trim() || formatAnswersAsText(cmd.answers);

      if (cmd.source === "form") {
        let res: { ok: boolean; status: number; raw: Record<string, any> | null } = { ok: false, status: 404, raw: null };
        const hasDirectFormId = cmd.gateId.startsWith("que_") || cmd.gateId.startsWith("frm_") || cmd.gateId.startsWith("form_");
        const postFormOrQuestionReply = (targetId: string, ansObj: Record<string, unknown>) => {
          const isQue = targetId.startsWith("que_");
          const path = isQue
            ? `/api/question/${encodeURIComponent(targetId)}/reply${query}`
            : `/api/session/${encSid}/form/${encodeURIComponent(targetId)}/reply${query}`;
          const body = isQue
            ? { answers: Object.values(ansObj).map((v) => (Array.isArray(v) ? v.map(String) : [String(v ?? "")])), answer: ansObj }
            : { answer: ansObj };
          return postJson(path, body);
        };
        if (hasDirectFormId && Object.keys(cmd.answers ?? {}).length > 0) {
          res = await postFormOrQuestionReply(cmd.gateId, cmd.answers ?? {});
        }
        if (!res.ok) {
          const foundForm = await lookupSessionGate([`/api/session/${encSid}/form`, "/api/form", "/api/question"], cmd.sessionId, cmd.gateId);
          if (res.status === 409 && (!foundForm || foundForm.id === cmd.gateId)) return { ok: true, sessionId: cmd.sessionId };
          if (foundForm) {
            const coercedAnswer = buildCoercedFormAnswer(cmd.answers, foundForm.fields, cmd.promptText);
            res = await postFormOrQuestionReply(foundForm.id, coercedAnswer);
            const settledOk = res.ok || res.status === 409;
            return { ok: settledOk, sessionId: cmd.sessionId, ...(settledOk ? {} : { error: `HTTP ${res.status}` }) };
          }
        }
        if (!res.ok && fallbackText) {
          const fallbackRes = await postJson(`/api/session/${encSid}/prompt${query}`, { text: fallbackText });
          return { ok: fallbackRes.ok, sessionId: cmd.sessionId, ...(fallbackRes.ok ? {} : { error: `HTTP ${fallbackRes.status}` }) };
        }
        return { ok: res.ok, sessionId: cmd.sessionId, ...(res.ok ? {} : { error: `HTTP ${res.status}` }) };
      }

      const res = await postJson(`/api/session/${encodeURIComponent(cmd.sessionId)}/prompt${query}`, { text: fallbackText });
      return { ok: res.ok, sessionId: cmd.sessionId, ...(res.ok ? {} : { error: `HTTP ${res.status}` }) };
    }

    return { ok: false, error: "Unsupported command" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
