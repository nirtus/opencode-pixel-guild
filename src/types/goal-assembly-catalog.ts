export interface GoalAssemblyPartSpec {
  readonly id: string;
  readonly name: string;
  readonly tier: 1 | 2 | 3;
  readonly description: string;
}

export const GOAL_ASSEMBLY_PARTS: readonly GoalAssemblyPartSpec[] = Object.freeze([
  Object.freeze({
    id: "steam-pipeline",
    name: "Steam Pipeline & Gauge",
    tier: 1,
    description: "Pressurized copper steam pipeline and pressure dial.",
  }),
  Object.freeze({
    id: "interlocking-gears",
    name: "3-Gear Drive Train",
    tier: 1,
    description: "Interlocking brass and copper spur gear transmission.",
  }),
  Object.freeze({
    id: "automaton-chassis",
    name: "Clockwork Automaton Chassis",
    tier: 2,
    description: "Riveted automaton body and glowing cyan ocular lens.",
  }),
  Object.freeze({
    id: "elixir-core",
    name: "Emerald Elixir Power Core",
    tier: 2,
    description: "Pulsing arcane elixir reservoir in forged brass caliper.",
  }),
  Object.freeze({
    id: "console-tesla",
    name: "Control Console & Tesla Coil",
    tier: 3,
    description: "Digital green screen control box and crackling Tesla lightning coil.",
  }),
]);

export type AssemblyDeliverableKind =
  | "quest"
  | "subagent"
  | "file-change"
  | "issue-fixed"
  | "feature-task";

export interface AssemblyResultDeliverable {
  readonly id: string;
  readonly kind: AssemblyDeliverableKind;
  readonly title: string;
  readonly subtitle: string;
  readonly status: "fitted" | "unbuilt";
  readonly roomId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly shortTag: string;
  readonly crestIcon: string;
  readonly partyKey: string;
  readonly sessionId?: string;
  readonly timestampMs: number;
}

export interface GuildResultsMetrics {
  readonly completedQuestsCount: number;
  readonly activeQuestsCount: number;
  readonly subagentReportsCount: number;
  readonly filesModifiedCount: number;
  readonly issuesFixedCount: number;
  readonly toolExecutionsCount: number;
}

export interface GoalAssemblyPartState {
  readonly id: string;
  readonly name: string;
  readonly status: "unbuilt" | "fitted";
  readonly visualTone: "bleak-wireframe" | "vibrant-animated";
  readonly shortTag?: string;
  readonly crestIcon?: string;
  readonly partyKey?: string;
  readonly kind?: AssemblyDeliverableKind;
  readonly subtitle?: string;
}

export interface GoalAssemblyState {
  readonly totalParts: number;
  readonly fittedCount: number;
  readonly parts: readonly GoalAssemblyPartState[];
  readonly isComplete: boolean;
}

export function createInitialGoalAssembly(
  totalParts = 5,
): GoalAssemblyState {
  const parts = GOAL_ASSEMBLY_PARTS.slice(0, totalParts).map((p) => ({
    id: p.id,
    name: p.name,
    status: "unbuilt" as const,
    visualTone: "bleak-wireframe" as const,
  }));
  return {
    totalParts,
    fittedCount: 0,
    parts: Object.freeze(parts),
    isComplete: false,
  };
}
