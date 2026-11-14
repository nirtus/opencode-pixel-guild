import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHttpOpenCodeDaemonClient,
  createOpenCodeClientAdapter,
  discoverLocalOpenCodeService,
  type DiscoveredOpenCodeService,
  type OpenCodeClientAdapter,
  type OpenCodeDaemonClientPort,
} from "../ingress/index.ts";
import {
  DEMO_SCENARIO_PRESETS,
  type DemoScenarioPresetId,
  type DemoScenarioRunResult,
  runDemoScenarioPreset,
} from "../simulator/demo-guild-simulator.ts";
import { createWorldStateReducer } from "../state/index.ts";
import type {
  GuildSnapshot,
  GuildStateEmission,
  WorldStateReducer,
} from "../types/domain.ts";
import {
  createLiveGitWorkingTreeAdapter,
  type GitWorkingTreePort,
} from "../ingress/index.ts";
import { tryHandleGuildApiRoute } from "./api-router.ts";
import { tryHandleGuildGitRoute } from "./git-router.ts";
import { createOperatorWorkspaceRegistry } from "./operator-registry.ts";
import { tryServeStaticAsset } from "./static-router.ts";

export interface CreateGuildCompanionServerOptions {
  readonly initialPresetId?: DemoScenarioPresetId;
  readonly reducer?: WorldStateReducer;
  readonly daemonUrl?: string;
  readonly clientAdapter?: OpenCodeClientAdapter;
  readonly daemonClient?:
    | Pick<
        OpenCodeDaemonClientPort,
        "deleteSession" | "deleteRoomResources" | "executeCommand"
      >
    | OpenCodeDaemonClientPort;
  readonly onRefresh?: () => Promise<void> | void;
  readonly discoverService?: () => Promise<DiscoveredOpenCodeService>;
  readonly createDaemonClient?: (
    url: string,
    headers: Record<string, string>,
  ) => OpenCodeDaemonClientPort;
  readonly gitAdapter?: GitWorkingTreePort;
  readonly operatorStorePath?: string;
  readonly dataDirPath?: string;
  readonly requireAuth?: boolean;
  readonly fetchImpl?: typeof fetch;
}

export interface GuildCompanionServerInstance {
  readonly server: Server;
  readonly reducer: WorldStateReducer;
  getSnapshot(): GuildSnapshot;
  activatePreset(presetId: DemoScenarioPresetId): DemoScenarioRunResult;
  syncLiveDaemon(): Promise<boolean>;
  listen(
    port?: number,
    host?: string,
  ): Promise<{
    readonly url: string;
    readonly port: number;
    close(): Promise<void>;
  }>;
  close(): Promise<void>;
}

