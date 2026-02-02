/**
 * AISection - Block 2 content for the AI tab
 * Features a beautiful path input for working directory and session info
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  FolderOpen,
  Terminal,
  Sparkles,
  RotateCcw,
  Clock,
  DollarSign,
  Hash,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore, getAICustomCwd, setAICustomCwd } from '@/stores/aiChatStore';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

/**
 * Path segment component for breadcrumb-style display
 */
function PathBreadcrumbs({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean);

  return (
    <div className="flex items-center gap-1 text-xs text-white/30 mt-2 overflow-x-auto">
      <span className="text-white/20">/</span>
      {segments.map((segment, i) => (
        <span key={i} className="flex items-center gap-1 flex-shrink-0">
          {i > 0 && <ChevronRight className="h-3 w-3 text-white/15" />}
          <span
            className={cn(
              'transition-colors',
              i === segments.length - 1 ? 'text-primary/70' : 'text-white/30'
            )}
          >
            {segment}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Stat card for session statistics
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-4 group hover:border-white/10 transition-all"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            color
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-tiny text-muted uppercase tracking-wider">{label}</p>
          <p className="text-base font-semibold text-white truncate">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Quick action suggestion card
 */
function SuggestionCard({
  label,
  description,
  cwd,
  onClick,
  delay,
}: {
  label: string;
  description: string;
  cwd: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card p-4 text-left w-full hover:border-primary/50 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-muted truncate">{description}</p>
        </div>
      </div>
      <div className="mt-2 ml-11 flex items-center gap-1.5 text-[10px] text-white/25 font-mono">
        <FolderOpen className="h-3 w-3" />
        <span>{cwd}</span>
      </div>
    </motion.button>
  );
}

const SUGGESTIONS = [
  {
    label: 'Home Panel',
    description: 'Explore the home panel project',
    prompt: 'Show me the project structure, explain the architecture and key components.',
    cwd: '/home/user/my-home-panel',
  },
  {
    label: 'Servers',
    description: 'Proxmox server management',
    prompt: 'Check the current status of all servers, show CPU/RAM/disk usage and any issues.',
    cwd: '/home/user/servers',
  },
  {
    label: 'Smart Home',
    description: 'Zigbee2MQTT devices',
    prompt: 'Show status of all smart home devices, check for offline devices and low batteries.',
    cwd: '/home/user/smarthome',
  },
  {
    label: 'Automations',
    description: 'Docker automation containers',
    prompt: 'Check all automation containers status, show recent errors and triggers.',
    cwd: '/home/user/automation',
  },
];

/**
 * Format cost in USD
 */
function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Format token count
 */
function formatTokens(count: number): string {
  if (count === 0) return '0';
  if (count < 1000) return count.toString();
  return `${(count / 1000).toFixed(1)}K`;
}

/**
 * AISection - Main component for Block 2 of AI tab
 */
export function AISection() {
  const [cwd, setCwd] = useState(getAICustomCwd);
  const [isFocused, setIsFocused] = useState(false);

  const { sessions, clearSession, sendMessage } = useAIChatStore();
  const { openAI } = useNavigationStore();

  const session = sessions.ai;
  const messageCount = session?.messages?.length || 0;
  const totalCost = session?.totalCost || 0;
  const totalTokens = session?.totalTokens || { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const allTokens = totalTokens.input + totalTokens.output + totalTokens.cacheRead + totalTokens.cacheCreation;

  // Sync cwd changes to the store module
  useEffect(() => {
    setAICustomCwd(cwd);
  }, [cwd]);

  const handleNewSession = useCallback(() => {
    clearSession('ai');
  }, [clearSession]);

  const handleSuggestionClick = useCallback(
    (prompt: string, suggestionCwd: string) => {
      // Set the working directory
      setCwd(suggestionCwd);
      setAICustomCwd(suggestionCwd);
      // Clear session (new chat)
      clearSession('ai');
      // Open chat panel and send message
      openAI();
      // Small delay to let clearSession propagate before sending
      setTimeout(() => {
        sendMessage('ai', prompt);
      }, 50);
    },
    [openAI, sendMessage, clearSession]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-semibold text-white">AI</h2>
            <p className="text-sm text-muted mt-1">Claude Code assistant</p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewSession}
              className="h-9 w-9 text-muted hover:text-white"
              title="New session"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Working Directory Input — Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div
              className={cn(
                'card p-6 transition-all duration-300',
                isFocused
                  ? 'border-primary/50 shadow-[0_0_30px_rgba(155,135,245,0.15)]'
                  : 'hover:border-white/10'
              )}
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Working Directory</h3>
                  <p className="text-xs text-muted">Path where AI will execute commands</p>
                </div>
              </div>

              {/* Input Field */}
              <div
                className={cn(
                  'relative rounded-xl border transition-all duration-300 overflow-hidden',
                  isFocused
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-white/10 bg-white/[0.02]'
                )}
              >
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    <Terminal
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isFocused ? 'text-primary' : 'text-white/30'
                      )}
                    />
                  </div>
                  <input
                    type="text"
                    value={cwd}
                    onChange={(e) => setCwd(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    spellCheck={false}
                    className={cn(
                      'flex-1 h-12 pr-4 bg-transparent text-sm text-white font-mono',
                      'placeholder:text-white/20 outline-none',
                      'selection:bg-primary/30'
                    )}
                    placeholder="/path/to/directory"
                  />
                </div>

                {/* Animated glow line at bottom */}
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary to-primary/0"
                  initial={{ width: '0%', left: '50%' }}
                  animate={
                    isFocused
                      ? { width: '100%', left: '0%' }
                      : { width: '0%', left: '50%' }
                  }
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Breadcrumbs */}
              <PathBreadcrumbs path={cwd} />
            </div>
          </motion.div>

          {/* Session Stats */}
          {messageCount > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                Session
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={Hash}
                  label="Messages"
                  value={messageCount.toString()}
                  color="bg-blue-500/20 text-blue-400"
                  delay={0.1}
                />
                <StatCard
                  icon={DollarSign}
                  label="Cost"
                  value={formatCost(totalCost)}
                  color="bg-emerald-500/20 text-emerald-400"
                  delay={0.15}
                />
                <StatCard
                  icon={Sparkles}
                  label="Tokens"
                  value={formatTokens(allTokens)}
                  color="bg-purple-500/20 text-purple-400"
                  delay={0.2}
                />
                <StatCard
                  icon={Clock}
                  label="Model"
                  value={(session?.model || 'sonnet').charAt(0).toUpperCase() + (session?.model || 'sonnet').slice(1)}
                  color="bg-amber-500/20 text-amber-400"
                  delay={0.25}
                />
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SUGGESTIONS.map((suggestion, index) => (
                <SuggestionCard
                  key={suggestion.label}
                  label={suggestion.label}
                  description={suggestion.description}
                  cwd={suggestion.cwd}
                  onClick={() => handleSuggestionClick(suggestion.prompt, suggestion.cwd)}
                  delay={0.1 + index * 0.05}
                />
              ))}
            </div>
          </div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
            <div className="relative p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
                Set your working directory above and use the chat panel to interact with Claude Code.
                AI will execute commands in the specified path.
              </p>
            </div>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
