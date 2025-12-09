import { motion } from 'framer-motion';
import { Bot, Sparkles, Code, Terminal, Lightbulb, Zap } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const suggestions = [
  {
    icon: <Sparkles size={20} />,
    color: '#9b87f5',
    title: 'Оптимизировать систему',
    description: 'Проанализируй ресурсы и предложи оптимизации',
  },
  {
    icon: <Code size={20} />,
    color: '#10b981',
    title: 'Написать скрипт',
    description: 'Создай автоматизацию для рутинных задач',
  },
  {
    icon: <Terminal size={20} />,
    color: '#3b82f6',
    title: 'Диагностика',
    description: 'Проверь состояние всех сервисов',
  },
  {
    icon: <Lightbulb size={20} />,
    color: '#f59e0b',
    title: 'Настроить умный дом',
    description: 'Помоги с конфигурацией устройств',
  },
];

export function AssistantOverview() {
  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="text-center py-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#9b87f5] to-[#7c3aed] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#9b87f5]/20">
          <Bot size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">AI Ассистент</h1>
        <p className="text-[#a0a0a8] max-w-sm mx-auto">
          Универсальный помощник для управления вашей инфраструктурой
        </p>
      </motion.div>

      {/* Quick suggestions */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-[#a0a0a8] uppercase tracking-wide mb-3 flex items-center gap-2">
          <Zap size={14} />
          Быстрые действия
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {suggestions.map((suggestion, idx) => (
            <Card key={idx} className="cursor-pointer">
              <CardContent>
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${suggestion.color}20`, color: suggestion.color }}
                  >
                    {suggestion.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white mb-1">{suggestion.title}</h3>
                    <p className="text-xs text-[#a0a0a8]">{suggestion.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Capabilities */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-[#a0a0a8] uppercase tracking-wide mb-3">
          Возможности
        </h2>
        <Card hoverable={false}>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#a0a0a8]">Полный доступ к терминалу</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#a0a0a8]">Управление файлами и конфигурациями</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#a0a0a8]">Написание и выполнение скриптов</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#a0a0a8]">Анализ логов и диагностика</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#a0a0a8]">Интеграция со всеми сервисами</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tip */}
      <motion.div variants={item}>
        <div className="p-4 rounded-xl bg-[#9b87f5]/10 border border-[#9b87f5]/20">
          <p className="text-sm text-[#a0a0a8]">
            <span className="text-[#9b87f5] font-medium">Совет:</span> Откройте чат справа, чтобы начать диалог с ассистентом.
            Он может выполнять любые команды в директории <code className="text-white bg-white/10 px-1 rounded">/home/user/assistant</code>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
