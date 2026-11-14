import { createWorldStateReducer } from "../state/world-reducer.ts";
import type {
  GuildStateEmission,
  WorldStateReducer,
} from "../types/domain.ts";
import {
  COMPACTION_AND_QUEST_GATE_EVENTS,
  DEMO_SCENARIO_PRESET_IDS,
  DEMO_SCENARIO_PRESETS,
  MCP_AUTH_AND_FAILURE_EVENTS,
  PLUGIN_ALCOVE_CODEMODE_EVENTS,
  PRIMARY_HALL_DIR,
  WORKTREE_ANNEX_DIR,
  WORKTREE_ANNEXATION_EVENTS,
} from "./scenario-presets.ts";
import type {
  DemoScenarioPreset,
  DemoScenarioPresetId,
  DemoScenarioRunResult,
} from "./scenario-presets.ts";

export {
  COMPACTION_AND_QUEST_GATE_EVENTS,
  DEMO_SCENARIO_PRESET_IDS,
  DEMO_SCENARIO_PRESETS,
  MCP_AUTH_AND_FAILURE_EVENTS,
  PLUGIN_ALCOVE_CODEMODE_EVENTS,
  PRIMARY_HALL_DIR,
  WORKTREE_ANNEX_DIR,
  WORKTREE_ANNEXATION_EVENTS,
};
export type {
  DemoScenarioPreset,
  DemoScenarioPresetId,
  DemoScenarioRunResult,
};

export function runDemoScenarioPreset(
  presetId: DemoScenarioPresetId,
  reducer: WorldStateReducer = createWorldStateReducer({
    initialAdapter: "demo-simulator",
    daemonUrl: "http://127.0.0.1:4096",
  }),
): DemoScenarioRunResult {
  const preset = DEMO_SCENARIO_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown demo scenario preset: ${String(presetId)}`);
  }

  const emissions: GuildStateEmission[] = [];
  for (const event of preset.events) {
    emissions.push(reducer.dispatch(event));
  }

  return Object.freeze({
    preset,
    snapshot: reducer.getSnapshot(),
    emissions: Object.freeze(emissions),
  });
}
