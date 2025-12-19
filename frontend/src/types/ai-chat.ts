/**
 * AI Chat Types
 * Complete type definitions for AI Hub SSE stream parsing
 */

// ============================================
// Tool Types
// ============================================

export type ToolName =
  | 'Write'
  | 'Edit'
  | 'Read'
  | 'Bash'
  | 'Glob'
  | 'Grep'
  | 'WebSearch'
  | 'WebFetch'
  | 'Task'
  | 'TaskOutput'
  | 'TodoWrite'
  | 'KillShell'
  | 'NotebookEdit'
  | 'EnterPlanMode'
  | 'ExitPlanMode'
  | 'Skill'
  | 'SlashCommand'
  | 'AskUserQuestion'
  | string; // For unknown/MCP tools

export type ToolStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

export interface ToolCallBase {
  id: string;
  name: ToolName;
  status: ToolStatus;
  timestamp: string;
  sequence: number;
  duration_ms?: number;
}

// Write tool
export interface WriteToolCall extends ToolCallBase {
  name: 'Write';
  input: {
    file_path: string;
    content: string;
  };
  result?: {
    type: 'create' | 'overwrite';
    filePath: string;
    content: string;
  };
}

// Edit tool
export interface EditToolCall extends ToolCallBase {
  name: 'Edit';
  input: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  };
  result?: {
    filePath: string;
    oldString: string;
    newString: string;
    originalFile: string;
    structuredPatch: DiffHunk[];
  };
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

// Read tool
export interface ReadToolCall extends ToolCallBase {
  name: 'Read';
  input: {
    file_path: string;
    offset?: number;
    limit?: number;
  };
  result?: {
    type: 'text' | 'image' | 'notebook';
    file: {
      filePath: string;
      content: string;
      numLines: number;
      startLine: number;
      totalLines: number;
    };
  };
}

// Bash tool
export interface BashToolCall extends ToolCallBase {
  name: 'Bash';
  input: {
    command: string;
    description?: string;
    timeout?: number;
    run_in_background?: boolean;
  };
  result?: {
    stdout: string;
    stderr: string;
    interrupted: boolean;
    exit_code?: number;
    task_id?: string;
  };
}

// Glob tool
export interface GlobToolCall extends ToolCallBase {
  name: 'Glob';
  input: {
    pattern: string;
    path?: string;
  };
  result?: {
    filenames: string[];
  };
}

// Grep tool
export interface GrepToolCall extends ToolCallBase {
  name: 'Grep';
  input: {
    pattern: string;
    path?: string;
    glob?: string;
    output_mode?: 'content' | 'files_with_matches' | 'count';
  };
  result?: {
    matches: string;
    filenames?: string[];
  };
}

// WebSearch tool
export interface WebSearchToolCall extends ToolCallBase {
  name: 'WebSearch';
  input: {
    query: string;
    allowed_domains?: string[];
    blocked_domains?: string[];
  };
  result?: {
    results: string;
  };
}

// WebFetch tool
export interface WebFetchToolCall extends ToolCallBase {
  name: 'WebFetch';
  input: {
    url: string;
    prompt: string;
  };
  result?: {
    content: string;
  };
}

// Task tool (agents)
export interface TaskToolCall extends ToolCallBase {
  name: 'Task';
  input: {
    description: string;
    prompt: string;
    subagent_type: 'general-purpose' | 'Explore' | 'Plan' | 'statusline-setup' | string;
    model?: string;
    run_in_background?: boolean;
  };
  result?: {
    output: string;
    agentId?: string;
  };
  childEvents?: AIStreamEvent[];
}

// TaskOutput tool
export interface TaskOutputToolCall extends ToolCallBase {
  name: 'TaskOutput';
  input: {
    task_id: string;
    block?: boolean;
    timeout?: number;
  };
  result?: {
    stdout: string;
    status: string;
  };
}

// TodoWrite tool
export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface TodoWriteToolCall extends ToolCallBase {
  name: 'TodoWrite';
  input: {
    todos: TodoItem[];
  };
  result?: {
    oldTodos: TodoItem[];
    newTodos: TodoItem[];
  };
}

// KillShell tool
export interface KillShellToolCall extends ToolCallBase {
  name: 'KillShell';
  input: {
    shell_id: string;
  };
  result?: {
    status: 'killed' | 'not_found' | 'error';
  };
}

