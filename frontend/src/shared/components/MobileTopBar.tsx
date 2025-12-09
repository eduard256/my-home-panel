import { motion } from 'framer-motion';
import {
  Menu,
  X,
  ChevronLeft,
  MessageSquareText,
  MoreVertical,
} from 'lucide-react';
import { useUIStore } from '@/shared/stores';
import type { Section } from '@/shared/types';

const sectionTitles: Record<Section, string> = {
  dashboard: 'Dashboard',
  servers: 'Сервера',
  vms: 'VM/CT',
  automations: 'Автоматизации',
  smarthome: 'Умный дом',
  cameras: 'Камеры',
  assistant: 'Помощник',
};

interface MobileTopBarProps {
  onSwipe?: (direction: 'left' | 'right') => void;
}

export function MobileTopBar(_props: MobileTopBarProps) {
  const {
    section,
    isMenuOpen,
    toggleMenu,
    activeBlock,
    setActiveBlock,
    isAIChatOpen,
    setAIChatOpen,
    selectedServerId,
    selectedVMId,
    selectedAutomationId,
    selectedDeviceId,
    selectedCameraId,
  } = useUIStore();

  // Get breadcrumb based on current state
  const getBreadcrumb = () => {
    const base = sectionTitles[section];

    if (activeBlock === 3) {
      if (selectedServerId) return `${base} › ${selectedServerId}`;
      if (selectedVMId) return `${base} › VM ${selectedVMId}`;
      if (selectedAutomationId) return `${base} › ${selectedAutomationId}`;
      if (selectedDeviceId) return `${base} › Device`;
      if (selectedCameraId) return `${base} › ${selectedCameraId}`;
    }

    return base;
  };

  // Handle back button
  const handleBack = () => {
    if (isAIChatOpen) {
      setAIChatOpen(false);
      return;
    }

    if (activeBlock === 3) {
      setActiveBlock(2);
      return;
    }

    if (activeBlock === 2) {
      setActiveBlock(1);
      return;
    }
  };

  // Show menu icon or back arrow
  const showBackArrow = activeBlock > 1 || isAIChatOpen;

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 h-[56px] bg-[#0a0a0f]/90 backdrop-blur-lg border-b border-white/5"
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Menu/Back button */}
        <button
          onClick={showBackArrow ? handleBack : toggleMenu}
          className="p-2 -ml-2 rounded-lg text-white hover:bg-white/5 transition-colors"
        >
          <motion.div
            initial={false}
            animate={{ rotate: isMenuOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isMenuOpen ? (
              <X size={24} />
            ) : showBackArrow ? (
              <ChevronLeft size={24} />
            ) : (
              <Menu size={24} />
            )}
          </motion.div>
        </button>

        {/* Center: Title/Breadcrumb */}
        <div className="flex-1 px-4 overflow-hidden">
          <motion.h1
            className="text-lg font-semibold text-white truncate text-center"
            key={getBreadcrumb()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isAIChatOpen ? `AI: ${sectionTitles[section]}` : getBreadcrumb()}
          </motion.h1>
        </div>

        {/* Right: AI Chat button / Options */}
        <div className="flex items-center gap-1">
          {isAIChatOpen ? (
            <>
              <button className="p-2 rounded-lg text-white hover:bg-white/5 transition-colors">
                <MoreVertical size={20} />
              </button>
              <button
                onClick={() => setAIChatOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setAIChatOpen(true)}
              className="p-2 -mr-2 rounded-lg text-[#9b87f5] hover:bg-[#9b87f5]/10 transition-colors relative"
            >
              <MessageSquareText size={24} />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
