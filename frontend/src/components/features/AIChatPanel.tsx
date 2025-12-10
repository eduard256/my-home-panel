import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  MoreVertical,
  Plus,
  Loader2,
  User,
  Bot,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { useNavigationStore, useAIChatStore } from '@/stores';
import { createAIChatStream } from '@/lib/api';
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
import type { AIModel, ChatMessage } from '@/types';

const MODEL_OPTIONS: { value: AIModel; label: string }[] = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

/**
 * Chat Message component
 */
function ChatMessageItem({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-dark-card text-white rounded-bl-sm'
        )}
      >
        {/* Message content */}
        <div className={cn('text-sm whitespace-pre-wrap', !isUser && 'font-mono text-xs')}>
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
          )}
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-white/60' : 'text-muted'
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.div>
  );
}

/**
 * AIChatPanel - AI chat interface for Block 3
 */
export function AIChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { currentCategory, closeBlock3 } = useNavigationStore();
  const {
    chats,
    selectedModel,
    isStreaming,
    currentStreamContent,
    setModel,
    sendMessage,
    clearHistory,
    setStreaming,
    appendStreamContent,
    finalizeMessage,
    setSessionId,
  } = useAIChatStore();

  // Get current chat
  const currentChat = chats[currentCategory];
  const messages = currentChat?.messages || [];
  const sessionId = currentChat?.session_id || null;

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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !aiContext) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to store
    sendMessage(currentCategory, userMessage);

    // Start streaming
    setStreaming(true);

    // Create SSE connection
    abortControllerRef.current = createAIChatStream(
      userMessage,
      sessionId,
      aiContext.cwd,
      selectedModel,
      aiContext.systemPrompt,
      // onEvent
      (event) => {
        if (event.type === 'system' && event.session_id) {
          setSessionId(currentCategory, event.session_id);
        } else if (event.type === 'content' || !event.type) {
          appendStreamContent(event.data);
        }
      },
      // onError
      (error) => {
        console.error('AI Chat error:', error);
        setStreaming(false);
        finalizeMessage(currentCategory, `Error: ${error.message}`);
      },
      // onDone
      () => {
        const content = useAIChatStore.getState().currentStreamContent;
        finalizeMessage(currentCategory, content);
      }
    );
  }, [
    input,
    isStreaming,
    aiContext,
    currentCategory,
    sessionId,
    selectedModel,
    sendMessage,
    setStreaming,
    setSessionId,
    appendStreamContent,
    finalizeMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearHistory(currentCategory);
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    closeBlock3();
  };

  if (!aiContext) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">AI not available</h3>
        <p className="text-sm text-muted">AI chat is not enabled for this section.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-white">AI Chat</span>
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
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => clearHistory(currentCategory)}>
                Clear History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close */}
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence>
          {messages.length === 0 && !isStreaming ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center py-12"
            >
              <Bot className="h-12 w-12 text-primary/50 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Start a conversation</h3>
              <p className="text-sm text-muted max-w-xs">
                Ask me anything about your {currentCategory}. I can help monitor, analyze, and
                manage your infrastructure.
              </p>
            </motion.div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))}

              {/* Streaming message */}
              {isStreaming && currentStreamContent && (
                <ChatMessageItem
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: currentStreamContent,
                    timestamp: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}

              {/* Loading indicator */}
              {isStreaming && !currentStreamContent && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-dark-card rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={isStreaming}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />

          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="h-11 w-11 rounded-full flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
