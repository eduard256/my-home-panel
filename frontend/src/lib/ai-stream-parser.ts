/**
 * AI Hub SSE Stream Parser
 * Parses SSE events from AI Hub API and dispatches to store
 */

import type {
  AIStreamEvent,
  SSESystemInit,
  SSEAssistantMessage,
  SSEUserMessage,
  SSEResult,
  ToolCall,
  ToolStatus,
  CategoryId,
  AIChatStore,
} from '@/types/ai-chat';

type StoreActions = Pick<
  AIChatStore,
  | '_startStreaming'
  | '_appendText'
  | '_addToolCall'
  | '_updateToolCall'
  | '_finishMessage'
  | '_setSessionId'
  | '_updateTodos'
  | '_setPlanMode'
>;

/**
 * Parse a single SSE line into an event object
 */
export function parseSSELine(line: string): AIStreamEvent | null {
  if (!line.startsWith('data: ')) {
    return null;
  }

  const data = line.slice(6);
  if (data === '[DONE]') {
    return { type: 'done', process_id: '' };
  }

  try {
    return JSON.parse(data) as AIStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Create a tool call object from SSE assistant message
 */
function createToolCall(
  toolUse: { id: string; name: string; input: Record<string, unknown> },
  timestamp: string
): ToolCall {
  return {
    id: toolUse.id,
    name: toolUse.name,
    status: 'running' as ToolStatus,
    timestamp,
    input: toolUse.input,
  } as ToolCall;
}

/**
 * Process tool result and extract relevant data
 */
function processToolResult(
  _toolName: string,
  content: string | Array<{ type: string; text: string }>,
  toolUseResult?: Record<string, unknown>
): Record<string, unknown> | undefined {
  // Use the structured tool_use_result if available
  if (toolUseResult) {
    return toolUseResult;
  }

  // Otherwise parse from content string
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  // Handle array content
  if (Array.isArray(content)) {
    const text = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
    return { raw: text };
  }

  return undefined;
}

/**
 * Main stream processor class
 */
export class AIStreamProcessor {
  private category: CategoryId;
  private store: StoreActions;
  private pendingToolCalls: Map<string, ToolCall> = new Map();
  private buffer: string = '';

  constructor(category: CategoryId, store: StoreActions, _messageId: string) {
    this.category = category;
    this.store = store;
  }

  /**
   * Process a chunk of SSE data
   */
  processChunk(chunk: string): void {
    this.buffer += chunk;

    const lines = this.buffer.split('\n');
    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      const event = parseSSELine(line);
      if (event) {
        this.processEvent(event);
      }
    }
  }

  /**
   * Process a single SSE event
   */
  private processEvent(event: AIStreamEvent): void {
    switch (event.type) {
      case 'system':
        this.handleSystemEvent(event as SSESystemInit);
        break;

      case 'assistant':
        this.handleAssistantEvent(event as SSEAssistantMessage);
        break;

      case 'user':
        this.handleUserEvent(event as SSEUserMessage);
        break;

      case 'result':
        this.handleResultEvent(event as SSEResult);
        break;

      case 'done':
        // Stream complete
        break;
    }
  }

  /**
   * Handle system init event
   */
  private handleSystemEvent(event: SSESystemInit): void {
    if (event.subtype === 'init' && event.session_id) {
      this.store._setSessionId(this.category, event.session_id);
    }
  }

  /**
   * Handle assistant message event
   */
  private handleAssistantEvent(event: SSEAssistantMessage): void {
    const timestamp = new Date().toISOString();

    // Skip nested agent messages (those with parent_tool_use_id)
    // They are handled as part of the Task tool
    if (event.parent_tool_use_id) {
      // Update the parent Task tool with child events
      const parentTool = this.pendingToolCalls.get(event.parent_tool_use_id);
      if (parentTool && parentTool.name === 'Task') {
        // Store child events for display
        const taskTool = parentTool as { childEvents?: AIStreamEvent[] };
        if (!taskTool.childEvents) {
          taskTool.childEvents = [];
        }
        taskTool.childEvents.push(event);
      }
      return;
    }

    for (const content of event.message.content) {
      if (content.type === 'text' && content.text) {
        // Store will add sequence automatically
        this.store._appendText(this.category, content.text, timestamp);
      } else if (content.type === 'tool_use' && content.id && content.name) {
        // Store will add sequence automatically
        const toolCall = createToolCall(
          {
            id: content.id,
            name: content.name,
            input: content.input || {},
          },
          timestamp
        );

        this.pendingToolCalls.set(content.id, toolCall);
        this.store._addToolCall(this.category, toolCall);

        // Handle special tools
        if (content.name === 'EnterPlanMode') {
          this.store._setPlanMode(this.category, true);
        } else if (content.name === 'ExitPlanMode') {
          this.store._setPlanMode(this.category, false);
        }
      }
    }
  }

  /**
   * Handle user message (tool results) event
   */
  private handleUserEvent(event: SSEUserMessage): void {
    // Skip nested events
    if (event.parent_tool_use_id) {
      return;
    }

    for (const content of event.message.content) {
      if (content.type === 'tool_result' && content.tool_use_id) {
        const toolCall = this.pendingToolCalls.get(content.tool_use_id);
        if (toolCall) {
          const result = processToolResult(
            toolCall.name,
            content.content,
            event.tool_use_result
          );

          const updates: Partial<ToolCall> = {
            status: content.is_error ? 'error' : 'completed',
            result,
          };

          this.store._updateToolCall(this.category, content.tool_use_id, updates);

          // Handle TodoWrite specially
          if (toolCall.name === 'TodoWrite' && event.tool_use_result?.newTodos) {
            this.store._updateTodos(
              this.category,
              event.tool_use_result.newTodos as Array<{ content: string; status: 'pending' | 'in_progress' | 'completed'; activeForm: string }>
            );
          }
        }
      }
    }
  }

  /**
   * Handle result event (stream complete)
   */
  private handleResultEvent(event: SSEResult): void {
    this.store._finishMessage(this.category, event);
  }

  /**
   * Flush any remaining buffer content
   */
  flush(): void {
    if (this.buffer.trim()) {
      const event = parseSSELine(this.buffer);
      if (event) {
        this.processEvent(event);
      }
    }
  }
}

/**
 * Create an AI chat stream connection
 */
export async function createAIStream(
  prompt: string,
  sessionId: string | null,
  cwd: string,
  model: string,
  systemPrompt: string,
  category: CategoryId,
  store: StoreActions,
  messageId: string,
  signal: AbortSignal
): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const parsedToken = token ? JSON.parse(token) : null;
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  const response = await fetch(`${apiBaseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parsedToken?.state?.token || ''}`,
    },
    body: JSON.stringify({
      prompt,
      session_id: sessionId,
      cwd,
      model,
      append_system_prompt: systemPrompt,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  const processor = new AIStreamProcessor(category, store, messageId);

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      processor.processChunk(chunk);
    }

    processor.flush();
  } finally {
    reader.releaseLock();
  }
}
