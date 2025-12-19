/**
 * AI Chat Panel
 * Main chat interface component with timeline layout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/stores';
import { useAIChatStore } from '@/stores/aiChatStore';
import { getAIContext } from '@/config/aiContexts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMessageBubble, AssistantMessageBubble } from './MessageBubble';
import { ChatStatusBar } from './ChatStatusBar';
import type { AIModel } from '@/types';
import type { UserMessage, AssistantMessage } from '@/types/ai-chat';

const MODEL_OPTIONS: { value: AIModel; label: string }[] = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

/**
 * Chat Icon SVG
 */
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/**
 * Close Icon SVG
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Send Icon SVG
 */
function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-5 h-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

/**
 * Stop Icon SVG
 */
function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-5 h-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Menu Icon SVG
 */
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

/**
 * Plus Icon SVG
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Empty state component
 */
function EmptyState({ category }: { category: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center text-center py-12 px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-primary/50"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Start a conversation</h3>
      <p className="text-sm text-white/40 max-w-xs leading-relaxed">
        Ask me anything about your {category}. I can help monitor, analyze, and manage your
        infrastructure.
      </p>
    </motion.div>
  );
}

/**
 * AI not available state
 */
function AINotAvailable() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <ChatIcon className="w-12 h-12 text-white/20 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">AI not available</h3>
      <p className="text-sm text-white/40">AI chat is not enabled for this section.</p>
    </div>
  );
}

/**
 * Main AI Chat Panel Component
 */
export function AIChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentCategory, closeBlock3 } = useNavigationStore();
  const {
    sessions,
    selectedModel,
    isStreaming,
    setModel,
    sendMessage,
    cancelStream,
    clearSession,
  } = useAIChatStore();

  // Get current session
  const session = sessions[currentCategory];
  const messages = session?.messages || [];

  // Get AI context for current category
  const aiContext = getAIContext(currentCategory);

  // Check for pending AI prompt (from templates or quick actions)
  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem('pending_ai_prompt');
    if (pendingPrompt) {
      setInput(pendingPrompt);
      sessionStorage.removeItem('pending_ai_prompt');
    }
  }, [currentCategory]);

  // Scroll to bottom when messages change
  const messagesLength = messages.length;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesLength, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      cancelStream();
    }
    clearSession(currentCategory);
  }, [isStreaming, cancelStream, clearSession, currentCategory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel streaming
      if (e.key === 'Escape' && isStreaming) {
        cancelStream();
      }
      // Ctrl+N for new chat
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, cancelStream, handleNewChat]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming || !aiContext) return;

    const userMessage = input.trim();
    setInput('');
    sendMessage(currentCategory, userMessage);
  }, [input, isStreaming, aiContext, currentCategory, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // If streaming, cancel it first then send new message
      if (isStreaming && input.trim()) {
        cancelStream();
        // Small delay to ensure cancellation is processed
        setTimeout(() => {
          const userMessage = input.trim();
          setInput('');
          sendMessage(currentCategory, userMessage);
        }, 100);
      } else {
        handleSend();
      }
    }
  };

  const handleClose = () => {
    if (isStreaming) {
      cancelStream();
    }
    closeBlock3();
  };

  if (!aiContext) {
    return <AINotAvailable />;
  }

  // Determine if in plan mode
  const isInPlanMode = session?.isInPlanMode || false;

  return (
    <div
      className={cn(
        'h-full flex flex-col transition-colors duration-300',
        isInPlanMode && 'bg-teal-950/10'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <ChatIcon className="text-primary" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm">AI Chat</span>
            {isInPlanMode && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400">
                Plan Mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <Select value={selectedModel} onValueChange={(v) => setModel(v as AIModel)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MenuIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewChat}>
                <PlusIcon className="mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => clearSession(currentCategory)}>
                Clear History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close */}
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <CloseIcon />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && !isStreaming ? (
            <EmptyState category={currentCategory} />
          ) : (
            <div className="space-y-2">
              {messages.map((message) => {
                if (message.role === 'user') {
                  return (
                    <UserMessageBubble
                      key={message.id}
                      message={message as UserMessage}
                    />
                  );
                } else {
                  return (
                    <AssistantMessageBubble
                      key={message.id}
                      message={message as AssistantMessage}
                    />
                  );
                }
              })}
            </div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Status Bar */}
      {session && (
        <ChatStatusBar session={session} isStreaming={isStreaming} />
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />

          <Button
            onClick={isStreaming ? cancelStream : handleSend}
            disabled={!isStreaming && !input.trim()}
            className={cn(
              'h-11 w-11 rounded-full flex-shrink-0 transition-colors',
              isStreaming && 'bg-red-500 hover:bg-red-600'
            )}
          >
            {isStreaming ? <StopIcon /> : <SendIcon />}
          </Button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 font-mono">Enter</kbd> send
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/5 font-mono">Shift+Enter</kbd> new line
          </span>
          {isStreaming && (
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/5 font-mono">Esc</kbd> cancel
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIChatPanel;
