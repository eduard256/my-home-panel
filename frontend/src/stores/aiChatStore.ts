/**
 * AI Chat Store
 * Complete state management for AI chat with tool calls
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils';
import { createAIStream } from '@/lib/ai-stream-parser';
import { getAIContext } from '@/config/aiContexts';
import type {
  CategoryId,
  ChatSession,
  UserMessage,
  AssistantMessage,
  ToolCall,
  TodoItem,
  SSEResult,
  AIChatStore,
} from '@/types/ai-chat';

const MAX_MESSAGES_PER_SESSION = 100;

/**
 * Create empty session for a category
 */
function createEmptySession(): ChatSession {
  return {
    id: generateId(),
    session_id: null,
    model: 'sonnet',
    messages: [],
    currentTodos: [],
    totalCost: 0,
    totalTokens: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheCreation: 0,
    },
    isInPlanMode: false,
    nextSequence: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Initial sessions for all categories
 */
const initialSessions: Record<CategoryId, ChatSession> = {
  servers: createEmptySession(),
  vms: createEmptySession(),
  automations: createEmptySession(),
  devices: createEmptySession(),
  assistant: createEmptySession(),
};

/**
 * AI Chat Store Implementation
 */
export const useAIChatStore = create<AIChatStore>()(
  persist(
    (set, get) => ({
      sessions: initialSessions,
      selectedModel: 'sonnet' as const,
      isStreaming: false,
      currentStreamingMessageId: null,
      abortController: null,

      // ============================================
      // Public Actions
      // ============================================

      sendMessage: (category: CategoryId, content: string) => {
        const state = get();
        const session = state.sessions[category] || createEmptySession();
        const aiContext = getAIContext(category);

        if (!aiContext) {
          console.error('AI context not available for category:', category);
          return;
        }

        // Create user message
        const userMessage: UserMessage = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };

        // Create placeholder assistant message
        const assistantMessageId = generateId();
        const assistantMessage: AssistantMessage = {
          id: assistantMessageId,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          isStreaming: true,
          isComplete: false,
          content: [],
          toolCalls: [],
          model: state.selectedModel,
        };

        // Update session with both messages
        const updatedMessages = [...session.messages, userMessage, assistantMessage];
        const trimmedMessages =
          updatedMessages.length > MAX_MESSAGES_PER_SESSION
            ? updatedMessages.slice(-MAX_MESSAGES_PER_SESSION)
            : updatedMessages;

        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: {
              ...session,
              messages: trimmedMessages,
              updated_at: new Date().toISOString(),
            },
          },
          isStreaming: true,
          currentStreamingMessageId: assistantMessageId,
        }));

        // Create abort controller
        const abortController = new AbortController();
        set({ abortController });

        // Get store actions for stream processor
        const storeActions = {
          _startStreaming: get()._startStreaming,
          _appendText: get()._appendText,
          _addToolCall: get()._addToolCall,
          _updateToolCall: get()._updateToolCall,
          _finishMessage: get()._finishMessage,
          _setSessionId: get()._setSessionId,
          _updateTodos: get()._updateTodos,
          _setPlanMode: get()._setPlanMode,
        };

        // Start streaming
        createAIStream(
          content,
          session.session_id,
          aiContext.cwd,
          state.selectedModel,
          aiContext.systemPrompt,
          category,
          storeActions,
          assistantMessageId,
          abortController.signal
        ).catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('AI stream error:', error);
            // Add error to message
            const state = get();
            const session = state.sessions[category];
            if (session) {
              const messages = session.messages.map((msg) => {
                if (msg.id === assistantMessageId && msg.role === 'assistant') {
                  return {
                    ...msg,
                    isStreaming: false,
                    isComplete: true,
                    content: [
                      ...msg.content,
                      {
                        type: 'text' as const,
                        text: `Error: ${error.message}`,
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  };
                }
                return msg;
              });
              set((state) => ({
                sessions: {
                  ...state.sessions,
                  [category]: {
                    ...session,
                    messages,
                  },
                },
                isStreaming: false,
                currentStreamingMessageId: null,
                abortController: null,
              }));
            }
          }
        });
      },

      cancelStream: () => {
        set((state) => {
          if (state.abortController) {
            state.abortController.abort();
          }

          // Find current streaming message and mark all running tools as cancelled
          const sessions = { ...state.sessions };
          for (const [category, session] of Object.entries(sessions)) {
            const updatedMessages = session.messages.map((msg) => {
              if (msg.id === state.currentStreamingMessageId && msg.role === 'assistant') {
                const assistantMsg = msg as AssistantMessage;
                return {
                  ...assistantMsg,
                  isStreaming: false,
                  toolCalls: assistantMsg.toolCalls.map((tool) =>
                    tool.status === 'running' || tool.status === 'pending'
                      ? { ...tool, status: 'cancelled' as const }
                      : tool
                  ),
                };
              }
              return msg;
            });

            sessions[category as CategoryId] = {
              ...session,
              messages: updatedMessages,
            };
          }

          return {
            ...state,
            sessions,
            isStreaming: false,
            currentStreamingMessageId: null,
            abortController: null,
          };
        });
      },

      setModel: (model: 'sonnet' | 'opus' | 'haiku') => {
        set({ selectedModel: model });
      },

      clearSession: (category: CategoryId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: createEmptySession(),
          },
        }));
      },

      // ============================================
      // Internal Actions (called by stream processor)
      // ============================================

      _startStreaming: (_category: CategoryId, messageId: string) => {
        set({
          isStreaming: true,
          currentStreamingMessageId: messageId,
        });
      },

      _appendText: (category: CategoryId, text: string, timestamp: string) => {
        set((state) => {
          const session = state.sessions[category];
          if (!session) return state;

          // Get current sequence and increment
          const sequence = session.nextSequence;
          const nextSequence = session.nextSequence + 1;

          const messages = session.messages.map((msg) => {
            if (msg.id === state.currentStreamingMessageId && msg.role === 'assistant') {
              const assistantMsg = msg as AssistantMessage;

              // Always create new content item (no merging!)
              return {
                ...assistantMsg,
                content: [
                  ...assistantMsg.content,
                  { type: 'text' as const, text, timestamp, sequence },
                ],
              };
            }
            return msg;
          });

          return {
            ...state,
            sessions: {
              ...state.sessions,
              [category]: {
                ...session,
                messages,
                nextSequence,
              },
            },
          };
        });
      },

      _addToolCall: (category: CategoryId, toolCall: ToolCall) => {
        set((state) => {
          const session = state.sessions[category];
          if (!session) return state;

          // Get current sequence and increment
          const sequence = session.nextSequence;
          const nextSequence = session.nextSequence + 1;

          // Add sequence to tool call
          const toolCallWithSequence = {
            ...toolCall,
            sequence,
          };

          const messages = session.messages.map((msg) => {
            if (msg.id === state.currentStreamingMessageId && msg.role === 'assistant') {
              const assistantMsg = msg as AssistantMessage;
              return {
                ...assistantMsg,
                toolCalls: [...assistantMsg.toolCalls, toolCallWithSequence],
              };
            }
            return msg;
          });

          return {
            ...state,
            sessions: {
              ...state.sessions,
              [category]: {
                ...session,
                messages,
                nextSequence,
              },
            },
          };
        });
      },

      _updateToolCall: (category: CategoryId, toolId: string, updates: Partial<ToolCall>) => {
        const state = get();
        const session = state.sessions[category];
        if (!session) return;

        const messages = session.messages.map((msg) => {
          if (msg.id === state.currentStreamingMessageId && msg.role === 'assistant') {
            const assistantMsg = msg as AssistantMessage;
            return {
              ...assistantMsg,
              toolCalls: assistantMsg.toolCalls.map((tc) =>
                tc.id === toolId ? { ...tc, ...updates } : tc
              ),
            };
          }
          return msg;
        });

        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: {
              ...session,
              messages,
            },
          },
        }));
      },

      _finishMessage: (category: CategoryId, result: SSEResult) => {
        const state = get();
        const session = state.sessions[category];
        if (!session) return;

        const messages = session.messages.map((msg) => {
          if (msg.id === state.currentStreamingMessageId && msg.role === 'assistant') {
            const assistantMsg = msg as AssistantMessage;
            return {
              ...assistantMsg,
              isStreaming: false,
              isComplete: true,
              duration_ms: result.duration_ms,
              cost_usd: result.total_cost_usd,
              usage: result.usage
                ? {
                    input_tokens: result.usage.input_tokens,
                    output_tokens: result.usage.output_tokens,
                    cache_read_input_tokens: result.usage.cache_read_input_tokens,
                    cache_creation_input_tokens: result.usage.cache_creation_input_tokens,
                  }
                : undefined,
            };
          }
          return msg;
        });

        // Update session totals
        const newTotalCost = session.totalCost + (result.total_cost_usd || 0);
        const newTotalTokens = {
          input: session.totalTokens.input + (result.usage?.input_tokens || 0),
          output: session.totalTokens.output + (result.usage?.output_tokens || 0),
          cacheRead: session.totalTokens.cacheRead + (result.usage?.cache_read_input_tokens || 0),
          cacheCreation: session.totalTokens.cacheCreation + (result.usage?.cache_creation_input_tokens || 0),
        };

        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: {
              ...session,
              messages,
              totalCost: newTotalCost,
              totalTokens: newTotalTokens,
              updated_at: new Date().toISOString(),
            },
          },
          isStreaming: false,
          currentStreamingMessageId: null,
          abortController: null,
        }));
      },

      _setSessionId: (category: CategoryId, sessionId: string) => {
        const state = get();
        const session = state.sessions[category];
        if (!session) return;

        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: {
              ...session,
              session_id: sessionId,
            },
          },
        }));
      },

      _updateTodos: (category: CategoryId, todos: TodoItem[]) => {
        const state = get();
        const session = state.sessions[category];
        if (!session) return;

        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: {
              ...session,
              currentTodos: todos,
            },
          },
        }));
      },

      _setPlanMode: (category: CategoryId, isInPlanMode: boolean) => {
        const state = get();
        const session = state.sessions[category];
        if (!session) return;

        set((state) => ({
          sessions: {
            ...state.sessions,
            [category]: {
              ...session,
              isInPlanMode,
            },
          },
        }));
      },

      _setAbortController: (controller: AbortController | null) => {
        set({ abortController: controller });
      },
    }),
    {
      name: 'ai_chat_sessions',
      partialize: (state) => ({
        sessions: state.sessions,
        selectedModel: state.selectedModel,
      }),
    }
  )
);

// Export for backwards compatibility
export default useAIChatStore;
