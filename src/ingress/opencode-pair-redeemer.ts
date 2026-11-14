import { normalizeQrPayloadToPairingUrl } from "./qr-matrix-decoder.ts";

export interface ResolvedOpenCodePairing {
  readonly daemonUrl: string;
  readonly displayUrl?: string;
  readonly daemonPassword?: string;
  readonly redeemedFromCode: boolean;
}

const PAIRING_LINK_REGEX = /^(https?:\/\/[^/?#\s]+)\/auth\/connect\/([^/?#\s]+)/i;

export function buildDockerHostFallbackUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const h = parsed.hostname.toLowerCase();
    const dockerHost = (
      process.env.OPENCODE_DOCKER_HOST || "host.docker.internal"
    ).trim();
    if (
      dockerHost &&
      h !== dockerHost.toLowerCase() &&
      (h === "127.0.0.1" ||
        h === "localhost" ||
        h === "0.0.0.0" ||
        h.startsWith("172.") ||
        h.startsWith("192.168.") ||
        h.startsWith("10."))
    ) {
      parsed.hostname = dockerHost;
      if (!parsed.port && rawUrl.includes("/auth/connect/")) {
        parsed.port = (process.env.OPENCODE_DAEMON_PORT || "4096").trim();
      }
      return parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // Ignore invalid URL
  }
  return null;
}

export async function fetchWithDockerHostFallback(
  url: string,
  init?: RequestInit,
  fetchImpl?: typeof fetch,
  timeoutMs?: number,
): Promise<Response> {
  const baseFetch: typeof fetch =
    !fetchImpl || fetchImpl === globalThis.fetch
      ? (input, reqInit) => globalThis.fetch(input, reqInit)
      : fetchImpl;
  const buildInit = (): RequestInit =>
    init?.signal || !timeoutMs || typeof AbortSignal?.timeout !== "function"
      ? (init ?? {})
      : { ...init, signal: AbortSignal.timeout(timeoutMs) };
  try {
    return await baseFetch(url, buildInit());
  } catch (err) {
    if (!fetchImpl || fetchImpl === globalThis.fetch) {
      const fallbackUrl = buildDockerHostFallbackUrl(url);
      if (fallbackUrl) {
        try {
          return await baseFetch(fallbackUrl, buildInit());
        } catch {
          // Ignore fallback error and rethrow original
        }
      }
    }
    throw err;
  }
}

export async function resolveAndRedeemOpenCodePairing(
  rawInput: string,
  passwordFallback?: string,
  fetchImpl?: typeof fetch,
): Promise<ResolvedOpenCodePairing> {
  const trimmed = (rawInput || "").trim();
  const passTrimmed = (passwordFallback || "").trim();
  const fetchFn = fetchImpl ?? fetch;

  const normalizedInput = normalizeQrPayloadToPairingUrl(trimmed) ?? trimmed;
  const normalizedPass = normalizeQrPayloadToPairingUrl(passTrimmed) ?? passTrimmed;

  const linkCandidate = PAIRING_LINK_REGEX.test(normalizedInput)
    ? normalizedInput
    : PAIRING_LINK_REGEX.test(normalizedPass)
      ? normalizedPass
      : null;

  if (linkCandidate) {
    const match = PAIRING_LINK_REGEX.exec(linkCandidate)!;
    const requestedOrigin = match[1].replace(/\/+$/, "");
    const rawCode = decodeURIComponent(match[2]);
    const pathSuffix = `/auth/connect/${encodeURIComponent(rawCode)}`;

    let effectiveOrigin = requestedOrigin;
    let response: Response;
    try {
      response = await fetchFn(`${requestedOrigin}${pathSuffix}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      const fallbackOrigin = !fetchImpl ? buildDockerHostFallbackUrl(requestedOrigin) : null;
      if (!fallbackOrigin) {
        throw new Error(
          `Failed to reach OpenCode pairing endpoint at ${requestedOrigin}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      try {
        response = await fetchFn(`${fallbackOrigin}${pathSuffix}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        effectiveOrigin = fallbackOrigin;
      } catch {
        throw new Error(
          `Failed to reach OpenCode pairing endpoint at ${requestedOrigin}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        `Pairing link expired or invalid (HTTP ${response.status}) — run 'opencode pair' or 'opencode pair --remote' to generate a fresh link or QR code`,
      );
    }

    const payload = (await response.json()) as Record<string, any> | null;
    const token =
      typeof payload?.token === "string"
        ? payload.token
        : typeof payload?.data?.token === "string"
          ? payload.data.token
          : "";

    if (!token) {
      throw new Error(
        "Invalid pairing response from OpenCode server: missing session token",
      );
    }

    return {
      daemonUrl: effectiveOrigin,
      displayUrl: effectiveOrigin,
      daemonPassword: token,
      redeemedFromCode: true,
    };
  }

  return {
    daemonUrl: normalizedInput.replace(/\/+$/, ""),
    displayUrl: normalizedInput.replace(/\/+$/, ""),
    daemonPassword: passTrimmed || undefined,
    redeemedFromCode: false,
  };
}