// EnterPlanMode / ExitPlanMode
export interface PlanModeToolCall extends ToolCallBase {
  name: 'EnterPlanMode' | 'ExitPlanMode';
  input: Record<string, unknown>;
  result?: {
    success: boolean;
  };
}

// Generic/Unknown tool (for MCP and future tools)
export interface GenericToolCall extends ToolCallBase {
  input: Record<string, unknown>;
  result?: unknown;
}

export type ToolCall =
  | WriteToolCall
  | EditToolCall
  | ReadToolCall
  | BashToolCall
  | GlobToolCall
  | GrepToolCall
  | WebSearchToolCall
  | WebFetchToolCall
  | TaskToolCall
  | TaskOutputToolCall
  | TodoWriteToolCall
  | KillShellToolCall
  | PlanModeToolCall
  | GenericToolCall;

// ============================================
// Message Types
// ============================================

export interface UserMessage {
  id: string;
  role: 'user';
  content: string;
  timestamp: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  timestamp: string;
  isStreaming: boolean;
  isComplete: boolean;
  content: AssistantContent[];
  toolCalls: ToolCall[];
  usage?: MessageUsage;
  duration_ms?: number;
  cost_usd?: number;
  model?: string;
}

export interface AssistantContent {
  type: 'text';
  text: string;
  timestamp: string;
  sequence: number;
}

export interface MessageUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export type ChatMessage = UserMessage | AssistantMessage;

// ============================================
// Session Types
// ============================================

export interface ChatSession {
  id: string;
  session_id: string | null;
  model: 'sonnet' | 'opus' | 'haiku';
  messages: ChatMessage[];
  currentTodos: TodoItem[];
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  };
  isInPlanMode: boolean;
  nextSequence: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// SSE Stream Types
// ============================================

export interface SSESystemInit {
  type: 'system';
  subtype: 'init';
  cwd: string;
  session_id: string;
  tools: string[];
  mcp_servers: string[];
  model: string;
  agents: string[];
  claude_code_version: string;
}

export interface SSEAssistantMessage {
  type: 'assistant';
  message: {
    id: string;
    model: string;
    content: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens: number;
      cache_creation_input_tokens: number;
    };
  };
  session_id: string;
  parent_tool_use_id?: string;
}

export interface SSEUserMessage {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      tool_use_id: string;
      type: 'tool_result';
      content: string | Array<{ type: string; text: string }>;
      is_error?: boolean;
    }>;
  };
  tool_use_result?: Record<string, unknown>;
  parent_tool_use_id?: string;
  session_id: string;
}

export interface SSEResult {
  type: 'result';
  subtype: 'success' | 'error';
  is_error: boolean;
  duration_ms: number;
  result: string;
  session_id: string;
  total_cost_usd: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
  modelUsage?: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    costUSD: number;
  }>;
}

export interface SSEDone {
  type: 'done';
  process_id: string;
}

export type AIStreamEvent =
  | SSESystemInit
  | SSEAssistantMessage
  | SSEUserMessage
  | SSEResult
  | SSEDone
  | { type: string; [key: string]: unknown };

// ============================================
// Store Types
// ============================================

export type CategoryId = 'servers' | 'vms' | 'cameras' | 'automations' | 'devices' | 'assistant';

export interface AIChatStore {
  sessions: Record<CategoryId, ChatSession>;
  selectedModel: 'sonnet' | 'opus' | 'haiku';
  isStreaming: boolean;
  currentStreamingMessageId: string | null;
  abortController: AbortController | null;

  // Actions
  sendMessage: (category: CategoryId, content: string) => void;
  cancelStream: () => void;
  setModel: (model: 'sonnet' | 'opus' | 'haiku') => void;
  clearSession: (category: CategoryId) => void;

  // Internal actions (called by SSE parser)
  _startStreaming: (category: CategoryId, messageId: string) => void;
  _appendText: (category: CategoryId, text: string, timestamp: string) => void;
  _addToolCall: (category: CategoryId, toolCall: ToolCall) => void;
  _updateToolCall: (category: CategoryId, toolId: string, updates: Partial<ToolCall>) => void;
  _finishMessage: (category: CategoryId, result: SSEResult) => void;
  _setSessionId: (category: CategoryId, sessionId: string) => void;
  _updateTodos: (category: CategoryId, todos: TodoItem[]) => void;
  _setPlanMode: (category: CategoryId, isInPlanMode: boolean) => void;
  _setAbortController: (controller: AbortController | null) => void;
}