export function createGuildCompanionServer(
  options: CreateGuildCompanionServerOptions = {},
): GuildCompanionServerInstance {
  const conn: {
    daemonUrl: string;
    clientAdapter: OpenCodeClientAdapter | undefined;
    daemonClient: CreateGuildCompanionServerOptions["daemonClient"];
    service: { url: string; password?: string } | null;
    reachable: boolean;
  } = {
    daemonUrl: options.daemonUrl ?? "http://127.0.0.1:4096",
    clientAdapter: options.clientAdapter,
    daemonClient: options.daemonClient,
    service: null,
    reachable: Boolean(options.clientAdapter),
  };

  const activeReducer: WorldStateReducer =
    options.reducer ??
    createWorldStateReducer({
      initialAdapter: options.initialPresetId
        ? "demo-simulator"
        : "opencode-client",
      daemonUrl: conn.daemonUrl,
    });

  const sseClients = new Set<ServerResponse>();

  function broadcastEmission(emission: GuildStateEmission): void {
    if (sseClients.size === 0) return;
    const payload = `data: ${JSON.stringify(emission)}\n\n`;
    for (const client of sseClients) {
      if (!client.writableEnded) {
        client.write(payload);
      }
    }
  }

  const unsubscribeReducer = activeReducer.subscribe(broadcastEmission);

  function activatePreset(
    presetId: DemoScenarioPresetId,
  ): DemoScenarioRunResult {
    if (!(presetId in DEMO_SCENARIO_PRESETS)) {
      throw new Error(`Unknown demo scenario preset: ${String(presetId)}`);
    }
    conn.clientAdapter?.stop();
    conn.clientAdapter = undefined;
    conn.reachable = false;
    activeReducer.reset?.({ adapter: "demo-simulator", daemonUrl: null });
    return runDemoScenarioPreset(presetId, activeReducer);
  }

  if (!options.reducer && options.initialPresetId) {
    activatePreset(options.initialPresetId);
  }

  async function syncLiveDaemon(): Promise<boolean> {
    let connected = false;
    if (options.discoverService) {
      try {
        const svc = await options.discoverService();
        const isSameEndpoint =
          conn.service !== null &&
          conn.service.url === svc.url &&
          conn.service.password === svc.password;
        const isDemo =
          activeReducer.getSnapshot().activeAdapter === "demo-simulator";
        if (isDemo || !conn.clientAdapter || !conn.reachable || !isSameEndpoint) {
          conn.clientAdapter?.stop();
          activeReducer.reset?.({
            adapter: "opencode-client",
            daemonUrl: svc.url,
          });
          const dc = (
            options.createDaemonClient ?? createHttpOpenCodeDaemonClient
          )(svc.url, svc.headers);
          const ca = createOpenCodeClientAdapter({
            discoverDaemon: async () => ({ url: svc.url }),
            client: dc,
          });
          conn.daemonUrl = svc.url;
          conn.daemonClient = dc;
          conn.clientAdapter = ca;
          conn.service = { url: svc.url, password: svc.password };
          conn.reachable = true;
          await ca.start(activeReducer);
          await ca.startLiveSubscription?.();
        } else {
          await conn.clientAdapter.sweepAllLocations(false);
        }
        connected = true;
      } catch {
        conn.reachable = false;
      }
    } else if (conn.clientAdapter) {
      await conn.clientAdapter.sweepAllLocations(false);
      connected = true;
    }
    if (options.onRefresh) {
      await options.onRefresh();
    }
    return connected;
  }

  const defaultContext = () => ({
    daemonUrl: conn.daemonUrl,
    sseClients,
    getReducer: () => activeReducer,
    getActiveAdapter: () => activeReducer.getSnapshot().activeAdapter,
    activatePreset,
    clientAdapter: conn.clientAdapter,
    daemonClient: conn.daemonClient,
    onRefresh: syncLiveDaemon,
  });

  const gitAdapter = options.gitAdapter ?? createLiveGitWorkingTreeAdapter();

  const operatorRegistry = createOperatorWorkspaceRegistry({
    defaultContext,
    defaultDaemonUrl: conn.daemonUrl,
    storeFilePath: options.operatorStorePath,
    dataDirPath: options.dataDirPath,
    requireAuth: options.requireAuth,
    fetchImpl: options.fetchImpl,
    discoverService: options.discoverService,
    createDaemonClient: options.createDaemonClient,
  });

  const server = createServer(async (req, res) => {
    const urlObj = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = urlObj.pathname;

    if (tryServeStaticAsset(req, res, pathname)) {
      return;
    }

    if (await operatorRegistry.tryHandleOperatorCrudRoute(req, res, urlObj)) {
      return;
    }

    const reqCtx = operatorRegistry.resolveContextForRequest(req, urlObj);
    if (await tryHandleGuildGitRoute(req, res, urlObj, reqCtx, gitAdapter)) {
      return;
    }
    const handledApi = await tryHandleGuildApiRoute(req, res, urlObj, reqCtx);
    if (handledApi) {
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  function close(): Promise<void> {
    operatorRegistry.closeAll();
    conn.clientAdapter?.stop();
    for (const client of sseClients) {
      if (!client.writableEnded) {
        client.end();
      }
    }
    sseClients.clear();
    unsubscribeReducer();
    return new Promise((resolveClose, rejectClose) => {
      if (!server.listening) {
        resolveClose();
        return;
      }
      server.closeAllConnections?.();
      server.close((err) => {
        if (err) {
          rejectClose(err);
        } else {
          resolveClose();
        }
      });
    });
  }

  return {
    server,
    get reducer() {
      return activeReducer;
    },
    getSnapshot() {
      return activeReducer.getSnapshot();
    },
    activatePreset,
    syncLiveDaemon,
    listen(port = 0, host = process.env.HOST ?? "0.0.0.0") {
      return new Promise((resolveListen, rejectListen) => {
        server.once("error", rejectListen);
        server.listen(port, host, () => {
          server.removeListener("error", rejectListen);
          const addr = server.address() as AddressInfo;
          const boundPort = addr.port;
          const hostName = host === "0.0.0.0" ? "127.0.0.1" : host;
          const url = `http://${hostName}:${boundPort}`;
          resolveListen({
            url,
            port: boundPort,
            close,
          });
        });
      });
    },
    close,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT ?? 4310);

  (async () => {
    const companion = createGuildCompanionServer({
      initialPresetId: "cohabited-guild-hall",
      dataDirPath: resolve(process.cwd(), "data"),
      requireAuth: true,
      discoverService: () =>
        discoverLocalOpenCodeService({
          skipWslFallback: process.platform !== "win32",
        }),
    });

    const host = process.env.HOST ?? "0.0.0.0";
    const { url } = await companion.listen(port, host);
    console.log(
      `OpenCode Pixel Guild Visualizer listening at ${url} (Operator Auth Gate enabled; per-operator workspaces active)`,
    );
  })().catch((err) => {
    console.error(
      `[Pixel Guild] Startup error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
}
