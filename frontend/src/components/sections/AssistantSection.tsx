import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Server,
  Home,
  AlertTriangle,
  Zap,
  Activity,
  Plus,
  Clock,
} from 'lucide-react';
import { formatDateGroup, truncate } from '@/lib/utils';
import { useNavigationStore, useAIChatStore } from '@/stores';
import { ASSISTANT_TEMPLATES } from '@/config/aiContexts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { UserMessage } from '@/types/ai-chat';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Server,
  Home,
  AlertTriangle,
  Zap,
  Activity,
  MessageSquare,
};

/**
 * Template Card component
 */
function TemplateCard({
  icon,
  label,
  prompt,
  onClick,
}: {
  icon: string;
  label: string;
  prompt: string;
  onClick: () => void;
}) {
  const Icon = iconMap[icon] || MessageSquare;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card p-5 text-left w-full hover:border-primary/50 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-1">{label}</h3>
          <p className="text-sm text-muted truncate">{prompt}</p>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * History Item component
 */
function HistoryItem({
  message,
  timestamp,
  onClick,
}: {
  message: string;
  timestamp: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors"
    >
      <p className="text-sm text-white truncate">{truncate(message, 60)}</p>
      <div className="flex items-center gap-1 mt-1 text-tiny text-muted">
        <Clock className="h-3 w-3" />
        <span>{new Date(timestamp).toLocaleTimeString()}</span>
      </div>
    </button>
  );
}

/**
 * AssistantSection - AI assistant with templates and history
 */
export function AssistantSection() {
  const { openAI } = useNavigationStore();
  const { sessions, clearSession } = useAIChatStore();

  // Get assistant chat history
  const assistantSession = sessions.assistant;
  const sessionMessages = assistantSession?.messages;

  // Group user messages by date
  const groupedHistory = useMemo(() => {
    const messages = sessionMessages || [];
    const userMessages = messages.filter((m): m is UserMessage => m.role === 'user');
    const groups: Record<string, UserMessage[]> = {};

    userMessages.forEach((msg) => {
      const group = formatDateGroup(msg.timestamp);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(msg);
    });

    return groups;
  }, [sessionMessages]);

  const handleTemplateClick = (prompt: string) => {
    // Open AI chat and send the prompt
    openAI();
    // The prompt will be auto-filled when AI panel opens
    // Store it in session storage for the AI panel to pick up
    sessionStorage.setItem('pending_ai_prompt', prompt);
  };

  const handleHistoryClick = () => {
    openAI();
  };

  const handleNewChat = () => {
    clearSession('assistant');
    openAI();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-semibold text-white">Assistant</h2>
            <p className="text-sm text-muted mt-1">
              AI-powered infrastructure management
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Quick Templates */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ASSISTANT_TEMPLATES.map((template, index) => (
                <motion.div
                  key={template.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TemplateCard
                    icon={template.icon}
                    label={template.label}
                    prompt={template.prompt}
                    onClick={() => handleTemplateClick(template.prompt)}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Chat History */}
          {Object.keys(groupedHistory).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                Recent Conversations
              </h3>
              <div className="space-y-4">
                {Object.entries(groupedHistory)
                  .slice(0, 3)
                  .map(([date, msgs]) => (
                    <div key={date}>
                      <h4 className="text-xs text-muted mb-2">{date}</h4>
                      <div className="card p-2 space-y-1">
                        {msgs.slice(-3).map((msg) => (
                          <HistoryItem
                            key={msg.id}
                            message={msg.content}
                            timestamp={msg.timestamp}
                            onClick={handleHistoryClick}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* FAB - New Chat */}
      <div className="p-4 border-t border-white/5">
        <Button onClick={handleNewChat} className="w-full h-12">
          <Plus className="h-5 w-5 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  );
}
