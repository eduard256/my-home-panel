import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Section, AIMessage } from '@/shared/types';

interface AIChatSession {
  messages: AIMessage[];
  processId: string | null;
  sessionId: string | null;
  isLoading: boolean;
  rawSSEOutput: string[]; // Raw SSE lines for debugging/display
}

interface AIState {
  // Sessions per section
  sessions: Record<Section, AIChatSession>;

  // Get session for section
  getSession: (section: Section) => AIChatSession;

  // Add user message
  addUserMessage: (section: Section, content: string) => string;

  // Add assistant message
  addAssistantMessage: (section: Section, content: string) => string;

  // Append to last assistant message (for streaming)
  appendToLastMessage: (section: Section, content: string) => void;

  // Add raw SSE line (for debugging)
  addRawSSELine: (section: Section, line: string) => void;

  // Set loading state
  setLoading: (section: Section, isLoading: boolean) => void;

  // Set process ID
  setProcessId: (section: Section, processId: string | null) => void;

  // Set session ID
  setSessionId: (section: Section, sessionId: string | null) => void;

  // Clear session (new chat)
  clearSession: (section: Section) => void;

  // Clear all sessions
  clearAllSessions: () => void;
}

const createEmptySession = (): AIChatSession => ({
  messages: [],
  processId: null,
  sessionId: null,
  isLoading: false,
  rawSSEOutput: [],
});

const initialSessions: Record<Section, AIChatSession> = {
  dashboard: createEmptySession(),
  servers: createEmptySession(),
  vms: createEmptySession(),
  automations: createEmptySession(),
  smarthome: createEmptySession(),
  cameras: createEmptySession(),
  assistant: createEmptySession(),
};

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      sessions: initialSessions,

      getSession: (section) => {
        return get().sessions[section] || createEmptySession();
      },

      addUserMessage: (section, content) => {
        const id = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: {
              ...state.sessions[section],
              messages: [
                ...state.sessions[section].messages,
                {
                  id,
                  role: 'user',
                  content,
                  timestamp: Date.now(),
                },
              ],
            },
          },
        }));
        return id;
      },

      addAssistantMessage: (section, content) => {
        const id = `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: {
              ...state.sessions[section],
              messages: [
                ...state.sessions[section].messages,
                {
                  id,
                  role: 'assistant',
                  content,
                  timestamp: Date.now(),
                },
              ],
            },
          },
        }));
        return id;
      },

      appendToLastMessage: (section, content) => {
        set((state) => {
          const session = state.sessions[section];
          const messages = [...session.messages];
          const lastMessage = messages[messages.length - 1];

          if (lastMessage && lastMessage.role === 'assistant') {
            messages[messages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + content,
            };
          }

          return {
            sessions: {
              ...state.sessions,
              [section]: {
                ...session,
                messages,
              },
            },
          };
        });
      },

      addRawSSELine: (section, line) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: {
              ...state.sessions[section],
              rawSSEOutput: [...state.sessions[section].rawSSEOutput, line],
            },
          },
        }));
      },

      setLoading: (section, isLoading) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: {
              ...state.sessions[section],
              isLoading,
            },
          },
        }));
      },

      setProcessId: (section, processId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: {
              ...state.sessions[section],
              processId,
            },
          },
        }));
      },

      setSessionId: (section, sessionId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: {
              ...state.sessions[section],
              sessionId,
            },
          },
        }));
      },

      clearSession: (section) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [section]: createEmptySession(),
          },
        }));
      },

      clearAllSessions: () => {
        set({ sessions: initialSessions });
      },
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({
        sessions: Object.fromEntries(
          Object.entries(state.sessions).map(([key, session]) => [
            key,
            {
              messages: session.messages,
              sessionId: session.sessionId,
              rawSSEOutput: session.rawSSEOutput.slice(-100), // Keep last 100 lines
            },
          ])
        ),
      }),
    }
  )
);
