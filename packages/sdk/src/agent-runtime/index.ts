// Public surface of the agent-runtime abstraction.
//
// The UI depends on this module (not on OpenCodeClient directly) so a future
// ClaudeCodeAdapter can be swapped in without touching the UI.

export type { AgentRuntime } from "./adapter";
export type {
  AgentRuntimeEvent,
  TextUpdatedEvent,
  ReasoningUpdatedEvent,
  ToolUpdatedEvent,
  SessionIdleEvent,
  RuntimeErrorEvent,
  QuestionAskedEvent,
  QuestionResolvedEvent,
  PermissionAskedEvent,
  PermissionResolvedEvent,
  QuestionOption,
  QuestionItem,
  PermissionReply,
  PermissionMode,
  RuntimeStatus,
  ToolCallStatus,
  AgentSessionMeta,
  AgentSkillInfo,
  AgentInfo,
  AgentCommandInfo,
  AgentHistoryMessage,
  AgentHistoryPart,
  AgentProviderInfo,
  AgentProviderModelInfo,
  AgentMcpConfig,
  AgentMcpServer,
} from "./types";
export { createAgentRuntime, type AgentRuntimeConfig, type AgentRuntimeKind } from "./factory";
