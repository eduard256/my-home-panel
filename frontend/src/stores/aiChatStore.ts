import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIChatState, ChatHistory, ChatMessage, AIModel, CategoryId } from '@/types';
import { generateId } from '@/lib/utils';

const MAX_MESSAGES_PER_CATEGORY = 50;

const createEmptySession = (model: AIModel = 'sonnet') => ({
  session_id: null,
  model,
  messages: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const initialChats: ChatHistory = {
  servers: createEmptySession(),
  vms: createEmptySession(),
  automations: createEmptySession(),
  devices: createEmptySession(),
  cameras: createEmptySession(),
  assistant: createEmptySession(),
};

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      chats: initialChats,
      selectedModel: 'sonnet',
      isStreaming: false,
      currentStreamContent: '',

      sendMessage: (category: CategoryId, message: string) => {
        const state = get();
        const chat = state.chats[category] || createEmptySession(state.selectedModel);

        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...chat.messages, userMessage];

        // Trim if exceeds max
        const trimmedMessages =
          updatedMessages.length > MAX_MESSAGES_PER_CATEGORY
            ? updatedMessages.slice(-MAX_MESSAGES_PER_CATEGORY)
            : updatedMessages;

        set((state) => ({
          chats: {
            ...state.chats,
            [category]: {
              ...chat,
              messages: trimmedMessages,
              updated_at: new Date().toISOString(),
            },
          },
        }));
      },

      setModel: (model: AIModel) => {
        set({ selectedModel: model });
      },

      clearHistory: (category: CategoryId) => {
        set((state) => ({
          chats: {
            ...state.chats,
            [category]: createEmptySession(state.selectedModel),
          },
        }));
      },

      setStreaming: (streaming: boolean) => {
        set({ isStreaming: streaming });
        if (!streaming) {
          set({ currentStreamContent: '' });
        }
      },

      appendStreamContent: (content: string) => {
        set((state) => ({
          currentStreamContent: state.currentStreamContent + content,
        }));
      },

      finalizeMessage: (category: CategoryId, content: string) => {
        const state = get();
        const chat = state.chats[category];
        if (!chat) return;

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...chat.messages, assistantMessage];

        // Trim if exceeds max
        const trimmedMessages =
          updatedMessages.length > MAX_MESSAGES_PER_CATEGORY
            ? updatedMessages.slice(-MAX_MESSAGES_PER_CATEGORY)
            : updatedMessages;

        set((state) => ({
          chats: {
            ...state.chats,
            [category]: {
              ...chat,
              messages: trimmedMessages,
              updated_at: new Date().toISOString(),
            },
          },
          isStreaming: false,
          currentStreamContent: '',
        }));
      },

      setSessionId: (category: CategoryId, sessionId: string) => {
        set((state) => ({
          chats: {
            ...state.chats,
            [category]: {
              ...state.chats[category],
              session_id: sessionId,
            },
          },
        }));
      },
    }),
    {
      name: 'chat_history',
      partialize: (state) => ({
        chats: state.chats,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
