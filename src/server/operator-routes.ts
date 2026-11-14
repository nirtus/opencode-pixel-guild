import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody, sendJson, type GuildApiRouterContext } from "./api-router.ts";
import type { GuildOperatorPreferences } from "./operator-store.ts";

export interface OperatorWorkspaceRegistryPort {
  registerOperator(input: {
    username?: string;
    password?: string;
    label?: string;
    pairingLink?: string;
    daemonUrl?: string;
    daemonPassword?: string;
    machineLabel?: string;
    preferences?: Partial<GuildOperatorPreferences>;
    isExplicitRegister?: boolean;
  }): Promise<Record<string, unknown>>;
  loginOperator(username: string, password: string): Promise<Record<string, unknown> | null>;
  getOperatorProfile(operatorId: string | null): Record<string, unknown>;
  updateOperatorProfile(
    operatorId: string | null,
    patch: {
      username?: string;
      label?: string;
      password?: string;
      adapterMode?: "demo-simulator" | "opencode-client";
      preferences?: Partial<GuildOperatorPreferences>;
      daemonUrl?: string;
      daemonPassword?: string;
    },
  ): Promise<Record<string, unknown>>;
  pairOperatorMachine(
    operatorId: string | null,
    input: {
      label?: string;
      pairingLink?: string;
      daemonUrl?: string;
      daemonPassword?: string;
      discoverLocal?: boolean;
      activate?: boolean;
    },
  ): Promise<Record<string, unknown>>;
  updateOperatorMachine(
    operatorId: string | null,
    machineId: string,
    patch: {
      label?: string;
      daemonUrl?: string;
      daemonPassword?: string;
      activate?: boolean;
    },
  ): Promise<Record<string, unknown> | null | undefined>;
  removeOperatorMachine(operatorId: string | null, machineId: string): Promise<Record<string, unknown> | null>;
  deleteOperator(operatorId: string | null): { ok: true; deletedOperatorId: string };
  resolveRequestOperatorId(req: IncomingMessage, urlObj: URL): string | null;
  tryHandleOperatorCrudRoute(req: IncomingMessage, res: ServerResponse, urlObj: URL): Promise<boolean>;
  resolveContextForRequest(req: IncomingMessage, urlObj: URL): GuildApiRouterContext;
  closeAll(): void;
}

