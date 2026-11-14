import type {
  GuildDelta,
  GuildSnapshot,
  TelemetryAdapterKind,
} from "./core-types.ts";

export type QuestGateSource = "permission" | "form" | "conversational";

export interface QuestGateOptionItem {
  readonly label: string;
  readonly description?: string;
  readonly value?: string;
}

export interface QuestGateQuestionField {
  readonly key: string;
  readonly header?: string;
  readonly question: string;
  readonly options?: readonly QuestGateOptionItem[];
  readonly multiple?: boolean;
  readonly required?: boolean;
}

export type GuildCommandRequest =
  | {
      readonly command: "scroll.send";
      readonly sessionId: string;
      readonly directory?: string;
      readonly promptText: string;
      readonly delivery?: "steer" | "queue";
      readonly skills?: readonly string[];
      readonly agentClass?: string;
      readonly modelId?: string;
    }
  | {
      readonly command: "turn.interrupt";
      readonly sessionId: string;
      readonly directory?: string;
    }
  | {
      readonly command: "adventurer.summon";
      readonly directory: string;
      readonly title?: string;
      readonly agentClass?: string;
      readonly modelId?: string;
      readonly promptText?: string;
      readonly skills?: readonly string[];
    }
  | {
      readonly command: "gate.resolve";
      readonly sessionId: string;
      readonly gateId: string;
      readonly directory?: string;
      readonly kind: "permission" | "question";
      readonly source?: QuestGateSource;
      readonly decision?: "once" | "always" | "reject";
      readonly answers?: Readonly<Record<string, string | readonly string[]>>;
      readonly promptText?: string;
    }
  | {
      readonly command: "session.view";
      readonly sessionId: string;
      readonly directory?: string;
      readonly idleAtMs?: number;
    }
  | {
      readonly command: "agent.switch";
      readonly sessionId: string;
      readonly directory?: string;
      readonly agentClass: string;
    };

export interface GuildCommandResult {
  readonly ok: boolean;
  readonly command: GuildCommandRequest["command"];
  readonly adapter: TelemetryAdapterKind;
  readonly sessionId: string | null;
  readonly gateId?: string | null;
  readonly error?: string;
  readonly delta: GuildDelta;
  readonly snapshot: GuildSnapshot;
}

export {
  computeConversationalGateHash,
  detectConversationalQuestionPrompt,
  extractOptionsFromQuestionText,
  mergeQuestGateFields,
  normalizeQuestGateFields,
  type ConversationalQuestionDetection,
} from "./question-parser.ts";

