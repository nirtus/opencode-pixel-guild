import { clientState } from "./client-state.ts";
import { seedSyntheticRoomGitState } from "./commit-ledger-controller.ts";
import {
  buildShowcaseFixtureBundle,
  buildSyntheticOperatorProfile,
  DOCS_SHOWCASE_EPOCH_MS,
} from "./docs-showcase-fixtures.ts";
import {
  DOCS_SHOWCASE_SCENES,
  type DocsShowcaseSceneSpec,
  resolveDocsShowcaseScene,
} from "./docs-showcase-scenes.ts";
import { expandedChatMessageIds } from "./hero-subtabs-reconciler.ts";
import { preloadIntroDemoAssets } from "./intro-demo-director.ts";
import {
  getRequestedDocsShowcaseSceneId,
  isDocsShowcaseModeActive,
  isOfflineDemoModeActive,
} from "./offline-demo-flag.ts";
import { openSyntheticOperatorModal } from "./operator-pairing-controller.ts";
import { setCachedOperatorProfile } from "./operator-session-store.ts";
import { resetSidePanelSignatures } from "./side-panel-reconciler.ts";
import { openSummonAdventurerModal } from "./summon-adventurer-controller.ts";

export {
  DOCS_SHOWCASE_SCENES,
  getRequestedDocsShowcaseSceneId,
  isDocsShowcaseModeActive,
  isOfflineDemoModeActive,
  resolveDocsShowcaseScene,
};

let activeShowcaseScene: DocsShowcaseSceneSpec | null = null;

export function getActiveDocsShowcaseScene(): DocsShowcaseSceneSpec | null {
  return activeShowcaseScene;
}

export function applyDocsShowcaseScene(
  sceneId: string | null | undefined,
  onStateChanged: () => void,
): DocsShowcaseSceneSpec {
  const scene = resolveDocsShowcaseScene(sceneId);
  activeShowcaseScene = scene;

  const profile = buildSyntheticOperatorProfile(scene.operatorProfileMode);
  setCachedOperatorProfile(profile);
  clientState.operatorId = profile.operatorId;
  clientState.isAuthenticated = profile.authenticated !== false;
  clientState.authBootCompleted = true;

  const bundle = buildShowcaseFixtureBundle({
    bulkAssembly: scene.bulkAssembly,
    includeQuestGate: scene.includeQuestGate,
    wildsCombat: scene.wildsCombat,
  });

  clientState.currentSnapshot = bundle.snapshot;
  clientState.characterWalkers = bundle.walkers;
  clientState.lanternFlares = bundle.flares;
  clientState.activeSummoningRituals = bundle.rituals;
  clientState.cameraFocusMode = scene.cameraFocusMode;
  clientState.isAllWorldsFocused = scene.isAllWorldsFocused;
  clientState.selectedProjectId = scene.selectedProjectId;
  clientState.selectedRoomId = scene.selectedProjectId;
  clientState.selectedSessionId = scene.selectedSessionId;
  clientState.mobileActiveTab = scene.mobileActiveTab;
  clientState.ledgerSubtab = scene.ledgerSubtab;
  clientState.heroSubtab = scene.heroSubtab;
  clientState.showSubagentsInRoster = Boolean(scene.showSubagentsInRoster);
  clientState.isGamemasterCollapsed = false;
  clientState.isWorldCollapsed = false;
  clientState.mobileDrawerState = scene.mobileDrawerState ?? (scene.mobile ? "expanded" : "collapsed");
  clientState.isCommandScrollExpanded = Boolean(scene.expandCommandScroll);
  clientState.isSummonModalOpen = scene.openModal === "summon";
  expandedChatMessageIds.clear();
  if (scene.expandFirstChatRow) {
    expandedChatMessageIds.add("turn-1-assistant");
  }
  clientState.tickerLog.length = 0;
  clientState.tickerLog.push(
    { category: "system", summary: "Synthetic Documentation Showcase active (offline fixture mode)" },
    { category: "tool", summary: "Render Mermaid Dispatch SVGs completed npm test (42/42 passing)" },
  );

  for (const [roomId, gitState] of Object.entries(bundle.gitStateByRoom)) {
    seedSyntheticRoomGitState(roomId, gitState);
  }

  resetSidePanelSignatures();

  if (typeof document !== "undefined") {
    document.body?.setAttribute("data-docs-showcase", scene.sceneId);
    document.body?.setAttribute("data-auth-locked", profile.authenticated === false ? "true" : "false");
    if (scene.openModal === "auth-gate") {
      openSyntheticOperatorModal("register", true, onStateChanged);
    } else if (scene.openModal === "machine-pairing") {
      openSyntheticOperatorModal("machines", false, onStateChanged);
    } else if (scene.openModal === "summon") {
      openSummonAdventurerModal(scene.selectedProjectId ?? undefined);
    }
  }

  return scene;
}

export function initDocsShowcaseDirector(
  renderFrame: (nowMs: number) => void,
  onStateChanged: () => void,
): boolean {
  if (!isDocsShowcaseModeActive()) return false;
  const sceneId = getRequestedDocsShowcaseSceneId();
  applyDocsShowcaseScene(sceneId, onStateChanged);

  if (typeof window !== "undefined") {
    const win = window as unknown as Record<string, unknown>;
    win.__docsShowcaseReady = false;
    win.__docsShowcaseSceneId = activeShowcaseScene?.sceneId ?? sceneId;

    const finalizeReady = (): void => {
      onStateChanged();
      requestAnimationFrame(() => {
        renderFrame(DOCS_SHOWCASE_EPOCH_MS);
        requestAnimationFrame(() => {
          onStateChanged();
          renderFrame(DOCS_SHOWCASE_EPOCH_MS);
          win.__docsShowcaseReady = true;
        });
      });
    };

    const fontsReady =
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready.catch(() => {})
        : Promise.resolve();

    void Promise.all([preloadIntroDemoAssets().catch(() => {}), fontsReady]).then(() => {
      // Allow inline SVG hero sprites triggered on first paint to settle cleanly
      renderFrame(DOCS_SHOWCASE_EPOCH_MS);
      setTimeout(finalizeReady, 180);
    });
  }

  return true;
}