export async function handleOperatorHttpRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL,
  registry: OperatorWorkspaceRegistryPort,
): Promise<boolean> {
  const method = req.method ?? "GET";
  const pathname = urlObj.pathname;

  if (method === "POST" && (pathname === "/api/guild/auth/register" || pathname === "/api/guild/users")) {
    try {
      const body = await readJsonBody(req);
      const created = await registry.registerOperator({
        username: typeof body.username === "string" ? body.username : undefined,
        password: typeof body.password === "string" ? body.password : undefined,
        label: typeof body.label === "string" ? body.label : undefined,
        pairingLink: typeof body.pairingLink === "string" ? body.pairingLink : undefined,
        daemonUrl: typeof body.daemonUrl === "string" ? body.daemonUrl : undefined,
        daemonPassword: typeof body.daemonPassword === "string" ? body.daemonPassword : undefined,
        machineLabel: typeof body.machineLabel === "string" ? body.machineLabel : undefined,
        preferences:
          typeof body.preferences === "object" && body.preferences !== null
            ? (body.preferences as Partial<GuildOperatorPreferences>)
            : undefined,
        isExplicitRegister: pathname === "/api/guild/auth/register",
      });
      sendJson(res, 201, created);
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode ?? 400;
      sendJson(res, status, { error: err instanceof Error ? err.message : "Invalid registration body" });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/guild/auth/login") {
    try {
      const body = await readJsonBody(req);
      const username = typeof body.username === "string" ? body.username : "";
      const password = typeof body.password === "string" ? body.password : "";
      const profile = await registry.loginOperator(username, password);
      if (!profile) {
        sendJson(res, 401, { error: "Invalid username or password" });
        return true;
      }
      sendJson(res, 200, profile);
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode ?? 400;
      sendJson(res, status, { error: err instanceof Error ? err.message : "Invalid login body" });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/guild/auth/logout") {
    sendJson(res, 200, { ok: true, authenticated: false });
    return true;
  }

  if (
    (pathname === "/api/guild/users/me/machines" ||
      pathname === "/api/guild/users/me/machines/local") &&
    method === "POST"
  ) {
    const reqOpId = registry.resolveRequestOperatorId(req, urlObj);
    try {
      const body = await readJsonBody(req);
      const updated = await registry.pairOperatorMachine(reqOpId, {
        label: typeof body.label === "string" ? body.label : undefined,
        pairingLink: typeof body.pairingLink === "string" ? body.pairingLink : undefined,
        daemonUrl: typeof body.daemonUrl === "string" ? body.daemonUrl : undefined,
        daemonPassword: typeof body.daemonPassword === "string" ? body.daemonPassword : undefined,
        discoverLocal: body.discoverLocal === true || pathname.endsWith("/local"),
        activate: body.activate !== false,
      });
      sendJson(res, 201, updated);
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode ?? 400;
      sendJson(res, status, { error: err instanceof Error ? err.message : "Failed to pair machine" });
    }
    return true;
  }

  const machineMatch = /^\/api\/guild\/users\/me\/machines\/([^/]+)$/.exec(pathname);
  if (machineMatch) {
    const machineId = decodeURIComponent(machineMatch[1]);
    const reqOpId = registry.resolveRequestOperatorId(req, urlObj);
    if (method === "PATCH") {
      try {
        const body = await readJsonBody(req);
        const updated = await registry.updateOperatorMachine(reqOpId, machineId, {
          label: typeof body.label === "string" ? body.label : undefined,
          daemonUrl: typeof body.daemonUrl === "string" ? body.daemonUrl : undefined,
          daemonPassword: typeof body.daemonPassword === "string" ? body.daemonPassword : undefined,
          activate: body.activate === true,
        });
        if (updated === null) {
          sendJson(res, 404, { error: "Operator not found" });
          return true;
        }
        if (updated === undefined) {
          sendJson(res, 404, { error: "Machine pairing not found" });
          return true;
        }
        sendJson(res, 200, updated);
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode ?? 400;
        sendJson(res, status, { error: err instanceof Error ? err.message : "Failed to update machine" });
      }
      return true;
    }
    if (method === "DELETE") {
      const updated = await registry.removeOperatorMachine(reqOpId, machineId);
      if (!updated) {
        sendJson(res, 404, { error: "Operator not found" });
        return true;
      }
      sendJson(res, 200, updated);
      return true;
    }
  }

  if (pathname === "/api/guild/users/me" || pathname === "/api/guild/operator") {
    const reqOpId = registry.resolveRequestOperatorId(req, urlObj);
    if (method === "GET") {
      sendJson(res, 200, registry.getOperatorProfile(reqOpId));
      return true;
    }

    if (method === "PATCH") {
      try {
        const body = await readJsonBody(req);
        const updated = await registry.updateOperatorProfile(reqOpId, {
          label: typeof body.label === "string" ? body.label : undefined,
          username: typeof body.username === "string" ? body.username : undefined,
          password: typeof body.password === "string" ? body.password : undefined,
          adapterMode:
            body.adapterMode === "demo-simulator" || body.adapterMode === "opencode-client"
              ? body.adapterMode
              : undefined,
          preferences:
            typeof body.preferences === "object" && body.preferences !== null
              ? (body.preferences as Partial<GuildOperatorPreferences>)
              : undefined,
          daemonUrl: typeof body.daemonUrl === "string" ? body.daemonUrl : undefined,
          daemonPassword: typeof body.daemonPassword === "string" ? body.daemonPassword : undefined,
        });
        sendJson(res, 200, updated);
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode ?? 400;
        sendJson(res, status, { error: err instanceof Error ? err.message : "Failed to update profile" });
      }
      return true;
    }

    if (method === "DELETE") {
      sendJson(res, 200, registry.deleteOperator(reqOpId));
      return true;
    }
  }
  return false;
}
