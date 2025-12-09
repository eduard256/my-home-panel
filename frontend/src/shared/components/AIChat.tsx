import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Loader2 } from 'lucide-react';
import { useUIStore, useAIStore } from '@/shared/stores';
import { ai } from '@/shared/api';
import { getPromptForSection, getCwdForSection } from '@/shared/config/prompts';
import { RawSSEDisplay } from './RawSSEDisplay';

export function AIChat() {
  const { section } = useUIStore();
  const {
    getSession,
    addUserMessage,
    addRawSSELine,
    setLoading,
    setProcessId,
    setSessionId,
    clearSession,
  } = useAIStore();

  const currentSession = getSession(section);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.rawSSEOutput]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || currentSession.isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to display
    addUserMessage(section, userMessage);
    setLoading(section, true);

    // Get config for current section
    const cwd = getCwdForSection(section);
    const systemPrompt = getPromptForSection(section);

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Start SSE chat
      const response = await ai.startChat({
        prompt: userMessage,
        cwd,
        system_prompt: systemPrompt,
        session_id: currentSession.sessionId || undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      // Read SSE stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            // Add raw SSE line to display
            addRawSSELine(section, line);

            // Try to parse session_id from first message
            if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));
                if (data.session_id && !currentSession.sessionId) {
                  setSessionId(section, data.session_id);
                }
                if (data.process_id) {
                  setProcessId(section, data.process_id);
                }
              } catch {
                // Not valid JSON, ignore
              }
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        addRawSSELine(section, '[Request cancelled]');
      } else {
        addRawSSELine(section, `[Error: ${(error as Error).message}]`);
      }
    } finally {
      setLoading(section, false);
      abortControllerRef.current = null;
    }
  };

  // Handle new chat
  const handleNewChat = async () => {
    // Cancel any running request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Cancel backend process if exists
    if (currentSession.processId) {
      try {
        await ai.cancelChat(currentSession.processId);
      } catch {
        // Ignore errors
      }
    }

    // Clear session
    clearSession(section);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0f] to-[#16161d]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white">AI Chat</h2>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#9b87f5] hover:bg-[#9b87f5]/10 transition-colors"
        >
          <Plus size={16} />
          Новый чат
        </button>
      </div>

      {/* Messages area - RAW SSE OUTPUT */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <RawSSEDisplay lines={currentSession.rawSSEOutput} />
        <div ref={messagesEndRef} />
      </div>

      {/* Loading indicator */}
      <AnimatePresence>
        {currentSession.isLoading && (
          <motion.div
            className="flex items-center gap-2 px-4 py-2 text-[#9b87f5]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">AI думает...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4 border-t border-white/5 bg-[#16161d]/50 backdrop-blur-sm">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 resize-none bg-[#16161d] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-[#6b6b70] focus:border-[#9b87f5] focus:ring-0 transition-colors"
            disabled={currentSession.isLoading}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || currentSession.isLoading}
            className={`
              p-3 rounded-xl transition-all
              ${
                input.trim() && !currentSession.isLoading
                  ? 'bg-gradient-to-r from-[#9b87f5] to-[#7c3aed] text-white shadow-lg shadow-[#9b87f5]/30 hover:shadow-[#9b87f5]/50'
                  : 'bg-[#16161d] text-[#6b6b70] cursor-not-allowed'
              }
            `}
            whileHover={input.trim() && !currentSession.isLoading ? { scale: 1.05 } : {}}
            whileTap={input.trim() && !currentSession.isLoading ? { scale: 0.95 } : {}}
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
