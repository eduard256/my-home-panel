import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Server,
  Box,
  Zap,
  Home,
  Camera,
  MessageSquare,
  LogOut,
  User,
} from 'lucide-react';
import { useUIStore, useAuthStore } from '@/shared/stores';
import type { Section } from '@/shared/types';

interface MenuItem {
  id: Section;
  label: string;
  icon: typeof LayoutDashboard;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'servers', label: 'Сервера', icon: Server },
  { id: 'vms', label: 'VM/CT', icon: Box },
  { id: 'automations', label: 'Автоматизации', icon: Zap },
  { id: 'smarthome', label: 'Умный дом', icon: Home },
  { id: 'cameras', label: 'Камеры', icon: Camera },
  { id: 'assistant', label: 'Помощник', icon: MessageSquare },
];

export function Block1Navigation() {
  const { section, setSection, setMenuOpen, isMobile } = useUIStore();
  const { logout } = useAuthStore();

  const handleItemClick = (section: Section) => {
    setSection(section);
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex h-full flex-col bg-[#0a0a0f]">
      {/* Header with time */}
      <div className="p-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="gradient-text text-xl font-bold mb-4">Home Panel</h1>
          <div className="text-4xl font-bold text-white tracking-tight">
            {currentTime}
          </div>
          <div className="text-sm text-[#a0a0a8] mt-1">{currentDate}</div>
        </motion.div>
      </div>

      {/* Menu items */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = section === item.id;

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-150 ease-out
                    ${
                      isActive
                        ? 'bg-[#9b87f5] text-white shadow-lg shadow-[#9b87f5]/20'
                        : 'text-[#a0a0a8] hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <Icon
                    size={20}
                    className={isActive ? 'text-white' : 'text-[#a0a0a8]'}
                  />
                  <span className="font-medium">{item.label}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Footer with user */}
      <div className="p-4 border-t border-white/5">
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#9b87f5]/20 flex items-center justify-center">
              <User size={18} className="text-[#9b87f5]" />
            </div>
            <span className="text-sm text-[#a0a0a8]">Admin</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-[#a0a0a8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
